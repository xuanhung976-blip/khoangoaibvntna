/**
 * English Master — Main Application
 * VSTEP | APTIS ESOL | Medical English
 * Architecture: Modular SPA with hash-based routing
 */

import router from './utils/router.js';
import storage from './utils/storage.js';
import { showToast } from './utils/helpers.js';

// =====================================================
// ROUTE HANDLERS (lazy loaded)
// =====================================================
async function loadDashboard() {
  const { renderDashboard } = await import('./modules/dashboard.js');
  renderDashboard(getContentEl());
}

async function loadVSTEP() {
  const { renderVSTEP } = await import('./modules/vstep.js');
  renderVSTEP(getContentEl());
}

async function loadAPTIS() {
  const { renderAPTIS } = await import('./modules/aptis.js');
  renderAPTIS(getContentEl());
}

async function loadMedicalHub() {
  const { renderMedicalHub } = await import('./modules/medical/medical.js');
  renderMedicalHub(getContentEl());
}

async function loadMedicalModule(params) {
  const moduleId = params?.module || 'thyroid';
  const { renderMedicalModule } = await import('./modules/medical/medicalModule.js');
  await renderMedicalModule(getContentEl(), moduleId);
}

async function loadTranslator() {
  const { renderTranslator } = await import('./modules/translator.js');
  renderTranslator(getContentEl());
}

async function loadStatistics() {
  const { renderStatistics } = await import('./modules/statistics.js');
  renderStatistics(getContentEl());
}

async function loadProfiler() {
  const { renderProfiler } = await import('./modules/profiler.js');
  renderProfiler(getContentEl());
}

async function loadParaphraser() {
  const { renderParaphraser } = await import('./modules/paraphraser.js');
  renderParaphraser(getContentEl());
}

async function loadMockExam() {
  const { renderMockExam } = await import('./modules/mockExam.js');
  renderMockExam(getContentEl());
}

async function loadAITutor() {
  const { renderAITutor } = await import('./modules/aiTutor.js');
  renderAITutor(getContentEl());
}

async function loadListening() {
  const { renderListeningStudio } = await import('./modules/vstepListening.js');
  renderListeningStudio(getContentEl());
}

// =====================================================
// ROUTER SETUP
// =====================================================
function setupRouter() {
  router
    .register('/', loadDashboard)
    .register('/dashboard', loadDashboard)
    .register('/vstep', loadVSTEP)
    .register('/listening', loadListening)
    .register('/ai-tutor', loadAITutor)
    .register('/aptis', loadAPTIS)
    .register('/mock-exam', loadMockExam)
    .register('/medical', loadMedicalHub)
    .register('/medical/:module', loadMedicalModule)
    .register('/profiler', loadProfiler)
    .register('/paraphraser', loadParaphraser)
    .register('/translator', loadTranslator)
    .register('/statistics', loadStatistics);

  // Update nav on route change
  router.beforeEach = (hash) => {
    updateActiveNav(hash);
    scrollToTop();
  };

  router.start('/');
}

// =====================================================
// SIDEBAR NAV
// =====================================================
function setupSidebar() {
  // Nav item clicks
  document.querySelectorAll('[data-route]').forEach(item => {
    item.addEventListener('click', () => {
      const route = item.dataset.route;
      router.navigate(route);
      closeSidebarMobile();
    });
  });

  // Hamburger
  const hamburger = document.getElementById('hamburger');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  hamburger?.addEventListener('click', () => toggleSidebarMobile());
  hamburger?.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') toggleSidebarMobile(); });
  overlay?.addEventListener('click', closeSidebarMobile);

  // Gemini AI Status Pill & Config
  import('./modules/aiConfig.js').then(({ updateNavAIStatus, openGeminiConfigModal }) => {
    updateNavAIStatus();
    document.getElementById('nav-ai-status-pill')?.addEventListener('click', openGeminiConfigModal);
  });
}

function toggleSidebarMobile() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const hamburger = document.getElementById('hamburger');
  const isOpen = sidebar.classList.contains('open');
  if (isOpen) {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
    hamburger.classList.remove('active');
  } else {
    sidebar.classList.add('open');
    overlay.classList.add('show');
    hamburger.classList.add('active');
  }
}

function closeSidebarMobile() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('show');
  document.getElementById('hamburger')?.classList.remove('active');
}

function updateActiveNav(hash) {
  document.querySelectorAll('.nav-item').forEach(item => {
    const route = item.dataset.route;
    const isActive = route && (hash === route || hash.startsWith(route + '/') && route !== '/');
    item.classList.toggle('active', isActive);
  });
}

// =====================================================
// ONLINE STATUS
// =====================================================
function setupOnlineStatus() {
  const dot = document.getElementById('status-dot');
  const text = document.getElementById('status-text');

  function update() {
    const online = navigator.onLine;
    dot?.classList.toggle('offline', !online);
    if (text) text.textContent = online ? 'Online' : 'Offline';
  }

  window.addEventListener('online', () => { update(); showToast('✅ Đã kết nối Internet', 'success'); });
  window.addEventListener('offline', () => { update(); showToast('📴 Mất kết nối Internet', 'warning'); });
  update();
}

// =====================================================
// PARTICLE BACKGROUND
// =====================================================
function setupParticles() {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let particles = [];
  let animFrame;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function createParticle() {
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 0.5,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.4 + 0.1,
      color: Math.random() > 0.5 ? '108, 99, 255' : '0, 212, 212',
    };
  }

  function initParticles() {
    const count = Math.floor((canvas.width * canvas.height) / 12000);
    particles = Array.from({ length: Math.min(count, 80) }, createParticle);
  }

  function drawParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color}, ${p.opacity})`;
      ctx.fill();

      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
    });
    animFrame = requestAnimationFrame(drawParticles);
  }

  window.addEventListener('resize', () => { resize(); initParticles(); });
  resize();
  initParticles();
  drawParticles();
}

// =====================================================
// SERVICE WORKER
// =====================================================
async function setupServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw.js');
      console.log('[SW] Registered');
    } catch (e) {
      console.warn('[SW] Registration failed:', e);
    }
  }
}

// =====================================================
// LOADING SCREEN
// =====================================================
function showLoadingScreen() {
  const content = document.getElementById('page-content');
  if (content) {
    content.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;gap:24px">
        <div style="font-size:4rem">📚</div>
        <div class="spinner" style="width:48px;height:48px"></div>
        <div style="font-size:1.1rem;font-weight:600;background:var(--gradient-primary);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">English Master</div>
        <div style="font-size:0.85rem;color:var(--text-muted)">Đang tải ứng dụng...</div>
      </div>
    `;
  }
}

// =====================================================
// HELPERS
// =====================================================
function getContentEl() {
  return document.getElementById('page-content');
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Make storage accessible globally for components that need it
window.__storage = storage;

// =====================================================
// MAIN INIT
// =====================================================
document.addEventListener('DOMContentLoaded', async () => {
  // Force clear browser cache and unregister old service worker if cache version bumped
  const CACHE_VERSION = 'english-master-v8';
  if (localStorage.getItem('app_cache_ver') !== CACHE_VERSION) {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (let r of regs) {
          await r.unregister();
        }
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        for (let k of keys) {
          await caches.delete(k);
        }
      }
      localStorage.setItem('app_cache_ver', CACHE_VERSION);
      console.log('[Cache] Cache cleared and Service Worker unregistered. Reloading...');
      window.location.reload();
      return;
    } catch (e) {
      console.warn('Failed to force clear cache:', e);
    }
  }

  console.log('[App] Initializing English Master...');

  // Show loading
  showLoadingScreen();

  // Setup all subsystems
  setupParticles();
  setupSidebar();
  setupOnlineStatus();

  // Register service worker (non-blocking)
  setupServiceWorker();

  // Start router (this triggers first page render)
  setupRouter();

  console.log('[App] Ready ✅');
});
