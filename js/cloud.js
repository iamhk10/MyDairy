/* MyDairy cloud: Supabase owner login + shared library + OMDb/TMDB search (through /api, keys stay on the server) */
(function () {
  'use strict';
  const M = window.MD, I = M.I, esc = M.esc, $ = (s, r = document) => r.querySelector(s);
  const KEY = 'mydairy.sb', CACHE = 'mydairy.cloudcache';
  const B = { url: '', key: '', features: {}, ok: false }, A = { owner: false, email: '' };
  let sess = null, raw = {}, remote = {}, timer = null, busy = false, loaded = false;
  const jget = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const jset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const hue = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
  const safe = u => { u = String(u || ''); return /^https:\/\/\S+$/.test(u) && u.length < 600 ? u : ''; };
  const na = v => !v || v === 'N/A' ? '' : String(v), list = v => na(v) ? String(v).split(/\s*,\s*/).filter(Boolean) : [];
  const compact = o => { const r = {}; Object.keys(o).forEach(k => { const v = o[k]; if (v === '' || v == null || v === 0 || v === false || (Array.isArray(v) && !v.length)) return; r[k] = v; }); return r; };
  const cmp = o => { const c = Object.assign({}, o); delete c.updated; return JSON.stringify(c); };

  /* ---------- config + auth (Supabase GoTrue over plain fetch) ---------- */
  const ready = fetch('api/config', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null).then(d => {
    d = d || {}; B.url = String(d.supabaseUrl || '').replace(/\/+$/, ''); B.key = String(d.supabaseAnonKey || ''); B.features = d.features || {};
    B.ok = /^https:\/\/[^\s/]+/.test(B.url) && !!B.key;
  });
  async function af(path, o = {}) {
    const h = { apikey: B.key, 'Content-Type': 'application/json' }; if (o.token) h.Authorization = 'Bearer ' + o.token;
    let r; try { r = await fetch(B.url + path, { method: o.method || 'POST', headers: h, body: o.body ? JSON.stringify(o.body) : undefined, cache: 'no-store' }); } catch (e) { const x = new Error('No internet connection.'); x.net = 1; throw x; }
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { let m = d.error_description || d.msg || d.message || d.error || 'Error ' + r.status; if (/invalid login/i.test(m)) m = 'Wrong e-mail or password.'; else if (/not confirmed/i.test(m)) m = 'E-mail not confirmed yet. In Supabase → Authentication → Users, confirm the user.'; else if (/rate limit|too many/i.test(m)) m = 'Too many attempts. Wait a minute and retry.'; const x = new Error(m); x.status = r.status; throw x; }
    return d;
  }
  const isOwner = t => fetch(B.url + '/rest/v1/rpc/is_owner', { method: 'POST', headers: { apikey: B.key, Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: '{}' }).then(r => r.ok ? r.json() : false).then(v => v === true, () => false);
  const keep = d => { sess = { access: d.access_token, refresh: d.refresh_token, exp: Date.now() + (d.expires_in || 3600) * 1000, email: (d.user && d.user.email) || (sess && sess.email) || '' }; jset(KEY, sess); A.owner = true; A.email = sess.email; };
  const drop = () => { sess = null; localStorage.removeItem(KEY); A.owner = false; A.email = ''; };
  async function token() {
    if (!sess) throw new Error('Please sign in again.'); if (Date.now() < sess.exp - 60000) return sess.access;
    try { const d = await af('/auth/v1/token?grant_type=refresh_token', { body: { refresh_token: sess.refresh } }); keep(d); return sess.access; }
    catch (e) { if (e.status && e.status < 500) { drop(); ui(); M.render(); } throw e; }
  }
  async function signIn(email, pw) {
    const d = await af('/auth/v1/token?grant_type=password', { body: { email: String(email).trim(), password: pw } });
    if (!(await isOwner(d.access_token))) { af('/auth/v1/logout', { token: d.access_token }).catch(() => {}); throw new Error('This account is not the owner. Run the last line of supabase/schema.sql with your e-mail.'); }
    keep(d);
  }
  async function restore() {
    sess = jget(KEY, null); if (!sess || !sess.access || !sess.refresh) { sess = null; return; }
    try { const t = await token(); if (await isOwner(t)) { A.owner = true; A.email = sess.email; } else drop(); }
    catch (e) { if (e.net && sess) { A.owner = true; A.email = sess.email; } }
  }

  /* ---------- library (table public.library, one JSON row per title) ---------- */
  async function rest(method, path, o = {}) {
    const h = { apikey: B.key, 'Content-Type': 'application/json' };
    if (o.auth) h.Authorization = 'Bearer ' + await token(); else if (/^eyJ/.test(B.key)) h.Authorization = 'Bearer ' + B.key;
    if (o.prefer) h.Prefer = o.prefer;
    const r = await fetch(B.url + '/rest/v1' + path, { method, headers: h, body: o.body ? JSON.stringify(o.body) : undefined, cache: 'no-store' });
    if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.message || 'Error ' + r.status); }
    return r.status === 204 ? null : r.json().catch(() => null);
  }
  async function readAll() {
    let out = []; for (let off = 0; ; off += 500) { const rows = await rest('GET', '/library?select=data&order=id.asc&limit=500&offset=' + off, { auth: A.owner }); out = out.concat(rows.map(x => x && x.data).filter(x => x && x.title)); if (rows.length < 500) break; }
    return out;
  }
  const TAGG = { marvel: 'Superhero', dc: 'Superhero', indian: 'Indian', korean: 'Korean' };
  function toMD(x) {
    const tags = x.tags || [], r = +x.rating || 0, tv = x.type === 'series';
    const g = [...new Set([...(x.genres || []), ...tags.map(t => TAGG[t]).filter(Boolean)])].slice(0, 5);
    return { id: x.id, t: x.title, y: parseInt(x.year, 10) || '', type: tags.includes('anime') ? 'anime' : tv ? 'tv' : 'movie', g: g.length ? g : ['Unsorted'], r, h: hue(x.title), pop: r * 10, tr: r * 10 + (x.fav ? 8 : 0) + (Date.parse(x.added) || 0) / 1e13, m: tv ? (x.runtime || 45) * (x.episodes || (x.seasons || 1) * 8) : (x.runtime || 110), d: x.overview || '', p: safe(x.poster), tk: tv ? 'tv' : 'movie', tm: x.tmdb || '', im: x.imdb || '', cloud: 1 };
  }
  const libOf = x => ({ st: x.status || 'will', fav: x.fav ? 1 : 0, my: Math.round(+x.myRating || 0) || undefined, p: x.status === 'watched' ? 100 : x.status === 'watching' ? (x.curE && x.episodes ? Math.min(95, Math.round(x.curE / x.episodes * 100)) : 10) : 0, at: Date.parse(x.updated || x.added) || Date.now() });
  function apply(arr) {
    raw = {}; remote = {}; const lib = {}, cat = [];
    arr.forEach(x => { raw[x.id] = x; remote[x.id] = cmp(x); cat.push(toMD(x)); lib[x.id] = libOf(x); });
    M.setCatalog(cat); M.setLib(lib); loaded = true;
  }
  function dataOf(id) {
    const x = Object.assign({}, raw[id]), l = M.S.lib[id] || {};
    x.status = l.st || x.status || 'will'; x.fav = !!l.fav; if (l.my) x.myRating = l.my; else delete x.myRating;
    if (x.status === 'watched' && !x.watchedOn) x.watchedOn = new Date().toISOString().slice(0, 10);
    if (x.status === 'watching' && x.episodes && l.p != null) x.curE = Math.round(x.episodes * l.p / 100);
    x.updated = new Date().toISOString(); return compact(x);
  }
  function queue() { if (!A.owner || !loaded) return; clearTimeout(timer); timer = setTimeout(push, 1200); }
  async function push() {
    if (busy) { timer = setTimeout(push, 800); return; } busy = true;
    try {
      const up = []; Object.keys(raw).forEach(id => { if (!M.by[id]) return; const d = dataOf(id); if (cmp(d) !== remote[id]) up.push([id, d]); });
      for (let i = 0; i < up.length; i += 150) { const ch = up.slice(i, i + 150); await rest('POST', '/library?on_conflict=id', { auth: 1, prefer: 'resolution=merge-duplicates,return=minimal', body: ch.map(([id, d]) => ({ id, data: d })) }); ch.forEach(([id, d]) => { raw[id] = d; remote[id] = cmp(d); }); }
      if (up.length) M.toast('Saved ✓ — everyone sees it');
    } catch (e) { M.toast('Could not save: ' + e.message); }
    busy = false;
  }
  async function remove(id) {
    if (!A.owner || !confirm('Remove this title from the diary for everyone?')) return;
    try { await rest('DELETE', '/library?id=eq.' + encodeURIComponent(id), { auth: 1, prefer: 'return=minimal' }); delete raw[id]; delete remote[id]; $('#dlg').close(); M.removeItem(id); M.toast('Removed'); }
    catch (e) { M.toast('Could not remove: ' + e.message); }
  }
  function addNew(it, quiet) {          /* quiet = part of a multi-add (the caller renders + toasts once) */
    if (raw[it.id] || M.C.some(c => nrm(c.t) === nrm(it.title) && (!it.year || !c.y || String(c.y) === String(it.year)))) { if (!quiet) M.toast('Already in your diary'); return false; }
    it.status = 'will'; it.added = new Date().toISOString();
    if (!it.tags && (it.genres || []).includes('Animation') && /japan/i.test(it.country || '')) it.tags = ['anime'];
    raw[it.id] = compact(it); remote[it.id] = ''; M.upsert(toMD(raw[it.id])); M.S.lib[it.id] = libOf(it); M.save();
    if (!quiet) { M.render(); M.toast('Added to Watchlist'); }
    return true;
  }

  /* ---------- OMDb / TMDB through /api (owner token required) ---------- */
  const memo = new Map();
  async function api(url) {
    if (memo.has(url) && Date.now() - memo.get(url).at < 3e5) return memo.get(url).d;
    const t = await token(); const r = await fetch(url, { headers: { Authorization: 'Bearer ' + t } }); const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.message || 'Error ' + r.status);
    if (memo.size > 150) memo.clear(); memo.set(url, { at: Date.now(), d }); return d;
  }
  const TMG = 'https://image.tmdb.org/t/p/', yr = d => String(d || '').slice(0, 4);
  const tmUrl = (path, o) => 'api/tmdb?path=' + encodeURIComponent(path) + Object.keys(o || {}).map(k => '&' + k + '=' + encodeURIComponent(o[k])).join('');
  const tmItem = (x, mt) => ({ p: 'tmdb', id: x.id, mt: mt || x.media_type, title: x.title || x.name || '', year: yr(x.release_date || x.first_air_date), poster: x.poster_path ? TMG + 'w185' + x.poster_path : '', rating: Math.round((x.vote_average || 0) * 10) / 10, votes: x.vote_count || 0, pop: x.popularity || 0, who: x.character || '' });
  const isTitle = x => (x.mt === 'movie' || x.mt === 'tv') && x.title;
  const idOf = r => r.p === 'tmdb' ? 'tm_' + r.mt + '_' + r.id : r.id;
  const nrm = t => String(t || '').toLowerCase().replace(/[^a-z0-9ऀ-ॿ]+/g, '');
  const haveIt = r => !!raw[idOf(r)] || M.C.some(c => nrm(c.t) === nrm(r.title) && (!r.year || !c.y || String(c.y) === String(r.year)));
  const SEARCH = {
    async title(q, prov, page) {
      if (prov === 'tmdb') { const d = await api(tmUrl(q ? '/search/multi' : '/trending/all/week', q ? { query: q, page } : { page })); return { items: (d.results || []).map(x => tmItem(x)).filter(isTitle), more: page < (d.total_pages || 1) }; }
      const d = await api('api/omdb?s=' + encodeURIComponent(q) + '&page=' + page);
      if (d.Response === 'False') { if (/not found/i.test(d.Error || '')) return { items: [], more: false }; throw new Error(/too many/i.test(d.Error || '') ? 'Keep typing — a few more letters.' : (d.Error || 'No results')); }
      return { items: (d.Search || []).filter(x => x.Type === 'movie' || x.Type === 'series').map(x => ({ p: 'omdb', id: x.imdbID, mt: x.Type === 'series' ? 'tv' : 'movie', title: x.Title, year: na(x.Year), poster: safe(na(x.Poster)) })), more: page * 10 < (+d.totalResults || 0) };
    },
    async actor(q, page) {
      const d = await api(tmUrl(q ? '/search/person' : '/person/popular', q ? { query: q, page } : { page }));
      return { items: (d.results || []).filter(x => x.name).map(x => ({ p: 'person', id: x.id, name: x.name, photo: x.profile_path ? TMG + 'w185' + x.profile_path : '', dept: x.known_for_department || '', known: (x.known_for || []).map(k => k.title || k.name).filter(Boolean).slice(0, 3) })), more: page < (d.total_pages || 1) };
    },
    async works(id) {
      const d = await api(tmUrl('/person/' + id + '/combined_credits')), seen = new Set();
      return (d.cast || []).filter(x => (x.media_type === 'movie' || x.media_type === 'tv') && !/\b(self|himself|herself|themselves)\b/i.test(x.character || '') && (x.vote_count || 0) >= 20 && !(x.genre_ids || []).some(g => g === 10767 || g === 10763 || g === 10764))
        .map(x => tmItem(x)).filter(x => isTitle(x) && !seen.has(x.mt + x.id) && seen.add(x.mt + x.id)).sort((a, b) => b.pop - a.pop).slice(0, 40);
    },
    async top(mt, q, page) {
      if (q) { const d = await api(tmUrl('/search/' + mt, { query: q, page })); return { items: (d.results || []).map(x => tmItem(x, mt)).filter(x => x.title && x.votes >= 50).sort((a, b) => b.rating - a.rating), more: page < (d.total_pages || 1) }; }
      const d = await api(tmUrl('/' + mt + '/top_rated', { page })); return { items: (d.results || []).map(x => tmItem(x, mt)).filter(isTitle), more: page < Math.min(d.total_pages || 1, 5) };
    }
  };
  async function detail(r) {
    if (r.p === 'tmdb') {
      const d = await api(tmUrl('/' + r.mt + '/' + r.id)), tv = r.mt === 'tv';
      return { id: 'tm_' + r.mt + '_' + r.id, tmdb: r.mt + '/' + r.id, title: d.title || d.name, year: (d.release_date || d.first_air_date || '').slice(0, 4), type: tv ? 'series' : 'movie', kind: tv ? 'web' : 'movie', poster: d.poster_path ? 'https://image.tmdb.org/t/p/w342' + d.poster_path : '', backdrop: d.backdrop_path ? 'https://image.tmdb.org/t/p/w780' + d.backdrop_path : '', rating: Math.round((d.vote_average || 0) * 10) / 10, rsrc: 'TMDB', genres: (d.genres || []).map(g => g.name), overview: d.overview || '', runtime: d.runtime || (d.episode_run_time || [])[0] || 0, seasons: d.number_of_seasons || 0, episodes: d.number_of_episodes || 0, country: ((d.origin_country || [])[0] === 'JP' ? 'Japan' : '') };
    }
    const d = await api('api/omdb?i=' + encodeURIComponent(r.id) + '&plot=full'); if (d.Response === 'False') throw new Error(d.Error || 'Not found'); const tv = d.Type === 'series';
    return { id: d.imdbID, imdb: d.imdbID, title: d.Title, year: na(d.Year), type: tv ? 'series' : 'movie', kind: tv ? 'web' : 'movie', poster: safe(na(d.Poster)).replace(/_SX\d+/, '_SX400'), rating: parseFloat(na(d.imdbRating)) || 0, genres: list(d.Genre), overview: na(d.Plot), runtime: parseInt(na(d.Runtime), 10) || 0, seasons: parseInt(na(d.totalSeasons), 10) || 0, director: na(d.Director), cast: list(d.Actors).slice(0, 6), lang: na(d.Language), country: na(d.Country) };
  }
  const addTmdb = async (mt, id) => { const it = await detail({ p: 'tmdb', mt, id }); if (!addNew(it)) throw new Error('Already in your diary'); };

  /* ---------- dialogs ---------- */
  const USER = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/></svg>';
  function openAdd() {
    const f = B.features, d = $('#dlg');
    if (!f.omdb && !f.tmdb) { M.toast('Set OMDB_API_KEY or TMDB_API_KEY in Vercel first'); return; }
    const sel = new Map(), seen = new Map(), st = { mode: 'title', prov: f.tmdb ? 'tmdb' : 'omdb', person: null, items: [], more: false, page: 1, q: '', seq: 0, adding: false };
    const MODES = [['title', I('search'), 'Titles'], ['actor', USER, 'Actors'], ['movie', I('film'), 'Top movies'], ['tv', I('tv'), 'Top series']];
    const HOLD = { title: 'Search a movie or series…', actor: 'Search an actor or actress…', movie: 'Search top movies…', tv: 'Search top series…' };
    d.className = 'adlg'; d.addEventListener('close', () => { d.className = ''; }, { once: true });
    d.innerHTML = `<div class="ad-top"><button class="x" data-close aria-label="Close">${I('x')}</button><span class="ad-badge">${I('plus')}</span><div><h2>Add to your diary</h2><p>Search, tick as many as you like — add them all in one go.</p></div></div>
<div class="ad-tools"><form id="addf" class="ad-search" autocomplete="off"><span class="si">${I('search')}</span><input id="addq" placeholder="${HOLD.title}" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Search"><i class="spin"></i><button type="button" class="clr" id="addc" aria-label="Clear" hidden>${I('x')}</button></form>
<div class="ad-modes" id="admodes">${MODES.map(m => `<button type="button" data-m="${m[0]}" class="${m[0] === 'title' ? 'on' : ''}" ${m[0] !== 'title' && !f.tmdb ? 'disabled title="Needs a TMDB key"' : ''}>${m[1]}${m[2]}</button>`).join('')}</div></div>
<div class="ad-meta"><span id="adhint"></span>${f.omdb && f.tmdb ? '<div class="ad-src" id="adsrc"><button type="button" data-p="tmdb" class="on">TMDB</button><button type="button" data-p="omdb">OMDb</button></div>' : `<em class="ad-only">${f.tmdb ? 'TMDB' : 'IMDb via OMDb'}</em>`}</div>
<div class="ad-list" id="addres"></div><div class="ad-bar" id="adbar" hidden></div>`;
    d.showModal();
    const box = $('#addres'), inp = $('#addq'), form = $('#addf'), bar = $('#adbar'), hint = $('#adhint');
    const key = r => r.p + ':' + r.id, esc2 = esc;
    const poster = r => r.poster ? `<img src="${esc2(r.poster)}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'ph'}))">` : '<span class="ph"></span>';
    const rowT = r => { const k = key(r), have = haveIt(r); seen.set(k, r); return `<button type="button" class="ar ${sel.has(k) ? 'sel' : ''} ${have ? 'have' : ''}" data-k="${esc2(k)}" ${have ? 'disabled' : ''}>${poster(r)}<span class="at"><b>${esc2(r.title)}</b><small>${esc2([r.year, r.mt === 'tv' ? 'Series' : 'Movie', r.rating ? '★ ' + r.rating : '', r.who ? 'as ' + r.who : ''].filter(Boolean).join(' • '))}</small></span><span class="ck">${have ? '<em>In diary</em>' : I('check')}</span></button>`; };
    const rowP = r => { seen.set(key(r), r); return `<button type="button" class="ar pr" data-person="${r.id}">${r.photo ? `<img src="${esc2(r.photo)}" alt="" loading="lazy">` : `<span class="ph">${USER}</span>`}<span class="at"><b>${esc2(r.name)}</b><small>${esc2(r.known.length ? 'Known for: ' + r.known.join(', ') : r.dept)}</small></span><span class="ck go">›</span></button>`; };
    const more = () => st.more ? '<button type="button" class="ad-more" id="admore">Load more</button>' : '';
    function paint(msg) {
      if (msg) { box.innerHTML = `<div class="ad-empty">${esc2(msg)}</div>`; return; }
      const head = st.person ? `<div class="ad-back"><button type="button" id="adback">‹ Back</button><span>Top work of <b>${esc2(st.person.name)}</b></span></div>` : '';
      box.innerHTML = head + (st.items.length ? st.items.map(st.mode === 'actor' && !st.person ? rowP : rowT).join('') + more() : '<div class="ad-empty">No results. Try another spelling.</div>');
    }
    const skeleton = () => { box.innerHTML = '<div class="ar skl"></div>'.repeat(5); };
    function setHint() {
      hint.textContent = st.person ? 'Tick the titles you want' : st.mode === 'title' ? (st.q ? 'Results update as you type' : (st.prov === 'tmdb' ? 'Trending right now — or start typing' : 'Start typing a title')) : st.mode === 'actor' ? (st.q ? 'Tap a person to see their best work' : 'Popular actors — or type a name') : (st.q ? 'Best rated matches' : 'Highest rated of all time');
    }
    function run(add) {
      if (st.person) return; const q = st.q.trim(), my = ++st.seq; setHint();
      if (st.mode === 'title' && st.prov === 'omdb' && q.length < 3) { st.items = []; st.more = false; paint(q ? 'OMDb needs at least 3 letters.' : 'Type a movie or series name…'); form.classList.remove('busy'); return; }
      const page = add ? st.page + 1 : 1; form.classList.add('busy'); if (!add && !st.items.length) skeleton();
      const p = st.mode === 'title' ? SEARCH.title(q, st.prov, page) : st.mode === 'actor' ? SEARCH.actor(q, page) : SEARCH.top(st.mode, q, page);
      p.then(r => { if (my !== st.seq) return; st.page = page; st.items = add ? st.items.concat(r.items.filter(x => !st.items.some(y => key(y) === key(x)))) : r.items; st.more = r.more; paint(); })
        .catch(x => { if (my === st.seq) { st.items = []; st.more = false; paint(x.message || 'Something went wrong'); } })
        .finally(() => { if (my === st.seq) form.classList.remove('busy'); });
    }
    function bars() {
      const n = sel.size; bar.hidden = !n; if (!n) return;
      const pics = [...sel.values()].filter(r => r.poster).slice(-4);
      bar.innerHTML = `<div class="stk">${pics.map(r => `<img src="${esc2(r.poster)}" alt="">`).join('')}</div><b>${n} selected</b><button type="button" class="btn sm" id="adclr" ${st.adding ? 'disabled' : ''}>Clear</button><button type="button" class="btn p" id="adgo" ${st.adding ? 'disabled' : ''}>${st.adding ? 'Adding…' : 'Add ' + n + (n === 1 ? ' title' : ' titles')}</button>`;
    }
    async function addAll() {
      if (st.adding || !sel.size) return; st.adding = true; bars();
      const todo = [...sel.values()]; let ok = 0, dup = 0, bad = 0;
      for (let i = 0; i < todo.length; i += 3) await Promise.all(todo.slice(i, i + 3).map(async r => { try { addNew(await detail(r), true) ? ok++ : dup++; } catch (e) { bad++; } }));
      st.adding = false; sel.clear(); M.render(); bars(); if (st.person || st.items.length) paint();
      M.toast(ok ? `Added ${ok} title${ok === 1 ? '' : 's'} to Watchlist ✓` + (bad ? ` (${bad} failed)` : '') : bad ? 'Could not add — try again' : 'Already in your diary');
    }
    let tm = null;
    inp.addEventListener('input', () => { st.q = inp.value; $('#addc').hidden = !st.q; if (st.person) { st.person = null; st.items = []; } clearTimeout(tm); tm = setTimeout(() => run(), 220); });
    form.addEventListener('submit', e => { e.preventDefault(); clearTimeout(tm); run(); });
    $('#addc').addEventListener('click', () => { inp.value = ''; st.q = ''; $('#addc').hidden = true; st.person = null; st.items = []; run(); inp.focus(); });
    $('#admodes').addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (!b || b.disabled) return; st.mode = b.dataset.m; st.person = null; st.items = []; st.more = false; $('#admodes').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); inp.placeholder = HOLD[st.mode]; const s = $('#adsrc'); if (s) s.hidden = st.mode !== 'title'; run(); });
    const src = $('#adsrc'); if (src) src.addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (!b) return; st.prov = b.dataset.p; src.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); st.items = []; run(); });
    box.addEventListener('click', async e => {
      const pr = e.target.closest('[data-person]'), it = e.target.closest('[data-k]'), mo = e.target.closest('#admore'), bk = e.target.closest('#adback');
      if (bk) { st.person = null; st.items = []; run(); return; }
      if (mo) { mo.disabled = true; run(true); return; }
      if (pr) { const p = seen.get('person:' + pr.dataset.person); st.person = p; st.items = []; st.more = false; setHint(); skeleton(); const my = ++st.seq; try { const w = await SEARCH.works(p.id); if (my !== st.seq) return; st.items = w; paint(); } catch (x) { if (my === st.seq) paint(x.message); } return; }
      if (it && !it.disabled) { const k = it.dataset.k, r = seen.get(k); if (!r) return; if (sel.has(k)) sel.delete(k); else sel.set(k, r); it.classList.toggle('sel', sel.has(k)); bars(); }
    });
    bar.addEventListener('click', e => { if (e.target.closest('#adclr')) { sel.clear(); box.querySelectorAll('.ar.sel').forEach(x => x.classList.remove('sel')); bars(); } if (e.target.closest('#adgo')) addAll(); });
    run(); inp.focus();
  }
  function openLogin() {
    const d = $('#dlg');
    d.innerHTML = `<div class="dh"><button class="x" data-close aria-label="Close">${I('x')}</button><h2>Owner login</h2><p>Only the owner can add or edit titles. Everyone else can browse.</p></div><form class="db" id="lf"><label class="field">E-mail<input id="le" type="email" autocomplete="username" required></label><label class="field">Password<input id="lp" type="password" autocomplete="current-password" required></label><p id="lerr" style="color:#f87171"></p><button class="btn p">Sign in</button></form>`;
    d.showModal(); $('#le').focus();
    $('#lf').addEventListener('submit', async e => { e.preventDefault(); const b = e.target.querySelector('button'); b.disabled = true; $('#lerr').textContent = ''; try { await signIn($('#le').value, $('#lp').value); d.close(); ui(); M.render(); M.toast('Signed in as owner'); queue(); } catch (x) { $('#lerr').textContent = x.message; b.disabled = false; } });
  }
  function authClick() {
    if (!B.ok) { M.reset(); return; }
    if (!A.owner) { openLogin(); return; }
    if (confirm('Log out of owner mode?')) { const t = sess && sess.access; if (t) af('/auth/v1/logout', { token: t }).catch(() => {}); drop(); ui(); M.render(); M.toast('Logged out'); }
  }
  function ui() { const b = $('#addBtn'); b.innerHTML = I('plus') + ' Add title'; b.hidden = !(A.owner && (B.features.omdb || B.features.tmdb)); }
  $('#addBtn').addEventListener('click', openAdd);

  M.cloud = { get ok() { return B.ok; }, get owner() { return A.owner; }, get features() { return B.features; }, locked: () => B.ok && !A.owner, authLabel: () => B.ok ? (A.owner ? 'Owner log out' : 'Owner login') : 'Log Out', authClick, queue, remove, openAdd, addTmdb };

  (async () => {
    await ready; if (!B.ok) { ui(); M.render(); return; }
    await restore(); ui();
    try { const arr = await readAll(); jset(CACHE, arr); apply(arr); }
    catch (e) { const c = jget(CACHE, null); if (c) { apply(c); M.toast('Offline — showing the saved diary'); } else M.toast('Could not load the shared diary: ' + e.message); }
    M.render();
  })();
})();
