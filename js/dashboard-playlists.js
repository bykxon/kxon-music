/* ═══════════════════════════════════════════════════
   🎶 KXON PLAYLISTS — REDESIGN 2026
   Arquitectura: Event Delegation, escapeHtml, ARIA
   Namespace: kx-pl-*
   ═══════════════════════════════════════════════════ */
(function () {
'use strict';

var db = window.supabase.createClient(
  'https://zizbbypwwvugyswjfbxr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppemJieXB3d3Z1Z3lzd2pmYnhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1OTkyMTQsImV4cCI6MjA4NjE3NTIxNH0.PwTvjIyPkfbnFMFB9k9XPHDxYrKBkkPIslQJ5UcY_9U'
);

/* ══════════════════════════════════
   🛡️ HELPERS
   ══════════════════════════════════ */
function $(id) { return document.getElementById(id); }

function escapeHtml(str) {
  if (!str) return '';
  var d = document.createElement('div');
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  var now = Date.now();
  var then = new Date(dateStr).getTime();
  var diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'Hace un momento';
  if (diff < 3600) return 'Hace ' + Math.floor(diff / 60) + ' min';
  if (diff < 86400) return 'Hace ' + Math.floor(diff / 3600) + 'h';
  if (diff < 604800) return 'Hace ' + Math.floor(diff / 86400) + 'd';
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

var PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">' +
  '<rect fill="#111" width="300" height="300"/>' +
  '<text x="150" y="155" font-size="48" text-anchor="middle" fill="#333">🎶</text></svg>'
);

/* ══════════════════════════════════
   📦 STATE
   ══════════════════════════════════ */
var allPlaylists = [];
var filteredPlaylists = [];
var currentPlaylistId = null;
var currentPlaylistData = null;
var playlistCanciones = [];
var currentFilter = 'todas';
var currentSort = 'recent';
var searchQuery = '';
var confirmCallback = null;

/* ══════════════════════════════════
   📥 LOAD PLAYLISTS
   ══════════════════════════════════ */
window._loadPlaylists = async function () {
  var K = window.KXON || {};
  if (!K.currentUser) return;
  var grid = $('playlistsGrid');
  if (!grid) return;

  renderSkeletonGrid(grid, 6);

  try {
    var r = await db.from('playlists')
      .select('*, playlist_canciones(id)')
      .eq('usuario_id', K.currentUser.id)
      .order('updated_at', { ascending: false });
    if (r.error) throw r.error;
    allPlaylists = r.data || [];
    applyFilters();
    updateKPIs();
  } catch (e) {
    console.error('Error playlists:', e);
    grid.innerHTML = renderError('Error al cargar playlists');
  }
};

/* ══════════════════════════════════
   📊 KPIs
   ══════════════════════════════════ */
function updateKPIs() {
  var totalTracks = 0;
  var totalPublic = 0;
  for (var i = 0; i < allPlaylists.length; i++) {
    var pc = allPlaylists[i].playlist_canciones;
    totalTracks += pc ? pc.length : 0;
    if (allPlaylists[i].publica) totalPublic++;
  }
  var st = $('plStatTotal'); if (st) st.textContent = allPlaylists.length;
  var stk = $('plStatTracks'); if (stk) stk.textContent = totalTracks;
  var sp = $('plStatPublic'); if (sp) sp.textContent = totalPublic;
}

/* ══════════════════════════════════
   🔍 FILTER / SORT / SEARCH
   ══════════════════════════════════ */
function applyFilters() {
  var result = allPlaylists.slice();

  /* Filter */
  if (currentFilter === 'recientes') {
    var d30 = Date.now() - 30 * 86400000;
    result = result.filter(function (p) { return new Date(p.created_at).getTime() > d30; });
  } else if (currentFilter === 'publicas') {
    result = result.filter(function (p) { return p.publica; });
  } else if (currentFilter === 'privadas') {
    result = result.filter(function (p) { return !p.publica; });
  }

  /* Search */
  if (searchQuery) {
    var q = searchQuery.toLowerCase();
    result = result.filter(function (p) {
      return (p.nombre || '').toLowerCase().indexOf(q) >= 0 ||
             (p.descripcion || '').toLowerCase().indexOf(q) >= 0;
    });
  }

  /* Sort */
  result.sort(function (a, b) {
    if (currentSort === 'recent') return new Date(b.updated_at) - new Date(a.updated_at);
    if (currentSort === 'oldest') return new Date(a.updated_at) - new Date(b.updated_at);
    if (currentSort === 'name-az') return (a.nombre || '').localeCompare(b.nombre || '');
    if (currentSort === 'name-za') return (b.nombre || '').localeCompare(a.nombre || '');
    if (currentSort === 'most-songs') {
      var ac = a.playlist_canciones ? a.playlist_canciones.length : 0;
      var bc = b.playlist_canciones ? b.playlist_canciones.length : 0;
      return bc - ac;
    }
    return 0;
  });

  filteredPlaylists = result;
  renderGrid();
}

/* ══════════════════════════════════
   🖼️ RENDER GRID
   ══════════════════════════════════ */
function renderGrid() {
  var grid = $('playlistsGrid');
  if (!grid) return;

  if (!filteredPlaylists.length) {
    if (searchQuery || currentFilter !== 'todas') {
      grid.innerHTML = renderEmptyFiltered();
    } else {
      grid.innerHTML = renderEmptyState();
    }
    return;
  }

  var h = '';
  for (var i = 0; i < filteredPlaylists.length; i++) {
    var pl = filteredPlaylists[i];
    var img = pl.imagen_url || '';
    var numSongs = pl.playlist_canciones ? pl.playlist_canciones.length : 0;
    var name = escapeHtml(pl.nombre);

    h += '<div class="kx-pl-card kx-observed" style="--i:' + i + '" role="listitem" tabindex="0"' +
         ' data-id="' + pl.id + '" aria-label="Playlist: ' + name + '">';

    /* Visual */
    h += '<div class="kx-pl-card-visual">';
    if (img) {
      h += '<img class="kx-pl-card-img" src="' + escapeHtml(img) + '" alt="" loading="lazy">';
    } else {
      h += '<div class="kx-pl-card-fallback">' +
           '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
           '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>' +
           '<span class="kx-pl-card-fallback-text">PLAYLIST</span></div>';
    }

    /* Badge */
    if (pl.publica) {
      h += '<span class="kx-pl-card-badge kx-pl-card-badge--public">' +
           '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>' +
           'Pública</span>';
    }

    /* Overlay */
    h += '<div class="kx-pl-card-overlay">' +
         '<button class="kx-pl-card-play" data-action="play-playlist" data-id="' + pl.id + '" aria-label="Reproducir">' +
         '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg></button>' +
         '<span class="kx-pl-card-count">' + numSongs + ' cancion' + (numSongs !== 1 ? 'es' : '') + '</span></div>';

    /* Delete */
    h += '<button class="kx-pl-card-delete" data-action="delete-playlist" data-id="' + pl.id + '" data-name="' + name + '" aria-label="Eliminar">' +
         '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>';

    h += '</div>';

    /* Body */
    h += '<div class="kx-pl-card-body">' +
         '<div class="kx-pl-card-title">' + name + '</div>' +
         '<div class="kx-pl-card-sub">' +
         '<span>' + numSongs + ' cancion' + (numSongs !== 1 ? 'es' : '') + '</span>' +
         '<span class="kx-pl-card-sub-dot"></span>' +
         '<span>' + timeAgo(pl.updated_at) + '</span></div></div>';

    h += '</div>';
  }

  grid.innerHTML = h;

  /* Handle broken images */
  var imgs = grid.querySelectorAll('.kx-pl-card-img');
  for (var j = 0; j < imgs.length; j++) {
    imgs[j].addEventListener('error', function () {
      this.style.display = 'none';
      var fb = this.parentNode.querySelector('.kx-pl-card-fallback');
      if (!fb) {
        var d = document.createElement('div');
        d.className = 'kx-pl-card-fallback';
        d.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
          '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>' +
          '<span class="kx-pl-card-fallback-text">PLAYLIST</span>';
        this.parentNode.appendChild(d);
      }
    });
  }
}

/* ══════════════════════════════════
   🧩 RENDER HELPERS
   ══════════════════════════════════ */
function renderSkeletonGrid(el, count) {
  var h = '';
  for (var i = 0; i < count; i++) {
    h += '<div class="kx-pl-skeleton" aria-hidden="true">' +
         '<div class="kx-pl-skeleton-img"></div>' +
         '<div class="kx-pl-skeleton-body">' +
         '<div class="kx-pl-skeleton-line"></div>' +
         '<div class="kx-pl-skeleton-line kx-pl-skeleton-line--short"></div>' +
         '</div></div>';
  }
  el.innerHTML = h;
}

function renderEmptyState() {
  return '<div class="kx-pl-empty">' +
    '<div class="kx-pl-empty-icon">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
    '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></div>' +
    '<div class="kx-pl-empty-title">Sin playlists</div>' +
    '<div class="kx-pl-empty-text">Crea tu primera playlist personalizada</div>' +
    '<button class="kx-pl-empty-btn" data-action="create-playlist">' +
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14"/><path d="M5 12h14"/></svg>' +
    'Crear Playlist</button></div>';
}

function renderEmptyFiltered() {
  return '<div class="kx-pl-empty">' +
    '<div class="kx-pl-empty-icon">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
    '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></div>' +
    '<div class="kx-pl-empty-title">Sin resultados</div>' +
    '<div class="kx-pl-empty-text">No se encontraron playlists con estos filtros</div></div>';
}

function renderError(msg) {
  return '<div class="kx-pl-empty">' +
    '<div class="kx-pl-empty-icon">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
    '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg></div>' +
    '<div class="kx-pl-empty-title">' + escapeHtml(msg) + '</div></div>';
}

function renderSkeletonTracks(el, count) {
  var h = '';
  for (var i = 0; i < count; i++) {
    h += '<div class="kx-pl-skeleton-track" aria-hidden="true">' +
         '<div class="kx-pl-skeleton-track-num"></div>' +
         '<div class="kx-pl-skeleton-track-cover"></div>' +
         '<div class="kx-pl-skeleton-track-bar"></div>' +
         '<div class="kx-pl-skeleton-track-dur"></div></div>';
  }
  el.innerHTML = h;
}

/* ══════════════════════════════════
   📖 DETAIL VIEW
   ══════════════════════════════════ */
window._openPlaylistDetail = async function (plId) {
  currentPlaylistId = plId;
  var trackList = $('plTrackList');
  if (trackList) renderSkeletonTracks(trackList, 5);

  try {
    var r = await db.from('playlists').select('*').eq('id', plId).single();
    if (r.error) throw r.error;
    currentPlaylistData = r.data;

    /* Title */
    var title = $('plDetailTitle');
    if (title) title.textContent = r.data.nombre;

    /* Desc */
    var desc = $('plDetailDesc');
    if (desc) desc.textContent = r.data.descripcion || 'Sin descripción';

    /* Cover */
    var img = r.data.imagen_url || '';
    var cover = $('plDetailCover');
    var fallback = $('plDetailCoverFallback');
    if (cover) {
      if (img) {
        cover.src = img;
        cover.style.display = 'block';
        if (fallback) fallback.style.display = 'none';
      } else {
        cover.style.display = 'none';
        if (fallback) fallback.style.display = 'flex';
      }
    }

    /* Hero BG */
    var heroBg = $('plDetailHeroBg');
    if (heroBg) {
      heroBg.style.backgroundImage = img ? 'url(' + img + ')' : 'none';
    }

    /* Visibility */
    var vis = $('plDetailVisibility');
    if (vis) {
      if (r.data.publica) {
        vis.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/></svg> Pública';
        vis.className = 'kx-pl-hero-visibility kx-pl-hero-visibility--public';
      } else {
        vis.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Privada';
        vis.className = 'kx-pl-hero-visibility';
      }
    }

    /* Updated */
    var updated = $('plDetailUpdated');
    if (updated) updated.textContent = timeAgo(r.data.updated_at);

    await loadPlaylistCanciones(plId);

    $('plListView').style.display = 'none';
    $('plDetailView').classList.add('show');

  } catch (e) {
    console.error(e);
    if (window.showToast) window.showToast('Error al cargar playlist', 'error');
  }
};

/* ── LOAD TRACKS ── */
async function loadPlaylistCanciones(plId) {
  var trackList = $('plTrackList');
  try {
    var r = await db.from('playlist_canciones')
      .select('*, canciones(id, titulo, audio_url, duracion, album_id, albumes(titulo, imagen_url))')
      .eq('playlist_id', plId)
      .order('posicion', { ascending: true });
    if (r.error) throw r.error;
    playlistCanciones = r.data || [];

    var meta = $('plDetailMeta');
    if (meta) meta.textContent = playlistCanciones.length + ' CANCION' + (playlistCanciones.length !== 1 ? 'ES' : '');

    var sub = $('plTracksSub');
    if (sub) sub.textContent = playlistCanciones.length + ' cancion' + (playlistCanciones.length !== 1 ? 'es' : '') + ' en esta playlist';

    /* Duration */
    var totalSec = 0;
    for (var d = 0; d < playlistCanciones.length; d++) {
      var c = playlistCanciones[d].canciones;
      if (c && c.duracion) {
        var parts = c.duracion.split(':');
        if (parts.length === 2) totalSec += parseInt(parts[0]) * 60 + parseInt(parts[1]);
      }
    }
    var durEl = $('plDetailDuration');
    if (durEl) {
      var mins = Math.floor(totalSec / 60);
      durEl.textContent = mins + ' min';
    }

    renderPlaylistTracks(trackList);
  } catch (e) {
    console.error(e);
    if (trackList) trackList.innerHTML = renderError('Error al cargar canciones');
  }
}

function renderPlaylistTracks(container) {
  if (!container) return;
  if (!playlistCanciones.length) {
    container.innerHTML =
      '<li class="kx-pl-empty-tracks">' +
      '<div class="kx-pl-empty-tracks-icon">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
      '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></div>' +
      '<div class="kx-pl-empty-tracks-title">Playlist vacía</div>' +
      '<div class="kx-pl-empty-tracks-text">Agrega canciones desde el panel de Canciones o Álbumes</div></li>';
    return;
  }

  var h = '';
  for (var i = 0; i < playlistCanciones.length; i++) {
    var pc = playlistCanciones[i];
    var cancion = pc.canciones;
    if (!cancion) continue;
    var albumImg = (cancion.albumes && cancion.albumes.imagen_url) || PLACEHOLDER;
    var albumName = (cancion.albumes && cancion.albumes.titulo) || '';

    h += '<li class="kx-pl-track" data-action="play-track" data-index="' + i + '" role="listitem" tabindex="0">';
    h += '<span class="kx-pl-track-num">' + (i + 1) + '</span>';
    h += '<div class="kx-pl-track-cover"><img src="' + escapeHtml(albumImg) + '" alt="" loading="lazy"></div>';
    h += '<div class="kx-pl-track-info">';
    h += '<div class="kx-pl-track-title">' + escapeHtml(cancion.titulo) + '</div>';
    if (albumName) h += '<div class="kx-pl-track-album">' + escapeHtml(albumName) + '</div>';
    h += '</div>';
    h += '<span class="kx-pl-track-album-col">' + escapeHtml(albumName) + '</span>';
    h += '<span class="kx-pl-track-dur">' + escapeHtml(cancion.duracion || '--:--') + '</span>';
    h += '<button class="kx-pl-track-remove" data-action="remove-track" data-pcid="' + pc.id + '" aria-label="Quitar canción">' +
         '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>';
    h += '</li>';
  }
  container.innerHTML = h;
}

/* ══════════════════════════════════
   ▶️ PLAY
   ══════════════════════════════════ */
window._playPlaylistTrack = function (index) {
  if (!playlistCanciones.length) return;
  var tracks = [];
  for (var i = 0; i < playlistCanciones.length; i++) {
    var c = playlistCanciones[i].canciones;
    if (!c || !c.audio_url) continue;
    var albumImg = (c.albumes && c.albumes.imagen_url) || PLACEHOLDER;
    tracks.push({ id: c.id, titulo: c.titulo, audio_url: c.audio_url, cover: albumImg });
  }
  if (!tracks.length) { if (window.showToast) window.showToast('Sin canciones reproducibles', 'error'); return; }

  var K = window.KXON || {};
  if (K.playTrackList) {
    K.playTrackList(tracks, index);
  } else {
    var audioEl = $('audioPlayer');
    var t = tracks[index >= tracks.length ? 0 : index];
    if (!t || !audioEl) return;
    audioEl.src = t.audio_url;
    audioEl.play();
    var pt = $('playerTitle'); if (pt) pt.textContent = t.titulo;
    var pc = $('playerCover'); if (pc) pc.src = t.cover;
    var pb = $('playerBar'); if (pb) pb.classList.add('show');
    var pp = $('playerPlayPause'); if (pp) pp.textContent = '⏸';
  }
};

window._playAllPlaylist = function () { window._playPlaylistTrack(0); };

window._shufflePlaylist = function () {
  if (!playlistCanciones.length) return;
  var idx = Math.floor(Math.random() * playlistCanciones.length);
  window._playPlaylistTrack(idx);
};

/* ══════════════════════════════════
   ➕ CREATE / EDIT
   ══════════════════════════════════ */
window._openCreatePlaylist = function () {
  $('plModalTitle').textContent = 'Nueva Playlist';
  $('plNombre').value = '';
  $('plDesc').value = '';
  $('plPublica').checked = false;
  $('plModalEditId').value = '';
  $('plBtnSubmitText').textContent = '🎶 Crear Playlist';
  $('modalPlaylist').classList.add('show');
};

window._openEditPlaylist = function () {
  if (!currentPlaylistData) return;
  $('plModalTitle').textContent = 'Editar Playlist';
  $('plNombre').value = currentPlaylistData.nombre;
  $('plDesc').value = currentPlaylistData.descripcion || '';
  $('plPublica').checked = currentPlaylistData.publica || false;
  $('plModalEditId').value = currentPlaylistData.id;
  $('plBtnSubmitText').textContent = '💾 Guardar Cambios';
  $('modalPlaylist').classList.add('show');
};

window._submitPlaylist = async function (e) {
  if (e) e.preventDefault();
  var K = window.KXON || {};
  if (!K.currentUser) return;

  var nombre = $('plNombre').value.trim();
  var desc = $('plDesc').value.trim();
  var publica = $('plPublica').checked;
  var editId = $('plModalEditId').value;

  if (!nombre) { if (window.showToast) window.showToast('Ingresa un nombre', 'error'); return; }

  var btn = $('plBtnSubmit');
  if (btn) { btn.classList.add('loading'); btn.disabled = true; }

  try {
    if (editId) {
      var r = await db.from('playlists').update({
        nombre: nombre, descripcion: desc, publica: publica,
        updated_at: new Date().toISOString()
      }).eq('id', editId);
      if (r.error) throw r.error;
      if (window.showToast) window.showToast('Playlist actualizada', 'success');
      if (currentPlaylistData && currentPlaylistData.id === editId) {
        currentPlaylistData.nombre = nombre;
        currentPlaylistData.descripcion = desc;
        currentPlaylistData.publica = publica;
        var dt = $('plDetailTitle'); if (dt) dt.textContent = nombre;
        var dd = $('plDetailDesc'); if (dd) dd.textContent = desc || 'Sin descripción';
      }
    } else {
      var r2 = await db.from('playlists').insert({
        usuario_id: K.currentUser.id, nombre: nombre,
        descripcion: desc, publica: publica
      });
      if (r2.error) throw r2.error;
      if (window.showToast) window.showToast('¡Playlist creada!', 'success');
    }
    window._closePlaylistModal();
    await window._loadPlaylists();
  } catch (e2) {
    console.error(e2);
    if (window.showToast) window.showToast('Error: ' + e2.message, 'error');
  }
  if (btn) { btn.classList.remove('loading'); btn.disabled = false; }
};

window._closePlaylistModal = function () {
  $('modalPlaylist').classList.remove('show');
};

/* ══════════════════════════════════
   🗑️ DELETE (con confirm dialog)
   ══════════════════════════════════ */
function showConfirm(title, text, acceptText, callback) {
  var overlay = $('plConfirmOverlay');
  var tEl = $('plConfirmTitle');
  var txEl = $('plConfirmText');
  var aEl = $('plConfirmAccept');
  if (tEl) tEl.textContent = title;
  if (txEl) txEl.textContent = text;
  if (aEl) aEl.textContent = acceptText;
  confirmCallback = callback;
  if (overlay) overlay.classList.add('show');
}

function hideConfirm() {
  var overlay = $('plConfirmOverlay');
  if (overlay) overlay.classList.remove('show');
  confirmCallback = null;
}

window._deletePlaylist = async function (plId) {
  var pl = null;
  for (var i = 0; i < allPlaylists.length; i++) {
    if (allPlaylists[i].id === plId) { pl = allPlaylists[i]; break; }
  }
  var name = pl ? pl.nombre : 'esta playlist';

  showConfirm(
    '¿Eliminar playlist?',
    '"' + name + '" se eliminará permanentemente junto con todas sus canciones.',
    'Eliminar',
    async function () {
      try {
        await db.from('playlist_canciones').delete().eq('playlist_id', plId);
        var r = await db.from('playlists').delete().eq('id', plId);
        if (r.error) throw r.error;
        if (window.showToast) window.showToast('Playlist eliminada', 'success');

        if (currentPlaylistId === plId) {
          $('plListView').style.display = 'block';
          $('plDetailView').classList.remove('show');
          currentPlaylistId = null;
          currentPlaylistData = null;
        }
        await window._loadPlaylists();
      } catch (e) {
        console.error(e);
        if (window.showToast) window.showToast('Error al eliminar', 'error');
      }
      hideConfirm();
    }
  );
};

/* ══════════════════════════════════
   ➖ REMOVE TRACK
   ══════════════════════════════════ */
window._removeFromPlaylist = async function (pcId) {
  showConfirm(
    '¿Quitar canción?',
    'La canción se quitará de esta playlist.',
    'Quitar',
    async function () {
      try {
        var r = await db.from('playlist_canciones').delete().eq('id', pcId);
        if (r.error) throw r.error;
        if (window.showToast) window.showToast('Canción removida', 'success');
        if (currentPlaylistId) await loadPlaylistCanciones(currentPlaylistId);
        await window._loadPlaylists();
      } catch (e) {
        console.error(e);
        if (window.showToast) window.showToast('Error al remover', 'error');
      }
      hideConfirm();
    }
  );
};

/* ══════════════════════════════════
   BACK
   ══════════════════════════════════ */
window._backToPlaylists = function () {
  $('plListView').style.display = 'block';
  $('plDetailView').classList.remove('show');
  currentPlaylistId = null;
  currentPlaylistData = null;
};

/* ══════════════════════════════════
   ➕ ADD TO PLAYLIST (from other panels)
   ══════════════════════════════════ */
window._openAddToPlaylist = function (cancionId, cancionTitulo) {
  var K = window.KXON || {};
  if (!K.currentUser) { if (window.showToast) window.showToast('Debes iniciar sesión', 'error'); return; }
  window._addToPlaylistData = { cancionId: cancionId, titulo: cancionTitulo };
  renderAddToPlaylistModal();
  $('modalAddToPlaylist').classList.add('show');
};

async function renderAddToPlaylistModal() {
  var list = $('addToPlList');
  if (!list) return;
  list.innerHTML = '<div style="text-align:center;padding:20px;color:rgba(255,255,255,.3);font-size:.82rem;">Cargando playlists...</div>';

  var K = window.KXON || {};
  try {
    var r = await db.from('playlists').select('id,nombre,playlist_canciones(cancion_id)')
      .eq('usuario_id', K.currentUser.id).order('updated_at', { ascending: false });
    if (r.error) throw r.error;
    var pls = r.data || [];

    if (!pls.length) {
      list.innerHTML = '<div style="text-align:center;padding:20px;color:rgba(255,255,255,.3);font-size:.82rem;">No tienes playlists. <a href="#" style="color:var(--kx-accent,#c0c0c0);text-decoration:underline;" data-action="create-from-modal">Crear una</a></div>';
      return;
    }

    var data = window._addToPlaylistData;
    var h = '';
    for (var i = 0; i < pls.length; i++) {
      var pl = pls[i];
      var already = false;
      if (pl.playlist_canciones && data) {
        for (var j = 0; j < pl.playlist_canciones.length; j++) {
          if (pl.playlist_canciones[j].cancion_id === data.cancionId) { already = true; break; }
        }
      }
      h += '<div class="atp-item' + (already ? ' atp-added' : '') + '"' +
           (already ? '' : ' data-action="add-to-pl" data-plid="' + pl.id + '"') +
           ' role="button" tabindex="0">';
      h += '<span class="atp-icon">' + (already ? '✅' : '🎶') + '</span>';
      h += '<span class="atp-name">' + escapeHtml(pl.nombre) + '</span>';
      if (already) h += '<span class="atp-badge">Ya agregada</span>';
      h += '</div>';
    }
    list.innerHTML = h;
  } catch (e2) {
    list.innerHTML = '<div style="text-align:center;padding:20px;color:rgba(255,255,255,.3);">Error cargando playlists</div>';
  }
}

window._addSongToPlaylist = async function (playlistId) {
  var data = window._addToPlaylistData;
  if (!data) return;

  try {
    var countR = await db.from('playlist_canciones').select('id', { count: 'exact', head: true }).eq('playlist_id', playlistId);
    var pos = (countR.count || 0) + 1;

    var r = await db.from('playlist_canciones').insert({
      playlist_id: playlistId, cancion_id: data.cancionId, posicion: pos
    });
    if (r.error) {
      if (r.error.message.indexOf('unique') >= 0 || r.error.message.indexOf('duplicate') >= 0) {
        if (window.showToast) window.showToast('Ya está en esta playlist', 'error');
        return;
      }
      throw r.error;
    }

    await db.from('playlists').update({ updated_at: new Date().toISOString() }).eq('id', playlistId);

    if (window.showToast) window.showToast('Agregada a la playlist', 'success');
    window._closeAddToPlaylist();

    if (currentPlaylistId === playlistId) await loadPlaylistCanciones(playlistId);
    await window._loadPlaylists();
  } catch (e) {
    console.error(e);
    if (window.showToast) window.showToast('Error: ' + e.message, 'error');
  }
};

window._closeAddToPlaylist = function () {
  $('modalAddToPlaylist').classList.remove('show');
  window._addToPlaylistData = null;
};

/* ══════════════════════════════════
   🖱️ EVENT DELEGATION
   ══════════════════════════════════ */
var panel = $('panel-playlists');
if (panel) {
  panel.addEventListener('click', function (e) {
    var target = e.target;

    /* Card click → detail */
    var card = target.closest('.kx-pl-card');
    if (card && !target.closest('[data-action]')) {
      var id = card.getAttribute('data-id');
      if (id) window._openPlaylistDetail(id);
      return;
    }

    /* Play playlist from card */
    var playBtn = target.closest('[data-action="play-playlist"]');
    if (playBtn) {
      e.stopPropagation();
      var plId = playBtn.getAttribute('data-id');
      if (plId) {
        (async function () {
          await window._openPlaylistDetail(plId);
          setTimeout(function () { window._playAllPlaylist(); }, 500);
        })();
      }
      return;
    }

    /* Delete playlist from card */
    var delBtn = target.closest('[data-action="delete-playlist"]');
    if (delBtn) {
      e.stopPropagation();
      var delId = delBtn.getAttribute('data-id');
      if (delId) window._deletePlaylist(delId);
      return;
    }

    /* Play track */
    var track = target.closest('[data-action="play-track"]');
    if (track && !target.closest('[data-action="remove-track"]')) {
      var idx = parseInt(track.getAttribute('data-index'));
      if (!isNaN(idx)) window._playPlaylistTrack(idx);
      return;
    }

    /* Remove track */
    var removeBtn = target.closest('[data-action="remove-track"]');
    if (removeBtn) {
      e.stopPropagation();
      var pcid = removeBtn.getAttribute('data-pcid');
      if (pcid) window._removeFromPlaylist(pcid);
      return;
    }

    /* Create from empty */
    var createBtn = target.closest('[data-action="create-playlist"]');
    if (createBtn) {
      window._openCreatePlaylist();
      return;
    }

    /* Create from modal link */
    var createModalLink = target.closest('[data-action="create-from-modal"]');
    if (createModalLink) {
      e.preventDefault();
      window._closeAddToPlaylist();
      window._openCreatePlaylist();
      return;
    }

    /* Add to playlist from modal */
    var addToPl = target.closest('[data-action="add-to-pl"]');
    if (addToPl) {
      var plid = addToPl.getAttribute('data-plid');
      if (plid) window._addSongToPlaylist(plid);
      return;
    }

    /* Back */
    var backBtn = target.closest('#plBtnBack');
    if (backBtn) { window._backToPlaylists(); return; }

    /* Create new */
    var newBtn = target.closest('#plBtnCreate');
    if (newBtn) { window._openCreatePlaylist(); return; }

    /* Play all */
    var playAll = target.closest('#plBtnPlayAll');
    if (playAll) { window._playAllPlaylist(); return; }

    /* Shuffle */
    var shuffle = target.closest('#plBtnShuffle');
    if (shuffle) { window._shufflePlaylist(); return; }

    /* Edit */
    var editBtn = target.closest('#plBtnEdit');
    if (editBtn) { window._openEditPlaylist(); return; }

    /* Delete from detail */
    var delDetail = target.closest('#plBtnDeleteDetail');
    if (delDetail && currentPlaylistId) { window._deletePlaylist(currentPlaylistId); return; }

    /* Filters */
    var filterBtn = target.closest('.kx-pl-filter');
    if (filterBtn) {
      var filters = panel.querySelectorAll('.kx-pl-filter');
      for (var f = 0; f < filters.length; f++) {
        filters[f].classList.remove('active');
        filters[f].setAttribute('aria-selected', 'false');
      }
      filterBtn.classList.add('active');
      filterBtn.setAttribute('aria-selected', 'true');
      currentFilter = filterBtn.getAttribute('data-filter');
      applyFilters();
      return;
    }

    /* Sort trigger */
    var sortTrigger = target.closest('#plSortBtn');
    if (sortTrigger) {
      var dd = $('plSortDropdown');
      if (dd) dd.classList.toggle('show');
      return;
    }

    /* Sort option */
    var sortOpt = target.closest('.kx-pl-sort-option');
    if (sortOpt) {
      var opts = panel.querySelectorAll('.kx-pl-sort-option');
      for (var s = 0; s < opts.length; s++) {
        opts[s].classList.remove('active');
        opts[s].setAttribute('aria-selected', 'false');
      }
      sortOpt.classList.add('active');
      sortOpt.setAttribute('aria-selected', 'true');
      currentSort = sortOpt.getAttribute('data-sort');
      var label = $('plSortLabel');
      if (label) label.textContent = sortOpt.textContent;
      $('plSortDropdown').classList.remove('show');
      applyFilters();
      return;
    }

    /* Search clear */
    var clearBtn = target.closest('#plSearchClear');
    if (clearBtn) {
      var input = $('plSearchInput');
      if (input) { input.value = ''; input.focus(); }
      searchQuery = '';
      clearBtn.style.display = 'none';
      applyFilters();
      return;
    }

    /* Confirm cancel */
    var confirmCancel = target.closest('#plConfirmCancel');
    if (confirmCancel) { hideConfirm(); return; }

    /* Confirm accept */
    var confirmAccept = target.closest('#plConfirmAccept');
    if (confirmAccept && confirmCallback) {
      confirmCallback();
      return;
    }

    /* Close sort dropdown on outside click */
    if (!target.closest('.kx-pl-sort-wrap')) {
      var dd2 = $('plSortDropdown');
      if (dd2) dd2.classList.remove('show');
    }
  });

  /* Keyboard support for cards/tracks */
  panel.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      var card = e.target.closest('.kx-pl-card');
      if (card) {
        e.preventDefault();
        var id = card.getAttribute('data-id');
        if (id) window._openPlaylistDetail(id);
        return;
      }
      var track = e.target.closest('.kx-pl-track');
      if (track) {
        e.preventDefault();
        var idx = parseInt(track.getAttribute('data-index'));
        if (!isNaN(idx)) window._playPlaylistTrack(idx);
      }
    }
  });

  /* Search input */
  var searchInput = $('plSearchInput');
  if (searchInput) {
    var searchTimeout;
    searchInput.addEventListener('input', function () {
      var val = this.value.trim();
      var clearBtn = $('plSearchClear');
      if (clearBtn) clearBtn.style.display = val ? 'flex' : 'none';
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(function () {
        searchQuery = val;
        applyFilters();
      }, 200);
    });
  }

  /* Close confirm overlay on outside click */
  var confirmOverlay = $('plConfirmOverlay');
  if (confirmOverlay) {
    confirmOverlay.addEventListener('click', function (e) {
      if (e.target === this) hideConfirm();
    });
  }
}

/* Close sort dropdown on outside click */
document.addEventListener('click', function (e) {
  if (!e.target.closest('.kx-pl-sort-wrap')) {
    var dd = $('plSortDropdown');
    if (dd) dd.classList.remove('show');
  }
});

})();