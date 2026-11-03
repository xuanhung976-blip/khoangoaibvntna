import { MEDICAL_REGISTRY, getEnabledModules } from '../../data/medical/medicalRegistry.js';
import statisticsEngine from '../../utils/statisticsEngine.js';

export function renderMedicalHub(container) {
  const enabledModules = getEnabledModules();
  const allModules = MEDICAL_REGISTRY;

  container.innerHTML = `
    <div class="page-view animate-fade-in">
      <div class="page-header">
        <h2 class="page-title">🩺 Medical English</h2>
        <p class="page-subtitle">Học tiếng Anh y khoa theo chuyên ngành — chọn chuyên ngành để bắt đầu</p>
      </div>

      <!-- Enabled modules -->
      <h3 class="font-bold mb-md" style="font-size:0.875rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted)">🟢 Sẵn sàng</h3>
      <div class="module-grid mb-xl">
        ${enabledModules.map(m => {
          const stats = statisticsEngine.getMedicalModuleStats(m.id);
          return `
            <div class="module-card" 
                 style="--module-gradient:${m.gradient};--module-color:var(--color-${m.id}, ${m.gradient})"
                 data-module="${m.id}"
                 role="button"
                 tabindex="0">
              <div class="module-icon-wrap" style="background:${m.gradient}">${m.icon}</div>
              <div class="module-card-title">${m.name}</div>
              <div class="module-card-subtitle">${m.vietnameseName}</div>
              <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:12px">${m.description}</div>
              <div class="module-progress-bar">
                <div class="module-progress-fill" style="width:${stats.percent}%;background:${m.gradient}"></div>
              </div>
              <div class="module-card-meta">
                <span class="module-term-count">${m.termCount}</span>
                <span style="font-size:0.75rem;color:var(--text-muted)">${stats.percent}% hoàn thành</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Coming soon modules -->
      <h3 class="font-bold mb-md" style="font-size:0.875rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted)">🕺 Coming soon</h3>
      <div class="module-grid">
        ${allModules.filter(m => !m.enabled).map(m => `
          <div class="module-card disabled" style="--module-gradient:${m.gradient};--module-color:var(--color-${m.id}, ${m.gradient})">
            <div class="coming-soon-badge">Sắp ra mắt</div>
            <div class="module-icon-wrap" style="background:${m.gradient};opacity:0.5">${m.icon}</div>
            <div class="module-card-title">${m.name}</div>
            <div class="module-card-subtitle">${m.vietnameseName}</div>
            <div style="font-size:0.8rem;color:var(--text-muted)">${m.description}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // Navigation
  container.querySelectorAll('[data-module]').forEach(card => {
    card.addEventListener('click', () => {
      window.location.hash = `/medical/${card.dataset.module}`;
    });
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        window.location.hash = `/medical/${card.dataset.module}`;
      }
    });
  });
}
