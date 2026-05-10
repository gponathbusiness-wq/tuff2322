// === WAFFLE APP — Main Controller ===

// ── State ─────────────────────────────────────────────────────
const state = {
  currentTab: 'home',
  movies: { filter: 'popular', page: 1, loading: false },
  series: { filter: 'popular', page: 1, loading: false },
  anime:  { filter: 'airing',  page: 1, loading: false },
  trending: { filter: 'week', page: 1 },
};

// ── TAB NAVIGATION ────────────────────────────────────────────
function setTab(tab) {
  state.currentTab = tab;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.tab === tab));

  const pageMap = { home: 'pageHome', movies: 'pageMovies', series: 'pageSeries', anime: 'pageAnime', trending: 'pageTrending' };
  const page = document.getElementById(pageMap[tab]);
  if (page) page.classList.add('active');

  // Lazy-load pages on first visit
  if (tab === 'movies' && !state.movies._loaded) loadMoviesPage();
  if (tab === 'series' && !state.series._loaded) loadSeriesPage();
  if (tab === 'anime'  && !state.anime._loaded)  loadAnimePage();
  if (tab === 'trending' && !state.trending._loaded) loadTrendingPage();

  closeSearch();
}

document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', e => { e.preventDefault(); setTab(link.dataset.tab); });
});
document.getElementById('navLogoBtn').addEventListener('click', e => { e.preventDefault(); setTab('home'); });

// ── MOBILE MENU ───────────────────────────────────────────────
const hamburgerBtn = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');

hamburgerBtn.addEventListener('click', () => {
  hamburgerBtn.classList.toggle('open');
  mobileMenu.classList.toggle('open');
});

// Fecha o menu mobile ao clicar em um link
document.querySelectorAll('.mobile-menu .nav-link').forEach(link => {
  link.addEventListener('click', () => {
    hamburgerBtn.classList.remove('open');
    mobileMenu.classList.remove('open');
  });
});

// ── HOME ─────────────────────────────────────────────────────
async function loadHome() {
  try {
    const [trending, nowPlaying, topRated, tvPopular, animeData] = await Promise.all([
      API.trendingAll('week'),
      API.moviesNowPlaying(),
      API.moviesTopRated(),
      API.seriesPopular(),
      API.animeTop('airing'),
    ]);

    // Hero from trending
    const heroItems = trending.results
      .filter(i => i.backdrop_path && (i.media_type === 'movie' || i.media_type === 'tv'))
      .slice(0, 6)
      .map(i => i.media_type === 'movie' ? normalizeMovie(i) : normalizeSeries(i));
    buildHero(heroItems);

    // Rows
    const rows = document.getElementById('homeRows');
    rows.innerHTML = '';

    rows.appendChild(UI.createRow(
      '🔥 Lançamentos',
      nowPlaying.results.map(normalizeMovie),
      () => setTab('movies')
    ));
    rows.appendChild(UI.createRow(
      '⭐ Filmes Mais Votados',
      topRated.results.map(normalizeMovie),
      () => setTab('movies')
    ));
    rows.appendChild(UI.createRow(
      '📺 Séries Populares',
      tvPopular.results.map(normalizeSeries),
      () => setTab('series')
    ));
    rows.appendChild(UI.createRow(
      '✦ Animes em Exibição',
      animeData.data.map(normalizeAnime),
      () => setTab('anime')
    ));

    // Ambient color from first hero
    if (heroItems[0]?.backdrop) {
      document.getElementById('ambientBg').style.opacity = '1';
    }
  } catch (err) {
    console.error('Home load error:', err);
    UI.showToast('Erro ao carregar conteúdo. Tente novamente.');
  }
}

// ── MOVIES PAGE ───────────────────────────────────────────────
async function loadMoviesPage(append = false) {
  state.movies._loaded = true;
  if (state.movies.loading) return;
  state.movies.loading = true;

  const grid = document.getElementById('moviesGrid');
  if (!append) { grid.innerHTML = ''; UI.createSkeletons(12).forEach(s => grid.appendChild(s)); }

  try {
    const fnMap = {
      popular: API.moviesPopular,
      now_playing: API.moviesNowPlaying,
      top_rated: API.moviesTopRated,
      upcoming: API.moviesUpcoming,
    };
    const fn = fnMap[state.movies.filter] || API.moviesPopular;
    const data = await fn(state.movies.page);
    if (!append) grid.innerHTML = '';
    UI.populateGrid(grid, data.results.map(normalizeMovie), append);
    state.movies.page++;
  } catch (e) { UI.showToast('Erro ao carregar filmes.'); }
  finally { state.movies.loading = false; }
}

document.querySelectorAll('#pageMovies .filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#pageMovies .filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.movies.filter = btn.dataset.filter;
    state.movies.page = 1;
    loadMoviesPage(false);
  });
});
document.getElementById('moviesLoadMore').addEventListener('click', () => loadMoviesPage(true));

// ── SERIES PAGE ───────────────────────────────────────────────
async function loadSeriesPage(append = false) {
  state.series._loaded = true;
  if (state.series.loading) return;
  state.series.loading = true;

  const grid = document.getElementById('seriesGrid');
  if (!append) { grid.innerHTML = ''; }

  try {
    const fnMap = {
      popular: API.seriesPopular,
      on_the_air: API.seriesOnTheAir,
      top_rated: API.seriesTopRated,
      airing_today: API.seriesAiringToday,
    };
    const fn = fnMap[state.series.filter] || API.seriesPopular;
    const data = await fn(state.series.page);
    if (!append) grid.innerHTML = '';
    UI.populateGrid(grid, data.results.map(normalizeSeries), append);
    state.series.page++;
  } catch (e) { UI.showToast('Erro ao carregar séries.'); }
  finally { state.series.loading = false; }
}

document.querySelectorAll('#pageSeries .filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#pageSeries .filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.series.filter = btn.dataset.filter;
    state.series.page = 1;
    loadSeriesPage(false);
  });
});
document.getElementById('seriesLoadMore').addEventListener('click', () => loadSeriesPage(true));

// ── ANIME PAGE ────────────────────────────────────────────────
async function loadAnimePage(append = false) {
  state.anime._loaded = true;
  if (state.anime.loading) return;
  state.anime.loading = true;

  const grid = document.getElementById('animeGrid');
  if (!append) grid.innerHTML = '';

  try {
    const data = await API.animeTop(state.anime.filter, state.anime.page);
    UI.populateGrid(grid, data.data.map(normalizeAnime), append);
    state.anime.page++;
  } catch (e) { UI.showToast('Erro ao carregar animes. Jikan pode estar com rate limit.'); }
  finally { state.anime.loading = false; }
}

document.querySelectorAll('#pageAnime .filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#pageAnime .filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.anime.filter = btn.dataset.filter;
    state.anime.page = 1;
    loadAnimePage(false);
  });
});
document.getElementById('animeLoadMore').addEventListener('click', () => loadAnimePage(true));

// ── TRENDING PAGE ─────────────────────────────────────────────
async function loadTrendingPage() {
  state.trending._loaded = true;
  const grid = document.getElementById('trendingGrid');
  grid.innerHTML = '';
  try {
    const data = await API.trendingAll(state.trending.filter);
    const items = data.results.map(i => {
      if (i.media_type === 'movie') return normalizeMovie(i);
      if (i.media_type === 'tv') return normalizeSeries(i);
      return null;
    }).filter(Boolean);
    UI.populateGrid(grid, items);
  } catch (e) { UI.showToast('Erro ao carregar trending.'); }
}

document.querySelectorAll('#pageTrending .filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#pageTrending .filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.trending.filter = btn.dataset.filter;
    loadTrendingPage();
  });
});

// ── SEARCH ────────────────────────────────────────────────────
let _searchTimer = null;

function openSearch() {
  document.getElementById('searchBarContainer').classList.add('open');
  document.getElementById('searchInput').focus();
}
function closeSearch() {
  document.getElementById('searchBarContainer').classList.remove('open');
  document.getElementById('searchResults').innerHTML = '';
  document.getElementById('searchInput').value = '';
}

document.getElementById('searchToggle').addEventListener('click', (e) => { e.stopPropagation(); openSearch(); });
document.getElementById('searchClose').addEventListener('click', closeSearch);
document.addEventListener('click', (e) => {
  const container = document.getElementById('searchBarContainer');
  if (container.classList.contains('open') && !container.contains(e.target)) {
    closeSearch();
  }
});

document.getElementById('searchInput').addEventListener('input', e => {
  clearTimeout(_searchTimer);
  const q = e.target.value.trim();
  if (!q) { document.getElementById('searchResults').innerHTML = ''; return; }
  _searchTimer = setTimeout(async () => {
    try {
      const [tmdbRes, jikanRes] = await Promise.allSettled([
        API.searchMulti(q),
        API.animeSearch(q),
      ]);
      const results = [];
      if (tmdbRes.status === 'fulfilled') {
        tmdbRes.value.results?.slice(0, 8).forEach(i => {
          if (i.media_type === 'movie') results.push(normalizeMovie(i));
          else if (i.media_type === 'tv') results.push(normalizeSeries(i));
        });
      }
      if (jikanRes.status === 'fulfilled') {
        jikanRes.value.data?.slice(0, 4).forEach(a => results.push(normalizeAnime(a)));
      }
      UI.renderSearchResults(results);
    } catch (err) {
      console.error('Search error:', err);
    }
  }, 500);
});

// ── NAVBAR scroll effect ──────────────────────────────────────
window.addEventListener('scroll', () => {
  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 50);
});

// ── MODAL CLOSE ───────────────────────────────────────────────
document.getElementById('modalClose').addEventListener('click', UI.closeModal);
document.getElementById('modalOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modalOverlay')) UI.closeModal();
});

// ── INIT ─────────────────────────────────────────────────────
loadHome();
