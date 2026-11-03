import storage from './storage.js';
import { shuffle, getNextReviewDate } from './helpers.js';

class FlashcardEngine {
  constructor() {
    this.deck = [];
    this.currentIndex = 0;
    this.session = { correct: 0, wrong: 0, skipped: 0, startTime: null };
    this.isFlipped = false;
    this.onCardChange = null;
    this.onSessionEnd = null;
  }

  loadDeck(words, options = {}) {
    const { shuffle: doShuffle = true, reviewDue = false, limit = 0 } = options;
    let deck = [...words];
    if (reviewDue) {
      const now = Date.now();
      deck = deck.filter(w => {
        const progress = storage.getFlashcardProgress(w.id);
        return !progress.nextReview || progress.nextReview <= now;
      });
    }
    if (doShuffle) deck = shuffle(deck);
    if (limit > 0) deck = deck.slice(0, limit);
    this.deck = deck;
    this.currentIndex = 0;
    this.session = { correct: 0, wrong: 0, skipped: 0, startTime: Date.now() };
    this.isFlipped = false;
    return this;
  }

  getCurrentCard() {
    return this.deck[this.currentIndex] || null;
  }

  getProgress() {
    return {
      current: this.currentIndex + 1,
      total: this.deck.length,
      percent: this.deck.length > 0 ? Math.round(((this.currentIndex + 1) / this.deck.length) * 100) : 0,
      session: this.session
    };
  }

  flip() {
    this.isFlipped = !this.isFlipped;
    return this.isFlipped;
  }

  rate(confidence) {
    // confidence: 0=wrong, 1=hard, 2=good, 3=mastered
    const card = this.getCurrentCard();
    if (!card) return;
    const progress = storage.getFlashcardProgress(card.id);
    const newConfidence = Math.max(0, Math.min(4, (progress.confidence || 0) + (confidence >= 2 ? 1 : -1)));
    storage.setFlashcardProgress(card.id, {
      correctCount: (progress.correctCount || 0) + (confidence >= 2 ? 1 : 0),
      wrongCount: (progress.wrongCount || 0) + (confidence < 2 ? 1 : 0),
      confidence: newConfidence,
      lastReviewed: Date.now(),
      nextReview: getNextReviewDate(newConfidence)
    });
    if (confidence >= 2) this.session.correct++;
    else this.session.wrong++;
    this.next();
  }

  skip() {
    this.session.skipped++;
    this.next();
  }

  next() {
    this.isFlipped = false;
    if (this.currentIndex < this.deck.length - 1) {
      this.currentIndex++;
      if (this.onCardChange) this.onCardChange(this.getCurrentCard(), this.getProgress());
    } else {
      if (this.onSessionEnd) this.onSessionEnd(this.session);
    }
  }

  prev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.isFlipped = false;
      if (this.onCardChange) this.onCardChange(this.getCurrentCard(), this.getProgress());
    }
  }

  getCardStoredProgress(cardId) {
    return storage.getFlashcardProgress(cardId);
  }

  isSessionComplete() {
    return this.currentIndex >= this.deck.length - 1 && this.isFlipped;
  }
}

export default new FlashcardEngine();
