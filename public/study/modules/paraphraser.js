/**
 * Smart Paraphraser & B2 Upgrader ("QuillBot" for VSTEP Candidates)
 * Powered by Gemini AI with offline rule-based fallback
 */

import gemini from '../utils/gemini.js';
import { showToast, speak } from '../utils/helpers.js';
import { openGeminiConfigModal } from './aiConfig.js';

// Offline rule-based transformation patterns for instant local operation
const LOCAL_TRANSFORM_PATTERNS = [
  {
    type: 'Bị động khách quan (Impersonal Passive)',
    transform: (s) => `It is widely acknowledged that ${s.replace(/^i think (that )?/i, '').replace(/^in my opinion,?/i, '').trim()}.`,
    explanationVi: 'Sử dụng cấu trúc "It is widely acknowledged that..." thay vì "I think", tăng tính khách quan học thuật cho bài thi B2.'
  },
  {
    type: 'Cấu trúc nhấn mạnh / Mệnh đề quan hệ (Cleft / Relative)',
    transform: (s) => `What plays a pivotal role in contemporary society is the fact that ${s.replace(/^i think (that )?/i, '').trim()}.`,
    explanationVi: 'Sử dụng mệnh đề "What plays a pivotal role is..." giúp câu văn mạch lạc, đạt điểm Grammatical Range.'
  },
  {
    type: 'Đảo ngữ tăng cường độ (Inversion Structure)',
    transform: (s) => `Not only does this situation exert profound effects, but it also underscores that ${s.replace(/^i think (that )?/i, '').trim()}.`,
    explanationVi: 'Sử dụng cấu trúc đảo ngữ "Not only... but also..." - một trong những cấu trúc vàng để kéo điểm B2 lên C1.'
  }
];

export function renderParaphraser(container) {
  const isAiActive = gemini.hasApiKey();

  container.innerHTML = `
    <div class="page-view animate-fade-in">
      <div class="page-header" style="margin-bottom: 24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div>
            <h2 class="page-title" style="display:flex; align-items:center; gap:8px;">
              🚀 Smart B2 Paraphraser
              <span class="chip ${isAiActive ? 'chip-purple' : ''}" id="paraphraser-mode-tag" style="font-size:0.75rem; font-weight:700;">
                ${isAiActive ? '🤖 Gemini AI Engine' : '⚡ Local Heuristic'}
              </span>
            </h2>
            <p class="page-subtitle">Nhập câu tiếng Anh thông thường (A1-B1) ➔ Tự động nâng cấp thành 3 biến thể học thuật chuẩn B2/C1</p>
          </div>
          <button class="btn btn-secondary btn-sm" id="btn-config-ai-para">
            🤖 Cài đặt Gemini AI
          </button>
        </div>
      </div>

      <!-- Input Card -->
      <div class="glass-card mb-xl">
        <label class="text-xs font-bold text-muted mb-xs" style="display:block">CÂU TIẾNG ANH GỐC CẦN NÂNG CẤP:</label>
        <textarea id="para-input" class="search-input" style="width:100%; min-height:100px; font-size:1rem; line-height:1.6; border-radius:10px; padding:14px; margin-bottom:12px; font-family:inherit;" placeholder="Ví dụ: I think regular exercise is very good for physical health."></textarea>
        
        <!-- Quick Sample Pills -->
        <div class="flex items-center gap-xs flex-wrap mb-md">
          <span class="text-xs text-muted" style="font-weight:600">Mẫu câu nhanh:</span>
          <button class="chip" data-sample="I think regular exercise is very good for physical health.">🏥 Tập thể dục</button>
          <button class="chip" data-sample="Smartphones change the way students study in university.">💻 Công nghệ học tập</button>
          <button class="chip" data-sample="Working from home saves a lot of time and money for workers.">💼 Làm việc từ xa</button>
          <button class="chip" data-sample="Pollution in big cities causes many dangerous diseases.">🌱 Ô nhiễm môi trường</button>
        </div>

        <div class="flex items-center justify-between flex-wrap gap-sm">
          <button class="btn btn-primary" id="btn-do-paraphrase" style="padding:10px 24px; font-weight:700; border-radius:10px;">
            ⚡ Nâng cấp thành câu B2/C1
          </button>
          <span class="text-xs text-muted">Hỗ trợ các cấu trúc: Bị động khách quan, Đảo ngữ, Mệnh đề quan hệ & Cụm từ học thuật</span>
        </div>
      </div>

      <!-- Results Area -->
      <div id="para-results"></div>
    </div>
  `;

  const inputEl = container.querySelector('#para-input');
  const btnDo = container.querySelector('#btn-do-paraphrase');
  const resultsEl = container.querySelector('#para-results');
  const btnConfig = container.querySelector('#btn-config-ai-para');

  btnConfig.addEventListener('click', () => {
    openGeminiConfigModal();
  });

  container.querySelectorAll('[data-sample]').forEach(btn => {
    btn.addEventListener('click', () => {
      inputEl.value = btn.dataset.sample;
      runParaphrase();
    });
  });

  btnDo.addEventListener('click', runParaphrase);

  async function runParaphrase() {
    const text = inputEl.value.trim();
    if (!text) {
      showToast('Vui lòng nhập câu cần nâng cấp.', 'warning');
      return;
    }

    btnDo.disabled = true;
    btnDo.textContent = '⏳ Đang phân tích & nâng cấp...';
    resultsEl.innerHTML = `
      <div class="glass-card text-center" style="padding:40px;">
        <div class="spinner" style="margin:0 auto 12px; width:28px; height:28px; border-width:3px;"></div>
        <p class="text-sm text-secondary">Đang phân tích cấu trúc ngữ pháp và tổng hợp biến thể B2...</p>
      </div>
    `;

    let options = [];

    // Attempt Gemini AI if key exists
    if (gemini.hasApiKey()) {
      try {
        const aiRes = await gemini.paraphraseB2(text);
        if (aiRes && aiRes.options && aiRes.options.length > 0) {
          options = aiRes.options;
        }
      } catch (err) {
        console.warn('Gemini AI fallback:', err);
      }
    }

    // Fallback to local transformation if no AI or AI failed
    if (options.length === 0) {
      options = LOCAL_TRANSFORM_PATTERNS.map(p => ({
        type: p.type,
        text: p.transform(text),
        explanationVi: p.explanationVi
      }));
    }

    btnDo.disabled = false;
    btnDo.textContent = '⚡ Nâng cấp thành câu B2/C1';

    resultsEl.innerHTML = `
      <div class="animate-fade-in">
        <h3 style="font-size:1.1rem; font-weight:800; color:var(--text-primary); margin-bottom:14px; display:flex; align-items:center; justify-content:space-between;">
          <span>🎯 3 Biến thể câu nâng cao chuẩn VSTEP B2:</span>
          <span class="text-xs text-muted" style="font-weight:400">Click nút sao chép để dùng trong bài viết</span>
        </h3>

        <div style="display:flex; flex-direction:column; gap:14px;">
          ${options.map((opt, oi) => `
            <div class="glass-card" style="padding:18px; border-left:4px solid ${oi === 0 ? 'var(--purple)' : oi === 1 ? 'var(--teal)' : '#f59e0b'};">
              <div class="flex items-center justify-between mb-sm flex-wrap gap-xs">
                <span class="chip" style="font-weight:700; font-size:0.75rem; background:#f8fafc;">
                  Cách ${oi + 1}: ${opt.type}
                </span>
                <div class="flex gap-xs">
                  <button class="btn btn-ghost btn-sm btn-speak-para" data-speak="${opt.text.replace(/"/g, '&quot;')}" title="Phát âm câu" style="font-size:0.85rem;">🔊 Nghe</button>
                  <button class="btn btn-secondary btn-sm btn-copy-para" data-copy="${opt.text.replace(/"/g, '&quot;')}" style="font-size:0.78rem;">📋 Sao chép</button>
                </div>
              </div>

              <div style="font-size:1.02rem; font-weight:600; color:var(--text-primary); line-height:1.6; margin-bottom:8px;">
                "${opt.text}"
              </div>

              <div class="text-xs text-muted" style="padding:8px 12px; background:rgba(0,0,0,0.02); border-radius:6px; line-height:1.5;">
                💡 <strong>Điểm ăn điểm:</strong> ${opt.explanationVi || 'Cấu trúc học thuật trang trọng chuẩn B2.'}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    resultsEl.querySelectorAll('.btn-speak-para').forEach(b => {
      b.addEventListener('click', () => speak(b.dataset.speak));
    });

    resultsEl.querySelectorAll('.btn-copy-para').forEach(b => {
      b.addEventListener('click', () => {
        navigator.clipboard.writeText(b.dataset.copy).then(() => {
          showToast('Đã sao chép câu vào clipboard!', 'success');
        });
      });
    });
  }

  // Pre-fill initial sample
  inputEl.value = 'I think regular exercise is very good for physical health.';
}

export default { renderParaphraser };
