// === WAFFLE API MODULE ===
// Uses TMDB with embedded public key + Jikan for anime (no key needed)

const TMDB_KEY = '8265bd1679663a7ea12ac168da84d2e8'; // public demo key
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p';
const JIKAN = 'https://api.jikan.moe/v4';

// Pomfy player API
const POMFY = 'https://api.pomfy.stream';
const POMFY_COLOR = 'a78bfa'; // purple accent

const LANG = 'pt-BR';

// ── TMDB helpers ──────────────────────────────────────────────
async function tmdb(endpoint, params = {}) {
  const url = new URL(`${TMDB_BASE}${endpoint}`);
  url.searchParams.set('api_key', TMDB_KEY);
  url.searchParams.set('language', LANG);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json();
}

function poster(path, size = 'w342') {
  return path ? `${TMDB_IMG}/${size}${path}` : null;
}
function backdrop(path, size = 'w1280') {
  return path ? `${TMDB_IMG}/${size}${path}` : null;
}

// ── Movie endpoints ───────────────────────────────────────────
const API = {
  async moviesTrending(page = 1) {
    return tmdb('/trending/movie/week', { page });
  },
  async moviesPopular(page = 1) {
    return tmdb('/movie/popular', { page });
  },
  async moviesNowPlaying(page = 1) {
    return tmdb('/movie/now_playing', { page });
  },
  async moviesTopRated(page = 1) {
    return tmdb('/movie/top_rated', { page });
  },
  async moviesUpcoming(page = 1) {
    return tmdb('/movie/upcoming', { page });
  },

  // ── Series ─────────────────────────────────────────────────
  async seriesPopular(page = 1) {
    return tmdb('/tv/popular', { page });
  },
  async seriesOnTheAir(page = 1) {
    return tmdb('/tv/on_the_air', { page });
  },
  async seriesTopRated(page = 1) {
    return tmdb('/tv/top_rated', { page });
  },
  async seriesAiringToday(page = 1) {
    return tmdb('/tv/airing_today', { page });
  },

  // ── Trending All ─────────────────────────────────────────────
  async trendingAll(timeWindow = 'week', page = 1) {
    return tmdb(`/trending/all/${timeWindow}`, { page });
  },

  // ── Detail ──────────────────────────────────────────────────
  async movieDetail(id) {
    return tmdb(`/movie/${id}`, { append_to_response: 'credits,similar' });
  },
  async seriesDetail(id) {
    return tmdb(`/tv/${id}`, { append_to_response: 'credits,similar' });
  },
  async seasonDetail(tvId, season) {
    return tmdb(`/tv/${tvId}/season/${season}`);
  },

  // ── Search TMDB ─────────────────────────────────────────────
  async searchMulti(query, page = 1) {
    return tmdb('/search/multi', { query, page });
  },

  // ── Jikan (Anime - no key) ──────────────────────────────────
  async animeTop(filter = 'airing', page = 1) {
    const res = await fetch(`${JIKAN}/top/anime?filter=${filter}&page=${page}&limit=20`);
    if (!res.ok) throw new Error('Jikan error');
    return res.json();
  },
  async animeSearch(query, page = 1) {
    await jikanThrottle();
    const res = await fetch(`${JIKAN}/anime?q=${encodeURIComponent(query)}&page=${page}&limit=10`);
    if (!res.ok) throw new Error('Jikan search error');
    return res.json();
  },
  async animeDetail(id) {
    await jikanThrottle();
    const res = await fetch(`${JIKAN}/anime/${id}/full`);
    if (!res.ok) throw new Error('Jikan detail error');
    return res.json();
  },

  // ── Pomfy Player URLs ────────────────────────────────────────
  playerMovie(tmdbId) {
    return `${POMFY}/filme/${tmdbId}#${POMFY_COLOR}`;
  },
  playerSeries(tmdbId, season, episode) {
    return `${POMFY}/serie/${tmdbId}/${season}/${episode}#${POMFY_COLOR}`;
  },
  // For anime we use the series endpoint with TMDB ID (looked up)
  playerAnime(tmdbId, episode = 1) {
    return `${POMFY}/serie/${tmdbId}/1/${episode}#${POMFY_COLOR}`;
  },
};

// Jikan rate-limit: 3 req/s
let _jikanLast = 0;
function jikanThrottle() {
  return new Promise(resolve => {
    const now = Date.now();
    const wait = Math.max(0, 400 - (now - _jikanLast));
    _jikanLast = now + wait;
    setTimeout(resolve, wait);
  });
}

// ── Normalise items to common shape ──────────────────────────
function normalizeMovie(item) {
  return {
    id: item.id,
    type: 'movie',
    title: item.title || item.name || 'Sem título',
    poster: poster(item.poster_path),
    backdrop: backdrop(item.backdrop_path),
    rating: item.vote_average ? item.vote_average.toFixed(1) : null,
    year: (item.release_date || item.first_air_date || '').slice(0, 4),
    overview: item.overview || '',
    genres: item.genres?.map(g => g.name) || [],
    tmdbId: item.id,
  };
}
function normalizeSeries(item) {
  return {
    id: item.id,
    type: 'tv',
    title: item.name || item.title || 'Sem título',
    poster: poster(item.poster_path),
    backdrop: backdrop(item.backdrop_path),
    rating: item.vote_average ? item.vote_average.toFixed(1) : null,
    year: (item.first_air_date || item.release_date || '').slice(0, 4),
    overview: item.overview || '',
    seasons: item.number_of_seasons || 1,
    genres: item.genres?.map(g => g.name) || [],
    tmdbId: item.id,
  };
}
function normalizeAnime(item) {
  return {
    id: item.mal_id,
    type: 'anime',
    title: item.title_portuguese || item.title_english || item.title || 'Sem título',
    poster: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || null,
    backdrop: null,
    rating: item.score ? item.score.toFixed(1) : null,
    year: item.year || item.aired?.prop?.from?.year || '',
    overview: item.synopsis || '',
    episodes: item.episodes || '?',
    status: item.status || '',
    tmdbId: null, // will resolve later
    malId: item.mal_id,
  };
}

window.API = API;
window.normalizeMovie = normalizeMovie;
window.normalizeSeries = normalizeSeries;
window.normalizeAnime = normalizeAnime;
window.poster = poster;
window.backdrop = backdrop;
