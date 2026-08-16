import { useState, useRef } from 'react';
import { io } from 'socket.io-client';
import ServerConfig from './components/ServerConfig';
import ConnectionStatus from './components/ConnectionStatus';
import Lobby from './components/Lobby';
import Waiting from './components/Waiting';
import Match from './components/Match';
import Result from './components/Result';
import './App.css';

const SCREENS = {
  CONFIG: 'config',
  LOBBY: 'lobby',
  WAITING: 'waiting',
  MATCH: 'match',
  RESULT: 'result',
};

export default function App() {
  const [screen, setScreen] = useState(SCREENS.CONFIG);
  const [connected, setConnected] = useState(false);
  const [roomCode, setRoomCode] = useState(null);

  const [hand, setHand] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [yourHp, setYourHp] = useState(20);
  const [opponentHp, setOpponentHp] = useState(20);
  const [matchStatus, setMatchStatus] = useState('Choose a card');
  const [result, setResult] = useState(null);

  const socketRef = useRef(null);

  function connectToServer(url) {
    const socket = io(url, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setScreen(SCREENS.LOBBY);
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('room_created', (data) => {
      setRoomCode(data.roomCode);
      setScreen(SCREENS.WAITING);
    });

    socket.on('room_joined', (data) => {
      setRoomCode(data.roomCode);
    });

    socket.on('match_start', (data) => {
      setYourHp(data.yourHp);
      setOpponentHp(data.opponentHp);
      setSelectedIndex(null);
      setMatchStatus('Choose a card');
      setScreen(SCREENS.MATCH);
    });

    // The server deals a fresh, private hand — only this client sees it.
    socket.on('your_hand', (data) => {
      setHand(data.hand);
      setSelectedIndex(null);
      setMatchStatus('Choose a card');
    });

    socket.on('card_received', () => {
      setMatchStatus('Waiting for opponent…');
    });

    // The server is the only source of truth for who wins a clash.
    socket.on('clash_result', (data) => {
      setYourHp(data.yourHp);
      setOpponentHp(data.opponentHp);
      setResult(data);
      setScreen(SCREENS.RESULT);
    });

    socket.on('opponent_left', () => {
      alert('Opponent disconnected.');
      setScreen(SCREENS.LOBBY);
    });

    socket.on('error_message', (msg) => alert(msg));
  }

  function createRoom() {
    socketRef.current?.emit('create_room');
  }

  function joinRoom(code) {
    socketRef.current?.emit('join_room', { roomCode: code });
  }

  function pickCard(index) {
    if (selectedIndex !== null) return;
    setSelectedIndex(index);
    socketRef.current?.emit('play_card', { roomCode, cardIndex: index });
  }

  function nextRound() {
    setSelectedIndex(null);
    setMatchStatus('Choose a card');
    setScreen(SCREENS.MATCH);
  }

  function rematch() {
    socketRef.current?.emit('rematch');
    setSelectedIndex(null);
  }

  return (
    <div className="app">
      <div className="card">
        <div className="brand">
          <div className="brand-icon">⚔️</div>
          <h1>Elemental Clash</h1>
        </div>
        <div className="sub">Server-authoritative multiplayer · practice build</div>

        {screen === SCREENS.CONFIG && <ServerConfig onConnect={connectToServer} />}

        <ConnectionStatus connected={connected} />

        {screen === SCREENS.LOBBY && (
          <Lobby onCreateRoom={createRoom} onJoinRoom={joinRoom} />
        )}

        {screen === SCREENS.WAITING && <Waiting roomCode={roomCode} />}

        {screen === SCREENS.MATCH && (
          <Match
            status={matchStatus}
            hand={hand}
            selectedIndex={selectedIndex}
            yourHp={yourHp}
            opponentHp={opponentHp}
            onPickCard={pickCard}
          />
        )}

        {screen === SCREENS.RESULT && result && (
          <Result result={result} onNextRound={nextRound} onRematch={rematch} />
        )}
      </div>
    </div>
  );
}