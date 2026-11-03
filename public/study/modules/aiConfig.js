/**
 * Gemini AI Configuration & Status Modal
 */

import gemini from '../utils/gemini.js';
import { showToast } from '../utils/helpers.js';

export function openGeminiConfigModal() {
  let modal = document.getElementById('gemini-config-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'gemini-config-modal';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }

  const currentKey = gemini.getApiKey();
  const isConnected = gemini.hasApiKey();

  modal.innerHTML = `
    <div class="modal" style="max-width: 560px; width: 92%;">
      <div class="modal-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-glass); padding-bottom:12px; margin-bottom:16px;">
        <span class="modal-title" style="font-size:1.15rem; font-weight:800; color:var(--text-primary); display:flex; align-items:center; gap:8px;">
          🤖 Cấu hình Google Gemini AI
          <span id="gemini-status-badge" class="chip ${isConnected ? 'chip-purple' : ''}" style="font-size:0.75rem; font-weight:700;">
            ${isConnected ? '🟢 Đã kích hoạt' : '⚪ Chưa kết nối'}
          </span>
        </span>
        <button class="btn btn-ghost btn-icon" id="btn-close-gemini-modal" style="font-size:1.2rem; cursor:pointer;">✕</button>
      </div>

      <div class="modal-body">
        <p class="text-sm text-secondary mb-md" style="line-height:1.6;">
          Kết nối trực tiếp với <strong>Google Gemini AI (3.8 Flash / 3.6 Flash)</strong> để mở khóa các tính năng thông minh: 
          <em>Chấm bài luận VSTEP chi tiết, sửa lỗi ngữ pháp trực tiếp, nâng cấp câu B2/C1 và phân tích phát âm</em>.
        </p>

        <!-- API Key Input -->
        <div class="mb-md">
          <label class="text-xs font-bold text-muted mb-xs" style="display:block">GOOGLE GEMINI API KEY:</label>
          <div style="display:flex; gap:8px; align-items:center;">
            <input 
              type="password" 
              id="gemini-api-key-input" 
              class="search-input" 
              style="margin-bottom:0; font-family:monospace; font-size:0.9rem;" 
              placeholder="Dán mã API Key (AIzaSy... hoặc AQ....)" 
              value="${currentKey}"
            />
            <button class="btn btn-secondary btn-sm" id="btn-toggle-key-visibility" title="Ẩn/Hiện key" style="padding:8px 12px;">👁️</button>
          </div>
          <div class="text-xs text-muted mt-xs">
            👉 Chưa có key? Lấy miễn phí tại: <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:var(--purple); font-weight:700; text-decoration:underline;">Google AI Studio (Miễn phí 100%)</a>
          </div>
        </div>

        <!-- Connection Test Result -->
        <div id="gemini-test-result" class="hidden mb-md" style="padding:10px 14px; border-radius:8px; font-size:0.85rem;"></div>

        <!-- Benefits Unlocked List -->
        <div class="glass-card-sm mb-lg" style="padding:14px; background:rgba(99,102,241,0.03); border:1px solid rgba(99,102,241,0.15); border-radius:10px;">
          <div class="text-xs font-bold text-accent mb-xs" style="color:var(--purple); text-transform:uppercase;">✨ Tính năng được AI hỗ trợ:</div>
          <ul style="margin:0; padding-left:18px; font-size:0.82rem; color:var(--text-secondary); line-height:1.6;">
            <li>📝 <strong>Writing Examiner:</strong> Chấm điểm chi tiết theo 4 tiêu chí VSTEP + viết lại bài mẫu 8.0</li>
            <li>🔍 <strong>Live Grammar Checker:</strong> Bắt lỗi ngữ pháp, chia thì, chính tả theo thời gian thực</li>
            <li>🚀 <strong>B2 Sentence Upgrader:</strong> Biến câu nói đơn giản thành câu phức học thuật</li>
            <li>🗣️ <strong>Speaking AI Coach:</strong> Nhận xét và gợi ý từ vựng phản xạ trực tiếp</li>
          </ul>
        </div>

        <!-- Actions -->
        <div class="flex justify-between items-center flex-wrap gap-sm">
          <div class="flex gap-sm">
            <button class="btn btn-primary btn-sm" id="btn-save-gemini-key">💾 Lưu & Kết nối</button>
            <button class="btn btn-secondary btn-sm" id="btn-test-gemini-key">⚡ Kiểm tra Key</button>
          </div>
          ${currentKey ? '<button class="btn btn-ghost btn-sm" id="btn-remove-gemini-key" style="color:#ef4444; font-size:0.8rem;">Xóa Key</button>' : ''}
        </div>
      </div>
    </div>
  `;

  modal.classList.add('show');

  const keyInput = modal.querySelector('#gemini-api-key-input');
  const btnToggle = modal.querySelector('#btn-toggle-key-visibility');
  const btnSave = modal.querySelector('#btn-save-gemini-key');
  const btnTest = modal.querySelector('#btn-test-gemini-key');
  const btnRemove = modal.querySelector('#btn-remove-gemini-key');
  const testResult = modal.querySelector('#gemini-test-result');
  const closeBtn = modal.querySelector('#btn-close-gemini-modal');
  const statusBadge = modal.querySelector('#gemini-status-badge');

  btnToggle.addEventListener('click', () => {
    keyInput.type = keyInput.type === 'password' ? 'text' : 'password';
  });

  closeBtn.addEventListener('click', () => modal.classList.remove('show'));
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('show'); });

  btnSave.addEventListener('click', () => {
    const key = keyInput.value.trim();
    gemini.setApiKey(key);
    updateNavAIStatus();
    showToast('Đã lưu cấu hình Gemini API Key!', 'success');
    modal.classList.remove('show');
  });

  btnTest.addEventListener('click', async () => {
    const key = keyInput.value.trim();
    if (!key) {
      showToast('Vui lòng nhập API Key trước khi kiểm tra.', 'warning');
      return;
    }
    btnTest.disabled = true;
    btnTest.textContent = 'Đang kiểm tra...';
    testResult.classList.remove('hidden');
    testResult.style.background = '#f1f5f9';
    testResult.style.color = 'var(--text-secondary)';
    testResult.textContent = '⏳ Đang kết nối tới máy chủ Google Gemini...';

    try {
      const result = await gemini.testConnection(key);
      testResult.style.background = '#ecfdf5';
      testResult.style.color = '#047857';
      testResult.innerHTML = `✅ <strong>Kết nối thành công!</strong> Model phản hồi: <code>${result.model}</code> (Tự động ưu tiên <code>gemini-3.8-flash</code> khi máy chủ thông thoáng).`;
      statusBadge.className = 'chip chip-purple';
      statusBadge.textContent = '🟢 Đã kích hoạt';
    } catch (err) {
      testResult.style.background = '#fef2f2';
      testResult.style.color = '#b91c1c';
      testResult.innerHTML = `❌ <strong>Kết nối thất bại:</strong> ${err.message}`;
    } finally {
      btnTest.disabled = false;
      btnTest.textContent = '⚡ Kiểm tra Key';
    }
  });

  btnRemove?.addEventListener('click', () => {
    gemini.clearApiKey();
    keyInput.value = '';
    updateNavAIStatus();
    statusBadge.className = 'chip';
    statusBadge.textContent = '⚪ Chưa kết nối';
    showToast('Đã xóa Gemini API Key.', 'info');
  });
}

export function updateNavAIStatus() {
  const badge = document.querySelector('#nav-ai-status-pill');
  if (!badge) return;
  const isConnected = gemini.hasApiKey();
  if (isConnected) {
    badge.innerHTML = '🤖 <span style="color:#10b981">● AI Sẵn sàng</span>';
    badge.title = 'Google Gemini AI đang hoạt động';
  } else {
    badge.innerHTML = '🤖 <span>Cài đặt AI</span>';
    badge.title = 'Click để nhập Gemini API Key';
  }
}

export default { openGeminiConfigModal, updateNavAIStatus };
