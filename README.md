# skribbl-clone
# 🎨 Skribbl Clone – Full-Stack Multiplayer Drawing Game

A fully functional clone of skribbl.io with real-time multiplayer drawing, guessing, public/private rooms, scoring, and a beautiful dark UI.

## 🚀 Live Demo

> Deploy and add your URL here: `https://your-skribbl-clone.onrender.com`

---

## ✨ Features

- **Public & Private Rooms** – Create open rooms anyone can join, or private invite-only rooms
- **Real-time Drawing** – HTML5 Canvas with live stroke sync via WebSockets
- **Drawing Tools** – Pen, Eraser, Flood Fill, 16 colors, 5 brush sizes, Undo, Clear
- **Word Selection** – Drawer picks from 1–5 random words; auto-picks if time runs out
- **Guessing System** – Type to guess; "close!" detection via Levenshtein distance
- **Hints System** – Letters revealed progressively during round
- **Scoring** – Time-bonus scoring + position bonus; drawer earns per-guesser points
- **Leaderboard** – Live score updates; final game-over standings
- **Host Controls** – Kick players, configurable settings (rounds, draw time, word count, hints)
- **Custom Words** – Host can supply their own word list
- **Reconnect Support** – Late joiners get current canvas state replayed
- **Responsive UI** – Works on desktop and mobile

---

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite |
| Canvas | HTML5 Canvas API (custom drawing logic) |
| Backend | Node.js + Express |
| WebSockets | Socket.IO v4 |
| Styling | CSS Variables, Fredoka One + Nunito fonts |

---

## 📦 Project Structure

```
skribbl-clone/
├── backend/
│   ├── server.js        # Express + Socket.IO server
│   ├── Room.js          # Room class (OOP)
│   ├── Game.js          # Game logic (rounds, scoring, hints)
│   ├── Player.js        # Player class
│   └── words.js         # Word lists by category
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── HomePage.jsx    # Create/Join/Browse rooms
    │   │   └── RoomPage.jsx    # Game room (socket event hub)
    │   ├── components/
    │   │   ├── Lobby.jsx       # Pre-game lobby
    │   │   ├── WordSelect.jsx  # Drawer word selection
    │   │   ├── GameArea.jsx    # Main game layout
    │   │   ├── DrawingCanvas.jsx  # Canvas + toolbar
    │   │   ├── Chat.jsx        # Chat + guess input
    │   │   ├── Scoreboard.jsx  # Live scores sidebar
    │   │   ├── RoundEnd.jsx    # Round results overlay
    │   │   └── GameOver.jsx    # Final results + confetti
    │   └── context/
    │       ├── SocketContext.jsx  # Socket.IO singleton
    │       └── GameContext.jsx   # Global game state (useReducer)
    └── vite.config.js
```

---

## 🏃 Running Locally

### Prerequisites
- Node.js 18+
- npm or yarn

### 1. Backend
```bash
cd backend
npm install
npm run dev   # runs on http://localhost:3001
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev   # runs on http://localhost:5173
```

### 3. Open
Visit `http://localhost:5173` in your browser.

---

## 🌐 Deployment

### Option A: Render (Recommended – Full-stack + WebSockets)

1. Push to GitHub
2. Create a new **Web Service** on [render.com](https://render.com)
3. Set **Root Directory** to `backend`
4. Build command: `cd ../frontend && npm install && npm run build && cp -r dist ../backend/`
5. Start command: `node server.js`
6. Set env vars: `NODE_ENV=production`, `PORT=3001`

### Option B: Railway
1. Push to GitHub
2. Create project → Deploy from GitHub
3. Set start command: `cd backend && node server.js`
4. Add env: `NODE_ENV=production`

### Option C: Vercel (Frontend) + Render (Backend)
1. Deploy frontend to Vercel; set `VITE_SOCKET_URL=https://your-backend.onrender.com`
2. Deploy backend to Render

---

## 🔌 WebSocket Events

### Room
| Event | Direction | Payload |
|-------|-----------|---------|
| `create_room` | Client→Server | `{ playerName, settings, isPrivate }` |
| `join_room` | Client→Server | `{ roomId, playerName }` |
| `room_created` | Server→Client | `{ roomId, player, room }` |
| `player_joined` | Server→All | `{ player, players }` |
| `start_game` | Client→Server | `{}` |

### Game
| Event | Direction | Payload |
|-------|-----------|---------|
| `round_start` | Server→All | `{ round, totalRounds, drawerId, drawTime }` |
| `word_options` | Server→Drawer | `{ words }` |
| `word_chosen` | Client→Server | `{ word }` |
| `drawing_phase_start` | Server→All | `{ drawerId, maskedWord, wordLength, timeLeft }` |
| `timer_update` | Server→All | `{ timeLeft }` |
| `hint_revealed` | Server→All | `{ maskedWord }` |
| `round_end` | Server→All | `{ word, scores, nextRound }` |
| `game_over` | Server→All | `{ winner, leaderboard }` |

### Drawing
| Event | Direction | Payload |
|-------|-----------|---------|
| `draw_start` | Drawer→Server | `{ x, y, color, size, isEraser }` |
| `draw_move` | Drawer→Server | `{ x, y }` |
| `draw_end` | Drawer→Server | `{}` |
| `draw_data` | Server→Others | `{ type, ...stroke }` |
| `canvas_clear` | Drawer→Server | `{}` |
| `draw_undo` | Drawer→Server | `{}` |
| `fill_canvas` | Drawer→Server | `{ x, y, color }` |

### Chat & Guessing
| Event | Direction | Payload |
|-------|-----------|---------|
| `guess` | Client→Server | `{ text }` |
| `guess_result` | Server→All | `{ correct, playerId, points, scores }` |
| `chat` | Client→Server | `{ text }` |
| `chat_message` | Server→All | `{ type, text, playerName }` |

---

## 🏗️ Architecture

### OOP Backend
- **`Player`** – score, avatar, round state, guess tracking
- **`Game`** – word selection, hint generation, scoring formulas, stroke storage
- **`Room`** – player map, host management, timer coordination, broadcast via `io.to(room.id)`
- **`server.js`** – Socket.IO event hub; ties Room/Game/Player together

### Stroke Normalization
Coordinates are normalized (0–1) before sending over WebSocket, then denormalized on each client using `x * canvas.width`. This makes drawing resolution-independent.

### Late Join Replay
All strokes are stored in `Game.strokes[]`. When a player joins mid-game, the server sends the full stroke array and the client replays them in order.

### Scoring
- Guesser: `100 + timeBonus(0–400) + positionBonus(0–100)` — faster and earlier = more points
- Drawer: `guessedPlayers * 50` (max 250) — earned at round end

---

## 🎮 Game Flow

```
Lobby → host starts → [for each drawer in shuffled order]:
  word_select (15s) → drawing_phase (drawTime) → round_end (5s)
→ game_over (if all rounds done)
```

---

## 📝 Word Categories

Built-in categories: `animals`, `objects`, `food`, `actions`, `places`, `vehicles`  
Hosts can supply custom words in room settings.
