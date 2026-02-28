/* ═══════════════════════════════════════════════════
   🎶 KXON PLAYLISTS — FIXED v2.0
   Compatible con dashboard-init.js v4.3
   ═══════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Usar cliente Supabase global ── */
  var db = window.db;
  if (!db) {
    console.error('[Playlists] window.db no disponible');
    return;
  }

  /* ══════════════════════════════════
     HELPERS
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
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  var PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">' +
    '<rect fill="#111" width="300" height="300"/>' +
    '<text x="150" y="155" font-size="48" text-anchor="middle" fill="#333">🎶</text></svg>'
  );

  function getUser() {
    var K = window.KXON;
    return (K && K.currentUser) ? K.currentUser : null;
  }

  function toast(msg, type) {
    var K = window.KXON;
    if (K && K.showToast) K.showToast(msg, type || 'success');
  }

  /* ══════════════════════════════════
     STATE
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
  var isLoading = false;

  /* ══════════════════════════════════
     LOAD PLAYLISTS
     ══════════════════════════════════ */
  window._loadPlaylists = async function () {
    if (isLoading) return;
    isLoading = true;

    var user = getUser();
    if (!user) {
      console.warn('[Playlists] No hay usuario autenticado');
      isLoading = false;
      return;
    }

    var grid = $('playlistsGrid');
    if (!grid) { isLoading = false; return; }

    renderSkeletonGrid(grid, 6);

    try {
      var r = await db.from('playlists')
        .select('*, playlist_canciones(id)')
        .eq('usuario_id', user.id)
        .order('updated_at', { ascending: false });

      if (r.error) throw r.error;
      allPlaylists = r.data || [];
      applyFilters();
      updateKPIs();
    } catch (e) {
      console.error('[Playlists] Error:', e);
      grid.innerHTML = renderError('Error al cargar playlists');
    }

    isLoading = false;
  };

  /* ══════════════════════════════════
     KPIs
     ══════════════════════════════════ */
  function updateKPIs() {
    var totalTracks = 0;
    var totalPublic = 0;
    for (var i = 0; i < allPlaylists.length; i++) {
      var pc = allPlaylists[i].playlist_canciones;
      totalTracks += pc ? pc.length : 0;
      if (allPlaylists[i].publica) totalPublic++;
    }
    var st = $('plStatTotal');
    if (st) st.textContent = allPlaylists.length;
    var stk = $('plStatTracks');
    if (stk) stk.textContent = totalTracks;
    var sp = $('plStatPublic');
    if (sp) sp.textContent = totalPublic;
  }

  /* ══════════════════════════════════
     FILTER / SORT / SEARCH
     ══════════════════════════════════ */
  function applyFilters() {
    var result = allPlaylists.slice();

    if (currentFilter === 'recientes') {
      var d30 = Date.now() - 30 * 86400000;
      result = result.filter(function (p) {
        return new Date(p.created_at).getTime() > d30;
      });
    } else if (currentFilter === 'publicas') {
      result = result.filter(function (p) { return p.publica; });
    } else if (currentFilter === 'privadas') {
      result = result.filter(function (p) { return !p.publica; });
    }

    if (searchQuery) {
      var q = searchQuery.toLowerCase();
      result = result.filter(function (p) {
        return (p.nombre || '').toLowerCase().indexOf(q) >= 0 ||
               (p.descripcion || '').toLowerCase().indexOf(q) >= 0;
      });
    }

    result.sort(function (a, b) {
      var aDate = a.updated_at || a.created_at;
      var bDate = b.updated_at || b.created_at;
      if (currentSort === 'recent') return new Date(bDate) - new Date(aDate);
      if (currentSort === 'oldest') return new Date(aDate) - new Date(bDate);
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
     RENDER GRID
     ══════════════════════════════════ */
  function renderGrid() {
    var grid = $('playlistsGrid');
    if (!grid) return;

    if (!filteredPlaylists.length) {
      grid.innerHTML = (searchQuery || currentFilter !== 'todas')
        ? renderEmptyFiltered()
        : renderEmptyState();
      return;
    }

    var h = '';
    for (var i = 0; i < filteredPlaylists.length; i++) {
      var pl = filteredPlaylists[i];
      var img = pl.imagen_url || '';
      var numSongs = pl.playlist_canciones ? pl.playlist_canciones.length : 0;
      var name = escapeHtml(pl.nombre);
      var dateStr = pl.updated_at || pl.created_at;

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
             '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">' +
             '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/>' +
             '<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>' +
             '</svg>Pública</span>';
      }

      /* Overlay */
      h += '<div class="kx-pl-card-overlay">' +
           '<button class="kx-pl-card-play" data-action="play-playlist" data-id="' + pl.id + '" aria-label="Reproducir">' +
           '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg></button>' +
           '<span class="kx-pl-card-count">' + numSongs + ' cancion' + (numSongs !== 1 ? 'es' : '') + '</span></div>';

      /* Delete */
      h += '<button class="kx-pl-card-delete" data-action="delete-playlist" data-id="' + pl.id + '" aria-label="Eliminar">' +
           '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">' +
           '<path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>';

      h += '</div>'; /* /card-visual */

      /* Body */
      h += '<div class="kx-pl-card-body">' +
           '<div class="kx-pl-card-title">' + name + '</div>' +
           '<div class="kx-pl-card-sub">' +
           '<span>' + numSongs + ' cancion' + (numSongs !== 1 ? 'es' : '') + '</span>' +
           '<span class="kx-pl-card-sub-dot"></span>' +
           '<span>' + timeAgo(dateStr) + '</span></div></div>';

      h += '</div>'; /* /card */
    }

    grid.innerHTML = h;

    /* Broken images */
    var imgs = grid.querySelectorAll('.kx-pl-card-img');
    for (var j = 0; j < imgs.length; j++) {
      imgs[j].addEventListener('error', function () {
        this.style.display = 'none';
        if (!this.parentNode.querySelector('.kx-pl-card-fallback')) {
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
     RENDER HELPERS
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
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">' +
      '<path d="M12 5v14"/><path d="M5 12h14"/></svg>' +
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
     DETAIL VIEW
     ══════════════════════════════════ */
  window._openPlaylistDetail = async function (plId) {
    currentPlaylistId = plId;
    var trackList = $('plTrackList');
    if (trackList) renderSkeletonTracks(trackList, 5);

    try {
      var r = await db.from('playlists').select('*').eq('id', plId).single();
      if (r.error) throw r.error;
      currentPlaylistData = r.data;

      var title = $('plDetailTitle');
      if (title) title.textContent = r.data.nombre;

      var desc = $('plDetailDesc');
      if (desc) desc.textContent = r.data.descripcion || 'Sin descripción';

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

      var heroBg = $('plDetailHeroBg');
      if (heroBg) heroBg.style.backgroundImage = img ? 'url(' + img + ')' : 'none';

      var vis = $('plDetailVisibility');
      if (vis) {
        if (r.data.publica) {
          vis.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">' +
            '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/></svg> Pública';
          vis.className = 'kx-pl-hero-visibility kx-pl-hero-visibility--public';
        } else {
          vis.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">' +
            '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Privada';
          vis.className = 'kx-pl-hero-visibility';
        }
      }

      var updated = $('plDetailUpdated');
      if (updated) updated.textContent = timeAgo(r.data.updated_at || r.data.created_at);

      await loadPlaylistCanciones(plId);

      var listView = $('plListView');
      var detailView = $('plDetailView');
      if (listView) listView.style.display = 'none';
      if (detailView) detailView.classList.add('show');

    } catch (e) {
      console.error('[Playlists] Error abriendo:', e);
      toast('Error al cargar playlist', 'error');
    }
  };

  /* ── LOAD TRACKS ── */
  async function loadPlaylistCanciones(plId) {
    var trackList = $('plTrackList');
    try {
      var r = await db.from('playlist_canciones')
        .select('*, canciones(id, titulo, audio_url, archivo_url, duracion, album_id, albumes(titulo, imagen_url))')
        .eq('playlist_id', plId)
        .order('posicion', { ascending: true });

      if (r.error) throw r.error;
      playlistCanciones = r.data || [];

      var meta = $('plDetailMeta');
      if (meta) meta.textContent = playlistCanciones.length + ' CANCION' + (playlistCanciones.length !== 1 ? 'ES' : '');

      var sub = $('plTracksSub');
      if (sub) sub.textContent = playlistCanciones.length + ' cancion' + (playlistCanciones.length !== 1 ? 'es' : '') + ' en esta playlist';

      var totalSec = 0;
      for (var d = 0; d < playlistCanciones.length; d++) {
        var c = playlistCanciones[d].canciones;
        if (c && c.duracion) {
          var parts = c.duracion.split(':');
          if (parts.length === 2) totalSec += parseInt(parts[0]) * 60 + parseInt(parts[1]);
        }
      }
      var durEl = $('plDetailDuration');
      if (durEl) durEl.textContent = Math.floor(totalSec / 60) + ' min';

      renderPlaylistTracks(trackList);
    } catch (e) {
      console.error('[Playlists] Error canciones:', e);
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
      h += '<button class="kx-pl-track-remove" data-action="remove-track" data-pcid="' + pc.id + '" aria-label="Quitar">' +
           '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
           '<path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>';
      h += '</li>';
    }
    container.innerHTML = h;
  }

  /* ══════════════════════════════════
     PLAY
     ══════════════════════════════════ */
  window._playPlaylistTrack = function (index) {
    if (!playlistCanciones.length) return;
    var K = window.KXON || {};
    var tracks = [];

    for (var i = 0; i < playlistCanciones.length; i++) {
      var c = playlistCanciones[i].canciones;
      if (!c) continue;
      var audioUrl = c.audio_url || c.archivo_url;
      if (!audioUrl) continue;
      var albumImg = (c.albumes && c.albumes.imagen_url) || PLACEHOLDER;
      tracks.push({
        id: c.id,
        titulo: c.titulo,
        archivo_url: audioUrl,
        audio_url: audioUrl,
        imagen_url: albumImg,
        cover: albumImg,
        album: (c.albumes && c.albumes.titulo) || '',
        duracion: c.duracion || '--:--'
      });
    }

    if (!tracks.length) {
      toast('Sin canciones reproducibles', 'error');
      return;
    }

    var idx = index >= tracks.length ? 0 : index;

    /* Use KXON's built-in playTrack */
    if (K.playTrackList) {
      K.playTrackList(tracks, idx);
    } else if (K.playTrack) {
      K.currentPlaylist = tracks;
      K.currentAlbumCover = tracks[idx].imagen_url;
      K.playTrack(idx);
    } else {
      /* Absolute fallback */
      var audioEl = $('audioPlayer');
      var t = tracks[idx];
      if (!t || !audioEl) return;
      audioEl.src = t.archivo_url || t.audio_url;
      audioEl.play().catch(function (e) { console.error(e); });
      var pt = $('playerTitle');
      if (pt) pt.textContent = t.titulo;
      var pc = $('playerCover');
      if (pc) pc.src = t.imagen_url || '';
      var pb = $('playerBar');
      if (pb) pb.classList.add('show');
    }
  };

  window._playAllPlaylist = function () {
    window._playPlaylistTrack(0);
  };

  window._shufflePlaylist = function () {
    if (!playlistCanciones.length) return;
    window._playPlaylistTrack(Math.floor(Math.random() * playlistCanciones.length));
  };

  /* ══════════════════════════════════
     CREATE / EDIT
     ══════════════════════════════════ */
  window._openCreatePlaylist = function () {
    var modal = $('modalPlaylist');
    if (!modal) {
      console.error('[Playlists] Modal #modalPlaylist no existe en el HTML');
      toast('Error: modal no encontrado', 'error');
      return;
    }
    var t = $('plModalTitle');
    if (t) t.textContent = 'Nueva Playlist';
    var n = $('plNombre');
    if (n) n.value = '';
    var d = $('plDesc');
    if (d) d.value = '';
    var p = $('plPublica');
    if (p) p.checked = false;
    var e = $('plModalEditId');
    if (e) e.value = '';
    var bt = $('plBtnSubmitText');
    if (bt) bt.textContent = '🎶 Crear Playlist';
    modal.classList.add('show');
  };

  window._openEditPlaylist = function () {
    if (!currentPlaylistData) return;
    var modal = $('modalPlaylist');
    if (!modal) return;
    var t = $('plModalTitle');
    if (t) t.textContent = 'Editar Playlist';
    var n = $('plNombre');
    if (n) n.value = currentPlaylistData.nombre || '';
    var d = $('plDesc');
    if (d) d.value = currentPlaylistData.descripcion || '';
    var p = $('plPublica');
    if (p) p.checked = currentPlaylistData.publica || false;
    var e = $('plModalEditId');
    if (e) e.value = currentPlaylistData.id;
    var bt = $('plBtnSubmitText');
    if (bt) bt.textContent = '💾 Guardar Cambios';
    modal.classList.add('show');
  };

  window._submitPlaylist = async function (evt) {
    if (evt) evt.preventDefault();

    var user = getUser();
    if (!user) {
      toast('Debes iniciar sesión', 'error');
      return;
    }

    var nombreEl = $('plNombre');
    var descEl = $('plDesc');
    var publicaEl = $('plPublica');
    var editIdEl = $('plModalEditId');

    var nombre = nombreEl ? nombreEl.value.trim() : '';
    var desc = descEl ? descEl.value.trim() : '';
    var publica = publicaEl ? publicaEl.checked : false;
    var editId = editIdEl ? editIdEl.value : '';

    if (!nombre) {
      toast('Ingresa un nombre para la playlist', 'error');
      return;
    }

    var btn = $('plBtnSubmit');
    if (btn) btn.disabled = true;

    try {
      var now = new Date().toISOString();

      if (editId) {
        /* UPDATE */
        var r = await db.from('playlists').update({
          nombre: nombre,
          descripcion: desc,
          publica: publica,
          updated_at: now
        }).eq('id', editId).eq('usuario_id', user.id);

        if (r.error) throw r.error;
        toast('Playlist actualizada ✓', 'success');

        if (currentPlaylistData && currentPlaylistData.id === editId) {
          currentPlaylistData.nombre = nombre;
          currentPlaylistData.descripcion = desc;
          currentPlaylistData.publica = publica;
          var dt = $('plDetailTitle');
          if (dt) dt.textContent = nombre;
          var dd = $('plDetailDesc');
          if (dd) dd.textContent = desc || 'Sin descripción';
        }
      } else {
        /* INSERT */
        var r2 = await db.from('playlists').insert({
          usuario_id: user.id,
          nombre: nombre,
          descripcion: desc,
          publica: publica,
          created_at: now,
          updated_at: now
        });

        if (r2.error) throw r2.error;
        toast('¡Playlist creada! 🎶', 'success');
      }

      window._closePlaylistModal();
      await window._loadPlaylists();
    } catch (err) {
      console.error('[Playlists] Error guardando:', err);
      toast('Error: ' + (err.message || 'Error desconocido'), 'error');
    }

    if (btn) btn.disabled = false;
  };

  window._closePlaylistModal = function () {
    var modal = $('modalPlaylist');
    if (modal) modal.classList.remove('show');
  };

  /* ══════════════════════════════════
     DELETE
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

  window._deletePlaylist = function (plId) {
    var pl = null;
    for (var i = 0; i < allPlaylists.length; i++) {
      if (allPlaylists[i].id === plId) { pl = allPlaylists[i]; break; }
    }
    var name = pl ? pl.nombre : 'esta playlist';

    showConfirm(
      '¿Eliminar playlist?',
      '"' + name + '" se eliminará permanentemente.',
      'Eliminar',
      async function () {
        try {
          await db.from('playlist_canciones').delete().eq('playlist_id', plId);
          var r = await db.from('playlists').delete().eq('id', plId);
          if (r.error) throw r.error;
          toast('Playlist eliminada', 'success');

          if (currentPlaylistId === plId) {
            var lv = $('plListView');
            var dv = $('plDetailView');
            if (lv) lv.style.display = 'block';
            if (dv) dv.classList.remove('show');
            currentPlaylistId = null;
            currentPlaylistData = null;
          }
          await window._loadPlaylists();
        } catch (e) {
          console.error(e);
          toast('Error al eliminar', 'error');
        }
        hideConfirm();
      }
    );
  };

  /* ══════════════════════════════════
     REMOVE TRACK
     ══════════════════════════════════ */
  window._removeFromPlaylist = function (pcId) {
    showConfirm(
      '¿Quitar canción?',
      'Se quitará de esta playlist.',
      'Quitar',
      async function () {
        try {
          var r = await db.from('playlist_canciones').delete().eq('id', pcId);
          if (r.error) throw r.error;
          toast('Canción removida', 'success');
          if (currentPlaylistId) await loadPlaylistCanciones(currentPlaylistId);
          await window._loadPlaylists();
        } catch (e) {
          console.error(e);
          toast('Error al remover', 'error');
        }
        hideConfirm();
      }
    );
  };

  /* ══════════════════════════════════
     BACK
     ══════════════════════════════════ */
  window._backToPlaylists = function () {
    var lv = $('plListView');
    var dv = $('plDetailView');
    if (lv) lv.style.display = 'block';
    if (dv) dv.classList.remove('show');
    currentPlaylistId = null;
    currentPlaylistData = null;
  };

  /* ══════════════════════════════════
     ADD TO PLAYLIST (from other panels)
     ══════════════════════════════════ */
  window._openAddToPlaylist = function (cancionId, cancionTitulo) {
    var user = getUser();
    if (!user) {
      toast('Debes iniciar sesión', 'error');
      return;
    }
    window._addToPlaylistData = { cancionId: cancionId, titulo: cancionTitulo || '' };
    var modal = $('modalAddToPlaylist');
    if (!modal) {
      console.error('[Playlists] Modal #modalAddToPlaylist no existe');
      toast('Error: modal no encontrado', 'error');
      return;
    }
    renderAddToPlaylistModal();
    modal.classList.add('show');
  };

  async function renderAddToPlaylistModal() {
    var list = $('addToPlList');
    if (!list) return;
    list.innerHTML = '<div style="text-align:center;padding:24px;color:rgba(255,255,255,.3);font-size:.82rem;">Cargando playlists...</div>';

    var user = getUser();
    if (!user) {
      list.innerHTML = '<div style="text-align:center;padding:24px;color:rgba(255,255,255,.3);">Debes iniciar sesión</div>';
      return;
    }

    try {
      var r = await db.from('playlists')
        .select('id, nombre, playlist_canciones(cancion_id)')
        .eq('usuario_id', user.id)
        .order('updated_at', { ascending: false });

      if (r.error) throw r.error;
      var pls = r.data || [];

      if (!pls.length) {
        list.innerHTML = '<div style="text-align:center;padding:24px;color:rgba(255,255,255,.3);font-size:.82rem;">' +
          'No tienes playlists. <a href="#" style="color:#8b5cf6;text-decoration:underline;" data-action="create-from-modal">Crear una</a></div>';
        return;
      }

      var data = window._addToPlaylistData;
      var h = '';
      for (var i = 0; i < pls.length; i++) {
        var pl = pls[i];
        var already = false;
        if (pl.playlist_canciones && data) {
          for (var j = 0; j < pl.playlist_canciones.length; j++) {
            if (pl.playlist_canciones[j].cancion_id === data.cancionId) {
              already = true;
              break;
            }
          }
        }
        h += '<div class="kx-atp-item' + (already ? ' kx-atp-added' : '') + '"' +
             (already ? '' : ' data-action="add-to-pl" data-plid="' + pl.id + '"') +
             ' role="button" tabindex="0">';
        h += '<span class="kx-atp-icon">' + (already ? '✅' : '🎶') + '</span>';
        h += '<span class="kx-atp-name">' + escapeHtml(pl.nombre) + '</span>';
        if (already) h += '<span class="kx-atp-badge">Ya agregada</span>';
        h += '</div>';
      }
      list.innerHTML = h;
    } catch (e2) {
      console.error(e2);
      list.innerHTML = '<div style="text-align:center;padding:24px;color:rgba(255,255,255,.3);">Error cargando playlists</div>';
    }
  }

  window._addSongToPlaylist = async function (playlistId) {
    var data = window._addToPlaylistData;
    if (!data) return;

    try {
      var countR = await db.from('playlist_canciones')
        .select('id', { count: 'exact', head: true })
        .eq('playlist_id', playlistId);
      var pos = (countR.count || 0) + 1;

      var r = await db.from('playlist_canciones').insert({
        playlist_id: playlistId,
        cancion_id: data.cancionId,
        posicion: pos
      });

      if (r.error) {
        if (r.error.message && (r.error.message.indexOf('unique') >= 0 || r.error.message.indexOf('duplicate') >= 0)) {
          toast('Ya está en esta playlist', 'error');
          return;
        }
        throw r.error;
      }

      await db.from('playlists').update({
        updated_at: new Date().toISOString()
      }).eq('id', playlistId);

      toast('Agregada a la playlist ✓', 'success');
      window._closeAddToPlaylist();

      if (currentPlaylistId === playlistId) await loadPlaylistCanciones(playlistId);
      await window._loadPlaylists();
    } catch (e) {
      console.error(e);
      toast('Error: ' + (e.message || 'Error desconocido'), 'error');
    }
  };

  window._closeAddToPlaylist = function () {
    var modal = $('modalAddToPlaylist');
    if (modal) modal.classList.remove('show');
    window._addToPlaylistData = null;
  };

  /* ══════════════════════════════════
     EVENT DELEGATION — PANEL
     ══════════════════════════════════ */
  var panel = $('panel-playlists');
  if (panel) {
    panel.addEventListener('click', function (e) {
      var target = e.target;

      /* Card → detail */
      var card = target.closest('.kx-pl-card');
      if (card && !target.closest('[data-action]')) {
        var id = card.getAttribute('data-id');
        if (id) window._openPlaylistDetail(id);
        return;
      }

      /* Play from card */
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

      /* Delete from card */
      var delBtn = target.closest('[data-action="delete-playlist"]');
      if (delBtn) {
        e.stopPropagation();
        window._deletePlaylist(delBtn.getAttribute('data-id'));
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
        window._removeFromPlaylist(removeBtn.getAttribute('data-pcid'));
        return;
      }

      /* Create */
      if (target.closest('[data-action="create-playlist"]')) {
        window._openCreatePlaylist();
        return;
      }

      /* Back */
      if (target.closest('#plBtnBack')) { window._backToPlaylists(); return; }

      /* Create new btn */
      if (target.closest('#plBtnCreate')) { window._openCreatePlaylist(); return; }

      /* Play all */
      if (target.closest('#plBtnPlayAll')) { window._playAllPlaylist(); return; }

      /* Shuffle */
      if (target.closest('#plBtnShuffle')) { window._shufflePlaylist(); return; }

      /* Edit */
      if (target.closest('#plBtnEdit')) { window._openEditPlaylist(); return; }

      /* Delete from detail */
      if (target.closest('#plBtnDeleteDetail') && currentPlaylistId) {
        window._deletePlaylist(currentPlaylistId);
        return;
      }

      /* Filters */
      var filterBtn = target.closest('.kx-pl-filter');
      if (filterBtn) {
        panel.querySelectorAll('.kx-pl-filter').forEach(function (f) {
          f.classList.remove('active');
          f.setAttribute('aria-selected', 'false');
        });
        filterBtn.classList.add('active');
        filterBtn.setAttribute('aria-selected', 'true');
        currentFilter = filterBtn.getAttribute('data-filter');
        applyFilters();
        return;
      }

      /* Sort trigger */
      if (target.closest('#plSortBtn')) {
        var dd = $('plSortDropdown');
        if (dd) dd.classList.toggle('show');
        return;
      }

      /* Sort option */
      var sortOpt = target.closest('.kx-pl-sort-option');
      if (sortOpt) {
        panel.querySelectorAll('.kx-pl-sort-option').forEach(function (s) {
          s.classList.remove('active');
          s.setAttribute('aria-selected', 'false');
        });
        sortOpt.classList.add('active');
        sortOpt.setAttribute('aria-selected', 'true');
        currentSort = sortOpt.getAttribute('data-sort');
        var label = $('plSortLabel');
        if (label) label.textContent = sortOpt.textContent;
        var dd2 = $('plSortDropdown');
        if (dd2) dd2.classList.remove('show');
        applyFilters();
        return;
      }

      /* Search clear */
      if (target.closest('#plSearchClear')) {
        var input = $('plSearchInput');
        if (input) { input.value = ''; input.focus(); }
        searchQuery = '';
        target.closest('#plSearchClear').style.display = 'none';
        applyFilters();
        return;
      }

      /* Confirm cancel */
      if (target.closest('#plConfirmCancel')) { hideConfirm(); return; }

      /* Confirm accept */
      if (target.closest('#plConfirmAccept') && confirmCallback) {
        confirmCallback();
        return;
      }

      /* Close sort dropdown */
      if (!target.closest('.kx-pl-sort-wrap')) {
        var dd3 = $('plSortDropdown');
        if (dd3) dd3.classList.remove('show');
      }
    });

    /* Keyboard */
    panel.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        var card = e.target.closest('.kx-pl-card');
        if (card) {
          e.preventDefault();
          window._openPlaylistDetail(card.getAttribute('data-id'));
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

    /* Search */
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

    /* Confirm overlay click */
    var confirmOverlay = $('plConfirmOverlay');
    if (confirmOverlay) {
      confirmOverlay.addEventListener('click', function (e) {
        if (e.target === this) hideConfirm();
      });
    }
  }

  /* ══════════════════════════════════
     EVENT DELEGATION — DOCUMENT LEVEL
     (for modals that live outside the panel)
     ══════════════════════════════════ */
  document.addEventListener('click', function (e) {
    var target = e.target;

    /* Submit playlist form */
    if (target.closest('#plBtnSubmit')) {
      e.preventDefault();
      window._submitPlaylist(e);
      return;
    }

    /* Close playlist modal */
    if (target.closest('[data-action="close-playlist-modal"]')) {
      window._closePlaylistModal();
      return;
    }

    /* Close add-to-playlist modal */
    if (target.closest('[data-action="close-add-to-playlist"]')) {
      window._closeAddToPlaylist();
      return;
    }

    /* Click overlay to close modals */
    if (target.id === 'modalPlaylist') {
      window._closePlaylistModal();
      return;
    }
    if (target.id === 'modalAddToPlaylist') {
      window._closeAddToPlaylist();
      return;
    }

    /* Add to playlist item */
    var addItem = target.closest('[data-action="add-to-pl"]');
    if (addItem) {
      var plid = addItem.getAttribute('data-plid');
      if (plid) window._addSongToPlaylist(plid);
      return;
    }

    /* Create from modal link */
    var createLink = target.closest('[data-action="create-from-modal"]');
    if (createLink) {
      e.preventDefault();
      window._closeAddToPlaylist();
      window._openCreatePlaylist();
      return;
    }

    /* Close sort dropdown */
    if (!target.closest('.kx-pl-sort-wrap')) {
      var dd = $('plSortDropdown');
      if (dd) dd.classList.remove('show');
    }
  });

})();