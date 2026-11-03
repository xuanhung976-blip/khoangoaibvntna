import storage from '../utils/storage.js';
import statisticsEngine from '../utils/statisticsEngine.js';
import { formatDate } from '../utils/helpers.js';
import router from '../utils/router.js';
import { openGeminiConfigModal } from './aiConfig.js';
import gemini from '../utils/gemini.js';

export function renderDashboard(container) {
  const streak = storage.getStreak();
  const stats = statisticsEngine.getOverallStats();
  const weeklyActivity = statisticsEngine.getWeeklyActivity();
  const vstepStats = statisticsEngine.getModuleStats('vstep');
  const aptisStats = statisticsEngine.getModuleStats('aptis');
  const thyStats = statisticsEngine.getMedicalModuleStats('thyroid');
  const dmStats = statisticsEngine.getMedicalModuleStats('diabetes');

  // Daily quests state in localStorage
  const todayKey = 'vstep_quests_' + new Date().toISOString().slice(0, 10);
  let quests = JSON.parse(localStorage.getItem(todayKey) || '{"vocab":false,"reading":false,"writing":false}');

  storage.updateStreak();

  container.innerHTML = `
    <div class="page-view animate-fade-in">
      <div class="page-header" style="margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div>
            <h2 class="page-title">📊 Dashboard Tổng Quan</h2>
            <p class="page-subtitle">Hành trình ôn thi VSTEP B2 nước rút trong 1 tháng</p>
          </div>
          <button class="btn btn-secondary btn-sm" id="btn-open-gemini-dash" style="font-weight:700;">
            ${gemini.hasApiKey() ? '🟢 Gemini AI: Đang hoạt động' : '🤖 Cài đặt Gemini API Key'}
          </button>
        </div>
      </div>

      <!-- 30-Day Sprint & Daily Quests Banner -->
      <div class="glass-card mb-xl" style="padding:22px; border-left:5px solid var(--purple); background:linear-gradient(135deg, rgba(79, 70, 229, 0.04) 0%, rgba(13, 148, 136, 0.04) 100%);">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px;">
          <div>
            <span class="chip chip-purple" style="font-weight:800; font-size:0.75rem;">LỘ TRÌNH NƯỚC RÚT 30 NGÀY</span>
            <h3 style="margin:4px 0 0 0; font-size:1.25rem; font-weight:900; color:var(--text-primary);">
              🎯 Mục tiêu: Đạt VSTEP Bậc 4 (B2 $\ge$ 6.0)
            </h3>
          </div>
          <div class="flex items-center gap-sm">
            <span style="font-size:1.6rem;">🔥</span>
            <div>
              <div style="font-weight:900; font-size:1.1rem; color:#ef4444;">Ngày 1 / 30</div>
              <div class="text-xs text-muted">Còn ~29 ngày đến kỳ thi</div>
            </div>
          </div>
        </div>

        <!-- 3 Daily Quests -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap:12px; margin-bottom:16px;">
          <label style="display:flex; align-items:center; gap:10px; padding:12px 14px; background:#ffffff; border-radius:10px; border:1px solid var(--border-glass); cursor:pointer;">
            <input type="checkbox" id="quest-vocab" ${quests.vocab ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;" />
            <span style="font-size:0.88rem; font-weight:600; color:var(--text-primary);">📚 Ôn 25 thẻ từ vựng B2</span>
          </label>
          <label style="display:flex; align-items:center; gap:10px; padding:12px 14px; background:#ffffff; border-radius:10px; border:1px solid var(--border-glass); cursor:pointer;">
            <input type="checkbox" id="quest-reading" ${quests.reading ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;" />
            <span style="font-size:0.88rem; font-weight:600; color:var(--text-primary);">📖 Làm 1 bài đọc 15 phút</span>
          </label>
          <label style="display:flex; align-items:center; gap:10px; padding:12px 14px; background:#ffffff; border-radius:10px; border:1px solid var(--border-glass); cursor:pointer;">
            <input type="checkbox" id="quest-writing" ${quests.writing ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer;" />
            <span style="font-size:0.88rem; font-weight:600; color:var(--text-primary);">📝 Viết 1 bài luận / Nói Part 2</span>
          </label>
        </div>

        <!-- Action bar -->
        <div class="flex justify-between items-center flex-wrap gap-sm">
          <div class="text-xs text-muted" id="quest-summary">
            ${(quests.vocab && quests.reading && quests.writing) ? '🎉 Chúc mừng! Bạn đã hoàn thành 100% nhiệm vụ hôm nay!' : 'Hoàn thành 3 nhiệm vụ mỗi ngày để giữ lửa chuỗi học (Streak)!'}
          </div>
          <button class="btn btn-primary btn-sm" id="btn-go-mock-exam" style="padding:8px 20px; font-weight:800; border-radius:8px;">
            🎓 Vào phòng Thi Thử VSTEP Full ➔
          </button>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid mb-xl">
        <div class="stat-card">
          <div class="stat-icon">🔥</div>
          <div class="stat-value">${streak.currentStreak}</div>
          <div class="stat-label">Ngày liên tiếp (Streak)</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📚</div>
          <div class="stat-value">${stats.totalLearned}</div>
          <div class="stat-label">Từ đã ôn tập</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🏆</div>
          <div class="stat-value">${stats.totalMastered}</div>
          <div class="stat-label">Từ thành thạo</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⭐</div>
          <div class="stat-value">${streak.longestStreak}</div>
          <div class="stat-label">Kỷ lục chuỗi ngày</div>
        </div>
      </div>

      <!-- Quick AI Tools Grid -->
      <h3 class="font-bold mb-md" style="font-size:1.05rem; color:var(--text-primary);">⚡ Bộ công cụ VSTEP AI & Luyện thi</h3>
      <div class="module-grid mb-xl" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:14px;">
        <div class="glass-card" style="padding:16px; cursor:pointer; border:1px solid rgba(99,102,241,0.3); background:linear-gradient(135deg, rgba(99,102,241,0.06), rgba(236,72,153,0.06));" data-route="/ai-tutor">
          <div style="font-size:2rem; margin-bottom:8px;">🤖</div>
          <div style="font-weight:800; font-size:1.05rem; margin-bottom:4px; color:var(--purple);">Phòng Thi Ảo AI</div>
          <div class="text-xs text-secondary mb-sm">Gặp giám khảo AI luyện nói 1-kèm-1, sửa lỗi phát âm & phản xạ giọng nói</div>
          <span class="text-xs text-accent" style="font-weight:700;">Vào luyện ngay →</span>
        </div>

        <div class="glass-card" style="padding:16px; cursor:pointer;" data-route="/vstep">
          <div style="font-size:2rem; margin-bottom:8px;">📘</div>
          <div style="font-weight:800; font-size:1.05rem; margin-bottom:4px;">VSTEP Master</div>
          <div class="text-xs text-secondary mb-sm">Từ vựng, Flashcard, Quiz, Reading & Writing</div>
          <span class="text-xs text-accent" style="font-weight:700;">Học ngay →</span>
        </div>

        <div class="glass-card" style="padding:16px; cursor:pointer;" data-route="/listening">
          <div style="font-size:2rem; margin-bottom:8px;">🎧</div>
          <div style="font-weight:800; font-size:1.05rem; margin-bottom:4px; color:var(--teal);">Listening AI Studio</div>
          <div class="text-xs text-secondary mb-sm">Tạo đề nghe Part 1-2-3 tự động, đọc phân vai đa giọng nói</div>
          <span class="text-xs text-accent" style="font-weight:700;">Luyện nghe ngay →</span>
        </div>

        <div class="glass-card" style="padding:16px; cursor:pointer;" data-route="/paraphraser">
          <div style="font-size:2rem; margin-bottom:8px;">🚀</div>
          <div style="font-weight:800; font-size:1.05rem; margin-bottom:4px;">B2 Paraphraser</div>
          <div class="text-xs text-secondary mb-sm">Nâng cấp câu đơn giản thành câu phức học thuật</div>
          <span class="text-xs text-accent" style="font-weight:700;">Nâng cấp câu →</span>
        </div>

        <div class="glass-card" style="padding:16px; cursor:pointer;" data-route="/profiler">
          <div style="font-size:2rem; margin-bottom:8px;">🔍</div>
          <div style="font-weight:800; font-size:1.05rem; margin-bottom:4px;">CEFR Profiler</div>
          <div class="text-xs text-secondary mb-sm">Đo cấp độ từ vựng A1~C2 & độ khó Flesch</div>
          <span class="text-xs text-accent" style="font-weight:700;">Đo văn bản →</span>
        </div>

        <div class="glass-card" style="padding:16px; cursor:pointer;" data-route="/mock-exam">
          <div style="font-size:2rem; margin-bottom:8px;">🎓</div>
          <div style="font-weight:800; font-size:1.05rem; margin-bottom:4px;">Thi Thử VSTEP</div>
          <div class="text-xs text-secondary mb-sm">Mô phỏng 100% phòng thi máy tính tính giờ</div>
          <span class="text-xs text-accent" style="font-weight:700;">Bắt đầu thi →</span>
        </div>
      </div>

      <!-- Weekly Activity -->
      <div class="glass-card mb-xl">
        <h3 class="font-bold mb-md" style="font-size:1rem">📅 Hoạt động tuần này</h3>
        <div class="weekly-chart">
          ${weeklyActivity.map(day => `
            <div class="chart-day">
              <div class="chart-bar ${day.active ? 'active' : ''}" style="height: ${day.active ? '60px' : '8px'}"></div>
              <span class="chart-label">${day.label}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  // Bind quest checkboxes
  ['vocab', 'reading', 'writing'].forEach(q => {
    container.querySelector(`#quest-${q}`)?.addEventListener('change', (e) => {
      quests[q] = e.target.checked;
      localStorage.setItem(todayKey, JSON.stringify(quests));
      const summary = container.querySelector('#quest-summary');
      if (quests.vocab && quests.reading && quests.writing) {
        summary.innerHTML = '🎉 <strong>Chúc mừng!</strong> Bạn đã hoàn thành 100% nhiệm vụ hôm nay!';
        import('../utils/helpers.js').then(h => h.confetti());
      } else {
        summary.textContent = 'Hoàn thành 3 nhiệm vụ mỗi ngày để giữ lửa chuỗi học (Streak)!';
      }
    });
  });

  // Action clicks
  container.querySelector('#btn-open-gemini-dash')?.addEventListener('click', openGeminiConfigModal);
  container.querySelector('#btn-go-mock-exam')?.addEventListener('click', () => router.navigate('/mock-exam'));

  container.querySelectorAll('[data-route]').forEach(card => {
    card.addEventListener('click', () => router.navigate(card.dataset.route));
  });
}
