import storage from './storage.js';
import { shuffle } from './helpers.js';

class QuizEngine {
  constructor() {
    this.questions = [];
    this.currentIndex = 0;
    this.userAnswers = [];
    this.timeLimit = 0;
    this.timer = null;
    this.timeRemaining = 0;
    this.module = '';
    this.onTimeUpdate = null;
    this.onComplete = null;
  }

  loadQuiz(questions, options = {}) {
    const { shuffle: doShuffle = true, limit = 0, timeLimit = 0, module = 'general' } = options;
    let qs = [...questions];
    if (doShuffle) qs = shuffle(qs);
    if (limit > 0) qs = qs.slice(0, limit);
    // For MCQ, shuffle options
    qs = qs.map(q => {
      if (q.type === 'multiple-choice' || q.type === 'fill-blank') {
        const opts = q.options.map((opt, i) => ({ text: opt, originalIndex: i }));
        const shuffled = shuffle(opts);
        const correctText = q.options[q.answer];
        return {
          ...q,
          options: shuffled.map(o => o.text),
          answer: shuffled.findIndex(o => o.text === correctText)
        };
      }
      return q;
    });
    this.questions = qs;
    this.currentIndex = 0;
    this.userAnswers = new Array(qs.length).fill(null);
    this.module = module;
    this.timeLimit = timeLimit;
    this.timeRemaining = timeLimit;
    return this;
  }

  startTimer() {
    if (this.timeLimit <= 0) return;
    this.stopTimer();
    this.timer = setInterval(() => {
      this.timeRemaining--;
      if (this.onTimeUpdate) this.onTimeUpdate(this.timeRemaining);
      if (this.timeRemaining <= 0) {
        this.stopTimer();
        this.submit();
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  getCurrentQuestion() {
    return this.questions[this.currentIndex] || null;
  }

  getProgress() {
    return {
      current: this.currentIndex + 1,
      total: this.questions.length,
      percent: this.questions.length > 0 ? Math.round(((this.currentIndex + 1) / this.questions.length) * 100) : 0,
      answered: this.userAnswers.filter(a => a !== null).length
    };
  }

  answerCurrent(answerIndex) {
    if (this.userAnswers[this.currentIndex] !== null) return false;
    this.userAnswers[this.currentIndex] = answerIndex;
    return true;
  }

  isCurrentCorrect() {
    const q = this.getCurrentQuestion();
    if (!q) return false;
    return this.userAnswers[this.currentIndex] === q.answer;
  }

  next() {
    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex++;
      return true;
    }
    return false;
  }

  prev() {
    if (this.currentIndex > 0) { this.currentIndex--; return true; }
    return false;
  }

  submit() {
    this.stopTimer();
    const results = this.questions.map((q, i) => ({
      question: q,
      userAnswer: this.userAnswers[i],
      correct: q.type === 'writing-prompt' ? true : this.userAnswers[i] === q.answer,
      skipped: this.userAnswers[i] === null
    }));
    const scorable = results.filter(r => r.question.type !== 'writing-prompt');
    const score = scorable.filter(r => r.correct).length;
    const total = scorable.length;
    const percentage = total > 0 ? Math.round((score / total) * 100) : 100;
    const result = { score, total, percentage, results, module: this.module, timestamp: Date.now() };
    storage.addQuizResult(this.module, result);
    if (this.onComplete) this.onComplete(result);
    return result;
  }

  generateFromVocabulary(words, count = 10) {
    // Auto-generate MCQ from vocabulary
    const selected = shuffle(words).slice(0, count);
    return selected.map(word => {
      const distractors = shuffle(words.filter(w => w.id !== word.id)).slice(0, 3);
      const options = shuffle([word.vietnamese || word.meaning, ...distractors.map(d => d.vietnamese || d.meaning)]);
      return {
        id: `auto_${word.id}`,
        type: 'multiple-choice',
        question: `What does "${word.term || word.word}" mean?`,
        questionVi: `"${word.term || word.word}" có nghĩa là gì?`,
        options,
        answer: options.indexOf(word.vietnamese || word.meaning),
        explanation: `"${word.term || word.word}" (${word.pronunciation || word.ipa || ''}) = ${word.vietnamese || word.meaning}`
      };
    });
  }
}

export default new QuizEngine();
