import { renderFlashcardSession } from './flashcard.js';
import { renderQuizSession } from './quiz.js';
import quizEngine from '../utils/quizEngine.js';
import VSTEP_DATA from '../data/vstep.js';
import { renderSpeakingSimulator } from './vstepSpeaking.js';
import { renderListeningStudio } from './vstepListening.js';
import { renderProfiler, analyzeText } from './profiler.js';
import { speak, showToast } from '../utils/helpers.js';
import gemini from '../utils/gemini.js';
import { openGeminiConfigModal } from './aiConfig.js';

export function renderVSTEP(container) {
  let activeLevel = 'B2';
  let activeTab = 'vocab';

  function render() {
    const vocab = VSTEP_DATA.vocabulary[activeLevel] || [];
    const quizzes = VSTEP_DATA.quizzes || [];
    const levelQuiz = quizzes.filter(q => q.level === activeLevel || !q.level);

    container.innerHTML = `
      <div class="page-view animate-fade-in">
        <div class="page-header" style="margin-bottom: 20px;">
          <div class="flex items-center justify-between flex-wrap gap-md">
            <div>
              <h2 class="page-title" style="display:flex; align-items:center; gap:8px;">
                📘 VSTEP Master Suite
                <span class="chip chip-purple" style="font-size:0.75rem; font-weight:700">Level 3–4 (B1–B2–C1)</span>
              </h2>
              <p class="page-subtitle">Hệ thống luyện thi VSTEP 4 kỹ năng chuẩn hóa tích hợp AI Examiner & CEFR Profiler</p>
            </div>
            <div class="flex items-center gap-xs">
              <span class="text-xs text-muted">Trình độ mục tiêu:</span>
              <div class="tabs" id="level-tabs" style="margin-bottom:0">
                ${['B1','B2','C1'].map(l => `
                  <button class="tab-btn ${l === activeLevel ? 'active' : ''}" data-level="${l}" style="padding:6px 14px; font-size:0.85rem">${l}</button>
                `).join('')}
              </div>
            </div>
          </div>
        </div>

        <!-- 9 Skill Tabs -->
        <div class="tabs mb-xl" id="skill-tabs" style="display:flex; flex-wrap:wrap; gap:6px; background:#ffffff; padding:8px; border-radius:12px; border:1px solid var(--border-glass);">
          <button class="tab-btn ${activeTab==='vocab' ? 'active':''}" data-skill="vocab">📚 Từ vựng B2</button>
          <button class="tab-btn ${activeTab==='flashcard' ? 'active':''}" data-skill="flashcard">⚡ Flashcard SRS</button>
          <button class="tab-btn ${activeTab==='quiz' ? 'active':''}" data-skill="quiz">🎯 Quiz trắc nghiệm</button>
          <button class="tab-btn ${activeTab==='listening' ? 'active':''}" data-skill="listening">🎧 Listening AI</button>
          <button class="tab-btn ${activeTab==='reading' ? 'active':''}" data-skill="reading">📖 Reading B2</button>
          <button class="tab-btn ${activeTab==='writing' ? 'active':''}" data-skill="writing">📝 Writing Studio</button>
          <button class="tab-btn ${activeTab==='speaking' ? 'active':''}" data-skill="speaking">🗣️ Speaking AI Room</button>
          <button class="tab-btn ${activeTab==='grammar' ? 'active':''}" data-skill="grammar">✍️ Ngữ pháp</button>
          <button class="tab-btn ${activeTab==='profiler' ? 'active':''}" data-skill="profiler">🔍 CEFR Profiler</button>
        </div>

        <div id="vstep-content"></div>
      </div>
    `;

    // Level tabs
    container.querySelectorAll('[data-level]').forEach(btn => {
      btn.addEventListener('click', () => { 
        activeLevel = btn.dataset.level; 
        render(); 
      });
    });

    // Skill tabs
    container.querySelectorAll('[data-skill]').forEach(btn => {
      btn.addEventListener('click', () => { 
        activeTab = btn.dataset.skill; 
        renderSkillContent(); 
      });
    });

    function renderSkillContent() {
      const contentEl = container.querySelector('#vstep-content');
      container.querySelectorAll('[data-skill]').forEach(b => b.classList.toggle('active', b.dataset.skill === activeTab));
      
      if (activeTab === 'vocab') {
        renderVocabList(contentEl, vocab);
      } else if (activeTab === 'flashcard') {
        renderFlashcardSession(contentEl, vocab, { title: 'VSTEP ' + activeLevel, moduleGradient: 'var(--gradient-vstep)', moduleId: 'vstep' });
      } else if (activeTab === 'quiz') {
        const questions = levelQuiz.length > 0 
          ? levelQuiz 
          : quizEngine.generateFromVocabulary(vocab, Math.min(20, vocab.length));
        renderQuizSession(contentEl, questions, { title: 'VSTEP Quiz ' + activeLevel, moduleId: 'vstep' });
      } else if (activeTab === 'grammar') {
        renderGrammar(contentEl);
      } else if (activeTab === 'listening') {
        renderListeningStudio(contentEl);
      } else if (activeTab === 'reading') {
        renderReading(contentEl);
      } else if (activeTab === 'writing') {
        renderWriting(contentEl);
      } else if (activeTab === 'speaking') {
        renderSpeakingSimulator(contentEl);
      } else if (activeTab === 'profiler') {
        renderProfiler(contentEl);
      }
    }

    renderSkillContent();
  }
  render();
}

function renderVocabList(el, vocab) {
  let searchVal = '';
  let limit = 50;
  let activeTopic = 'all';

  function draw() {
    const matched = vocab.filter(w => {
      const matchesTopic = activeTopic === 'all' || w.category === activeTopic;
      const matchesSearch = w.word.toLowerCase().includes(searchVal.toLowerCase()) || 
                            (w.vi || w.meaning || '').toLowerCase().includes(searchVal.toLowerCase());
      return matchesTopic && matchesSearch;
    });
    
    const visible = matched.slice(0, limit);
    const topics = VSTEP_DATA.topics || [];
    const getTopicCount = (cat) => vocab.filter(w => w.category === cat).length;

    el.innerHTML = `
      <div class="animate-fade-in">
        <!-- Topic Cards Grid (only when not searching) -->
        ${!searchVal && activeTopic === 'all' ? `
          <div class="topic-grid mb-xl">
            ${topics.map(t => {
              const count = getTopicCount(t.category);
              if (count === 0) return '';
              return `
                <div class="topic-card" data-topic="${t.category}" style="--module-color:var(--gradient-vstep)">
                  <div class="topic-icon">${t.icon}</div>
                  <div class="topic-title">${t.title}</div>
                  <div class="topic-subtitle">${t.titleVi}</div>
                  <div class="topic-count">${count} từ</div>
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}

        <!-- Search bar -->
        <div class="search-container mb-md">
          <span class="search-icon">🔍</span>
          <input type="text" class="search-input" id="vocab-search" placeholder="Tìm kiếm từ vựng (${matched.length} từ)..." value="${searchVal}">
        </div>

        <!-- Topic Filter Chips -->
        <div class="filter-chips mb-lg">
          <span class="chip ${activeTopic === 'all' ? 'active' : ''}" data-filter="all">Tất cả (${vocab.length})</span>
          ${topics.map(t => {
            const count = getTopicCount(t.category);
            if (count === 0) return '';
            return `<span class="chip ${activeTopic === t.category ? 'active' : ''}" data-filter="${t.category}">${t.icon} ${t.title} (${count})</span>`;
          }).join('')}
        </div>

        <div class="vocab-list">
          ${visible.map(w => `
            <div class="vocab-item">
              <div style="width: 100%; display: flex; flex-direction: column; height: 100%;">
                <div class="vocab-term" style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 2px;">
                  <span style="font-size: 1.1rem; font-weight: 700;">${w.word}</span>
                  <div style="display:flex; align-items:center; gap:2px;">
                    <button class="btn-ai-explain btn-ghost btn-icon-sm" data-word="${w.word.replace(/"/g, '&quot;')}" data-vi="${(w.vi || w.meaning || '').replace(/"/g, '&quot;')}" title="Xem mẹo nhớ AI (Mnemonic) & Collocations" style="border:none; background:none; cursor:pointer; font-size:0.95rem; opacity:0.6; padding:0 4px; transition:opacity 0.2s">✨</button>
                    <button class="btn-speak btn-ghost btn-icon-sm" data-speak="${w.word.replace(/"/g, '&quot;')}" title="Phát âm" style="border:none; background:none; cursor:pointer; font-size:0.95rem; opacity:0.6; padding:0 4px; transition:opacity 0.2s">🔊</button>
                  </div>
                </div>
                <div class="vocab-ipa" style="font-size:0.8rem; color:var(--text-muted); font-style:italic; margin-bottom: 6px;">${w.ipa || ''}</div>
                <div class="vocab-vi" style="font-size:0.92rem; color:var(--teal-dark); font-weight:600; margin-bottom: 8px;">${w.vi || w.meaning || '<span class="text-muted">(Chưa dịch)</span>'}</div>
                
                ${w.example ? `
                  <div class="text-xs text-muted" style="margin-top:auto; padding-top: 10px; border-top: 1px dashed rgba(0,0,0,0.06); font-style:italic; line-height:1.5; color:var(--text-secondary); margin-bottom: 8px;">
                    "${w.example}"
                  </div>
                ` : ''}
                
                <div class="vocab-tags" style="display:flex; gap:4px; flex-wrap:wrap; margin-top: ${w.example ? '0' : 'auto'};">
                  <span class="vocab-tag level-badge level-${(w.level||'b2').toLowerCase()}" style="font-size:0.65rem; padding:2px 8px; border-radius:100px; font-weight:700;">${w.level||'B2'}</span>
                  ${(w.tags||[]).map(t=>`<span class="vocab-tag" style="font-size:0.65rem; background:#f1f5f9; color:var(--text-secondary); padding:2px 8px; border-radius:100px; font-weight:600;">${t}</span>`).join('')}
                </div>
              </div>
            </div>
          `).join('')}
        </div>

        ${matched.length > limit ? `
          <div class="text-center mt-lg">
            <button class="btn btn-secondary" id="btn-load-more">Tải thêm từ</button>
          </div>
        ` : ''}
      </div>
    `;

    // Speak event
    el.querySelectorAll('.btn-speak').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        speak(btn.dataset.speak);
      });
      btn.addEventListener('mouseenter', () => btn.style.opacity = '1');
      btn.addEventListener('mouseleave', () => btn.style.opacity = '0.6');
    });

    // AI Vocabulary Explainer
    el.querySelectorAll('.btn-ai-explain').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        showVocabAIModal(btn.dataset.word, btn.dataset.vi);
      });
      btn.addEventListener('mouseenter', () => btn.style.opacity = '1');
      btn.addEventListener('mouseleave', () => btn.style.opacity = '0.6');
    });

    const searchInput = el.querySelector('#vocab-search');
    if (document.activeElement?.id === 'vocab-search') {
      searchInput.focus();
      searchInput.setSelectionRange(searchVal.length, searchVal.length);
    }

    searchInput.addEventListener('input', (e) => {
      searchVal = e.target.value;
      limit = 50;
      draw();
      const newSearchInput = el.querySelector('#vocab-search');
      newSearchInput.focus();
      newSearchInput.setSelectionRange(searchVal.length, searchVal.length);
    });

    el.querySelectorAll('[data-topic]').forEach(card => {
      card.addEventListener('click', () => {
        activeTopic = card.dataset.topic;
        limit = 50;
        draw();
      });
    });

    el.querySelectorAll('[data-filter]').forEach(chip => {
      chip.addEventListener('click', () => {
        activeTopic = chip.dataset.filter;
        limit = 50;
        draw();
      });
    });

    const loadMoreBtn = el.querySelector('#btn-load-more');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => {
        limit += 50;
        draw();
      });
    }
  }

  draw();
}

function renderGrammar(el) {
  import('../data/vstep/grammar.js').then(({ VSTEP_GRAMMAR }) => {
    el.innerHTML = `
      <div class="animate-fade-in">
        ${VSTEP_GRAMMAR.map(g => `
          <div class="glass-card mb-lg">
            <div class="flex items-center gap-md mb-md">
              <span class="level-badge level-${g.level.toLowerCase()}">${g.level}</span>
              <h3 style="font-size:1.05rem; font-weight:800; color:var(--text-primary); margin:0">${g.topic}</h3>
            </div>
            <p class="text-sm text-secondary mb-md" style="line-height:1.7; font-size:0.92rem">${g.explanation}</p>
            
            <!-- Examples -->
            <div class="mb-md">
              <div class="text-xs text-muted mb-sm" style="text-transform:uppercase; letter-spacing:0.08em; font-weight:700">💡 Ví dụ mẫu chuẩn VSTEP</div>
              ${(g.examples||[]).map(ex => `
                <div style="padding:10px 14px; background:rgba(99,102,241,0.04); border-left:3px solid var(--purple); margin-bottom:8px; font-size:0.88rem; border-radius:0 8px 8px 0; line-height:1.5">
                  ${ex.sentence || ex.active || ex.pp || ex.normal || ''}
                  ${(ex.passive || ex.ps || ex.inverted) ? `<div style="color:var(--purple-light); margin-top:4px; font-weight:600">→ ${ex.passive || ex.ps || ex.inverted}</div>` : ''}
                  ${ex.vi ? `<div style="color:var(--text-muted); font-size:0.8rem; margin-top:4px">${ex.vi}</div>` : ''}
                </div>
              `).join('')}
            </div>

            <!-- Interactive Practice -->
            ${g.exercises && g.exercises.length > 0 ? `
              <div class="grammar-exercises mt-md" style="border-top: 1px solid var(--border-glass); padding-top: 16px;">
                <div class="text-xs font-bold text-teal mb-md" style="text-transform:uppercase; letter-spacing:0.08em;">📝 Luyện tập nhanh</div>
                ${g.exercises.map((ex, exi) => `
                  <div class="exercise-item mb-md" data-ex-type="${ex.type}">
                    <p class="text-sm font-medium mb-sm" style="font-weight:600">${exi+1}. ${ex.question}</p>
                    ${ex.type === 'multiple-choice' ? `
                      <div class="grid gap-sm" style="display:grid; grid-template-columns: 1fr; gap: 8px;">
                        ${ex.options.map((opt, oi) => `
                          <div class="quiz-option text-xs" style="padding: 10px 14px; border-radius: 8px; font-size:0.85rem;" data-correct="${ex.answer}" data-oi="${oi}" data-ex-key="${g.id}_${exi}">
                            <span class="option-letter" style="background:#f1f5f9; width:20px; height:20px; display:inline-flex; align-items:center; justify-content:center; border-radius:50%; margin-right:8px; font-size:0.75rem; font-weight:700">${['A','B','C','D'][oi]}</span> ${opt}
                          </div>
                        `).join('')}
                      </div>
                    ` : `
                      <div class="flex gap-sm" style="display:flex; gap: 8px; align-items:center;">
                        <input type="text" class="search-input" style="padding: 8px 12px; font-size: 0.85rem; border-radius: 8px; margin-bottom: 0;" placeholder="Nhập câu trả lời của bạn..." data-answer="${ex.answer.replace(/"/g, '&quot;')}" data-ex-key="${g.id}_${exi}">
                        <button class="btn btn-teal btn-sm btn-check-exercise" data-ex-key="${g.id}_${exi}" style="padding: 8px 16px; border-radius: 8px; font-size:0.85rem; flex-shrink:0;">Kiểm tra</button>
                      </div>
                      <div class="exercise-feedback-${g.id}_${exi} hidden text-xs mt-sm" style="padding: 8px 12px; border-radius: 8px; background: rgba(0, 212, 212, 0.05); color: var(--teal-light); font-weight: 500;"></div>
                    `}
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;

    // Bind exercise MCQs
    el.querySelectorAll('.grammar-exercises .quiz-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const key = opt.dataset.exKey;
        const all = el.querySelectorAll(`[data-ex-key="${key}"]`);
        const correct = parseInt(opt.dataset.correct);
        const selected = parseInt(opt.dataset.oi);
        all.forEach(o => {
          o.classList.add('disabled');
          if (parseInt(o.dataset.oi) === correct) o.classList.add('correct');
          else if (o === opt) o.classList.add('incorrect');
        });
      });
    });

    // Bind Transform / Fill-blank exercises
    el.querySelectorAll('.btn-check-exercise').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.exKey;
        const input = el.querySelector(`input[data-ex-key="${key}"]`);
        const feedback = el.querySelector(`.exercise-feedback-${key}`);
        if (!input || !feedback) return;
        
        const userAns = input.value.trim().toLowerCase();
        const correctAns = input.dataset.answer.trim().toLowerCase();
        
        input.disabled = true;
        btn.disabled = true;
        
        if (userAns === correctAns) {
          input.style.borderColor = 'var(--teal)';
          input.style.background = 'rgba(0, 212, 212, 0.05)';
          feedback.innerHTML = '✅ <strong>Chính xác!</strong> Đáp án đúng: ' + input.dataset.answer;
        } else {
          input.style.borderColor = '#ef4444';
          input.style.background = 'rgba(239, 68, 68, 0.05)';
          feedback.innerHTML = '❌ <strong>Chưa đúng.</strong> Đáp án đúng: ' + input.dataset.answer;
        }
        feedback.classList.remove('hidden');
      });
    });
  });
}

function renderReading(el) {
  import('../data/vstep/reading.js').then(({ VSTEP_READING }) => {
    el.innerHTML = `
      <div class="animate-fade-in">
        ${VSTEP_READING.map(r => `
          <div class="glass-card mb-xl">
            <div class="flex items-center justify-between mb-md flex-wrap gap-sm">
              <div class="flex items-center gap-sm">
                <span class="level-badge level-${r.level.toLowerCase()}">${r.level}</span>
                <h3 style="font-size:1.15rem; font-weight:800; color:var(--text-primary); margin:0">${r.title}</h3>
              </div>
              <div class="flex items-center gap-xs">
                <span class="badge" style="font-family:monospace; font-size:0.95rem; font-weight:700; background:#f1f5f9; padding:4px 10px; border-radius:6px;" id="reading-timer-${r.id}">⏱️ 15:00</span>
                <button class="btn btn-secondary btn-sm btn-start-reading-timer" data-rid="${r.id}" style="font-size:0.75rem; padding:4px 10px;">Bấm giờ</button>
              </div>
            </div>

            <!-- Passage -->
            <div class="quiz-passage" style="margin-bottom:24px; padding:20px; background:#fbfcfe; border:1px solid var(--border-glass); border-radius:12px; line-height:1.8; font-size:0.95rem; white-space:pre-wrap; color:var(--text-primary);">
              ${r.passage}
            </div>

            <!-- Questions -->
            <div class="quiz-options">
              <div class="text-xs font-bold text-muted mb-md" style="text-transform:uppercase; letter-spacing:0.08em;">
                ❓ CÂU HỎI TRẮC NGHIỆM (${r.questions.length} CÂU)
              </div>

              ${r.questions.map((q, qi) => `
                <div class="glass-card-sm mb-md" style="padding:16px; border:1px solid rgba(0,0,0,0.06); background:#ffffff;">
                  <p class="text-sm font-medium mb-md" style="font-weight:700; color:var(--text-primary)">
                    Câu ${qi + 1}: ${q.question}
                  </p>
                  <div style="display:flex; flex-direction:column; gap:8px">
                    ${q.options.map((opt, oi) => `
                      <div class="quiz-option text-sm" style="font-size:0.88rem; padding:10px 14px; border-radius:8px;" data-q="${r.id}_${qi}" data-oi="${oi}" data-correct="${q.answer}" data-exp="${encodeURIComponent(q.explanation||'')}">
                        <span class="option-letter" style="background:#f1f5f9; width:22px; height:22px; display:inline-flex; align-items:center; justify-content:center; border-radius:50%; margin-right:8px; font-size:0.78rem; font-weight:700">${['A','B','C','D'][oi]}</span> ${opt}
                      </div>
                    `).join('')}
                  </div>
                  <div class="explanation-${r.id}_${qi} hidden quiz-explanation mt-md" style="padding:12px 16px; background:rgba(99,102,241,0.04); border-left:3px solid var(--purple); border-radius:0 8px 8px 0; font-size:0.85rem; color:var(--text-secondary); line-height:1.6"></div>
                  <div class="mt-xs">
                    <button class="btn btn-ghost btn-sm btn-ai-explain-reading" data-rid="${r.id}" data-qi="${qi}" style="color:var(--purple); font-weight:700; font-size:0.8rem; padding:4px 8px; cursor:pointer;">
                      🤖 AI Phân tích sâu dẫn chứng & Bẫy phương án sai
                    </button>
                    <div class="ai-reading-box-${r.id}_${qi} hidden mt-xs"></div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Timers
    el.querySelectorAll('.btn-start-reading-timer').forEach(btn => {
      let interval = null;
      let left = 15 * 60;
      btn.addEventListener('click', () => {
        const rid = btn.dataset.rid;
        const display = el.querySelector(`#reading-timer-${rid}`);
        if (interval) {
          clearInterval(interval);
          interval = null;
          btn.textContent = 'Tiếp tục';
          return;
        }
        btn.textContent = 'Tạm dừng';
        interval = setInterval(() => {
          left--;
          const m = Math.floor(left / 60).toString().padStart(2, '0');
          const s = (left % 60).toString().padStart(2, '0');
          display.textContent = `⏱️ ${m}:${s}`;
          if (left <= 0) {
            clearInterval(interval);
            showToast('Hết giờ làm bài đọc 15 phút!', 'warning');
          }
        }, 1000);
      });
    });

    el.querySelectorAll('.quiz-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const qKey = opt.dataset.q;
        const all = el.querySelectorAll(`[data-q="${qKey}"]`);
        const correct = parseInt(opt.dataset.correct);
        const selected = parseInt(opt.dataset.oi);
        all.forEach(o => {
          o.classList.add('disabled');
          if (parseInt(o.dataset.oi) === correct) o.classList.add('correct');
          else if (o === opt) o.classList.add('incorrect');
        });
        const expEl = el.querySelector(`.explanation-${qKey}`);
        if (expEl) { 
          expEl.innerHTML = '<strong>💡 Giải thích chi tiết & Dẫn chứng:</strong> ' + decodeURIComponent(opt.dataset.exp||''); 
          expEl.classList.remove('hidden'); 
        }
      });
    });

    // AI Reading Deep Explainer
    el.querySelectorAll('.btn-ai-explain-reading').forEach(btn => {
      btn.addEventListener('click', async () => {
        const rid = btn.dataset.rid;
        const qi = parseInt(btn.dataset.qi);
        const passageObj = VSTEP_READING.find(item => item.id === rid);
        if (!passageObj) return;
        const qObj = passageObj.questions[qi];
        const resBox = el.querySelector(`.ai-reading-box-${rid}_${qi}`);
        if (!resBox) return;

        resBox.classList.remove('hidden');
        resBox.innerHTML = `
          <div class="glass-card-sm text-center" style="padding:14px; background:#f8fafc;">
            <div class="spinner" style="margin:0 auto 6px; width:18px; height:18px; border-width:2px;"></div>
            <div class="text-xs text-muted">Gemini AI đang phân tích bài đọc & bẫy trắc nghiệm...</div>
          </div>
        `;

        try {
          const res = await gemini.explainReadingQuestion(
            passageObj.passage,
            qObj.question,
            qObj.options,
            qObj.options[qObj.answer]
          );

          if (!res) throw new Error('Không nhận được phản hồi từ AI.');

          resBox.innerHTML = `
            <div class="glass-card-sm animate-fade-in" style="padding:14px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; font-size:0.85rem; line-height:1.6;">
              <div style="font-weight:800; color:#166534; margin-bottom:4px;">
                📌 Dẫn chứng trong bài đọc:
              </div>
              <div style="font-style:italic; background:#ffffff; padding:8px 12px; border-radius:6px; border:1px solid #dcfce7; margin-bottom:8px; color:var(--text-primary);">
                "${res.quote || 'Dựa vào ngữ cảnh đoạn văn'}"
              </div>
              <div style="color:#15803d; margin-bottom:8px;">
                <strong>✅ Tại sao đáp án đúng:</strong> ${res.whyCorrectVi}
              </div>
              ${(res.distractorsAnalysisVi && res.distractorsAnalysisVi.length > 0) ? `
                <div style="border-top:1px dashed #bbf7d0; padding-top:8px;">
                  <div style="font-weight:700; color:#9a3412; margin-bottom:4px;">⚠️ Phân tích bẫy các phương án sai:</div>
                  <ul style="margin:0; padding-left:16px; color:var(--text-secondary); font-size:0.82rem;">
                    ${res.distractorsAnalysisVi.map(d => `<li><strong>${d.option}:</strong> ${d.reason}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}
            </div>
          `;
        } catch (e) {
          resBox.innerHTML = `
            <div style="padding:10px; background:#fef2f2; border:1px solid #fecaca; border-radius:8px; font-size:0.8rem; color:#b91c1c;">
              ❌ Lỗi gọi AI: ${e.message}
            </div>
          `;
        }
      });
    });
  });
}

function renderWriting(el) {
  import('../data/vstep/writing.js').then(({ VSTEP_WRITING }) => {
    el.innerHTML = `
      <div class="animate-fade-in">
        <!-- Writing Sub-nav -->
        <div class="flex items-center justify-between mb-lg flex-wrap gap-md">
          <div>
            <h3 style="font-size:1.15rem; font-weight:800; color:var(--text-primary); margin:0">📝 VSTEP Writing Studio</h3>
            <p class="text-xs text-muted mt-xs">Luyện viết Task 1 (Email/Thư) & Task 2 (Luận B2) kèm bộ máy CEFR AI chấm điểm live</p>
          </div>
          <div class="flex gap-sm">
            <span class="chip chip-purple" style="font-weight:700">Task 1: ≥ 120 từ</span>
            <span class="chip chip-purple" style="font-weight:700">Task 2: ≥ 250 từ</span>
          </div>
        </div>

        ${VSTEP_WRITING.map((w, wi) => `
          <div class="glass-card mb-xl" data-writing-id="${w.id}">
            <div class="flex items-center justify-between mb-md flex-wrap gap-xs">
              <div class="flex items-center gap-sm">
                <span class="level-badge level-${w.level.toLowerCase()}">${w.level}</span>
                <span class="chip" style="font-size:0.75rem; padding:3px 10px; font-weight:700">${w.type}</span>
              </div>
              <span class="text-xs text-muted">Thời gian khuyên nghị: <strong>${w.timeMinutes || 40} phút</strong> · Mục tiêu: <strong>≥ ${w.minWords || 250} từ</strong></span>
            </div>

            <div class="writing-prompt-box" style="margin-bottom:16px; padding:16px; background:#f8fafc; border-left:4px solid var(--purple); border-radius:0 10px 10px 0;">
              <div class="writing-prompt-title" style="font-weight:800; color:var(--purple-dark); font-size:0.95rem; margin-bottom:6px;">📝 Đề bài (Prompt)</div>
              <div class="writing-task" style="font-size:0.92rem; line-height:1.6; margin-bottom:10px; color:var(--text-primary); white-space:pre-wrap;">${w.task}</div>
              
              <details style="margin-top: 8px;">
                <summary style="font-size:0.82rem; font-weight:600; color:var(--teal); cursor:pointer;">💡 Mẹo và cấu trúc ghi điểm cho đề này</summary>
                <ul class="writing-tips" style="margin:8px 0 0 0; padding-left:18px">
                  ${(w.tips||[]).map(t=>`<li style="font-size:0.82rem; color:var(--text-secondary); margin-bottom:4px">${t}</li>`).join('')}
                </ul>
              </details>
            </div>

            <!-- Editor Action Bar -->
            <div class="flex items-center justify-between mb-xs">
              <span class="text-xs font-bold text-muted">VÙNG SOẠN THẢO BÀI VIẾT:</span>
              <button class="btn btn-ghost btn-sm btn-insert-template" data-template="${encodeURIComponent(w.template || w.sampleAnswer || '')}" style="font-size:0.78rem; color:var(--purple); font-weight:600;">
                📋 Chèn khung Template sẵn vào bài
              </button>
            </div>

            <textarea class="writing-area mb-sm" style="min-height: 200px; font-size:0.95rem; line-height:1.6;" placeholder="Nhập bài viết tiếng Anh của bạn tại đây... (Ứng dụng sẽ đếm từ và phân tích tự động)"></textarea>

            <div class="flex justify-between items-center flex-wrap gap-sm" style="margin-top:8px">
              <div class="flex items-center gap-sm flex-wrap">
                <button class="btn btn-primary btn-sm btn-evaluate-writing" style="font-size:0.85rem; padding:8px 16px; border-radius:8px">
                  ⚡ Chấm bài bằng AI / CEFR
                </button>
                <button class="btn btn-secondary btn-sm btn-ai-outline" style="font-size:0.85rem; padding:8px 16px; border-radius:8px; border-color:var(--purple); color:var(--purple); font-weight:700;">
                  🧠 AI Lập Dàn Ý & Luận Điểm
                </button>
                <button class="btn btn-secondary btn-sm btn-grammar-check" style="font-size:0.85rem; padding:8px 16px; border-radius:8px">
                  🔍 Soát lỗi Ngữ pháp
                </button>
                <button class="btn btn-ghost btn-sm btn-view-sample" data-sample="${encodeURIComponent(w.sampleAnswer||'')}" style="font-size:0.85rem; padding:8px 14px; border-radius:8px">
                  👁 Bài mẫu chuẩn B2
                </button>
              </div>
              <div class="flex items-center gap-sm">
                <span class="word-count text-xs" style="font-weight:700; font-size:0.85rem; color:var(--text-secondary);">0 từ</span>
                <span class="word-target-status text-xs" style="font-size:0.75rem;"></span>
              </div>
            </div>

            <!-- AI Outline Box -->
            <div class="writing-ai-outline-box mt-md hidden"></div>

            <!-- Instant Scorecard Area -->
            <div class="writing-scorecard mt-md hidden"></div>
          </div>
        `).join('')}
      </div>
    `;

    // Quick Insert Template
    el.querySelectorAll('.btn-insert-template').forEach(btn => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.glass-card');
        const ta = card.querySelector('.writing-area');
        const template = decodeURIComponent(btn.dataset.template);
        ta.value = template;
        ta.dispatchEvent(new Event('input'));
        showToast('Đã chèn khung template vào bài!', 'success');
      });
    });

    // Word count listeners
    el.querySelectorAll('.writing-area').forEach(ta => {
      ta.addEventListener('input', () => {
        const card = ta.closest('.glass-card');
        const words = ta.value.trim().split(/\s+/).filter(Boolean).length;
        const wc = card.querySelector('.word-count');
        const status = card.querySelector('.word-target-status');
        const minW = card.querySelector('.level-badge') ? (card.querySelector('.chip').textContent.includes('Task 1') ? 120 : 250) : 250;

        if (wc) wc.textContent = words + ' từ';
        if (status) {
          if (words >= minW) {
            status.innerHTML = `<span style="color:#059669; font-weight:700;">✅ Đạt yêu cầu (≥ ${minW} từ)</span>`;
          } else {
            status.innerHTML = `<span style="color:#d97706; font-weight:600;">⚠️ Cần thêm ${minW - words} từ</span>`;
          }
        }
      });
    });

    // AI Outline Generator
    el.querySelectorAll('.btn-ai-outline').forEach(btn => {
      btn.addEventListener('click', async () => {
        const card = btn.closest('.glass-card');
        const box = card.querySelector('.writing-ai-outline-box');
        const taskText = card.querySelector('.writing-task')?.textContent || '';
        const taskType = card.querySelector('.chip')?.textContent || 'Task 2';

        box.classList.remove('hidden');
        box.innerHTML = `
          <div class="glass-card-sm text-center" style="padding:20px; background:#f8fafc;">
            <div class="spinner" style="margin:0 auto 8px; width:22px; height:22px; border-width:2px;"></div>
            <div class="text-xs text-muted">Gemini AI đang phân tích đề bài và lập dàn ý B2...</div>
          </div>
        `;

        try {
          const res = await gemini.generateWritingOutline(taskText, taskType);
          if (!res) throw new Error('Không thể tạo dàn ý.');

          box.innerHTML = `
            <div class="glass-card-sm animate-fade-in" style="padding:20px; background:rgba(99,102,241,0.03); border:1px solid rgba(99,102,241,0.25); border-radius:12px;">
              <div class="flex items-center justify-between mb-sm flex-wrap gap-xs">
                <span style="font-weight:900; font-size:1.05rem; color:var(--purple); display:flex; align-items:center; gap:6px;">
                  🧠 Dàn Ý & Luận Điểm AI Đề Xuất (Chuẩn B2)
                </span>
                <button class="btn btn-primary btn-sm btn-insert-ai-template" style="font-size:0.78rem; padding:4px 12px; border-radius:6px;">
                  📥 Chèn khung này vào bài viết
                </button>
              </div>

              <div class="text-xs mb-sm" style="color:var(--text-secondary); line-height:1.6; background:#ffffff; padding:10px 14px; border-radius:8px; border:1px solid var(--border-glass);">
                <strong>📌 Phân tích đề:</strong> ${res.topicAnalysisVi || ''}<br>
                ${res.thesisStatement ? `<strong>🎯 Thesis Statement:</strong> <em>"${res.thesisStatement}"</em>` : ''}
              </div>

              <!-- 4 Sections Outline -->
              <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:12px;">
                ${(res.outline || []).map(sec => `
                  <div style="background:#ffffff; border:1px solid var(--border-glass); border-radius:8px; padding:10px 14px; font-size:0.85rem;">
                    <div style="font-weight:700; color:var(--purple-dark); margin-bottom:4px;">${sec.section} <span style="font-size:0.75rem; font-weight:normal; color:var(--text-secondary);">(${sec.guidelineVi})</span></div>
                    ${sec.topicSentenceEn ? `<div style="font-style:italic; color:var(--text-primary); margin-bottom:4px;">"${sec.topicSentenceEn}"</div>` : ''}
                    <ul style="margin:0; padding-left:16px; color:var(--text-secondary); font-size:0.82rem;">
                      ${(sec.keyIdeasEn || []).map(k => `<li>${k}</li>`).join('')}
                    </ul>
                  </div>
                `).join('')}
              </div>

              <!-- Recommended Collocations -->
              ${(res.recommendedCollocations && res.recommendedCollocations.length > 0) ? `
                <div style="background:rgba(13,148,136,0.05); border:1px solid rgba(13,148,136,0.2); border-radius:8px; padding:12px; font-size:0.82rem;">
                  <div style="font-weight:700; color:var(--teal); margin-bottom:6px;">✨ 5 Collocations "ăn điểm" B2 nên dùng trong bài:</div>
                  <div style="display:flex; flex-wrap:wrap; gap:6px;">
                    ${res.recommendedCollocations.map(c => `
                      <span class="chip" style="font-size:0.78rem; background:#ffffff;">
                        <strong>${c.phrase}</strong>: ${c.meaningVi}
                      </span>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
          `;

          box.querySelector('.btn-insert-ai-template')?.addEventListener('click', () => {
            const ta = card.querySelector('.writing-area');
            const template = res.readyTemplate || res.outline.map(o => `[${o.section}]\n${o.topicSentenceEn || ''}\n- ${o.keyIdeasEn?.join('\n- ')}`).join('\n\n');
            ta.value = template;
            ta.dispatchEvent(new Event('input'));
            showToast('Đã chèn khung dàn ý AI vào bài viết!', 'success');
          });

        } catch (err) {
          box.innerHTML = `
            <div style="padding:14px; background:#fef2f2; border:1px solid #fecaca; border-radius:10px; font-size:0.85rem; color:#b91c1c;">
              ❌ Lỗi lập dàn ý: ${err.message}
            </div>
          `;
        }
      });
    });

    // Instant Evaluation with Gemini AI / Profiler
    el.querySelectorAll('.btn-evaluate-writing').forEach(btn => {
      btn.addEventListener('click', async () => {
        const card = btn.closest('.glass-card');
        const text = card.querySelector('.writing-area').value.trim();
        const scoreBox = card.querySelector('.writing-scorecard');
        const taskText = card.querySelector('.writing-task')?.textContent || '';

        if (!text || text.split(/\s+/).filter(Boolean).length < 20) {
          scoreBox.classList.remove('hidden');
          scoreBox.innerHTML = `
            <div style="padding:14px; background:#fef2f2; border:1px solid #fecaca; border-radius:10px; font-size:0.85rem; color:#b91c1c;">
              ⚠️ Bài viết quá ngắn! Hãy viết ít nhất 20–30 từ trước khi chấm điểm.
            </div>
          `;
          return;
        }

        scoreBox.classList.remove('hidden');
        scoreBox.innerHTML = `
          <div class="glass-card-sm text-center" style="padding:24px;">
            <div class="spinner" style="margin:0 auto 8px; width:24px; height:24px; border-width:2px;"></div>
            <div class="text-xs text-muted">Đang chấm điểm và phân tích theo 4 tiêu chí VSTEP B2...</div>
          </div>
        `;

        // If Gemini API is available, perform full AI Examiner grading
        if (gemini.hasApiKey()) {
          try {
            const aiGrade = await gemini.gradeWriting(taskText, text, 'essay');
            if (aiGrade) {
              scoreBox.innerHTML = `
                <div class="glass-card-sm animate-fade-in" style="padding:20px; background:rgba(99,102,241,0.03); border:1px solid rgba(99,102,241,0.25); border-radius:12px;">
                  <div class="flex items-center justify-between mb-sm flex-wrap gap-xs">
                    <span style="font-weight:900; font-size:1.1rem; color:var(--purple); display:flex; align-items:center; gap:6px;">
                      🤖 Đánh giá VSTEP AI Examiner (Gemini)
                    </span>
                    <span class="level-badge level-${aiGrade.cefrLevel?.toLowerCase() || 'b2'}" style="font-size:0.95rem; padding:4px 14px; font-weight:800;">
                      Band: ${aiGrade.estimatedBand} (${aiGrade.cefrLevel || 'B2'})
                    </span>
                  </div>

                  <!-- 4 Criteria Breakdown -->
                  <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap:10px; margin-bottom:14px;">
                    <div class="stat-card" style="padding:10px;">
                      <div class="stat-value" style="font-size:1.2rem;">${aiGrade.scores?.taskFulfillment || 6.5}</div>
                      <div class="stat-label">Task Fulfillment</div>
                    </div>
                    <div class="stat-card" style="padding:10px;">
                      <div class="stat-value" style="font-size:1.2rem; color:var(--teal);">${aiGrade.scores?.coherenceCohesion || 6.5}</div>
                      <div class="stat-label">Coherence & Cohesion</div>
                    </div>
                    <div class="stat-card" style="padding:10px;">
                      <div class="stat-value" style="font-size:1.2rem; color:var(--purple);">${aiGrade.scores?.lexicalResource || 6.5}</div>
                      <div class="stat-label">Lexical Resource</div>
                    </div>
                    <div class="stat-card" style="padding:10px;">
                      <div class="stat-value" style="font-size:1.2rem; color:#059669;">${aiGrade.scores?.grammaticalAccuracy || 6.0}</div>
                      <div class="stat-label">Grammar Accuracy</div>
                    </div>
                  </div>

                  <p class="text-sm font-medium mb-sm" style="color:var(--text-primary); line-height:1.6;">${aiGrade.summaryVi || ''}</p>

                  <div style="font-size:0.85rem; line-height:1.6; margin-bottom:12px;">
                    <div style="color:#059669; font-weight:700; margin-bottom:4px;">✅ Điểm mạnh:</div>
                    <ul style="margin:0 0 8px 0; padding-left:18px; color:var(--text-secondary);">
                      ${(aiGrade.strengths || []).map(s => `<li>${s}</li>`).join('')}
                    </ul>
                    <div style="color:#d97706; font-weight:700; margin-bottom:4px;">⚠️ Điểm cần khắc phục:</div>
                    <ul style="margin:0; padding-left:18px; color:var(--text-secondary);">
                      ${(aiGrade.weaknesses || []).map(w => `<li>${w}</li>`).join('')}
                    </ul>
                  </div>

                  ${aiGrade.improvedVersion ? `
                    <details style="margin-top:10px; background:#ffffff; border:1px solid var(--border-glass); border-radius:8px; padding:10px 14px;">
                      <summary style="font-size:0.85rem; font-weight:700; color:var(--purple); cursor:pointer;">
                        ✨ Xem bản viết lại chuẩn Band 8.0 (dựa trên ý tưởng của bạn)
                      </summary>
                      <div class="mt-sm text-sm" style="line-height:1.7; white-space:pre-wrap; color:var(--text-primary); font-style:italic;">
                        "${aiGrade.improvedVersion}"
                      </div>
                    </details>
                  ` : ''}
                </div>
              `;
              return;
            }
          } catch (e) {
            console.warn('Gemini grading error:', e);
          }
        }

        // Fallback: Local CEFR Profiler
        const res = analyzeText(text);
        scoreBox.innerHTML = `
          <div class="glass-card-sm animate-fade-in" style="padding:18px; background:rgba(99,102,241,0.03); border:1px solid rgba(99,102,241,0.2); border-radius:12px;">
            <div class="flex items-center justify-between mb-sm flex-wrap gap-xs">
              <span style="font-weight:800; font-size:1.05rem; color:var(--purple);">📊 Kết quả phân tích CEFR Profiler</span>
              <span class="level-badge level-${res.targetBand.toLowerCase()}">Band: ${res.bandScore} (${res.targetBand})</span>
            </div>

            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap:10px; margin-bottom:12px;">
              <div class="stat-card" style="padding:10px;">
                <div class="stat-value" style="font-size:1.2rem;">${res.totalWords}</div>
                <div class="stat-label">Số từ</div>
              </div>
              <div class="stat-card" style="padding:10px;">
                <div class="stat-value" style="font-size:1.2rem; color:var(--teal);">${res.b2PlusPercent}%</div>
                <div class="stat-label">Từ vựng B2+</div>
              </div>
              <div class="stat-card" style="padding:10px;">
                <div class="stat-value" style="font-size:1.2rem; color:var(--purple);">${res.detectedTransitions.length}</div>
                <div class="stat-label">Liên từ học thuật</div>
              </div>
              <div class="stat-card" style="padding:10px;">
                <div class="stat-value" style="font-size:1.2rem; color:#059669;">${res.totalParagraphs}</div>
                <div class="stat-label">Đoạn văn</div>
              </div>
            </div>

            <div style="font-size:0.85rem; line-height:1.6; color:var(--text-secondary);">
              <div style="margin-bottom:6px;"><strong>💡 Gợi ý cải thiện:</strong></div>
              <ul style="margin:0; padding-left:18px;">
                ${res.feedback.map(f => `<li style="margin-bottom:3px;">${f}</li>`).join('')}
              </ul>
            </div>

            <div class="mt-md text-xs text-muted" style="border-top:1px dashed var(--border-glass); padding-top:8px;">
              💡 <em>Muốn nhận xét chi tiết từng câu và bản viết lại 8.0? <a href="javascript:void(0)" class="link-open-gemini" style="color:var(--purple); font-weight:700;">Kết nối Gemini API Key miễn phí</a></em>
            </div>
          </div>
        `;

        scoreBox.querySelector('.link-open-gemini')?.addEventListener('click', openGeminiConfigModal);
      });
    });

    // Live Grammar & Spell Check
    el.querySelectorAll('.btn-grammar-check').forEach(btn => {
      btn.addEventListener('click', async () => {
        const card = btn.closest('.glass-card');
        const text = card.querySelector('.writing-area').value.trim();
        const scoreBox = card.querySelector('.writing-scorecard');

        if (!text) {
          showToast('Vui lòng gõ bài viết trước khi soát lỗi ngữ pháp.', 'warning');
          return;
        }

        scoreBox.classList.remove('hidden');
        scoreBox.innerHTML = `
          <div class="glass-card-sm text-center" style="padding:20px;">
            <div class="spinner" style="margin:0 auto 8px; width:20px; height:20px; border-width:2px;"></div>
            <div class="text-xs text-muted">Đang quét lỗi ngữ pháp & chính tả...</div>
          </div>
        `;

        let errors = [];
        if (gemini.hasApiKey()) {
          try {
            errors = await gemini.checkGrammar(text);
          } catch (e) {
            console.warn(e);
          }
        }

        // Offline heuristic checks
        if (errors.length === 0) {
          const rules = [
            { reg: /\b(he|she|it)\s+(have|do|go|say|make|take)\b/gi, rule: 'Subject-Verb Agreement', fix: 'Chủ ngữ số ít (he/she/it) cần chia động từ thêm -s/-es' },
            { reg: /\bdespite\s+of\b/gi, rule: 'Preposition Error', fix: 'Dùng "despite" hoặc "in spite of", không dùng "despite of"' },
            { reg: /\b(can|could|should|must|will|would)\s+to\s+([a-z]+)\b/gi, rule: 'Modal Verb Structure', fix: 'Sau động từ khuyết thiếu (should, can, must...) dùng động từ nguyên mẫu không "to"' },
            { reg: /\b(don't|can't|won't|it's|didn't|haven't)\b/gi, rule: 'Informal Contraction', fix: 'Không nên viết tắt trong bài luận VSTEP học thuật (dùng "do not", "cannot", "will not")' }
          ];

          rules.forEach(r => {
            const match = text.match(r.reg);
            if (match) {
              match.forEach(m => {
                errors.push({ bad: m, rule: r.rule, explanationVi: r.fix });
              });
            }
          });
        }

        if (errors.length === 0) {
          scoreBox.innerHTML = `
            <div class="glass-card-sm" style="padding:16px; background:#ecfdf5; border:1px solid #a7f3d0; border-radius:10px;">
              <strong style="color:#047857;">🎉 Tuyệt vời!</strong> Không phát hiện lỗi sai ngữ pháp hoặc chính tả đáng kể nào.
            </div>
          `;
        } else {
          scoreBox.innerHTML = `
            <div class="glass-card-sm animate-fade-in" style="padding:16px; background:#fffbeb; border:1px solid #fde68a; border-radius:10px;">
              <div style="font-weight:800; font-size:0.95rem; color:#92400e; margin-bottom:8px;">
                🔍 Phát hiện ${errors.length} lỗi ngữ pháp / văn phong cần lưu ý:
              </div>
              <div style="display:flex; flex-direction:column; gap:8px;">
                ${errors.map(err => `
                  <div style="padding:8px 12px; background:#ffffff; border-radius:6px; border:1px solid rgba(0,0,0,0.06); font-size:0.85rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <span style="color:#b91c1c; font-weight:700;">❌ "${err.bad}"</span>
                      ${err.better ? `<span style="color:#059669; font-weight:700;">➔ "${err.better}"</span>` : ''}
                    </div>
                    <div class="text-xs text-muted mt-xs">💡 ${err.explanationVi || err.rule}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }
      });
    });

    // View Sample modal
    el.querySelectorAll('.btn-view-sample').forEach(btn => {
      btn.addEventListener('click', () => {
        const sample = decodeURIComponent(btn.dataset.sample);
        const taskContainer = btn.closest('.glass-card');
        const userText = taskContainer.querySelector('.writing-area').value.trim();
        
        let modal = document.getElementById('sample-modal');
        if (!modal) {
          modal = document.createElement('div');
          modal.id = 'sample-modal';
          modal.className = 'modal-overlay';
          modal.innerHTML = `
            <div class="modal" style="max-width: 850px; width: 92%;">
              <div class="modal-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-glass); padding-bottom:12px; margin-bottom:16px;">
                <span class="modal-title" style="font-size:1.15rem; font-weight:800; color:var(--text-primary)">📝 So sánh & Tự đánh giá bài viết</span>
                <button class="btn btn-ghost btn-icon" id="sample-modal-close" style="border:none; background:none; font-size:1.2rem; cursor:pointer;">✕</button>
              </div>
              <div class="modal-body">
                <div class="grid-compare" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-bottom: 20px;">
                  <div>
                    <h4 class="font-bold mb-sm text-xs" style="color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em; margin-bottom: 8px;">📝 Bài làm của bạn:</h4>
                    <div id="sample-modal-user" class="glass-card-sm text-sm" style="min-height: 250px; max-height: 380px; overflow-y: auto; padding: 16px; white-space: pre-wrap; background: #f8fafc; border: 1px solid var(--border-glass); border-radius: var(--radius-md); font-family: inherit; line-height: 1.6; color:var(--text-primary)"></div>
                  </div>
                  <div>
                    <h4 class="font-bold mb-sm text-xs" style="color:var(--purple-light); text-transform:uppercase; letter-spacing:0.05em; margin-bottom: 8px;">✨ Bài viết mẫu tiêu chuẩn B2:</h4>
                    <div id="sample-modal-content" class="glass-card-sm text-sm" style="min-height: 250px; max-height: 380px; overflow-y: auto; padding: 16px; white-space: pre-wrap; background: rgba(99, 102, 241, 0.02); border: 1px solid rgba(99, 102, 241, 0.12); border-radius: var(--radius-md); font-family: inherit; line-height: 1.6; color:var(--text-primary)"></div>
                  </div>
                </div>
              </div>
            </div>
          `;
          document.body.appendChild(modal);
          modal.querySelector('#sample-modal-close').addEventListener('click', () => modal.classList.remove('show'));
          modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('show'); });
        }
        
        modal.querySelector('#sample-modal-user').textContent = userText || '(Bạn chưa viết câu trả lời nào vào ô soạn thảo)';
        modal.querySelector('#sample-modal-content').textContent = sample;
        modal.classList.add('show');
      });
    });
  });
}

// ==========================================
// AI VOCABULARY DEEP EXPLAINER MODAL
// ==========================================
export async function showVocabAIModal(term, vi = '') {
  let modal = document.getElementById('vocab-ai-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'vocab-ai-modal';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal animate-fade-in" style="max-width: 520px; width: 92%;">
      <div class="modal-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-glass); padding-bottom:12px; margin-bottom:14px;">
        <span class="modal-title" style="font-size:1.1rem; font-weight:800; color:var(--purple); display:flex; align-items:center; gap:6px;">
          ✨ Trợ Lý AI: Phân Tích Từ Vựng & Mẹo Nhớ
        </span>
        <button class="btn btn-ghost btn-icon" id="vocab-ai-modal-close" style="border:none; background:none; font-size:1.2rem; cursor:pointer;">✕</button>
      </div>
      <div class="modal-body" id="vocab-ai-modal-body">
        <div class="text-center" style="padding:24px;">
          <div class="spinner" style="margin:0 auto 8px; width:22px; height:22px; border-width:2px;"></div>
          <div class="text-xs text-muted">Gemini AI đang tạo mẹo nhớ & trích xuất collocation...</div>
        </div>
      </div>
    </div>
  `;
  modal.classList.add('show');
  modal.querySelector('#vocab-ai-modal-close').addEventListener('click', () => modal.classList.remove('show'));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('show'); });

  try {
    const data = await gemini.explainVocabulary(term, vi);
    if (!data) throw new Error('Không tạo được phân tích.');

    const bodyEl = modal.querySelector('#vocab-ai-modal-body');
    bodyEl.innerHTML = `
      <div class="mb-md">
        <div style="font-size:1.4rem; font-weight:800; color:var(--text-primary); display:flex; align-items:center; gap:8px;">
          ${data.term}
          <button class="btn btn-ghost btn-icon-sm" id="btn-modal-speak-term" style="font-size:1rem; cursor:pointer; background:none; border:none;">🔊</button>
        </div>
        <div class="text-xs text-muted" style="font-style:italic;">${data.phonetic || ''} · ${data.partOfSpeech || ''}</div>
        <div style="color:var(--teal-dark); font-weight:700; font-size:0.95rem; margin-top:2px;">${vi || ''}</div>
      </div>

      <!-- Mnemonic Card -->
      <div style="background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.25); border-radius:10px; padding:12px 14px; margin-bottom:12px;">
        <div style="font-weight:800; color:#b45309; font-size:0.85rem; margin-bottom:4px; display:flex; align-items:center; gap:6px;">
          💡 Mẹo nhớ siêu tốc (Mnemonic):
        </div>
        <div style="font-size:0.88rem; line-height:1.6; color:var(--text-primary);">
          ${data.mnemonicVi || 'Liên tưởng âm thanh và ngữ cảnh thực tế để nhớ từ.'}
        </div>
      </div>

      <!-- Collocations -->
      ${(data.collocations && data.collocations.length > 0) ? `
        <div style="margin-bottom:12px;">
          <div style="font-weight:700; font-size:0.82rem; color:var(--purple); margin-bottom:6px; text-transform:uppercase;">
            📚 Cụm từ (Collocations) thi VSTEP B2:
          </div>
          <div style="display:flex; flex-direction:column; gap:6px;">
            ${data.collocations.map(c => `
              <div style="background:#f8fafc; border:1px solid var(--border-glass); border-radius:6px; padding:6px 10px; font-size:0.82rem; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:700; color:var(--text-primary);">${c.phrase}</span>
                <span style="color:var(--text-secondary); font-size:0.78rem;">${c.meaningVi}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Example -->
      ${data.vstepExampleEn ? `
        <div style="background:rgba(99,102,241,0.04); border:1px solid rgba(99,102,241,0.15); border-radius:8px; padding:10px 14px; font-size:0.82rem; line-height:1.6; margin-bottom:10px;">
          <div style="font-weight:700; color:var(--purple); margin-bottom:2px;">📖 Ví dụ ngữ cảnh đề thi:</div>
          <div style="color:var(--text-primary); font-style:italic;">"${data.vstepExampleEn}"</div>
          ${data.vstepExampleVi ? `<div style="color:var(--text-secondary); margin-top:2px;">👉 ${data.vstepExampleVi}</div>` : ''}
        </div>
      ` : ''}

      ${data.wordFamily ? `
        <div class="text-xs text-muted" style="border-top:1px dashed var(--border-glass); padding-top:6px;">
          🏛️ <strong>Họ từ:</strong> ${data.wordFamily}
        </div>
      ` : ''}
    `;

    bodyEl.querySelector('#btn-modal-speak-term')?.addEventListener('click', () => speak(data.term));

  } catch (e) {
    const bodyEl = modal.querySelector('#vocab-ai-modal-body');
    bodyEl.innerHTML = `
      <div style="padding:14px; background:#fef2f2; border:1px solid #fecaca; border-radius:10px; font-size:0.85rem; color:#b91c1c;">
        ❌ Lỗi kết nối AI: ${e.message}
      </div>
    `;
  }
}
