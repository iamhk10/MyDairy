/* Jarvis AI — works offline with a built-in brain; optionally upgrades to Gemini */
(function () {
  'use strict';
  const M = window.MD, I = M.I, esc = M.esc, $ = (s, r = document) => r.querySelector(s);
  const ROBOT = '<svg viewBox="0 0 120 130" fill="none"><defs><linearGradient id="rb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#c7d2fe"/></linearGradient></defs><path d="M60 8v14" stroke="#22d3ee" stroke-width="4" stroke-linecap="round"/><circle cx="60" cy="8" r="5" fill="#22d3ee"/><rect x="18" y="22" width="84" height="62" rx="28" fill="url(#rb)"/><rect x="28" y="34" width="64" height="38" rx="19" fill="#0b1030"/><ellipse cx="46" cy="53" rx="8" ry="10" fill="#22d3ee"/><ellipse cx="74" cy="53" rx="8" ry="10" fill="#22d3ee"/><circle cx="43" cy="49" r="2.5" fill="#fff"/><circle cx="71" cy="49" r="2.5" fill="#fff"/><rect x="8" y="42" width="10" height="24" rx="5" fill="#8b5cf6"/><rect x="102" y="42" width="10" height="24" rx="5" fill="#8b5cf6"/><rect x="34" y="88" width="52" height="34" rx="16" fill="url(#rb)"/><circle cx="60" cy="105" r="7" fill="#22d3ee" opacity=".85"/></svg>';
  const FACTS = ['The Boys is based on a comic series by Garth Ennis and Darick Robertson.', 'Stranger Things was originally pitched under the title “Montauk”.', 'Rick and Morty was created by Justin Roiland and Dan Harmon.', 'Oppenheimer won 7 Oscars at the 2024 Academy Awards, including Best Picture.', 'Tom Hiddleston first played Loki in Thor (2011).', 'Attack on Titan’s anime finished in 2023 after a decade.', 'Chernobyl was filmed partly in Lithuania, at a decommissioned nuclear plant.'];
  const MOODS = [
    [/funny|comedy|hasn|mazaa|laugh|light/, c => c.g.includes('Comedy'), 'something funny'],
    [/sci ?-?fi|space|future|time travel/, c => c.g.includes('Sci-Fi'), 'sci-fi'],
    [/dark|thriller|crime|suspense|mystery/, c => c.g.some(g => ['Thriller', 'Crime', 'Mystery', 'Dark'].includes(g)), 'something dark and gripping'],
    [/action|fight|mar ?dhaad/, c => c.g.includes('Action'), 'action'],
    [/anime|manga/, c => c.type === 'anime', 'anime'],
    [/indian|desi|hindi|bollywood/, c => c.g.includes('Indian'), 'desi picks'],
    [/marvel|dc|super ?hero/, c => c.g.includes('Superhero'), 'superhero'],
    [/drama|emotional|sad|rona/, c => c.g.includes('Drama'), 'drama'],
    [/short|quick|chhota|kam time/, c => c.m <= 130, 'short watches'],
    [/series|show|season|binge/, c => c.type === 'tv', 'a series to binge'],
    [/movie|film/, c => c.type === 'movie', 'a movie']
  ];
  const norm = s => s.toLowerCase().replace(/[^a-z0-9\u0900-\u097f ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const pick = a => a[Math.floor(Math.random() * a.length)];
  let hist = [], busy = false;
  try { hist = JSON.parse(localStorage.getItem('mydairy.chat') || '[]').slice(-20); } catch (e) {}
  const persist = () => { try { localStorage.setItem('mydairy.chat', JSON.stringify(hist.slice(-20))); } catch (e) {} };

  const titles = ids => ids.map(id => { const c = M.by[id]; return `<button class="tc" data-open="${id}">${I('star')}${esc(c.t)} ${c.r.toFixed(1)}</button>`; }).join('');
  const fmt = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
  const name = () => M.S.name, nm = () => (M.S.name ? ' ' + M.S.name : ''), lock = () => (M.cloud && M.cloud.locked() ? { text: 'Only the diary owner can change it. Use Owner login first.', ids: [] } : null);
  function welcome() { return { me: 0, text: `Hello${nm()}! 👋\nHow can I help you today?\nAsk me for a pick, “add loki”, “my stats”, or any movie by name.`, ids: [] }; }
  function draw() {
    const log = $('#jlog'); if (!log) return;
    log.innerHTML = [welcome()].concat(hist).map(m => `<div class="m ${m.me ? 'me' : ''}">${fmt(m.text)}${m.ids && m.ids.length ? '<div>' + titles(m.ids) + '</div>' : ''}</div>`).join('') + (busy ? '<div class="m typing"><i></i><i></i><i></i></div>' : '');
    log.scrollTop = log.scrollHeight;
  }

  /* ---------- offline brain ---------- */
  function suggest(n, f, label) {
    const base = M.recs(40).filter(f || (() => true)).slice(0, n || 4);
    const list = base.length ? base : M.C.filter(c => !M.L(c.id).st && (f || (() => true))(c)).slice(0, n || 4);
    if (!list.length) return { text: `You have already seen or saved everything I have for ${label || 'that'}! Try another mood.`, ids: [] };
    return { text: pick([`Here are my picks for ${label || 'you'}:`, `Tonight I would go with these (${label || 'matched to your taste'}):`, `Try one of these — ${label || 'based on what you rate high'}:`]), ids: list.map(c => c.id) };
  }
  function brain(raw) {
    const t = norm(raw), found = M.C.filter(c => t.includes(norm(c.t)) || (norm(c.t).split(' ').length === 1 && t.split(' ').includes(norm(c.t))));
    if (/^(hi|hello|hey|hii+|namaste|yo|hola)\b/.test(t)) return { text: `Hey${nm()}! Kya dekhna hai aaj — movie, series ya anime?`, ids: [] };
    if (/thank|shukriya|thanks|dhanyawad/.test(t)) return { text: 'Anytime! Happy watching 🍿', ids: [] };
    if (/\b(add|save|daal|dal|jodo)\b/.test(t) && found.length) { const cur = M.L(found[0].id).st; if (lock()) return lock(); if (cur) return { text: `**${found[0].t}** is already in your diary (${cur}).`, ids: [found[0].id] }; M.act(found[0].id, 'will'); return { text: `Done — **${found[0].t}** is in your watchlist.`, ids: [found[0].id] }; }
    if (/(watched|dekh li|dekh chuka|dekh liya|finished|complete)/.test(t) && found.length) { if (lock()) return lock(); const l = M.L(found[0].id); if (l.st !== 'watched') M.act(found[0].id, 'watched'); return { text: `Marked **${found[0].t}** as watched. Want to rate it? Open it below.`, ids: [found[0].id] }; }
    if (/(start|shuru|watching now)/.test(t) && found.length) { if (lock()) return lock(); M.act(found[0].id, 'watching'); return { text: `Enjoy **${found[0].t}**! I added it to Continue Watching.`, ids: [found[0].id] }; }
    if (/watchlist|baad me|up next|later/.test(t)) { const l = M.C.filter(c => ['will', 'watching'].includes(M.L(c.id).st)); return l.length ? { text: `You have ${l.length} in your watchlist:`, ids: l.map(c => c.id) } : { text: 'Your watchlist is empty. Want a recommendation?', ids: [] }; }
    if (/stat|kitn|hours|ghante|how many|count/.test(t)) { const s = M.stats(); return { text: `You have watched **${s.movies}** movies and **${s.series}** series/anime — about **${s.hours} hours** in total.`, ids: [] }; }
    if (/fun ?fact|did you know|fact/.test(t)) return { text: pick(FACTS), ids: [] };
    if (/favou?rite|best of mine|my fav/.test(t)) { const l = M.C.filter(c => M.L(c.id).fav); return l.length ? { text: 'Your favourites:', ids: l.map(c => c.id) } : { text: 'No favourites yet. Open a title and tap Add favorite.', ids: [] }; }
    if (/help|what can you|kya kar/.test(t)) return { text: 'I can:\n• recommend by mood (“something funny”, “dark thriller”, “short anime”)\n• add titles (“add Dune”) or mark them watched\n• show your watchlist, favourites and stats\n• tell you about any title and share fun facts', ids: [] };
    if (/trend|latest|new|naya|popular|top/.test(t)) { const l = [...M.C].sort((a, b) => (/popular/.test(t) ? b.pop - a.pop : /latest|new|naya/.test(t) ? b.y - a.y : b.tr - a.tr)).slice(0, 5); return { text: /latest|new|naya/.test(t) ? 'Newest titles in MyDairy:' : 'Hot right now:', ids: l.map(c => c.id) }; }
    if (found.length) { const c = found[0], l = M.L(c.id); return { text: `**${c.t}** (${c.y}) — ${c.d}\n${c.g.join(', ')} • ${c.r.toFixed(1)}/10${l.st ? ' • in your diary: ' + l.st : ''}`, ids: [c.id] }; }
    const mood = MOODS.filter(m => m[0].test(t));
    if (mood.length) return suggest(4, c => mood.every(m => m[1](c)) , mood.map(m => m[2]).join(' + ')) ;
    if (/recommend|suggest|dekhu|dekhun|watch|batao|kuch|something|tonight|mood|bore/.test(t)) return suggest(4);
    return null;
  }

  /* ---------- optional cloud brain ---------- */
  async function cloud(raw) {
    const S = M.S, msgs = hist.slice(-8).map(m => ({ role: m.me ? 'user' : 'model', text: m.text }));
    if (S.key) {
      const lib = Object.entries(S.lib).filter(([id]) => M.by[id]).map(([id, l]) => `${M.by[id].t}|${l.st || ''}${l.fav ? '|fav' : ''}${l.my ? '|' + l.my + '/10' : ''}`).join('; ');
      const sys = `You are Jarvis, the friendly assistant inside MyDairy, a movie/series/anime diary. ${S.name ? 'User: ' + S.name + '. ' : ''}Reply in the user's language (English, Hindi or Hinglish), briefly. Diary: ${lib || 'empty'}. Catalogue: ${M.C.map(c => c.t).join(', ')}. Never invent diary facts.`;
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': S.key }, body: JSON.stringify({ systemInstruction: { parts: [{ text: sys }] }, contents: msgs.map(m => ({ role: m.role, parts: [{ text: m.text }] })), generationConfig: { temperature: .8, maxOutputTokens: 600 } }) });
      const d = await r.json(); if (!r.ok) throw new Error(r.status === 400 || r.status === 403 ? 'Gemini key was rejected. Check it in Settings.' : 'Gemini is busy, try again.');
      const tx = ((d.candidates || [])[0] || {}).content; return { text: ((tx && tx.parts) || []).map(p => p.text || '').join('').trim() || 'I drew a blank — ask again?', ids: [] };
    }
    if (M.cloud && M.cloud.features.jarvis) {   // Vercel proxy (api/jarvis.js), if deployed
      const r = await fetch('api/jarvis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: msgs }) });
      if (r.ok) { const d = await r.json(); if (d.reply) return { text: d.reply, ids: [] }; }
    }
    return null;
  }

  async function ask(text) {
    text = String(text || '').trim().slice(0, 600); if (!text || busy) return;
    hist.push({ me: 1, text }); busy = true; draw();
    const t0 = Date.now(); let out = brain(text);
    if (!out) { try { out = await cloud(text); } catch (e) { out = { text: e.message || 'Could not reach the AI service.', ids: [] }; } }
    if (!out) out = { text: `I did not catch that. Try “recommend a thriller”, “add Dune”, “my watchlist” or “fun fact”. Add a Gemini key in Settings and I can chat about anything.`, ids: [] };
    await new Promise(r => setTimeout(r, Math.max(0, 650 - (Date.now() - t0))));
    hist.push({ me: 0, text: out.text, ids: out.ids || [] }); busy = false; persist(); draw();
  }

  function mount() {
    $('#jarvis').innerHTML = `<header><span class="mini">${ROBOT.replace('viewBox', 'width="34" viewBox')}</span><b>Jarvis AI</b><span class="on">Online</span></header><div class="log" id="jlog" aria-live="polite"></div><div class="robot">${ROBOT}</div><div class="jc">${['Recommend a movie', 'My Watchlist', 'Latest Movies', 'Fun Fact', 'My stats'].map(q => `<button type="button" data-q="${q}">${q}</button>`).join('')}</div><form id="jform" autocomplete="off">${I('spark')}<input id="jin" placeholder="Ask me anything..." maxlength="300" aria-label="Message Jarvis"><button aria-label="Send">${I('send')}</button></form>`;
    $('#jform').addEventListener('submit', e => { e.preventDefault(); const i = $('#jin'); const v = i.value; i.value = ''; ask(v); });
    $('#jarvis').addEventListener('click', e => { const b = e.target.closest('[data-q]'); if (b) ask(b.dataset.q); });
    draw();
  }
  mount();
  /* ---------- floating Jarvis button (bottom-right) ---------- */
  const FACE = '<svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><defs><linearGradient id="fg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#c7d2fe"/></linearGradient></defs><path d="M24 5v6" stroke="#22d3ee" stroke-width="2.4" stroke-linecap="round"/><circle cx="24" cy="5" r="2.6" fill="#22d3ee"/><rect x="6" y="11" width="36" height="28" rx="13" fill="url(#fg)"/><rect x="11" y="16" width="26" height="18" rx="9" fill="#0b1030"/><ellipse class="eye" cx="19" cy="25" rx="3.2" ry="4.2" fill="#22d3ee"/><ellipse class="eye" cx="29" cy="25" rx="3.2" ry="4.2" fill="#22d3ee"/><rect x="2" y="21" width="4" height="10" rx="2" fill="#8b5cf6"/><rect x="42" y="21" width="4" height="10" rx="2" fill="#8b5cf6"/></svg>';
  const UP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  const fab = $('#fab'), jv = $('#jarvis');
  fab.innerHTML = `<span class="fi"><span class="f1">${FACE}</span><span class="f2">${UP}</span></span><span class="fl">Ask Jarvis</span>`;
  const fl = $('.fl', fab), fine = matchMedia('(hover:hover) and (pointer:fine)');
  let saved = null, ticking = false;
  const here = () => { const r = jv.getBoundingClientRect(), vh = innerHeight, seen = Math.min(r.bottom, vh) - Math.max(r.top, 0); return seen > Math.min(r.height, vh) * 0.6; };
  function sync() {
    ticking = false;
    const on = here();
    if (on === fab.classList.contains('back')) return;
    fab.classList.toggle('back', on); fl.textContent = on ? 'Back' : 'Ask Jarvis';
    fab.setAttribute('aria-label', on ? 'Go back to where you were' : 'Open Jarvis AI');
    if (!on) saved = null;
  }
  const queue = () => { if (!ticking) { ticking = true; requestAnimationFrame(sync); } };
  addEventListener('scroll', queue, { passive: true }); addEventListener('resize', queue); addEventListener('hashchange', () => setTimeout(sync, 400));
  fab.addEventListener('click', () => {
    if (fab.classList.contains('back')) { const y = saved != null && saved < jv.getBoundingClientRect().top + scrollY ? saved : 0; saved = null; scrollTo({ top: y, behavior: 'smooth' }); return; }
    saved = scrollY;
    const vh = innerHeight, room = 92, r = jv.getBoundingClientRect();     /* keep the chat box clear of the button */
    const top = r.bottom + scrollY - vh + room;                             /* chat input always stays visible, even on short screens */
    scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    if (fine.matches) {                                                     /* on touch screens don't pop the keyboard up */
      let done = false; const go = () => { if (!done) { done = true; const i = $('#jin'); i && i.focus({ preventScroll: true }); } };
      addEventListener('scrollend', go, { once: true }); setTimeout(go, 900);
    }
  });
  fab.classList.add('ex'); setTimeout(() => fab.classList.remove('ex'), 4500); sync();
  M.welcome = draw;
  window.addEventListener('storage', () => { try { hist = JSON.parse(localStorage.getItem('mydairy.chat') || '[]'); draw(); } catch (e) {} });
})();
