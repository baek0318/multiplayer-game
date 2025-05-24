import React from 'react';
import { Direction } from '../types/game';
import './GameControls.css';

interface GameControlsProps {
  onMove: (direction: Direction) => void;
  isMyTurn: boolean;
  disabled?: boolean;
}

export const GameControls: React.FC<GameControlsProps> = ({ onMove, isMyTurn, disabled }) => {
  const handleMove = (direction: Direction) => {
    if (isMyTurn && !disabled) {
      onMove(direction);
    }
  };

  return (
    <div className="game-controls">
      <div className="controls-grid">
        <div className="controls-row">
          <button
            className="control-button"
            onClick={() => handleMove('up')}
            disabled={!isMyTurn || disabled}
          >
            ↑
          </button>
        </div>
        <div className="controls-row">
          <button
            className="control-button"
            onClick={() => handleMove('left')}
            disabled={!isMyTurn || disabled}
          >
            ←
          </button>
          <button
            className="control-button"
            onClick={() => handleMove('down')}
            disabled={!isMyTurn || disabled}
          >
            ↓
          </button>
          <button
            className="control-button"
            onClick={() => handleMove('right')}
            disabled={!isMyTurn || disabled}
          >
            →
          </button>
        </div>
      </div>
      {!isMyTurn && <p className="turn-message">Waiting for other player's turn...</p>}
    </div>
  );
};