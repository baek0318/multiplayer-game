import React from 'react';
import { GameState, Position } from '../types/game';
import './GameBoard.css';

interface GameBoardProps {
  gameState: GameState;
  onCellClick?: (position: Position) => void;
  currentPlayerId?: string;
}

export const GameBoard: React.FC<GameBoardProps> = ({ gameState, onCellClick, currentPlayerId }) => {
  const { boardSize, players, trophyPosition, paths } = gameState;
  
  const renderCell = (x: number, y: number) => {
    const player = players.find(p => p.position.x === x && p.position.y === y);
    const isTrophy = x === trophyPosition.x && y === trophyPosition.y;
    const isStartPosition = players.some(p => p.startPosition.x === x && p.startPosition.y === y);
    
    const hasPath = currentPlayerId && paths.some(path => 
      path.playerId === currentPlayerId && (
        (path.from.x === x && path.from.y === y) ||
        (path.to.x === x && path.to.y === y)
      )
    );
    
    const cellClasses = [
      'game-cell',
      player && 'has-player',
      isTrophy && 'has-trophy',
      isStartPosition && 'is-start',
      hasPath && 'has-path'
    ].filter(Boolean).join(' ');
    
    return (
      <div
        key={`${x}-${y}`}
        className={cellClasses}
        onClick={() => onCellClick?.({ x, y })}
        style={{
          backgroundColor: player ? player.color : undefined,
        }}
      >
        {isTrophy && '🏆'}
        {player && !isTrophy && (
          <div className="player-piece">
            {player.isTurn && <div className="turn-indicator" />}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="game-board">
      {Array.from({ length: boardSize }, (_, y) => (
        <div key={y} className="board-row">
          {Array.from({ length: boardSize }, (_, x) => renderCell(x, y))}
        </div>
      ))}
    </div>
  );
};