# MyDairy — Watch • Track • Remember

Movies, series aur anime ka personal diary. Pure static app: HTML + CSS + JS alag files mein, koi build step nahi.

| File | Kaam |
|---|---|
| `index.html` | page structure |
| `css/style.css` | theme, animations, responsive layout |
| `js/icons.js` | premium icon set |
| `js/data.js` | starter catalogue (naye titles yahan add karo) |
| `js/app.js` | views, watchlist, progress, ratings, stats, backup |
| `js/jarvis.js` | Jarvis AI (offline brain + optional Gemini) |
| `js/pwa.js`, `sw.js`, `manifest.webmanifest` | PWA install + offline |
| `js/cloud.js` | Supabase owner login, shared library sync, OMDb/TMDB "Add title" |
| `api/config.js`, `api/omdb.js`, `api/tmdb.js`, `api/jarvis.js`, `vercel.json` | Vercel functions (API keys server par rehti hain) |
| `supabase/schema.sql` | database table + owner-only write rules |

## Chalana
PWA install ke liye HTTPS ya localhost chahiye.
- Local: `python3 -m http.server 8000` → http://localhost:8000
- Deploy: GitHub Pages / Vercel / Netlify par poora folder upload karo.

## Jarvis
Offline bhi jawab deta hai (recommend, add, watchlist, stats, fun facts, title info).
Kuch bhi pooch-ne ke liye Settings mein free Gemini key daalo (aistudio.google.com/apikey). Key sirf is device par rehti hai.
Vercel par `GEMINI_API_KEY` env var set karoge to `api/jarvis.js` use hoga.

## Supabase + OMDb/TMDB (original setup)
1. `supabase/schema.sql` Supabase SQL editor mein chalao (last line mein apni owner e-mail).
2. Vercel env vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `OMDB_API_KEY` ya `TMDB_API_KEY`, optional `GEMINI_API_KEY` (dekho `.env.example`).
3. Deploy ke baad sidebar mein **Owner login** se sign in karo; header mein **Add title** aa jayega (OMDb/TMDB search).
   Visitors sirf dekh sakte hain; sirf owner edit kar sakta hai.

Backend set na ho to app local mode mein chalta hai.

## Data (local mode)
Diary browser ke localStorage mein save hoti hai. Downloads page se backup export/import karo.
Shortcut: `/` dabao search ke liye.
