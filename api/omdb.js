/* GET /api/omdb?s=…|i=…|t=…  → OMDb (IMDb data). Owner only; the key stays on the server. */
'use strict';
const L = require('./_lib');

const ALLOWED = ['s', 'i', 't', 'y', 'type', 'page', 'plot'];

module.exports = async (req, res) => {
  if (req.method !== 'GET') return L.send(res, 405, { error: 'method' });
  if (!L.sameOrigin(req)) return L.send(res, 403, { error: 'origin' });
  const key = L.env('OMDB_API_KEY');
  if (!key) return L.send(res, 503, { error: 'no-key', message: 'OMDB_API_KEY is not set in Vercel.' });
  if (!(await L.isOwner(req))) return L.send(res, 401, { error: 'auth', message: 'Owner login required.' });
  if (L.limited('omdb:' + L.ip(req), 120, 60000)) return L.send(res, 429, { error: 'limit' });

  const q = new URL(req.url, 'http://x').searchParams, out = new URLSearchParams();
  ALLOWED.forEach((k) => { const v = q.get(k); if (v != null && v !== '' && v.length < 200) out.set(k, v); });
  if (!out.has('s') && !out.has('i') && !out.has('t')) return L.send(res, 400, { error: 'bad-request' });
  out.set('apikey', key);
  try {
    const r = await fetch('https://www.omdbapi.com/?' + out.toString());
    const d = await r.json().catch(() => ({ Response: 'False', Error: 'Bad answer from OMDb.' }));
    L.send(res, r.status === 401 ? 200 : (r.ok ? 200 : 502), d);     // OMDb signals problems in the body ("Invalid API key!")
  } catch (e) { L.send(res, 502, { error: 'upstream', message: 'Could not reach OMDb.' }); }
};
