/**
 * VSTEP Speaking Virtual Exam Simulator & AI Coach
 * Inspired by duonghh/VSTEP-Level4-B2 & vstep-llama / teacherai
 * Real-time Speech-to-Text, Audio Prompts, Exam Countdown Timer & B2 Rubric Evaluator
 */

import { VSTEP_SPEAKING } from '../data/vstep/speaking.js';
import { speak, showToast } from '../utils/helpers.js';
import { analyzeText } from './profiler.js';
import gemini from '../utils/gemini.js';

export function renderSpeakingSimulator(container) {
  let activePart = 'part2'; // Start with Part 2 (most requested for B2)
  let activeTopicIndex = 0;
  let timerInterval = null;
  let timerSeconds = 0;
  let timerMode = 'idle'; // 'idle', 'prep', 'speaking'
  let recognition = null;
  let isRecording = false;
  let shouldKeepRecording = false;
  let transcribedText = '';
  let mediaStream = null;
  let mediaRecorder = null;
  let audioChunks = [];
  let currentAudioUrl = null;

  // Initialize Speech Recognition if supported
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const isSpeechSupported = !!SpeechRecognition;

  function render() {
    container.innerHTML = `
      <div class="animate-fade-in">
        <!-- Sub-navigation for Speaking Parts -->
        <div class="tabs mb-lg" id="speaking-part-tabs">
          <button class="tab-btn ${activePart === 'part1' ? 'active' : ''}" data-part="part1">🗣️ Part 1: Social Interaction</button>
          <button class="tab-btn ${activePart === 'part2' ? 'active' : ''}" data-part="part2">💡 Part 2: Solution Discussion</button>
          <button class="tab-btn ${activePart === 'part3' ? 'active' : ''}" data-part="part3">🧠 Part 3: Topic Development</button>
        </div>

        <div id="speaking-part-content"></div>
      </div>
    `;

    container.querySelectorAll('[data-part]').forEach(btn => {
      btn.addEventListener('click', () => {
        stopTimer();
        stopRecording();
        activePart = btn.dataset.part;
        activeTopicIndex = 0;
        render();
      });
    });

    renderCurrentPart();
  }

  function renderCurrentPart() {
    const contentEl = container.querySelector('#speaking-part-content');
    if (activePart === 'part1') renderPart1(contentEl);
    else if (activePart === 'part2') renderPart2(contentEl);
    else if (activePart === 'part3') renderPart3(contentEl);
  }

  // ==========================================
  // PART 1: SOCIAL INTERACTION
  // ==========================================
  function renderPart1(el) {
    const topics = VSTEP_SPEAKING.part1;
    const current = topics[activeTopicIndex] || topics[0];

    el.innerHTML = `
      <div class="animate-fade-in">
        <!-- Topic Selector Bar -->
        <div class="flex items-center justify-between mb-lg flex-wrap gap-md">
          <div class="flex gap-sm flex-wrap">
            ${topics.map((t, idx) => `
              <button class="chip ${idx === activeTopicIndex ? 'active' : ''}" data-topic-idx="${idx}">
                ${t.topic}
              </button>
            `).join('')}
          </div>
          <span class="level-badge level-b2">VSTEP B2 Format</span>
        </div>

        <div class="glass-card mb-xl">
          <div class="flex items-center justify-between mb-md">
            <div>
              <h3 style="font-size:1.15rem; font-weight:800; color:var(--text-primary); margin:0">${current.topic}</h3>
              <p class="text-xs text-muted mt-xs">${current.topicVi} · 3 câu hỏi phỏng vấn trực tiếp</p>
            </div>
            <button class="btn btn-secondary btn-sm" id="btn-play-all-questions">🔊 Giám khảo đọc câu hỏi</button>
          </div>

          <!-- Questions List -->
          <div class="flex flex-col gap-lg mb-xl">
            ${current.questions.map((q, qi) => `
              <div class="glass-card-sm" style="padding:16px; border:1px solid rgba(0,0,0,0.06); background:#ffffff;">
                <div class="flex items-center justify-between mb-sm">
                  <span class="text-sm font-bold text-accent" style="color:var(--purple); font-weight:700;">Câu ${qi + 1}: ${q.q}</span>
                  <button class="btn btn-ghost btn-icon-sm btn-speak-q" data-text="${q.q.replace(/"/g, '&quot;')}" title="Nghe câu hỏi" style="font-size:1rem;">🔊</button>
                </div>
                <div class="text-xs text-muted mb-sm" style="padding: 6px 10px; background: rgba(99,102,241,0.04); border-left: 2px solid var(--purple); border-radius: 4px;">
                  💡 <strong>Chiến thuật:</strong> ${q.tip}
                </div>
                
                <details style="margin-top: 10px;">
                  <summary style="font-size:0.85rem; font-weight:600; color:var(--teal); cursor:pointer;">✨ Xem câu trả lời mẫu & Từ vựng B2</summary>
                  <div class="mt-sm" style="padding: 12px; background: #f8fafc; border-radius: 8px; font-size: 0.88rem; line-height: 1.6;">
                    <div style="font-style: italic; color:var(--text-primary); margin-bottom: 8px;">"${q.sample}"</div>
                    <div class="flex items-center justify-between mt-sm flex-wrap gap-xs">
                      <div class="flex gap-xs flex-wrap">
                        ${q.keywords.map(kw => `<span class="vocab-tag" style="font-size:0.7rem; background:#ecfdf5; color:#047857;">${kw}</span>`).join('')}
                      </div>
                      <button class="btn btn-ghost btn-sm btn-speak-sample" data-sample="${q.sample.replace(/"/g, '&quot;')}" style="font-size:0.75rem;">🔊 Luyện Shadowing</button>
                    </div>
                  </div>
                </details>
              </div>
            `).join('')}
          </div>

          <!-- Virtual Recording Studio -->
          ${renderSimulatorControls('Part 1 Mock Test (3 câu trả lời liên tục)')}
        </div>
      </div>
    `;

    bindTopicAndAudioEvents(el, topics);
    bindSimulatorEngine(el);
  }

  // ==========================================
  // PART 2: SOLUTION DISCUSSION
  // ==========================================
  function renderPart2(el) {
    const situations = VSTEP_SPEAKING.part2;
    const current = situations[activeTopicIndex] || situations[0];

    el.innerHTML = `
      <div class="animate-fade-in">
        <!-- Situation Selector Bar -->
        <div class="flex items-center justify-between mb-lg flex-wrap gap-md">
          <div class="flex gap-sm flex-wrap">
            ${situations.map((s, idx) => `
              <button class="chip ${idx === activeTopicIndex ? 'active' : ''}" data-topic-idx="${idx}">
                ${s.title}
              </button>
            `).join('')}
          </div>
          <span class="level-badge level-b2">VSTEP B2 Trọng tâm</span>
        </div>

        <div class="glass-card mb-xl">
          <div class="flex items-center justify-between mb-md flex-wrap gap-sm">
            <div>
              <h3 style="font-size:1.15rem; font-weight:800; color:var(--text-primary); margin:0">${current.title}</h3>
              <p class="text-xs text-muted mt-xs">${current.titleVi}</p>
            </div>
            <button class="btn btn-secondary btn-sm" id="btn-read-situation">🔊 Giám khảo đọc đề bài</button>
          </div>

          <!-- Situation Box -->
          <div style="padding:16px; background:rgba(79, 70, 229, 0.04); border-left:4px solid var(--purple); border-radius:0 10px 10px 0; margin-bottom:20px; line-height:1.6; font-size:0.95rem;">
            <strong>📋 Tình huống (Situation):</strong><br>
            ${current.situation}
          </div>

          <!-- 3 Options Cards -->
          <div class="grid gap-md mb-xl" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px;">
            ${current.options.map((opt, oi) => `
              <div class="glass-card-sm" style="padding:16px; border:1px solid ${opt.id === current.recommended ? 'var(--teal)' : 'var(--border-glass)'}; background:${opt.id === current.recommended ? 'rgba(13, 148, 136, 0.02)' : '#ffffff'};">
                <div class="flex items-center justify-between mb-xs">
                  <span class="font-bold text-sm" style="color:var(--text-primary)">Lựa chọn ${oi + 1}</span>
                  ${opt.id === current.recommended ? '<span class="chip chip-purple" style="font-size:0.65rem; font-weight:700">Khuyên chọn B2</span>' : ''}
                </div>
                <div style="font-weight:700; font-size:0.95rem; margin-bottom:8px; color:var(--purple-dark)">${opt.text}</div>
                <div class="text-xs text-secondary mb-xs">👍 <strong>Ưu điểm:</strong> ${opt.pros}</div>
                <div class="text-xs text-muted">👎 <strong>Nhược điểm:</strong> ${opt.cons}</div>
              </div>
            `).join('')}
          </div>

          <!-- Model B2 Solution Template & Breakdown -->
          <details class="mb-xl" style="background:#f8fafc; border:1px solid var(--border-glass); border-radius:10px; padding:12px 16px;">
            <summary style="font-size:0.9rem; font-weight:700; color:var(--purple); cursor:pointer;">
              🌟 Xem khung Template B2 & Bài nói mẫu hoàn chỉnh (Click để mở)
            </summary>
            <div class="mt-md" style="font-size:0.9rem; line-height:1.7; color:var(--text-primary);">
              <p><strong>1. Mở bài & Khẳng định lựa chọn:</strong><br>
                <em>"${current.template.opening}"</em>
              </p>
              <p><strong>2. Nêu 2 lý do ủng hộ lựa chọn:</strong><br>
                <em>"${current.template.reasons}"</em>
              </p>
              <p><strong>3. Phản biện & Bác bỏ 2 lựa chọn còn lại:</strong><br>
                <em>"${current.template.counter}"</em>
              </p>
              <p><strong>4. Kết luận ngắn:</strong><br>
                <em>"${current.template.conclusion}"</em>
              </p>
              <div class="mt-md">
                <button class="btn btn-secondary btn-sm" id="btn-play-part2-sample">🔊 Luyện nghe toàn bộ bài mẫu</button>
              </div>
            </div>
          </details>

          <!-- AI Speaking Brainstormer -->
          <div class="mb-lg">
            <button class="btn btn-secondary btn-sm" id="btn-ai-brainstorm-p2" style="font-weight:700; color:var(--purple); border-color:var(--purple); display:flex; align-items:center; gap:6px;">
              💡 AI Gợi ý nhanh ý tưởng (1 phút chuẩn bị)
            </button>
            <div id="ai-brainstorm-p2-box" class="hidden mt-xs"></div>
          </div>

          <!-- Virtual Recording Studio -->
          ${renderSimulatorControls('Part 2 Mock Test: 1 phút chuẩn bị · 2 phút nói')}
        </div>
      </div>
    `;

    bindTopicAndAudioEvents(el, situations);
    
    el.querySelector('#btn-read-situation')?.addEventListener('click', () => {
      speak(current.situation);
    });

    el.querySelector('#btn-play-part2-sample')?.addEventListener('click', () => {
      const full = `${current.template.opening} ${current.template.reasons} ${current.template.counter} ${current.template.conclusion}`;
      speak(full);
    });

    el.querySelector('#btn-ai-brainstorm-p2')?.addEventListener('click', () => {
      handleAIBrainstorm(
        el.querySelector('#btn-ai-brainstorm-p2'),
        el.querySelector('#ai-brainstorm-p2-box'),
        'Part 2: Solution Discussion',
        current.title,
        current.situation
      );
    });

    bindSimulatorEngine(el);
  }

  // ==========================================
  // PART 3: TOPIC DEVELOPMENT
  // ==========================================
  function renderPart3(el) {
    const topics = VSTEP_SPEAKING.part3;
    const current = topics[activeTopicIndex] || topics[0];

    el.innerHTML = `
      <div class="animate-fade-in">
        <!-- Topic Selector Bar -->
        <div class="flex items-center justify-between mb-lg flex-wrap gap-md">
          <div class="flex gap-sm flex-wrap">
            ${topics.map((t, idx) => `
              <button class="chip ${idx === activeTopicIndex ? 'active' : ''}" data-topic-idx="${idx}">
                ${t.topic}
              </button>
            `).join('')}
          </div>
          <span class="level-badge level-b2">VSTEP B2 Sơ đồ tư duy</span>
        </div>

        <div class="glass-card mb-xl">
          <div class="flex items-center justify-between mb-md flex-wrap gap-sm">
            <div>
              <h3 style="font-size:1.15rem; font-weight:800; color:var(--text-primary); margin:0">${current.topic}</h3>
              <p class="text-xs text-muted mt-xs">${current.topicVi}</p>
            </div>
            <button class="btn btn-secondary btn-sm" id="btn-read-topic-p3">🔊 Giám khảo đọc chủ đề</button>
          </div>

          <!-- Mind Map Visualizer -->
          <div class="mb-xl" style="padding:20px; background:linear-gradient(145deg, #f8fafc, #f1f5f9); border-radius:12px; border:1px solid var(--border-glass);">
            <div class="text-center mb-lg">
              <span style="display:inline-block; padding:10px 20px; background:var(--gradient-vstep); color:#fff; font-weight:800; border-radius:100px; font-size:0.95rem; box-shadow:var(--shadow-glow-purple);">
                🎯 ${current.centralIdea}
              </span>
            </div>

            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">
              ${current.branches.map((b, bi) => `
                <div style="padding:14px; background:#ffffff; border-radius:10px; border-top:3px solid var(--teal); box-shadow:0 2px 8px rgba(0,0,0,0.03);">
                  <div style="font-weight:700; font-size:0.9rem; color:var(--text-primary); margin-bottom:4px;">${bi + 1}. ${b.title}</div>
                  <div style="font-size:0.8rem; color:var(--text-secondary); line-height:1.5;">${b.detail}</div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Model B2 Speech Details -->
          <details class="mb-xl" style="background:#f8fafc; border:1px solid var(--border-glass); border-radius:10px; padding:12px 16px;">
            <summary style="font-size:0.9rem; font-weight:700; color:var(--purple); cursor:pointer;">
              🌟 Xem bài phát triển chủ đề mẫu chuẩn B2 (Click để mở)
            </summary>
            <div class="mt-md" style="font-size:0.9rem; line-height:1.7; color:var(--text-primary); white-space:pre-wrap;">${current.modelSpeech}</div>
            <div class="mt-md">
              <button class="btn btn-secondary btn-sm" id="btn-play-part3-sample">🔊 Luyện nghe toàn bộ bài mẫu</button>
            </div>
          </details>

          <!-- Follow-up Questions -->
          <div class="mb-lg" style="padding:16px; background:rgba(0, 212, 212, 0.04); border-radius:10px; border:1px solid rgba(0,212,212,0.15);">
            <h4 style="font-size:0.9rem; font-weight:700; color:var(--teal-dark); margin-top:0; margin-bottom:8px;">
              ❓ Câu hỏi mở rộng của Giám khảo (Follow-up Questions):
            </h4>
            <ul style="margin:0; padding-left:18px; font-size:0.88rem; color:var(--text-secondary); line-height:1.6;">
              ${current.followUpQuestions.map(fq => `<li>${fq}</li>`).join('')}
            </ul>
          </div>

          <!-- AI Speaking Brainstormer -->
          <div class="mb-lg">
            <button class="btn btn-secondary btn-sm" id="btn-ai-brainstorm-p3" style="font-weight:700; color:var(--purple); border-color:var(--purple); display:flex; align-items:center; gap:6px;">
              💡 AI Gợi ý nhanh ý tưởng phát triển chủ đề (1 phút chuẩn bị)
            </button>
            <div id="ai-brainstorm-p3-box" class="hidden mt-xs"></div>
          </div>

          <!-- Virtual Recording Studio -->
          ${renderSimulatorControls('Part 3 Mock Test: 1 phút chuẩn bị · 2 phút phát biểu')}
        </div>
      </div>
    `;

    bindTopicAndAudioEvents(el, topics);

    el.querySelector('#btn-read-topic-p3')?.addEventListener('click', () => {
      speak(current.centralIdea);
    });

    el.querySelector('#btn-play-part3-sample')?.addEventListener('click', () => {
      speak(current.modelSpeech);
    });

    el.querySelector('#btn-ai-brainstorm-p3')?.addEventListener('click', () => {
      handleAIBrainstorm(
        el.querySelector('#btn-ai-brainstorm-p3'),
        el.querySelector('#ai-brainstorm-p3-box'),
        'Part 3: Topic Development',
        current.topic,
        current.centralIdea + ': ' + (current.branches || []).map(b => b.title).join(', ')
      );
    });

    bindSimulatorEngine(el);
  }

  // Common UI template for simulator controls
  function renderSimulatorControls(sessionTitle) {
    return `
      <div class="virtual-speaking-studio" style="padding: 20px; background: #ffffff; border: 2px dashed rgba(99, 102, 241, 0.3); border-radius: 14px;">
        <div class="flex items-center justify-between mb-md flex-wrap gap-sm">
          <div>
            <h4 style="margin:0; font-size:1.05rem; font-weight:800; color:var(--purple-dark); display:flex; align-items:center; gap:8px;">
              🎙️ Phòng thi ảo & Đánh giá AI VSTEP
            </h4>
            <p class="text-xs text-muted mt-xs">${sessionTitle}</p>
          </div>
          
          <!-- Timer Display -->
          <div class="flex items-center gap-sm">
            <div id="sim-timer-badge" class="badge" style="font-family: monospace; font-size:1.2rem; font-weight:800; padding:6px 14px; background:#f1f5f9; color:var(--text-primary); border-radius:8px;">
              ⏱️ 00:00
            </div>
            <button class="btn btn-secondary btn-sm" id="btn-timer-prep">1' Chuẩn bị</button>
            <button class="btn btn-secondary btn-sm" id="btn-timer-speak">2' Trả lời</button>
          </div>
        </div>

        <!-- Recording & Action Bar -->
        <div class="flex items-center gap-md mb-sm flex-wrap">
          <button class="btn btn-primary" id="btn-start-record" style="padding:10px 22px; font-weight:700; border-radius:10px; display:inline-flex; align-items:center; gap:8px;">
            <span id="record-dot" style="width:10px; height:10px; border-radius:50%; background:#fff;"></span>
            <span id="record-btn-text">Bắt đầu Ghi âm & Trả lời</span>
          </button>
          <button class="btn btn-secondary" id="btn-stop-record" disabled>⏹️ Dừng & Đánh giá</button>
          <span class="text-xs text-muted" id="speech-support-hint" style="display:flex; align-items:center; gap:6px;">
            ${isSpeechSupported ? '✅ Đã kích hoạt Micro nhận diện giọng nói (en-US)' : 'ℹ️ Sẵn sàng thu âm giọng nói qua Micro'}
          </span>
        </div>

        <!-- In-Iframe/Safari Quick Helper Link -->
        <div class="text-xs text-muted mb-md" style="display:flex; align-items:center; gap:6px; flex-wrap:wrap; background:#f8fafc; padding:8px 12px; border-radius:8px; border:1px solid #f1f5f9;">
          <span>💡 Gặp sự cố Micro hoặc dùng iPhone/Safari?</span>
          <a href="/study/index.html#/vstep" target="_blank" style="color:var(--purple); font-weight:700; text-decoration:underline;">Mở tab riêng để cấp quyền Micro mượt mà ↗</a>
        </div>

        <!-- Audio Player Container for voice playback -->
        <div id="speaking-audio-player-container" class="hidden mb-md"></div>

        <!-- Transcript live display / text area -->
        <div class="mb-md">
          <label class="text-xs font-bold text-muted mb-xs" style="display:block">📝 Lời nói của bạn (Transcribed / Spoken text):</label>
          <textarea id="speaking-transcript-input" style="width:100%; min-height:120px; font-size:0.92rem; line-height:1.6; border-radius:8px; padding:12px; border:1px solid var(--border-glass); background:#fafafa; font-family:inherit;" placeholder="Lời bạn nói qua micro sẽ tự động hiển thị tại đây theo thời gian thực... Hoặc bạn có thể gõ trực tiếp câu trả lời để chấm điểm."></textarea>
        </div>

        <!-- Real-time Evaluation Results Container -->
        <div id="speaking-ai-feedback" class="hidden"></div>
      </div>
    `;
  }

  function bindTopicAndAudioEvents(el, list) {
    el.querySelectorAll('[data-topic-idx]').forEach(btn => {
      btn.addEventListener('click', () => {
        stopTimer();
        stopRecording();
        activeTopicIndex = parseInt(btn.dataset.topicIdx);
        renderCurrentPart();
      });
    });

    el.querySelectorAll('.btn-speak-q').forEach(btn => {
      btn.addEventListener('click', () => speak(btn.dataset.text));
    });

    el.querySelectorAll('.btn-speak-sample').forEach(btn => {
      btn.addEventListener('click', () => speak(btn.dataset.sample));
    });

    el.querySelector('#btn-play-all-questions')?.addEventListener('click', () => {
      const qTexts = list[activeTopicIndex]?.questions.map(q => q.q).join('. ') || '';
      speak(qTexts);
    });
  }

  function bindSimulatorEngine(el) {
    const timerBadge = el.querySelector('#sim-timer-badge');
    const btnPrep = el.querySelector('#btn-timer-prep');
    const btnSpeakTimer = el.querySelector('#btn-timer-speak');
    const btnStart = el.querySelector('#btn-start-record');
    const btnStop = el.querySelector('#btn-stop-record');
    const recordDot = el.querySelector('#record-dot');
    const recordBtnText = el.querySelector('#record-btn-text');
    const transcriptInput = el.querySelector('#speaking-transcript-input');
    const feedbackBox = el.querySelector('#speaking-ai-feedback');
    const audioContainer = el.querySelector('#speaking-audio-player-container');

    function updateTimerDisplay() {
      const mins = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
      const secs = (timerSeconds % 60).toString().padStart(2, '0');
      timerBadge.textContent = `⏱️ ${mins}:${secs}`;
    }

    function startTimer(seconds, modeName, color) {
      stopTimer();
      timerSeconds = seconds;
      timerMode = modeName;
      timerBadge.style.color = color;
      updateTimerDisplay();

      timerInterval = setInterval(() => {
        timerSeconds--;
        updateTimerDisplay();
        if (timerSeconds <= 0) {
          stopTimer();
          stopRecording();
          speak(`Time is up for ${modeName}`);
        }
      }, 1000);
    }

    btnPrep?.addEventListener('click', () => {
      speak('One minute preparation begins now.');
      startTimer(60, 'Preparation', 'var(--teal)');
    });

    btnSpeakTimer?.addEventListener('click', () => {
      speak('Two minutes response begins now.');
      startTimer(120, 'Speaking', 'var(--purple)');
    });

    function renderAudioPlayer(url) {
      if (!audioContainer) return;
      audioContainer.classList.remove('hidden');
      audioContainer.innerHTML = `
        <div class="glass-card-sm flex items-center justify-between flex-wrap gap-sm" style="padding:10px 16px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px;">
          <div class="flex items-center gap-xs">
            <span style="font-size:1.15rem;">🎧</span>
            <div>
              <div style="font-size:0.83rem; font-weight:700; color:var(--text-primary);">Bản ghi âm giọng nói vừa xong của bạn:</div>
              <div class="text-xs text-muted">Nghe lại để kiểm tra ngữ điệu, trọng âm và độ trôi chảy</div>
            </div>
          </div>
          <audio controls src="${url}" style="height:36px; max-width:100%; border-radius:18px; outline:none;"></audio>
        </div>
      `;
    }

    btnStart?.addEventListener('click', async () => {
      if (isRecording) {
        stopRecording();
        return;
      }

      isRecording = true;
      shouldKeepRecording = true;
      audioChunks = [];
      const currentVal = transcriptInput.value ? transcriptInput.value.trim() : '';
      transcribedText = currentVal ? currentVal + ' ' : '';

      btnStart.classList.remove('btn-primary');
      btnStart.classList.add('btn-danger');
      recordDot.style.background = '#ef4444';
      recordBtnText.textContent = 'Đang thu âm... (Bấm để dừng)';
      btnStop.disabled = false;

      // 1. Request microphone permission explicitly via getUserMedia
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          
          if (typeof MediaRecorder !== 'undefined') {
            try {
              mediaRecorder = new MediaRecorder(mediaStream);
              mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) audioChunks.push(e.data);
              };
              mediaRecorder.onstop = () => {
                if (audioChunks.length > 0) {
                  const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
                  if (currentAudioUrl) URL.revokeObjectURL(currentAudioUrl);
                  currentAudioUrl = URL.createObjectURL(blob);
                  renderAudioPlayer(currentAudioUrl);
                }
              };
              mediaRecorder.start(250);
            } catch (mrErr) {
              console.warn('MediaRecorder error:', mrErr);
            }
          }
        }
      } catch (streamErr) {
        console.warn('getUserMedia permission error:', streamErr);
        if (streamErr.name === 'NotAllowedError' || streamErr.name === 'PermissionDeniedError') {
          showToast('Vui lòng cấp quyền Micro trên trình duyệt để ghi âm.', 'warning');
          stopRecording();
          return;
        }
      }

      // 2. Setup and run SpeechRecognition
      if (isSpeechSupported) {
        try {
          if (recognition) {
            try { recognition.abort(); } catch (_) {}
          }
          recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';
          recognition.maxAlternatives = 1;

          recognition.onresult = (event) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                transcribedText += ' ' + event.results[i][0].transcript;
              } else {
                interim += event.results[i][0].transcript;
              }
            }
            transcriptInput.value = (transcribedText + ' ' + interim).trim();
          };

          recognition.onerror = (event) => {
            console.warn('SpeechRecognition error:', event.error);
            // Do NOT abort on silence (no-speech) or aborted
            if (event.error === 'no-speech' || event.error === 'aborted') {
              return;
            }
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
              showToast('Trình duyệt chưa cấp quyền Micro cho Web Speech. Bạn có thể mở tab mới ↗', 'warning');
              stopRecording();
            }
          };

          recognition.onend = () => {
            // Auto-resume if user is still recording
            if (shouldKeepRecording) {
              try { recognition.start(); } catch (_) {}
            }
          };

          recognition.start();
        } catch (recErr) {
          console.warn('SpeechRecognition start error:', recErr);
        }
      }

      startTimer(120, 'Speaking', '#ef4444');
    });

    btnStop?.addEventListener('click', () => {
      stopRecording();
      stopTimer();
      evaluateSpokenSpeech(transcriptInput.value.trim(), feedbackBox);
    });
  }

  async function evaluateSpokenSpeech(text, container) {
    if (!text || text.split(/\s+/).filter(Boolean).length < 15) {
      container.classList.remove('hidden');
      container.innerHTML = `
        <div class="glass-card-sm" style="padding:16px; background:#fef2f2; border:1px solid #fecaca; border-radius:10px;">
          <strong style="color:#b91c1c;">⚠️ Chưa đủ độ dài để AI chấm điểm:</strong>
          <p class="text-xs text-secondary mt-xs" style="line-height:1.6;">
            AI cần ít nhất 15-20 từ tiếng Anh để đánh giá các tiêu chí VSTEP (Fluency, Grammar, Lexical, Band B2/C1).<br/>
            ${currentAudioUrl ? '👉 Bạn đã thu âm thành công ở khung trên! Bạn có thể nghe lại và gõ bổ sung câu trả lời vào ô văn bản ở trên rồi bấm <strong>⏹️ Dừng & Đánh giá</strong>.' : '👉 Hãy bấm <strong>Bắt đầu Ghi âm & Trả lời</strong> và nói vào Micro, hoặc gõ trực tiếp câu trả lời vào khung.'}
          </p>
        </div>
      `;
      return;
    }

    container.classList.remove('hidden');
    container.innerHTML = `
      <div class="glass-card-sm text-center" style="padding:20px;">
        <div class="spinner" style="margin:0 auto 8px; width:22px; height:22px; border-width:2px;"></div>
        <div class="text-xs text-muted">Đang phân tích lời nói và chấm điểm Speaking...</div>
      </div>
    `;

    // Attempt Gemini AI Speaking Evaluation
    if (gemini.hasApiKey()) {
      try {
        const aiSp = await gemini.evaluateSpeaking(activePart, text);
        if (aiSp) {
          container.innerHTML = `
            <div class="glass-card-sm animate-fade-in mt-md" style="padding:20px; background:rgba(99,102,241,0.03); border:1px solid rgba(99,102,241,0.25); border-radius:12px;">
              <div class="flex items-center justify-between mb-sm flex-wrap gap-xs">
                <span style="font-weight:900; font-size:1.1rem; color:var(--purple); display:flex; align-items:center; gap:6px;">
                  🤖 Đánh giá VSTEP Speaking AI Examiner (Gemini)
                </span>
                <span class="level-badge level-${aiSp.cefr?.toLowerCase() || 'b2'}" style="font-size:0.95rem; padding:4px 14px; font-weight:800;">
                  Band: ${aiSp.predictedBand} (${aiSp.cefr || 'B2'})
                </span>
              </div>

              <div style="font-size:0.88rem; line-height:1.6; color:var(--text-secondary); margin-bottom:12px;">
                <div style="margin-bottom:6px;">🗣️ <strong>Độ trôi chảy (Fluency):</strong> ${aiSp.fluencyFeedback}</div>
                <div style="margin-bottom:6px;">📚 <strong>Vốn từ vựng (Lexical):</strong> ${aiSp.lexicalFeedback}</div>
                <div style="margin-bottom:6px;">✍️ <strong>Độ chính xác ngữ pháp (Grammar):</strong> ${aiSp.grammarFeedback}</div>
              </div>

              ${aiSp.upgradedModel ? `
                <div style="padding:12px; background:#ffffff; border:1px solid var(--border-glass); border-radius:8px;">
                  <div class="text-xs font-bold text-accent mb-xs" style="color:var(--purple);">✨ Gợi ý câu trả lời tự nhiên của người bản ngữ / C1:</div>
                  <div class="text-sm" style="font-style:italic; line-height:1.6; color:var(--text-primary);">"${aiSp.upgradedModel}"</div>
                  <button class="btn btn-ghost btn-sm mt-xs btn-speak-upgraded" style="font-size:0.75rem;">🔊 Luyện nghe câu nâng cấp</button>
                </div>
              ` : ''}
            </div>
          `;

          container.querySelector('.btn-speak-upgraded')?.addEventListener('click', () => {
            speak(aiSp.upgradedModel);
          });
          return;
        }
      } catch (err) {
        console.warn('Gemini speaking eval error:', err);
      }
    }

    // Fallback: Local Heuristic
    const res = analyzeText(text);
    container.innerHTML = `
      <div class="glass-card-sm animate-fade-in mt-md" style="padding:20px; background:rgba(99,102,241,0.03); border:1px solid rgba(99,102,241,0.2); border-radius:12px;">
        <div class="flex items-center justify-between mb-md flex-wrap gap-sm">
          <div>
            <h4 style="margin:0; font-size:1.1rem; font-weight:800; color:var(--purple);">
              🎯 Đánh giá VSTEP Speaking B2 (AI Examiner)
            </h4>
            <div class="text-xs text-muted mt-xs">Dựa trên 4 tiêu chí chuẩn VSTEP: Fluency, Lexical Resource, Grammar, Pronunciation</div>
          </div>
          <div class="level-badge level-${res.targetBand.toLowerCase()}" style="font-size:1rem; padding:6px 14px;">
            Band ước tính: ${res.bandScore} (${res.targetBand})
          </div>
        </div>

        <div class="stats-grid mb-md" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px;">
          <div class="stat-card" style="padding:12px;">
            <div class="stat-value" style="font-size:1.3rem;">${res.totalWords}</div>
            <div class="stat-label">Tổng số từ</div>
          </div>
          <div class="stat-card" style="padding:12px;">
            <div class="stat-value" style="font-size:1.3rem; color:var(--teal);">${res.b2PlusPercent}%</div>
            <div class="stat-label">Từ vựng B2+</div>
          </div>
          <div class="stat-card" style="padding:12px;">
            <div class="stat-value" style="font-size:1.3rem; color:var(--purple);">${res.detectedTransitions.length}</div>
            <div class="stat-label">Từ liên kết</div>
          </div>
        </div>

        <div style="font-size:0.88rem; line-height:1.6; color:var(--text-secondary);">
          <div style="margin-bottom:8px;"><strong>💡 Nhận xét chi tiết:</strong></div>
          <ul style="margin:0; padding-left:18px;">
            ${res.feedback.map(f => `<li style="margin-bottom:4px;">${f}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
  }

  async function handleAIBrainstorm(btnEl, boxEl, partTitle, topic, promptText) {
    if (!btnEl || !boxEl) return;
    boxEl.classList.remove('hidden');
    boxEl.innerHTML = `
      <div class="glass-card-sm text-center" style="padding:14px; background:#f8fafc;">
        <div class="spinner" style="margin:0 auto 6px; width:18px; height:18px; border-width:2px;"></div>
        <div class="text-xs text-muted">Gemini AI đang chuẩn bị dàn ý và từ vựng B2...</div>
      </div>
    `;

    try {
      const res = await gemini.brainstormSpeakingIdeas(partTitle, topic, promptText);
      if (!res) throw new Error('Không tạo được gợi ý.');

      boxEl.innerHTML = `
        <div class="glass-card-sm animate-fade-in" style="padding:16px; background:#f5f3ff; border:1px solid #ddd6fe; border-radius:10px; font-size:0.85rem; line-height:1.6;">
          <div style="font-weight:800; color:var(--purple-dark); margin-bottom:6px;">
            🌟 Mở bài gợi ý: <span style="font-style:italic; font-weight:normal; color:var(--text-primary);">"${res.openingSentence}"</span>
          </div>

          <div style="margin-bottom:8px;">
            <div style="font-weight:700; color:var(--purple); margin-bottom:4px;">🎯 2 Luận điểm then chốt (A-R-E):</div>
            ${(res.keyIdeas || []).map(k => `
              <div style="background:#ffffff; border:1px solid #ede9fe; border-radius:6px; padding:8px 12px; margin-bottom:6px;">
                <strong style="color:var(--text-primary);">${k.pointVi} (${k.pointEn}):</strong>
                <div style="color:var(--text-secondary); font-size:0.82rem; margin-top:2px;">${k.elaborationEn}</div>
                ${(k.b2Phrases && k.b2Phrases.length > 0) ? `
                  <div class="mt-xs text-xs" style="color:var(--teal-dark);">
                    🔑 Cụm từ B2: ${k.b2Phrases.map(p => `<code>${p}</code>`).join(', ')}
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>

          ${res.connectorTips ? `
            <div class="text-xs text-muted" style="border-top:1px dashed #ddd6fe; padding-top:6px;">
              🔗 <strong>Từ nối chuyển ý:</strong> ${res.connectorTips}
            </div>
          ` : ''}
        </div>
      `;
    } catch (e) {
      boxEl.innerHTML = `
        <div style="padding:10px; background:#fef2f2; border:1px solid #fecaca; border-radius:8px; font-size:0.8rem; color:#b91c1c;">
          ❌ Lỗi AI: ${e.message}
        </div>
      `;
    }
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function stopRecording() {
    shouldKeepRecording = false;
    isRecording = false;

    if (recognition) {
      try { recognition.stop(); } catch (_) {}
    }
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      try { mediaRecorder.stop(); } catch (_) {}
    }
    if (mediaStream) {
      try {
        mediaStream.getTracks().forEach(t => t.stop());
      } catch (_) {}
      mediaStream = null;
    }

    const btnStart = container.querySelector('#btn-start-record');
    const recordDot = container.querySelector('#record-dot');
    const recordBtnText = container.querySelector('#record-btn-text');
    const btnStop = container.querySelector('#btn-stop-record');

    if (btnStart) {
      btnStart.classList.remove('btn-danger');
      btnStart.classList.add('btn-primary');
    }
    if (recordDot) recordDot.style.background = '#fff';
    if (recordBtnText) recordBtnText.textContent = 'Bắt đầu Ghi âm & Trả lời';
    if (btnStop) btnStop.disabled = true;
  }

  render();
}

export default { renderSpeakingSimulator };
