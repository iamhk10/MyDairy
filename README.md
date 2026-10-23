# ΣTΣЯПITY — my watch diary 🎬

A single-page diary of movies, web series and TV shows: **watched · watching · will watch · not watching · never will watch**.
Everyone can browse it; **only the owner can add, edit or delete**.

## Files
| File | What it is |
|---|---|
| `index.html` | the whole site (no build step, no dependencies) |
| `data.json` | the library itself — the owner's saves are written here |
| `sw.js` | optional offline helper (delete it if you don't want it) |

## 1 · Deploy (GitHub Pages)
1. Create a repo (e.g. `eternity`) and upload `index.html`, `data.json`, `sw.js`.
2. **Settings → Pages → Deploy from a branch → `main` / root**. The site appears in about a minute at `https://<you>.github.io/<repo>/`.

## 2 · Create the owner token (once)
1. GitHub → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. **Repository access:** *Only select repositories* → pick this repo.
3. **Permissions → Repository → Contents: Read and write.** Nothing else.
4. Copy the token (`github_pat_…`).

## 3 · First owner login
1. Open the site → tap the 🔐 button.
2. Paste the token, confirm the repo (auto-detected on `github.io`), paste your **OMDb key**, optionally a TMDB key.
3. Choose a **passcode (6+ characters)**. It encrypts the token and keys *on this device only* (AES-GCM, PBKDF2).
4. Next time you only type the passcode. The tab auto-locks after 30 min idle.

Keys: free OMDb key (IMDb data) → https://www.omdbapi.com/apikey.aspx · optional TMDB key → https://www.themoviedb.org/settings/api

## How the "only me" lock works
The real lock is the **GitHub token**: nobody else can change `data.json`. The passcode only protects the token inside your browser. Visitors get a read-only view; the edit UI is never shown to them.
Without a token the site runs in **local mode** (library saved only in your browser).

## Good to know
- The repo and `data.json` are **public**: titles, ratings and notes are visible to anyone. Never put private notes there.
- API keys and the token are **never** written to the repo.
- Marvel / DC / Indian / Anime / Korean tags are auto-detected; Web-vs-TV is a guess. You can change both on any title.
- Backup: ⋯ menu → Export JSON / CSV. Import works from the same menu.
- Shortcuts: `/` search · `R` random · `S` stats · `T` theme · `N` add · `Ctrl+Z` / `Ctrl+Shift+Z` undo/redo · `Ctrl+S` save · `?` help.
- Rename labels, tags, repo or feedback email in the `CONFIG` block at the top of the script.

Movie data from IMDb via OMDb and TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.
