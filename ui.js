// === WAFFLE UI MODULE ===

function createCard(item) {
  const div = document.createElement('div');
  div.className = 'card';
  const labels = { movie:'FILME', tv:'SÉRIE', anime:'ANIME' };
  div.innerHTML = `
    <div class="card-poster">
      ${item.poster
        ? `<img class="card-img" src="${item.poster}" alt="${item.title}" loading="lazy"
             onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
           <div class="no-poster" style="display:none">🎬</div>`
        : `<div class="no-poster">🎬</div>`}
      <div class="card-overlay">
        <div class="card-play-btn">
          <svg viewBox="0 0 24 24" fill="#000"><polygon points="5,3 19,12 5,21"/></svg>
        </div>
      </div>
      ${item.rating ? `<div class="card-rating">★ ${item.rating}</div>` : ''}
      <div class="card-type-badge ${item.type}">${labels[item.type]||''}</div>
    </div>
    <div class="card-title">${item.title}</div>
    <div class="card-subtitle">${item.year||''}${item.type==='anime'&&item.episodes?' · '+item.episodes+' ep':''}</div>`;
  div.addEventListener('click', () => openDetail(item));
  return div;
}

function createSkeletons(n=6) {
  return Array.from({length:n}, () => {
    const d = document.createElement('div');
    d.className = 'skeleton-card';
    d.innerHTML = `<div class="skeleton skeleton-poster"></div>
                   <div class="skeleton skeleton-title"></div>
                   <div class="skeleton skeleton-sub"></div>`;
    return d;
  });
}

function createRow(title, itemsOrPromise, seeAllCb) {
  const section = document.createElement('div');
  section.className = 'row-section';
  const header = document.createElement('div');
  header.className = 'row-header';
  header.innerHTML = `<div class="row-title"><span class="row-title-accent"></span>${title}</div>
    ${seeAllCb ? '<span class="row-see-all">Ver tudo →</span>' : ''}`;
  if (seeAllCb) header.querySelector('.row-see-all').addEventListener('click', seeAllCb);
  const scroll = document.createElement('div');
  scroll.className = 'cards-scroll';
  createSkeletons(8).forEach(s => scroll.appendChild(s));
  section.appendChild(header);
  section.appendChild(scroll);
  Promise.resolve(itemsOrPromise).then(data => {
    scroll.innerHTML = '';
    data.forEach(item => scroll.appendChild(createCard(item)));
  }).catch(() => {
    scroll.innerHTML = '<p style="color:var(--muted);padding:1rem">Erro ao carregar.</p>';
  });
  return section;
}

function populateGrid(gridEl, items, append=false) {
  if (!append) gridEl.innerHTML = '';
  items.forEach(item => {
    const c = createCard(item);
    c.style.width = '100%';
    gridEl.appendChild(c);
  });
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 3200);
}

// ── Detail Modal ──────────────────────────────────────────────
async function openDetail(item) {
  const overlay = document.getElementById('modalOverlay');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  const bd = document.getElementById('modalBackdrop');
  bd.style.background = item.backdrop
    ? `url(${item.backdrop}) center/cover no-repeat` : 'var(--card)';

  document.getElementById('modalPoster').innerHTML = item.poster
    ? `<img src="${item.poster}" alt="${item.title}" style="width:100%;height:100%;object-fit:cover">`
    : `<div class="no-poster" style="height:100%">🎬</div>`;

  const types = { movie:'FILME', tv:'SÉRIE', anime:'ANIME' };
  document.getElementById('modalBadges').innerHTML =
    `<span class="modal-badge type">${types[item.type]||'—'}</span>
     ${item.rating ? `<span class="modal-badge rating">★ ${item.rating}</span>` : ''}`;

  document.getElementById('modalTitle').textContent    = item.title;
  document.getElementById('modalOverview').textContent = item.overview || '';

  const meta = [];
  if (item.year)           meta.push(`📅 ${item.year}`);
  if (item.genres?.length) meta.push('🎭 ' + item.genres.slice(0,3).join(', '));
  if (item.episodes)       meta.push(`📺 ${item.episodes} ep`);
  if (item.seasons)        meta.push(`🗂️ ${item.seasons} temp.`);
  document.getElementById('modalMeta').innerHTML =
    meta.map(m => `<span class="modal-meta-item">${m}</span>`).join('');

  const actionsEl = document.getElementById('modalActions');
  actionsEl.innerHTML = '';
  document.getElementById('episodesSection').style.display = 'none';

  const pid = item.tmdbId || item.id;

  if (item.type === 'movie') {
    actionsEl.innerHTML = `
      <button class="btn-play" id="mPlay">
        <svg viewBox="0 0 24 24" fill="#000" width="18"><polygon points="5,3 19,12 5,21"/></svg>
        Assistir — VidFast
      </button>`;
    document.getElementById('mPlay').onclick = () => {
      openPlayer(VIDFAST.movie(pid), item.title);
      closeModal();
    };

  } else if (item.type === 'tv') {
    actionsEl.innerHTML = `
      <button class="btn-play" id="tvPlay">
        <svg viewBox="0 0 24 24" fill="#000" width="18"><polygon points="5,3 19,12 5,21"/></svg>
        T1 · E1 — VidFast
      </button>
      <span style="color:var(--muted);font-size:.8rem">ou escolha o episódio ↓</span>`;
    document.getElementById('tvPlay').onclick = () => {
      openPlayer(VIDFAST.tv(pid, 1, 1), `${item.title} · T1 E1`);
      closeModal();
    };
    loadEpisodes(item, pid);

  } else if (item.type === 'anime') {
    actionsEl.innerHTML = `
      <button class="btn-play" id="anPlay">
        <svg viewBox="0 0 24 24" fill="#000" width="18"><polygon points="5,3 19,12 5,21"/></svg>
        Ep 1 — VidFast
      </button>`;
    document.getElementById('anPlay').onclick = async () => {
      showToast('Buscando stream...');
      let tmdbId = item.tmdbId;
      if (!tmdbId) {
        try {
          const r = await API.searchMulti(item.title);
          tmdbId = r.results?.find(x => x.media_type === 'tv')?.id;
        } catch(_) {}
      }
      if (!tmdbId) { showToast('ID TMDB não encontrado.'); return; }
      openPlayer(VIDFAST.tv(tmdbId, 1, 1), `${item.title} · Ep 1`);
      closeModal();
    };
  }
}

// ── Episodes: clique direto no episódio para assistir ─────────
async function loadEpisodes(item, pid) {
  const section   = document.getElementById('episodesSection');
  const seasonSel = document.getElementById('seasonSelector');
  const epGrid    = document.getElementById('episodesGrid');
  section.style.display = 'block';
  seasonSel.innerHTML = '';
  epGrid.innerHTML = '<p style="color:var(--muted);padding:.5rem">Carregando episódios...</p>';

  try {
    const detail = await API.seriesDetail(pid);
    const total  = detail.number_of_seasons || 1;

    const renderSeason = async (num) => {
      // Mark active season button
      seasonSel.querySelectorAll('.season-btn')
        .forEach(b => b.classList.toggle('active', +b.dataset.s === num));
      epGrid.innerHTML = '<p style="color:var(--muted);padding:.5rem">Carregando...</p>';

      let season;
      try {
        season = await API.seasonDetail(pid, num);
      } catch(e) {
        epGrid.innerHTML = '<p style="color:var(--muted)">Erro ao carregar temporada.</p>';
        return;
      }

      epGrid.innerHTML = '';

      if (!season.episodes || season.episodes.length === 0) {
        epGrid.innerHTML = '<p style="color:var(--muted);padding:.5rem">Nenhum episódio encontrado.</p>';
        return;
      }

      season.episodes.forEach(ep => {
        const epNum = ep.episode_number;
        const el = document.createElement('div');
        el.className = 'episode-item';

        el.innerHTML = `
          <div class="episode-num">${epNum}</div>
          <div class="episode-info">
            <div class="episode-name">${ep.name || `Episódio ${epNum}`}</div>
            <div class="episode-duration">${ep.runtime ? ep.runtime + ' min' : `T${num} · E${epNum}`}</div>
          </div>
          <div class="ep-play-icon">
            <svg viewBox="0 0 24 24" fill="currentColor" width="15"><polygon points="5,3 19,12 5,21"/></svg>
          </div>`;

        // Click plays immediately
        el.addEventListener('click', () => {
          openPlayer(VIDFAST.tv(pid, num, epNum), `${item.title} · T${num} E${epNum}`);
        });

        epGrid.appendChild(el);
      });
    };

    // Build season buttons
    for (let s = 1; s <= Math.min(total, 15); s++) {
      const btn = document.createElement('button');
      btn.className = 'season-btn' + (s === 1 ? ' active' : '');
      btn.textContent = `T${s}`;
      btn.dataset.s = s;
      btn.addEventListener('click', () => renderSeason(s));
      seasonSel.appendChild(btn);
    }

    renderSeason(1);

  } catch(e) {
    epGrid.innerHTML = '<p style="color:var(--muted)">Erro ao carregar episódios.</p>';
  }
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

// ── Hero ─────────────────────────────────────────────────────
let _heroItems = [], _heroIdx = 0, _heroTimer = null;

function buildHero(items) {
  _heroItems = items.slice(0, 6);
  const slides = document.getElementById('heroSlides');
  const dots   = document.getElementById('heroIndicators');
  slides.innerHTML = '';
  dots.innerHTML   = '';
  _heroItems.forEach((item, i) => {
    const s = document.createElement('div');
    s.className = 'hero-slide' + (i === 0 ? ' active' : '');
    if (item.backdrop) s.style.backgroundImage = `url(${item.backdrop.replace('w1280','original')})`;
    slides.appendChild(s);
    const d = document.createElement('div');
    d.className = 'indicator' + (i === 0 ? ' active' : '');
    d.addEventListener('click', () => goHero(i));
    dots.appendChild(d);
  });
  setHeroContent(0);
  clearInterval(_heroTimer);
  _heroTimer = setInterval(() => goHero((_heroIdx + 1) % _heroItems.length), 7000);
}

function goHero(idx) {
  _heroIdx = idx;
  document.querySelectorAll('.hero-slide').forEach((s,i) => s.classList.toggle('active', i===idx));
  document.querySelectorAll('.indicator').forEach((d,i) => d.classList.toggle('active', i===idx));
  setHeroContent(idx);
}

function setHeroContent(idx) {
  const item = _heroItems[idx];
  if (!item) return;
  const types = { movie:'FILME', tv:'SÉRIE', anime:'ANIME' };
  document.getElementById('heroMeta').innerHTML = `
    <span class="hero-tag type">${types[item.type]||''}</span>
    ${item.rating ? `<span class="hero-tag rating">★ ${item.rating}</span>` : ''}
    ${item.year   ? `<span class="hero-tag year">${item.year}</span>` : ''}`;
  document.getElementById('heroTitle').textContent = item.title;
  document.getElementById('heroDesc').textContent  = item.overview;
  document.getElementById('heroActions').innerHTML = `
    <button class="btn-play" id="hPlay">
      <svg viewBox="0 0 24 24" fill="#000" width="18"><polygon points="5,3 19,12 5,21"/></svg>
      Assistir
    </button>
    <button class="btn-info" id="hInfo">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      Detalhes
    </button>`;
  const pid = item.tmdbId || item.id;
  document.getElementById('hPlay').onclick = () => {
    if (item.type === 'movie') openPlayer(VIDFAST.movie(pid), item.title);
    else openPlayer(VIDFAST.tv(pid, 1, 1), `${item.title} · T1 E1`);
  };
  document.getElementById('hInfo').onclick = () => openDetail(item);
}

function renderSearchResults(results) {
  const c = document.getElementById('searchResults');
  c.innerHTML = '';
  if (!results.length) {
    c.innerHTML = '<p style="color:var(--muted);text-align:center;padding:1rem;grid-column:1/-1">Sem resultados.</p>';
    return;
  }
  results.forEach(item => c.appendChild(createCard(item)));
}

window.UI = { createCard, createSkeletons, createRow, populateGrid, showToast, openDetail, closeModal, buildHero, renderSearchResults };
