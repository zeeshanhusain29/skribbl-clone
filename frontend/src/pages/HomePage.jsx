import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useGame } from '../context/GameContext';
import './HomePage.css';

const AVATARS = ['🐱', '🐶', '🦊', '🐸', '🐼', '🐨', '🦁', '🐯', '🐻', '🦄', '🐙', '🦋'];

export default function HomePage() {
  const navigate = useNavigate();
  const socket = useSocket();
  const { dispatch } = useGame();

  const [tab, setTab] = useState('home'); // home, create, join, browse
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('playerName') || '');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [publicRooms, setPublicRooms] = useState([]);
  const [selectedAvatar, setSelectedAvatar] = useState(() => parseInt(localStorage.getItem('avatar') || '0'));
  const [settings, setSettings] = useState({
    maxPlayers: 8, rounds: 3, drawTime: 80,
    wordCount: 3, hints: 2, customWords: ''
  });
  const [isPrivate, setIsPrivate] = useState(false);

  // Check for room in URL (both pathname and query params)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const joinParam = urlParams.get('join');
    const errorParam = urlParams.get('error');
    const path = window.location.pathname;
    const pathMatch = path.match(/\/room\/([A-Z0-9]+)/i);

    console.log('URL check:', { path, search: window.location.search, joinParam, errorParam, pathMatch });

    let roomCodeFromUrl = null;

    // Check pathname first (direct /room/ABC123 links)
    if (pathMatch) {
      roomCodeFromUrl = pathMatch[1].toUpperCase();
    }
    // Check query param (redirects from RoomPage)
    else if (joinParam) {
      roomCodeFromUrl = joinParam.toUpperCase();
    }

    if (roomCodeFromUrl) {
      console.log('Found room code from URL:', roomCodeFromUrl);
      setRoomCode(roomCodeFromUrl);
      setTab('join');
      // Clean up URL by removing query param
      if (joinParam) {
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }

    // Handle error messages
    if (errorParam === 'room_not_found') {
      setError('Room not found or has ended. Please check the room code.');
      setTab('join');
    }
  }, []);

  useEffect(() => {
    if (tab === 'browse') fetchPublicRooms();
  }, [tab]);

  useEffect(() => {
    if (!socket) return;

    socket.on('room_created', ({ roomId, player, room }) => {
      dispatch({ type: 'SET_PLAYER', payload: player });
      dispatch({ type: 'SET_ROOM', payload: room });
      dispatch({ type: 'SET_PLAYERS', payload: room.players });
      navigate(`/room/${roomId}`);
    });

    socket.on('room_joined', ({ roomId, player, room }) => {
      dispatch({ type: 'SET_PLAYER', payload: player });
      dispatch({ type: 'SET_ROOM', payload: room });
      dispatch({ type: 'SET_PLAYERS', payload: room.players });
      navigate(`/room/${roomId}`);
    });

    socket.on('error', ({ message }) => {
      setError(message);
      setLoading(false);
    });

    return () => {
      socket.off('room_created');
      socket.off('room_joined');
      socket.off('error');
    };
  }, [socket, navigate, dispatch]);

  const fetchPublicRooms = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 
        (window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin);
      const res = await fetch(`${backendUrl}/api/rooms`);
      const data = await res.json();
      setPublicRooms(data);
    } catch (error) {
      console.error('Failed to fetch public rooms:', error);
    }
  };

  const handleCreate = () => {
    if (!playerName.trim()) return setError('Enter your name!');
    if (playerName.trim().length < 2) return setError('Name too short!');
    setError('');
    setLoading(true);
    localStorage.setItem('playerName', playerName.trim());
    localStorage.setItem('avatar', selectedAvatar);

    const customWordsList = settings.customWords
      .split(',').map(w => w.trim()).filter(Boolean);

    socket.emit('create_room', {
      playerName: playerName.trim(),
      isPrivate,
      settings: {
        maxPlayers: settings.maxPlayers,
        rounds: settings.rounds,
        drawTime: settings.drawTime,
        wordCount: settings.wordCount,
        hints: settings.hints,
        customWords: customWordsList
      }
    });
  };

  const handleJoin = (code) => {
    const rc = (code || roomCode).trim().toUpperCase();
    if (!playerName.trim()) return setError('Enter your name!');
    if (!rc) return setError('Enter room code!');
    setError('');
    setLoading(true);
    localStorage.setItem('playerName', playerName.trim());
    localStorage.setItem('avatar', selectedAvatar);
    socket.emit('join_room', { roomId: rc, playerName: playerName.trim() });
  };

  return (
    <div className="home-page">
      <div className="bg-blobs">
        <div className="blob blob1" />
        <div className="blob blob2" />
        <div className="blob blob3" />
      </div>

      <div className="home-container">
        {/* Header */}
        <div className="home-header animate-fadeIn">
          <div className="logo-wrap">
            <span className="logo-icon">🎨</span>
            <h1 className="logo-text">Skribbl</h1>
            <span className="logo-icon">✏️</span>
          </div>
          <p className="tagline">Draw. Guess. Laugh. Repeat!</p>
        </div>

        {/* Main Card */}
        <div className="home-card card animate-fadeIn" style={{ animationDelay: '0.1s' }}>
          {/* Name & Avatar */}
          <div className="name-section">
            <div className="avatar-row">
              {AVATARS.map((a, i) => (
                <button
                  key={i}
                  className={`avatar-btn ${selectedAvatar === i ? 'selected' : ''}`}
                  onClick={() => setSelectedAvatar(i)}
                >{a}</button>
              ))}
            </div>
            <div className="name-input-row">
              <div className="selected-avatar">{AVATARS[selectedAvatar]}</div>
              <input
                className="input"
                placeholder="Your nickname..."
                value={playerName}
                maxLength={20}
                onChange={e => { setPlayerName(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && tab === 'join' && handleJoin()}
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="home-tabs">
            {[
              { id: 'home', label: '🏠 Home' },
              { id: 'create', label: '➕ Create' },
              { id: 'join', label: '🔗 Join' },
              { id: 'browse', label: '🌐 Browse' }
            ].map(t => (
              <button
                key={t.id}
                className={`tab-btn ${tab === t.id ? 'active' : ''}`}
                onClick={() => { setTab(t.id); setError(''); }}
              >{t.label}</button>
            ))}
          </div>

          {/* Tab Content */}
          {tab === 'home' && (
            <div className="tab-content animate-fadeIn">
              <div className="home-actions">
                <button className="btn btn-primary btn-lg" onClick={() => setTab('create')}>
                  ✏️ Create Room
                </button>
                <button className="btn btn-secondary btn-lg" onClick={() => setTab('join')}>
                  🔗 Join Room
                </button>
                <button className="btn btn-ghost btn-lg" onClick={() => setTab('browse')}>
                  🌐 Browse Rooms
                </button>
              </div>
              <div className="how-to-play">
                <h3>How to Play</h3>
                <div className="steps">
                  {[
                    { icon: '🏠', text: 'Create or join a room' },
                    { icon: '🎨', text: 'Draw the secret word' },
                    { icon: '💡', text: 'Guess others\' drawings' },
                    { icon: '🏆', text: 'Most points wins!' }
                  ].map((s, i) => (
                    <div key={i} className="step">
                      <div className="step-icon">{s.icon}</div>
                      <span>{s.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'create' && (
            <div className="tab-content animate-fadeIn">
              <div className="settings-grid">
                {[
                  { key: 'maxPlayers', label: '👥 Players', min: 2, max: 20, step: 1 },
                  { key: 'rounds', label: '🔄 Rounds', min: 1, max: 10, step: 1 },
                  { key: 'drawTime', label: '⏱️ Draw Time (s)', min: 15, max: 240, step: 5 },
                  { key: 'wordCount', label: '📝 Word Choices', min: 1, max: 5, step: 1 },
                  { key: 'hints', label: '💡 Hints', min: 0, max: 5, step: 1 },
                ].map(({ key, label, min, max, step }) => (
                  <div key={key} className="setting-row">
                    <label className="label">{label}</label>
                    <div className="setting-control">
                      <button className="btn btn-ghost btn-sm"
                        onClick={() => setSettings(s => ({ ...s, [key]: Math.max(min, s[key] - step) }))}>−</button>
                      <span className="setting-value">{settings[key]}</span>
                      <button className="btn btn-ghost btn-sm"
                        onClick={() => setSettings(s => ({ ...s, [key]: Math.min(max, s[key] + step) }))}>+</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="setting-row-full">
                <label className="label">📋 Custom Words (comma separated)</label>
                <input
                  className="input"
                  placeholder="cat, pizza, rainbow, ..."
                  value={settings.customWords}
                  onChange={e => setSettings(s => ({ ...s, customWords: e.target.value }))}
                />
              </div>

              <div className="private-toggle">
                <button
                  className={`toggle-btn ${isPrivate ? 'active' : ''}`}
                  onClick={() => setIsPrivate(p => !p)}
                >
                  {isPrivate ? '🔒 Private Room' : '🌐 Public Room'}
                </button>
                <span className="toggle-hint">
                  {isPrivate ? 'Only people with link can join' : 'Anyone can find and join'}
                </span>
              </div>

              {error && <div className="error-msg animate-pop">{error}</div>}

              <button className="btn btn-primary btn-lg w-full" onClick={handleCreate} disabled={loading}>
                {loading ? '⏳ Creating...' : '🚀 Create Room'}
              </button>
            </div>
          )}

          {tab === 'join' && (
            <div className="tab-content animate-fadeIn">
              <div className="join-section">
                <label className="label">🔗 Room Code</label>
                <input
                  className="input room-code-input"
                  placeholder="Enter room code..."
                  value={roomCode}
                  maxLength={8}
                  onChange={e => { setRoomCode(e.target.value.toUpperCase()); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleJoin()}
                  autoFocus
                />
                {error && <div className="error-msg animate-pop">{error}</div>}
                <button className="btn btn-primary btn-lg w-full" onClick={() => handleJoin()} disabled={loading}>
                  {loading ? '⏳ Joining...' : '🎮 Join Room'}
                </button>
              </div>
            </div>
          )}

          {tab === 'browse' && (
            <div className="tab-content animate-fadeIn">
              <div className="browse-header">
                <span>{publicRooms.length} open room{publicRooms.length !== 1 ? 's' : ''}</span>
                <button className="btn btn-ghost btn-sm" onClick={fetchPublicRooms}>🔄 Refresh</button>
              </div>
              {publicRooms.length === 0 ? (
                <div className="empty-rooms">
                  <span style={{ fontSize: '3rem' }}>🎨</span>
                  <p>No open rooms. Be the first!</p>
                  <button className="btn btn-primary" onClick={() => setTab('create')}>Create Room</button>
                </div>
              ) : (
                <div className="room-list">
                  {publicRooms.map(room => (
                    <div key={room.id} className="room-item">
                      <div className="room-info">
                        <div className="room-id">{room.id}</div>
                        <div className="room-meta">
                          <span>👤 {room.hostName}</span>
                          <span>🔄 {room.rounds} rounds</span>
                          <span>⏱️ {room.drawTime}s</span>
                        </div>
                        <div className="room-players">
                          <div className="player-bar">
                            <div className="player-fill" style={{ width: `${(room.playerCount / room.maxPlayers) * 100}%` }} />
                          </div>
                          <span>{room.playerCount}/{room.maxPlayers} players</span>
                        </div>
                      </div>
                      <button className="btn btn-secondary btn-sm" onClick={() => {
                        setRoomCode(room.id);
                        handleJoin(room.id);
                      }}>Join</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
