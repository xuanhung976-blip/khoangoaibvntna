export function renderMedicalCases(container, cases, mod) {
  if (!cases || cases.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><h3>Chưa có ca lâm sàng</h3></div>`;
    return;
  }

  container.innerHTML = `
    <div class="animate-fade-in">
      <p class="text-sm text-muted mb-xl">Học tiếng Anh y khoa qua các ca lâm sàng thực tế. Click từng câu hỏi để xem đáp án.</p>
      ${cases.map(c => renderCase(c, mod)).join('')}
    </div>
  `;

  // Toggle answers
  container.querySelectorAll('.case-question-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const answer = btn.nextElementSibling;
      const isOpen = answer.classList.contains('show');
      answer.classList.toggle('show', !isOpen);
      btn.querySelector('.toggle-icon').textContent = isOpen ? '▶' : '▼';
    });
  });
}

function renderCase(c, mod) {
  const badge = `badge-${(c.difficulty||'B2').toLowerCase()}`;
  return `
    <div class="case-card mb-lg">
      <div class="case-header" style="border-top:4px solid transparent;background:linear-gradient(#f8fafc, #f8fafc) padding-box, ${mod.gradient} border-box;border-radius:16px 16px 0 0">
        <div>
          <div class="case-title">${c.title}</div>
          <div class="text-xs text-muted">${mod.icon} ${mod.name} · ${c.category}</div>
        </div>
        <span class="case-badge ${badge}">${c.difficulty}</span>
      </div>
      <div class="case-body">
        <!-- Scenario -->
        <div class="case-scenario">
          <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--teal);font-weight:700;margin-bottom:8px">📝 Ca lâm sàng</div>
          ${c.scenario}
          ${c.scenarioVi ? `<div class="case-scenario-vi">🇻🇳 ${c.scenarioVi}</div>` : ''}
        </div>

        <!-- Lab Results -->
        ${c.labResults ? `
          <div class="case-labs">
            ${Object.entries(c.labResults).map(([k,v]) => `
              <div class="lab-item">
                <div class="lab-key">${k}</div>
                <div class="lab-value">${v}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- Key Terms -->
        ${c.keyTerms && c.keyTerms.length > 0 ? `
          <div class="mb-lg">
            <div class="text-xs text-muted mb-sm">🔑 Thuật ngữ chía khóa:</div>
            <div class="flex gap-sm" style="flex-wrap:wrap">
              ${c.keyTerms.map(t=>`<span class="chip active" style="font-size:0.7rem">${t}</span>`).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Questions -->
        <div class="case-questions">
          ${(c.questions||[]).map((q, i) => `
            <div class="case-question-item">
              <button class="case-question-toggle">
                <span>${i+1}. ${q.q}</span>
                <span class="toggle-icon">▶</span>
              </button>
              <div class="case-question-answer">
                ${q.a}
                ${q.hint ? `<div class="case-hint">💡 Gợi ý: ${q.hint}</div>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}
