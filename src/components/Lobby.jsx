import { useState } from 'react';

export default function Lobby({ onCreateRoom, onJoinRoom }) {
  const [code, setCode] = useState('');

  function handleJoin() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    onJoinRoom(trimmed);
  }

  return (
    <div>
      <button className="btn-primary btn-full" onClick={onCreateRoom}>
        Create Match
      </button>

      <div className="divider">or join with a code</div>

      <div className="row">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="ROOM CODE"
          maxLength={5}
          style={{ textTransform: 'uppercase', letterSpacing: '3px', textAlign: 'center' }}
        />
        <button className="btn-ghost" onClick={handleJoin}>
          Join
        </button>
      </div>
    </div>
  );
}
