export interface Position {
  x: number;
  y: number;
}

export interface Player {
  id: string;
  name: string;
  color: string;
  position: Position;
  startPosition: Position;
  isConnected: boolean;
  isTurn: boolean;
  skipTurns?: number; // Number of turns to skip (for freeze obstacle)
}

export type ObstacleType = 'reset' | 'freeze' | 'block';

export interface Obstacle {
  id: string;
  type: ObstacleType;
  position: Position;
  lifespan?: number; // Turns before relocating
}

export interface GameState {
  id: string;
  players: Player[];
  currentTurnPlayerId: string | null;
  turnOrder: string[];
  boardSize: number;
  trophyPosition: Position;
  paths: Path[];
  obstacles: Obstacle[];
  obstacleRelocateCountdown: number; // Turns until obstacles relocate
  winner: string | null;
  status: 'waiting' | 'playing' | 'finished';
  maxPlayers: number;
  hostId: string;
  createdAt: number;
}

export interface Path {
  from: Position;
  to: Position;
  playerId: string;
}

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface GameRoom {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  status: GameState['status'];
}