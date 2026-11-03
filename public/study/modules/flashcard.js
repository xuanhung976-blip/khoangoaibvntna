import flashcardEngine from '../utils/flashcardEngine.js';
import { confetti, showToast, createEmptyState, speak } from '../utils/helpers.js';
import storage from '../utils/storage.js';
import { showVocabAIModal } from './vstep.js';

export function renderFlashcardSession(container, words, options = {}) {
  const { title = 'Flashcard', moduleGradient = 'var(--gradient-primary)', moduleId = 'general' } = options;
  if (!words || words.length === 0) {
    container.innerHTML = createEmptyState('📭', 'Không có từ nào', 'Hãy chọn chủ đề để bắt đầu');
    return;
  }

  // Calculate due words for Spaced Repetition (SRS)
  const now = Date.now();
  const dueWords = words.filter(w => {
    const p = storage.getFlashcardProgress(w.id);
    return !p.nextReview || p.nextReview <= now;
  });

  // Render startup screen to select mode
  container.innerHTML = `
    <div class="page-view animate-fade-in" style="max-width:500px; margin: 40px auto;">
      <div class="glass-card text-center">
        <div style="font-size:3rem; margin-bottom:15px">🗂️</div>
        <h3 class="mb-sm font-bold" style="font-size:1.4rem">${title}</h3>
        <p class="text-sm text-secondary mb-xl">Chọn chế độ học thẻ từ vựng:</p>
        
        <div class="flex flex-col gap-md">
          <button class="btn btn-primary btn-lg" id="btn-learn-all" style="width:100%">
            📖 Học tất cả (${words.length} từ)
          </button>
          <button class="btn btn-secondary btn-lg" id="btn-learn-due" style="width:100%" ${dueWords.length === 0 ? 'disabled' : ''}>
            ⏳ Ôn từ đến hạn (${dueWords.length} từ)
          </button>
          ${dueWords.length === 0 ? '<p class="text-xs text-muted mt-sm">🎉 Bạn đã hoàn thành ôn tập toàn bộ từ vựng hôm nay!</p>' : ''}
        </div>
      </div>
    </div>
  `;

  container.querySelector('#btn-learn-all').addEventListener('click', () => {
    startSession(words, false);
  });

  container.querySelector('#btn-learn-due').addEventListener('click', () => {
    if (dueWords.length > 0) startSession(dueWords, true);
  });

  function startSession(deck, isSRSMapped) {
    flashcardEngine.loadDeck(deck, { shuffle: true, limit: options.limit || 0 });
    flashcardEngine.onCardChange = (card, progress) => updateCard(container, card, progress, moduleGradient);
    flashcardEngine.onSessionEnd = (session) => showSessionResult(container, session, deck, options);
    renderCard(container, flashcardEngine.getCurrentCard(), flashcardEngine.getProgress(), moduleGradient);
  }
}

function renderCard(container, card, progress, moduleGradient) {
  if (!card) return;
  const pct = progress.percent;
  container.innerHTML = `
    <div class="page-view animate-fade-in">
      <!-- Progress -->
      <div class="flex items-center justify-between mb-md">
        <span class="text-sm text-muted">${progress.current} / ${progress.total}</span>
        <div class="flex items-center gap-sm">
          <span class="text-xs text-muted">✅ ${progress.session.correct} ❌ ${progress.session.wrong}</span>
        </div>
      </div>
      <div class="fc-progress-bar mb-xl">
        <div class="fc-progress-fill" style="width:${pct}%; --module-gradient:${moduleGradient}"></div>
      </div>

      <!-- 3D Flashcard -->
      <div class="flashcard-container" id="fc-container">
        <div class="flashcard" id="flashcard" style="--module-gradient:${moduleGradient}">
          <!-- Front -->
          <div class="flashcard-face flashcard-front">
            <span class="flashcard-category">${card.category || card.tags?.[0] || ''}</span>
            <span class="flashcard-num">#${progress.current}</span>
            <div class="flashcard-term">
              <span>${card.term || card.word || ''}</span>
              <button class="btn btn-ghost btn-icon btn-speak" style="margin-left: 8px; width: 34px; height: 34px; font-size: 1rem;">🔊</button>
            </div>
            ${card.pronunciation || card.ipa ? `<div class="flashcard-ipa">${card.pronunciation || card.ipa}</div>` : ''}
            ${card.abbreviation ? `<div class="flashcard-abbr">${card.abbreviation}</div>` : ''}
            <div class="flashcard-hint">👆 Click để lật thẻ xem nghĩa</div>
          </div>
          <!-- Back -->
          <div class="flashcard-face flashcard-back">
            <div style="font-size:1.15rem; font-weight:700; color:var(--text-secondary); margin-bottom:6px">${card.term || card.word || ''}</div>
            <div class="flashcard-vietnamese">${card.vietnamese || card.vi || card.meaning || (card.definition ? '📖 ' + card.definition : '(Đang cập nhật nghĩa tiếng Việt)')}</div>
            ${card.pronunciation || card.ipa ? `<div class="flashcard-ipa">${card.pronunciation || card.ipa}</div>` : ''}
            ${card.definition ? `<div class="flashcard-definition">${card.definition}</div>` : ''}
            ${card.example ? `<div class="flashcard-example">"${card.example}"</div>` : ''}
            ${card.clinicalNote ? `<div class="flashcard-clinical"><strong>📋 Lâm sàng:</strong> ${card.clinicalNote}</div>` : ''}
            <div style="margin-top:10px;">
              <button class="btn btn-ghost btn-sm btn-flashcard-ai" style="font-size:0.75rem; color:var(--purple); font-weight:700; padding:4px 10px; border-radius:6px; background:rgba(99,102,241,0.06); cursor:pointer;">
                ✨ Mẹo Nhớ AI & Collocations
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Rating Buttons (hidden until flipped) -->
      <div id="rating-area" class="hidden">
        <div class="rating-buttons mt-lg">
          <button class="rating-btn wrong" data-rating="0">❌ Quên [1]</button>
          <button class="rating-btn hard" data-rating="1">😐 Khó [2]</button>
          <button class="rating-btn good" data-rating="2">🙂 Nhớ [3]</button>
          <button class="rating-btn mastered" data-rating="3">🔥 Thuộc [4]</button>
        </div>
        <div class="text-xs text-muted text-center mt-xs">
          ⌨️ Phím tắt: <strong>Space</strong> (lật thẻ) · <strong>1, 2, 3, 4</strong> (đánh giá) · <strong>R</strong> (phát âm)
        </div>
      </div>

      <!-- Nav Buttons -->
      <div class="flex gap-sm mt-lg justify-between">
        <button class="btn btn-secondary" id="btn-prev">← Trước</button>
        <button class="btn btn-ghost" id="btn-skip">Bỏ qua →</button>
      </div>
    </div>
  `;

  const fcEl = container.querySelector('#flashcard');
  const ratingArea = container.querySelector('#rating-area');

  fcEl.addEventListener('click', () => {
    flashcardEngine.flip();
    fcEl.classList.toggle('flipped');
    ratingArea.classList.toggle('hidden', !flashcardEngine.isFlipped);
  });

  // Bind speak button click
  container.querySelector('.btn-speak').addEventListener('click', (e) => {
    e.stopPropagation(); // prevent flipping the card
    speak(card.term || card.word || '');
  });

  // Bind AI Mnemonic button click
  container.querySelector('.btn-flashcard-ai')?.addEventListener('click', (e) => {
    e.stopPropagation(); // prevent flipping the card
    showVocabAIModal(card.term || card.word || '', card.vietnamese || card.vi || card.meaning || '');
  });

  container.querySelectorAll('.rating-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const rating = parseInt(btn.dataset.rating);
      flashcardEngine.rate(rating);
    });
  });

  container.querySelector('#btn-prev')?.addEventListener('click', () => flashcardEngine.prev());
  container.querySelector('#btn-skip')?.addEventListener('click', () => flashcardEngine.skip());

  // Global Keyboard shortcuts for Flashcard
  function handleKeyDown(e) {
    if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
    if (e.code === 'Space') {
      e.preventDefault();
      fcEl.click();
    } else if (e.key === 'r' || e.key === 'R') {
      speak(card.term || card.word || '');
    } else if (['1', '2', '3', '4'].includes(e.key) && flashcardEngine.isFlipped) {
      const ratingMap = { '1': 0, '2': 1, '3': 2, '4': 3 };
      flashcardEngine.rate(ratingMap[e.key]);
    }
  }

  window._fcKeyHandler && window.removeEventListener('keydown', window._fcKeyHandler);
  window._fcKeyHandler = handleKeyDown;
  window.addEventListener('keydown', window._fcKeyHandler);

  storage.updateStreak();
}

function updateCard(container, card, progress, moduleGradient) {
  if (card) renderCard(container, card, progress, moduleGradient);
}

function showSessionResult(container, session, words, options) {
  if (window._fcKeyHandler) {
    window.removeEventListener('keydown', window._fcKeyHandler);
    window._fcKeyHandler = null;
  }
  const total = session.correct + session.wrong + session.skipped;
  const pct = total > 0 ? Math.round((session.correct / total) * 100) : 0;
  if (pct >= 80) confetti();
  const grade = pct >= 80 ? 'excellent' : pct >= 60 ? 'good-score' : pct >= 40 ? 'average' : 'poor';
  const msg = pct >= 80 ? '🎉 Xuất sắc!' : pct >= 60 ? '👍 Tốt lắm!' : pct >= 40 ? '💪 Cố lên!' : '📚 Ôn thêm nhé!';
  container.innerHTML = `
    <div class="page-view animate-fade-in">
      <div class="quiz-results glass-card text-center">
        <div class="results-score ${grade}">${pct}%</div>
        <div class="results-message">${msg}</div>
        <div class="results-detail">✅ ${session.correct} nhớ · ❌ ${session.wrong} quên · ⏭ ${session.skipped} bỏ qua</div>
        <div class="flex gap-sm justify-center" style="margin-top:20px">
          <button class="btn btn-primary btn-lg" id="btn-restart">🔄 Học lại</button>
          <button class="btn btn-secondary btn-lg" id="btn-review-wrong">❌ Ôn từ quên</button>
        </div>
      </div>
    </div>
  `;
  container.querySelector('#btn-restart').addEventListener('click', () =>
    renderFlashcardSession(container, words, options)
  );
  container.querySelector('#btn-review-wrong').addEventListener('click', () => {
    const wrongWords = words.filter(w => {
      const p = storage.getFlashcardProgress(w.id);
      return p.confidence < 2;
    });
    renderFlashcardSession(container, wrongWords.length > 0 ? wrongWords : words, options);
  });
}
