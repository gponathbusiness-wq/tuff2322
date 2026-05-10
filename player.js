// === PLAYER — VidFast only ===

const VIDFAST = {
  movie: id  => `https://vidfast.pro/movie/${id}?autoPlay=true&theme=00d4aa`,
  tv:    (id,s,e) => `https://vidfast.pro/tv/${id}/${s}/${e}?autoPlay=true&theme=00d4aa`,
};

let _currentPlayerData = null;

function openPlayer(url, title) {
  _currentPlayerData = { url, title };
  const overlay = document.getElementById('playerOverlay');
  const frame   = document.getElementById('playerFrame');
  const loading = document.getElementById('playerLoading');
  const info    = document.getElementById('playerTitleInfo');

  if (info) {
    info.innerHTML = `<span class="dot">▶</span><span class="vidfast-tag">VidFast</span><span class="player-title-text">${title || ''}</span>`;
  }
  frame.src = '';
  loading.classList.remove('hidden');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  setTimeout(() => {
    frame.src = url;
    frame.onload = () => loading.classList.add('hidden');
    setTimeout(() => loading.classList.add('hidden'), 6000);
  }, 250);
}

function closePlayer() {
  document.getElementById('playerOverlay').classList.remove('open');
  document.getElementById('playerFrame').src = '';
  document.body.style.overflow = '';
}

document.getElementById('playerClose').addEventListener('click', closePlayer);

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (document.getElementById('playerOverlay').classList.contains('open')) { closePlayer(); return; }
  if (document.getElementById('modalOverlay').classList.contains('open'))  { closeModal();  return; }
  if (document.getElementById('searchBarContainer').classList.contains('open')) { closeSearch(); }
});

window.VIDFAST    = VIDFAST;
window.openPlayer = openPlayer;
window.closePlayer = closePlayer;
