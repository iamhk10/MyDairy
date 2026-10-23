/* ΣTΣЯПITY — optional offline helper (safe to delete; the site works without it) */
const CACHE = 'eternity-v1';
const SHELL = ['./', './index.html'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;           // never touch GitHub / OMDb / TMDB calls
  const isData = url.pathname.endsWith('/data.json');
  if (isData || req.mode === 'navigate') {              // network first, cached copy when offline
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(isData ? url.pathname : './', copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(isData ? url.pathname : './').then((r) => r || caches.match('./index.html')))
    );
  }
});
