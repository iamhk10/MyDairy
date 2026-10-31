/* MyDairy service worker: offline app shell */
const V = 'mydairy-v5';
const SHELL = ['./', 'index.html', 'css/style.css', 'js/icons.js', 'js/data.js', 'js/app.js', 'js/jarvis.js', 'js/cloud.js', 'js/pwa.js',
  'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || u.pathname.includes('/api/')) return;
  e.respondWith(caches.match(r).then(hit => {
    const net = fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); } return res; });
    return hit || net.catch(() => r.mode === 'navigate' ? caches.match('index.html') : Response.error());
  }));
});
self.addEventListener('message', e => { if (e.data === 'skip') self.skipWaiting(); });
