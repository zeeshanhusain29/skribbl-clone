import { useGame } from '../context/GameContext';
import { useNavigate } from 'react-router-dom';
import './GameOver.css';

const AVATARS = ['🐱', '🐶', '🦊', '🐸', '🐼', '🐨', '🦁', '🐯', '🐻', '🦄', '🐙', '🦋'];

export default function GameOver() {
  const { state, dispatch } = useGame();
  const { gameOverData, player } = state;
  const navigate = useNavigate();

  if (!gameOverData) return null;
  const { winner, leaderboard } = gameOverData;
  const isWinner = winner?.id === player?.id;

  return (
    <div className="game-over animate-fadeIn">
      <div className="confetti-container">
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className="confetti-piece" style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            background: ['#FF6B6B','#FFE66D','#4ECDC4','#A855F7','#FF9F43'][Math.floor(Math.random() * 5)]
          }} />
        ))}
      </div>

      <div className="go-card card animate-pop">
        <div className="go-header">
          <div className="go-trophy">🏆</div>
          <h1>Game Over!</h1>
          {isWinner && <div className="winner-banner animate-bounce">🎉 You Won! 🎉</div>}
        </div>

        <div className="go-winner-display">
          <div className="winner-avatar">{AVATARS[winner?.avatar || 0]}</div>
          <div className="winner-info">
            <span className="winner-label">Winner</span>
            <span className="winner-name">{winner?.name}</span>
            <span className="winner-score">{winner?.score} points</span>
          </div>
        </div>

        <div className="go-leaderboard">
          <h3>Final Standings</h3>
          {leaderboard.map((p, i) => (
            <div key={p.id} className={`go-row ${p.id === player?.id ? 'is-me' : ''} ${i === 0 ? 'is-winner' : ''}`}
              style={{ animationDelay: `${i * 0.1}s` }}>
              <span className="go-rank">
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}
              </span>
              <span className="go-avatar">{AVATARS[p.avatar || 0]}</span>
              <span className="go-name">{p.name}{p.id === player?.id && ' (you)'}</span>
              <div className="go-score-bar">
                <div className="go-score-fill" style={{
                  width: `${leaderboard[0]?.score > 0 ? (p.score / leaderboard[0].score) * 100 : 0}%`
                }} />
              </div>
              <span className="go-pts">{p.score}</span>
            </div>
          ))}
        </div>

        <div className="go-actions">
          <button className="btn btn-primary btn-lg" onClick={() => {
            dispatch({ type: 'RESET' });
            navigate('/');
          }}>🏠 Back to Home</button>
        </div>
      </div>
    </div>
  );
}
