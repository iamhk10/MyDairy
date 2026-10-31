/* MyDairy — app logic: state, views, rail, dialogs */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const I = window.MD_ICON;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const C = window.MD_DATA.map(a => ({ id: a[0], t: a[1], y: a[2], type: a[3], g: a[4].split('/'), r: a[5], h: a[6], pop: a[7], tr: a[8], m: a[9], d: a[10] }));
  const by = Object.fromEntries(C.map(c => [c.id, c]));
  const KEY = 'mydairy.v1', ACC = [['Violet', '#8b5cf6', '#c026d3'], ['Ocean', '#3b82f6', '#06b6d4'], ['Rose', '#ec4899', '#f43f5e'], ['Emerald', '#10b981', '#22d3ee'], ['Amber', '#f59e0b', '#ef4444']];
  const TYPE = { movie: 'Movie', tv: 'TV Show', anime: 'Anime' }, ST = { will: 'Watchlist', watching: 'Watching', watched: 'Watched', hold: 'On hold', never: 'Never' };
  const T0 = Date.now(), DAY = 864e5;
  let S = (() => {
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.lib) return s; } catch (e) {}
    return { name: '', theme: 'dark', acc: 0, key: '', tab: 'movies', bellRead: false, lib: {
      inception: { st: 'watched', my: 9, at: T0 - 9 * DAY }, darkknight: { st: 'watched', my: 10, at: T0 - 7 * DAY }, chernobyl: { st: 'watched', fav: 1, my: 10, at: T0 - 5 * DAY },
      breakingbad: { st: 'watched', fav: 1, my: 10, at: T0 - 4 * DAY }, rickmorty: { st: 'watched', my: 9, at: T0 - 2 * DAY }, loki: { st: 'watched', fav: 1, my: 8, at: T0 - DAY },
      wanda: { st: 'watching', p: 38, at: T0 - 3600e3 }, stranger: { st: 'will', at: T0 - 6e5 }, dune2: { st: 'will', at: T0 - 5e5 } } };
  })();
  if (S.name === 'Himanshu') S.name = '';
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} window.MD && window.MD.cloud && window.MD.cloud.queue(); };
  const L = id => S.lib[id] || {}, fm = m => m >= 60 ? Math.floor(m / 60) + 'h' + (m % 60 ? ' ' + (m % 60) + 'm' : '') : m + 'm';
  const mins = () => Object.entries(S.lib).reduce((a, [id, l]) => a + (by[id] ? (l.st === 'watched' ? by[id].m : l.st === 'watching' ? by[id].m * (l.p || 0) / 100 : 0) : 0), 0);
  const stats = () => { const w = C.filter(c => L(c.id).st === 'watched'); return { movies: w.filter(c => c.type === 'movie').length, series: w.filter(c => c.type !== 'movie').length, hours: Math.round(mins() / 60), w }; };

  function toast(m) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; $('#toasts').appendChild(t); setTimeout(() => t.remove(), 2800); }

  /* ---------- theme / accent ---------- */
  function applyLook() {
    const a = ACC[S.acc] || ACC[0], r = document.documentElement;
    r.dataset.theme = S.theme; r.style.setProperty('--ac', a[1]); r.style.setProperty('--ac2', a[2]);
    const m = $('meta[name=theme-color]'); if (m) m.content = S.theme === 'dark' ? '#0b0720' : '#f4f1ff';
  }

  /* ---------- pieces ---------- */
  const card = c => { const l = L(c.id); return `<article class="card" data-id="${c.id}" tabindex="0"><div class="poster ${c.p ? 'hasimg' : ''}" style="--h:${c.h}">${c.p ? `<img class="pimg" loading="lazy" alt="" src="${esc(c.p)}" onerror="this.remove()">` : ''}<i class="ini">${esc(c.t.replace(/^The /, '')[0])}</i><span class="rt">${I('star')}${c.r.toFixed(1)}</span><button class="add ${l.st === 'will' ? 'on' : ''}" data-act="will" aria-label="Toggle watchlist">${I(l.st === 'will' ? 'check' : 'plus')}</button><div class="pi"><div class="gs">${c.g.slice(0, 2).map(g => `<em>${esc(g)}</em>`).join('')}</div><b>${esc(c.t)}</b></div>${l.st === 'watching' ? `<div class="prog"><i style="width:${l.p || 0}%"></i></div>` : ''}</div></article>`; };
  const row = l => `<div class="row">${l.map(card).join('')}</div>`;
  const grid = l => l.length ? `<div class="grid">${l.map(card).join('')}</div>` : '';
  const sec = (ic, title, extra, body, more) => `<div class="sh"><h2>${I(ic)}${title}</h2>${extra || ''}${more ? `<a class="more" href="${more}">See All ${I('right')}</a>` : ''}</div>${body}`;
  const empty = m => `<div class="empty">${m}</div>`;
  const head = (t, s) => `<div class="sh"><h2>${t}</h2><span style="color:var(--mu)">${s || ''}</span></div>`;
  const pool = () => C.filter(c => S.tab === 'movies' ? c.type === 'movie' : S.tab === 'tv' ? c.type === 'tv' : S.tab === 'anime' ? c.type === 'anime' : true);
  function recs(n) {
    const liked = {}; C.forEach(c => { const l = L(c.id); if (l.fav || l.my >= 8 || l.st === 'watched') c.g.forEach(g => liked[g] = (liked[g] || 0) + (l.fav ? 2 : 1)); });
    return C.filter(c => !L(c.id).st).map(c => [c, c.r + c.g.reduce((a, g) => a + (liked[g] || 0) * .35, 0)]).sort((a, b) => b[1] - a[1]).slice(0, n || 10).map(x => x[0]);
  }

  /* ---------- views ---------- */
  let slide = 0, timer = null, genre = 'All', sort = 'rating', q = '';
  const V = {
    home() {
      if (!C.length) return empty('Your diary is empty. ' + (window.MD && window.MD.cloud && window.MD.cloud.owner ? 'Use “Add title” to search OMDb / TMDB.' : 'The owner has not added any titles yet.'));
      const top = [...pool()].sort((a, b) => b.tr - a.tr).slice(0, 4);
      const hero = `<section class="hero" aria-roledescription="carousel">${top.map((c, i) => `<div class="s ${i === slide ? 'on' : ''}" data-id="${c.id}" style="--h:${c.h}"><div class="hc"><div class="badge">${c.type === 'movie' ? 'MOVIE' : '<b>▶</b> SERIES'}</div><h1 class="ht ${c.t.length > 20 ? 'l' : ''}">${esc(c.t.toUpperCase())}</h1><p>${esc(c.d)}</p><div class="meta">${I('star')} ${c.r.toFixed(1)}/10 <em>${esc(c.g[0])}</em><em>${c.y}</em><em>${fm(c.m > 4000 ? 60 : c.m)}</em></div><div class="acts"><button class="btn p" data-act="watching">${I('play')} Watch Now</button><button class="btn" data-act="will">${I('plus')} Add to Watchlist</button></div></div><div class="art">${c.p ? `<img src="${esc(c.p)}" alt="" onerror="this.remove()">` : `<i>${esc(c.t.replace(/^The /, '')[0])}</i>`}</div></div>`).join('')}<button class="hn l" data-hero="-1" aria-label="Previous">${I('left')}</button><button class="hn r" data-hero="1" aria-label="Next">${I('right')}</button><div class="dots">${top.map((_, i) => `<button class="${i === slide ? 'on' : ''}" data-dot="${i}" aria-label="Slide ${i + 1}"></button>`).join('')}</div></section>`;
      const pop = [...pool()].sort((a, b) => b.pop - a.pop), tr = [...pool()].sort((a, b) => b.tr - a.tr);
      return hero + sec('star', 'Popular on MyDairy', `<span class="pill">${I('flame')} Trending Now</span>`, row(pop)) + sec('trend', 'Trending Now', '', row(tr), '#/discover') + sec('spark', S.name ? `Picked for ${esc(S.name)}` : 'Picked for you', '', row(recs(10)));
    },
    discover() {
      const gs = ['All', ...new Set(C.flatMap(c => c.g))].sort((a, b) => a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b));
      let l = C.filter(c => genre === 'All' || c.g.includes(genre)); l.sort((a, b) => sort === 'rating' ? b.r - a.r : sort === 'new' ? b.y - a.y : b.pop - a.pop);
      return head('Discover', C.length + ' titles') + `<div class="chips">${gs.map(g => `<button class="${g === genre ? 'on' : ''}" data-genre="${esc(g)}">${esc(g)}</button>`).join('')}</div><div class="chips">${[['rating', 'Top rated'], ['pop', 'Most popular'], ['new', 'Newest']].map(s => `<button class="${sort === s[0] ? 'on' : ''}" data-sort="${s[0]}">${s[1]}</button>`).join('')}</div>` + grid(l);
    },
    movies: () => head('Movies') + grid(C.filter(c => c.type === 'movie').sort((a, b) => b.pop - a.pop)),
    tv: () => head('TV Shows') + grid(C.filter(c => c.type === 'tv').sort((a, b) => b.pop - a.pop)),
    anime: () => head('Anime') + grid(C.filter(c => c.type === 'anime').sort((a, b) => b.pop - a.pop)),
    favorites() { const l = C.filter(c => L(c.id).fav); return head('Favorites', l.length + ' saved') + (l.length ? grid(l) : empty('Tap ♥ inside any title to save it here.')); },
    watchlist() {
      const w = C.filter(c => L(c.id).st === 'watching'), n = C.filter(c => L(c.id).st === 'will');
      return head('Watchlist', (w.length + n.length) + ' titles') + (w.length ? sec('play', 'Watching now', '', grid(w)) : '') + (n.length ? sec('bookmark', 'Up next', '', grid(n)) : '') + (w.length + n.length ? '' : empty('Your watchlist is empty. Hit + on any poster, or ask Jarvis for a pick.'));
    },
    history() {
      const l = C.filter(c => L(c.id).st).sort((a, b) => L(b.id).at - L(a.id).at);
      return head('History', l.length + ' entries') + (l.length ? `<div class="hl">${l.map(c => `<div class="it" data-id="${c.id}"><span class="sq" style="--h:${c.h}"></span><div><b>${esc(c.t)}</b><br><small>${ST[L(c.id).st]} • ${new Date(L(c.id).at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}${L(c.id).my ? ' • you rated ' + L(c.id).my + '/10' : ''}</small></div></div>`).join('')}</div>` : empty('Nothing yet. Start watching something!'));
    },
    downloads: () => head('Backup & offline', 'Your diary lives on this device') + `<div class="cols"><div class="big"><b>${Object.keys(S.lib).length}</b>titles saved<br><br><button class="btn p" data-do="export">${I('download')} Export backup</button></div><div class="big"><b>PWA</b>Install MyDairy to use it offline.<br><br><button class="btn" data-do="import">${I('plus')} Import backup</button></div></div><input type="file" id="imp" accept="application/json" hidden>`,
    playlists() {
      const gs = {}; C.forEach(c => c.g.forEach(g => (gs[g] = gs[g] || []).push(c)));
      return head('Playlists', 'Auto-made from genres') + `<div class="cols">${Object.entries(gs).sort((a, b) => b[1].length - a[1].length).map(([g, l]) => `<button class="big" data-genre="${esc(g)}" data-go="discover" style="text-align:left"><b>${l.length}</b>${esc(g)}</button>`).join('')}</div>`;
    },
    statistics() {
      const s = stats(), gs = {}; s.w.forEach(c => c.g.forEach(g => gs[g] = (gs[g] || 0) + 1));
      const rated = Object.values(S.lib).filter(l => l.my), avg = rated.length ? (rated.reduce((a, l) => a + l.my, 0) / rated.length).toFixed(1) : '–', mx = Math.max(1, ...Object.values(gs));
      const cnt = k => Object.values(S.lib).filter(l => l.st === k).length;
      return head('Statistics') + `<div class="cols"><div class="big"><b>${s.movies}</b>Movies watched</div><div class="big"><b>${s.series}</b>Series & anime</div><div class="big"><b>${s.hours}h</b>Time watched</div><div class="big"><b>${avg}</b>Your average rating</div><div class="big"><b>${cnt('watching')}</b>In progress</div><div class="big"><b>${cnt('will')}</b>In watchlist</div></div>` + sec('chart', 'Favourite genres', '', Object.entries(gs).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([g, n]) => `<div class="gb"><span>${esc(g)}</span><div class="bar"><i style="width:${n / mx * 100}%"></i></div><b>${n}</b></div>`).join('') || empty('Mark titles as watched to see your taste.'));
    },
    settings() {
      return head('Settings') + `<div class="db" style="max-width:520px;padding:0"><label class="field">Display name (optional)<input id="sName" value="${esc(S.name)}" maxlength="30" placeholder="Leave empty to stay anonymous"></label><label class="field">Gemini API key (optional)<input id="sKey" type="password" value="${esc(S.key)}" placeholder="AIza…" autocomplete="off"><small>Jarvis already answers offline. Add a free key from aistudio.google.com/apikey to let him chat about anything. It stays only on this device.</small></label><div class="field">Accent colour<div class="chips">${ACC.map((a, i) => `<button class="${i === S.acc ? 'on' : ''}" data-acc="${i}">${a[0]}</button>`).join('')}</div></div><div class="acts"><button class="btn" data-do="theme">${I(S.theme === 'dark' ? 'sun' : 'moon')} Switch theme</button><button class="btn" data-do="reset">${I('x')} Reset diary</button></div></div>`;
    },
    search() { const n = q.toLowerCase(), l = C.filter(c => (c.t + ' ' + c.g.join(' ') + ' ' + c.y + ' ' + TYPE[c.type]).toLowerCase().includes(n)); return head('Results for “' + esc(q) + '”', l.length + ' found') + (l.length ? grid(l) : empty('No match. Try a genre like “comedy” or a year.')); }
  };
  const NAV = [['home', 'home', 'Home'], ['discover', 'compass', 'Discover'], ['movies', 'film', 'Movies'], ['tv', 'tv', 'TV Shows'], ['anime', 'anime', 'Anime'], ['favorites', 'heart', 'Favorites'], ['watchlist', 'bookmark', 'Watchlist'], ['downloads', 'download', 'Downloads'], ['history', 'history', 'History'], ['playlists', 'list', 'Playlists'], ['statistics', 'chart', 'Statistics']];
  const TABS = [['movies', 'film', 'Movies'], ['tv', 'tv', 'TV Shows'], ['anime', 'anime', 'Anime'], ['trending', 'flame', 'Trending'], ['popular', 'star', 'Popular']];

  function chrome() {
    const route = cur();
    $('#nav').innerHTML = NAV.map(n => `<a href="#/${n[0]}" data-r="${n[0]}" class="${route === n[0] ? 'on' : ''}">${I(n[1])}${n[2]}${n[0] === 'watchlist' ? `<em>${C.filter(c => ['will', 'watching'].includes(L(c.id).st)).length}</em>` : ''}</a>`).join('');
    $('#nav2').innerHTML = `<a href="#/settings" data-r="settings" class="${route === 'settings' ? 'on' : ''}">${I('gear')}Settings</a><a href="#" data-do="accent">${I('palette')}Appearance</a><a href="#" data-do="auth">${I('logout')}${window.MD && window.MD.cloud ? window.MD.cloud.authLabel() : 'Log Out'}</a>`;
    $('#tabs').innerHTML = TABS.map(t => `<button data-tab="${t[0]}" class="${route === 'home' && S.tab === t[0] ? 'on' : ''}">${I(t[1])}${t[2]}</button>`).join('');
    $('#avatar').textContent = (S.name || 'M')[0].toUpperCase();
    const n = $('#bellN'); n.textContent = S.bellRead ? '' : '3'; n.classList.toggle('z', S.bellRead);
  }
  const cur = () => { const r = (location.hash.replace('#/', '') || 'home').split('?')[0]; return V[r] && r !== 'search' ? r : 'home'; };
  function render() {
    clearInterval(timer); const r = q ? 'search' : cur();
    $('#view').innerHTML = V[r](); chrome(); rail();
    if (r === 'home') timer = setInterval(() => hero(1), 6500);
    $('#side').classList.remove('open');
  }
  function hero(d, to) {
    const s = $$('.hero .s'); if (!s.length) return; slide = to != null ? to : (slide + d + s.length) % s.length;
    s.forEach((e, i) => e.classList.toggle('on', i === slide)); $$('.dots button').forEach((e, i) => e.classList.toggle('on', i === slide));
  }
  function count(el, to) {
    if (matchMedia('(prefers-reduced-motion:reduce)').matches) { el.textContent = to; return; }
    const t0 = performance.now(); (function f(t) { const p = Math.min(1, (t - t0) / 800); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(f); })(t0);
  }
  function rail() {
    const w = C.filter(c => L(c.id).st === 'watching').sort((a, b) => L(b.id).at - L(a.id).at)[0], s = stats();
    $('#cont').innerHTML = `<h3>${I('play')}Continue Watching<a href="#/watchlist">See All ›</a></h3>` + (w ? `<div class="cw" data-id="${w.id}"><div class="th" style="--h:${w.h}"><button data-act="log" aria-label="Log +10% progress">${I('play')}</button></div><div style="flex:1;min-width:0"><b>${esc(w.t)}</b><small>${L(w.id).p || 0}% done • ${fm(Math.round(w.m * (100 - (L(w.id).p || 0)) / 100))} left</small><div class="bar"><i style="width:${L(w.id).p || 0}%"></i></div></div></div>` : `<p style="color:var(--mu)">Nothing in progress. Press “Watch Now” on any title.</p>`);
    $('#stats').innerHTML = `<h3>${I('chart')}Your Stats<a href="#/statistics">See More ›</a></h3><div class="st"><div>${I('film')}<b data-n="${s.movies}">0</b><small>Movies</small></div><div>${I('tv')}<b data-n="${s.series}">0</b><small>Series</small></div><div>${I('clock')}<b><span data-n="${s.hours}">0</span>h</b><small>Watched</small></div></div>`;
    $$('[data-n]').forEach(e => count(e, +e.dataset.n));
  }

  /* ---------- actions ---------- */
  function act(id, a, v) {
    if (window.MD.cloud && window.MD.cloud.locked()) { toast('Owner login required to edit this diary'); return; }
    const l = S.lib[id] = S.lib[id] || {}, c = by[id];
    if (a === 'will' || a === 'watching' || a === 'watched') { if (l.st === a && a !== 'watching' && !c.cloud) { delete l.st; toast('Removed from ' + ST[a]); } else { l.st = a; l.at = Date.now(); if (a === 'watched') l.p = 100; if (a === 'watching' && l.p == null) l.p = 5; toast(`${c.t} → ${ST[a]}`); } }
    if (a === 'fav') { l.fav = l.fav ? 0 : 1; toast(l.fav ? 'Added to Favorites' : 'Removed from Favorites'); }
    if (a === 'rate') { l.my = v; if (!l.st) { l.st = 'watched'; l.p = 100; } l.at = Date.now(); }
    if (a === 'prog') { l.p = v; l.at = Date.now(); if (v >= 100) { l.st = 'watched'; toast('Finished ' + c.t + ' 🎉'); } }
    if (a === 'log') { l.p = Math.min(100, (l.p || 0) + 10); l.at = Date.now(); if (l.p >= 100) { l.st = 'watched'; toast('Finished ' + c.t + ' 🎉'); } else toast('Progress ' + l.p + '%'); }
    if (!l.st && !l.fav && !l.my) delete S.lib[id];
    save(); render(); if ($('#dlg').open && a !== 'log') open(id);
  }
  function open(id) {
    const c = by[id], l = L(id), d = $('#dlg');
    d.innerHTML = `<div class="dh" style="--h:${c.h}"><button class="x" data-close aria-label="Close">${I('x')}</button><h2>${esc(c.t)}</h2><p>${c.y} • ${TYPE[c.type]} • ${fm(c.m > 4000 ? 60 : c.m)}${c.m > 4000 ? '/ep' : ''} • ${I('star')} ${c.r.toFixed(1)}</p></div><div class="db" data-id="${id}"><p>${esc(c.d)}</p><div class="gs">${c.g.map(g => `<em style="background:var(--sf2)">${esc(g)}</em>`).join('')}</div><div class="seg">${['will', 'watching', 'watched'].map(k => `<button class="btn ${l.st === k ? 'on' : ''}" data-act="${k}">${ST[k]}</button>`).join('')}</div>${l.st === 'watching' ? `<label class="field">Progress: ${l.p || 0}%<input type="range" min="0" max="100" step="5" value="${l.p || 0}" data-prog></label>` : ''}<div style="display:flex;justify-content:space-between;align-items:center"><div class="stars" aria-label="Your rating">${[1, 2, 3, 4, 5].map(i => `<button class="${(l.my || 0) >= i * 2 ? 'on' : ''}" data-act="rate" data-v="${i * 2}" aria-label="${i * 2} out of 10">${I('star')}</button>`).join('')}</div><button class="btn ${l.fav ? 'p' : ''}" data-act="fav">${I('heart')} ${l.fav ? 'Favorite' : 'Add favorite'}</button></div>${c.cloud && window.MD.cloud && window.MD.cloud.owner ? `<button class="btn sm" data-do="rm">${I('x')} Remove from diary</button>` : ''}</div>`;
    if (!d.open) d.showModal();
  }
  function bell() {
    const w = C.find(c => L(c.id).st === 'watching'), n = C.filter(c => L(c.id).st === 'will').length, t = [...C].sort((a, b) => b.tr - a.tr)[0];
    S.bellRead = true; save(); chrome();
    $('#dlg').innerHTML = `<div class="dh"><button class="x" data-close>${I('x')}</button><h2>Notifications</h2></div><div class="db"><div class="nl">${w ? `<div>${I('play')}<span>Pick up <b>${esc(w.t)}</b> — you are ${L(w.id).p || 0}% in.</span></div>` : ''}<div>${I('flame')}<span><b>${esc(t.t)}</b> is trending this week.</span></div><div>${I('bookmark')}<span>${n} title${n === 1 ? '' : 's'} waiting in your watchlist.</span></div><div>${I('spark')}<span>Ask Jarvis for a pick based on your taste.</span></div></div></div>`; $('#dlg').showModal();
  }
  function setTheme(t) { S.theme = t || (S.theme === 'dark' ? 'light' : 'dark'); applyLook(); save(); if (cur() === 'settings') render(); }
  function cycleAccent() { S.acc = (S.acc + 1) % ACC.length; applyLook(); save(); toast('Theme: ' + ACC[S.acc][0]); if (cur() === 'settings') render(); }
  function reset() { if (confirm('Reset your whole diary on this device?')) { localStorage.removeItem(KEY); sessionStorage.clear(); location.hash = '#/home'; location.reload(); } }
  function setCatalog(l) { C.length = 0; Object.keys(by).forEach(k => delete by[k]); l.forEach(upsert); }
  function upsert(c) { const i = C.findIndex(x => x.id === c.id); if (i < 0) C.push(c); else C[i] = c; by[c.id] = c; }
  function removeItem(id) { const i = C.findIndex(x => x.id === id); if (i > -1) C.splice(i, 1); delete by[id]; delete S.lib[id]; save(); render(); }
  function download(name, text) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }

  /* ---------- events ---------- */
  document.addEventListener('click', e => {
    const t = e.target, g = s => t.closest(s);
    if (g('[data-close]')) { $('#dlg').close(); return; }
    if (t === $('#dlg')) { $('#dlg').close(); return; }
    let el;
    if ((el = g('[data-act]'))) { const id = (g('[data-id]') || {}).dataset?.id; if (id) { e.stopPropagation(); act(id, el.dataset.act, +el.dataset.v || 0); if (el.dataset.act === 'watching' && g('.hero')) open(id); } return; }
    if ((el = g('[data-open]'))) { open(el.dataset.open); return; }
    if ((el = g('[data-hero]'))) { hero(+el.dataset.hero); clearInterval(timer); return; }
    if ((el = g('[data-dot]'))) { hero(0, +el.dataset.dot); clearInterval(timer); return; }
    if ((el = g('[data-tab]'))) { S.tab = el.dataset.tab; save(); slide = 0; q = ''; $('#q').value = ''; if (cur() === 'home' && !location.hash.includes('settings')) render(); else location.hash = '#/home'; return; }
    if ((el = g('[data-genre]'))) { genre = el.dataset.genre; if (el.dataset.go) location.hash = '#/' + el.dataset.go; else render(); return; }
    if ((el = g('[data-sort]'))) { sort = el.dataset.sort; render(); return; }
    if ((el = g('[data-acc]'))) { S.acc = +el.dataset.acc; applyLook(); save(); render(); return; }
    if ((el = g('[data-do]'))) {
      e.preventDefault(); const k = el.dataset.do;
      if (k === 'accent') cycleAccent();
      if (k === 'theme') setTheme();
      if (k === 'export') download('mydairy-backup.json', JSON.stringify(S, null, 2));
      if (k === 'import') $('#imp').click();
      if (k === 'reset') reset();
      if (k === 'auth') window.MD.cloud ? window.MD.cloud.authClick() : reset();
      if (k === 'rm') window.MD.cloud.remove(el.closest('[data-id]').dataset.id);
      return;
    }
    if ((el = g('.card[data-id], .it[data-id], .hero .s[data-id]'))) { open(el.dataset.id); return; }
  });
  document.addEventListener('change', e => {
    if (e.target.id === 'imp') { const f = e.target.files[0]; if (!f) return; f.text().then(x => { const j = JSON.parse(x); if (!j.lib) throw 0; S = j; save(); applyLook(); render(); toast('Backup restored'); }).catch(() => toast('That file is not a MyDairy backup')); }
    if (e.target.id === 'sName') { S.name = e.target.value.trim().slice(0, 30); save(); chrome(); window.MD.welcome && window.MD.welcome(); }
    if (e.target.id === 'sKey') { S.key = e.target.value.trim(); save(); toast(S.key ? 'Gemini key saved on this device' : 'Gemini key removed'); }
  });
  document.addEventListener('input', e => {
    if (e.target.matches('[data-prog]')) { const id = e.target.closest('[data-id]').dataset.id; S.lib[id].p = +e.target.value; S.lib[id].at = Date.now(); save(); e.target.parentNode.firstChild.textContent = 'Progress: ' + e.target.value + '%'; }
  });
  document.addEventListener('keydown', e => {
    if (e.key === '/' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); $('#q').focus(); }
    if (e.key === 'Enter' && e.target.matches?.('.card')) open(e.target.dataset.id);
  });
  $('#q').addEventListener('input', e => { q = e.target.value.trim(); render(); });
  $('#theme').addEventListener('click', () => setTheme());
  $('#bell').addEventListener('click', bell);
  $('#avatar').addEventListener('click', () => location.hash = '#/settings');
  $('#burger').addEventListener('click', () => $('#side').classList.toggle('open'));
  $('#dlg').addEventListener('close', () => render());
  window.addEventListener('hashchange', () => { q = ''; $('#q').value = ''; render(); window.scrollTo({ top: 0 }); });

  /* ---------- boot ---------- */
  $('#premIc').innerHTML = I('crown'); $('#sIc').innerHTML = I('search'); $('#inIc').innerHTML = I('download'); $('#sunIc').innerHTML = I('sun'); $('#moonIc').innerHTML = I('moon');
  $('#bellIc').innerHTML = I('bell'); $('#burger').innerHTML = I('menu');
  applyLook(); render();
  window.MD = { setCatalog, upsert, removeItem, reset, setLib: o => { S.lib = o; }, C, by, get S() { return S; }, save, open, render, toast, esc, I, act, L, stats, recs, fm };
})();
