// Service worker: lets the installed app open with no connection.
// - The page itself: always try the network first, so a new version shows up
//   as soon as there is a connection; fall back to the saved copy offline.
// - The AI files in ai/ (about 47 MB, they rarely change): saved on first use.
const CACHE = 'west-deck-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  const save = res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return res; };
  if (url.pathname.includes('/ai/'))
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(save)));
  else
    e.respondWith(fetch(e.request).then(save).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
