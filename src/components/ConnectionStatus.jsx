export default function ConnectionStatus({ connected }) {
  return (
    <div className="status">
      <div className={`dot ${connected ? 'on' : ''}`} />
      <span>{connected ? 'Connected to server' : 'Not connected'}</span>
    </div>
  );
}
