const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const Room = require('./Room');
const Player = require('./Player');

const app = express();
const server = http.createServer(app);

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL || '*']
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];

const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? '*' : allowedOrigins,
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling']
});

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? '*' : allowedOrigins
}));
app.use(express.json());

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
}

// In-memory store
const rooms = new Map(); // roomId -> Room
const playerRooms = new Map(); // socketId -> roomId

// REST API endpoints
app.get('/api/rooms', (req, res) => {
  const publicRooms = Array.from(rooms.values())
    .filter(r => !r.isPrivate && r.status === 'lobby' && r.players.size < r.game.settings.maxPlayers)
    .map(r => r.toPublicInfo());
  res.json(publicRooms);
});

app.get('/api/room/:roomId', (req, res) => {
  const room = rooms.get(req.params.roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json(room.toPublicInfo());
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', rooms: rooms.size });
});

// Game logic helpers
function startRound(room, io) {
  room.resetPlayersForRound();
  room.game.clearStrokes();

  const drawer = room.getCurrentDrawer();
  if (!drawer) {
    endGame(room, io);
    return;
  }

  drawer.isDrawing = true;
  const wordOptions = room.game.getWordOptions();
  room.game.wordOptions = wordOptions;
  room.game.phase = 'word_select';

  // Broadcast round start
  io.to(room.id).emit('round_start', {
    round: room.currentRound,
    totalRounds: room.game.settings.rounds,
    drawerId: drawer.id,
    drawerName: drawer.name,
    drawTime: room.game.settings.drawTime
  });

  // Send word options only to drawer
  io.to(drawer.id).emit('word_options', { words: wordOptions });

  // Auto-select word if drawer doesn't choose in 15s
  room.wordChoiceTimeout = setTimeout(() => {
    if (room.game.phase === 'word_select') {
      const autoWord = wordOptions[Math.floor(Math.random() * wordOptions.length)];
      handleWordChosen(room, drawer.id, autoWord, io);
    }
  }, 15000);
}

function handleWordChosen(room, drawerId, word, io) {
  if (room.wordChoiceTimeout) {
    clearTimeout(room.wordChoiceTimeout);
    room.wordChoiceTimeout = null;
  }

  room.game.currentWord = word;
  room.game.phase = 'drawing';
  room.game.revealedHints = [];

  const hintPositions = room.game.generateHints(word);
  room.game.allHintPositions = hintPositions;

  const drawer = room.players.get(drawerId);
  let timeLeft = room.game.settings.drawTime;

  // Broadcast drawing phase start
  io.to(room.id).emit('drawing_phase_start', {
    drawerId: drawerId,
    drawerName: drawer?.name,
    wordLength: word.split(' ').map(w => w.length),
    maskedWord: room.game.getMaskedWord(word, []),
    timeLeft: timeLeft
  });

  // Send actual word to drawer
  io.to(drawerId).emit('your_word', { word: word });

  // Timer interval
  room.timerInterval = setInterval(() => {
    timeLeft--;
    io.to(room.id).emit('timer_update', { timeLeft });

    if (timeLeft <= 0) {
      clearInterval(room.timerInterval);
      endRound(room, io);
    }
  }, 1000);

  // Schedule hints
  if (room.game.settings.hints > 0 && hintPositions.length > 0) {
    const hintsToReveal = Math.min(room.game.settings.hints, hintPositions.length);
    const hintInterval = Math.floor(room.game.settings.drawTime / (hintsToReveal + 1));

    for (let i = 0; i < hintsToReveal; i++) {
      const timeout = setTimeout(() => {
        if (room.game.phase !== 'drawing') return;
        room.game.revealedHints.push(hintPositions[i]);
        const masked = room.game.getMaskedWord(word, room.game.revealedHints);
        io.to(room.id).emit('hint_revealed', {
          maskedWord: masked,
          hintCount: room.game.revealedHints.length
        });
      }, (i + 1) * hintInterval * 1000);
      room.hintTimeouts.push(timeout);
    }
  }
}

function endRound(room, io) {
  room.game.phase = 'round_end';
  room.hintTimeouts.forEach(t => clearTimeout(t));
  room.hintTimeouts = [];
  if (room.timerInterval) clearInterval(room.timerInterval);

  const drawer = room.getCurrentDrawer();
  const guessedCount = room.getGuessedCount();
  
  // Award drawer score
  if (drawer && guessedCount > 0) {
    const drawerPoints = room.game.calculateDrawerScore(guessedCount, room.getPlayerCount());
    drawer.addScore(drawerPoints);
  }

  io.to(room.id).emit('round_end', {
    word: room.game.currentWord,
    scores: room.getLeaderboard(),
    nextRound: getNextRoundInfo(room)
  });

  // Move to next drawer
  room.currentDrawerIndex++;

  // Check if all players have drawn this round
  if (room.currentDrawerIndex >= room.drawOrder.length) {
    room.currentRound++;
    room.currentDrawerIndex = 0;
    // Re-shuffle draw order for next round
    room.drawOrder = shuffleArray([...room.drawOrder]);

    if (room.currentRound >= room.game.settings.rounds) {
      setTimeout(() => endGame(room, io), 5000);
      return;
    }
  }

  // Start next round after delay
  setTimeout(() => {
    if (room.status === 'playing') {
      startRound(room, io);
    }
  }, 5000);
}

function endGame(room, io) {
  room.status = 'ended';
  room.game.phase = 'game_over';

  const leaderboard = room.getLeaderboard();
  const winner = leaderboard[0];

  io.to(room.id).emit('game_over', {
    winner: winner,
    leaderboard: leaderboard
  });

  // Clean up room after 60s
  setTimeout(() => {
    rooms.delete(room.id);
    room.players.forEach((_, socketId) => playerRooms.delete(socketId));
  }, 60000);
}

function getNextRoundInfo(room) {
  const nextDrawerIndex = (room.currentDrawerIndex + 1) % room.drawOrder.length;
  const nextDrawerId = room.drawOrder[nextDrawerIndex];
  const nextDrawer = room.players.get(nextDrawerId);
  const nextRoundNum = room.currentDrawerIndex + 1 >= room.drawOrder.length
    ? room.currentRound + 2
    : room.currentRound + 1;
  return {
    nextDrawer: nextDrawer?.name,
    nextRound: nextRoundNum,
    totalRounds: room.game.settings.rounds
  };
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Socket.IO event handling
io.on('connection', (socket) => {
  console.log(`[+] Connected: ${socket.id}`);

  // --- ROOM MANAGEMENT ---
  socket.on('create_room', ({ playerName, settings, isPrivate }) => {
    if (!playerName?.trim()) return socket.emit('error', { message: 'Name required' });

    const room = new Room(socket.id, playerName, settings || {}, isPrivate || false);
    const player = new Player(socket.id, playerName.trim(), room.id);

    room.addPlayer(player);
    rooms.set(room.id, room);
    playerRooms.set(socket.id, room.id);

    socket.join(room.id);
    socket.emit('room_created', {
      roomId: room.id,
      player: player.toJSON(),
      room: {
        id: room.id,
        isPrivate: room.isPrivate,
        settings: room.game.settings,
        players: room.getPlayerList()
      }
    });
    console.log(`Room ${room.id} created by ${playerName}`);
  });

  socket.on('join_room', ({ roomId, playerName }) => {
    if (!playerName?.trim()) return socket.emit('error', { message: 'Name required' });
    
    const upperRoomId = roomId?.trim().toUpperCase();
    const room = rooms.get(upperRoomId);

    if (!room) return socket.emit('error', { message: 'Room not found' });
    if (room.players.size >= room.game.settings.maxPlayers) return socket.emit('error', { message: 'Room is full' });
    if (room.status === 'ended') return socket.emit('error', { message: 'Game has ended' });

    // Check for duplicate name
    const nameExists = Array.from(room.players.values()).some(
      p => p.name.toLowerCase() === playerName.trim().toLowerCase()
    );
    if (nameExists) return socket.emit('error', { message: 'Name already taken in this room' });

    const player = new Player(socket.id, playerName.trim(), upperRoomId);
    room.addPlayer(player);
    playerRooms.set(socket.id, upperRoomId);
    socket.join(upperRoomId);

    // Send current state to new player
    socket.emit('room_joined', {
      roomId: upperRoomId,
      player: player.toJSON(),
      room: {
        id: room.id,
        isPrivate: room.isPrivate,
        settings: room.game.settings,
        players: room.getPlayerList(),
        status: room.status,
        hostId: room.hostId
      }
    });

    // If game is in progress, send current state
    if (room.status === 'playing' && room.game.phase === 'drawing') {
      socket.emit('game_in_progress', {
        phase: room.game.phase,
        drawerId: room.getCurrentDrawer()?.id,
        drawerName: room.getCurrentDrawer()?.name,
        maskedWord: room.game.getMaskedWord(room.game.currentWord, room.game.revealedHints),
        wordLength: room.game.currentWord?.split(' ').map(w => w.length),
        round: room.currentRound + 1,
        totalRounds: room.game.settings.rounds,
        strokes: room.game.strokes,
        scores: room.getLeaderboard()
      });
    }

    // Broadcast to others
    socket.to(upperRoomId).emit('player_joined', {
      player: player.toJSON(),
      players: room.getPlayerList()
    });

    // System message
    io.to(upperRoomId).emit('chat_message', {
      type: 'system',
      text: `${playerName} joined the room!`
    });
  });

  socket.on('start_game', () => {
    const roomId = playerRooms.get(socket.id);
    const room = rooms.get(roomId);
    if (!room) return;
    if (!room.isHost(socket.id)) return socket.emit('error', { message: 'Only host can start' });
    if (room.players.size < 2) return socket.emit('error', { message: 'Need at least 2 players' });
    if (room.status !== 'lobby') return;

    room.status = 'playing';
    room.currentRound = 0;
    room.currentDrawerIndex = 0;
    room.drawOrder = shuffleArray(Array.from(room.players.keys()));

    io.to(roomId).emit('game_started', {
      drawOrder: room.drawOrder,
      players: room.getPlayerList()
    });

    setTimeout(() => startRound(room, io), 1000);
  });

  socket.on('word_chosen', ({ word }) => {
    const roomId = playerRooms.get(socket.id);
    const room = rooms.get(roomId);
    if (!room) return;
    if (room.game.phase !== 'word_select') return;

    const drawer = room.getCurrentDrawer();
    if (!drawer || drawer.id !== socket.id) return;
    if (!room.game.wordOptions.includes(word)) return;

    handleWordChosen(room, socket.id, word, io);
  });

  // --- DRAWING ---
  socket.on('draw_start', (data) => {
    const roomId = playerRooms.get(socket.id);
    const room = rooms.get(roomId);
    if (!room || room.game.phase !== 'drawing') return;
    const drawer = room.getCurrentDrawer();
    if (!drawer || drawer.id !== socket.id) return;

    const stroke = { type: 'start', ...data };
    room.game.addStroke(stroke);
    socket.to(roomId).emit('draw_data', stroke);
  });

  socket.on('draw_move', (data) => {
    const roomId = playerRooms.get(socket.id);
    const room = rooms.get(roomId);
    if (!room || room.game.phase !== 'drawing') return;
    const drawer = room.getCurrentDrawer();
    if (!drawer || drawer.id !== socket.id) return;

    const stroke = { type: 'move', ...data };
    room.game.addStroke(stroke);
    socket.to(roomId).emit('draw_data', stroke);
  });

  socket.on('draw_end', () => {
    const roomId = playerRooms.get(socket.id);
    const room = rooms.get(roomId);
    if (!room) return;
    const drawer = room.getCurrentDrawer();
    if (!drawer || drawer.id !== socket.id) return;

    const stroke = { type: 'end' };
    room.game.addStroke(stroke);
    socket.to(roomId).emit('draw_data', stroke);
  });

  socket.on('canvas_clear', () => {
    const roomId = playerRooms.get(socket.id);
    const room = rooms.get(roomId);
    if (!room) return;
    const drawer = room.getCurrentDrawer();
    if (!drawer || drawer.id !== socket.id) return;

    room.game.clearStrokes();
    io.to(roomId).emit('canvas_cleared');
  });

  socket.on('draw_undo', () => {
    const roomId = playerRooms.get(socket.id);
    const room = rooms.get(roomId);
    if (!room) return;
    const drawer = room.getCurrentDrawer();
    if (!drawer || drawer.id !== socket.id) return;

    // Find and remove last complete stroke
    const strokes = room.game.strokes;
    let lastEndIdx = -1;
    for (let i = strokes.length - 1; i >= 0; i--) {
      if (strokes[i].type === 'end') { lastEndIdx = i; break; }
    }
    if (lastEndIdx === -1) {
      room.game.clearStrokes();
    } else {
      let lastStartIdx = lastEndIdx;
      for (let i = lastEndIdx; i >= 0; i--) {
        if (strokes[i].type === 'start') { lastStartIdx = i; break; }
      }
      room.game.strokes = strokes.slice(0, lastStartIdx);
    }

    io.to(roomId).emit('canvas_undo', { strokes: room.game.strokes });
  });

  socket.on('fill_canvas', (data) => {
    const roomId = playerRooms.get(socket.id);
    const room = rooms.get(roomId);
    if (!room) return;
    const drawer = room.getCurrentDrawer();
    if (!drawer || drawer.id !== socket.id) return;

    const fillStroke = { type: 'fill', ...data };
    room.game.addStroke(fillStroke);
    socket.to(roomId).emit('draw_data', fillStroke);
  });

  // --- CHAT & GUESSING ---
  socket.on('guess', ({ text }) => {
    const roomId = playerRooms.get(socket.id);
    const room = rooms.get(roomId);
    if (!room || room.game.phase !== 'drawing') return;

    const player = room.getPlayer(socket.id);
    if (!player || player.isDrawing || player.hasGuessed) return;

    const isCorrect = room.game.checkGuess(text, room.game.currentWord);

    if (isCorrect) {
      player.hasGuessed = true;
      player.guessTime = Date.now();

      const guessedCount = room.getGuessedCount();
      const timeLeft = room.game.settings.drawTime; // approx
      const points = room.game.calculateGuesserScore(
        room.game.settings.drawTime,
        room.game.settings.drawTime,
        guessedCount
      );
      player.addScore(points);

      io.to(roomId).emit('guess_result', {
        correct: true,
        playerId: socket.id,
        playerName: player.name,
        points: points,
        scores: room.getLeaderboard()
      });

      io.to(roomId).emit('chat_message', {
        type: 'correct_guess',
        text: `🎉 ${player.name} guessed the word!`,
        playerId: socket.id
      });

      // Check if everyone guessed
      if (room.getGuessedCount() >= room.getNonDrawerCount()) {
        if (room.timerInterval) clearInterval(room.timerInterval);
        room.hintTimeouts.forEach(t => clearTimeout(t));
        setTimeout(() => endRound(room, io), 1500);
      }
    } else {
      // Check if close (for hint purposes)
      const isClose = levenshtein(text.toLowerCase(), room.game.currentWord.toLowerCase()) <= 1;

      // Broadcast guess as chat (masked for drawer display)
      socket.to(roomId).emit('chat_message', {
        type: 'guess',
        text: text,
        playerName: player.name,
        playerId: socket.id,
        isClose: isClose
      });
      socket.emit('chat_message', {
        type: 'guess',
        text: text,
        playerName: player.name,
        playerId: socket.id,
        isClose: isClose
      });
    }
  });

  socket.on('chat', ({ text }) => {
    const roomId = playerRooms.get(socket.id);
    const room = rooms.get(roomId);
    if (!room) return;

    const player = room.getPlayer(socket.id);
    if (!player) return;

    // Don't allow drawing player to chat during drawing
    if (player.isDrawing && room.game.phase === 'drawing') return;

    io.to(roomId).emit('chat_message', {
      type: 'chat',
      text: text.slice(0, 200),
      playerName: player.name,
      playerId: socket.id
    });
  });

  // --- KICK PLAYER (host only) ---
  socket.on('kick_player', ({ targetId }) => {
    const roomId = playerRooms.get(socket.id);
    const room = rooms.get(roomId);
    if (!room || !room.isHost(socket.id)) return;
    if (targetId === socket.id) return;

    const target = room.getPlayer(targetId);
    if (!target) return;

    io.to(targetId).emit('kicked', { reason: 'Kicked by host' });
    const targetSocket = io.sockets.sockets.get(targetId);
    if (targetSocket) {
      targetSocket.leave(roomId);
    }
    room.removePlayer(targetId);
    playerRooms.delete(targetId);

    io.to(roomId).emit('player_left', {
      playerId: targetId,
      playerName: target.name,
      players: room.getPlayerList()
    });
    io.to(roomId).emit('chat_message', {
      type: 'system',
      text: `${target.name} was kicked from the room.`
    });
  });

  // --- DISCONNECT ---
  socket.on('disconnect', () => {
    console.log(`[-] Disconnected: ${socket.id}`);
    const roomId = playerRooms.get(socket.id);
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    const player = room.getPlayer(socket.id);
    if (!player) return;

    const wasDrawing = player.isDrawing;
    room.removePlayer(socket.id);
    playerRooms.delete(socket.id);

    io.to(roomId).emit('player_left', {
      playerId: socket.id,
      playerName: player.name,
      players: room.getPlayerList()
    });

    io.to(roomId).emit('chat_message', {
      type: 'system',
      text: `${player.name} left the room.`
    });

    // If room empty, delete it
    if (room.players.size === 0) {
      room.clearTimers();
      rooms.delete(roomId);
      return;
    }

    // Transfer host if host left
    if (room.hostId === socket.id) {
      const newHost = room.players.values().next().value;
      if (newHost) {
        room.hostId = newHost.id;
        io.to(roomId).emit('host_changed', { newHostId: newHost.id, newHostName: newHost.name });
        io.to(roomId).emit('chat_message', {
          type: 'system',
          text: `${newHost.name} is now the host.`
        });
      }
    }

    // If drawer left during drawing, end round early
    if (wasDrawing && room.status === 'playing' && room.game.phase === 'drawing') {
      room.clearTimers();
      io.to(roomId).emit('chat_message', {
        type: 'system',
        text: 'The drawer left! Skipping round...'
      });
      // Advance drawer index
      room.currentDrawerIndex++;
      if (room.currentDrawerIndex >= room.drawOrder.length) {
        room.currentRound++;
        room.currentDrawerIndex = 0;
        room.drawOrder = room.drawOrder.filter(id => room.players.has(id));
      } else {
        room.drawOrder = room.drawOrder.filter(id => room.players.has(id));
      }
      if (room.players.size < 2 || room.currentRound >= room.game.settings.rounds) {
        endGame(room, io);
      } else {
        setTimeout(() => {
          if (room.status === 'playing') startRound(room, io);
        }, 2000);
      }
    }
  });
});

// Levenshtein distance for "close guess" detection
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0)
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🎨 Skribbl server running on port ${PORT}`);
});
