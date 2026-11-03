/* GET /api/tmdb?path=/search/multi&query=… → TMDB v3. The key stays on the server.
   • PUBLIC (no login, cached): trending / popular / top-rated lists — used by the Home tab for every visitor.
   • OWNER only: everything else (search, details, actor search, an actor's filmography …). */
'use strict';
const L = require('./_lib');

const PUBLIC_OK = /^\/(trending\/all\/week|(movie|tv)\/(popular|top_rated))$/;
const OWNER_OK = /^\/(search\/(multi|movie|tv|person)|(movie|tv)\/\d{1,9}|person\/(popular|\d{1,9}\/combined_credits)|find\/tt\d{6,10}|configuration)$/;
const PARAMS = ['query', 'page', 'language', 'include_adult', 'append_to_response', 'external_source'];

module.exports = async (req, res) => {
  if (req.method !== 'GET') return L.send(res, 405, { error: 'method' });
  if (!L.sameOrigin(req)) return L.send(res, 403, { error: 'origin' });
  const key = L.env('TMDB_API_KEY');
  if (!key) return L.send(res, 503, { error: 'no-key', message: 'TMDB_API_KEY is not set in Vercel.' });

  const q = new URL(req.url, 'http://x').searchParams, path = q.get('path') || '';
  const pub = PUBLIC_OK.test(path);
  if (!pub && !OWNER_OK.test(path)) return L.send(res, 400, { error: 'bad-path' });
  if (q.get('page') != null && !/^\d{1,3}$/.test(q.get('page'))) return L.send(res, 400, { error: 'bad-page' });

  if (pub) {
    if (L.limited('tmdb-pub:' + L.ip(req), 60, 60000)) return L.send(res, 429, { error: 'limit' });
  } else {
    if (!(await L.isOwner(req))) return L.send(res, 401, { error: 'auth', message: 'Owner login required.' });
    if (L.limited('tmdb:' + L.ip(req), 240, 60000)) return L.send(res, 429, { error: 'limit' });
  }

  const out = new URLSearchParams(), headers = { Accept: 'application/json' };
  PARAMS.forEach((k) => { if (pub && k === 'query') return; const v = q.get(k); if (v != null && v !== '' && v.length < 200) out.set(k, v); });
  if (/^eyJ/.test(key)) headers.Authorization = 'Bearer ' + key; else out.set('api_key', key);   // v4 token or v3 key
  try {
    const r = await fetch('https://api.themoviedb.org/3' + path + '?' + out.toString(), { headers });
    const d = await r.json().catch(() => ({}));
    const status = r.status === 401 ? 502 : r.status;
    L.send(res, status, d, pub && r.ok ? { 'Cache-Control': 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400' } : undefined);
  } catch (e) { L.send(res, 502, { error: 'upstream', message: 'Could not reach TMDB.' }); }
};
