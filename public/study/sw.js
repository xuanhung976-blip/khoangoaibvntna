const CACHE_NAME = 'english-master-v8';
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './assets/icons/icon-72.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './utils/storage.js',
  './utils/router.js',
  './utils/helpers.js',
  './utils/flashcardEngine.js',
  './utils/quizEngine.js',
  './utils/statisticsEngine.js',
  './data/medical/medicalRegistry.js',
  './data/medical/common/abbreviations.js',
  './data/medical/common/clinicalPhrases.js',
  './data/medical/thyroid/vocabulary.js',
  './data/medical/thyroid/vocabulary_extra.js',
  './data/medical/thyroid/quiz.js',
  './data/medical/thyroid/cases.js',
  './data/medical/thyroid/topics.js',
  './data/medical/diabetes/vocabulary.js',
  './data/medical/diabetes/vocabulary_extra.js',
  './data/medical/diabetes/quiz.js',
  './data/medical/diabetes/cases.js',
  './data/medical/diabetes/topics.js',
  './data/vstep.js',
  './data/vstep/vocabulary.js',
  './data/vstep/vocabulary_oxford.js',
  './data/vstep/grammar.js',
  './data/vstep/reading.js',
  './data/vstep/writing.js',
  './data/aptis.js',
  './data/aptis/vocabulary.js',
  './data/aptis/grammar.js',
  './data/aptis/speaking.js',
  './modules/dashboard.js',
  './modules/translator.js',
  './modules/statistics.js',
  './modules/flashcard.js',
  './modules/quiz.js',
  './modules/vstep.js',
  './modules/aptis.js',
  './modules/medical/medical.js',
  './modules/medical/medicalModule.js',
  './modules/medical/medicalFlashcard.js',
  './modules/medical/medicalQuiz.js',
  './modules/medical/medicalCases.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(STATIC_ASSETS.map(url => cache.add(url).catch(() => {})));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  // Ignore non-http/https requests (like chrome-extension) to prevent TypeError caching errors
  if (!request.url.startsWith('http')) return;
  // Translation API - network only
  if (request.url.includes('api.mymemory.translated.net')) {
    event.respondWith(fetch(request).catch(() => new Response(JSON.stringify({ error: 'offline' }), { headers: { 'Content-Type': 'application/json' } })));
    return;
  }
  // Network-First strategy: Always fetch latest updates from server, fallback to cache when offline
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
