/**
 * VSTEP AI Listening Studio & Multi-Voice Audio Exam Simulator
 * Powered by Google Gemini AI Test Generator + Web Speech API TTS Engine
 * Supports: Part 1 (Announcements), Part 2 (Dual-Speaker Dialogues), Part 3 (Lectures)
 */

import { VSTEP_LISTENING } from '../data/vstep/listening.js';
import gemini from '../utils/gemini.js';
import { showToast, confetti } from '../utils/helpers.js';

export function renderListeningStudio(container) {
  let activePart = 'part2'; // 'part1', 'part2', 'part3'
  let activeTestIdx = 0;
  let customTests = { part1: [], part2: [], part3: [] };
  let playbackSpeed = 1.0;
  let isPlaying = false;
  let synthUtterance = null;
  let currentSpeakerIndex = 0;
  let dialogueTimer = null;

  // Cached browser voices
  let availableVoices = [];
  function loadVoices() {
    if ('speechSynthesis' in window) {
      availableVoices = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
    }
  }
  loadVoices();
  if ('speechSynthesis' in window && window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }

  function getAvailableTests(part) {
    const defaultList = VSTEP_LISTENING[part] || [];
    const generatedList = customTests[part] || [];
    return [...defaultList, ...generatedList];
  }

  function stopAudio() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    isPlaying = false;
    clearTimeout(dialogueTimer);
    updateAudioUI();
  }

  function updateAudioUI() {
    const btnPlay = container.querySelector('#btn-toggle-audio');
    const waveEl = container.querySelector('#audio-wave-anim');
    if (!btnPlay) return;

    if (isPlaying) {
      btnPlay.innerHTML = '⏸️ Tạm dừng phát';
      btnPlay.classList.add('btn-primary');
      btnPlay.classList.remove('btn-secondary');
      if (waveEl) waveEl.style.opacity = '1';
    } else {
      btnPlay.innerHTML = '▶️ Bắt đầu nghe bài thi';
      btnPlay.classList.remove('btn-primary');
      btnPlay.classList.add('btn-secondary');
      if (waveEl) waveEl.style.opacity = '0.3';
    }
  }

  function playCurrentTest(test) {
    if (!('speechSynthesis' in window)) {
      showToast('Trình duyệt của bạn không hỗ trợ phát âm thanh Web Speech API.', 'warning');
      return;
    }

    window.speechSynthesis.cancel();
    isPlaying = true;
    updateAudioUI();

    // Find male & female voices if available
    const maleVoice = availableVoices.find(v => /male|david|george|james|alex/i.test(v.name)) || availableVoices[0] || null;
    const femaleVoice = availableVoices.find(v => /female|zira|samantha|victoria|karen/i.test(v.name)) || availableVoices[1] || availableVoices[0] || null;

    if (test.dialogue && test.dialogue.length > 0) {
      // Multi-voice dialogue turn-by-turn playback
      currentSpeakerIndex = 0;

      function playNextTurn() {
        if (!isPlaying || currentSpeakerIndex >= test.dialogue.length) {
          isPlaying = false;
          updateAudioUI();
          showToast('Đã phát xong toàn bộ đoạn hội thoại.', 'info');
          return;
        }

        const turn = test.dialogue[currentSpeakerIndex];
        const utt = new SpeechSynthesisUtterance(turn.text);
        utt.rate = playbackSpeed;
        utt.lang = 'en-US';

        const isMale = /male/i.test(turn.speaker) || currentSpeakerIndex % 2 === 0;
        if (isMale) {
          if (maleVoice) utt.voice = maleVoice;
          utt.pitch = 0.95;
        } else {
          if (femaleVoice) utt.voice = femaleVoice;
          utt.pitch = 1.15;
        }

        highlightDialogueTurn(currentSpeakerIndex);

        utt.onend = () => {
          currentSpeakerIndex++;
          dialogueTimer = setTimeout(playNextTurn, 600); // 600ms natural conversational pause
        };

        utt.onerror = () => {
          isPlaying = false;
          updateAudioUI();
        };

        window.speechSynthesis.speak(utt);
      }

      playNextTurn();

    } else {
      // Single speaker monologue (Part 1 or Part 3)
      const scriptText = test.audioScript || '';
      synthUtterance = new SpeechSynthesisUtterance(scriptText);
      synthUtterance.rate = playbackSpeed;
      synthUtterance.lang = 'en-US';
      if (femaleVoice) synthUtterance.voice = femaleVoice;

      synthUtterance.onend = () => {
        isPlaying = false;
        updateAudioUI();
        showToast('Đã phát xong bài nghe.', 'info');
      };

      synthUtterance.onerror = () => {
        isPlaying = false;
        updateAudioUI();
      };

      window.speechSynthesis.speak(synthUtterance);
    }
  }

  function highlightDialogueTurn(idx) {
    container.querySelectorAll('.dialogue-turn').forEach((el, i) => {
      if (i === idx) {
        el.style.borderLeft = '4px solid var(--purple)';
        el.style.background = 'rgba(99,102,241,0.06)';
      } else {
        el.style.borderLeft = '4px solid transparent';
        el.style.background = '#ffffff';
      }
    });
  }

  function render() {
    const tests = getAvailableTests(activePart);
    if (activeTestIdx >= tests.length) activeTestIdx = 0;
    const currentTest = tests[activeTestIdx] || tests[0];

    container.innerHTML = `
      <div class="page-view animate-fade-in" style="max-width: 980px; margin: 0 auto;">
        
        <!-- Header -->
        <div class="page-header" style="margin-bottom: 20px;">
          <div class="flex items-center justify-between flex-wrap gap-md">
            <div>
              <h2 class="page-title" style="display:flex; align-items:center; gap:8px;">
                🎧 VSTEP AI Listening Studio
                <span class="chip chip-purple" style="font-size:0.75rem; font-weight:700">Multi-Voice TTS</span>
              </h2>
              <p class="page-subtitle">Hệ thống luyện nghe mô phỏng chuẩn format VSTEP B2 & Tạo đề nghe tự động vô hạn bằng Gemini AI</p>
            </div>
            
            <button class="btn btn-primary" id="btn-open-ai-generator" style="box-shadow:var(--shadow-glow-purple); font-weight:800; border-radius:10px;">
              ✨ AI Tạo Đề Nghe Mới
            </button>
          </div>
        </div>

        <!-- Part Sub-Tabs -->
        <div class="tabs mb-md" id="listening-part-tabs" style="display:flex; flex-wrap:wrap; gap:6px;">
          <button class="tab-btn ${activePart === 'part1' ? 'active' : ''}" data-part="part1">
            📢 Part 1: Thông báo & Chỉ dẫn ngắn
          </button>
          <button class="tab-btn ${activePart === 'part2' ? 'active' : ''}" data-part="part2">
            👥 Part 2: Hội thoại 2 người (Đối thoại)
          </button>
          <button class="tab-btn ${activePart === 'part3' ? 'active' : ''}" data-part="part3">
            🎓 Part 3: Bài giảng học thuật (Lecture)
          </button>
        </div>

        <!-- Test Selector Carousel / Chips -->
        <div class="flex items-center justify-between mb-lg flex-wrap gap-sm">
          <div class="flex items-center gap-xs flex-wrap">
            <span class="text-xs text-muted" style="font-weight:700">Đề bài:</span>
            ${tests.map((t, idx) => `
              <button class="chip ${idx === activeTestIdx ? 'active' : ''}" data-test-idx="${idx}" style="font-size:0.8rem;">
                ${t.isAiGenerated ? '✨ AI: ' : ''}Bài ${idx + 1}: ${t.title.slice(0, 24)}...
              </button>
            `).join('')}
          </div>
          <span class="level-badge level-${(currentTest.level || 'b2').toLowerCase()}" style="font-size:0.85rem;">
            ${currentTest.level || 'B2'} · ${currentTest.duration || '2m'}
          </span>
        </div>

        <!-- Main Listening Exam Card -->
        <div class="glass-card mb-xl" style="padding:24px; border:1px solid var(--border-glass);">
          
          <div class="flex items-center justify-between mb-md flex-wrap gap-sm">
            <div>
              <h3 style="font-size:1.2rem; font-weight:800; color:var(--text-primary); margin:0">
                ${currentTest.title}
              </h3>
              <p class="text-xs text-muted mt-xs">Chủ đề: <strong>${currentTest.topic}</strong></p>
            </div>

            <!-- Playback Speed Chips -->
            <div class="flex items-center gap-xs">
              <span class="text-xs text-muted">Tốc độ:</span>
              <button class="chip ${playbackSpeed === 0.85 ? 'active' : ''}" data-speed="0.85">0.85x</button>
              <button class="chip ${playbackSpeed === 1.0 ? 'active' : ''}" data-speed="1.0">1.0x (Chuẩn)</button>
              <button class="chip ${playbackSpeed === 1.2 ? 'active' : ''}" data-speed="1.2">1.2x (Nhanh)</button>
            </div>
          </div>

          <!-- Virtual Audio Player Control Console -->
          <div style="background:linear-gradient(135deg, #1e1e2f, #2d2b55); border-radius:14px; padding:18px 22px; color:#ffffff; margin-bottom:24px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:14px; box-shadow:0 4px 16px rgba(0,0,0,0.15);">
            <div style="display:flex; align-items:center; gap:14px;">
              <button class="btn btn-primary" id="btn-toggle-audio" style="border-radius:100px; padding:10px 24px; font-weight:800;">
                ▶️ Bắt đầu nghe bài thi
              </button>
              <button class="btn btn-secondary btn-sm" id="btn-replay-audio" style="border-radius:100px; color:#fff; border-color:rgba(255,255,255,0.3); background:rgba(255,255,255,0.1);">
                🔄 Nghe lại từ đầu
              </button>
            </div>

            <!-- Audio Wave Animation Placeholder -->
            <div id="audio-wave-anim" style="display:flex; align-items:center; gap:4px; opacity:0.3; transition:opacity 0.3s;">
              <span style="display:inline-block; width:4px; height:18px; background:#10b981; border-radius:2px; animation:pulse 0.8s infinite alternate;"></span>
              <span style="display:inline-block; width:4px; height:26px; background:#6366f1; border-radius:2px; animation:pulse 0.6s infinite alternate;"></span>
              <span style="display:inline-block; width:4px; height:32px; background:#ec4899; border-radius:2px; animation:pulse 0.9s infinite alternate;"></span>
              <span style="display:inline-block; width:4px; height:20px; background:#10b981; border-radius:2px; animation:pulse 0.7s infinite alternate;"></span>
              <span class="text-xs" style="color:rgba(255,255,255,0.8); margin-left:6px; font-family:monospace;">VOICE AUDIO STREAM</span>
            </div>
          </div>

          <!-- 4-Choice Questions Area -->
          <div class="mb-xl">
            <div class="text-xs font-bold text-muted mb-md" style="text-transform:uppercase; letter-spacing:0.08em;">
              ❓ CÂU HỎI TRẮC NGHIỆM (${currentTest.questions.length} CÂU):
            </div>

            <div style="display:flex; flex-direction:column; gap:16px;">
              ${currentTest.questions.map((q, qi) => `
                <div class="glass-card-sm" style="padding:18px; background:#ffffff; border:1px solid rgba(0,0,0,0.06); border-radius:12px;">
                  <p style="font-weight:700; font-size:0.95rem; color:var(--text-primary); margin:0 0 12px 0;">
                    Câu ${qi + 1}: ${q.question}
                  </p>
                  
                  <div style="display:flex; flex-direction:column; gap:8px;">
                    ${q.options.map((opt, oi) => `
                      <div 
                        class="quiz-option text-sm listening-option" 
                        data-qi="${qi}" 
                        data-oi="${oi}" 
                        data-correct="${q.answer}"
                        style="padding:10px 14px; border-radius:8px; cursor:pointer;"
                      >
                        <span class="option-letter" style="background:#f1f5f9; width:22px; height:22px; display:inline-flex; align-items:center; justify-content:center; border-radius:50%; margin-right:8px; font-size:0.78rem; font-weight:700;">
                          ${['A','B','C','D'][oi]}
                        </span>
                        <span>${opt}</span>
                      </div>
                    `).join('')}
                  </div>

                  <!-- Explanation (Hidden until chosen) -->
                  <div class="listening-explanation-${qi} hidden mt-md" style="padding:12px 16px; background:#f0fdf4; border-left:3px solid #10b981; border-radius:0 8px 8px 0; font-size:0.85rem; line-height:1.6; color:#166534;">
                    <strong>💡 Giải thích chi tiết & Dẫn chứng:</strong><br>
                    ${q.explanation}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Script & Transcript Toggle (For post-exam study) -->
          <details style="background:#f8fafc; border:1px solid var(--border-glass); border-radius:12px; padding:14px 18px;">
            <summary style="font-size:0.9rem; font-weight:700; color:var(--purple); cursor:pointer;">
              👁️ Xem Lời Thoại Đầy Đủ (Audio Transcript) & Phân Tích Lời Nói
            </summary>
            
            <div class="mt-md" style="font-size:0.92rem; line-height:1.75; color:var(--text-primary);">
              ${currentTest.dialogue ? `
                <div style="display:flex; flex-direction:column; gap:8px;">
                  ${currentTest.dialogue.map((t, idx) => `
                    <div class="dialogue-turn" style="padding:10px 14px; border-radius:8px; border:1px solid var(--border-glass); transition:all 0.2s;">
                      <strong style="color:var(--purple-dark);">${t.speaker}:</strong> ${t.text}
                    </div>
                  `).join('')}
                </div>
              ` : `
                <div style="white-space:pre-wrap; background:#ffffff; padding:16px; border-radius:8px; border:1px solid var(--border-glass);">
                  ${currentTest.audioScript}
                </div>
              `}
            </div>
          </details>

        </div>

        <!-- Generator Modal Inject Container -->
        <div id="ai-generator-modal-root"></div>

      </div>
    `;

    // Part Sub-tabs
    container.querySelectorAll('[data-part]').forEach(btn => {
      btn.addEventListener('click', () => {
        stopAudio();
        activePart = btn.dataset.part;
        activeTestIdx = 0;
        render();
      });
    });

    // Test selection chips
    container.querySelectorAll('[data-test-idx]').forEach(btn => {
      btn.addEventListener('click', () => {
        stopAudio();
        activeTestIdx = parseInt(btn.dataset.testIdx);
        render();
      });
    });

    // Speed chips
    container.querySelectorAll('[data-speed]').forEach(btn => {
      btn.addEventListener('click', () => {
        playbackSpeed = parseFloat(btn.dataset.speed);
        container.querySelectorAll('[data-speed]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (isPlaying) {
          playCurrentTest(currentTest);
        }
      });
    });

    // Audio Play / Pause
    container.querySelector('#btn-toggle-audio')?.addEventListener('click', () => {
      if (isPlaying) {
        stopAudio();
      } else {
        playCurrentTest(currentTest);
      }
    });

    // Audio Replay
    container.querySelector('#btn-replay-audio')?.addEventListener('click', () => {
      stopAudio();
      playCurrentTest(currentTest);
    });

    // Options selection
    container.querySelectorAll('.listening-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const qi = opt.dataset.qi;
        const correct = parseInt(opt.dataset.correct);
        const selected = parseInt(opt.dataset.oi);
        const allOpts = container.querySelectorAll(`[data-qi="${qi}"]`);

        allOpts.forEach(o => {
          o.classList.add('disabled');
          if (parseInt(o.dataset.oi) === correct) {
            o.classList.add('correct');
          } else if (o === opt) {
            o.classList.add('incorrect');
          }
        });

        const expEl = container.querySelector(`.listening-explanation-${qi}`);
        if (expEl) expEl.classList.remove('hidden');

        if (selected === correct) {
          showToast('Chính xác! 🎉', 'success');
        }
      });
    });

    // AI Generator Modal Button
    container.querySelector('#btn-open-ai-generator')?.addEventListener('click', () => {
      openListeningGeneratorModal();
    });
  }

  // ==========================================
  // AI LISTENING GENERATOR MODAL
  // ==========================================
  function openListeningGeneratorModal() {
    const modalRoot = container.querySelector('#ai-generator-modal-root');
    if (!modalRoot) return;

    modalRoot.innerHTML = `
      <div class="modal-overlay show" id="listening-gen-modal">
        <div class="modal animate-fade-in" style="max-width: 580px; width: 92%;">
          <div class="modal-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-glass); padding-bottom:12px; margin-bottom:16px;">
            <span class="modal-title" style="font-size:1.15rem; font-weight:800; color:var(--purple); display:flex; align-items:center; gap:6px;">
              ✨ Gemini AI: Tạo Đề Thi Listening Mới
            </span>
            <button class="btn btn-ghost btn-icon" id="btn-close-gen-modal" style="border:none; background:none; font-size:1.2rem; cursor:pointer;">✕</button>
          </div>

          <div class="modal-body">
            <p class="text-xs text-muted mb-md" style="line-height:1.6;">
              Gemini AI sẽ tự động đóng vai chuyên gia khảo thí Cambridge/VSTEP để soạn thảo kịch bản audio, thu âm giọng đọc và tạo câu hỏi chuẩn ma trận đề thi VSTEP B2.
            </p>

            <div class="mb-md">
              <label class="text-xs font-bold text-muted mb-xs" style="display:block">CHỌN PHẦN THI (PART):</label>
              <select id="gen-select-part" class="search-input" style="width:100%; font-size:0.9rem;">
                <option value="part1" ${activePart === 'part1' ? 'selected' : ''}>📢 Part 1: Thông báo & Chỉ dẫn ngắn (1 câu hỏi)</option>
                <option value="part2" ${activePart === 'part2' ? 'selected' : ''}>👥 Part 2: Hội thoại 2 người (4 câu hỏi)</option>
                <option value="part3" ${activePart === 'part3' ? 'selected' : ''}>🎓 Part 3: Bài giảng học thuật Lecture (5 câu hỏi)</option>
              </select>
            </div>

            <div class="mb-lg">
              <label class="text-xs font-bold text-muted mb-xs" style="display:block">CHỦ ĐỀ BÀI NGHE (TOPIC):</label>
              <div class="flex items-center gap-xs flex-wrap mb-xs" id="gen-quick-topics">
                <button class="chip chip-topic active" data-topic="Campus Life & University">🎓 Đời sống sinh viên</button>
                <button class="chip chip-topic" data-topic="Artificial Intelligence & Technology">🤖 Trí tuệ nhân tạo (AI)</button>
                <button class="chip chip-topic" data-topic="Climate Change & Renewable Energy">🌱 Biến đổi khí hậu</button>
                <button class="chip chip-topic" data-topic="Job Interview & Career Planning">💼 Phỏng vấn xin việc</button>
                <button class="chip chip-topic" data-topic="Medical Science & Healthy Habits">🩺 Y học & Sức khỏe</button>
              </div>
              <input type="text" id="gen-custom-topic" class="search-input" style="width:100%; font-size:0.85rem;" placeholder="Hoặc nhập chủ đề bạn muốn luyện nghe..." value="Campus Life & University" />
            </div>

            <div id="gen-status-box" class="hidden mb-md" style="padding:14px; border-radius:10px; font-size:0.85rem; text-align:center;">
              <div class="spinner" style="margin:0 auto 8px; width:22px; height:22px; border-width:2px;"></div>
              <div class="text-xs text-muted">Gemini AI đang sáng tạo kịch bản hội thoại và câu hỏi trắc nghiệm...</div>
            </div>

            <div class="flex justify-end gap-sm">
              <button class="btn btn-secondary" id="btn-cancel-gen">Hủy</button>
              <button class="btn btn-primary" id="btn-do-generate" style="font-weight:800;">
                🚀 Bắt Đầu Tạo Đề
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    const modalEl = modalRoot.querySelector('#listening-gen-modal');
    modalRoot.querySelector('#btn-close-gen-modal')?.addEventListener('click', () => modalEl.remove());
    modalRoot.querySelector('#btn-cancel-gen')?.addEventListener('click', () => modalEl.remove());

    modalRoot.querySelectorAll('.chip-topic').forEach(chip => {
      chip.addEventListener('click', () => {
        modalRoot.querySelectorAll('.chip-topic').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        modalRoot.querySelector('#gen-custom-topic').value = chip.dataset.topic;
      });
    });

    modalRoot.querySelector('#btn-do-generate')?.addEventListener('click', async () => {
      const selectedPart = modalRoot.querySelector('#gen-select-part').value;
      const topic = modalRoot.querySelector('#gen-custom-topic').value.trim() || 'General VSTEP';
      const statusBox = modalRoot.querySelector('#gen-status-box');
      const btnGen = modalRoot.querySelector('#btn-do-generate');

      btnGen.disabled = true;
      statusBox.classList.remove('hidden');

      try {
        const newTest = await gemini.generateListeningTest(selectedPart, topic);
        if (!newTest || !newTest.questions || newTest.questions.length === 0) {
          throw new Error('AI không tạo được câu hỏi hợp lệ.');
        }

        newTest.isAiGenerated = true;
        customTests[selectedPart].push(newTest);
        activePart = selectedPart;
        activeTestIdx = getAvailableTests(selectedPart).length - 1;

        modalEl.remove();
        showToast(`Đã tạo thành công đề nghe mới: "${newTest.title}"!`, 'success');
        confetti();
        render();

      } catch (err) {
        statusBox.innerHTML = `
          <div style="color:#b91c1c; font-weight:700;">❌ Lỗi tạo bài thi: ${err.message}</div>
          <div class="text-xs text-muted mt-xs">Vui lòng thử lại với chủ đề khác.</div>
        `;
        btnGen.disabled = false;
      }
    });
  }

  render();
}

export default { renderListeningStudio };
