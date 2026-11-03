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
    return { name: '', theme: 'dark', acc: 0, key: '', tab: 'home', hv: 1, bellRead: false, lib: {
      inception: { st: 'watched', my: 9, at: T0 - 9 * DAY }, darkknight: { st: 'watched', my: 10, at: T0 - 7 * DAY }, chernobyl: { st: 'watched', fav: 1, my: 10, at: T0 - 5 * DAY },
      breakingbad: { st: 'watched', fav: 1, my: 10, at: T0 - 4 * DAY }, rickmorty: { st: 'watched', my: 9, at: T0 - 2 * DAY }, loki: { st: 'watched', fav: 1, my: 8, at: T0 - DAY },
      wanda: { st: 'watching', p: 38, at: T0 - 3600e3 }, stranger: { st: 'will', at: T0 - 6e5 }, dune2: { st: 'will', at: T0 - 5e5 } } };
  })();
  if (S.name === 'Himanshu') S.name = '';
  if (!S.hv) { S.hv = 1; S.tab = 'home'; }          /* the new Home tab is the default landing tab */
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
  const locked = () => !!(window.MD && window.MD.cloud && window.MD.cloud.locked());
  const isOwner = () => !!(window.MD && window.MD.cloud && window.MD.cloud.owner);
  const hue = t => { let h = 0; for (const ch of String(t)) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; };
  /* na = true → no "+" on watched titles (and none for visitors, who cannot edit anyway) */
  const card = (c, na) => { const l = L(c.id), noAdd = na && (l.st === 'watched' || locked()); return `<article class="card" data-id="${c.id}" tabindex="0"><div class="poster ${c.p ? 'hasimg' : ''}" style="--h:${c.h}">${c.p ? `<img class="pimg" loading="lazy" alt="" src="${esc(c.p)}" onerror="this.remove()">` : ''}<i class="ini">${esc(c.t.replace(/^The /, '')[0])}</i><span class="rt">${I('star')}${c.r.toFixed(1)}</span>${noAdd ? '' : `<button class="add ${l.st === 'will' ? 'on' : ''}" data-act="will" aria-label="Toggle watchlist">${I(l.st === 'will' ? 'check' : 'plus')}</button>`}<div class="pi"><div class="gs">${c.g.slice(0, 2).map(g => `<em>${esc(g)}</em>`).join('')}</div><b>${esc(c.t)}</b></div>${l.st === 'watching' ? `<div class="prog"><i style="width:${l.p || 0}%"></i></div>` : ''}</div></article>`; };
  const row = (l, na) => `<div class="row">${l.map(c => card(c, na)).join('')}</div>`;
  const grid = l => l.length ? `<div class="grid">${l.map(c => card(c)).join('')}</div>` : '';
  const sec = (ic, title, extra, body, more) => `<div class="sh"><h2>${I(ic)}${title}</h2>${extra || ''}${more ? `<a class="more" href="${more}">See All ${I('right')}</a>` : ''}</div>${body}`;
  const empty = m => `<div class="empty">${m}</div>`;
  const head = (t, s) => `<div class="sh"><h2>${t}</h2><span style="color:var(--mu)">${s || ''}</span></div>`;
  const pool = () => C.filter(c => S.tab === 'movies' ? c.type === 'movie' : S.tab === 'tv' ? c.type === 'tv' : S.tab === 'anime' ? c.type === 'anime' : true);
  function recs(n) {
    const liked = {}; C.forEach(c => { const l = L(c.id); if (l.fav || l.my >= 8 || l.st === 'watched') c.g.forEach(g => liked[g] = (liked[g] || 0) + (l.fav ? 2 : 1)); });
    return C.filter(c => !L(c.id).st).map(c => [c, c.r + c.g.reduce((a, g) => a + (liked[g] || 0) * .35, 0)]).sort((a, b) => b[1] - a[1]).slice(0, n || 10).map(x => x[0]);
  }

  /* ---------- Home tab: trending / popular titles the owner has NOT picked yet (TMDB through /api/tmdb) ---------- */
  const EXT = { st: 'idle', d: null, at: 0, map: new Map() }, EXT_KEY = 'mydairy.ext', EXT_TTL = 6 * 36e5;
  const GEN = { 28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western', 10759: 'Action', 10762: 'Kids', 10763: 'News', 10764: 'Reality', 10765: 'Sci-Fi', 10766: 'Soap', 10767: 'Talk', 10768: 'War' };
  const nrm = t => String(t || '').toLowerCase().replace(/[^a-z0-9\u0900-\u097f]+/g, '');
  const gnorm = g => ({ 'Science Fiction': 'Sci-Fi', 'Action & Adventure': 'Action', 'Sci-Fi & Fantasy': 'Sci-Fi' }[g] || g);
  const extMap = (x, k) => ({ k: k || x.media_type, tid: x.id, t: x.title || x.name || '', y: String(x.release_date || x.first_air_date || '').slice(0, 4), p: x.poster_path ? 'https://image.tmdb.org/t/p/w342' + x.poster_path : '', d: String(x.overview || '').slice(0, 260), r: Math.round((x.vote_average || 0) * 10) / 10, v: x.vote_count || 0, g: (x.genre_ids || []).map(i => GEN[i]).filter(Boolean), pop: x.popularity || 0 });
  function ownedFn() {                       /* is this TMDB title already anywhere in the diary (any status)? */
    const ys = new Map(); C.forEach(c => { const k = nrm(c.t); (ys.get(k) || ys.set(k, new Set()).get(k)).add(String(c.y)); });
    return x => { if (by['tm_' + x.k + '_' + x.tid]) return true; const set = ys.get(nrm(x.t)); if (!set) return false; if (!x.y || set.has('') || set.has(x.y)) return true; const n = +x.y; return set.has(String(n + 1)) || set.has(String(n - 1)); };
  }
  function taste() { const liked = {}; C.forEach(c => { const l = L(c.id); if (l.fav || l.my >= 8 || l.st === 'watched') c.g.forEach(g => { g = gnorm(g); liked[g] = (liked[g] || 0) + (l.fav ? 2 : 1); }); }); return liked; }
  const extCard = x => {
    const key = x.k + '_' + x.tid; EXT.map.set(key, x);
    return `<article class="card" data-ext="${key}" tabindex="0"><div class="poster ${x.p ? 'hasimg' : ''}" style="--h:${hue(x.t)}">${x.p ? `<img class="pimg" loading="lazy" alt="" src="${esc(x.p)}" onerror="this.remove()">` : ''}<i class="ini">${esc(x.t.replace(/^The /, '')[0] || '?')}</i><span class="rt">${I('star')}${x.r.toFixed(1)}</span>${isOwner() ? `<button class="add" data-ext-add="${key}" aria-label="Add to watchlist">${I('plus')}</button>` : ''}<div class="pi"><div class="gs">${x.g.slice(0, 2).map(g => `<em>${esc(g)}</em>`).join('')}</div><b>${esc(x.t)}</b></div></div></article>`;
  };
  function extSections() {
    const d = EXT.d; if (!d) return ''; EXT.map.clear();
    const have = ownedFn(), liked = taste(), seen = new Set(), all = [];
    const fresh = l => (l || []).filter(x => !have(x));
    [d.tr, d.pm, d.pt, d.tm, d.tt].forEach(l => fresh(l).forEach(x => { const k = x.k + x.tid; if (!seen.has(k)) { seen.add(k); all.push(x); } }));
    const picks = all.filter(x => x.v >= 40).map(x => [x, x.r + x.g.reduce((a, g) => a + (liked[gnorm(g)] || 0) * .35, 0) + Math.min(1.5, x.pop / 600)]).sort((a, b) => b[1] - a[1]).slice(0, 14).map(a => a[0]);
    const shown = new Set(picks.map(x => x.k + x.tid));                    /* a title appears in one section only */
    const rest = l => { const r = fresh(l).filter(x => !shown.has(x.k + x.tid)); if (r.length < 3) return []; r.slice(0, 16).forEach(x => shown.add(x.k + x.tid)); return r; };
    const block = (ic, title, l) => l.length ? sec(ic, title, '', `<div class="row">${l.slice(0, 16).map(extCard).join('')}</div>`) : '';
    return block('spark', S.name ? `Picked for ${esc(S.name)}` : 'Most related for you', picks) + block('trend', 'Trending this week', rest(d.tr)) + block('film', 'Popular movies', rest(d.pm)) + block('tv', 'Popular series', rest(d.pt)) + block('star', 'Top rated movies', rest(d.tm)) + block('star', 'Top rated series', rest(d.tt));
  }
  const extSkeleton = () => `<div class="sh"><h2>${I('spark')}Finding fresh picks for you…</h2></div><div class="skr">${'<i></i>'.repeat(8)}</div><div class="sh"><h2>${I('trend')}Trending this week</h2></div><div class="skr">${'<i></i>'.repeat(8)}</div>`;
  const paintExt = () => { if (cur() === 'home' && !q && S.tab === 'home') render(); };
  async function loadExt() {
    if (EXT.st === 'loading') return;
    if (EXT.d && Date.now() - EXT.at < EXT_TTL) return;
    if (!EXT.d && EXT.st === 'fail' && Date.now() - EXT.at < 3e5) return;
    if (!EXT.d) { try { const c = JSON.parse(localStorage.getItem(EXT_KEY)); if (c && c.d && Date.now() - c.at < EXT_TTL) { EXT.d = c.d; EXT.at = c.at; EXT.st = 'ok'; paintExt(); return; } } catch (e) {} }
    EXT.st = 'loading';
    try {
      const get = p => fetch('api/tmdb?path=' + encodeURIComponent(p), { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error('tmdb ' + r.status); return r.json(); }).then(j => j.results || []).catch(() => []);
      const [tr, pm, pt, tm, tt] = await Promise.all([get('/trending/all/week'), get('/movie/popular'), get('/tv/popular'), get('/movie/top_rated'), get('/tv/top_rated')]);
      const mp = (l, k) => l.map(x => extMap(x, k || x.media_type)).filter(x => (x.k === 'movie' || x.k === 'tv') && x.t);
      const d = { tr: mp(tr), pm: mp(pm, 'movie'), pt: mp(pt, 'tv'), tm: mp(tm, 'movie'), tt: mp(tt, 'tv') };
      if (!Object.values(d).some(l => l.length)) throw new Error('empty');
      EXT.d = d; EXT.at = Date.now(); EXT.st = 'ok'; try { localStorage.setItem(EXT_KEY, JSON.stringify({ at: EXT.at, d })); } catch (e) {}
    } catch (e) { if (EXT.d) EXT.at = Date.now() - EXT_TTL + 3e5; else { EXT.st = 'fail'; EXT.at = Date.now(); } }
    paintExt();
  }
  function openExt(key) {
    const x = EXT.map.get(key); if (!x) return; const d = $('#dlg');
    d.innerHTML = `<div class="dh" style="--h:${hue(x.t)}"><button class="x" data-close aria-label="Close">${I('x')}</button><h2>${esc(x.t)}</h2><p>${x.y ? x.y + ' • ' : ''}${x.k === 'tv' ? 'TV Show' : 'Movie'} • ${I('star')} ${x.r.toFixed(1)}</p></div><div class="db">${x.p ? `<img class="xp" src="${esc(x.p)}" alt="" onerror="this.remove()">` : ''}<p>${esc(x.d) || 'No description available yet.'}</p><div class="gs">${x.g.map(g => `<em style="background:var(--sf2)">${esc(g)}</em>`).join('')}</div>${isOwner() ? `<button class="btn p" data-ext-add="${key}">${I('plus')} Add to Watchlist</button>` : `<p style="color:var(--mu)">Only the diary owner can add titles.</p>`}</div>`;
    if (!d.open) d.showModal();
  }
  async function addExt(key, btn) {
    const x = EXT.map.get(key), cl = window.MD && window.MD.cloud; if (!x) return;
    if (!cl || !cl.owner) { toast('Owner login required to add titles'); return; }
    if (btn) btn.disabled = true;
    try { await cl.addTmdb(x.k, x.tid); if ($('#dlg').open) $('#dlg').close(); } catch (er) { toast(er.message || 'Could not add'); if (btn) btn.disabled = false; }
  }

  /* ---------- views ---------- */
  let slide = 0, timer = null, genre = 'All', sort = 'rating', q = '';
  const V = {
    home() {
      const nothing = !C.length, homeTab = S.tab === 'home';
      if (nothing && !(homeTab && (EXT.d || EXT.st !== 'fail'))) return empty('Your diary is empty. ' + (window.MD && window.MD.cloud && window.MD.cloud.owner ? 'Use “Add title” to search OMDb / TMDB.' : 'The owner has not added any titles yet.'));
      const top = [...pool()].sort((a, b) => b.tr - a.tr).slice(0, 4);
      const hero = nothing ? '' : `<section class="hero" aria-roledescription="carousel">${top.map((c, i) => `<div class="s ${i === slide ? 'on' : ''}" data-id="${c.id}" style="--h:${c.h}"><div class="hc"><div class="badge">${c.type === 'movie' ? 'MOVIE' : '<b>▶</b> SERIES'}</div><h1 class="ht ${c.t.length > 20 ? 'l' : ''}">${esc(c.t.toUpperCase())}</h1><p>${esc(c.d)}</p><div class="meta">${I('star')} ${c.r.toFixed(1)}/10 <em>${esc(c.g[0])}</em><em>${c.y}</em><em>${fm(c.m > 4000 ? 60 : c.m)}</em></div><div class="acts"><button class="btn p" data-act="watching">${I('play')} Watch Now</button><button class="btn" data-act="will">${I('plus')} Add to Watchlist</button></div></div><div class="art">${c.p ? `<img src="${esc(c.p)}" alt="" onerror="this.remove()">` : `<i>${esc(c.t.replace(/^The /, '')[0])}</i>`}</div></div>`).join('')}<button class="hn l" data-hero="-1" aria-label="Previous">${I('left')}</button><button class="hn r" data-hero="1" aria-label="Next">${I('right')}</button><div class="dots">${top.map((_, i) => `<button class="${i === slide ? 'on' : ''}" data-dot="${i}" aria-label="Slide ${i + 1}"></button>`).join('')}</div></section>`;
      const pop = [...pool()].sort((a, b) => b.pop - a.pop), tr = [...pool()].sort((a, b) => b.tr - a.tr);
      const base = sec('star', 'Popular on MyDairy', `<span class="pill">${I('flame')} Trending Now</span>`, row(pop, 1)) + sec('trend', 'Trending Now', '', row(tr, 1), '#/discover') + sec('spark', S.name ? `Picked for ${esc(S.name)}` : 'Picked for you', '', row(recs(10)));
      if (homeTab) { const e = EXT.d ? extSections() : (EXT.st === 'fail' ? '' : extSkeleton()); if (e) return (nothing ? '' : hero) + `<div id="ext">${e}</div>`; }
      return nothing ? empty('Your diary is empty.') : hero + base;
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
      return `<div class="sh"><h2>Statistics</h2><button class="btn p sm" data-do="statjpg" style="margin-left:auto">${I('download')} Download JPG</button></div>` + `<div class="cols"><div class="big"><b>${s.movies}</b>Movies watched</div><div class="big"><b>${s.series}</b>Series & anime</div><div class="big"><b>${s.hours}h</b>Time watched</div><div class="big"><b>${avg}</b>Your average rating</div><div class="big"><b>${cnt('watching')}</b>In progress</div><div class="big"><b>${cnt('will')}</b>In watchlist</div></div>` + sec('chart', 'Favourite genres', '', Object.entries(gs).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([g, n]) => `<div class="gb"><span>${esc(g)}</span><div class="bar"><i style="width:${n / mx * 100}%"></i></div><b>${n}</b></div>`).join('') || empty('Mark titles as watched to see your taste.'));
    },
    settings() {
      return head('Settings') + `<div class="db" style="max-width:520px;padding:0"><label class="field">Display name (optional)<input id="sName" value="${esc(S.name)}" maxlength="30" placeholder="Leave empty to stay anonymous"></label><label class="field">Gemini API key (optional)<input id="sKey" type="password" value="${esc(S.key)}" placeholder="AIza…" autocomplete="off"><small>Jarvis already answers offline. Add a free key from aistudio.google.com/apikey to let him chat about anything. It stays only on this device.</small></label><div class="field">Accent colour<div class="chips">${ACC.map((a, i) => `<button class="${i === S.acc ? 'on' : ''}" data-acc="${i}">${a[0]}</button>`).join('')}</div></div><div class="acts"><button class="btn" data-do="theme">${I(S.theme === 'dark' ? 'sun' : 'moon')} Switch theme</button><button class="btn" data-do="reset">${I('x')} Reset diary</button></div></div>`;
    },
    search() { const n = q.toLowerCase(), l = C.filter(c => (c.t + ' ' + c.g.join(' ') + ' ' + c.y + ' ' + TYPE[c.type]).toLowerCase().includes(n)); return head('Results for “' + esc(q) + '”', l.length + ' found') + (l.length ? grid(l) : empty('No match. Try a genre like “comedy” or a year.')); }
  };
  const NAV = [['home', 'home', 'Home'], ['discover', 'compass', 'Discover'], ['movies', 'film', 'Movies'], ['tv', 'tv', 'TV Shows'], ['anime', 'anime', 'Anime'], ['favorites', 'heart', 'Favorites'], ['watchlist', 'bookmark', 'Watchlist'], ['downloads', 'download', 'Downloads'], ['history', 'history', 'History'], ['playlists', 'list', 'Playlists'], ['statistics', 'chart', 'Statistics']];
  const TABS = [['home', 'home', 'Home'], ['movies', 'film', 'Movies'], ['tv', 'tv', 'TV Shows'], ['anime', 'anime', 'Anime'], ['trending', 'flame', 'Trending'], ['popular', 'star', 'Popular']];

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
    document.body.classList.toggle('nojv', !(r === 'home' && S.tab === 'home'));     /* Jarvis (box + floating button) lives on Home only */
    if (r === 'home') timer = setInterval(() => hero(1), 6500);
    if (r === 'home' && S.tab === 'home') loadExt();
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

  /* ---------- statistics → JPG (works for everyone, no login) ---------- */
  async function statsJpg() {
    const s = stats(), gs = {}; s.w.forEach(c => c.g.forEach(g => gs[g] = (gs[g] || 0) + 1));
    const rated = Object.values(S.lib).filter(l => l.my), avg = rated.length ? (rated.reduce((a, l) => a + l.my, 0) / rated.length).toFixed(1) : '–';
    const cnt = k => Object.values(S.lib).filter(l => l.st === k).length, genres = Object.entries(gs).sort((a, b) => b[1] - a[1]).slice(0, 8), mx = Math.max(1, ...genres.map(g => g[1]));
    const tiles = [[s.movies, 'Movies watched'], [s.series, 'Series & anime'], [s.hours + 'h', 'Time watched'], [avg, 'Average rating'], [cnt('watching'), 'In progress'], [cnt('will'), 'In watchlist']];
    const W = 1080, P = 64, TH = 190, GAP = 24, gy0 = 674, H = gy0 + 110 + Math.max(1, genres.length) * 62 + 130;
    const A = ACC[S.acc] || ACC[0], F = '"Plus Jakarta Sans","Segoe UI",system-ui,sans-serif';
    try { await Promise.all([document.fonts.load('800 40px "Plus Jakarta Sans"'), document.fonts.load('600 24px "Plus Jakarta Sans"')]); } catch (e) {}
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
    const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
    let bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#0b0720'); bg.addColorStop(1, '#1a0b45'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    [[0, 0, A[1]], [W, H * .55, A[2]], [W * .5, H, '#22d3ee']].forEach(([x, y, c]) => { const r = g.createRadialGradient(x, y, 0, x, y, 620); r.addColorStop(0, c + '66'); r.addColorStop(1, c + '00'); g.fillStyle = r; g.fillRect(0, 0, W, H); });
    g.textBaseline = 'alphabetic';
    const lg = g.createLinearGradient(P, 0, P + 360, 0); lg.addColorStop(0, '#c4b5fd'); lg.addColorStop(.55, A[1]); lg.addColorStop(1, '#22d3ee');
    g.fillStyle = lg; g.font = '800 76px ' + F; g.fillText('MyDairy', P, 150);
    g.fillStyle = '#a59cc9'; g.font = '600 28px ' + F; g.fillText('Watch • Track • Remember', P, 196);
    g.textAlign = 'right'; g.fillStyle = '#fff'; g.font = '800 34px ' + F; g.fillText('My Statistics', W - P, 138); g.fillStyle = '#a59cc9'; g.font = '600 26px ' + F; g.fillText(new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }), W - P, 182); g.textAlign = 'left';
    const tw = (W - 2 * P - 2 * GAP) / 3;
    tiles.forEach((t, i) => {
      const x = P + (i % 3) * (tw + GAP), y = 250 + Math.floor(i / 3) * (TH + GAP);
      rr(x, y, tw, TH, 30); const f = g.createLinearGradient(x, y, x + tw, y + TH); f.addColorStop(0, 'rgba(255,255,255,.12)'); f.addColorStop(1, 'rgba(255,255,255,.04)'); g.fillStyle = f; g.fill(); g.strokeStyle = 'rgba(167,139,250,.35)'; g.lineWidth = 2; g.stroke();
      g.textAlign = 'center'; const tg = g.createLinearGradient(x, y, x + tw, y); tg.addColorStop(0, '#fff'); tg.addColorStop(1, '#22d3ee'); g.fillStyle = tg; g.font = '800 70px ' + F; g.fillText(String(t[0]), x + tw / 2, y + 100);
      g.fillStyle = '#b9b0e0'; g.font = '600 25px ' + F; g.fillText(t[1], x + tw / 2, y + 150); g.textAlign = 'left';
    });
    g.fillStyle = '#fff'; g.font = '800 38px ' + F; g.fillText('Favourite genres', P, gy0 + 50);
    if (!genres.length) { g.fillStyle = '#a59cc9'; g.font = '600 28px ' + F; g.fillText('Mark titles as watched to see the taste chart.', P, gy0 + 118); }
    genres.forEach(([n, c], i) => {
      const y = gy0 + 90 + i * 62, bx = P + 230, bw = W - 2 * P - 230 - 80;
      g.fillStyle = '#e5defd'; g.font = '700 27px ' + F; g.fillText(n.length > 14 ? n.slice(0, 13) + '…' : n, P, y + 30);
      rr(bx, y + 8, bw, 26, 13); g.fillStyle = 'rgba(255,255,255,.1)'; g.fill();
      const w = Math.max(26, bw * c / mx), bf = g.createLinearGradient(bx, 0, bx + w, 0); bf.addColorStop(0, A[1]); bf.addColorStop(1, '#22d3ee'); rr(bx, y + 8, w, 26, 13); g.fillStyle = bf; g.fill();
      g.textAlign = 'right'; g.fillStyle = '#fff'; g.font = '800 27px ' + F; g.fillText(String(c), W - P, y + 30); g.textAlign = 'left';
    });
    g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(P, H - 110, W - 2 * P, 2);
    g.textAlign = 'center'; g.fillStyle = '#a59cc9'; g.font = '600 26px ' + F; g.fillText('Made by ΣTΣЯПITY', W / 2, H - 56); g.textAlign = 'left';
    cv.toBlob(b => {
      if (!b) { toast('Could not create the image'); return; }
      const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'MyDairy-Statistics-' + new Date().toISOString().slice(0, 10) + '.jpg'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast('Statistics saved as JPG ✓');
    }, 'image/jpeg', .93);
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
    let ex; if ((ex = g('[data-ext-add]'))) { e.stopPropagation(); addExt(ex.dataset.extAdd, ex); return; }
    if ((ex = g('[data-ext]'))) { openExt(ex.dataset.ext); return; }
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
      if (k === 'statjpg') statsJpg();
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
    if (e.key === 'Enter' && e.target.matches?.('.card')) { if (e.target.dataset.ext) openExt(e.target.dataset.ext); else if (e.target.dataset.id) open(e.target.dataset.id); }
  });
  $('#q').addEventListener('input', e => { q = e.target.value.trim(); render(); });
  $('#theme').addEventListener('click', () => setTheme());
  $('#bell').addEventListener('click', bell);
  $('#avatar').addEventListener('click', () => location.hash = '#/settings');
  /* mobile menu: ☰ opens it; ✕, tapping outside, Esc or a swipe-left closes it */
  const side = $('#side'), burger = $('#burger'), sclose = document.createElement('button');
  sclose.className = 'sclose'; sclose.id = 'sclose'; sclose.type = 'button'; sclose.setAttribute('aria-label', 'Close menu'); sclose.innerHTML = I('x'); side.prepend(sclose);
  burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-controls', 'side');
  new MutationObserver(() => burger.setAttribute('aria-expanded', side.classList.contains('open'))).observe(side, { attributes: true, attributeFilter: ['class'] });
  const menu = on => { side.classList.toggle('open', on); (on ? sclose : burger).focus({ preventScroll: true }); };
  burger.addEventListener('click', () => menu(!side.classList.contains('open')));
  sclose.addEventListener('click', () => menu(false));
  document.addEventListener('click', e => { if (side.classList.contains('open') && !side.contains(e.target) && !burger.contains(e.target)) { e.preventDefault(); e.stopPropagation(); menu(false); } }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && side.classList.contains('open') && !$('#dlg').open) menu(false); });
  let sx = 0, sy = 0;
  side.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  side.addEventListener('touchend', e => { const t = e.changedTouches[0]; if (t.clientX - sx < -60 && Math.abs(t.clientY - sy) < 50) menu(false); }, { passive: true });
  matchMedia('(min-width:901px)').addEventListener('change', e => { if (e.matches) side.classList.remove('open'); });
  $('#dlg').addEventListener('close', () => render());
  window.addEventListener('hashchange', () => { q = ''; $('#q').value = ''; render(); window.scrollTo({ top: 0 }); });

  /* ---------- boot ---------- */
  $('#premIc').innerHTML = I('crown'); $('#sIc').innerHTML = I('search'); $('#inIc').innerHTML = I('download'); $('#sunIc').innerHTML = I('sun'); $('#moonIc').innerHTML = I('moon');
  $('#bellIc').innerHTML = I('bell'); $('#burger').innerHTML = I('menu');
  applyLook(); render();
  window.MD = { setCatalog, upsert, removeItem, reset, setLib: o => { S.lib = o; }, C, by, get S() { return S; }, save, open, render, toast, esc, I, act, L, stats, recs, fm };
})();
