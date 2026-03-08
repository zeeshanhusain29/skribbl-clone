# 🎨 Skribbl Clone - Interview Questions & Answers

## 📚 Project Overview
A full-stack real-time multiplayer drawing and guessing game built with React, Node.js, Socket.IO, and deployed on Render.

---

## 🟢 EASY QUESTIONS

### 1. What is this project about?
**Answer:** This is a Skribbl.io clone - a real-time multiplayer drawing and guessing game where players take turns drawing words while others guess. It's built with React frontend, Node.js backend, and Socket.IO for real-time communication.

### 2. What technologies are used in the frontend?
**Answer:** React 18 with Vite as the build tool, React Router for navigation, Socket.IO client for real-time communication, and vanilla CSS for styling.

### 3. What technologies are used in the backend?
**Answer:** Node.js with Express.js framework, Socket.IO for WebSocket communication, and UUID for generating unique room IDs.

### 4. How does the game work?
**Answer:** Players create or join rooms, the host starts the game, players take turns drawing words while others guess in real-time chat. Points are awarded based on guess speed and accuracy.

### 5. What is the main communication protocol used?
**Answer:** WebSocket protocol via Socket.IO library for real-time bidirectional communication between clients and server.

---

## 🟡 MEDIUM QUESTIONS

### 6. How does room creation work?
**Answer:** When a player creates a room, the backend generates a unique room ID using UUID, stores the room in memory with the creator as host, and emits a 'room_created' event back to the client with room details including the hostId.

### 7. Explain the component structure in React.
**Answer:**
- `App.jsx` - Main router with Socket/Game context providers
- `HomePage.jsx` - Landing page for creating/joining rooms
- `RoomPage.jsx` - Game lobby and gameplay area
- `Lobby.jsx` - Player list and host controls
- `GameArea.jsx` - Main game layout with canvas and sidebar
- `DrawingCanvas.jsx` - HTML5 canvas for drawing
- `Chat.jsx` - Real-time messaging component

### 8. How is state management handled?
**Answer:** Uses React Context API with two main contexts:
- `SocketContext` - Manages WebSocket connection
- `GameContext` - Manages game state (player, room, players, phase, scores, etc.) using useReducer for complex state updates

### 9. How does the drawing synchronization work?
**Answer:** When a player draws, the client emits 'draw' events with stroke data (coordinates, color, size). The server broadcasts these events to all other players in the room, who then render the strokes on their canvas in real-time.

### 10. What is CORS and how is it handled?
**Answer:** CORS (Cross-Origin Resource Sharing) prevents browsers from making requests to different domains. In development, the server allows localhost origins. In production, it allows the deployed frontend domain.

---

## 🟠 HARD QUESTIONS

### 11. How does the host detection work?
**Answer:** Each room stores a `hostId` that matches the socket ID of the room creator. The frontend compares `player.id === room.hostId` to determine if the current user is the host, which enables the "Start Game" button and other host controls.

### 12. Explain the game flow and state management.
**Answer:** The game has phases: 'lobby' → 'starting' → 'word_select' → 'drawing' → 'round_end' → 'game_over'. Each phase triggers different UI components and socket events. State is managed through GameContext with actions like SET_PHASE, SET_ROUND, SET_SCORES, etc.

### 13. How is the word guessing system implemented?
**Answer:** Uses Levenshtein distance algorithm to detect "close" guesses. When a player types a message, the server compares it with the current word using string similarity. If similarity > 0.8, it's considered a close guess. Exact matches get full points, close guesses get partial points.

### 14. How does the drawing canvas handle different screen sizes?
**Answer:** Uses responsive CSS with flexbox layout. Canvas size is set dynamically using `getBoundingClientRect()` and device pixel ratio for crisp rendering on high-DPI displays. Resize events trigger canvas redrawing to maintain aspect ratio.

### 15. What performance optimizations are implemented?
**Answer:**
- Throttled drawing events (60fps limit) to reduce server load
- Compressed coordinate data (rounded values)
- Memory management with stroke limits (1000 max)
- Efficient canvas rendering with proper DPR handling
- Lazy loading and component optimization

---

## 🔴 EXPERT QUESTIONS

### 16. How does the reconnect functionality work?
**Answer:** Socket.IO automatically handles reconnections. When a player reconnects, the server checks if they were in an active room and sends current game state (canvas replay, current word masked, player list, scores) so they can rejoin seamlessly.

### 17. Explain the room cleanup mechanism.
**Answer:** When a game ends, the server sets a 60-second timeout to clean up the room from memory. This allows players to see final results. PlayerRooms map is also cleaned up to prevent memory leaks.

### 18. How is the turn-based drawing system implemented?
**Answer:** Server maintains a `drawOrder` array of player IDs. After each round, it rotates to the next player using `currentDrawerIndex`. The server emits 'round_start' with the current drawer ID, and clients show drawing tools only for that player.

### 19. What security measures are implemented?
**Answer:**
- Input validation for room codes, player names
- Rate limiting on socket events
- CORS configuration for production
- No direct database access (in-memory storage)
- Sanitized chat messages
- Host-only actions validation on server-side

### 20. How would you scale this application?
**Answer:**
- **Horizontal Scaling:** Use Redis adapter for Socket.IO clustering
- **Database:** Replace in-memory storage with Redis/MongoDB
- **Load Balancing:** Nginx or cloud load balancers
- **Caching:** Cache public room lists
- **CDN:** Static assets via CDN
- **Monitoring:** Add logging and performance monitoring

### 21. What are the potential race conditions and how are they handled?
**Answer:** Multiple players joining simultaneously could cause issues. Server uses synchronous operations for room/player management. Socket.IO ensures ordered message delivery. Game state changes are atomic operations.

### 22. How does the hint system work?
**Answer:** Server pre-calculates hint positions in the word. Every few seconds (based on draw time), it reveals letters at those positions. Clients receive 'hint_revealed' events and update the masked word display progressively.

### 23. Explain the deployment architecture.
**Answer:** Monorepo with separate frontend/backend services on Render. Frontend is static site served by Node.js with 'serve' package. Backend is Node.js API server. Environment variables connect them. Blueprint deployment ensures proper build order.

### 24. How would you add authentication?
**Answer:** Implement JWT tokens with refresh tokens. Add login/signup endpoints. Store user sessions in Redis. Associate game rooms with authenticated users. Add password reset, email verification.

### 25. What monitoring and logging would you add?
**Answer:**
- Socket connection/disconnection logs
- Game event tracking (room created, game started, etc.)
- Performance metrics (response times, memory usage)
- Error tracking with stack traces
- User activity analytics
- Server health checks

---

## 🎯 System Design Questions

### 26. How would you handle 1000+ concurrent users?
**Answer:**
- **Microservices:** Split into game-server, chat-server, user-service
- **Redis:** For session storage and pub/sub
- **Load Balancer:** Distribute users across multiple server instances
- **Database:** PostgreSQL with read replicas
- **Caching:** Redis for room data and frequently accessed info
- **CDN:** For static assets and canvas images

### 27. How would you implement private messaging?
**Answer:** Add direct message events between specific socket IDs. Server validates friendship/permissions. Store message history in database. Add encryption for sensitive messages.

### 28. How would you add voice chat?
**Answer:** Use WebRTC for peer-to-peer audio. Socket.IO for signaling. Implement mute/unmute controls. Add audio processing for noise reduction. Handle network quality detection.

### 29. How would you implement game recordings?
**Answer:** Store all drawing events with timestamps. Create replay system that can reconstruct games. Save to database with compression. Add privacy controls for who can view recordings.

### 30. How would you handle cheating prevention?
**Answer:** Server-side validation of all game actions. Time-based anti-spam. Drawing stroke validation. Guess similarity checking. Report system for toxic behavior. Automated bot detection.

---

## 🛠️ Code Quality Questions

### 31. What testing strategies would you implement?
**Answer:**
- **Unit Tests:** Jest for React components and Node.js functions
- **Integration Tests:** Socket.IO event testing
- **E2E Tests:** Playwright/Cypress for full game flows
- **Load Testing:** Artillery for concurrent user simulation
- **Visual Regression:** For UI consistency

### 32. How would you improve error handling?
**Answer:** Global error boundaries in React. Try-catch blocks around async operations. Proper error responses from API. Client-side error reporting. Graceful degradation when features fail.

### 33. What accessibility features would you add?
**Answer:** ARIA labels for screen readers. Keyboard navigation. High contrast mode. Color-blind friendly color schemes. Voice announcements for game events. Touch targets minimum 44px.

### 34. How would you optimize bundle size?
**Answer:** Code splitting with React.lazy. Tree shaking. Image optimization. Remove unused dependencies. Compress assets. Use CDN for third-party libraries.

### 35. What CI/CD improvements would you make?
**Answer:** GitHub Actions for automated testing. Pre-commit hooks with ESLint/Prettier. Automated deployment on merge. Rollback strategies. Environment-specific configurations.

---

## 📱 Mobile-Specific Questions

### 36. How does touch drawing work on mobile?
**Answer:** Uses Pointer Events API for unified touch/mouse handling. Prevents default touch behaviors with `touch-action: none`. Scales coordinates properly for different screen densities.

### 37. How is the responsive design implemented?
**Answer:** CSS Grid and Flexbox for layout. Media queries for different breakpoints. Dynamic canvas sizing. Touch-friendly button sizes (minimum 44px). Optimized toolbar for mobile screens.

### 38. What mobile performance optimizations are there?
**Answer:** Reduced animation complexity on mobile. Throttled touch events. Optimized canvas rendering. Lazy loading of non-critical components. Compressed network payloads.

---

## 🔒 Security Questions

### 39. What are the main security vulnerabilities?
**Answer:** XSS in chat messages, CSRF attacks, DoS through spam messages, unauthorized room access, data leakage through WebSocket events.

### 40. How would you secure the WebSocket connections?
**Answer:** Use WSS (WebSocket Secure) in production. Implement authentication tokens. Rate limiting on socket events. Input sanitization. Connection origin validation.

---

## 🚀 Future Enhancements

### 41. What features would you add next?
**Answer:** Voice chat, game recordings, private messaging, themes, power-ups, tournaments, mobile app, social features, achievements system.

### 42. How would you implement a leaderboard system?
**Answer:** Global Redis-based leaderboard. Daily/weekly/monthly rankings. ELO rating system. Anti-cheating measures. Cached for performance.

### 43. How would you add custom word packs?
**Answer:** Admin panel for word management. Database storage for word packs. User-generated content with moderation. Category-based word selection.

---

## 🎯 Interview Tips

**For this project, be ready to discuss:**
- Real-time application architecture
- WebSocket communication patterns
- State management in React
- Performance optimization techniques
- Mobile-responsive design
- Deployment strategies
- Game logic implementation
- Error handling and debugging

**Key technologies to master:**
- React Hooks (useEffect, useState, useContext, useReducer)
- Socket.IO (events, rooms, namespaces)
- HTML5 Canvas API
- CSS Grid/Flexbox
- Node.js async patterns
- Real-time application scaling

Good luck with your interview! 🎉</content>
<parameter name="filePath">c:\Users\mdzee\Downloads\skribblclone1\skribbl-clone\INTERVIEW_QUESTIONS.md