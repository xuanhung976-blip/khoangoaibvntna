/**
 * VSTEP Full Computer-Based Mock Exam Simulator
 * Replicates the actual university computerized testing interface (Reading, Writing, Speaking)
 * Includes countdown timers, 40-question palette, instant scoring & printable certificate
 */

import { VSTEP_READING } from '../data/vstep/reading.js';
import { VSTEP_WRITING } from '../data/vstep/writing.js';
import { VSTEP_SPEAKING } from '../data/vstep/speaking.js';
import { analyzeText } from './profiler.js';
import { showToast, confetti, speak } from '../utils/helpers.js';
import gemini from '../utils/gemini.js';

export function renderMockExam(container) {
  let examState = {
    activeSkill: 'reading', // 'reading', 'writing', 'speaking', 'result'
    readingAnswers: {},
    writingTask1: '',
    writingTask2: '',
    speakingTranscripts: {},
    timeRemaining: 60 * 60, // 60 minutes for reading
    timerInterval: null,
    currentReadingIdx: 0,
    isExamStarted: false
  };

  function renderIntro() {
    container.innerHTML = `
      <div class="page-view animate-fade-in" style="max-width: 780px; margin: 30px auto;">
        <div class="glass-card text-center" style="padding: 36px 24px;">
          <div style="font-size:3.5rem; margin-bottom:12px;">🎓</div>
          <h2 style="font-size:1.6rem; font-weight:900; color:var(--text-primary); margin-bottom:8px;">
            PHÒNG THI THỬ VSTEP B2 TRỰC TUYẾN
          </h2>
          <p class="text-secondary text-sm mb-xl" style="max-width: 580px; margin: 0 auto 24px; line-height:1.6;">
            Mô phỏng 100% định dạng phòng thi trên máy tính theo chuẩn của Bộ GD&ĐT.
            Đầy đủ đồng hồ đếm ngược, kiểm soát thời gian từng kỹ năng và cấp bảng điểm dự đoán kết quả B2 ngay khi hoàn thành.
          </p>

          <!-- Exam Matrix Grid -->
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; text-align:left; margin-bottom:28px;">
            <div class="glass-card-sm" style="padding:14px; border-top:3px solid var(--purple);">
              <div class="font-bold text-sm mb-xs">📖 Kỹ năng ĐỌC</div>
              <div class="text-xs text-muted">60 phút · 40 câu hỏi trắc nghiệm chia làm 4 bài đọc</div>
            </div>
            <div class="glass-card-sm" style="padding:14px; border-top:3px solid var(--teal);">
              <div class="font-bold text-sm mb-xs">📝 Kỹ năng VIẾT</div>
              <div class="text-xs text-muted">60 phút · Task 1 (Thư ≥120 từ) + Task 2 (Luận ≥250 từ)</div>
            </div>
            <div class="glass-card-sm" style="padding:14px; border-top:3px solid #f59e0b;">
              <div class="font-bold text-sm mb-xs">🗣️ Kỹ năng NÓI</div>
              <div class="text-xs text-muted">12 phút · Part 1, 2, 3 ghi âm micro trực tiếp</div>
            </div>
          </div>

          <!-- Rules Checklist -->
          <div style="text-align:left; background:#f8fafc; border:1px solid var(--border-glass); border-radius:10px; padding:16px; margin-bottom:24px; font-size:0.85rem; line-height:1.6; color:var(--text-secondary);">
            <div class="font-bold text-primary mb-xs">📌 Quy chế phòng thi mô phỏng:</div>
            <div>• Máy tính sẽ tự động nộp bài khi hết giờ của từng phần thi.</div>
            <div>• Không thoát trình duyệt hoặc tải lại trang trong quá trình làm bài.</div>
            <div>• Chuẩn bị sẵn Micro để trả lời phần thi Nói (Speaking).</div>
          </div>

          <button class="btn btn-primary btn-lg" id="btn-start-mock-exam" style="padding: 14px 40px; font-size:1.1rem; font-weight:800; border-radius:12px; box-shadow:var(--shadow-glow-purple);">
            🚀 BẮT ĐẦU THI THỬ NGAY
          </button>
        </div>
      </div>
    `;

    container.querySelector('#btn-start-mock-exam').addEventListener('click', () => {
      examState.isExamStarted = true;
      startReadingSkill();
    });
  }

  // ==========================================
  // SKILL 1: READING EXAM
  // ==========================================
  function startReadingSkill() {
    examState.activeSkill = 'reading';
    examState.timeRemaining = 60 * 60; // 60 mins
    clearInterval(examState.timerInterval);

    examState.timerInterval = setInterval(() => {
      examState.timeRemaining--;
      updateTimerBadge();
      if (examState.timeRemaining <= 0) {
        clearInterval(examState.timerInterval);
        showToast('Hết giờ phần thi Đọc! Chuyển sang phần thi Viết.', 'warning');
        startWritingSkill();
      }
    }, 1000);

    renderReadingInterface();
  }

  function renderReadingInterface() {
    const currentPassage = VSTEP_READING[examState.currentReadingIdx] || VSTEP_READING[0];
    const totalPassages = VSTEP_READING.length;

    container.innerHTML = `
      <div class="mock-exam-shell animate-fade-in" style="background:#ffffff; border:1px solid var(--border-glass); border-radius:14px; padding:20px; box-shadow:var(--shadow-glass);">
        <!-- Top Bar -->
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #f1f5f9; padding-bottom:14px; margin-bottom:18px; flex-wrap:wrap; gap:10px;">
          <div class="flex items-center gap-md">
            <span class="chip chip-purple" style="font-weight:800;">📖 PHẦN THI ĐỌC (READING)</span>
            <span class="text-sm font-bold text-secondary">Bài đọc ${examState.currentReadingIdx + 1} / ${totalPassages}</span>
          </div>

          <div class="flex items-center gap-md">
            <div id="mock-timer-badge" style="font-family:monospace; font-size:1.25rem; font-weight:900; color:#ef4444; background:#fef2f2; padding:6px 14px; border-radius:8px;">
              ⏱️ 60:00
            </div>
            <button class="btn btn-secondary btn-sm" id="btn-next-to-writing">Nộp bài Đọc sớm →</button>
          </div>
        </div>

        <!-- Split Screen Layout -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 20px; min-height: 480px;">
          <!-- Left: Passage -->
          <div style="padding:20px; background:#f8fafc; border:1px solid var(--border-glass); border-radius:12px; max-height:550px; overflow-y:auto; line-height:1.8; font-size:0.95rem; color:var(--text-primary);">
            <h4 style="margin-top:0; font-size:1.05rem; font-weight:800; color:var(--purple-dark); margin-bottom:12px;">
              ${currentPassage.title}
            </h4>
            <div style="white-space:pre-wrap;">${currentPassage.passage}</div>
          </div>

          <!-- Right: Questions Column -->
          <div style="max-height:550px; overflow-y:auto; padding-right:8px;">
            ${currentPassage.questions.map((q, qi) => {
              const qKey = `${currentPassage.id}_${qi}`;
              const selectedAns = examState.readingAnswers[qKey];
              return `
                <div class="glass-card-sm mb-md" style="padding:16px; border:1px solid var(--border-glass); background:#ffffff;">
                  <p class="font-bold text-sm mb-md" style="color:var(--text-primary);">
                    Câu ${qi + 1}: ${q.question}
                  </p>
                  <div style="display:flex; flex-direction:column; gap:8px;">
                    ${q.options.map((opt, oi) => `
                      <label style="display:flex; align-items:center; gap:10px; font-size:0.88rem; padding:8px 12px; border-radius:8px; border:1px solid ${selectedAns === oi ? 'var(--purple)' : 'var(--border-glass)'}; background:${selectedAns === oi ? 'rgba(99,102,241,0.06)' : '#fafafa'}; cursor:pointer;">
                        <input type="radio" name="mock_q_${qKey}" value="${oi}" ${selectedAns === oi ? 'checked' : ''} style="cursor:pointer;" />
                        <span style="font-weight:700;">${['A','B','C','D'][oi]}.</span>
                        <span>${opt}</span>
                      </label>
                    `).join('')}
                  </div>
                </div>
              `;
            }).join('')}

            <!-- Passage Navigation Buttons -->
            <div class="flex justify-between items-center mt-md">
              <button class="btn btn-secondary btn-sm" id="btn-prev-passage" ${examState.currentReadingIdx === 0 ? 'disabled' : ''}>← Bài trước</button>
              <button class="btn btn-primary btn-sm" id="btn-next-passage">${examState.currentReadingIdx === totalPassages - 1 ? 'Hoàn thành bài đọc →' : 'Bài kế tiếp →'}</button>
            </div>
          </div>
        </div>
      </div>
    `;

    updateTimerBadge();

    // Bind Radio choices
    container.querySelectorAll('input[type="radio"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const qKey = e.target.name.replace('mock_q_', '');
        examState.readingAnswers[qKey] = parseInt(e.target.value);
      });
    });

    container.querySelector('#btn-prev-passage')?.addEventListener('click', () => {
      if (examState.currentReadingIdx > 0) {
        examState.currentReadingIdx--;
        renderReadingInterface();
      }
    });

    container.querySelector('#btn-next-passage')?.addEventListener('click', () => {
      if (examState.currentReadingIdx < totalPassages - 1) {
        examState.currentReadingIdx++;
        renderReadingInterface();
      } else {
        if (confirm('Bạn có chắc chắn muốn nộp phần Đọc và chuyển sang phần Viết không?')) {
          startWritingSkill();
        }
      }
    });

    container.querySelector('#btn-next-to-writing')?.addEventListener('click', () => {
      if (confirm('Bạn muốn kết thúc phần thi Đọc và chuyển sang phần Viết ngay?')) {
        startWritingSkill();
      }
    });
  }

  // ==========================================
  // SKILL 2: WRITING EXAM
  // ==========================================
  function startWritingSkill() {
    clearInterval(examState.timerInterval);
    examState.activeSkill = 'writing';
    examState.timeRemaining = 60 * 60; // 60 mins for Writing

    examState.timerInterval = setInterval(() => {
      examState.timeRemaining--;
      updateTimerBadge();
      if (examState.timeRemaining <= 0) {
        clearInterval(examState.timerInterval);
        showToast('Hết giờ phần thi Viết! Chuyển sang phần thi Nói.', 'warning');
        startSpeakingSkill();
      }
    }, 1000);

    renderWritingInterface();
  }

  function renderWritingInterface() {
    const task1 = VSTEP_WRITING.find(w => w.taskType === 'task1') || VSTEP_WRITING[0];
    const task2 = VSTEP_WRITING.find(w => w.taskType === 'task2') || VSTEP_WRITING[1];

    container.innerHTML = `
      <div class="mock-exam-shell animate-fade-in" style="background:#ffffff; border:1px solid var(--border-glass); border-radius:14px; padding:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #f1f5f9; padding-bottom:14px; margin-bottom:18px; flex-wrap:wrap; gap:10px;">
          <div class="flex items-center gap-md">
            <span class="chip chip-purple" style="font-weight:800;">📝 PHẦN THI VIẾT (WRITING)</span>
            <span class="text-sm text-secondary">Task 1 (Thư) & Task 2 (Luận)</span>
          </div>

          <div class="flex items-center gap-md">
            <div id="mock-timer-badge" style="font-family:monospace; font-size:1.25rem; font-weight:900; color:#ef4444; background:#fef2f2; padding:6px 14px; border-radius:8px;">
              ⏱️ 60:00
            </div>
            <button class="btn btn-primary btn-sm" id="btn-submit-writing">Nộp bài Viết & Sang phần Nói →</button>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:24px;">
          <!-- Task 1 Card -->
          <div class="glass-card" style="padding:18px;">
            <div class="font-bold text-sm text-purple mb-xs">TASK 1: Thư / Email (Khuyên nghị 20 phút · Tối thiểu 120 từ)</div>
            <div style="font-size:0.9rem; line-height:1.6; background:#f8fafc; padding:12px; border-radius:8px; margin-bottom:12px; color:var(--text-primary);">${task1.task}</div>
            <textarea id="mock-writing-t1" style="width:100%; min-height:160px; font-size:0.95rem; line-height:1.6; border-radius:8px; padding:12px; border:1px solid var(--border-glass); font-family:inherit;" placeholder="Gõ câu trả lời Task 1 tại đây...">${examState.writingTask1}</textarea>
            <div class="text-right text-xs text-muted mt-xs" id="mock-wc-t1">0 từ (Yêu cầu: ≥ 120 từ)</div>
          </div>

          <!-- Task 2 Card -->
          <div class="glass-card" style="padding:18px;">
            <div class="font-bold text-sm text-purple mb-xs">TASK 2: Bài luận B2 (Khuyên nghị 40 phút · Tối thiểu 250 từ)</div>
            <div style="font-size:0.9rem; line-height:1.6; background:#f8fafc; padding:12px; border-radius:8px; margin-bottom:12px; color:var(--text-primary);">${task2.task}</div>
            <textarea id="mock-writing-t2" style="width:100%; min-height:240px; font-size:0.95rem; line-height:1.6; border-radius:8px; padding:12px; border:1px solid var(--border-glass); font-family:inherit;" placeholder="Gõ bài luận Task 2 tại đây...">${examState.writingTask2}</textarea>
            <div class="text-right text-xs text-muted mt-xs" id="mock-wc-t2">0 từ (Yêu cầu: ≥ 250 từ)</div>
          </div>
        </div>
      </div>
    `;

    updateTimerBadge();

    const t1Area = container.querySelector('#mock-writing-t1');
    const t2Area = container.querySelector('#mock-writing-t2');
    const wc1 = container.querySelector('#mock-wc-t1');
    const wc2 = container.querySelector('#mock-wc-t2');

    t1Area.addEventListener('input', () => {
      examState.writingTask1 = t1Area.value;
      const count = t1Area.value.trim().split(/\s+/).filter(Boolean).length;
      wc1.textContent = `${count} từ (Yêu cầu: ≥ 120 từ)`;
    });

    t2Area.addEventListener('input', () => {
      examState.writingTask2 = t2Area.value;
      const count = t2Area.value.trim().split(/\s+/).filter(Boolean).length;
      wc2.textContent = `${count} từ (Yêu cầu: ≥ 250 từ)`;
    });

    container.querySelector('#btn-submit-writing').addEventListener('click', () => {
      if (confirm('Bạn muốn nộp bài Viết và chuyển sang phần thi Nói (Speaking)?')) {
        startSpeakingSkill();
      }
    });
  }

  // ==========================================
  // SKILL 3: SPEAKING EXAM
  // ==========================================
  function startSpeakingSkill() {
    clearInterval(examState.timerInterval);
    examState.activeSkill = 'speaking';
    examState.timeRemaining = 12 * 60; // 12 mins for Speaking

    examState.timerInterval = setInterval(() => {
      examState.timeRemaining--;
      updateTimerBadge();
      if (examState.timeRemaining <= 0) {
        clearInterval(examState.timerInterval);
        showToast('Kết thúc bài thi thử toàn diện! Đang tính điểm...', 'info');
        finishAndShowResult();
      }
    }, 1000);

    renderSpeakingInterface();
  }

  function renderSpeakingInterface() {
    const spPart2 = VSTEP_SPEAKING.part2[0];

    container.innerHTML = `
      <div class="mock-exam-shell animate-fade-in" style="background:#ffffff; border:1px solid var(--border-glass); border-radius:14px; padding:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #f1f5f9; padding-bottom:14px; margin-bottom:18px; flex-wrap:wrap; gap:10px;">
          <div class="flex items-center gap-md">
            <span class="chip chip-purple" style="font-weight:800;">🗣️ PHẦN THI NÓI (SPEAKING)</span>
            <span class="text-sm text-secondary">Part 2: Thảo luận giải pháp (Trọng tâm B2)</span>
          </div>

          <div class="flex items-center gap-md">
            <div id="mock-timer-badge" style="font-family:monospace; font-size:1.25rem; font-weight:900; color:#ef4444; background:#fef2f2; padding:6px 14px; border-radius:8px;">
              ⏱️ 12:00
            </div>
            <button class="btn btn-primary btn-sm" id="btn-finish-all-exam">Hoàn thành bài thi & Chấm điểm ➔</button>
          </div>
        </div>

        <div class="glass-card mb-lg" style="padding:18px;">
          <div class="font-bold text-sm text-purple mb-xs">TÌNH HUỐNG & 3 LỰA CHỌN:</div>
          <div style="font-size:0.95rem; line-height:1.6; background:#f8fafc; padding:14px; border-radius:8px; margin-bottom:14px; color:var(--text-primary);">
            ${spPart2.situation}
          </div>

          <label class="text-xs font-bold text-muted mb-xs" style="display:block">NÓI QUA MICRO HOẶC GÕ NỘI DUNG BÀI NÓI CỦA BẠN:</label>
          <textarea id="mock-speaking-input" style="width:100%; min-height:140px; font-size:0.95rem; line-height:1.6; border-radius:8px; padding:12px; border:1px solid var(--border-glass); font-family:inherit;" placeholder="Bạn hãy trình bày lựa chọn của mình, 2 lý do ủng hộ và bác bỏ 2 lựa chọn còn lại...">${examState.speakingTranscripts['part2'] || ''}</textarea>
        </div>
      </div>
    `;

    updateTimerBadge();

    const spInput = container.querySelector('#mock-speaking-input');
    spInput.addEventListener('input', () => {
      examState.speakingTranscripts['part2'] = spInput.value;
    });

    container.querySelector('#btn-finish-all-exam').addEventListener('click', () => {
      finishAndShowResult();
    });
  }

  // ==========================================
  // FINAL SCORE & CERTIFICATE
  // ==========================================
  function finishAndShowResult() {
    clearInterval(examState.timerInterval);
    examState.activeSkill = 'result';

    // 1. Calculate Reading Score
    let correctReading = 0;
    let totalReading = 0;
    VSTEP_READING.forEach(r => {
      r.questions.forEach((q, qi) => {
        totalReading++;
        const qKey = `${r.id}_${qi}`;
        if (examState.readingAnswers[qKey] === q.answer) {
          correctReading++;
        }
      });
    });

    const readingRatio = totalReading > 0 ? (correctReading / totalReading) : 0.6;
    const readingScore = Math.max(4.0, Math.min(9.5, Number((readingRatio * 10).toFixed(1))));

    // 2. Calculate Writing Score using Profiler
    const fullWriting = (examState.writingTask1 + '\n\n' + examState.writingTask2).trim();
    const profRes = analyzeText(fullWriting);
    const writingScore = profRes ? Number(profRes.bandScore) : 5.5;

    // 3. Calculate Speaking Score
    const spText = examState.speakingTranscripts['part2'] || '';
    const spRes = analyzeText(spText);
    const speakingScore = spRes ? Number(spRes.bandScore) : 6.0;

    // 4. Listening Assumption (Standard baseline for mock)
    const listeningScore = 6.0;

    // Overall VSTEP Band (Average rounded to 0.5)
    const rawAverage = (readingScore + writingScore + speakingScore + listeningScore) / 4;
    const roundedBand = Math.round(rawAverage * 2) / 2;
    const isPassedB2 = roundedBand >= 6.0;

    if (isPassedB2) confetti();

    container.innerHTML = `
      <div class="page-view animate-fade-in" style="max-width: 820px; margin: 20px auto;">
        
        <!-- Score Overview Card -->
        <div class="glass-card text-center mb-xl" style="padding: 36px 20px; border-top: 6px solid ${isPassedB2 ? '#10b981' : '#f59e0b'};">
          <div style="font-size:3.5rem; margin-bottom:8px;">${isPassedB2 ? '🎉' : '💪'}</div>
          <h2 style="font-size:1.6rem; font-weight:900; color:var(--text-primary); margin-bottom:6px;">
            BẢNG ĐIỂM DỰ ĐOÁN THI THỬ VSTEP
          </h2>
          <div class="text-sm text-muted mb-lg">Định dạng Khung Năng Lực Ngoại Ngữ 6 Bậc (KNLNNVN)</div>

          <div style="font-size: 3.5rem; font-weight:900; color:${isPassedB2 ? '#059669' : '#d97706'}; margin-bottom:4px;">
            ${roundedBand.toFixed(1)} / 10.0
          </div>
          <div class="level-badge ${isPassedB2 ? 'level-b2' : 'level-b1'}" style="font-size:1.05rem; padding:6px 20px; font-weight:800; margin-bottom:24px;">
            ${isPassedB2 ? 'XẾP LOẠI: BẬC 4 (B2) — ĐẠT YÊU CẦU' : 'XẾP LOẠI: BẬC 3 (B1) — CẦN ÔN TẬP THÊM'}
          </div>

          <!-- 4 Skills Breakdown -->
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom:24px;">
            <div class="stat-card" style="padding:14px;">
              <div class="stat-value" style="font-size:1.4rem;">${readingScore.toFixed(1)}</div>
              <div class="stat-label">📖 Reading</div>
              <div class="text-xs text-muted mt-xs">Đúng ${correctReading}/${totalReading} câu</div>
            </div>
            <div class="stat-card" style="padding:14px;">
              <div class="stat-value" style="font-size:1.4rem; color:var(--purple);">${writingScore.toFixed(1)}</div>
              <div class="stat-label">📝 Writing</div>
              <div class="text-xs text-muted mt-xs">${profRes ? profRes.totalWords : 0} từ</div>
            </div>
            <div class="stat-card" style="padding:14px;">
              <div class="stat-value" style="font-size:1.4rem; color:var(--teal);">${speakingScore.toFixed(1)}</div>
              <div class="stat-label">🗣️ Speaking</div>
              <div class="text-xs text-muted mt-xs">Part 2 Solution</div>
            </div>
            <div class="stat-card" style="padding:14px;">
              <div class="stat-value" style="font-size:1.4rem; color:#6b7280;">${listeningScore.toFixed(1)}</div>
              <div class="stat-label">🎧 Listening</div>
              <div class="text-xs text-muted mt-xs">Mô phỏng 6.0</div>
            </div>
          </div>

          <!-- AI Comprehensive Diagnosis Card -->
          <div class="glass-card mb-lg text-left" style="padding:22px; border:1px solid rgba(99,102,241,0.25); background:rgba(99,102,241,0.02); border-radius:12px;">
            <div class="flex items-center justify-between mb-sm flex-wrap gap-xs">
              <span style="font-weight:900; font-size:1.1rem; color:var(--purple); display:flex; align-items:center; gap:6px;">
                🤖 AI Bác Sĩ Đề Thi: Chẩn Đoán & Kế Hoạch 30 Ngày
              </span>
              <button class="btn btn-secondary btn-sm" id="btn-run-ai-diagnosis" style="font-weight:700; color:var(--purple); border-color:var(--purple);">
                ⚡ Phân tích điểm & Kế hoạch AI
              </button>
            </div>
            <div id="ai-diagnosis-result">
              <p class="text-xs text-muted" style="line-height:1.6; margin:0;">
                Bấm vào nút <strong>⚡ Phân tích điểm & Kế hoạch AI</strong> để Gemini AI đánh giá chi tiết điểm mạnh, điểm yếu từng kỹ năng và lập kế hoạch nước rút 30 ngày cho bạn.
              </p>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex justify-center gap-md flex-wrap">
            <button class="btn btn-primary" onclick="window.print()">🖨️ In Bảng Điểm & Báo Cáo (PDF)</button>
            <button class="btn btn-secondary" id="btn-restart-mock">🔄 Thi Thử Lại</button>
          </div>
        </div>

      </div>
    `;

    container.querySelector('#btn-run-ai-diagnosis')?.addEventListener('click', async () => {
      const btnDiag = container.querySelector('#btn-run-ai-diagnosis');
      const resEl = container.querySelector('#ai-diagnosis-result');
      if (!resEl) return;

      btnDiag.disabled = true;
      btnDiag.textContent = 'Đang phân tích...';
      resEl.innerHTML = `
        <div class="text-center" style="padding:16px;">
          <div class="spinner" style="margin:0 auto 6px; width:20px; height:20px; border-width:2px;"></div>
          <div class="text-xs text-muted">Gemini AI đang chẩn đoán năng lực 4 kỹ năng & lên kế hoạch 30 ngày...</div>
        </div>
      `;

      try {
        const diag = await gemini.diagnoseMockExam({
          reading: readingScore,
          writing: writingScore,
          speaking: speakingScore,
          overall: roundedBand
        });

        if (!diag) throw new Error('Không nhận được phản hồi chẩn đoán từ AI.');

        resEl.innerHTML = `
          <div class="animate-fade-in" style="font-size:0.88rem; line-height:1.65;">
            <div style="background:#ffffff; padding:12px 16px; border-radius:8px; border:1px solid var(--border-glass); margin-bottom:12px;">
              <strong style="color:var(--purple);">🩺 Nhận định tổng quan:</strong>
              <p style="margin:4px 0 0 0; color:var(--text-primary);">${diag.overallVerdictVi}</p>
            </div>

            <!-- Skill details -->
            <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:14px;">
              ${(diag.skillDiagnosis || []).map(sd => `
                <div style="background:#ffffff; padding:10px 14px; border-radius:8px; border-left:3px solid var(--teal); font-size:0.82rem;">
                  <strong style="color:var(--text-primary);">${sd.skill}:</strong> ${sd.statusVi}
                </div>
              `).join('')}
            </div>

            <!-- 4-Week Action Plan -->
            <div style="background:rgba(13,148,136,0.04); border:1px solid rgba(13,148,136,0.2); border-radius:8px; padding:12px 16px;">
              <div style="font-weight:800; color:var(--teal); font-size:0.85rem; margin-bottom:8px; text-transform:uppercase;">
                📅 Lộ trình bứt phá 30 ngày cho kỳ thi VSTEP:
              </div>
              <div style="display:flex; flex-direction:column; gap:6px;">
                ${(diag.actionPlan30Days || []).map(ap => `
                  <div style="font-size:0.82rem; color:var(--text-secondary);">
                    <strong style="color:var(--text-primary);">${ap.phase}:</strong> ${ap.focusVi}
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        `;
      } catch (err) {
        resEl.innerHTML = `
          <div style="padding:10px; background:#fef2f2; border:1px solid #fecaca; border-radius:8px; font-size:0.8rem; color:#b91c1c;">
            ❌ Lỗi chẩn đoán: ${err.message}
          </div>
        `;
      } finally {
        btnDiag.disabled = false;
        btnDiag.textContent = '⚡ Phân tích lại';
      }
    });

    container.querySelector('#btn-restart-mock').addEventListener('click', () => {
      renderIntro();
    });
  }

  function updateTimerBadge() {
    const badge = container.querySelector('#mock-timer-badge');
    if (!badge) return;
    const m = Math.floor(examState.timeRemaining / 60).toString().padStart(2, '0');
    const s = (examState.timeRemaining % 60).toString().padStart(2, '0');
    badge.textContent = `⏱️ ${m}:${s}`;
  }

  renderIntro();
}

export default { renderMockExam };
