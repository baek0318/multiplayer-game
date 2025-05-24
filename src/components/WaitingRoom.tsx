import React, { useState } from 'react';
import { GameState } from '../types/game';
import './WaitingRoom.css';

interface WaitingRoomProps {
  gameState: GameState;
  currentPlayerId: string;
  onStartGame: () => void;
}

export const WaitingRoom: React.FC<WaitingRoomProps> = ({ gameState, currentPlayerId, onStartGame }) => {
  const isHost = gameState.hostId === currentPlayerId;
  const canStart = gameState.players.length >= 2;
  const [copied, setCopied] = useState(false);

  const handleShareLink = () => {
    navigator.clipboard.writeText(gameState.id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="waiting-room">
      <h2>Waiting Room</h2>
      
      <div className="room-info">
        <p className="room-id">Room ID: <strong>{gameState.id}</strong></p>
        <button 
          className="share-button"
          onClick={handleShareLink}
        >
          {copied ? 'Room ID Copied!' : 'Copy Room ID'}
        </button>
        <p className="player-count">
          Players: {gameState.players.length} / {gameState.maxPlayers}
        </p>
      </div>

      <div className="players-section">
        <h3>Players:</h3>
        <div className="player-list">
          {gameState.players.map((player) => (
            <div key={player.id} className="player-waiting">
              <div
                className="player-color-indicator"
                style={{ backgroundColor: player.color }}
              />
              <span>{player.name}</span>
              {player.id === gameState.hostId && <span className="host-badge">Host</span>}
            </div>
          ))}
        </div>
      </div>

      {isHost && (
        <div className="host-controls">
          <button
            className="start-button"
            onClick={onStartGame}
            disabled={!canStart}
          >
            {canStart ? 'Start Game' : `Need ${2 - gameState.players.length} more player(s)`}
          </button>
        </div>
      )}

      {!isHost && (
        <p className="waiting-message">Waiting for host to start the game...</p>
      )}
    </div>
  );
};