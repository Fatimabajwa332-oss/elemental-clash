import { useState } from 'react';

export default function ServerConfig({ onConnect }) {
  const [url, setUrl] = useState('');

  function handleConnect() {
    if (!url.trim()) {
      alert('Enter your backend server URL first.');
      return;
    }
    onConnect(url.trim());
  }

  return (
    <div id="screen-config">
      <label>Backend server URL</label>
      <div className="row">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://your-backend.example.com"
        />
      </div>
      <button className="btn-primary btn-full" onClick={handleConnect}>
        Connect to server
      </button>
    </div>
  );
}
