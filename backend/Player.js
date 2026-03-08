class Player {
  constructor(socketId, name, roomId) {
    this.id = socketId;
    this.name = name;
    this.roomId = roomId;
    this.score = 0;
    this.hasGuessed = false;
    this.isDrawing = false;
    this.isReady = false;
    this.avatar = Math.floor(Math.random() * 12); // avatar index
    this.guessTime = null; // when they guessed correctly
  }

  addScore(points) {
    this.score += points;
  }

  resetRound() {
    this.hasGuessed = false;
    this.isDrawing = false;
    this.guessTime = null;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      score: this.score,
      hasGuessed: this.hasGuessed,
      isDrawing: this.isDrawing,
      isReady: this.isReady,
      avatar: this.avatar
    };
  }
}

module.exports = Player;
