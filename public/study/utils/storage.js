// Storage abstraction - never call localStorage directly elsewhere
const storage = {
  namespaces: {
    APP_SETTINGS: 'app_settings',
    USER_PROGRESS: 'user_progress',
    FLASHCARD_PROGRESS: 'flashcard_progress',
    QUIZ_RESULTS: 'quiz_results',
    TRANSLATION_HISTORY: 'translation_history',
    SAVED_VOCABULARY: 'saved_vocabulary',
    STREAK_DATA: 'streak_data',
  },
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.error('Storage get error:', e);
      return defaultValue;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Storage set error:', e);
      return false;
    }
  },
  remove(key) {
    try { localStorage.removeItem(key); return true; } catch (e) { return false; }
  },
  clear() {
    try { localStorage.clear(); return true; } catch (e) { return false; }
  },
  // Namespaced helpers
  getProgress(module) {
    return this.get(`${this.namespaces.USER_PROGRESS}_${module}`, {});
  },
  setProgress(module, data) {
    return this.set(`${this.namespaces.USER_PROGRESS}_${module}`, data);
  },
  getFlashcardProgress(wordId) {
    const all = this.get(this.namespaces.FLASHCARD_PROGRESS, {});
    return all[wordId] || { correctCount: 0, wrongCount: 0, confidence: 0, lastReviewed: null, nextReview: null };
  },
  setFlashcardProgress(wordId, data) {
    const all = this.get(this.namespaces.FLASHCARD_PROGRESS, {});
    all[wordId] = { ...all[wordId], ...data, lastUpdated: Date.now() };
    return this.set(this.namespaces.FLASHCARD_PROGRESS, all);
  },
  addQuizResult(module, result) {
    const results = this.get(`${this.namespaces.QUIZ_RESULTS}_${module}`, []);
    results.unshift({ ...result, timestamp: Date.now() });
    if (results.length > 100) results.splice(100);
    return this.set(`${this.namespaces.QUIZ_RESULTS}_${module}`, results);
  },
  getQuizResults(module) {
    return this.get(`${this.namespaces.QUIZ_RESULTS}_${module}`, []);
  },
  addTranslation(entry) {
    const history = this.get(this.namespaces.TRANSLATION_HISTORY, []);
    history.unshift({ ...entry, timestamp: Date.now() });
    if (history.length > 50) history.splice(50);
    return this.set(this.namespaces.TRANSLATION_HISTORY, history);
  },
  getTranslationHistory() {
    return this.get(this.namespaces.TRANSLATION_HISTORY, []);
  },
  getSavedVocabulary() {
    return this.get(this.namespaces.SAVED_VOCABULARY, []);
  },
  saveWord(word) {
    const saved = this.getSavedVocabulary();
    if (!saved.find(w => w.id === word.id)) {
      saved.unshift({ ...word, savedAt: Date.now() });
      this.set(this.namespaces.SAVED_VOCABULARY, saved);
    }
  },
  removeWord(wordId) {
    const saved = this.getSavedVocabulary().filter(w => w.id !== wordId);
    this.set(this.namespaces.SAVED_VOCABULARY, saved);
  },
  getStreak() {
    return this.get(this.namespaces.STREAK_DATA, { currentStreak: 0, longestStreak: 0, lastStudyDate: null, studyDates: [] });
  },
  updateStreak() {
    const today = new Date().toDateString();
    const streak = this.getStreak();
    if (streak.lastStudyDate === today) return streak;
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (streak.lastStudyDate === yesterday) {
      streak.currentStreak += 1;
    } else {
      streak.currentStreak = 1;
    }
    streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak);
    streak.lastStudyDate = today;
    if (!streak.studyDates.includes(today)) streak.studyDates.push(today);
    if (streak.studyDates.length > 365) streak.studyDates.splice(0, streak.studyDates.length - 365);
    this.set(this.namespaces.STREAK_DATA, streak);
    return streak;
  },
  getSettings() {
    return this.get(this.namespaces.APP_SETTINGS, { theme: 'dark', language: 'vi', dailyGoal: 20, soundEnabled: true });
  },
  setSettings(settings) {
    return this.set(this.namespaces.APP_SETTINGS, { ...this.getSettings(), ...settings });
  }
};

export default storage;
