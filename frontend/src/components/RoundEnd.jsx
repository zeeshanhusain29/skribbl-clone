import { useGame } from '../context/GameContext';
import './RoundEnd.css';

const AVATARS = ['🐱', '🐶', '🦊', '🐸', '🐼', '🐨', '🦁', '🐯', '🐻', '🦄', '🐙', '🦋'];

export default function RoundEnd() {
  const { state } = useGame();
  const { roundEndData } = state;

  if (!roundEndData) return null;

  const { word, scores, nextRound } = roundEndData;

  return (
    <div className="round-end animate-fadeIn">
      <div className="round-end-card card animate-pop">
        <div className="re-header">
          <span className="re-emoji">⏰</span>
          <h2>Round Over!</h2>
        </div>

        <div className="re-word-reveal">
          <span className="re-word-label">The word was:</span>
          <span className="re-word">{word}</span>
        </div>

        <div className="re-scores">
          <h3>Leaderboard</h3>
          <div className="re-score-list">
            {scores.map((p, i) => (
              <div key={p.id} className={`re-score-row ${i === 0 ? 'top' : ''}`}>
                <span className="re-rank">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                </span>
                <span className="re-avatar">{AVATARS[p.avatar || 0]}</span>
                <span className="re-name">{p.name}</span>
                <span className="re-pts">{p.score} pts</span>
              </div>
            ))}
          </div>
        </div>

        {nextRound && (
          <div className="re-next">
            <div className="re-next-info">
              {nextRound.nextRound <= nextRound.totalRounds ? (
                <>
                  <span>Next: <strong>{nextRound.nextDrawer}</strong> draws</span>
                  <span className="re-round-num">Round {nextRound.nextRound}/{nextRound.totalRounds}</span>
                </>
              ) : (
                <span>🏁 Final round! Results coming up...</span>
              )}
            </div>
            <div className="re-countdown">Starting in 5s...</div>
          </div>
        )}
      </div>
    </div>
  );
}
