import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

// Production URLs - update these with your actual deployed URLs
const PRODUCTION_BACKEND_URL = 'https://skribbl-backend.onrender.com';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ||
  (window.location.hostname === 'localhost' ? 'http://localhost:3001' : PRODUCTION_BACKEND_URL);

console.log('Connecting to socket URL:', SOCKET_URL);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    console.log('Initializing socket connection...');
    const s = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      timeout: 20000,
      forceNew: true
    });

    s.on('connect', () => {
      console.log('Socket connected successfully');
    });

    s.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    s.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    setSocket(s);
    return () => s.disconnect();
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
