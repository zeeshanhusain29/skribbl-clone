import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 
  (window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const s = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true
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
