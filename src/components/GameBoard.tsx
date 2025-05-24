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
  
  // Calculate responsive cell size based on screen and board size
  const calculateCellSize = () => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Get safe area insets
    const safeAreaLeft = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sal') || '0');
    const safeAreaRight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sar') || '0');
    
    // Account for padding, margins, and safe areas
    const padding = 40; // Increased padding for safe area
    const safeAreaPadding = safeAreaLeft + safeAreaRight;
    const availableWidth = viewportWidth - padding - safeAreaPadding;
    
    // Calculate cell size based on width only for mobile
    if (viewportWidth < 768) {
      // For mobile, ensure the entire board fits on screen
      const boardBorder = 4; // 2px border on each side
      const containerPadding = 20; // padding for the container
      const actualAvailableWidth = viewportWidth - containerPadding - boardBorder;
      
      // Calculate cell size that will fit the entire board
      let cellSize = Math.floor(actualAvailableWidth / boardSize);
      
      // Ensure minimum visibility but prioritize fitting on screen
      const minCellSize = 8; // Minimum for visibility
      cellSize = Math.max(cellSize, minCellSize);
      
      // Cap maximum size to prevent too large cells
      const maxCellSize = boardSize === 20 ? 15 : boardSize === 30 ? 10 : 8;
      cellSize = Math.min(cellSize, maxCellSize);
      
      return cellSize;
    } else {
      // Desktop sizing
      const availableHeight = viewportHeight - 400;
      const maxCellWidth = Math.floor(availableWidth / boardSize);
      const maxCellHeight = Math.floor(availableHeight / boardSize);
      const maxCellSize = Math.min(maxCellWidth, maxCellHeight);
      
      const baseCellSize = boardSize <= 20 ? 25 : boardSize <= 30 ? 20 : 15;
      return Math.min(maxCellSize, baseCellSize);
    }
  };
  
  const [cellSize, setCellSize] = React.useState(calculateCellSize());
  
  // Update cell size on window resize
  React.useEffect(() => {
    const handleResize = () => {
      setCellSize(calculateCellSize());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [boardSize]);
  
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
        onTouchEnd={(e) => {
          e.preventDefault();
          onCellClick?.({ x, y });
        }}
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
    <div className="game-board-container">
      <div className="game-board">
        {Array.from({ length: boardSize }, (_, y) => (
          <div key={y} className="board-row">
            {Array.from({ length: boardSize }, (_, x) => renderCell(x, y))}
          </div>
        ))}
      </div>
    </div>
  );
};