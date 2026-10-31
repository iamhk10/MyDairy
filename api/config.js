/* GET /api/config → what the browser needs to start. Only PUBLIC values leave the server:
   the Supabase URL + anon key are public by design (Row Level Security protects the data). */
'use strict';
const L = require('./_lib');

module.exports = (req, res) => {
  if (req.method !== 'GET') return L.send(res, 405, { error: 'method' });
  L.send(res, 200, {
    supabaseUrl: L.supabaseUrl(),
    supabaseAnonKey: L.anonKey(),
    features: {
      jarvis: !!L.env('GEMINI_API_KEY'),
      omdb: !!L.env('OMDB_API_KEY'),
      tmdb: !!L.env('TMDB_API_KEY')
    },
    ownerName: L.env('OWNER_NAME', '')
  }, { 'Cache-Control': 'public, max-age=0, s-maxage=30' });
};
