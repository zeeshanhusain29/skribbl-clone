import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useGame } from '../context/GameContext';
import Lobby from '../components/Lobby';
import GameArea from '../components/GameArea';
import WordSelect from '../components/WordSelect';
import RoundEnd from '../components/RoundEnd';
import GameOver from '../components/GameOver';
import './RoomPage.css';

export default function RoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const socket = useSocket();
  const { state, dispatch } = useGame();
  const [kicked, setKicked] = useState(false);

  // If no player state, redirect to home with room code
  useEffect(() => {
    if (!state.player && socket) {
      navigate(`/?join=${roomId}`);
    }
  }, [state.player, socket, navigate, roomId]);

  useEffect(() => {
    if (!socket) return;

    socket.on('player_joined', ({ players }) => {
      dispatch({ type: 'SET_PLAYERS', payload: players });
    });

    socket.on('player_left', ({ playerId, playerName, players }) => {
      dispatch({ type: 'SET_PLAYERS', payload: players });
      dispatch({ type: 'ADD_MESSAGE', payload: { type: 'system', text: `${playerName} left the room.` } });
    });

    socket.on('host_changed', ({ newHostId, newHostName }) => {
      dispatch({ type: 'SET_ROOM', payload: { ...state.room, hostId: newHostId } });
    });

    socket.on('game_started', ({ drawOrder, players }) => {
      dispatch({ type: 'SET_PLAYERS', payload: players });
      dispatch({ type: 'SET_PHASE', payload: 'starting' });
    });

    socket.on('round_start', ({ round, totalRounds, drawerId, drawerName, drawTime }) => {
      dispatch({ type: 'SET_ROUND', payload: round, totalRounds });
      dispatch({ type: 'SET_CURRENT_DRAWER', payload: { id: drawerId, name: drawerName } });
      dispatch({ type: 'SET_TIME_LEFT', payload: drawTime });
      dispatch({ type: 'SET_MY_WORD', payload: null });
      dispatch({ type: 'SET_STROKES', payload: [] });
      dispatch({ type: 'SET_PHASE', payload: 'round_starting' });
    });

    socket.on('word_options', ({ words }) => {
      dispatch({ type: 'SET_WORD_OPTIONS', payload: words });
      dispatch({ type: 'SET_PHASE', payload: 'word_select' });
    });

    socket.on('your_word', ({ word }) => {
      dispatch({ type: 'SET_MY_WORD', payload: word });
    });

    socket.on('drawing_phase_start', ({ drawerId, drawerName, maskedWord, wordLength, timeLeft }) => {
      dispatch({ type: 'SET_PHASE', payload: 'drawing' });
      dispatch({ type: 'SET_MASKED_WORD', payload: maskedWord });
      dispatch({ type: 'SET_WORD_LENGTH', payload: wordLength });
      dispatch({ type: 'SET_TIME_LEFT', payload: timeLeft });
      dispatch({ type: 'SET_CURRENT_DRAWER', payload: { id: drawerId, name: drawerName } });
    });

    socket.on('timer_update', ({ timeLeft }) => {
      dispatch({ type: 'SET_TIME_LEFT', payload: timeLeft });
    });

    socket.on('hint_revealed', ({ maskedWord }) => {
      dispatch({ type: 'SET_MASKED_WORD', payload: maskedWord });
    });

    socket.on('guess_result', ({ correct, playerId, playerName, points, scores }) => {
      dispatch({ type: 'SET_SCORES', payload: scores });
      dispatch({ type: 'SET_PLAYERS', payload: scores });
    });

    socket.on('chat_message', (msg) => {
      dispatch({ type: 'ADD_MESSAGE', payload: msg });
    });

    socket.on('round_end', (data) => {
      dispatch({ type: 'SET_ROUND_END', payload: data });
    });

    socket.on('game_over', (data) => {
      dispatch({ type: 'SET_GAME_OVER', payload: data });
    });

    socket.on('game_in_progress', (data) => {
      dispatch({ type: 'SET_PHASE', payload: data.phase });
      dispatch({ type: 'SET_CURRENT_DRAWER', payload: { id: data.drawerId, name: data.drawerName } });
      dispatch({ type: 'SET_MASKED_WORD', payload: data.maskedWord });
      dispatch({ type: 'SET_WORD_LENGTH', payload: data.wordLength });
      dispatch({ type: 'SET_ROUND', payload: data.round - 1, totalRounds: data.totalRounds });
      dispatch({ type: 'SET_STROKES', payload: data.strokes || [] });
      dispatch({ type: 'SET_SCORES', payload: data.scores || [] });
    });

    socket.on('kicked', ({ reason }) => {
      setKicked(true);
      setTimeout(() => navigate('/'), 3000);
    });

    return () => {
      socket.off('player_joined');
      socket.off('player_left');
      socket.off('host_changed');
      socket.off('game_started');
      socket.off('round_start');
      socket.off('word_options');
      socket.off('your_word');
      socket.off('drawing_phase_start');
      socket.off('timer_update');
      socket.off('hint_revealed');
      socket.off('guess_result');
      socket.off('chat_message');
      socket.off('round_end');
      socket.off('game_over');
      socket.off('game_in_progress');
      socket.off('kicked');
    };
  }, [socket, dispatch, state.room]);

  if (kicked) {
    return (
      <div className="kicked-screen">
        <div className="kicked-card card">
          <span style={{ fontSize: '4rem' }}>👢</span>
          <h2>You were kicked!</h2>
          <p>Redirecting to home...</p>
        </div>
      </div>
    );
  }

  if (!state.player) return null;

  const { phase } = state;

  return (
    <div className="room-page">
      {/* Room header bar */}
      <div className="room-topbar">
        <div className="room-topbar-left">
          <span className="room-logo">🎨</span>
          <span className="room-id-badge">{roomId}</span>
          {state.room?.isPrivate && <span className="private-badge">🔒 Private</span>}
        </div>
        <div className="room-topbar-right">
          <button className="btn btn-ghost btn-sm" onClick={() => {
            navigator.clipboard.writeText(window.location.href);
          }}>📋 Copy Link</button>
          <button className="btn btn-danger btn-sm" onClick={() => navigate('/')}>
            🚪 Leave
          </button>
        </div>
      </div>

      {/* Phase-based rendering */}
      {(phase === 'lobby' || phase === 'starting') && <Lobby />}
      {phase === 'word_select' && <WordSelect />}
      {(phase === 'drawing' || phase === 'round_starting') && <GameArea />}
      {phase === 'round_end' && <RoundEnd />}
      {phase === 'game_over' && <GameOver />}
    </div>
  );
}
