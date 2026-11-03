import quizEngine from '../utils/quizEngine.js';
import { formatTime, showToast, confetti } from '../utils/helpers.js';

export function renderQuizSession(container, questions, options = {}) {
  const { title = 'Quiz', moduleId = 'general', timeLimit = 0 } = options;
  if (!questions || questions.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><h3>Không có câu hỏi</h3></div>';
    return;
  }
  quizEngine.loadQuiz(questions, { shuffle: true, limit: options.limit || 0, timeLimit, module: moduleId });
  quizEngine.onComplete = (result) => showQuizResult(container, result, questions, options);
  if (timeLimit > 0) {
    quizEngine.timeRemaining = timeLimit;
    quizEngine.onTimeUpdate = (t) => {
      const el = container.querySelector('#quiz-timer');
      if (el) {
        el.textContent = `⏱ ${formatTime(t)}`;
        el.classList.toggle('urgent', t <= 30);
      }
    };
    quizEngine.startTimer();
  }
  renderQuestion(container, options);
}

function renderQuestion(container, options) {
  const q = quizEngine.getCurrentQuestion();
  const progress = quizEngine.getProgress();
  if (!q) return;

  const letters = ['A', 'B', 'C', 'D', 'E'];
  const pct = progress.percent;

  let questionBody = '';
  if (q.passage) questionBody += `<div class="quiz-passage">${q.passage}</div>`;

  if (q.type === 'multiple-choice' || q.type === 'fill-blank') {
    questionBody += `
      <div class="quiz-question-text">
        ${q.question || q.sentence || ''}
        ${q.questionVi ? `<div class="text-sm text-muted mt-sm" style="font-style:italic">(${q.questionVi})</div>` : ''}
      </div>
      <div class="quiz-options" id="options-container">
        ${q.options.map((opt, i) => `
          <div class="quiz-option" data-index="${i}" role="button">
            <span class="option-letter">${letters[i]}</span>
            <span>${opt}</span>
          </div>
        `).join('')}
      </div>
    `;
  } else if (q.type === 'true-false') {
    questionBody += `
      <div class="quiz-question-text">
        ${q.question || ''}
        ${q.questionVi ? `<div class="text-sm text-muted mt-sm" style="font-style:italic">(${q.questionVi})</div>` : ''}
      </div>
      <div class="quiz-options" id="options-container">
        <div class="quiz-option" data-index="0" role="button"><span class="option-letter">T</span><span>True ✓</span></div>
        <div class="quiz-option" data-index="1" role="button"><span class="option-letter">F</span><span>False ✗</span></div>
      </div>
    `;
    // Map true/false to index
    if (typeof q.answer === 'boolean') q.answer = q.answer ? 0 : 1;
  } else if (q.type === 'writing-prompt') {
    questionBody += `
      <div class="writing-prompt-box">
        <div class="writing-prompt-title">✍️ Writing Task</div>
        <div class="writing-task">${q.prompt || ''}</div>
      </div>
      <textarea class="writing-area" id="writing-answer" placeholder="Viết câu trả lời của bạn ở đây..." rows="8"></textarea>
      <div class="word-count" id="word-count">0 từ</div>
      <div class="mt-md">
        <button class="btn btn-primary" id="btn-show-sample">👁 Xem bài mẫu</button>
        <button class="btn btn-secondary" id="btn-next-writing">Tiếp theo →</button>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="page-view animate-fade-in">
      <div class="quiz-header">
        <div class="quiz-timer ${options.timeLimit > 0 ? '' : 'hidden'}" id="quiz-timer">
          ⏱ ${formatTime(quizEngine.timeRemaining)}
        </div>
        <span class="text-sm text-muted">${progress.current} / ${progress.total}</span>
        <button class="btn btn-danger btn-sm" id="btn-quit-quiz">✕ Kết thúc</button>
      </div>

      <div class="fc-progress-bar mb-xl">
        <div class="fc-progress-fill" style="width:${pct}%"></div>
      </div>

      <div class="quiz-question-card">
        <span class="quiz-question-type">${q.skill || q.type || 'Question'}</span>
        ${q.difficulty ? `<span class="level-badge level-${q.difficulty.toLowerCase()}" style="margin-left:8px">${q.difficulty}</span>` : ''}
        ${questionBody}
        <div id="explanation-area"></div>
      </div>

      <div class="flex gap-sm" id="nav-area">
        <button class="btn btn-secondary hidden" id="btn-prev-q">← Trước</button>
        <button class="btn btn-primary hidden" id="btn-next-q" style="margin-left:auto">Tiếp theo →</button>
        <button class="btn btn-primary hidden" id="btn-submit-quiz">Nộp bài</button>
      </div>
    </div>
  `;

  // Attach option clicks
  const optionEls = container.querySelectorAll('.quiz-option');
  const explanationArea = container.querySelector('#explanation-area');
  const nextBtn = container.querySelector('#btn-next-q');
  const submitBtn = container.querySelector('#btn-submit-quiz');

  optionEls.forEach(opt => {
    opt.addEventListener('click', () => {
      const idx = parseInt(opt.dataset.index);
      const answered = quizEngine.answerCurrent(idx);
      if (!answered) return;
      const correct = quizEngine.isCurrentCorrect();
      optionEls.forEach(o => {
        const i = parseInt(o.dataset.index);
        o.classList.add('disabled');
        if (i === quizEngine.getCurrentQuestion().answer) o.classList.add('correct');
        else if (i === idx && !correct) o.classList.add('incorrect');
      });
      if (quizEngine.getCurrentQuestion().explanation) {
        explanationArea.innerHTML = `<div class="quiz-explanation"><strong>💡 Giải thích:</strong> ${quizEngine.getCurrentQuestion().explanation}</div>`;
      }
      if (progress.current < progress.total) nextBtn.classList.remove('hidden');
      else submitBtn.classList.remove('hidden');
    });
  });

  nextBtn?.addEventListener('click', () => {
    quizEngine.next();
    renderQuestion(container, options);
  });

  submitBtn?.addEventListener('click', () => quizEngine.submit());
  container.querySelector('#btn-quit-quiz')?.addEventListener('click', () => quizEngine.submit());

  // Writing prompt events
  const writingArea = container.querySelector('#writing-answer');
  const wordCount = container.querySelector('#word-count');
  if (writingArea) {
    writingArea.addEventListener('input', () => {
      const words = writingArea.value.trim().split(/\s+/).filter(Boolean).length;
      wordCount.textContent = `${words} từ`;
    });
    container.querySelector('#btn-next-writing')?.addEventListener('click', () => {
      quizEngine.answerCurrent(0); // mark as answered
      if (quizEngine.next()) renderQuestion(container, options);
      else quizEngine.submit();
    });
    container.querySelector('#btn-show-sample')?.addEventListener('click', () => {
      const q = quizEngine.getCurrentQuestion();
      if (q.sampleAnswer) {
        showSampleModal(q.sampleAnswer);
      }
    });
  }
}

function showSampleModal(sampleAnswer) {
  let modal = document.getElementById('sample-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'sample-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">📝 Bài mẫu</span>
          <button class="btn btn-ghost btn-icon" id="close-sample-modal">✕</button>
        </div>
        <div id="sample-modal-content" style="white-space:pre-wrap;font-size:0.9rem;line-height:1.8;color:var(--text-secondary)"></div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('#close-sample-modal').addEventListener('click', () => modal.classList.remove('show'));
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('show'); });
  }
  modal.querySelector('#sample-modal-content').textContent = sampleAnswer;
  modal.classList.add('show');
}

function showQuizResult(container, result, questions, options) {
  quizEngine.stopTimer();
  const pct = result.percentage;
  if (pct >= 80) confetti();
  const grade = pct >= 80 ? 'excellent' : pct >= 60 ? 'good-score' : pct >= 40 ? 'average' : 'poor';
  const msg = pct >= 80 ? '🎉 Xuất sắc!' : pct >= 60 ? '👍 Tốt lắm!' : pct >= 40 ? '💪 Cố lên!' : '📚 Ôn lại nhé!';

  container.innerHTML = `
    <div class="page-view animate-fade-in">
      <div class="quiz-results glass-card mb-xl">
        <div class="results-score ${grade}">${pct}%</div>
        <div class="results-message">${msg}</div>
        <div class="results-detail">
          ✅ ${result.score}/${result.total} câu đúng
        </div>
        <div class="flex gap-sm" style="justify-content:center">
          <button class="btn btn-primary btn-lg" id="btn-retake">🔄 Làm lại</button>
        </div>
      </div>

      <!-- Review Answers -->
      <h3 class="font-bold mb-md" style="font-size:1rem">📋 Xem lại đáp án</h3>
      <div class="quiz-question-card">
        ${result.results.filter(r => r.question.type !== 'writing-prompt' && r.question.type !== 'matching').map((r, i) => `
          <div style="padding:12px 0;border-bottom:1px solid var(--border-glass)">
            <div class="text-sm font-medium mb-sm">${i+1}. ${r.question.question || r.question.sentence || ''}</div>
            <div class="text-sm">
              ${r.correct
                ? `<span style="color:#86efac">✅ ${r.question.options?.[r.question.answer] || 'Correct'}</span>`
                : `<span style="color:#fca5a5">❌ Bạn chọn: ${r.userAnswer !== null ? (r.question.options?.[r.userAnswer] || r.userAnswer) : 'Bỏ qua'}</span>
                   <span style="color:#86efac;display:block">✅ Đúng: ${r.question.options?.[r.question.answer] || r.question.answer}</span>`
              }
            </div>
            ${r.question.explanation ? `<div class="text-xs text-muted mt-sm">${r.question.explanation}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;

  container.querySelector('#btn-retake').addEventListener('click', () =>
    renderQuizSession(container, questions, options)
  );
}
