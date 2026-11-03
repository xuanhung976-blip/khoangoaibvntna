import statisticsEngine from '../utils/statisticsEngine.js';
import storage from '../utils/storage.js';
import { formatDate } from '../utils/helpers.js';
import { MEDICAL_REGISTRY } from '../data/medical/medicalRegistry.js';

export function renderStatistics(container) {
  const stats = statisticsEngine.getOverallStats();
  const weekly = statisticsEngine.getWeeklyActivity();
  const streak = storage.getStreak();
  const saved = storage.getSavedVocabulary();

  container.innerHTML = `
    <div class="page-view animate-fade-in">
      <div class="page-header">
        <h2 class="page-title">📊 Thống Kê</h2>
        <p class="page-subtitle">Theo dõi tiến độ học tập của bạn</p>
      </div>

      <!-- Overall Stats -->
      <div class="stats-grid mb-xl">
        <div class="stat-card">
          <div class="stat-icon">🔥</div>
          <div class="stat-value">${streak.currentStreak}</div>
          <div class="stat-label">Streak hiện tại</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🏆</div>
          <div class="stat-value">${streak.longestStreak}</div>
          <div class="stat-label">Streak dài nhất</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📚</div>
          <div class="stat-value">${stats.totalLearned}</div>
          <div class="stat-label">Từ đã học</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⭐</div>
          <div class="stat-value">${stats.totalMastered}</div>
          <div class="stat-label">Thành thạo</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">💾</div>
          <div class="stat-value">${saved.length}</div>
          <div class="stat-label">Từ đã lưu</div>
        </div>
      </div>

      <!-- Weekly Activity -->
      <div class="glass-card mb-xl">
        <h3 class="font-bold mb-lg" style="font-size:1rem">📅 Hoạt động 7 ngày qua</h3>
        <div class="weekly-chart">
          ${weekly.map((day, i) => `
            <div class="chart-day">
              <div class="chart-bar ${day.active ? 'active' : ''}" style="height:${day.active ? Math.max(20, 60) : 8}px"></div>
              <span class="chart-label">${day.label}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Module Stats -->
      <h3 class="font-bold mb-md" style="font-size:1rem">📈 Theo module</h3>
      <div class="glass-card mb-xl">
        ${[
          { icon:'📘', name:'VSTEP', id:'vstep', color:'var(--color-vstep)' },
          { icon:'📗', name:'APTIS ESOL', id:'aptis', color:'var(--color-aptis)' },
          ...MEDICAL_REGISTRY.filter(m=>m.enabled).map(m=>({ icon:m.icon, name:m.name, id:m.id, color:`var(--color-${m.id})` }))
        ].map(m => {
          const s = m.id === 'vstep' || m.id === 'aptis'
            ? statisticsEngine.getModuleStats(m.id)
            : statisticsEngine.getMedicalModuleStats(m.id);
          const pct = s.avgScore || s.percent || 0;
          return `
            <div class="module-progress-item">
              <span style="font-size:1.3rem">${m.icon}</span>
              <div class="module-progress-info">
                <div class="module-progress-name">
                  ${m.name}
                  <span class="text-xs text-muted">${s.quizCount ? s.quizCount + ' quiz · ' : ''}${s.lastPlayed ? 'Last: ' + formatDate(s.lastPlayed) : 'Chưa làm'}</span>
                </div>
                <div class="module-progress-bar-container">
                  <div class="module-progress-fill" style="width:${pct}%;background:${m.color};height:100%"></div>
                </div>
              </div>
              <span class="module-progress-pct">${pct}%</span>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Saved Vocabulary -->
      <h3 class="font-bold mb-md" style="font-size:1rem">💾 Từ vựng đã lưu (${saved.length})</h3>
      ${saved.length === 0
        ? '<div class="empty-state"><div class="empty-icon">📭</div><h3>Chưa có từ nào</h3><p>Dịch văn bản và lưu từ vựng y khoa từ Translator</p></div>'
        : `<div class="vocab-list">${saved.slice(0,20).map(w => `
          <div class="vocab-item">
            <div>
              <div class="vocab-term">${w.term || w.word || ''}</div>
              <div class="vocab-vi">${w.vietnamese || w.vi || ''}</div>
              <div class="text-xs text-muted mt-sm">${w.module ? '(' + w.module + ')' : ''}</div>
            </div>
            <button class="btn btn-danger btn-sm" onclick="window.__removeWord('${w.id}')">✕</button>
          </div>
        `).join('')}</div>`
      }
    </div>
  `;

  window.__removeWord = (id) => {
    storage.removeWord(id);
    showToast('Đã xóa từ', 'info');
    renderStatistics(container);
  };
}
