/* Shared helpers for the Vercel serverless functions (files starting with "_" are never exposed as routes). */
'use strict';

const env = (k, d) => { const v = process.env[k]; return v == null || v === '' ? (d === undefined ? '' : d) : String(v).trim(); };

const supabaseUrl = () => env('SUPABASE_URL').replace(/\/+$/, '');
const anonKey = () => env('SUPABASE_ANON_KEY');

function send(res, status, body, headers) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  Object.keys(headers || {}).forEach((k) => res.setHeader(k, headers[k]));
  res.end(JSON.stringify(body));
}

/** same-origin only — other websites must not be able to spend your API quota from their pages */
function sameOrigin(req) {
  const o = req.headers.origin;
  if (!o) return true;                                   // plain navigations / curl have no Origin
  try { return new URL(o).host === String(req.headers.host || '').toLowerCase(); } catch (e) { return false; }
}

function ip(req) {
  const f = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return f || (req.socket && req.socket.remoteAddress) || 'unknown';
}

/* tiny in-memory limiter: best effort (each serverless instance has its own memory), good enough to stop casual abuse */
const buckets = new Map();
function limited(key, max, windowMs) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now > b.reset) { b = { n: 0, reset: now + windowMs }; buckets.set(key, b); }
  b.n++;
  if (buckets.size > 5000) for (const [k, v] of buckets) if (now > v.reset) buckets.delete(k);
  return b.n > max;
}

function body(req) {
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } }
  return b && typeof b === 'object' ? b : {};
}

/** the caller must be the owner: ask Supabase (with THEIR token) whether public.is_owner() is true */
const ownerCache = new Map();
async function isOwner(req) {
  const m = /^Bearer\s+(\S+)$/i.exec(String(req.headers.authorization || ''));
  if (!m || !supabaseUrl() || !anonKey()) return false;
  const tok = m[1], hit = ownerCache.get(tok);
  if (hit && Date.now() < hit.until) return hit.ok;
  let ok = false;
  try {
    const r = await fetch(supabaseUrl() + '/rest/v1/rpc/is_owner', {
      method: 'POST',
      headers: { apikey: anonKey(), Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
      body: '{}'
    });
    ok = r.ok && (await r.json()) === true;
  } catch (e) { ok = false; }
  if (ownerCache.size > 200) ownerCache.clear();
  ownerCache.set(tok, { ok, until: Date.now() + 60000 });
  return ok;
}

/** headers for an anonymous Supabase call (legacy anon keys are JWTs → also Bearer; new "publishable" keys go in apikey only) */
const anonHeaders = () => { const k = anonKey(); const h = { apikey: k }; if (/^eyJ/.test(k)) h.Authorization = 'Bearer ' + k; return h; };

module.exports = { anonHeaders, env, supabaseUrl, anonKey, send, sameOrigin, ip, limited, body, isOwner };
