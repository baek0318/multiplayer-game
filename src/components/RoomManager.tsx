import React, { useState, useEffect } from 'react';
import './RoomManager.css';

interface RoomManagerProps {
  onCreateRoom: (playerName: string, maxPlayers: number, boardSize: number) => void;
  onJoinRoom: (roomId: string, playerName: string) => void;
}

export const RoomManager: React.FC<RoomManagerProps> = ({ onCreateRoom, onJoinRoom }) => {
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [boardSize, setBoardSize] = useState(30);
  const [mode, setMode] = useState<'create' | 'join'>('create');

  // Get available board sizes based on player count
  const getAvailableBoardSizes = (playerCount: number): number[] => {
    if (playerCount <= 4) return [20, 30, 40];
    if (playerCount <= 6) return [30, 40];
    return [40]; // 7 players
  };

  const availableBoardSizes = getAvailableBoardSizes(maxPlayers);

  // Update board size when max players changes
  useEffect(() => {
    const available = getAvailableBoardSizes(maxPlayers);
    if (!available.includes(boardSize)) {
      setBoardSize(available[0]);
    }
  }, [maxPlayers, boardSize]);

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
      onCreateRoom(playerName, maxPlayers, boardSize);
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
          <>
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
            
            <div className="form-group">
              <label htmlFor="boardSize">Map Size:</label>
              <select
                id="boardSize"
                value={boardSize}
                onChange={(e) => setBoardSize(Number(e.target.value))}
              >
                {availableBoardSizes.map(size => (
                  <option key={size} value={size}>{size}x{size}</option>
                ))}
              </select>
              <small className="form-hint">
                {maxPlayers <= 4 && "All map sizes available"}
                {maxPlayers > 4 && maxPlayers <= 6 && "Medium and large maps only"}
                {maxPlayers === 7 && "Large map only"}
              </small>
            </div>
          </>
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