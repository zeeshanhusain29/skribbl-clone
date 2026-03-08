import { useGame } from '../context/GameContext';
import './Scoreboard.css';

const AVATARS = ['🐱', '🐶', '🦊', '🐸', '🐼', '🐨', '🦁', '🐯', '🐻', '🦄', '🐙', '🦋'];

export default function Scoreboard() {
  const { state } = useGame();
  const { players, player: myPlayer, currentDrawer } = state;

  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="scoreboard">
      <div className="scoreboard-header">
        <span className="sb-title">🏆 Scores</span>
      </div>
      <div className="sb-list">
        {sorted.map((p, i) => (
          <div
            key={p.id}
            className={`sb-player ${p.id === myPlayer?.id ? 'is-me' : ''} ${p.isDrawing ? 'is-drawing' : ''} ${p.hasGuessed ? 'has-guessed' : ''}`}
          >
            <span className="sb-rank">
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
            </span>
            <span className="sb-avatar">{AVATARS[p.avatar || 0]}</span>
            <div className="sb-info">
              <span className="sb-name">
                {p.name}
                {p.id === myPlayer?.id && <span className="you-tag">you</span>}
              </span>
              <div className="sb-badges">
                {p.isDrawing && <span className="badge drawing-badge">✏️ Drawing</span>}
                {p.hasGuessed && <span className="badge guessed-badge">✅ Guessed</span>}
              </div>
            </div>
            <span className="sb-score">{p.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
