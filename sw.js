const CACHE = 'training-v4';
const ASSETS = ['./index.html', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});

// Background timer via service worker messages
let timerInterval = null;
let timerRemaining = 0;
let timerTotal = 0;

self.addEventListener('message', e => {
  if (e.data.type === 'START_TIMER') {
    timerRemaining = e.data.seconds;
    timerTotal = e.data.seconds;
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      timerRemaining--;
      // Broadcast to all clients
      self.clients.matchAll().then(clients => {
        clients.forEach(client => client.postMessage({
          type: 'TIMER_TICK',
          remaining: timerRemaining,
          total: timerTotal
        }));
      });
      if (timerRemaining <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        self.clients.matchAll().then(clients => {
          clients.forEach(client => client.postMessage({ type: 'TIMER_DONE' }));
        });
        // Show notification if app is in background
        self.registration.showNotification('Rest complete!', {
          body: 'Time to get back to work 💪',
          icon: './icon-192.png',
          badge: './icon-192.png',
          vibrate: [300, 100, 300, 100, 500],
          tag: 'rest-timer',
          requireInteraction: false
        });
      }
    }, 1000);
  }
  if (e.data.type === 'STOP_TIMER') {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
  }
  if (e.data.type === 'SCHEDULE_REMINDER') {
    // Store reminder preferences
  }
});
