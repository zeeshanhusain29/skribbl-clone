import { useState, useRef, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useGame } from '../context/GameContext';
import './Chat.css';

export default function Chat({ isDrawer }) {
  const socket = useSocket();
  const { state } = useGame();
  const { messages, player } = state;
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    if (isDrawer) {
      socket.emit('chat', { text: input.trim() });
    } else {
      socket.emit('guess', { text: input.trim() });
    }
    setInput('');
  };

  const getMsgStyle = (msg) => {
    if (msg.type === 'system') return 'msg-system';
    if (msg.type === 'correct_guess') return 'msg-correct';
    if (msg.playerId === player?.id) return 'msg-mine';
    if (msg.isClose) return 'msg-close';
    return 'msg-other';
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <span className="chat-title">💬 Chat</span>
        {!isDrawer && <span className="guess-hint">Type to guess!</span>}
      </div>

      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${getMsgStyle(msg)}`}>
            {msg.type === 'correct_guess' && (
              <div className="correct-guess-msg">
                <span className="correct-icon">🎉</span>
                <span>{msg.text}</span>
              </div>
            )}
            {msg.type === 'system' && (
              <div className="system-msg">{msg.text}</div>
            )}
            {(msg.type === 'guess' || msg.type === 'chat') && (
              <div className="user-msg">
                <span className="msg-author">{msg.playerName}:</span>
                <span className="msg-text">{msg.text}</span>
                {msg.isClose && <span className="close-badge">🔥 Close!</span>}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={handleSend}>
        <input
          className="chat-input"
          placeholder={isDrawer ? 'Chat...' : 'Guess the word...'}
          value={input}
          onChange={e => setInput(e.target.value)}
          maxLength={200}
          disabled={state.phase === 'round_end' || state.phase === 'game_over'}
        />
        <button type="submit" className="chat-send-btn">
          {isDrawer ? '💬' : '🎯'}
        </button>
      </form>
    </div>
  );
}
