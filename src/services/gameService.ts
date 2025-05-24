import { database } from './firebase';
import { ref, set, onValue, push, update, get, off, onDisconnect } from 'firebase/database';
import { GameState, Player, Position, Direction } from '../types/game';

const BOARD_SIZE = 40;
const TROPHY_POSITION: Position = { x: 20, y: 20 };

export const gameService = {
  createRoom: async (hostId: string, hostName: string, maxPlayers: number): Promise<string> => {
    const roomsRef = ref(database, 'rooms');
    const newRoomRef = push(roomsRef);
    const roomId = newRoomRef.key!;

    const initialGameState: GameState = {
      id: roomId,
      players: [{
        id: hostId,
        name: hostName,
        color: getPlayerColor(0),
        position: getStartPosition(0, maxPlayers),
        startPosition: getStartPosition(0, maxPlayers),
        isConnected: true,
        isTurn: false
      }],
      currentTurnPlayerId: null,
      turnOrder: [],
      boardSize: BOARD_SIZE,
      trophyPosition: TROPHY_POSITION,
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
        position: getStartPosition(playerIndex, gameState.maxPlayers),
        startPosition: getStartPosition(playerIndex, gameState.maxPlayers),
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
      paths: generatePaths(gameState.players, BOARD_SIZE, TROPHY_POSITION)
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
    
    if (!isValidMove(player.position, newPosition, gameState.paths, playerId)) {
      throw new Error('Invalid move');
    }

    const updatedPlayers = gameState.players.map(p => 
      p.id === playerId ? { ...p, position: newPosition } : p
    );

    const isWinner = newPosition.x === TROPHY_POSITION.x && newPosition.y === TROPHY_POSITION.y;
    
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
        paths: generatePaths(updatedPlayers, BOARD_SIZE, TROPHY_POSITION)
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

function getStartPosition(playerIndex: number, totalPlayers: number): Position {
  const angleStep = (2 * Math.PI) / totalPlayers;
  const angle = playerIndex * angleStep;
  const radius = 18;
  
  const x = Math.round(20 + radius * Math.cos(angle));
  const y = Math.round(20 + radius * Math.sin(angle));
  
  return { x: Math.max(1, Math.min(39, x)), y: Math.max(1, Math.min(39, y)) };
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
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    
    if (Math.random() > 0.3) {
      const neighbors = getNeighbors(current, boardSize);
      
      for (const neighbor of neighbors) {
        const key = `${neighbor.x},${neighbor.y}`;
        if (!visited.has(key)) {
          visited.add(key);
          paths.push({ from: current, to: neighbor });
          
          if (Math.abs(neighbor.x - end.x) + Math.abs(neighbor.y - end.y) < 
              Math.abs(current.x - end.x) + Math.abs(current.y - end.y)) {
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

function isValidMove(currentPos: Position, newPos: Position, paths: any[], playerId: string): boolean {
  // Check if the new position is within board boundaries
  if (newPos.x < 0 || newPos.x >= BOARD_SIZE || newPos.y < 0 || newPos.y >= BOARD_SIZE) {
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