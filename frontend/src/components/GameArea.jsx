import { useGame } from '../context/GameContext';
import DrawingCanvas from './DrawingCanvas';
import Chat from './Chat';
import Scoreboard from './Scoreboard';
import './GameArea.css';

export default function GameArea() {
  const { state } = useGame();
  const { player, currentDrawer, maskedWord, wordLength, timeLeft, round, totalRounds, myWord, phase } = state;

  const isDrawer = player?.id === currentDrawer?.id;
  const timePercent = totalRounds > 0 ? (timeLeft / (state.room?.settings?.drawTime || 80)) * 100 : 100;
  const isLowTime = timeLeft <= 10 && timeLeft > 0;

  return (
    <div className="game-area animate-fadeIn">
      {/* Top HUD */}
      <div className="game-hud">
        <div className="hud-round">
          <span className="hud-label">Round</span>
          <span className="hud-value">{round + 1} / {totalRounds}</span>
        </div>

        <div className="hud-center">
          {phase === 'round_starting' ? (
            <div className="starting-text">
              <span className="drawer-name">{currentDrawer?.name}</span>
              <span className="is-drawing-label"> is choosing a word...</span>
            </div>
          ) : (
            <>
              {isDrawer ? (
                <div className="word-display drawer">
                  <span className="word-label">Your word:</span>
                  <span className="my-word">{myWord}</span>
                </div>
              ) : (
                <div className="word-display guesser">
                  {maskedWord.split('').map((char, i) => (
                    <span key={i} className={`word-char ${char !== '_' && char !== ' ' ? 'revealed' : ''} ${char === ' ' ? 'space' : ''}`}>
                      {char === ' ' ? '' : char === '_' ? '' : char}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className={`hud-timer ${isLowTime ? 'low-time' : ''}`}>
          <div className="timer-track">
            <div className="timer-fill" style={{ width: `${Math.max(0, timePercent)}%`, background: isLowTime ? 'var(--danger)' : 'var(--secondary)' }} />
          </div>
          <span className={`timer-num ${isLowTime ? 'animate-bounce' : ''}`}>{timeLeft}</span>
        </div>
      </div>

      {/* Drawer label */}
      {phase === 'drawing' && (
        <div className="drawer-indicator">
          {isDrawer ? '✏️ You are drawing!' : `👁️ ${currentDrawer?.name} is drawing`}
        </div>
      )}

      {/* Main content */}
      <div className="game-body">
        {/* Left: Scoreboard */}
        <div className="game-sidebar-left">
          <Scoreboard />
        </div>

        {/* Center: Canvas */}
        <div className="game-canvas-area">
          <DrawingCanvas isDrawer={isDrawer} />
        </div>

        {/* Right: Chat */}
        <div className="game-sidebar-right">
          <Chat isDrawer={isDrawer} />
        </div>
      </div>
    </div>
  );
}
