export default function Waiting({ roomCode }) {
  return (
    <div>
      <div className="room-code">{roomCode || '-----'}</div>
      <div className="waiting-wrap">
        <div className="spinner" />
        <div className="sub" style={{ margin: 0 }}>
          Waiting for opponent to join…
        </div>
      </div>
    </div>
  );
}
