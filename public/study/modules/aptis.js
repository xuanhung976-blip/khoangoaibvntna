import { renderFlashcardSession } from './flashcard.js';
import { renderQuizSession } from './quiz.js';
import APTIS_DATA from '../data/aptis.js';

export function renderAPTIS(container) {
  let activeTab = 'vocab';

  function render() {
    const vocab = APTIS_DATA.vocabulary || [];
    const quizzes = APTIS_DATA.quizzes || [];
    const writingQuizzes = quizzes.filter(q => q.type === 'writing-prompt');
    const mcQuizzes = quizzes.filter(q => q.type !== 'writing-prompt' && q.type !== 'matching');
    const speakingData = [];

    container.innerHTML = `
      <div class="page-view animate-fade-in">
        <div class="page-header">
          <h2 class="page-title">📗 APTIS ESOL</h2>
          <p class="page-subtitle">Luyện thi APTIS ESOL — Từ vựng học thuật, ngữ pháp, 4 kỹ năng</p>
        </div>
        <!-- Tabs -->
        <div class="tabs mb-xl">
          <button class="tab-btn ${activeTab==='vocab'?'active':''}" data-tab="vocab">📚 Từ vựng</button>
          <button class="tab-btn ${activeTab==='flashcard'?'active':''}" data-tab="flashcard"> Flashcard</button>
          <button class="tab-btn ${activeTab==='grammar'?'active':''}" data-tab="grammar">✍️ Grammar</button>
          <button class="tab-btn ${activeTab==='reading'?'active':''}" data-tab="reading">📖 Reading</button>
          <button class="tab-btn ${activeTab==='writing'?'active':''}" data-tab="writing">📝 Writing</button>
          <button class="tab-btn ${activeTab==='speaking'?'active':''}" data-tab="speaking">🎤 Speaking</button>
        </div>
        <div id="aptis-content"></div>
      </div>
    `;

    container.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.tab;
        container.querySelectorAll('.tab-btn[data-tab]').forEach(b => b.classList.toggle('active', b === btn));
        renderAPTISTab(container.querySelector('#aptis-content'), activeTab, { vocab, quizzes, mcQuizzes, writingQuizzes });
      });
    });

    renderAPTISTab(container.querySelector('#aptis-content'), activeTab, { vocab, quizzes, mcQuizzes, writingQuizzes });
  }
  render();
}

function renderAPTISTab(el, tab, { vocab, quizzes, mcQuizzes, writingQuizzes }) {
  if (tab === 'vocab') {
    el.innerHTML = `
      <div class="vocab-list animate-fade-in">
        ${vocab.map(w => `
          <div class="vocab-item">
            <div style="width: 100%; display: flex; flex-direction: column; height: 100%;">
              <div class="vocab-term" style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 2px;">
                <span style="font-size: 1.1rem; font-weight: 700;">${w.word}</span>
                <button class="btn-speak btn-ghost btn-icon-sm" data-speak="${w.word.replace(/"/g, '&quot;')}" title="Phát âm" style="border:none; background:none; cursor:pointer; font-size:0.95rem; opacity:0.6; padding:0 4px; transition:opacity 0.2s">🔊</button>
              </div>
              <div class="vocab-ipa" style="font-size:0.8rem; color:var(--text-muted); font-style:italic; margin-bottom: 6px;">${w.ipa || ''}</div>
              <div class="vocab-vi" style="font-size:0.92rem; color:var(--teal-dark); font-weight:600; margin-bottom: 8px;">${w.vi || w.meaning || '<span class="text-muted">(Chưa dịch)</span>'}</div>
              
              ${w.example ? `
                <div class="text-xs text-muted" style="margin-top:auto; padding-top: 10px; border-top: 1px dashed rgba(0,0,0,0.06); font-style:italic; line-height:1.5; color:var(--text-secondary); margin-bottom: 8px;">
                  "${w.example}"
                </div>
              ` : ''}
              
              <div class="vocab-tags" style="display:flex; gap:4px; flex-wrap:wrap; margin-top: ${w.example ? '0' : 'auto'};">
                ${(w.tags||[]).map(t=>`<span class="vocab-tag" style="font-size:0.65rem; background:#f1f5f9; color:var(--text-secondary); padding:2px 8px; border-radius:100px; font-weight:600;">${t}</span>`).join('')}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Speak event
    el.querySelectorAll('.btn-speak').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        import('../utils/helpers.js').then(({ speak }) => {
          speak(btn.dataset.speak);
        });
      });
      btn.addEventListener('mouseenter', () => btn.style.opacity = '1');
      btn.addEventListener('mouseleave', () => btn.style.opacity = '0.6');
    });
  } else if (tab === 'flashcard') {
    renderFlashcardSession(el, vocab, { title: 'APTIS Vocabulary', moduleGradient: 'var(--gradient-aptis)', moduleId: 'aptis' });
  } else if (tab === 'grammar') {
    import('../data/aptis/grammar.js').then(({ APTIS_GRAMMAR }) => {
      el.innerHTML = `<div class="animate-fade-in">${APTIS_GRAMMAR.map(g => `
        <div class="glass-card mb-lg">
          <h3 style="font-size:1rem;font-weight:700;margin-bottom:16px">${g.topic}</h3>
          <p class="text-sm text-secondary mb-lg" style="line-height:1.7">${g.explanation}</p>
          <div class="quiz-options">
            ${(g.exercises||[]).map((ex, i) => `
              <div class="glass-card-sm mb-md">
                <p class="text-sm font-medium mb-md">${i+1}. ${ex.question}</p>
                ${ex.options ? ex.options.map((opt, oi) => `
                  <div class="quiz-option text-sm" data-qk="ag_${g.id}_${i}" data-oi="${oi}" data-correct="${ex.answer}" data-exp="${encodeURIComponent(ex.explanation||'')}">
                    <span class="option-letter">${['A','B','C','D'][oi]}</span> ${opt}
                  </div>
                `).join('') : `<p class="text-sm text-muted">${ex.question}</p>`}
                <div class="explanation-ag_${g.id}_${i} hidden quiz-explanation"></div>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}</div>`;
      el.querySelectorAll('.quiz-option').forEach(opt => {
        opt.addEventListener('click', () => {
          const qKey = opt.dataset.qk;
          const all = el.querySelectorAll(`[data-qk="${qKey}"]`);
          const correct = parseInt(opt.dataset.correct);
          all.forEach(o => {
            o.classList.add('disabled');
            if (parseInt(o.dataset.oi) === correct) o.classList.add('correct');
            else if (o === opt) o.classList.add('incorrect');
          });
          const expEl = el.querySelector(`.explanation-${qKey}`);
          if (expEl) { expEl.textContent = decodeURIComponent(opt.dataset.exp||''); expEl.classList.remove('hidden'); }
        });
      });
    });
  } else if (tab === 'reading') {
    const readingQ = quizzes.filter(q => q.skill === 'Reading' && q.type === 'multiple-choice');
    if (readingQ.length > 0) renderQuizSession(el, readingQ, { title: 'APTIS Reading', moduleId: 'aptis' });
    else el.innerHTML = `<div class="empty-state"><div class="empty-icon">📚</div><h3>Reading Coming Soon</h3></div>`;
  } else if (tab === 'writing') {
    import('../data/aptis/grammar.js').then(() => {});
    const writingArr = writingQuizzes;
    renderQuizSession(el, writingArr.length ? writingArr : quizzes, { title: 'APTIS Writing', moduleId: 'aptis' });
  } else if (tab === 'speaking') {
    import('../data/aptis/speaking.js').then(({ APTIS_SPEAKING }) => {
      el.innerHTML = `<div class="animate-fade-in">${APTIS_SPEAKING.map(s => `
        <div class="glass-card mb-lg">
          <h3 style="font-size:1rem;font-weight:700;margin-bottom:12px">${s.component}</h3>
          ${(s.questions||s.topics||[]).map(q => `
            <div class="glass-card-sm mb-md">
              <p class="font-medium mb-sm">${q.question || q.topic || ''}</p>
              ${q.level ? `<span class="level-badge level-${q.level.split('-')[0].trim().toLowerCase()}">${q.level}</span>` : ''}
              <details class="mt-md">
                <summary class="btn btn-secondary btn-sm" style="cursor:pointer;list-style:none">👁 Xem bài mẫu</summary>
                <div class="quiz-explanation mt-sm">${q.sampleAnswer || q.samplePhrases?.join('<br>') || q.keyVocabulary?.join(', ') || ''}</div>
              </details>
            </div>
          `).join('')}
        </div>
      `).join('')}</div>`;
    });
  }
}
