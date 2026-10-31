/* MyDairy PWA: service worker, install button, update prompt */
(function () {
  'use strict';
  const btn = document.getElementById('install'), M = window.MD;
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  let deferred = null;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  const dismissed = () => sessionStorage.getItem('mydairy.noinstall') === '1';
  function show() { btn.hidden = standalone() || dismissed(); }
  show();
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; show(); });
  window.addEventListener('appinstalled', () => { deferred = null; btn.hidden = true; M.toast('MyDairy installed 🎉'); });
  btn.addEventListener('click', async e => {
    if (e.target.id === 'inX') { sessionStorage.setItem('mydairy.noinstall', '1'); btn.hidden = true; return; }
    if (deferred) { deferred.prompt(); await deferred.userChoice; deferred = null; show(); return; }
    const d = document.getElementById('dlg');
    d.innerHTML = `<div class="dh"><button class="x" data-close aria-label="Close">${M.I('x')}</button><h2>Install MyDairy</h2></div><div class="db"><p>${ios ? 'On iPhone/iPad: tap <b>Share</b>, then <b>Add to Home Screen</b>.' : 'Open the browser menu (⋮) and choose <b>Install app</b> or <b>Add to Home screen</b>. The install option appears only when the app is served over HTTPS (or localhost).'}</p></div>`;
    d.showModal();
  });
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.addEventListener('updatefound', () => { const w = reg.installing; w && w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) M.toast('New version ready — reload to update'); }); });
    }).catch(() => {});
  }
  window.addEventListener('online', () => M.toast('Back online'));
  window.addEventListener('offline', () => M.toast('You are offline — MyDairy still works'));
})();
