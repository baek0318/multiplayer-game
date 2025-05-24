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
}

export interface GameState {
  id: string;
  players: Player[];
  currentTurnPlayerId: string | null;
  turnOrder: string[];
  boardSize: number;
  trophyPosition: Position;
  paths: Path[];
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