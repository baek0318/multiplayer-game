import { useState, useEffect } from 'react';
import { GameBoard } from './components/GameBoard';
import { GameControls } from './components/GameControls';
import { PlayerList } from './components/PlayerList';
import { RoomManager } from './components/RoomManager';
import { WaitingRoom } from './components/WaitingRoom';
import { gameService } from './services/gameService';
import { GameState, Direction } from './types/game';
import './App.css';

function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const id = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setPlayerId(id);
  }, []);

  useEffect(() => {
    if (gameState?.id && playerId) {
      const unsubscribe = gameService.subscribeToRoom(gameState.id, (updatedState) => {
        if (updatedState) {
          setGameState(updatedState);
        } else {
          setError('Room was deleted');
          setGameState(null);
        }
      });

      gameService.setPlayerDisconnect(gameState.id, playerId);

      return () => {
        unsubscribe();
      };
    }
  }, [gameState?.id, playerId]);

  const handleCreateRoom = async (playerName: string, maxPlayers: number, boardSize: number) => {
    setLoading(true);
    setError('');
    
    try {
      const roomId = await gameService.createRoom(playerId, playerName, maxPlayers, boardSize);
      console.log('Room created:', roomId);
      
      // Subscribe to the room immediately after creation
      const unsubscribe = gameService.subscribeToRoom(roomId, (updatedState) => {
        if (updatedState) {
          setGameState(updatedState);
        }
      });
      
      // Clean up subscription if component unmounts
      return () => unsubscribe();
    } catch (err) {
      setError('Failed to create room');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (roomId: string, playerName: string) => {
    setLoading(true);
    setError('');
    
    try {
      await gameService.joinRoom(roomId, playerId, playerName);
      console.log('Joined room:', roomId);
      
      // Subscribe to the room immediately after joining
      const unsubscribe = gameService.subscribeToRoom(roomId, (updatedState) => {
        if (updatedState) {
          setGameState(updatedState);
        }
      });
      
      // Clean up subscription if component unmounts
      return () => unsubscribe();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = async () => {
    if (!gameState) return;
    
    setLoading(true);
    try {
      await gameService.startGame(gameState.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start game');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMove = async (direction: Direction) => {
    if (!gameState || !playerId) return;
    
    try {
      await gameService.makeMove(gameState.id, playerId, direction);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid move');
      console.error(err);
      setTimeout(() => setError(''), 3000);
    }
  };

  if (!gameState) {
    return (
      <div className="app">
        <RoomManager
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
        />
        {error && <div className="error-message">{error}</div>}
        {loading && <div className="loading">Loading...</div>}
      </div>
    );
  }

  if (gameState.status === 'waiting') {
    return (
      <div className="app">
        <WaitingRoom
          gameState={gameState}
          currentPlayerId={playerId}
          onStartGame={handleStartGame}
        />
        {error && <div className="error-message">{error}</div>}
      </div>
    );
  }

  const isMyTurn = gameState.currentTurnPlayerId === playerId;
  const currentPlayer = gameState.players.find(p => p.id === playerId);

  const handleShareLink = () => {
    navigator.clipboard.writeText(gameState.id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="app">
      <div className="game-container">
        <div className="game-header">
          <h1>Multiplayer Trophy Game</h1>
          {gameState.winner && (
            <div className="winner-announcement">
              🎉 {gameState.players.find(p => p.id === gameState.winner)?.name} Won! 🎉
            </div>
          )}
        </div>
        
        <div className="game-content">
          <div className="game-main">
            <GameBoard
              gameState={gameState}
              currentPlayerId={playerId}
            />
            {!gameState.winner && currentPlayer && (
              <GameControls
                onMove={handleMove}
                isMyTurn={isMyTurn}
                disabled={loading}
              />
            )}
          </div>
          
          <div className="game-sidebar">
            <PlayerList
              players={gameState.players}
              currentTurnPlayerId={gameState.currentTurnPlayerId}
              winner={gameState.winner}
            />
            
            <div className="game-info">
              <p>Room ID: <strong>{gameState.id}</strong></p>
              <button 
                className="share-button"
                onClick={handleShareLink}
              >
                {copied ? 'Room ID Copied!' : 'Copy Room ID'}
              </button>
              {currentPlayer && (
                <p>You are: <strong style={{ color: currentPlayer.color }}>
                  {currentPlayer.name}
                </strong></p>
              )}
            </div>
          </div>
        </div>
        
        {error && <div className="error-message">{error}</div>}
      </div>
    </div>
  );
}

export default App;