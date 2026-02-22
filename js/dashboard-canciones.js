/* ═══════════════════════════════════════════════════
   🎵 KXON CANCIONES — REBUILD 2026
   Módulo independiente con cache, filtros, búsqueda,
   event delegation, escapeHtml, accesibilidad.
   ═══════════════════════════════════════════════════ */
(function () {

  var db = window.db;
  var K = window.KXON;

  /* ── Helpers ── */
  function esc(s) {
    if (!s) return '';
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(s));
    return d.innerHTML;
  }

  function isReleased(f) { return !f || new Date(f) <= new Date(); }

  function fmtDate(f) {
    if (!f) return '';
    var d = new Date(f);
    var m = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return d.getDate() + ' ' + m[d.getMonth()] + ' ' + d.getFullYear();
  }

  function isNew(f) {
    if (!f) return false;
    var h = (new Date() - new Date(f)) / 36e5;
    return h >= 0 && h <= 72;
  }

  function fmtPlays(n) {
    if (!n) return '0';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return n.toString();
  }

  function parseDuration(dur) {
    if (!dur || dur === '--:--') return 0;
    var p = dur.split(':');
    return (parseInt(p[0]) || 0) * 60 + (parseInt(p[1]) || 0);
  }

  function fmtTotalDuration(s) {
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    if (h > 0) return h + 'h ' + m + 'm';
    return m + 'm';
  }

  function countdown(f) {
    if (!f) return '';
    var diff = new Date(f) - new Date();
    if (diff <= 0) return '';
    var days = Math.floor(diff / 864e5);
    var hrs = Math.floor((diff % 864e5) / 36e5);
    if (days > 0) return 'Faltan ' + days + 'd ' + hrs + 'h';
    return 'Faltan ' + hrs + 'h';
  }

  /* ── State ── */
  var st = {
    allSongs: [],       // raw from DB
    filtered: [],       // after filter + sort + search
    filter: 'todas',
    sort: 'recent',
    searchQuery: '',
    loaded: false,
    searchTimeout: null
  };

  /* ══════════════════════════════════════════
     📊 KPI CALCULATIONS
     ══════════════════════════════════════════ */
  function updateKPIs(songs) {
    var totalPlays = 0;
    var totalSeconds = 0;

    for (var i = 0; i < songs.length; i++) {
      totalPlays += (songs[i].reproducciones || 0);
      totalSeconds += parseDuration(songs[i].duracion);
    }

    var elTotal = document.getElementById('trkStatTotal');
    var elPlays = document.getElementById('trkStatPlays');
    var elDur = document.getElementById('trkStatDuration');

    if (elTotal) elTotal.textContent = songs.length;
    if (elPlays) elPlays.textContent = fmtPlays(totalPlays);
    if (elDur) elDur.textContent = fmtTotalDuration(totalSeconds);
  }

  /* ══════════════════════════════════════════
     🔍 FILTER / SORT / SEARCH
     ══════════════════════════════════════════ */
  function filterSongs(songs, f) {
    var now = new Date();
    switch (f) {
      case 'recientes':
        var d30 = new Date(now - 30 * 864e5);
        return songs.filter(function (s) {
          return new Date(s.created_at) >= d30 && isReleased(s.fecha_lanzamiento);
        });
      case 'populares':
        return songs.slice().sort(function (a, b) {
          return (b.reproducciones || 0) - (a.reproducciones || 0);
        });
      case 'album':
        return songs.slice().sort(function (a, b) {
          var aName = (a.albumes ? a.albumes.titulo : '') || '';
          var bName = (b.albumes ? b.albumes.titulo : '') || '';
          return aName.localeCompare(bName);
        });
      default: return songs;
    }
  }

  function sortSongs(songs, s) {
    var sorted = songs.slice();
    switch (s) {
      case 'oldest':
        sorted.sort(function (a, b) { return new Date(a.created_at) - new Date(b.created_at); });
        break;
      case 'name-az':
        sorted.sort(function (a, b) { return a.titulo.localeCompare(b.titulo); });
        break;
      case 'name-za':
        sorted.sort(function (a, b) { return b.titulo.localeCompare(a.titulo); });
        break;
      case 'most-played':
        sorted.sort(function (a, b) { return (b.reproducciones || 0) - (a.reproducciones || 0); });
        break;
      default:
        sorted.sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });
    }
    return sorted;
  }

  function searchSongs(songs, q) {
    if (!q) return songs;
    var lower = q.toLowerCase();
    return songs.filter(function (s) {
      var title = (s.titulo || '').toLowerCase();
      var album = (s.albumes ? s.albumes.titulo : '').toLowerCase();
      return title.indexOf(lower) >= 0 || album.indexOf(lower) >= 0;
    });
  }

  function getProcessed() {
    var base = K.isAdmin ? st.allSongs : st.allSongs.filter(function (s) {
      return isReleased(s.fecha_lanzamiento);
    });
    var filtered = filterSongs(base, st.filter);
    var searched = searchSongs(filtered, st.searchQuery);
    var sorted = sortSongs(searched, st.sort);
    return sorted;
  }

  function refreshView() {
    st.filtered = getProcessed();
    renderTracks(st.filtered);
    updateActiveFilters();
    updateResultsInfo();
  }

  /* ══════════════════════════════════════════
     📊 ACTIVE FILTERS & RESULTS INFO
     ══════════════════════════════════════════ */
  function updateActiveFilters() {
    var el = document.getElementById('trkActiveFilters');
    var text = document.getElementById('trkActiveFilterText');
    if (!el || !text) return;

    var parts = [];
    if (st.filter !== 'todas') {
      var labels = { recientes: 'Últimos 30 días', populares: 'Más populares', album: 'Agrupado por álbum' };
      parts.push(labels[st.filter] || st.filter);
    }
    if (st.searchQuery) {
      parts.push('Buscando: "' + st.searchQuery + '"');
    }

    if (parts.length > 0) {
      text.textContent = parts.join(' · ');
      el.style.display = 'flex';
    } else {
      el.style.display = 'none';
    }
  }

  function updateResultsInfo() {
    var el = document.getElementById('trkResultsInfo');
    var text = document.getElementById('trkResultsText');
    if (!el || !text) return;

    var total = st.allSongs.length;
    var shown = st.filtered.length;

    if (st.searchQuery || st.filter !== 'todas') {
      text.textContent = shown + ' de ' + total + ' canciones';
      el.style.display = 'block';
    } else {
      el.style.display = 'none';
    }
  }

  /* ══════════════════════════════════════════
     💀 SKELETON
     ══════════════════════════════════════════ */
  function showSkeleton() {
    var c = document.getElementById('allCancionesList');
    if (!c) return;
    var h = '';
    for (var i = 0; i < 10; i++) {
      h += '<li class="kx-trk-skeleton">';
      h += '<div class="kx-trk-skeleton-num"></div>';
      h += '<div class="kx-trk-skeleton-cover"></div>';
      h += '<div class="kx-trk-skeleton-info">';
      h += '<div class="kx-trk-skeleton-title"></div>';
      h += '<div class="kx-trk-skeleton-album"></div>';
      h += '</div>';
      h += '<div class="kx-trk-skeleton-dur"></div>';
      h += '</li>';
    }
    c.innerHTML = h;
  }

  /* ══════════════════════════════════════════
     🎨 RENDER
     ══════════════════════════════════════════ */
  function renderTracks(songs) {
    var c = document.getElementById('allCancionesList');
    if (!c) return;

    if (!songs || !songs.length) {
      var isSearch = st.searchQuery || st.filter !== 'todas';
      c.innerHTML = '<li class="kx-trk-empty">' +
        '<div class="kx-trk-empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></div>' +
        '<div class="kx-trk-empty-title">' + (isSearch ? 'Sin resultados' : 'Sin canciones') + '</div>' +
        '<div class="kx-trk-empty-text">' + (isSearch ? 'Intenta con otros términos o filtros' : 'No hay canciones disponibles') + '</div>' +
        '</li>';
      return;
    }

    // Find most played for golden highlight
    var maxPlays = 0;
    for (var mp = 0; mp < songs.length; mp++) {
      if ((songs[mp].reproducciones || 0) > maxPlays) maxPlays = songs[mp].reproducciones;
    }

    var h = '';
    for (var i = 0; i < songs.length; i++) {
      var s = songs[i];
      var albumName = s.albumes ? s.albumes.titulo : 'Sin álbum';
      var coverImg = s.imagen_url || (s.albumes ? s.albumes.imagen_url : '') || '';
      var sRel = isReleased(s.fecha_lanzamiento);
      var sNew = isNew(s.fecha_lanzamiento);
      var sPlays = s.reproducciones || 0;
      var isPopular = maxPlays > 0 && sPlays === maxPlays && sPlays > 10;
      var isPlaying = K.isPlaying && K.currentPlaylist[K.currentTrackIndex] &&
                      K.currentPlaylist[K.currentTrackIndex].id === s.id;

      // Locked (not released)
      if (!sRel && !K.isAdmin) {
        h += '<li class="kx-trk-item kx-trk-locked" style="--i:' + i + '">';
        h += '<div class="kx-trk-num"><span class="kx-trk-num-text">' + (i + 1) + '</span></div>';
        h += '<div class="kx-trk-cover"><div class="kx-trk-cover-fallback">🔒</div></div>';
        h += '<div class="kx-trk-info"><div class="kx-trk-name">' + esc(s.titulo) + '</div>';
        h += '<div class="kx-trk-album">' + esc(albumName) + '</div></div>';
        h += '<div class="kx-trk-lock-info"><span class="kx-trk-lock-icon">🔒</span>';
        h += '<span class="kx-trk-lock-date">' + esc(fmtDate(s.fecha_lanzamiento)) + '</span></div>';
        h += '</li>';
        continue;
      }

      // Admin override for locked
      if (!sRel && K.isAdmin) {
        h += '<li class="kx-trk-item kx-trk-locked kx-trk-admin-override" style="--i:' + i + '" data-track-idx="' + i + '" data-track-id="' + s.id + '">';
      } else {
        var classes = 'kx-trk-item';
        if (sNew) classes += ' kx-trk-new';
        if (isPlaying) classes += ' kx-trk-playing';
        h += '<li class="' + classes + '" style="--i:' + i + '" data-track-idx="' + i + '" data-track-id="' + s.id + '">';
      }

      // Number / EQ
      h += '<div class="kx-trk-num">';
      h += '<span class="kx-trk-num-text">' + (i + 1) + '</span>';
      h += '<div class="kx-trk-eq"><div class="kx-trk-eq-bar"></div><div class="kx-trk-eq-bar"></div><div class="kx-trk-eq-bar"></div><div class="kx-trk-eq-bar"></div></div>';
      h += '</div>';

      // Play button
      h += '<button class="kx-trk-play" data-action="play" aria-label="Reproducir ' + esc(s.titulo) + '">';
      if (isPlaying) {
        h += '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
      } else {
        h += '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
      }
      h += '</button>';

      // Cover
      h += '<div class="kx-trk-cover">';
      if (coverImg) {
        h += '<img src="' + esc(coverImg) + '" alt="" loading="lazy" onerror="this.parentNode.innerHTML=\'<div class=kx-trk-cover-fallback>♪</div>\'">';
      } else {
        h += '<div class="kx-trk-cover-fallback">♪</div>';
      }
      h += '</div>';

      // Info
      h += '<div class="kx-trk-info">';
      h += '<div class="kx-trk-name">' + esc(s.titulo) + '</div>';
      h += '<div class="kx-trk-album">' + esc(albumName) + '</div>';
      h += '</div>';

      // New badge
      if (sNew && sRel) {
        h += '<span class="kx-trk-new-badge">NUEVO</span>';
      }

      // Lock label (admin)
      if (!sRel && K.isAdmin) {
        h += '<span class="kx-trk-lock-label">🔒 ' + esc(fmtDate(s.fecha_lanzamiento)) + '</span>';
      }

      // Album column (desktop)
      h += '<span class="kx-trk-album-col">' + esc(albumName) + '</span>';

      // Duration
      h += '<span class="kx-trk-dur">' + (s.duracion || '--:--') + '</span>';

      // Plays
      h += '<span class="kx-trk-plays' + (isPopular ? ' kx-trk-popular' : '') + '">';
      h += (isPopular ? '👑 ' : '') + fmtPlays(sPlays);
      h += '</span>';

      // Delete (admin)
      if (K.isAdmin) {
        h += '<button class="kx-trk-delete" data-action="delete" data-id="' + s.id + '" aria-label="Eliminar canción">';
        h += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
        h += '</button>';
      }

      h += '</li>';
    }

    c.innerHTML = h;
  }

  /* ══════════════════════════════════════════
     🎯 EVENT DELEGATION
     ══════════════════════════════════════════ */
  document.addEventListener('click', function (e) {
    var panel = e.target.closest('#panel-canciones');
    if (!panel) return;

    /* ── PLAY TRACK ── */
    var playBtn = e.target.closest('.kx-trk-play');
    var trackItem = e.target.closest('.kx-trk-item');

    if (playBtn || (trackItem && !e.target.closest('.kx-trk-delete'))) {
      var item = playBtn ? playBtn.closest('.kx-trk-item') : trackItem;
      if (!item || item.classList.contains('kx-trk-locked') && !item.classList.contains('kx-trk-admin-override')) return;

      e.preventDefault();
      e.stopPropagation();

      var idx = parseInt(item.getAttribute('data-track-idx'));
      if (isNaN(idx)) return;

      playFromCanciones(idx);
      return;
    }

    /* ── DELETE TRACK ── */
    var deleteBtn = e.target.closest('.kx-trk-delete');
    if (deleteBtn) {
      e.preventDefault();
      e.stopPropagation();
      var tid = deleteBtn.getAttribute('data-id');
      if (tid) deleteTrackGlobal(tid);
      return;
    }

    /* ── FILTERS ── */
    var filterBtn = e.target.closest('.kx-trk-filter');
    if (filterBtn) {
      e.preventDefault();
      panel.querySelectorAll('.kx-trk-filter').forEach(function (b) {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      filterBtn.classList.add('active');
      filterBtn.setAttribute('aria-selected', 'true');
      st.filter = filterBtn.getAttribute('data-filter');
      refreshView();
      return;
    }

    /* ── SORT TRIGGER ── */
    var sortTrigger = e.target.closest('.kx-trk-sort-trigger');
    if (sortTrigger) {
      e.preventDefault();
      e.stopPropagation();
      var drop = document.getElementById('trkSortDropdown');
      if (drop) {
        var open = drop.classList.toggle('show');
        sortTrigger.setAttribute('aria-expanded', open);
      }
      return;
    }

    /* ── SORT OPTIONS ── */
    var sortOpt = e.target.closest('.kx-trk-sort-option');
    if (sortOpt) {
      e.preventDefault();
      panel.querySelectorAll('.kx-trk-sort-option').forEach(function (o) {
        o.classList.remove('active');
        o.setAttribute('aria-selected', 'false');
      });
      sortOpt.classList.add('active');
      sortOpt.setAttribute('aria-selected', 'true');
      st.sort = sortOpt.getAttribute('data-sort');

      var labels = { recent: 'Reciente', oldest: 'Antiguo', 'name-az': 'A→Z', 'name-za': 'Z→A', 'most-played': 'Populares' };
      var lbl = document.getElementById('trkSortLabel');
      if (lbl) lbl.textContent = labels[st.sort] || 'Reciente';

      var drop2 = document.getElementById('trkSortDropdown');
      if (drop2) drop2.classList.remove('show');
      var trigger = document.getElementById('trkSortBtn');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');

      refreshView();
      return;
    }

    /* ── PLAY ALL ── */
    var playAll = e.target.closest('#trkPlayAll');
    if (playAll) {
      e.preventDefault();
      if (st.filtered.length > 0) {
        buildPlaylist(st.filtered);
        K.playTrack(0);
        K.showToast('▶ Reproduciendo ' + st.filtered.length + ' canciones', 'success');
      } else {
        K.showToast('No hay canciones para reproducir', 'error');
      }
      return;
    }

    /* ── CLEAR FILTERS ── */
    var clearFilters = e.target.closest('#trkClearFilters');
    if (clearFilters) {
      e.preventDefault();
      st.filter = 'todas';
      st.searchQuery = '';
      var searchInput = document.getElementById('trkSearchInput');
      if (searchInput) searchInput.value = '';
      var clearBtn = document.getElementById('trkSearchClear');
      if (clearBtn) clearBtn.style.display = 'none';

      panel.querySelectorAll('.kx-trk-filter').forEach(function (b) {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      var allFilter = panel.querySelector('.kx-trk-filter[data-filter="todas"]');
      if (allFilter) {
        allFilter.classList.add('active');
        allFilter.setAttribute('aria-selected', 'true');
      }

      refreshView();
      return;
    }

    /* ── SEARCH CLEAR ── */
    var searchClear = e.target.closest('#trkSearchClear');
    if (searchClear) {
      e.preventDefault();
      st.searchQuery = '';
      var si = document.getElementById('trkSearchInput');
      if (si) { si.value = ''; si.focus(); }
      searchClear.style.display = 'none';
      refreshView();
      return;
    }
  });

  /* ── Close sort dropdown on outside click ── */
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.kx-trk-sort-wrap')) {
      var drop = document.getElementById('trkSortDropdown');
      if (drop) drop.classList.remove('show');
      var trigger = document.getElementById('trkSortBtn');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    }
  });

  /* ── Search input ── */
  document.addEventListener('input', function (e) {
    if (e.target.id !== 'trkSearchInput') return;
    var val = e.target.value.trim();
    var clearBtn = document.getElementById('trkSearchClear');

    if (clearBtn) clearBtn.style.display = val ? 'flex' : 'none';

    clearTimeout(st.searchTimeout);
    st.searchTimeout = setTimeout(function () {
      st.searchQuery = val;
      refreshView();
    }, 200);
  });

  /* ══════════════════════════════════════════
     ▶ PLAY FROM CANCIONES
     Uses cached data — no re-query!
     ══════════════════════════════════════════ */
  function buildPlaylist(songs) {
    K.currentPlaylist = songs.map(function (s) {
      return {
        id: s.id,
        titulo: s.titulo,
        archivo_url: s.archivo_url,
        imagen_url: s.imagen_url || (s.albumes ? s.albumes.imagen_url : '') || '',
        duracion: s.duracion,
        reproducciones: s.reproducciones,
        album: s.albumes ? s.albumes.titulo : ''
      };
    });
    K.currentAlbumCover = '';
  }

  function playFromCanciones(idx) {
    buildPlaylist(st.filtered);
    K.playTrack(idx);
    // Update UI after short delay
    setTimeout(function () { refreshView(); }, 100);
  }

  /* ── Override the global _playFromAll for backward compatibility ── */
  window._playFromAll = function (idx, cid) {
    if (cid === 'inicioCanciones') {
      // For inicio panel, use old behavior
      db.from('canciones').select('*, albumes(titulo, imagen_url)').order('created_at', { ascending: false }).then(function (r) {
        if (r.data) {
          var f = K.isAdmin ? r.data : r.data.filter(function (s) { return isReleased(s.fecha_lanzamiento); });
          var list = f.slice(0, 5);
          K.currentPlaylist = list.map(function (s) {
            return { id: s.id, titulo: s.titulo, archivo_url: s.archivo_url, imagen_url: s.imagen_url || (s.albumes ? s.albumes.imagen_url : '') || '', duracion: s.duracion, reproducciones: s.reproducciones };
          });
          K.currentAlbumCover = '';
          K.playTrack(idx);
        }
      });
    } else {
      // For canciones panel, use cached data
      playFromCanciones(idx);
    }
  };

  /* ══════════════════════════════════════════
     🗑 DELETE
     ══════════════════════════════════════════ */
  async function deleteTrackGlobal(tid) {
    if (!confirm('¿Eliminar esta canción?')) return;
    try {
      await db.from('canciones').delete().eq('id', tid);
      K.showToast('Canción eliminada', 'success');

      // Remove from cache
      st.allSongs = st.allSongs.filter(function (s) { return s.id !== tid; });
      updateKPIs(st.allSongs);
      refreshView();

      // Also refresh álbumes panel
      if (typeof K.loadAlbumes === 'function') K.loadAlbumes();
      if (typeof K.loadStats === 'function') K.loadStats();
    } catch (e) {
      K.showToast('Error: ' + e.message, 'error');
    }
  }

  /* Also keep global reference for backward compat */
  window._deleteTrackGlobal = function (tid) { deleteTrackGlobal(tid); };

  /* ══════════════════════════════════════════
     📦 LOAD
     ══════════════════════════════════════════ */
  K.loadAllCanciones = async function () {
    showSkeleton();
    try {
      var r = await db.from('canciones')
        .select('*, albumes(titulo, imagen_url)')
        .order('created_at', { ascending: false });

      if (r.error) throw r.error;

      st.allSongs = r.data || [];
      st.loaded = true;

      // Update KPIs with released songs
      var released = K.isAdmin ? st.allSongs : st.allSongs.filter(function (s) {
        return isReleased(s.fecha_lanzamiento);
      });
      updateKPIs(released);

      // Render main panel
      refreshView();

      // Also render inicio (first 5 songs) using old function from albumes.js
      renderInicioCanciones(released.slice(0, 5));

    } catch (e) {
      console.error('Error loading canciones:', e);
      var c = document.getElementById('allCancionesList');
      if (c) {
        c.innerHTML = '<li class="kx-trk-empty">' +
          '<div class="kx-trk-empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 9v4"/><path d="M12 17h.01"/><circle cx="12" cy="12" r="10"/></svg></div>' +
          '<div class="kx-trk-empty-title">Error al cargar</div>' +
          '<div class="kx-trk-empty-text">No se pudieron cargar las canciones. Intenta nuevamente.</div>' +
          '</li>';
      }
    }
  };

  /* ── Render inicio panel canciones (backward compat) ── */
  function renderInicioCanciones(canciones) {
    var c = document.getElementById('inicioCanciones');
    if (!c) return;
    if (!canciones || !canciones.length) {
      c.innerHTML = '<div class="empty-state"><div class="empty-icon">🎵</div><div class="empty-title">Sin canciones</div></div>';
      return;
    }
    var h = '';
    for (var i = 0; i < canciones.length; i++) {
      var s = canciones[i];
      var an = s.albumes ? s.albumes.titulo : 'Sin álbum';
      var ci = s.imagen_url || (s.albumes ? s.albumes.imagen_url : '') || '';
      var sN = isNew(s.fecha_lanzamiento);
      var nc = sN ? ' track-just-released' : '';

      h += '<div class="track-item' + nc + '" onclick="window._playFromAll(' + i + ',\'inicioCanciones\')">';
      h += '<span class="track-num">' + (i + 1) + '</span>';
      if (ci) h += '<div class="track-cover"><img src="' + esc(ci) + '" alt="" loading="lazy"></div>';
      else h += '<button class="track-play-btn">▶</button>';
      h += '<div class="track-info"><div class="track-title">' + esc(s.titulo) + '</div>';
      h += '<div class="track-album-name">' + esc(an) + '</div></div>';
      if (sN) h += '<span class="track-new-badge">NUEVO</span>';
      h += '<span class="track-duration">' + (s.duracion || '--:--') + '</span>';
      h += '</div>';
    }
    c.innerHTML = h;
  }

  /* ══════════════════════════════════════════
     ⌨ KEYBOARD SHORTCUTS
     ══════════════════════════════════════════ */
  document.addEventListener('keydown', function (e) {
    var panel = document.getElementById('panel-canciones');
    if (!panel || !panel.classList.contains('active')) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

    switch (e.key) {
      case '/':
        e.preventDefault();
        var si = document.getElementById('trkSearchInput');
        if (si) si.focus();
        break;
      case 'Escape':
        var drop = document.getElementById('trkSortDropdown');
        if (drop && drop.classList.contains('show')) {
          drop.classList.remove('show');
          return;
        }
        if (st.searchQuery) {
          st.searchQuery = '';
          var input = document.getElementById('trkSearchInput');
          if (input) input.value = '';
          var clearBtn = document.getElementById('trkSearchClear');
          if (clearBtn) clearBtn.style.display = 'none';
          refreshView();
        }
        break;
      case ' ':
        if (K.isPlaying || K.currentPlaylist.length > 0) {
          e.preventDefault();
          var pp = document.getElementById('playerPlayPause');
          if (pp) pp.click();
        }
        break;
    }
  });

})();