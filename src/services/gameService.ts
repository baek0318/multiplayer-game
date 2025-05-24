import { database } from './firebase';
import { ref, set, onValue, push, update, get, off, onDisconnect } from 'firebase/database';
import { GameState, Player, Position, Direction } from '../types/game';

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

    await update(roomRef, {
      status: 'playing',
      turnOrder,
      currentTurnPlayerId: firstPlayerId,
      paths: generatePaths(gameState.players, gameState.boardSize, gameState.trophyPosition)
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

    const newPosition = getNewPosition(player.position, direction);
    
    if (!isValidMove(player.position, newPosition, gameState.paths, playerId, gameState.boardSize)) {
      throw new Error('Invalid move');
    }

    const updatedPlayers = gameState.players.map(p => 
      p.id === playerId ? { ...p, position: newPosition } : p
    );

    const isWinner = newPosition.x === gameState.trophyPosition.x && newPosition.y === gameState.trophyPosition.y;
    
    if (isWinner) {
      await update(roomRef, {
        players: updatedPlayers,
        winner: playerId,
        status: 'finished'
      });
    } else {
      const currentTurnIndex = gameState.turnOrder.indexOf(playerId);
      const nextTurnIndex = (currentTurnIndex + 1) % gameState.turnOrder.length;
      const nextPlayerId = gameState.turnOrder[nextTurnIndex];

      await update(roomRef, {
        players: updatedPlayers,
        currentTurnPlayerId: nextPlayerId,
        paths: generatePaths(updatedPlayers, gameState.boardSize, gameState.trophyPosition)
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

function isValidMove(currentPos: Position, newPos: Position, paths: any[], playerId: string, boardSize: number): boolean {
  // Check if the new position is within board boundaries
  if (newPos.x < 0 || newPos.x >= boardSize || newPos.y < 0 || newPos.y >= boardSize) {
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