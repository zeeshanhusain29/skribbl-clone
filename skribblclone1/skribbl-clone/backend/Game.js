const { getRandomWords } = require('./words');

class Game {
  constructor(settings) {
    this.settings = {
      maxPlayers: settings.maxPlayers || 8,
      rounds: settings.rounds || 3,
      drawTime: settings.drawTime || 80,
      wordCount: settings.wordCount || 3,
      hints: settings.hints || 2,
      customWords: settings.customWords || []
    };
    this.currentRound = 0;
    this.drawerIndex = 0;
    this.currentWord = null;
    this.wordOptions = [];
    this.phase = 'waiting'; // waiting, word_select, drawing, round_end, game_over
    this.timer = null;
    this.timeLeft = 0;
    this.hintTimer = null;
    this.revealedHints = [];
    this.drawOrder = [];
    this.strokes = []; // canvas strokes for reconnect
  }

  getWordOptions() {
    let words;
    if (this.settings.customWords.length >= this.settings.wordCount) {
      const shuffled = [...this.settings.customWords].sort(() => Math.random() - 0.5);
      words = shuffled.slice(0, this.settings.wordCount);
    } else {
      words = getRandomWords(this.settings.wordCount);
    }
    return words;
  }

  generateHints(word) {
    // Generate positions to reveal (not spaces)
    const positions = [];
    for (let i = 0; i < word.length; i++) {
      if (word[i] !== ' ') positions.push(i);
    }
    const shuffled = positions.sort(() => Math.random() - 0.5);
    const hintsToReveal = Math.min(
      this.settings.hints,
      Math.floor(positions.length * 0.4)
    );
    return shuffled.slice(0, hintsToReveal);
  }

  getMaskedWord(word, revealedPositions = []) {
    return word.split('').map((char, i) => {
      if (char === ' ') return ' ';
      if (revealedPositions.includes(i)) return char;
      return '_';
    }).join('');
  }

  checkGuess(guess, word) {
    const normalizedGuess = guess.trim().toLowerCase().replace(/\s+/g, ' ');
    const normalizedWord = word.trim().toLowerCase().replace(/\s+/g, ' ');
    return normalizedGuess === normalizedWord;
  }

  calculateDrawerScore(guessersCount, totalPlayers) {
    if (guessersCount === 0) return 0;
    return Math.min(guessersCount * 50, 250);
  }

  calculateGuesserScore(timeLeft, totalTime, position) {
    // More points for faster guesses
    const timeBonus = Math.floor((timeLeft / totalTime) * 400);
    const positionBonus = Math.max(0, (5 - position) * 20);
    return 100 + timeBonus + positionBonus;
  }

  addStroke(stroke) {
    this.strokes.push(stroke);
  }

  clearStrokes() {
    this.strokes = [];
  }

  undoLastStroke() {
    this.strokes.pop();
    return this.strokes;
  }
}

module.exports = Game;
