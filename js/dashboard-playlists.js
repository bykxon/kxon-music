/* ═══════════════════════════════════════════════════
   🎶 KXON PLAYLISTS — FIXED v5.0
   ═══════════════════════════════════════════════════ */
(function () {
  'use strict';

  var db = window.db;
  if (!db) {
    var _retries = 0;
    var _timer = setInterval(function () {
      db = window.db;
      _retries++;
      if (db) {
        clearInterval(_timer);
        boot();
      } else if (_retries > 30) {
        clearInterval(_timer);
        console.error('[Playlists] window.db no disponible');
      }
    }, 300);
    return;
  }
  boot();

  function boot() {
    console.log('[Playlists] Iniciando módulo...');

    function $(id) { return document.getElementById(id); }

    function esc(s) {
      if (!s) return '';
      var d = document.createElement('div');
      d.appendChild(document.createTextNode(s));
      return d.innerHTML;
    }

    function ago(ds) {
      if (!ds) return '—';
      var s = Math.floor((Date.now() - new Date(ds).getTime()) / 1000);
      if (s < 60) return 'Hace un momento';
      if (s < 3600) return 'Hace ' + Math.floor(s / 60) + ' min';
      if (s < 86400) return 'Hace ' + Math.floor(s / 3600) + 'h';
      if (s < 604800) return 'Hace ' + Math.floor(s / 86400) + 'd';
      return new Date(ds).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    var PH = 'data:image/svg+xml,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect fill="#111" width="300" height="300"/><text x="150" y="155" font-size="48" text-anchor="middle" fill="#333">🎶</text></svg>'
    );

    function user() {
      var K = window.KXON;
      return K && K.currentUser ? K.currentUser : null;
    }

    function toast(m, t) {
      var K = window.KXON;
      if (K && K.showToast) K.showToast(m, t || 'success');
    }

    // ── STATE ──
    var all = [], filtered = [], plId = null, plData = null, plSongs = [];
    var filter = 'todas', sort = 'recent', search = '', confirmCb = null, loading = false;

    // ══════════════════════════════════
    // LOAD
    // ══════════════════════════════════
    window._loadPlaylists = async function () {
      if (loading) return;
      loading = true;
      var u = user();
      if (!u) {
        loading = false;
        setTimeout(function () { if (user()) window._loadPlaylists(); }, 1500);
        return;
      }
      var grid = $('playlistsGrid');
      if (!grid) { loading = false; return; }
      skeletonGrid(grid, 6);

      try {
        var r = await db.from('playlists')
          .select('*, playlist_canciones(id)')
          .eq('usuario_id', u.id)
          .order('updated_at', { ascending: false });
        if (r.error) throw r.error;
        all = r.data || [];
        console.log('[Playlists] Loaded:', all.length);
        applyFilters();
        updateKPIs();
      } catch (e) {
        console.error('[Playlists]', e);
        grid.innerHTML = emptyErr('Error al cargar playlists');
      }
      loading = false;
    };

    // ── KPIs ──
    function updateKPIs() {
      var tracks = 0, pub = 0;
      for (var i = 0; i < all.length; i++) {
        var pc = all[i].playlist_canciones;
        tracks += pc ? pc.length : 0;
        if (all[i].publica) pub++;
      }
      var e1 = $('plStatTotal'); if (e1) e1.textContent = all.length;
      var e2 = $('plStatTracks'); if (e2) e2.textContent = tracks;
      var e3 = $('plStatPublic'); if (e3) e3.textContent = pub;
    }

    // ── FILTERS ──
    function applyFilters() {
      var r = all.slice();
      if (filter === 'recientes') {
        var d30 = Date.now() - 30 * 86400000;
        r = r.filter(function (p) { return new Date(p.created_at).getTime() > d30; });
      } else if (filter === 'publicas') {
        r = r.filter(function (p) { return p.publica; });
      } else if (filter === 'privadas') {
        r = r.filter(function (p) { return !p.publica; });
      }
      if (search) {
        var q = search.toLowerCase();
        r = r.filter(function (p) {
          return (p.titulo || '').toLowerCase().indexOf(q) >= 0 ||
                 (p.descripcion || '').toLowerCase().indexOf(q) >= 0;
        });
      }
      r.sort(function (a, b) {
        var ad = a.updated_at || a.created_at, bd = b.updated_at || b.created_at;
        if (sort === 'recent') return new Date(bd) - new Date(ad);
        if (sort === 'oldest') return new Date(ad) - new Date(bd);
        if (sort === 'name-az') return (a.titulo || '').localeCompare(b.titulo || '');
        if (sort === 'name-za') return (b.titulo || '').localeCompare(a.titulo || '');
        if (sort === 'most-songs') {
          return (b.playlist_canciones ? b.playlist_canciones.length : 0) -
                 (a.playlist_canciones ? a.playlist_canciones.length : 0);
        }
        return 0;
      });
      filtered = r;
      renderGrid();
    }

    // ── RENDER GRID ──
    function renderGrid() {
      var g = $('playlistsGrid');
      if (!g) return;
      if (!filtered.length) {
        g.innerHTML = (search || filter !== 'todas') ? emptyFilter() : emptyState();
        return;
      }
      var h = '';
      for (var i = 0; i < filtered.length; i++) {
        var p = filtered[i], img = p.imagen_url || '',
            n = p.playlist_canciones ? p.playlist_canciones.length : 0,
            nm = esc(p.titulo), dt = p.updated_at || p.created_at;

        h += '<div class="kx-pl-card kx-observed" style="--i:' + i + '" role="listitem" tabindex="0" data-id="' + p.id + '">';
        h += '<div class="kx-pl-card-visual">';
        if (img) {
          h += '<img class="kx-pl-card-img" src="' + esc(img) + '" alt="" loading="lazy">';
        } else {
          h += '<div class="kx-pl-card-fallback"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg><span class="kx-pl-card-fallback-text">PLAYLIST</span></div>';
        }
        if (p.publica) {
          h += '<span class="kx-pl-card-badge kx-pl-card-badge--public"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>Pública</span>';
        }
        h += '<div class="kx-pl-card-overlay">';
        h += '<button class="kx-pl-card-play" data-action="play-playlist" data-id="' + p.id + '"><svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg></button>';
        h += '<span class="kx-pl-card-count">' + n + ' cancion' + (n !== 1 ? 'es' : '') + '</span></div>';
        h += '<button class="kx-pl-card-delete" data-action="delete-playlist" data-id="' + p.id + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>';
        h += '</div>';
        h += '<div class="kx-pl-card-body"><div class="kx-pl-card-title">' + nm + '</div>';
        h += '<div class="kx-pl-card-sub"><span>' + n + ' cancion' + (n !== 1 ? 'es' : '') + '</span><span class="kx-pl-card-sub-dot"></span><span>' + ago(dt) + '</span></div></div>';
        h += '</div>';
      }
      g.innerHTML = h;
    }

    // ── TEMPLATES ──
    function skeletonGrid(el, c) {
      var h = '';
      for (var i = 0; i < c; i++) h += '<div class="kx-pl-skeleton"><div class="kx-pl-skeleton-img"></div><div class="kx-pl-skeleton-body"><div class="kx-pl-skeleton-line"></div><div class="kx-pl-skeleton-line kx-pl-skeleton-line--short"></div></div></div>';
      el.innerHTML = h;
    }
    function skeletonTracks(el, c) {
      var h = '';
      for (var i = 0; i < c; i++) h += '<div class="kx-pl-skeleton-track"><div class="kx-pl-skeleton-track-num"></div><div class="kx-pl-skeleton-track-cover"></div><div class="kx-pl-skeleton-track-bar"></div><div class="kx-pl-skeleton-track-dur"></div></div>';
      el.innerHTML = h;
    }
    function emptyState() {
      return '<div class="kx-pl-empty"><div class="kx-pl-empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></div><div class="kx-pl-empty-title">Sin playlists</div><div class="kx-pl-empty-text">Crea tu primera playlist</div><button class="kx-pl-empty-btn" data-action="create-playlist"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14"/><path d="M5 12h14"/></svg>Crear Playlist</button></div>';
    }
    function emptyFilter() {
      return '<div class="kx-pl-empty"><div class="kx-pl-empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></div><div class="kx-pl-empty-title">Sin resultados</div><div class="kx-pl-empty-text">No se encontraron playlists</div></div>';
    }
    function emptyErr(m) {
      return '<div class="kx-pl-empty"><div class="kx-pl-empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg></div><div class="kx-pl-empty-title">' + esc(m) + '</div></div>';
    }

    // ══════════════════════════════════
    // DETAIL
    // ══════════════════════════════════
    window._openPlaylistDetail = async function (id) {
      plId = id;
      var tl = $('plTrackList');
      if (tl) skeletonTracks(tl, 5);

      try {
        var r = await db.from('playlists').select('*').eq('id', id).single();
        if (r.error) throw r.error;
        plData = r.data;

        var t = $('plDetailTitle'); if (t) t.textContent = r.data.titulo;
        var d = $('plDetailDesc'); if (d) d.textContent = r.data.descripcion || 'Sin descripción';
        var img = r.data.imagen_url || '';
        var cv = $('plDetailCover'), fb = $('plDetailCoverFallback');
        if (cv) {
          if (img) { cv.src = img; cv.style.display = 'block'; if (fb) fb.style.display = 'none'; }
          else { cv.style.display = 'none'; if (fb) fb.style.display = 'flex'; }
        }
        var bg = $('plDetailHeroBg');
        if (bg) bg.style.backgroundImage = img ? 'url(' + img + ')' : 'none';

        var vis = $('plDetailVisibility');
        if (vis) {
          vis.textContent = r.data.publica ? 'Pública' : 'Privada';
          vis.className = 'kx-pl-hero-visibility' + (r.data.publica ? ' kx-pl-hero-visibility--public' : '');
        }

        var up = $('plDetailUpdated');
        if (up) up.textContent = ago(r.data.updated_at || r.data.created_at);

        await loadSongs(id);

        var lv = $('plListView'), dv = $('plDetailView');
        if (lv) lv.style.display = 'none';
        if (dv) dv.classList.add('show');
      } catch (e) {
        console.error('[Playlists] Detail error:', e);
        toast('Error al cargar playlist', 'error');
      }
    };

    // ══════════════════════════════════
    // ★ LOAD SONGS — QUERY FIX
    // ══════════════════════════════════
    async function loadSongs(playlistId) {
      var tl = $('plTrackList');
      console.log('[Playlists] Loading songs for:', playlistId);

      try {
        // STEP 1: Get playlist_canciones with basic cancion data
        var r = await db.from('playlist_canciones')
          .select('id, cancion_id, posicion')
          .eq('playlist_id', playlistId)
          .order('posicion', { ascending: true });

        if (r.error) throw r.error;

        var pcRows = r.data || [];
        console.log('[Playlists] playlist_canciones rows:', pcRows.length);

        if (!pcRows.length) {
          plSongs = [];
          renderSongs(tl);
          updateSongsMeta();
          return;
        }

        // STEP 2: Get song IDs
        var songIds = pcRows.map(function (pc) { return pc.cancion_id; }).filter(Boolean);

        if (!songIds.length) {
          plSongs = [];
          renderSongs(tl);
          updateSongsMeta();
          return;
        }

        // STEP 3: Fetch songs separately
        var sr = await db.from('canciones')
          .select('id, titulo, audio_url, archivo_url, duracion, album_id')
          .in('id', songIds);

        if (sr.error) throw sr.error;

        var songsMap = {};
        var albumIds = [];
        (sr.data || []).forEach(function (s) {
          songsMap[s.id] = s;
          if (s.album_id && albumIds.indexOf(s.album_id) === -1) {
            albumIds.push(s.album_id);
          }
        });

        console.log('[Playlists] Songs fetched:', Object.keys(songsMap).length);

        // STEP 4: Fetch albums separately
        var albumsMap = {};
        if (albumIds.length) {
          var ar = await db.from('albumes')
            .select('id, titulo, imagen_url')
            .in('id', albumIds);

          if (!ar.error && ar.data) {
            ar.data.forEach(function (a) { albumsMap[a.id] = a; });
          }
          console.log('[Playlists] Albums fetched:', Object.keys(albumsMap).length);
        }

        // STEP 5: Merge data
        plSongs = [];
        for (var i = 0; i < pcRows.length; i++) {
          var pc = pcRows[i];
          var song = songsMap[pc.cancion_id];
          if (!song) {
            console.warn('[Playlists] Song not found:', pc.cancion_id);
            continue;
          }
          var album = song.album_id ? albumsMap[song.album_id] : null;
          plSongs.push({
            pcId: pc.id,
            posicion: pc.posicion,
            id: song.id,
            titulo: song.titulo,
            audio_url: song.audio_url,
            archivo_url: song.archivo_url,
            duracion: song.duracion,
            album_id: song.album_id,
            albumTitulo: album ? album.titulo : '',
            albumImg: album ? album.imagen_url : ''
          });
        }

        console.log('[Playlists] Merged songs:', plSongs.length);
        renderSongs(tl);
        updateSongsMeta();

      } catch (e) {
        console.error('[Playlists] Song load error:', e);
        if (tl) tl.innerHTML = emptyErr('Error al cargar canciones');
      }
    }

    function updateSongsMeta() {
      var meta = $('plDetailMeta');
      if (meta) meta.textContent = plSongs.length + ' CANCION' + (plSongs.length !== 1 ? 'ES' : '');
      var sub = $('plTracksSub');
      if (sub) sub.textContent = plSongs.length + ' cancion' + (plSongs.length !== 1 ? 'es' : '') + ' en esta playlist';

      var totalSec = 0;
      for (var i = 0; i < plSongs.length; i++) {
        var dur = plSongs[i].duracion;
        if (dur) {
          var p = dur.split(':');
          if (p.length === 2) totalSec += parseInt(p[0]) * 60 + parseInt(p[1]);
          else if (p.length === 3) totalSec += parseInt(p[0]) * 3600 + parseInt(p[1]) * 60 + parseInt(p[2]);
        }
      }
      var de = $('plDetailDuration');
      if (de) de.textContent = Math.floor(totalSec / 60) + ' min';
    }

    function renderSongs(container) {
      if (!container) return;
      if (!plSongs.length) {
        container.innerHTML = '<li class="kx-pl-empty-tracks"><div class="kx-pl-empty-tracks-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></div><div class="kx-pl-empty-tracks-title">Playlist vacía</div><div class="kx-pl-empty-tracks-text">Agrega canciones desde Canciones o Álbumes</div></li>';
        return;
      }

      var h = '';
      for (var i = 0; i < plSongs.length; i++) {
        var s = plSongs[i];
        var img = s.albumImg || PH;

        h += '<li class="kx-pl-track" data-action="play-track" data-index="' + i + '" tabindex="0">';
        h += '<span class="kx-pl-track-num">' + (i + 1) + '</span>';
        h += '<div class="kx-pl-track-cover"><img src="' + esc(img) + '" alt="" loading="lazy" onerror="this.src=\'' + PH + '\'"></div>';
        h += '<div class="kx-pl-track-info"><div class="kx-pl-track-title">' + esc(s.titulo) + '</div>';
        if (s.albumTitulo) h += '<div class="kx-pl-track-album">' + esc(s.albumTitulo) + '</div>';
        h += '</div>';
        h += '<span class="kx-pl-track-album-col">' + esc(s.albumTitulo) + '</span>';
        h += '<span class="kx-pl-track-dur">' + esc(s.duracion || '--:--') + '</span>';
        h += '<button class="kx-pl-track-remove" data-action="remove-track" data-pcid="' + s.pcId + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>';
        h += '</li>';
      }
      container.innerHTML = h;
    }

    // ══════════════════════════════════
    // PLAY
    // ══════════════════════════════════
    window._playPlaylistTrack = function (index) {
      if (!plSongs.length) { toast('Playlist vacía', 'error'); return; }
      var K = window.KXON || {};
      var tracks = [];
      for (var i = 0; i < plSongs.length; i++) {
        var s = plSongs[i];
        var url = s.audio_url || s.archivo_url;
        if (!url) continue;
        var img = s.albumImg || PH;
        tracks.push({
          id: s.id, titulo: s.titulo,
          archivo_url: url, audio_url: url,
          imagen_url: img, cover: img,
          album: s.albumTitulo || '', duracion: s.duracion || '--:--'
        });
      }
      if (!tracks.length) { toast('Sin canciones reproducibles', 'error'); return; }
      var idx = index >= tracks.length ? 0 : index;

      if (K.playTrackList) {
        K.playTrackList(tracks, idx);
      } else if (K.playTrack) {
        K.currentPlaylist = tracks;
        K.currentAlbumCover = tracks[idx].imagen_url;
        if (K.activeSource !== undefined) K.activeSource = 'canciones';
        K.playTrack(idx);
      }
    };

    window._playAllPlaylist = function () { window._playPlaylistTrack(0); };
    window._shufflePlaylist = function () {
      if (!plSongs.length) return;
      window._playPlaylistTrack(Math.floor(Math.random() * plSongs.length));
    };

    // ══════════════════════════════════
    // CREATE / EDIT
    // ══════════════════════════════════
    window._openCreatePlaylist = function () {
      var m = $('modalPlaylist');
      if (!m) { toast('Modal no encontrado', 'error'); return; }
      var t = $('plModalTitle'); if (t) t.textContent = 'Nueva Playlist';
      var n = $('plNombre'); if (n) n.value = '';
      var d = $('plDesc'); if (d) d.value = '';
      var p = $('plPublica'); if (p) p.checked = false;
      var e = $('plModalEditId'); if (e) e.value = '';
      var bt = $('plBtnSubmitText'); if (bt) bt.textContent = '🎶 Crear Playlist';
      m.classList.add('show');
    };

    window._openEditPlaylist = function () {
      if (!plData) return;
      var m = $('modalPlaylist'); if (!m) return;
      var t = $('plModalTitle'); if (t) t.textContent = 'Editar Playlist';
      var n = $('plNombre'); if (n) n.value = plData.titulo || '';
      var d = $('plDesc'); if (d) d.value = plData.descripcion || '';
      var p = $('plPublica'); if (p) p.checked = plData.publica || false;
      var e = $('plModalEditId'); if (e) e.value = plData.id;
      var bt = $('plBtnSubmitText'); if (bt) bt.textContent = '💾 Guardar';
      m.classList.add('show');
    };

    window._submitPlaylist = async function (evt) {
      if (evt) evt.preventDefault();
      var u = user();
      if (!u) { toast('Inicia sesión', 'error'); return; }

      var titulo = ($('plNombre') || {}).value;
      if (titulo) titulo = titulo.trim();
      if (!titulo) { toast('Nombre requerido', 'error'); return; }

      var desc = ($('plDesc') || {}).value || '';
      var publica = ($('plPublica') || {}).checked || false;
      var editId = ($('plModalEditId') || {}).value || '';
      var btn = $('plBtnSubmit'); if (btn) btn.disabled = true;

      try {
        var now = new Date().toISOString();
        if (editId) {
          var r = await db.from('playlists').update({
            titulo: titulo, descripcion: desc.trim(), publica: publica, updated_at: now
          }).eq('id', editId).eq('usuario_id', u.id);
          if (r.error) throw r.error;
          toast('Playlist actualizada ✓');
          if (plData && plData.id === editId) {
            plData.titulo = titulo; plData.descripcion = desc.trim(); plData.publica = publica;
            var dt = $('plDetailTitle'); if (dt) dt.textContent = titulo;
            var dd = $('plDetailDesc'); if (dd) dd.textContent = desc.trim() || 'Sin descripción';
          }
        } else {
          var r2 = await db.from('playlists').insert({
            usuario_id: u.id, titulo: titulo, descripcion: desc.trim(),
            publica: publica, created_at: now, updated_at: now
          });
          if (r2.error) throw r2.error;
          toast('¡Playlist creada! 🎶');
        }
        window._closePlaylistModal();
        await window._loadPlaylists();
      } catch (e) {
        console.error('[Playlists]', e);
        toast('Error: ' + (e.message || 'desconocido'), 'error');
      }
      if (btn) btn.disabled = false;
    };

    window._closePlaylistModal = function () {
      var m = $('modalPlaylist'); if (m) m.classList.remove('show');
    };

    // ══════════════════════════════════
    // DELETE
    // ══════════════════════════════════
    function showConfirm(t, tx, at, cb) {
      var o = $('plConfirmOverlay');
      var te = $('plConfirmTitle'); if (te) te.textContent = t;
      var txe = $('plConfirmText'); if (txe) txe.textContent = tx;
      var ae = $('plConfirmAccept'); if (ae) ae.textContent = at;
      confirmCb = cb;
      if (o) o.classList.add('show');
    }
    function hideConfirm() {
      var o = $('plConfirmOverlay'); if (o) o.classList.remove('show');
      confirmCb = null;
    }

    window._deletePlaylist = function (id) {
      var name = 'esta playlist';
      for (var i = 0; i < all.length; i++) {
        if (all[i].id === id) { name = all[i].titulo; break; }
      }
      showConfirm('¿Eliminar playlist?', '"' + name + '" se eliminará.', 'Eliminar', async function () {
        try {
          await db.from('playlist_canciones').delete().eq('playlist_id', id);
          var r = await db.from('playlists').delete().eq('id', id);
          if (r.error) throw r.error;
          toast('Playlist eliminada');
          if (plId === id) {
            var lv = $('plListView'), dv = $('plDetailView');
            if (lv) lv.style.display = 'block';
            if (dv) dv.classList.remove('show');
            plId = null; plData = null;
          }
          await window._loadPlaylists();
        } catch (e) { toast('Error al eliminar', 'error'); }
        hideConfirm();
      });
    };

    window._removeFromPlaylist = function (pcId) {
      showConfirm('¿Quitar canción?', 'Se quitará de esta playlist.', 'Quitar', async function () {
        try {
          var r = await db.from('playlist_canciones').delete().eq('id', pcId);
          if (r.error) throw r.error;
          toast('Canción removida');
          if (plId) await loadSongs(plId);
          await window._loadPlaylists();
        } catch (e) { toast('Error', 'error'); }
        hideConfirm();
      });
    };

    window._backToPlaylists = function () {
      var lv = $('plListView'), dv = $('plDetailView');
      if (lv) lv.style.display = 'block';
      if (dv) dv.classList.remove('show');
      plId = null; plData = null;
    };

    // ══════════════════════════════════
    // ★ ADD TO PLAYLIST (from player)
    // ══════════════════════════════════
    window._openAddToPlaylist = function (cancionId, cancionTitulo) {
      console.log('[Playlists] _openAddToPlaylist:', cancionId);
      var u = user();
      if (!u) { toast('Inicia sesión', 'error'); return; }
      if (!cancionId) { toast('No se pudo identificar la canción', 'error'); return; }

      window._addToPlaylistData = { cancionId: cancionId, titulo: cancionTitulo || '' };
      var m = $('modalAddToPlaylist');
      if (!m) { toast('Modal no encontrado', 'error'); return; }

      loadAddToPlaylistModal();
      m.classList.add('show');
    };

    async function loadAddToPlaylistModal() {
      var list = $('addToPlList');
      if (!list) return;
      list.innerHTML = '<div style="text-align:center;padding:24px;color:rgba(255,255,255,.3);font-size:.82rem;">Cargando...</div>';

      var u = user();
      if (!u) { list.innerHTML = '<div style="text-align:center;padding:24px;color:rgba(255,255,255,.3);">Inicia sesión</div>'; return; }

      try {
        var r = await db.from('playlists')
          .select('id, titulo, playlist_canciones(cancion_id)')
          .eq('usuario_id', u.id)
          .order('updated_at', { ascending: false });

        if (r.error) throw r.error;
        var pls = r.data || [];

        if (!pls.length) {
          list.innerHTML = '<div style="text-align:center;padding:24px;color:rgba(255,255,255,.3);font-size:.82rem;">No tienes playlists.<br><br><button data-action="create-from-modal" style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:#fff;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-weight:700;font-size:.75rem;">Crear una</button></div>';
          return;
        }

        var data = window._addToPlaylistData;
        var h = '';
        for (var i = 0; i < pls.length; i++) {
          var pl = pls[i], already = false;
          if (pl.playlist_canciones && data) {
            for (var j = 0; j < pl.playlist_canciones.length; j++) {
              if (pl.playlist_canciones[j].cancion_id === data.cancionId) { already = true; break; }
            }
          }
          h += '<div class="kx-atp-item' + (already ? ' kx-atp-added' : '') + '"' +
               (already ? '' : ' data-action="add-to-pl" data-plid="' + pl.id + '"') + ' tabindex="0">';
          h += '<span class="kx-atp-icon">' + (already ? '✅' : '🎶') + '</span>';
          h += '<span class="kx-atp-name">' + esc(pl.titulo) + '</span>';
          if (already) h += '<span class="kx-atp-badge">Ya agregada</span>';
          h += '</div>';
        }
        list.innerHTML = h;
      } catch (e) {
        console.error('[Playlists]', e);
        list.innerHTML = '<div style="text-align:center;padding:24px;color:rgba(255,255,255,.3);">Error cargando</div>';
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

        await db.from('playlists').update({ updated_at: new Date().toISOString() }).eq('id', playlistId);
        toast('¡Agregada! ✓');
        window._closeAddToPlaylist();
        if (plId === playlistId) await loadSongs(playlistId);
        await window._loadPlaylists();
      } catch (e) {
        console.error('[Playlists]', e);
        toast('Error: ' + (e.message || ''), 'error');
      }
    };

    window._closeAddToPlaylist = function () {
      var m = $('modalAddToPlaylist'); if (m) m.classList.remove('show');
      window._addToPlaylistData = null;
    };

    // ══════════════════════════════════
    // EVENT DELEGATION
    // ══════════════════════════════════
    var panel = $('panel-playlists');
    if (panel) {
      panel.addEventListener('click', function (e) {
        var t = e.target;

        // Card click (not action buttons)
        var card = t.closest('.kx-pl-card');
        if (card && !t.closest('[data-action]')) {
          window._openPlaylistDetail(card.getAttribute('data-id'));
          return;
        }

        var a = t.closest('[data-action]');
        if (a) {
          var action = a.getAttribute('data-action');
          e.stopPropagation();

          if (action === 'play-playlist') {
            var pid = a.getAttribute('data-id');
            (async function () {
              await window._openPlaylistDetail(pid);
              setTimeout(window._playAllPlaylist, 400);
            })();
            return;
          }
          if (action === 'delete-playlist') { window._deletePlaylist(a.getAttribute('data-id')); return; }
          if (action === 'play-track') {
            var idx = parseInt(a.getAttribute('data-index'));
            if (!isNaN(idx)) window._playPlaylistTrack(idx);
            return;
          }
          if (action === 'remove-track') { window._removeFromPlaylist(a.getAttribute('data-pcid')); return; }
          if (action === 'create-playlist') { window._openCreatePlaylist(); return; }
        }

        // Track click (li element)
        var track = t.closest('.kx-pl-track');
        if (track && !t.closest('[data-action="remove-track"]')) {
          var ti = parseInt(track.getAttribute('data-index'));
          if (!isNaN(ti)) window._playPlaylistTrack(ti);
          return;
        }

        if (t.closest('#plBtnBack')) { window._backToPlaylists(); return; }
        if (t.closest('#plBtnCreate')) { window._openCreatePlaylist(); return; }
        if (t.closest('#plBtnPlayAll')) { window._playAllPlaylist(); return; }
        if (t.closest('#plBtnShuffle')) { window._shufflePlaylist(); return; }
        if (t.closest('#plBtnEdit')) { window._openEditPlaylist(); return; }
        if (t.closest('#plBtnDeleteDetail') && plId) { window._deletePlaylist(plId); return; }

        // Filters
        var fb = t.closest('.kx-pl-filter');
        if (fb) {
          panel.querySelectorAll('.kx-pl-filter').forEach(function (f) {
            f.classList.remove('active'); f.setAttribute('aria-selected', 'false');
          });
          fb.classList.add('active'); fb.setAttribute('aria-selected', 'true');
          filter = fb.getAttribute('data-filter');
          applyFilters();
          return;
        }

        if (t.closest('#plSortBtn')) {
          var dd = $('plSortDropdown'); if (dd) dd.classList.toggle('show');
          return;
        }

        var so = t.closest('.kx-pl-sort-option');
        if (so) {
          panel.querySelectorAll('.kx-pl-sort-option').forEach(function (s) {
            s.classList.remove('active'); s.setAttribute('aria-selected', 'false');
          });
          so.classList.add('active'); so.setAttribute('aria-selected', 'true');
          sort = so.getAttribute('data-sort');
          var lb = $('plSortLabel'); if (lb) lb.textContent = so.textContent;
          var dd2 = $('plSortDropdown'); if (dd2) dd2.classList.remove('show');
          applyFilters();
          return;
        }

        if (t.closest('#plSearchClear')) {
          var inp = $('plSearchInput'); if (inp) { inp.value = ''; inp.focus(); }
          search = '';
          t.closest('#plSearchClear').style.display = 'none';
          applyFilters();
          return;
        }

        if (t.closest('#plConfirmCancel')) { hideConfirm(); return; }
        if (t.closest('#plConfirmAccept') && confirmCb) { confirmCb(); return; }

        if (!t.closest('.kx-pl-sort-wrap')) {
          var dd3 = $('plSortDropdown'); if (dd3) dd3.classList.remove('show');
        }
      });

      // Keyboard
      panel.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          var card = e.target.closest('.kx-pl-card');
          if (card) { e.preventDefault(); window._openPlaylistDetail(card.getAttribute('data-id')); return; }
          var track = e.target.closest('.kx-pl-track');
          if (track) {
            e.preventDefault();
            var idx = parseInt(track.getAttribute('data-index'));
            if (!isNaN(idx)) window._playPlaylistTrack(idx);
          }
        }
      });

      // Search input
      var si = $('plSearchInput');
      if (si) {
        var st;
        si.addEventListener('input', function () {
          var v = this.value.trim();
          var cb = $('plSearchClear'); if (cb) cb.style.display = v ? 'flex' : 'none';
          clearTimeout(st);
          st = setTimeout(function () { search = v; applyFilters(); }, 200);
        });
      }

      // Confirm overlay click
      var co = $('plConfirmOverlay');
      if (co) co.addEventListener('click', function (e) { if (e.target === this) hideConfirm(); });
    }

    // ── DOCUMENT-LEVEL EVENTS ──
    document.addEventListener('click', function (e) {
      var t = e.target;

      if (t.closest('#plBtnSubmit')) { e.preventDefault(); window._submitPlaylist(e); return; }
      if (t.closest('[data-action="close-playlist-modal"]')) { window._closePlaylistModal(); return; }
      if (t.closest('[data-action="close-add-to-playlist"]')) { window._closeAddToPlaylist(); return; }
      if (t.id === 'modalPlaylist') { window._closePlaylistModal(); return; }
      if (t.id === 'modalAddToPlaylist') { window._closeAddToPlaylist(); return; }

      var addItem = t.closest('[data-action="add-to-pl"]');
      if (addItem) { window._addSongToPlaylist(addItem.getAttribute('data-plid')); return; }

      var createLink = t.closest('[data-action="create-from-modal"]');
      if (createLink) { e.preventDefault(); window._closeAddToPlaylist(); window._openCreatePlaylist(); return; }

      if (!t.closest('.kx-pl-sort-wrap')) {
        var dd = $('plSortDropdown'); if (dd) dd.classList.remove('show');
      }
    });

    console.log('[Playlists] Module ready ✓');

  } // end boot

})();