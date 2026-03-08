import { useGame } from '../context/GameContext';
import { useSocket } from '../context/SocketContext';
import './Lobby.css';

const AVATARS = ['🐱', '🐶', '🦊', '🐸', '🐼', '🐨', '🦁', '🐯', '🐻', '🦄', '🐙', '🦋'];

export default function Lobby() {
  const { state } = useGame();
  const socket = useSocket();
  const { player, room, players } = state;

  const isHost = player && room && player.id === room.hostId;
  const canStart = players.length >= 2;

  const handleStart = () => {
    socket.emit('start_game');
  };

  const handleKick = (targetId) => {
    socket.emit('kick_player', { targetId });
  };

  const copyInvite = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  return (
    <div className="lobby animate-fadeIn">
      <div className="lobby-inner">
        {/* Left: Settings & Info */}
        <div className="lobby-left">
          <div className="card lobby-card">
            <h2 className="lobby-title">🏠 Game Lobby</h2>

            {room && (
              <div className="room-settings-display">
                <div className="setting-chip">👥 Max {room.settings?.maxPlayers} players</div>
                <div className="setting-chip">🔄 {room.settings?.rounds} rounds</div>
                <div className="setting-chip">⏱️ {room.settings?.drawTime}s draw time</div>
                <div className="setting-chip">📝 {room.settings?.wordCount} word choices</div>
                <div className="setting-chip">💡 {room.settings?.hints} hints</div>
              </div>
            )}

            <div className="invite-section">
              <p className="label">Invite Friends</p>
              <div className="invite-row">
                <div className="room-code-display">{room?.id}</div>
                <button className="btn btn-ghost btn-sm" onClick={copyInvite}>📋 Copy</button>
              </div>
              <p className="invite-hint">Share the room code or link!</p>
            </div>
          </div>

          {isHost && (
            <div className="card lobby-card">
              <h3 className="section-title">🎮 Host Controls</h3>
              <button
                className="btn btn-primary btn-lg w-full"
                onClick={handleStart}
                disabled={!canStart}
              >
                {canStart ? '🚀 Start Game!' : `⏳ Need ${2 - players.length} more player${2 - players.length !== 1 ? 's' : ''}`}
              </button>
              {!canStart && (
                <p className="hint-text">Need at least 2 players to start</p>
              )}
            </div>
          )}

          {!isHost && (
            <div className="card lobby-card waiting-card">
              <div className="waiting-anim">
                <span className="dot" /><span className="dot" /><span className="dot" />
              </div>
              <p>Waiting for host to start the game...</p>
            </div>
          )}
        </div>

        {/* Right: Players */}
        <div className="lobby-right">
          <div className="card lobby-card players-card">
            <h3 className="section-title">
              👥 Players ({players.length}/{room?.settings?.maxPlayers || 8})
            </h3>
            <div className="players-list">
              {players.map((p, i) => (
                <div key={p.id} className={`player-lobby-item ${p.id === player?.id ? 'is-me' : ''}`}
                  style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="player-avatar">{AVATARS[p.avatar || 0]}</div>
                  <div className="player-details">
                    <span className="player-name">
                      {p.name}
                      {p.id === player?.id && <span className="me-badge">You</span>}
                    </span>
                    {p.id === room?.hostId && <span className="host-badge">👑 Host</span>}
                  </div>
                  {isHost && p.id !== player?.id && (
                    <button
                      className="kick-btn"
                      onClick={() => handleKick(p.id)}
                      title="Kick player"
                    >✕</button>
                  )}
                </div>
              ))}
              {/* Empty slots */}
              {Array.from({ length: Math.max(0, (room?.settings?.maxPlayers || 8) - players.length) }).map((_, i) => (
                <div key={`empty-${i}`} className="player-lobby-item empty">
                  <div className="player-avatar empty-avatar">?</div>
                  <span className="empty-name">Waiting...</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
