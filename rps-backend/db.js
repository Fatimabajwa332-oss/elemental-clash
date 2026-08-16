const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const path = require('path');

// Everything gets saved into this one file — you can open db.json in a
// text editor any time and see exactly what's stored. This is why lowdb
// is great for learning: no hidden binary format, no separate database
// server to install or run.
const file = path.join(__dirname, 'db.json');
const adapter = new JSONFile(file);

// Default shape of the database if db.json doesn't exist yet.
const defaultData = {
  players: {},   // playerId -> { wins, losses, draws, matchesPlayed }
  matches: [],   // full match history log
};

const db = new Low(adapter, defaultData);

async function initDB() {
  await db.read();
  // db.data will be null on first run — fall back to defaultData.
  db.data ||= defaultData;
  await db.write();
  console.log('Database ready:', file);
}

// Make sure a player has a record before we try to update their stats.
function ensurePlayer(playerId) {
  if (!db.data.players[playerId]) {
    db.data.players[playerId] = { wins: 0, losses: 0, draws: 0, matchesPlayed: 0 };
  }
}

// Update both players' win/loss/draw counters after a round resolves.
async function recordRoundStats(player1Id, player2Id, outcome1) {
  ensurePlayer(player1Id);
  ensurePlayer(player2Id);

  const p1 = db.data.players[player1Id];
  const p2 = db.data.players[player2Id];

  p1.matchesPlayed += 1;
  p2.matchesPlayed += 1;

  if (outcome1 === 'win') {
    p1.wins += 1;
    p2.losses += 1;
  } else if (outcome1 === 'lose') {
    p1.losses += 1;
    p2.wins += 1;
  } else {
    p1.draws += 1;
    p2.draws += 1;
  }

  await db.write();
}

// Append one completed round to the permanent match history log.
async function recordMatchHistory({ roomCode, player1Id, player2Id, move1, move2, outcome1 }) {
  db.data.matches.push({
    roomCode,
    player1Id,
    player2Id,
    move1,
    move2,
    outcome1, // outcome from player1's perspective: win / lose / draw
    timestamp: new Date().toISOString(),
  });
  await db.write();
}

function getPlayerStats(playerId) {
  return db.data.players[playerId] || { wins: 0, losses: 0, draws: 0, matchesPlayed: 0 };
}

function getMatchHistory(limit = 50) {
  // Most recent first.
  return db.data.matches.slice(-limit).reverse();
}

module.exports = {
  initDB,
  recordRoundStats,
  recordMatchHistory,
  getPlayerStats,
  getMatchHistory,
};