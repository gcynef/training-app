const CACHE = 'training-v5';
const ASSETS = ['./index.html', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});

// ── Background rest timer ──────────────────────────────────────────────────
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
      broadcast({ type: 'TIMER_TICK', remaining: timerRemaining, total: timerTotal });
      if (timerRemaining <= 0) {
        clearInterval(timerInterval); timerInterval = null;
        broadcast({ type: 'TIMER_DONE' });
        self.registration.showNotification('Rest complete! 💪', {
          body: 'Time to get back to work',
          icon: './icon-192.png',
          vibrate: [300, 100, 300, 100, 500],
          tag: 'rest-timer',
          requireInteraction: false
        });
      }
    }, 1000);
  }
  if (e.data.type === 'STOP_TIMER') {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  }
  if (e.data.type === 'CHECK_REMINDERS') {
    checkReminders(e.data.reminders);
  }
});

function broadcast(msg) {
  self.clients.matchAll({ includeUncontrolled: true }).then(clients => {
    clients.forEach(c => c.postMessage(msg));
  });
}

// ── Reminder checking ──────────────────────────────────────────────────────
let lastReminderFired = {};
function checkReminders(reminders) {
  if (!reminders) return;
  const now = new Date();
  const hhmm = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
  const todayKey = now.toDateString();

  if (reminders.morning && hhmm === reminders.morningTime) {
    const key = 'morning_' + todayKey;
    if (!lastReminderFired[key]) {
      lastReminderFired[key] = true;
      self.registration.showNotification('Morning mobility routine 🌅', {
        body: '15–20 min · McGill Big 3, hip & thoracic, shoulder & neck',
        icon: './icon-192.png', tag: 'morning-reminder', requireInteraction: false
      });
    }
  }
  if (reminders.evening && hhmm === reminders.eveningTime) {
    const key = 'evening_' + todayKey;
    if (!lastReminderFired[key]) {
      lastReminderFired[key] = true;
      self.registration.showNotification('Evening wind-down routine 🌙', {
        body: '10 min · Decompress and recover for tomorrow',
        icon: './icon-192.png', tag: 'evening-reminder', requireInteraction: false
      });
    }
  }
}
