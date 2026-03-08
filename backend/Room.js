const { v4: uuidv4 } = require('uuid');
const Game = require('./Game');

class Room {
  constructor(hostId, hostName, settings = {}, isPrivate = false) {
    this.id = uuidv4().slice(0, 8).toUpperCase();
    this.hostId = hostId;
    this.isPrivate = isPrivate;
    this.players = new Map(); // socketId -> Player
    this.game = new Game(settings);
    this.createdAt = Date.now();
    this.status = 'lobby'; // lobby, playing, ended
    this.drawOrder = [];
    this.currentDrawerIndex = 0;
    this.currentRound = 0;
    this.chatHistory = [];
    this.wordChoiceTimeout = null;
    this.roundTimeout = null;
    this.hintTimeouts = [];
  }

  addPlayer(player) {
    this.players.set(player.id, player);
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
  }

  getPlayer(socketId) {
    return this.players.get(socketId);
  }

  getPlayerList() {
    return Array.from(this.players.values()).map(p => p.toJSON());
  }

  getPlayerCount() {
    return this.players.size;
  }

  isHost(socketId) {
    return this.hostId === socketId;
  }

  getCurrentDrawer() {
    if (this.drawOrder.length === 0) return null;
    const drawerId = this.drawOrder[this.currentDrawerIndex];
    return this.players.get(drawerId);
  }

  getLeaderboard() {
    return Array.from(this.players.values())
      .map(p => ({ id: p.id, name: p.name, score: p.score, avatar: p.avatar }))
      .sort((a, b) => b.score - a.score);
  }

  getGuessedCount() {
    return Array.from(this.players.values())
      .filter(p => p.hasGuessed && !p.isDrawing).length;
  }

  getNonDrawerCount() {
    return Array.from(this.players.values())
      .filter(p => !p.isDrawing).length;
  }

  resetPlayersForRound() {
    this.players.forEach(p => p.resetRound());
  }

  toPublicInfo() {
    return {
      id: this.id,
      hostName: this.players.get(this.hostId)?.name || 'Unknown',
      playerCount: this.players.size,
      maxPlayers: this.game.settings.maxPlayers,
      status: this.status,
      isPrivate: this.isPrivate,
      rounds: this.game.settings.rounds,
      drawTime: this.game.settings.drawTime
    };
  }

  clearTimers() {
    if (this.wordChoiceTimeout) clearTimeout(this.wordChoiceTimeout);
    if (this.roundTimeout) clearTimeout(this.roundTimeout);
    this.hintTimeouts.forEach(t => clearTimeout(t));
    this.hintTimeouts = [];
    if (this.timerInterval) clearInterval(this.timerInterval);
  }
}

module.exports = Room;
