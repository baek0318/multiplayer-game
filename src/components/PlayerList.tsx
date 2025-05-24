import React from 'react';
import { Player } from '../types/game';
import './PlayerList.css';

interface PlayerListProps {
  players: Player[];
  currentTurnPlayerId: string | null;
  winner: string | null;
}

export const PlayerList: React.FC<PlayerListProps> = ({ players, currentTurnPlayerId, winner }) => {
  return (
    <div className="player-list">
      <h3>Players</h3>
      <div className="players">
        {players.map((player) => (
          <div
            key={player.id}
            className={`player-item ${currentTurnPlayerId === player.id ? 'current-turn' : ''} ${winner === player.id ? 'winner' : ''}`}
          >
            <div
              className="player-color"
              style={{ backgroundColor: player.color }}
            />
            <span className="player-name">{player.name}</span>
            {currentTurnPlayerId === player.id && <span className="turn-badge">Turn</span>}
            {winner === player.id && <span className="winner-badge">🏆 Winner!</span>}
            {!player.isConnected && <span className="disconnected-badge">Offline</span>}
          </div>
        ))}
      </div>
    </div>
  );
};