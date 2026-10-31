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
    return { id: x.id, t: x.title, y: parseInt(x.year, 10) || '', type: tags.includes('anime') ? 'anime' : tv ? 'tv' : 'movie', g: g.length ? g : ['Unsorted'], r, h: hue(x.title), pop: r * 10, tr: r * 10 + (x.fav ? 8 : 0) + (Date.parse(x.added) || 0) / 1e13, m: tv ? (x.runtime || 45) * (x.episodes || (x.seasons || 1) * 8) : (x.runtime || 110), d: x.overview || '', p: safe(x.poster), cloud: 1 };
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
  function addNew(it) {
    if (raw[it.id]) { M.toast('Already in your diary'); return; }
    it.status = 'will'; it.added = new Date().toISOString();
    if (!it.tags && (it.genres || []).includes('Animation') && /japan/i.test(it.country || '')) it.tags = ['anime'];
    raw[it.id] = compact(it); remote[it.id] = ''; M.upsert(toMD(raw[it.id])); M.S.lib[it.id] = libOf(it); M.save(); M.render(); M.toast('Added to Watchlist');
  }

  /* ---------- OMDb / TMDB through /api (owner token required) ---------- */
  async function api(url) { const t = await token(); const r = await fetch(url, { headers: { Authorization: 'Bearer ' + t } }); const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.message || 'Error ' + r.status); return d; }
  async function search(q, p) {
    if (p === 'tmdb') { const d = await api('api/tmdb?path=' + encodeURIComponent(q ? '/search/multi' : '/trending/all/week') + (q ? '&query=' + encodeURIComponent(q) : '')); return (d.results || []).filter(x => x.media_type === 'movie' || x.media_type === 'tv').map(x => ({ p: 'tmdb', id: x.id, mt: x.media_type, title: x.title || x.name, year: (x.release_date || x.first_air_date || '').slice(0, 4), poster: x.poster_path ? 'https://image.tmdb.org/t/p/w185' + x.poster_path : '' })); }
    const d = await api('api/omdb?s=' + encodeURIComponent(q)); if (d.Response === 'False') throw new Error(d.Error || 'No results');
    return (d.Search || []).filter(x => x.Type === 'movie' || x.Type === 'series').map(x => ({ p: 'omdb', id: x.imdbID, title: x.Title, year: na(x.Year), poster: safe(na(x.Poster)) }));
  }
  async function detail(r) {
    if (r.p === 'tmdb') {
      const d = await api('api/tmdb?path=' + encodeURIComponent('/' + r.mt + '/' + r.id)), tv = r.mt === 'tv';
      return { id: 'tm_' + r.mt + '_' + r.id, tmdb: r.mt + '/' + r.id, title: d.title || d.name, year: (d.release_date || d.first_air_date || '').slice(0, 4), type: tv ? 'series' : 'movie', kind: tv ? 'web' : 'movie', poster: d.poster_path ? 'https://image.tmdb.org/t/p/w342' + d.poster_path : '', backdrop: d.backdrop_path ? 'https://image.tmdb.org/t/p/w780' + d.backdrop_path : '', rating: Math.round((d.vote_average || 0) * 10) / 10, rsrc: 'TMDB', genres: (d.genres || []).map(g => g.name), overview: d.overview || '', runtime: d.runtime || (d.episode_run_time || [])[0] || 0, seasons: d.number_of_seasons || 0, episodes: d.number_of_episodes || 0 };
    }
    const d = await api('api/omdb?i=' + encodeURIComponent(r.id) + '&plot=full'); if (d.Response === 'False') throw new Error(d.Error || 'Not found'); const tv = d.Type === 'series';
    return { id: d.imdbID, imdb: d.imdbID, title: d.Title, year: na(d.Year), type: tv ? 'series' : 'movie', kind: tv ? 'web' : 'movie', poster: safe(na(d.Poster)).replace(/_SX\d+/, '_SX400'), rating: parseFloat(na(d.imdbRating)) || 0, genres: list(d.Genre), overview: na(d.Plot), runtime: parseInt(na(d.Runtime), 10) || 0, seasons: parseInt(na(d.totalSeasons), 10) || 0, director: na(d.Director), cast: list(d.Actors).slice(0, 6), lang: na(d.Language), country: na(d.Country) };
  }

  /* ---------- dialogs ---------- */
  function openAdd() {
    const f = B.features, d = $('#dlg');
    if (!f.omdb && !f.tmdb) { M.toast('Set OMDB_API_KEY or TMDB_API_KEY in Vercel first'); return; }
    d.innerHTML = `<div class="dh"><button class="x" data-close aria-label="Close">${I('x')}</button><h2>Add title</h2></div><div class="db"><form id="addf" class="field"><div style="display:flex;gap:8px"><input id="addq" placeholder="Search a movie or series…" style="flex:1" autocomplete="off">${f.omdb && f.tmdb ? '<select id="addp" class="field" style="border-radius:14px;padding:0 10px;background:var(--sf);border:1px solid var(--bd)"><option value="omdb">OMDb</option><option value="tmdb">TMDB</option></select>' : ''}<button class="btn p sm">${I('search')}</button></div><small>${f.tmdb ? 'TMDB: leave empty to see what is trending.' : 'Data from IMDb via OMDb.'}</small></form><div class="hl" id="addres"></div></div>`;
    d.showModal();
    const run = async () => {
      const q = $('#addq').value.trim(), p = $('#addp') ? $('#addp').value : (f.omdb ? 'omdb' : 'tmdb'), box = $('#addres'); if (!q && p !== 'tmdb') return;
      box.innerHTML = '<div class="empty">Searching…</div>';
      try {
        const rs = await search(q, p); box.innerHTML = rs.length ? rs.slice(0, 12).map((r, i) => `<div class="it" data-i="${i}">${r.poster ? `<img src="${esc(r.poster)}" alt="" width="46" height="56" style="border-radius:10px;object-fit:cover">` : '<span class="sq"></span>'}<div><b>${esc(r.title)}</b><br><small>${esc(r.year)} • ${r.p === 'tmdb' ? 'TMDB' : 'IMDb'}</small></div></div>`).join('') : '<div class="empty">No results.</div>';
        box.onclick = async e => { const it = e.target.closest('.it'); if (!it) return; it.style.opacity = .5; try { addNew(await detail(rs[+it.dataset.i])); d.close(); } catch (x) { it.style.opacity = 1; M.toast(x.message); } };
      } catch (x) { box.innerHTML = `<div class="empty">${esc(x.message)}</div>`; }
    };
    $('#addf').addEventListener('submit', e => { e.preventDefault(); run(); }); $('#addp') && $('#addp').addEventListener('change', run);
    if (f.tmdb && !f.omdb) run(); else $('#addq').focus();
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

  M.cloud = { get ok() { return B.ok; }, get owner() { return A.owner; }, get features() { return B.features; }, locked: () => B.ok && !A.owner, authLabel: () => B.ok ? (A.owner ? 'Owner log out' : 'Owner login') : 'Log Out', authClick, queue, remove, openAdd };

  (async () => {
    await ready; if (!B.ok) { ui(); M.render(); return; }
    await restore(); ui();
    try { const arr = await readAll(); jset(CACHE, arr); apply(arr); }
    catch (e) { const c = jget(CACHE, null); if (c) { apply(c); M.toast('Offline — showing the saved diary'); } else M.toast('Could not load the shared diary: ' + e.message); }
    M.render();
  })();
})();
