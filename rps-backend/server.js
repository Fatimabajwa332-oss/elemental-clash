const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const db = require('./db');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*' },
});

// -----------------------------------------------------------------------
// GAME: ELEMENTAL CLASH — an original 1v1 card game
// -----------------------------------------------------------------------
// Rules:
//   - Each player starts with 20 HP.
//   - Each round, both players are privately dealt a hand of 3 cards.
//     A card has an element (fire / water / earth) and a power (1-5).
//   - Both players secretly choose one card from their hand to play.
//   - Elemental advantage: fire beats earth, earth beats water, water beats fire.
//   - If the elements are the same, the higher power wins.
//   - If element AND power are identical, the round is a draw (no damage).
//   - The loser takes damage equal to the winning card's power.
//   - First player to reach 0 HP loses the match.
//
// This is deterministic and server-authoritative: the server generates
// the hands, the server decides who wins, and a player's browser never
// sees the opponent's hand or chosen card until both picks are locked in.

const ELEMENTS = ['fire', 'water', 'earth'];

// element -> the element it beats
const BEATS = {
  fire: 'earth',
  earth: 'water',
  water: 'fire',
};

const rooms = {};
// rooms[roomCode] = {
//   players: [socketId1, socketId2],
//   hp: { socketId1: 20, socketId2: 20 },
//   hands: { socketId1: [card, card, card], socketId2: [...] },
//   picks: { socketId1: null, socketId2: null },  // hidden until both pick
//   gameOver: false,
// }

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms[code]);
  return code;
}

function generateCard() {
  return {
    element: ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)],
    power: 1 + Math.floor(Math.random() * 5), // 1-5
  };
}

function dealHand() {
  return [generateCard(), generateCard(), generateCard()];
}

// Deal a fresh private hand to each player and tell them (and only them)
// what's in it. Nothing about one player's hand is ever sent to the other.
function dealNewHands(roomCode) {
  const room = rooms[roomCode];
  for (const playerId of room.players) {
    room.hands[playerId] = dealHand();
    room.picks[playerId] = null;
    io.to(playerId).emit('your_hand', { hand: room.hands[playerId] });
  }
}

// Compare two cards from player1's perspective. Returns 'win' | 'lose' | 'draw'.
function judgeClash(card1, card2) {
  if (card1.element === card2.element) {
    if (card1.power === card2.power) return 'draw';
    return card1.power > card2.power ? 'win' : 'lose';
  }
  if (BEATS[card1.element] === card2.element) return 'win';
  return 'lose';
}

async function resolveClash(roomCode) {
  const room = rooms[roomCode];
  const [p1, p2] = room.players;
  const card1 = room.picks[p1];
  const card2 = room.picks[p2];

  const outcome1 = judgeClash(card1, card2);
  let outcome2;
  let damage = 0;

  if (outcome1 === 'draw') {
    outcome2 = 'draw';
  } else if (outcome1 === 'win') {
    outcome2 = 'lose';
    damage = card1.power;
    room.hp[p2] = Math.max(0, room.hp[p2] - damage);
  } else {
    outcome2 = 'win';
    damage = card2.power;
    room.hp[p1] = Math.max(0, room.hp[p1] - damage);
  }

  await db.recordMatchHistory({
    roomCode,
    player1Id: p1,
    player2Id: p2,
    move1: `${card1.element}(${card1.power})`,
    move2: `${card2.element}(${card2.power})`,
    outcome1,
  });

  const gameOver = room.hp[p1] <= 0 || room.hp[p2] <= 0;
  if (gameOver) {
    room.gameOver = true;
    const winner1 = room.hp[p1] > room.hp[p2] ? 'win' : room.hp[p1] === room.hp[p2] ? 'draw' : 'lose';
    await db.recordRoundStats(p1, p2, winner1);
  }

  io.to(p1).emit('clash_result', {
    outcome: outcome1,
    yourCard: card1,
    opponentCard: card2,
    damage,
    yourHp: room.hp[p1],
    opponentHp: room.hp[p2],
    gameOver,
  });
  io.to(p2).emit('clash_result', {
    outcome: outcome2,
    yourCard: card2,
    opponentCard: card1,
    damage,
    yourHp: room.hp[p2],
    opponentHp: room.hp[p1],
    gameOver,
  });

  if (!gameOver) {
    dealNewHands(roomCode);
  }
}

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.on('create_room', () => {
    const roomCode = generateRoomCode();
    rooms[roomCode] = {
      players: [socket.id],
      hp: { [socket.id]: 20 },
      hands: { [socket.id]: [] },
      picks: { [socket.id]: null },
      gameOver: false,
    };
    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    socket.emit('room_created', { roomCode });
  });

  socket.on('join_room', ({ roomCode }) => {
    const room = rooms[roomCode];

    if (!room) {
      socket.emit('error_message', 'Room not found.');
      return;
    }
    if (room.players.length >= 2) {
      socket.emit('error_message', 'Room is full.');
      return;
    }

    room.players.push(socket.id);
    room.hp[socket.id] = 20;
    room.hands[socket.id] = [];
    room.picks[socket.id] = null;
    socket.join(roomCode);
    socket.data.roomCode = roomCode;

    socket.emit('room_joined', { roomCode });

    // Both players present — start the match and deal the first hands.
    io.to(roomCode).emit('match_start', {
      yourHp: 20,
      opponentHp: 20,
    });
    dealNewHands(roomCode);
  });

  // Player picks a card by its index in the hand THEY were dealt.
  // The server looks up the actual card server-side — the client
  // cannot invent a card that wasn't in its hand.
  socket.on('play_card', async ({ roomCode, cardIndex }) => {
    const room = rooms[roomCode];
    if (!room || room.gameOver) return;
    if (!room.players.includes(socket.id)) return;

    const hand = room.hands[socket.id];
    if (!hand || cardIndex < 0 || cardIndex >= hand.length) {
      socket.emit('error_message', 'Invalid card selection.');
      return;
    }
    if (room.picks[socket.id]) return; // already picked this round

    room.picks[socket.id] = hand[cardIndex];
    socket.emit('card_received');

    const [p1, p2] = room.players;
    if (room.picks[p1] && room.picks[p2]) {
      await resolveClash(roomCode);
    }
  });

  socket.on('rematch', () => {
    const roomCode = socket.data.roomCode;
    const room = rooms[roomCode];
    if (!room) return;

    room.hp = { [room.players[0]]: 20, [room.players[1]]: 20 };
    room.gameOver = false;
    io.to(roomCode).emit('match_start', { yourHp: 20, opponentHp: 20 });
    dealNewHands(roomCode);
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    const roomCode = socket.data.roomCode;
    if (!roomCode || !rooms[roomCode]) return;

    const room = rooms[roomCode];
    const opponentId = room.players.find((id) => id !== socket.id);
    if (opponentId) {
      io.to(opponentId).emit('opponent_left');
    }
    delete rooms[roomCode];
  });
});

app.get('/', (req, res) => {
  res.send('Elemental Clash backend is running.');
});

app.get('/stats/:playerId', (req, res) => {
  res.json(db.getPlayerStats(req.params.playerId));
});

app.get('/history', (req, res) => {
  res.json(db.getMatchHistory());
});

const PORT = process.env.PORT || 3001;

db.initDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
});