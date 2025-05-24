import React from 'react';
import { GameState, Position } from '../types/game';
import './GameBoard.css';

interface GameBoardProps {
  gameState: GameState;
  onCellClick?: (position: Position) => void;
  currentPlayerId?: string;
}

export const GameBoard: React.FC<GameBoardProps> = ({ gameState, onCellClick, currentPlayerId }) => {
  const { boardSize, players, trophyPosition, paths, obstacles = [] } = gameState;
  
  // Calculate cell size based on board size
  const cellSize = boardSize <= 20 ? 20 : boardSize <= 30 ? 15 : 12;
  
  const renderCell = (x: number, y: number) => {
    const player = players.find(p => p.position.x === x && p.position.y === y);
    const isTrophy = x === trophyPosition.x && y === trophyPosition.y;
    const isStartPosition = players.some(p => p.startPosition.x === x && p.startPosition.y === y);
    const obstacle = obstacles.find(o => o.position.x === x && o.position.y === y);
    
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
      hasPath && 'has-path',
      obstacle && `has-obstacle obstacle-${obstacle.type}`
    ].filter(Boolean).join(' ');
    
    return (
      <div
        key={`${x}-${y}`}
        className={cellClasses}
        onClick={() => onCellClick?.({ x, y })}
        style={{
          backgroundColor: player ? player.color : undefined,
          width: `${cellSize}px`,
          height: `${cellSize}px`,
        }}
      >
        {isTrophy && '🏆'}
        {player && !isTrophy && (
          <div className="player-piece">
            {player.isTurn && <div className="turn-indicator" />}
          </div>
        )}
        {obstacle && !player && !isTrophy && (
          <div className="obstacle-icon">
            {obstacle.type === 'reset' && '↩️'}
            {obstacle.type === 'freeze' && '❄️'}
            {obstacle.type === 'block' && '🚫'}
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