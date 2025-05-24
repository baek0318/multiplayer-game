import React, { useState, useEffect } from 'react';
import './RoomManager.css';

interface RoomManagerProps {
  onCreateRoom: (playerName: string, maxPlayers: number) => void;
  onJoinRoom: (roomId: string, playerName: string) => void;
}

export const RoomManager: React.FC<RoomManagerProps> = ({ onCreateRoom, onJoinRoom }) => {
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [mode, setMode] = useState<'create' | 'join'>('create');

  useEffect(() => {
    // Check if there's a room ID in the URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    
    if (roomParam) {
      setRoomId(roomParam);
      setMode('join');
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }

    if (mode === 'create') {
      onCreateRoom(playerName, maxPlayers);
    } else {
      if (!roomId.trim()) {
        alert('Please enter room ID');
        return;
      }
      onJoinRoom(roomId, playerName);
    }
  };

  return (
    <div className="room-manager">
      <h1>Multiplayer Trophy Game</h1>
      
      <div className="mode-selector">
        <button
          className={`mode-button ${mode === 'create' ? 'active' : ''}`}
          onClick={() => setMode('create')}
        >
          Create Room
        </button>
        <button
          className={`mode-button ${mode === 'join' ? 'active' : ''}`}
          onClick={() => setMode('join')}
        >
          Join Room
        </button>
      </div>

      <form onSubmit={handleSubmit} className="room-form">
        <div className="form-group">
          <label htmlFor="playerName">Your Name:</label>
          <input
            id="playerName"
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            maxLength={20}
          />
        </div>

        {mode === 'create' ? (
          <div className="form-group">
            <label htmlFor="maxPlayers">Max Players:</label>
            <select
              id="maxPlayers"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
            >
              {[2, 3, 4, 5, 6, 7].map(num => (
                <option key={num} value={num}>{num} Players</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="form-group">
            <label htmlFor="roomId">Room ID:</label>
            <input
              id="roomId"
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Enter room ID"
            />
          </div>
        )}

        <button type="submit" className="submit-button">
          {mode === 'create' ? 'Create Room' : 'Join Room'}
        </button>
      </form>
    </div>
  );
};