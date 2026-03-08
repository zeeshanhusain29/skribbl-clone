import { useGame } from '../context/GameContext';
import { useSocket } from '../context/SocketContext';
import { useState, useEffect } from 'react';
import './WordSelect.css';

export default function WordSelect() {
  const { state } = useGame();
  const socket = useSocket();
  const { wordOptions, player, currentDrawer } = state;
  const [countdown, setCountdown] = useState(15);
  const isDrawer = player?.id === currentDrawer?.id;

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(interval); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleChoose = (word) => {
    socket.emit('word_chosen', { word });
  };

  if (!isDrawer) {
    return (
      <div className="word-select-screen">
        <div className="word-select-overlay">
          <div className="card word-select-card waiting animate-pop">
            <div className="drawer-avatar-big">🎨</div>
            <h2>{currentDrawer?.name} is choosing a word...</h2>
            <div className="dots-anim">
              <span className="dot"/><span className="dot"/><span className="dot"/>
            </div>
            <div className="timer-circle">
              <span>{countdown}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="word-select-screen">
      <div className="word-select-overlay">
        <div className="card word-select-card animate-pop">
          <div className="ws-header">
            <h2>Choose Your Word!</h2>
            <div className="ws-timer">
              <div className="timer-ring" style={{ '--progress': `${(countdown / 15) * 100}%` }}>
                <span>{countdown}</span>
              </div>
            </div>
          </div>
          <p className="ws-hint">Pick wisely — others will try to guess it!</p>
          <div className="word-options">
            {wordOptions.map((word, i) => (
              <button
                key={word}
                className="word-option-btn"
                onClick={() => handleChoose(word)}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <span className="word-option-num">{i + 1}</span>
                <span className="word-option-text">{word}</span>
                <span className="word-option-len">{word.length} letters</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
