import { database } from './firebase';
import { ref, set, onValue, push, update, get, off, onDisconnect } from 'firebase/database';
import { GameState, Player, Position, Direction, Obstacle, ObstacleType } from '../types/game';

export const gameService = {
  createRoom: async (hostId: string, hostName: string, maxPlayers: number, boardSize: number = 30): Promise<string> => {
    const roomsRef = ref(database, 'rooms');
    const newRoomRef = push(roomsRef);
    const roomId = newRoomRef.key!;

    const center = Math.floor(boardSize / 2);
    const trophyPosition: Position = { x: center, y: center };

    const initialGameState: GameState = {
      id: roomId,
      players: [{
        id: hostId,
        name: hostName,
        color: getPlayerColor(0),
        position: getStartPosition(0, maxPlayers, boardSize),
        startPosition: getStartPosition(0, maxPlayers, boardSize),
        isConnected: true,
        isTurn: false
      }],
      currentTurnPlayerId: null,
      turnOrder: [],
      boardSize: boardSize,
      trophyPosition: trophyPosition,
      paths: [],
      obstacles: [],
      obstacleRelocateCountdown: 0,
      winner: null,
      status: 'waiting',
      maxPlayers,
      hostId,
      createdAt: Date.now()
    };

    await set(newRoomRef, initialGameState);
    return roomId;
  },

  joinRoom: async (roomId: string, playerId: string, playerName: string): Promise<void> => {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    
    if (!snapshot.exists()) {
      throw new Error('Room not found');
    }

    const gameState = snapshot.val() as GameState;
    
    if (gameState.players.length >= gameState.maxPlayers) {
      throw new Error('Room is full');
    }

    if (gameState.status !== 'waiting') {
      throw new Error('Game already started');
    }

    const existingPlayer = gameState.players.find(p => p.id === playerId);
    if (!existingPlayer) {
      const playerIndex = gameState.players.length;
      const newPlayer: Player = {
        id: playerId,
        name: playerName,
        color: getPlayerColor(playerIndex),
        position: getStartPosition(playerIndex, gameState.maxPlayers, gameState.boardSize),
        startPosition: getStartPosition(playerIndex, gameState.maxPlayers, gameState.boardSize),
        isConnected: true,
        isTurn: false
      };

      await update(roomRef, {
        players: [...gameState.players, newPlayer]
      });
    }
  },

  startGame: async (roomId: string): Promise<void> => {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    
    if (!snapshot.exists()) {
      throw new Error('Room not found');
    }

    const gameState = snapshot.val() as GameState;
    
    if (gameState.players.length < 2) {
      throw new Error('Need at least 2 players to start');
    }

    const turnOrder = gameState.players.map(p => p.id);
    const firstPlayerId = turnOrder[0];
    
    // Generate initial obstacles
    const obstacles = generateObstacles(gameState.boardSize, gameState.players, gameState.trophyPosition);
    const relocateCountdown = Math.floor(Math.random() * 5) + 3; // Relocate every 3-7 turns

    await update(roomRef, {
      status: 'playing',
      turnOrder,
      currentTurnPlayerId: firstPlayerId,
      paths: generatePaths(gameState.players, gameState.boardSize, gameState.trophyPosition),
      obstacles,
      obstacleRelocateCountdown: relocateCountdown
    });
  },

  makeMove: async (roomId: string, playerId: string, direction: Direction): Promise<void> => {
    const roomRef = ref(database, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    
    if (!snapshot.exists()) {
      throw new Error('Room not found');
    }

    const gameState = snapshot.val() as GameState;
    
    if (gameState.currentTurnPlayerId !== playerId) {
      throw new Error('Not your turn');
    }

    const player = gameState.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }
    
    // Check if player has to skip turns
    if (player.skipTurns && player.skipTurns > 0) {
      throw new Error('You are frozen and cannot move this turn');
    }

    const newPosition = getNewPosition(player.position, direction);
    
    if (!isValidMove(player.position, newPosition, gameState.paths, playerId, gameState.boardSize, gameState.obstacles)) {
      throw new Error('Invalid move');
    }

    let updatedPlayers = gameState.players.map(p => 
      p.id === playerId ? { ...p, position: newPosition } : p
    );
    
    // Check for obstacle collision
    const obstacle = gameState.obstacles.find(o => o.position.x === newPosition.x && o.position.y === newPosition.y);
    if (obstacle) {
      switch (obstacle.type) {
        case 'reset':
          // Return to start position
          updatedPlayers = updatedPlayers.map(p => 
            p.id === playerId ? { ...p, position: p.startPosition } : p
          );
          break;
        case 'freeze':
          // Skip next 2 turns
          updatedPlayers = updatedPlayers.map(p => 
            p.id === playerId ? { ...p, skipTurns: 2 } : p
          );
          break;
        case 'block':
          // This should have been caught by isValidMove
          throw new Error('Cannot move to blocked position');
      }
    }

    const isWinner = newPosition.x === gameState.trophyPosition.x && newPosition.y === gameState.trophyPosition.y;
    
    if (isWinner) {
      await update(roomRef, {
        players: updatedPlayers,
        winner: playerId,
        status: 'finished'
      });
    } else {
      // Find next player who can move (not frozen)
      let currentTurnIndex = gameState.turnOrder.indexOf(playerId);
      let nextPlayerId: string;
      let nextPlayer: Player | undefined;
      
      do {
        currentTurnIndex = (currentTurnIndex + 1) % gameState.turnOrder.length;
        nextPlayerId = gameState.turnOrder[currentTurnIndex];
        nextPlayer = updatedPlayers.find(p => p.id === nextPlayerId);
      } while (nextPlayer && nextPlayer.skipTurns && nextPlayer.skipTurns > 0);
      
      // Decrease skip turns for all frozen players
      updatedPlayers = updatedPlayers.map(p => ({
        ...p,
        skipTurns: p.skipTurns ? Math.max(0, p.skipTurns - 1) : 0
      }));
      
      // Check if obstacles need to be relocated
      let newObstacles = gameState.obstacles;
      let newRelocateCountdown = gameState.obstacleRelocateCountdown - 1;
      
      if (newRelocateCountdown <= 0) {
        newObstacles = generateObstacles(gameState.boardSize, updatedPlayers, gameState.trophyPosition);
        newRelocateCountdown = Math.floor(Math.random() * 5) + 3;
      }

      await update(roomRef, {
        players: updatedPlayers,
        currentTurnPlayerId: nextPlayerId,
        paths: generatePaths(updatedPlayers, gameState.boardSize, gameState.trophyPosition),
        obstacles: newObstacles,
        obstacleRelocateCountdown: newRelocateCountdown
      });
    }
  },

  subscribeToRoom: (roomId: string, callback: (gameState: GameState | null) => void) => {
    const roomRef = ref(database, `rooms/${roomId}`);
    onValue(roomRef, (snapshot) => {
      callback(snapshot.val());
    });
    return () => off(roomRef);
  },

  setPlayerDisconnect: (roomId: string, playerId: string) => {
    const playerRef = ref(database, `rooms/${roomId}/players`);
    onDisconnect(playerRef).update({
      [`${playerId}/isConnected`]: false
    });
  }
};

function getPlayerColor(index: number): string {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF'];
  return colors[index % colors.length];
}

function getStartPosition(playerIndex: number, totalPlayers: number, boardSize: number): Position {
  const angleStep = (2 * Math.PI) / totalPlayers;
  const angle = playerIndex * angleStep;
  const center = Math.floor(boardSize / 2);
  const radius = Math.floor(boardSize * 0.45); // 45% of board size
  
  const x = Math.round(center + radius * Math.cos(angle));
  const y = Math.round(center + radius * Math.sin(angle));
  
  return { x: Math.max(1, Math.min(boardSize - 1, x)), y: Math.max(1, Math.min(boardSize - 1, y)) };
}

function generatePaths(players: Player[], boardSize: number, trophyPosition: Position): any[] {
  const paths: any[] = [];
  
  players.forEach(player => {
    const playerPaths = generatePathForPlayer(player.position, trophyPosition, boardSize);
    paths.push(...playerPaths.map(path => ({ ...path, playerId: player.id })));
  });
  
  return paths;
}

function generatePathForPlayer(start: Position, end: Position, boardSize: number): any[] {
  const paths: any[] = [];
  const visited = new Set<string>();
  const queue: Position[] = [start];
  visited.add(`${start.x},${start.y}`);
  
  // Always ensure at least one move from starting position
  const startNeighbors = getNeighbors(start, boardSize);
  for (const neighbor of startNeighbors) {
    const key = `${neighbor.x},${neighbor.y}`;
    visited.add(key);
    paths.push({ from: start, to: neighbor });
    queue.push(neighbor);
  }
  
  while (queue.length > 0 && paths.length < 100) { // Limit paths to prevent infinite loops
    const current = queue.shift()!;
    
    // Generate paths with some randomness but ensure connectivity
    if (Math.random() > 0.2) { // Higher chance of generating paths
      const neighbors = getNeighbors(current, boardSize);
      
      for (const neighbor of neighbors) {
        const key = `${neighbor.x},${neighbor.y}`;
        if (!visited.has(key)) {
          visited.add(key);
          paths.push({ from: current, to: neighbor });
          
          // Prioritize paths moving towards the trophy
          const currentDistance = Math.abs(current.x - end.x) + Math.abs(current.y - end.y);
          const neighborDistance = Math.abs(neighbor.x - end.x) + Math.abs(neighbor.y - end.y);
          
          if (neighborDistance < currentDistance || Math.random() > 0.5) {
            queue.push(neighbor);
          }
        }
      }
    }
  }
  
  return paths;
}

function getNeighbors(pos: Position, boardSize: number): Position[] {
  const neighbors: Position[] = [];
  const directions = [
    { x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }
  ];
  
  for (const dir of directions) {
    const newX = pos.x + dir.x;
    const newY = pos.y + dir.y;
    
    if (newX >= 0 && newX < boardSize && newY >= 0 && newY < boardSize) {
      neighbors.push({ x: newX, y: newY });
    }
  }
  
  return neighbors;
}

function getNewPosition(currentPos: Position, direction: Direction): Position {
  switch (direction) {
    case 'up': return { x: currentPos.x, y: currentPos.y - 1 };
    case 'down': return { x: currentPos.x, y: currentPos.y + 1 };
    case 'left': return { x: currentPos.x - 1, y: currentPos.y };
    case 'right': return { x: currentPos.x + 1, y: currentPos.y };
  }
}

function isValidMove(currentPos: Position, newPos: Position, paths: any[], playerId: string, boardSize: number, obstacles: Obstacle[]): boolean {
  // Check if the new position is within board boundaries
  if (newPos.x < 0 || newPos.x >= boardSize || newPos.y < 0 || newPos.y >= boardSize) {
    return false;
  }
  
  // Check if blocked by obstacle
  const blockingObstacle = obstacles.find(o => 
    o.type === 'block' && o.position.x === newPos.x && o.position.y === newPos.y
  );
  if (blockingObstacle) {
    return false;
  }
  
  // Check if there's a valid path from current position to new position
  return paths.some(path => 
    path.playerId === playerId &&
    ((path.from.x === currentPos.x && path.from.y === currentPos.y && 
      path.to.x === newPos.x && path.to.y === newPos.y) ||
     (path.from.x === newPos.x && path.from.y === newPos.y && 
      path.to.x === currentPos.x && path.to.y === currentPos.y))
  );
}

function generateObstacles(boardSize: number, players: Player[], trophyPosition: Position): Obstacle[] {
  const obstacles: Obstacle[] = [];
  const totalCells = boardSize * boardSize;
  const obstacleCount = Math.floor(totalCells * 0.125); // 12.5% of total cells
  const types: ObstacleType[] = ['reset', 'freeze', 'block'];
  
  // Get all occupied positions
  const occupiedPositions = new Set<string>();
  players.forEach(p => {
    occupiedPositions.add(`${p.position.x},${p.position.y}`);
    occupiedPositions.add(`${p.startPosition.x},${p.startPosition.y}`);
  });
  occupiedPositions.add(`${trophyPosition.x},${trophyPosition.y}`);
  
  // Keep track of safe zones around start positions
  const safeZones = new Set<string>();
  players.forEach(p => {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const x = p.startPosition.x + dx;
        const y = p.startPosition.y + dy;
        if (x >= 0 && x < boardSize && y >= 0 && y < boardSize) {
          safeZones.add(`${x},${y}`);
        }
      }
    }
  });
  
  // Also keep trophy area clear
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const x = trophyPosition.x + dx;
      const y = trophyPosition.y + dy;
      if (x >= 0 && x < boardSize && y >= 0 && y < boardSize) {
        safeZones.add(`${x},${y}`);
      }
    }
  }
  
  let attempts = 0;
  while (obstacles.length < obstacleCount && attempts < 2000) {
    attempts++;
    
    const x = Math.floor(Math.random() * boardSize);
    const y = Math.floor(Math.random() * boardSize);
    const posKey = `${x},${y}`;
    
    // Don't place obstacles on occupied positions, safe zones, or existing obstacles
    if (occupiedPositions.has(posKey)) continue;
    if (safeZones.has(posKey)) continue;
    if (obstacles.some(o => o.position.x === x && o.position.y === y)) continue;
    
    // Place obstacles more evenly across the board
    const type = types[Math.floor(Math.random() * types.length)];
    obstacles.push({
      id: `obstacle_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type,
      position: { x, y }
    });
    
    // Add position to occupied to prevent duplicates
    occupiedPositions.add(posKey);
  }
  
  return obstacles;
}