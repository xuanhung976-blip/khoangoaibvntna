import storage from '../utils/storage.js';
import { debounce, isOnline, showToast, highlightMedicalTerms, speak } from '../utils/helpers.js';
import { THYROID_VOCABULARY } from '../data/medical/thyroid/vocabulary.js';
import { DIABETES_VOCABULARY } from '../data/medical/diabetes/vocabulary.js';

const ALL_MEDICAL_TERMS = [...THYROID_VOCABULARY, ...DIABETES_VOCABULARY];

let currentDirection = 'en-vi'; // 'en-vi' or 'vi-en'
let translationTimeout = null;

export function renderTranslator(container) {
  container.innerHTML = `
    <div class="page-view animate-fade-in">
      <div class="page-header">
        <h2 class="page-title">🌐 Dịch Thuật</h2>
        <p class="page-subtitle">Dịch Anh ↔ Việt · Phát hiện thuật ngữ y khoa · Lưu từ vựng</p>
      </div>

      <div id="online-warning" class="${isOnline() ? 'hidden' : ''}" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:12px;padding:12px 16px;margin-bottom:16px;font-size:0.85rem;color:#fca5a5;">
        📴 Offline — Tính năng dịch yêu cầu kết nối Internet.
      </div>

      <div class="translator-layout">
        <!-- Source Panel -->
        <div class="translator-panel">
          <div class="translator-panel-header">
            <span id="src-lang">🇬🇧 English</span>
            <button class="btn btn-ghost btn-sm" id="btn-clear-src">✕ Xóa</button>
          </div>
          <textarea
            id="src-text"
            class="translator-textarea"
            placeholder="Nhập văn bản cần dịch..."
            spellcheck="false"
            maxlength="2000"
          ></textarea>
          <div class="translator-actions">
            <button class="btn btn-primary btn-sm" id="btn-translate">🔄 Dịch</button>
            <span class="text-xs text-muted" id="src-char-count">0/2000</span>
          </div>
        </div>

        <!-- Swap Button -->
        <button class="translator-swap" id="btn-swap" title="Đổi ngôn ngữ">⇄</button>

        <!-- Result Panel -->
        <div class="translator-panel">
          <div class="translator-panel-header">
            <span id="tgt-lang">🇻🇳 Tiếng Việt</span>
            <div class="flex gap-sm">
              <button class="btn btn-ghost btn-sm" id="btn-copy" title="Sao chép">📋</button>
            </div>
          </div>
          <div id="translation-result" class="translator-result text-muted">
            Bản dịch sẽ hiển thị ở đây...
          </div>
          <div class="translator-actions">
            <div class="translator-loading hidden" id="loading-indicator">
              <div class="spinner" style="width:16px;height:16px;border-width:2px"></div>
              <span>Đang dịch...</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Medical terms legend -->
      <div id="term-legend" class="hidden glass-card-sm mt-md">
        <p class="text-xs text-muted mb-sm">💊 <strong>Thuật ngữ y khoa được phát hiện</strong> — click để xem định nghĩa:</p>
        <div id="detected-terms" class="flex gap-sm" style="flex-wrap:wrap"></div>
      </div>

      <!-- History -->
      <div class="mt-lg">
        <h3 class="font-bold mb-md" style="font-size:0.9rem">🕐 Lịch sử dịch</h3>
        <div id="translation-history">${renderHistory()}</div>
      </div>
    </div>

    <!-- Term Detail Modal -->
    <div class="modal-overlay" id="term-modal">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title" id="modal-term-title"></span>
          <button class="btn btn-ghost btn-icon" id="btn-close-modal">✕</button>
        </div>
        <div id="modal-term-body"></div>
        <div class="mt-lg flex gap-sm">
          <button class="btn btn-primary btn-sm" id="btn-save-term">💾 Lưu từ</button>
          <button class="btn btn-secondary btn-sm" id="btn-close-modal2">Đóng</button>
        </div>
      </div>
    </div>
  `;

  attachTranslatorEvents(container);
}

function renderHistory() {
  const history = storage.getTranslationHistory();
  if (history.length === 0) return '<p class="text-sm text-muted">Chưa có lịch sử dịch.</p>';
  return history.slice(0, 5).map(h => `
    <div class="translation-history-item" data-src="${encodeURIComponent(h.source||'')}">
      <div style="flex:1">
        <p class="text-sm font-medium mb-sm" style="color:var(--text-primary)">${(h.source||'').slice(0,80)}${h.source?.length > 80 ? '...' : ''}</p>
        <p class="text-xs text-teal">${(h.result||'').slice(0,80)}${h.result?.length > 80 ? '...' : ''}</p>
      </div>
      <span class="text-xs text-muted" style="flex-shrink:0">${new Date(h.timestamp).toLocaleTimeString('vi-VN', {hour:'2-digit',minute:'2-digit'})}</span>
    </div>
  `).join('');
}

function attachTranslatorEvents(container) {
  const srcText = container.querySelector('#src-text');
  const resultEl = container.querySelector('#translation-result');
  const loadingEl = container.querySelector('#loading-indicator');
  const charCount = container.querySelector('#src-char-count');
  const termLegend = container.querySelector('#term-legend');
  const detectedTerms = container.querySelector('#detected-terms');
  const termModal = container.querySelector('#term-modal');

  // Char counter
  srcText.addEventListener('input', () => {
    charCount.textContent = `${srcText.value.length}/2000`;
  });

  // Clear
  container.querySelector('#btn-clear-src').addEventListener('click', () => {
    srcText.value = '';
    charCount.textContent = '0/2000';
    resultEl.innerHTML = '<span class="text-muted">Bản dịch sẽ hiển thị ở đây...</span>';
    termLegend.classList.add('hidden');
  });

  // Swap
  container.querySelector('#btn-swap').addEventListener('click', () => {
    currentDirection = currentDirection === 'en-vi' ? 'vi-en' : 'en-vi';
    const srcLang = container.querySelector('#src-lang');
    const tgtLang = container.querySelector('#tgt-lang');
    if (currentDirection === 'en-vi') {
      srcLang.textContent = '🇬🇧 English';
      tgtLang.textContent = '🇻🇳 Tiếng Việt';
      srcText.placeholder = 'Nhập văn bản tiếng Anh...';
    } else {
      srcLang.textContent = '🇻🇳 Tiếng Việt';
      tgtLang.textContent = '🇬🇧 English';
      srcText.placeholder = 'Nhập văn bản tiếng Việt...';
    }
  });

  // Translate button
  container.querySelector('#btn-translate').addEventListener('click', () => doTranslate(srcText.value, resultEl, loadingEl, termLegend, detectedTerms, container));

  // Copy
  container.querySelector('#btn-copy').addEventListener('click', () => {
    const text = resultEl.innerText;
    if (text) { navigator.clipboard.writeText(text).then(() => showToast('Đã sao chép!', 'success')); }
  });

  // History click
  container.querySelector('#translation-history').addEventListener('click', e => {
    const item = e.target.closest('[data-src]');
    if (item) {
      srcText.value = decodeURIComponent(item.dataset.src);
      charCount.textContent = `${srcText.value.length}/2000`;
      doTranslate(srcText.value, resultEl, loadingEl, termLegend, detectedTerms, container);
    }
  });

  // Modal close
  [container.querySelector('#btn-close-modal'), container.querySelector('#btn-close-modal2')].forEach(btn => {
    btn?.addEventListener('click', () => termModal.classList.remove('show'));
  });
  termModal.addEventListener('click', e => { if (e.target === termModal) termModal.classList.remove('show'); });
}

async function doTranslate(text, resultEl, loadingEl, termLegend, detectedTerms, container) {
  if (!text.trim()) return;
  
  loadingEl.classList.remove('hidden');
  resultEl.innerHTML = '';
  
  // 1. Online translation first (if online)
  if (isOnline()) {
    try {
      const langPair = currentDirection === 'en-vi' ? 'en|vi' : 'vi|en';
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0,500))}&langpair=${langPair}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      const data = await response.json();
      const translated = data?.responseData?.translatedText || '';
      if (translated) {
        handleTranslationResult(text, translated, resultEl, termLegend, detectedTerms, container);
        return;
      }
    } catch (err) {
      console.warn('[Translator] Online API error, trying local dict...', err);
    }
  }

  // 2. Offline / Local Dictionary Fallback
  const cleanedText = text.trim().toLowerCase();
  const foundWord = ALL_MEDICAL_TERMS.find(t => 
    t.term.toLowerCase() === cleanedText || 
    (t.vietnamese && t.vietnamese.toLowerCase() === cleanedText)
  );

  loadingEl.classList.add('hidden');
  if (foundWord) {
    const isEn = currentDirection === 'en-vi';
    const translation = isEn ? foundWord.vietnamese : foundWord.term;
    const explanation = `
      <div style="margin-top: 15px; font-size: 0.85rem; border-top: 1px solid var(--border-glass); padding-top: 12px; text-align: left;">
        <p style="color:var(--text-secondary); margin-bottom: 5px;">🔍 <strong>Tra cứu từ điển nội bộ:</strong></p>
        <p style="font-weight: 700; color:var(--purple-dark); font-size: 1.1rem; margin-bottom: 5px;">
          ${foundWord.term} <button class="btn btn-ghost btn-sm" id="btn-speak-fallback" style="padding: 2px 6px;">🔊</button>
        </p>
        ${foundWord.pronunciation ? `<p class="text-muted" style="margin-bottom: 8px;">${foundWord.pronunciation}</p>` : ''}
        <p style="margin-bottom: 5px;">📖 <strong>Định nghĩa:</strong> ${foundWord.definition || 'N/A'}</p>
        ${foundWord.clinicalNote ? `<p style="color:var(--purple-light);">📋 <strong>Lâm sàng:</strong> ${foundWord.clinicalNote}</p>` : ''}
      </div>
    `;
    resultEl.innerHTML = `<strong>${translation}</strong>${explanation}`;
    
    // Add speak event to fallback
    container.querySelector('#btn-speak-fallback')?.addEventListener('click', () => {
      speak(foundWord.term);
    });

    storage.addTranslation({ source: text, result: translation, direction: currentDirection });
    showToast('📴 Đang dùng từ điển offline', 'info');
  } else {
    resultEl.innerHTML = `<span style="color:#b91c1c">⚠️ ${isOnline() ? 'Lỗi API dịch thuật và không tìm thấy từ trong từ điển.' : 'Mất kết nối mạng và không tìm thấy từ trong từ điển.'}</span>`;
  }
}

function handleTranslationResult(text, translated, resultEl, termLegend, detectedTerms, container) {
  if (currentDirection === 'en-vi') {
    const highlighted = highlightMedicalTerms(translated, ALL_MEDICAL_TERMS);
    resultEl.innerHTML = highlighted;
    // Find detected terms
    const found = ALL_MEDICAL_TERMS.filter(t => text.toLowerCase().includes(t.term.toLowerCase()));
    if (found.length > 0) {
      termLegend.classList.remove('hidden');
      detectedTerms.innerHTML = found.map(t =>
        `<span class="medical-term-highlight" data-term-id="${t.id}" style="cursor:pointer">${t.term}</span>`
      ).join('');
      // Click term in legend
      detectedTerms.querySelectorAll('[data-term-id]').forEach(span => {
        span.addEventListener('click', () => showTermModal(span.dataset.termId, container));
      });
    } else {
      termLegend.classList.add('hidden');
    }
    // Click highlighted terms in result
    resultEl.querySelectorAll('.medical-term-highlight').forEach(span => {
      span.addEventListener('click', () => showTermModal(span.dataset.term, container));
    });
  } else {
    resultEl.textContent = translated;
  }
  storage.addTranslation({ source: text, result: translated, direction: currentDirection });
}

function showTermModal(termId, container) {
  const term = ALL_MEDICAL_TERMS.find(t => t.id === termId || t.term.toLowerCase() === termId.toLowerCase());
  if (!term) return;
  const modal = container.querySelector('#term-modal');
  
  // Set modal title with play button
  container.querySelector('#modal-term-title').innerHTML = `
    <span>${term.term}</span>
    <button class="btn btn-ghost btn-icon" id="btn-speak-modal" title="Phát âm" style="margin-left: 8px; width: 30px; height: 30px; font-size: 0.9rem;">🔊</button>
  `;

  container.querySelector('#modal-term-body').innerHTML = `
    <p class="text-lg font-bold text-teal mb-sm">${term.vietnamese}</p>
    ${term.pronunciation ? `<p class="text-sm text-muted mb-md">${term.pronunciation}</p>` : ''}
    <p class="text-sm mb-md" style="line-height:1.7">${term.definition}</p>
    ${term.example ? `<div class="flashcard-example">"${term.example}"</div>` : ''}
    ${term.clinicalNote ? `<div class="flashcard-clinical"><strong>📋 Lâm sàng:</strong> ${term.clinicalNote}</div>` : ''}
  `;

  // Bind speak action
  container.querySelector('#btn-speak-modal').addEventListener('click', () => {
    speak(term.term);
  });

  container.querySelector('#btn-save-term').onclick = () => {
    storage.saveWord(term);
    showToast(`Đã lưu: ${term.term}`, 'success');
    modal.classList.remove('show');
  };
  modal.classList.add('show');
}
