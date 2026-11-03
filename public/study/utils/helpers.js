// Utility helpers
export function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function formatDate(timestamp) {
  if (!timestamp) return 'Never';
  return new Date(timestamp).toLocaleDateString('vi-VN');
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function capitalizeFirst(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

export function getConfidenceLabel(confidence) {
  if (confidence >= 4) return { label: '🔥 Thành thạo', class: 'mastered' };
  if (confidence >= 3) return { label: '🙂 Nhớ', class: 'good' };
  if (confidence >= 2) return { label: '😐 Khó', class: 'hard' };
  return { label: '❌ Chưa nhớ', class: 'unknown' };
}

export function getNextReviewDate(confidence) {
  // Spaced repetition intervals in days
  const intervals = [1, 3, 7, 14, 30];
  const days = intervals[Math.min(confidence, intervals.length - 1)] || 1;
  return Date.now() + days * 86400000;
}

export function isOnline() {
  return navigator.onLine;
}

export function showToast(message, type = 'info', duration = 3000) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

export function confetti(container = document.body) {
  const colors = ['#6c63ff', '#00d4d4', '#ff6b6b', '#ffd93d', '#6bcb77'];
  for (let i = 0; i < 80; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.cssText = `
      position: fixed;
      width: ${Math.random() * 10 + 5}px;
      height: ${Math.random() * 10 + 5}px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      left: ${Math.random() * 100}vw;
      top: -20px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      animation: confetti-fall ${Math.random() * 2 + 1}s ease-out forwards;
      animation-delay: ${Math.random() * 0.5}s;
      z-index: 9999;
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }
}

export function highlightMedicalTerms(text, terms) {
  let result = escapeHtml(text);
  if (!terms || terms.length === 0) return result;
  // Sort by length desc to match longer terms first
  const sorted = [...terms].sort((a, b) => b.term.length - a.term.length);
  sorted.forEach(t => {
    const escaped = escapeHtml(t.term);
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    result = result.replace(regex, `<span class="medical-term-highlight" data-term="${t.id}" title="${escapeHtml(t.vietnamese)}">${'$&'}</span>`);
  });
  return result;
}

export function createLoadingSpinner(message = 'Đang tải...') {
  return `<div class="loading-state"><div class="spinner"></div><p>${message}</p></div>`;
}

export function createEmptyState(icon, title, subtitle = '') {
  return `<div class="empty-state"><div class="empty-icon">${icon}</div><h3>${title}</h3>${subtitle ? `<p>${subtitle}</p>` : ''}</div>`;
}

export function createErrorState(message = 'Đã xảy ra lỗi. Vui lòng thử lại.') {
  return `<div class="error-state"><div class="error-icon">⚠️</div><p>${message}</p></div>`;
}

export function speak(text, lang = 'en-US') {
  if (!('speechSynthesis' in window)) {
    console.warn('Text-to-speech not supported');
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  // Trigger loading voices to resolve Chrome TTS async issue
  window.speechSynthesis.getVoices();
  window.speechSynthesis.speak(utterance);
}
