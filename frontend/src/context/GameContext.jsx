import { createContext, useContext, useReducer } from 'react';

const GameContext = createContext(null);

const initialState = {
  player: null,
  room: null,
  players: [],
  phase: 'lobby', // lobby, word_select, drawing, round_end, game_over
  currentDrawer: null,
  maskedWord: '',
  wordLength: [],
  myWord: null, // only for drawer
  wordOptions: [],
  timeLeft: 0,
  round: 0,
  totalRounds: 0,
  scores: [],
  messages: [],
  strokes: [],
  roundEndData: null,
  gameOverData: null
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_PLAYER': return { ...state, player: action.payload };
    case 'SET_ROOM': return { ...state, room: action.payload };
    case 'SET_PLAYERS': return { ...state, players: action.payload };
    case 'SET_PHASE': return { ...state, phase: action.payload };
    case 'SET_CURRENT_DRAWER': return { ...state, currentDrawer: action.payload };
    case 'SET_MASKED_WORD': return { ...state, maskedWord: action.payload };
    case 'SET_WORD_LENGTH': return { ...state, wordLength: action.payload };
    case 'SET_MY_WORD': return { ...state, myWord: action.payload };
    case 'SET_WORD_OPTIONS': return { ...state, wordOptions: action.payload };
    case 'SET_TIME_LEFT': return { ...state, timeLeft: action.payload };
    case 'SET_ROUND': return { ...state, round: action.payload, totalRounds: action.totalRounds || state.totalRounds };
    case 'SET_SCORES': return { ...state, scores: action.payload };
    case 'ADD_MESSAGE': return { ...state, messages: [...state.messages.slice(-100), action.payload] };
    case 'SET_STROKES': return { ...state, strokes: action.payload };
    case 'SET_ROUND_END': return { ...state, roundEndData: action.payload, phase: 'round_end' };
    case 'SET_GAME_OVER': return { ...state, gameOverData: action.payload, phase: 'game_over' };
    case 'RESET': return { ...initialState };
    default: return state;
  }
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  return useContext(GameContext);
}
