import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import { GameProvider } from './context/GameContext';
import HomePage from './pages/HomePage';
import RoomPage from './pages/RoomPage';

export default function App() {
  return (
    <BrowserRouter>
      <SocketProvider>
        <GameProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/room/:roomId" element={<RoomPage />} />
          </Routes>
        </GameProvider>
      </SocketProvider>
    </BrowserRouter>
  );
}
