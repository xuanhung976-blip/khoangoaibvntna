import { getModuleById } from '../../data/medical/medicalRegistry.js';
import { renderMedicalFlashcard } from './medicalFlashcard.js';
import { renderMedicalQuiz } from './medicalQuiz.js';
import { renderMedicalCases } from './medicalCases.js';
import statisticsEngine from '../../utils/statisticsEngine.js';

const DATA_LOADERS = {
  thyroid: async () => {
    const [vocabMod, { THYROID_QUIZ }, { THYROID_CASES }, { THYROID_TOPICS }] = await Promise.all([
      import('../../data/medical/thyroid/vocabulary.js'),
      import('../../data/medical/thyroid/quiz.js'),
      import('../../data/medical/thyroid/cases.js'),
      import('../../data/medical/thyroid/topics.js'),
    ]);
    return { vocabulary: vocabMod.default, quiz: THYROID_QUIZ, cases: THYROID_CASES, topics: THYROID_TOPICS };
  },
  diabetes: async () => {
    const [vocabMod, { DIABETES_QUIZ }, { DIABETES_CASES }, { DIABETES_TOPICS }] = await Promise.all([
      import('../../data/medical/diabetes/vocabulary.js'),
      import('../../data/medical/diabetes/quiz.js'),
      import('../../data/medical/diabetes/cases.js'),
      import('../../data/medical/diabetes/topics.js'),
    ]);
    return { vocabulary: vocabMod.default, quiz: DIABETES_QUIZ, cases: DIABETES_CASES, topics: DIABETES_TOPICS };
  },
};

let currentTab = 'vocab';
let moduleData = null;
let currentModuleId = null;

export async function renderMedicalModule(container, moduleId) {
  const mod = getModuleById(moduleId);
  if (!mod || !mod.enabled) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🚫</div><h3>Module không khả dụng</h3><p>Module này đang được phát triển</p></div>`;
    return;
  }

  if (moduleId !== currentModuleId) { currentTab = 'vocab'; currentModuleId = moduleId; }

  container.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Đang tải dữ liệu...</p></div>`;

  try {
    const loader = DATA_LOADERS[moduleId];
    if (!loader) throw new Error('No data loader for ' + moduleId);
    moduleData = await loader();
  } catch (e) {
    container.innerHTML = `<div class="error-state"><div class="error-icon">⚠️</div><p>Lỗi tải dữ liệu: ${e.message}</p></div>`;
    return;
  }

  const stats = statisticsEngine.getMedicalModuleStats(moduleId);
  renderModuleLayout(container, mod, moduleData, stats);
}

function renderModuleLayout(container, mod, data, stats) {
  container.innerHTML = `
    <div class="page-view animate-fade-in">
      <!-- Header -->
      <div class="page-header">
        <div class="flex items-center gap-md mb-md">
          <button class="btn btn-ghost btn-sm" id="btn-back-medical">← Medical Hub</button>
        </div>
        <div class="flex items-center gap-md">
          <div style="width:48px;height:48px;border-radius:12px;background:${mod.gradient};display:flex;align-items:center;justify-content:center;font-size:1.5rem">${mod.icon}</div>
          <div>
            <h2 class="page-title" style="margin-bottom:0">${mod.name}</h2>
            <p class="page-subtitle">${mod.vietnameseName} · ${data.vocabulary.length} thuật ngữ</p>
          </div>
        </div>
        <!-- Stats -->
        <div class="flex gap-md mt-md" style="flex-wrap:wrap">
          <div class="glass-card-sm" style="min-width:100px;text-align:center">
            <div style="font-size:1.5rem;font-weight:800;color:var(--purple-light)">${stats.learned}</div>
            <div class="text-xs text-muted">Từ đã học</div>
          </div>
          <div class="glass-card-sm" style="min-width:100px;text-align:center">
            <div style="font-size:1.5rem;font-weight:800;color:var(--teal-light)">${stats.percent}%</div>
            <div class="text-xs text-muted">Hoàn thành</div>
          </div>
          <div class="glass-card-sm" style="min-width:100px;text-align:center">
            <div style="font-size:1.5rem;font-weight:800;color:#f59e0b">${stats.avgScore || 0}%</div>
            <div class="text-xs text-muted">Quiz trung bình</div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs" id="module-tabs">
        <button class="tab-btn ${currentTab === 'vocab' ? 'active' : ''}" data-tab="vocab">📚 Từ vựng</button>
        <button class="tab-btn ${currentTab === 'flashcard' ? 'active' : ''}" data-tab="flashcard"> Flashcard</button>
        <button class="tab-btn ${currentTab === 'quiz' ? 'active' : ''}" data-tab="quiz">🎯 Quiz</button>
        <button class="tab-btn ${currentTab === 'cases' ? 'active' : ''}" data-tab="cases">🏥 Ca lâm sàng</button>
        <button class="tab-btn ${currentTab === 'abbr' ? 'active' : ''}" data-tab="abbr">📖 Viết tắt</button>
      </div>

      <!-- Tab Content -->
      <div id="tab-content"></div>
    </div>
  `;

  container.querySelector('#btn-back-medical').addEventListener('click', () => {
    window.location.hash = '/medical';
  });

  // Tab switching
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentTab = btn.dataset.tab;
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
      renderTabContent(container.querySelector('#tab-content'), currentTab, mod, data);
    });
  });

  renderTabContent(container.querySelector('#tab-content'), currentTab, mod, data);
}

function renderTabContent(el, tab, mod, data) {
  if (tab === 'vocab') renderVocabTab(el, data, mod);
  else if (tab === 'flashcard') renderMedicalFlashcard(el, data.vocabulary, { title: mod.name, moduleGradient: mod.gradient, moduleId: mod.id });
  else if (tab === 'quiz') renderMedicalQuiz(el, data, mod);
  else if (tab === 'cases') renderMedicalCases(el, data.cases, mod);
  else if (tab === 'abbr') renderAbbrTab(el, data, mod);
}

function renderVocabTab(el, data, mod) {
  const categories = [...new Set(data.vocabulary.map(v => v.category))];
  let filterCat = 'all';
  let searchVal = '';
  let limit = 50;

  function render() {
    const matched = data.vocabulary.filter(v => {
      const matchesCat = filterCat === 'all' || v.category === filterCat;
      const matchesSearch = v.term.toLowerCase().includes(searchVal.toLowerCase()) ||
                            (v.vietnamese || '').toLowerCase().includes(searchVal.toLowerCase()) ||
                            (v.definition || '').toLowerCase().includes(searchVal.toLowerCase());
      return matchesCat && matchesSearch;
    });

    const visible = matched.slice(0, limit);

    el.innerHTML = `
      <div class="animate-fade-in">
        <!-- Topics -->
        ${data.topics && data.topics.length > 0 && filterCat === 'all' && !searchVal ? `
          <div class="topic-grid mb-xl">
            ${data.topics.map(t => `
              <div class="topic-card" data-cat="${t.category}" style="--module-color:${mod.gradient}">
                <div class="topic-icon">${t.icon}</div>
                <div class="topic-title">${t.title}</div>
                <div class="topic-subtitle">${t.titleVi}</div>
                <div class="topic-count">${t.termCount} thuật ngữ</div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- Search bar -->
        <div class="search-container mb-md">
          <span class="search-icon">🔍</span>
          <input type="text" class="search-input" id="medical-vocab-search" placeholder="Tìm kiếm thuật ngữ (${matched.length} từ)..." value="${searchVal}">
        </div>

        <!-- Filter chips -->
        <div class="filter-chips mb-lg">
          <span class="chip ${filterCat === 'all' ? 'active' : ''}" data-filter="all">Tất cả</span>
          ${categories.map(c => `<span class="chip ${filterCat === c ? 'active' : ''}" data-filter="${c}">${c}</span>`).join('')}
        </div>

        <!-- Vocabulary list -->
        <div class="vocab-list">
          ${visible.map(word => {
            const progress = window.__storage ? window.__storage.getFlashcardProgress(word.id) : { confidence: 0 };
            return `
              <div class="vocab-item" data-word-id="${word.id}">
                <div>
                  <div class="vocab-term">${word.term}</div>
                  ${word.pronunciation ? `<div class="vocab-ipa">${word.pronunciation}</div>` : ''}
                  <div class="vocab-vi">${word.vietnamese || '<span class="text-muted">(Chưa dịch - click để tra/dịch)</span>'}</div>
                  ${word.abbreviation ? `<span class="vocab-tag" style="color:var(--teal-light)">${word.abbreviation}</span>` : ''}
                  <div class="vocab-tags">
                    ${(word.tags||[]).map(t=>`<span class="vocab-tag">${t}</span>`).join('')}
                    <span class="level-badge level-${(word.difficulty||'b1').toLowerCase()}">${word.difficulty||'B1'}</span>
                  </div>
                </div>
                <div class="vocab-confidence">
                  <div class="confidence-dots">
                    ${[0,1,2,3,4].map(i=>`<div class="confidence-dot ${(progress.confidence||0) > i ? 'filled' : ''}"></div>`).join('')}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        ${matched.length > limit ? `
          <div class="text-center mt-lg">
            <button class="btn btn-secondary" id="btn-load-more-medical">Tải thêm thuật ngữ</button>
          </div>
        ` : ''}

        <p class="text-sm text-muted mt-md text-center">${matched.length} thuật ngữ</p>
      </div>
    `;

    // Search event
    const searchInput = el.querySelector('#medical-vocab-search');
    if (document.activeElement?.id === 'medical-vocab-search') {
      searchInput.focus();
      searchInput.setSelectionRange(searchVal.length, searchVal.length);
    }

    searchInput.addEventListener('input', (e) => {
      searchVal = e.target.value;
      limit = 50;
      render();
      const newSearchInput = el.querySelector('#medical-vocab-search');
      newSearchInput.focus();
      newSearchInput.setSelectionRange(searchVal.length, searchVal.length);
    });

    // Filter events
    el.querySelectorAll('[data-filter]').forEach(chip => {
      chip.addEventListener('click', () => { filterCat = chip.dataset.filter; limit = 50; render(); });
    });
    el.querySelectorAll('[data-cat]').forEach(card => {
      card.addEventListener('click', () => { filterCat = card.dataset.cat; limit = 50; render(); });
    });

    // Load more event
    const loadMoreBtn = el.querySelector('#btn-load-more-medical');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => {
        limit += 50;
        render();
      });
    }

    // Click word to expand
    el.querySelectorAll('.vocab-item').forEach(item => {
      item.addEventListener('click', () => showWordDetail(item.dataset.wordId, data.vocabulary, mod));
    });
  }
  render();
}

function renderAbbrTab(el, data, mod) {
  import('../../data/medical/common/abbreviations.js').then(({ MEDICAL_ABBREVIATIONS }) => {
    const filtered = MEDICAL_ABBREVIATIONS.filter(a => 
      a.category === mod.id || 
      ['clinical', 'laboratory', 'prescription', 'vital', 'procedure', 'measurement', 'symptom'].includes(a.category)
    );
    el.innerHTML = `
      <div class="animate-fade-in">
        <div class="glass-card">
          <table class="abbr-table">
            <thead>
              <tr>
                <th>Viết tắt</th>
                <th>Tiếng Anh đầy đủ</th>
                <th>Tiếng Việt</th>
                <th>Nhóm</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(a => `
                <tr>
                  <td><span class="abbr-short">${a.abbr}</span></td>
                  <td><span class="abbr-full">${a.full}</span></td>
                  <td><span class="abbr-vi">${a.vietnamese}</span></td>
                  <td><span class="abbr-category">${a.category}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  });
}

function showWordDetail(wordId, vocabulary, mod) {
  const word = vocabulary.find(w => w.id === wordId);
  if (!word) return;
  let modal = document.getElementById('word-detail-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'word-detail-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title" id="wdm-title"></span>
          <button class="btn btn-ghost btn-icon" id="wdm-close">✕</button>
        </div>
        <div id="wdm-body"></div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('#wdm-close').addEventListener('click', () => modal.classList.remove('show'));
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('show'); });
  }
  modal.querySelector('#wdm-title').textContent = word.term;
  modal.querySelector('#wdm-body').innerHTML = `
    <div class="text-lg font-bold text-teal mb-sm">${word.vietnamese}</div>
    ${word.pronunciation ? `<div class="text-sm text-muted mb-md">${word.pronunciation}</div>` : ''}
    ${word.abbreviation ? `<div class="flashcard-abbr" style="margin-bottom:12px;display:inline-block">${word.abbreviation}</div>` : ''}
    <p class="text-sm mb-md" style="line-height:1.7">${word.definition}</p>
    ${word.example ? `<div class="flashcard-example">"${word.example}"</div>` : ''}
    ${word.clinicalNote ? `<div class="flashcard-clinical"><strong>📋 Lâm sàng:</strong> ${word.clinicalNote}</div>` : ''}
    <div class="vocab-tags mt-md">
      ${(word.tags||[]).map(t=>`<span class="vocab-tag">${t}</span>`).join('')}
      <span class="level-badge level-${(word.difficulty||'b1').toLowerCase()}">${word.difficulty}</span>
    </div>
  `;
  modal.classList.add('show');
}
