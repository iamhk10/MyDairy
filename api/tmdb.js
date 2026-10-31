/* GET /api/tmdb?path=/search/multi&query=… → TMDB v3. Owner only; the key stays on the server. */
'use strict';
const L = require('./_lib');

const PATH_OK = /^\/(search\/(multi|movie|tv)|(movie|tv)\/\d{1,9}|trending\/all\/week|find\/tt\d{6,10}|configuration)$/;
const PARAMS = ['query', 'page', 'language', 'include_adult', 'append_to_response', 'external_source'];

module.exports = async (req, res) => {
  if (req.method !== 'GET') return L.send(res, 405, { error: 'method' });
  if (!L.sameOrigin(req)) return L.send(res, 403, { error: 'origin' });
  const key = L.env('TMDB_API_KEY');
  if (!key) return L.send(res, 503, { error: 'no-key', message: 'TMDB_API_KEY is not set in Vercel.' });
  if (!(await L.isOwner(req))) return L.send(res, 401, { error: 'auth', message: 'Owner login required.' });
  if (L.limited('tmdb:' + L.ip(req), 120, 60000)) return L.send(res, 429, { error: 'limit' });

  const q = new URL(req.url, 'http://x').searchParams, path = q.get('path') || '';
  if (!PATH_OK.test(path)) return L.send(res, 400, { error: 'bad-path' });
  const out = new URLSearchParams(), headers = { Accept: 'application/json' };
  PARAMS.forEach((k) => { const v = q.get(k); if (v != null && v !== '' && v.length < 200) out.set(k, v); });
  if (/^eyJ/.test(key)) headers.Authorization = 'Bearer ' + key; else out.set('api_key', key);   // v4 token or v3 key
  try {
    const r = await fetch('https://api.themoviedb.org/3' + path + '?' + out.toString(), { headers });
    const d = await r.json().catch(() => ({}));
    L.send(res, r.status === 401 ? 502 : r.status, d);
  } catch (e) { L.send(res, 502, { error: 'upstream', message: 'Could not reach TMDB.' }); }
};
