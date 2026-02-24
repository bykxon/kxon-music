/* ============================================
   📊 DASHBOARD-HISTORIAL.JS — KXON 2026
   Historial de reproducciones rediseñado
   ✅ escapeHtml, event delegation, namespace
   ============================================ */
(function () {

  var db = window.db;
  var K = window.KXON;

  /* ══════════════════════════════════════════
     🛡️ SEGURIDAD
     ══════════════════════════════════════════ */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function $(id) { return document.getElementById(id); }

  /* ══════════════════════════════════════════
     📅 UTILIDADES
     ══════════════════════════════════════════ */
  function getDateLabel(dateStr) {
    var date = new Date(dateStr);
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    var itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (itemDate.getTime() === today.getTime()) return 'Hoy';
    if (itemDate.getTime() === yesterday.getTime()) return 'Ayer';

    var diff = Math.floor((today - itemDate) / 86400000);
    if (diff < 7) return 'Hace ' + diff + ' días';

    var meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return date.getDate() + ' ' + meses[date.getMonth()] + ' ' + date.getFullYear();
  }

  function formatTime(dateStr) {
    var d = new Date(dateStr);
    var h = d.getHours();
    var m = d.getMinutes();
    var ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12; h = h ? h : 12;
    return h + ':' + (m < 10 ? '0' : '') + m + ' ' + ampm;
  }

  function isToday(dateStr) {
    var d = new Date(dateStr); var n = new Date();
    return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
  }

  function isThisWeek(dateStr) {
    var d = new Date(dateStr); var n = new Date();
    var w = new Date(n); w.setDate(w.getDate() - 7);
    return d >= w;
  }

  function isThisMonth(dateStr) {
    var d = new Date(dateStr); var n = new Date();
    var m = new Date(n); m.setDate(m.getDate() - 30);
    return d >= m;
  }

  /* ══════════════════════════════════════════
     📦 STATE
     ══════════════════════════════════════════ */
  var allHistorial = [];
  var filteredHistorial = [];
  var currentFilter = 'todo';
  var searchTerm = '';
  var PAGE_SIZE = 50;
  var currentPage = 1;

  /* ══════════════════════════════════════════
     💾 AGREGAR AL HISTORIAL
     ══════════════════════════════════════════ */
  K.addToHistorial = async function (track) {
    if (!track || !track.id || !K.currentUser) return;

    try {
      await db.from('historial_reproducciones').insert({
        usuario_id: K.currentUser.id,
        cancion_id: track.id,
        titulo: track.titulo,
        imagen_url: track.imagen_url || '',
        album: track.album || '',
        duracion: track.duracion || '--:--'
      });
    } catch (e) {
      addToLocalHistorial(track);
    }
  };

  function addToLocalHistorial(track) {
    var key = 'kxon_historial_' + K.currentUser.id;
    var h = [];
    try { h = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { h = []; }

    h.unshift({
      id: track.id,
      cancion_id: track.id,
      titulo: track.titulo,
      imagen_url: track.imagen_url || '',
      album: track.album || '',
      duracion: track.duracion || '--:--',
      created_at: new Date().toISOString()
    });

    if (h.length > 500) h = h.slice(0, 500);
    localStorage.setItem(key, JSON.stringify(h));
  }

  /* ══════════════════════════════════════════
     📊 CARGAR HISTORIAL
     ══════════════════════════════════════════ */
  K.loadHistorial = async function () {
    if (!K.currentUser) return;

    allHistorial = [];

    try {
      var r = await db.from('historial_reproducciones')
        .select('*')
        .eq('usuario_id', K.currentUser.id)
        .order('created_at', { ascending: false })
        .limit(500);

      if (r.error) throw r.error;
      allHistorial = r.data || [];
    } catch (e) {
      var key = 'kxon_historial_' + K.currentUser.id;
      try { allHistorial = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e2) { allHistorial = []; }
    }

    currentFilter = 'todo';
    searchTerm = '';
    currentPage = 1;

    var si = $('histSearchInput'); if (si) si.value = '';
    var sc = $('histSearchClear'); if (sc) sc.style.display = 'none';

    var filters = document.querySelectorAll('.kx-hist-filter');
    for (var i = 0; i < filters.length; i++) {
      filters[i].classList.toggle('active', filters[i].getAttribute('data-filter') === 'todo');
      filters[i].setAttribute('aria-selected', filters[i].getAttribute('data-filter') === 'todo' ? 'true' : 'false');
    }

    applyFilters();
    renderStats();
  };

  /* ══════════════════════════════════════════
     🔍 FILTROS Y BÚSQUEDA
     ══════════════════════════════════════════ */
  function applyFilters() {
    filteredHistorial = allHistorial.slice();

    // Filter by time
    if (currentFilter === 'hoy') {
      filteredHistorial = filteredHistorial.filter(function (i) { return isToday(i.created_at); });
    } else if (currentFilter === 'semana') {
      filteredHistorial = filteredHistorial.filter(function (i) { return isThisWeek(i.created_at); });
    } else if (currentFilter === 'mes') {
      filteredHistorial = filteredHistorial.filter(function (i) { return isThisMonth(i.created_at); });
    }

    // Search
    if (searchTerm) {
      var q = searchTerm.toLowerCase();
      filteredHistorial = filteredHistorial.filter(function (i) {
        return (i.titulo && i.titulo.toLowerCase().indexOf(q) >= 0) ||
               (i.album && i.album.toLowerCase().indexOf(q) >= 0);
      });
    }

    currentPage = 1;
    renderList();
    updateResultsInfo();
  }

  function updateResultsInfo() {
    var el = $('histResultsInfo');
    var text = $('histResultsText');
    if (!el || !text) return;

    if (searchTerm || currentFilter !== 'todo') {
      el.style.display = 'block';
      text.textContent = filteredHistorial.length + ' resultado' + (filteredHistorial.length !== 1 ? 's' : '') +
        (searchTerm ? ' para "' + searchTerm + '"' : '') +
        (currentFilter !== 'todo' ? ' · Filtro: ' + currentFilter : '');
    } else {
      el.style.display = 'none';
    }
  }

  /* ══════════════════════════════════════════
     📊 STATS
     ══════════════════════════════════════════ */
  function renderStats() {
    var total = allHistorial.length;
    var hoy = 0, semana = 0, uniqueIds = {};

    for (var i = 0; i < allHistorial.length; i++) {
      var item = allHistorial[i];
      if (isToday(item.created_at)) hoy++;
      if (isThisWeek(item.created_at)) semana++;
      var sid = item.cancion_id || item.id;
      if (sid) uniqueIds[sid] = true;
    }

    var unicas = Object.keys(uniqueIds).length;

    var et = $('histStatTotal'); if (et) et.textContent = total;
    var eh = $('histStatHoy'); if (eh) eh.textContent = hoy;
    var es = $('histStatSemana'); if (es) es.textContent = semana;
    var eu = $('histStatUnicas'); if (eu) eu.textContent = unicas;
  }

  /* ══════════════════════════════════════════
     📋 RENDER LISTA
     ══════════════════════════════════════════ */
  function renderList() {
    var container = $('historialList');
    if (!container) return;

    if (!filteredHistorial || filteredHistorial.length === 0) {
      container.innerHTML =
        '<div class="kx-hist-empty">' +
          '<div class="kx-hist-empty-icon">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>' +
          '</div>' +
          '<div class="kx-hist-empty-title">' + (searchTerm ? 'Sin resultados' : 'Sin historial') + '</div>' +
          '<div class="kx-hist-empty-text">' +
            (searchTerm ? 'No se encontraron canciones con "' + escapeHtml(searchTerm) + '"' : 'Tu actividad de reproducción aparecerá aquí cuando escuches música.') +
          '</div>' +
        '</div>';
      return;
    }

    // Paginate
    var visible = filteredHistorial.slice(0, currentPage * PAGE_SIZE);

    // Group by date
    var groups = {};
    var groupOrder = [];

    for (var i = 0; i < visible.length; i++) {
      var item = visible[i];
      var label = getDateLabel(item.created_at);
      if (!groups[label]) { groups[label] = []; groupOrder.push(label); }
      groups[label].push(item);
    }

    var h = '';

    for (var g = 0; g < groupOrder.length; g++) {
      var dateLabel = groupOrder[g];
      var items = groups[dateLabel];

      h += '<div class="kx-hist-group">';
      h += '<div class="kx-hist-date-label">';
      h += '<div class="kx-hist-date-label-icon">📅</div>';
      h += '<span class="kx-hist-date-label-text">' + escapeHtml(dateLabel) + '</span>';
      h += '<span class="kx-hist-date-label-count">' + items.length + '</span>';
      h += '<span class="kx-hist-date-label-line"></span>';
      h += '</div>';

      h += '<ol class="kx-hist-tracks" role="list">';

      for (var j = 0; j < items.length; j++) {
        var track = items[j];
        var songId = track.cancion_id || track.id;
        var titulo = escapeHtml(track.titulo || 'Canción desconocida');
        var album = escapeHtml(track.album || '');
        var img = escapeHtml(track.imagen_url || '');
        var time = formatTime(track.created_at);
        var dur = escapeHtml(track.duracion || '');

        h += '<li class="kx-hist-track" role="listitem" data-song-id="' + escapeHtml(songId) + '" data-action="play" tabindex="0">';

        // Time
        h += '<span class="kx-hist-track-time">' + time + '</span>';

        // Cover
        h += '<div class="kx-hist-track-cover">';
        if (img) {
          h += '<img src="' + img + '" alt="" loading="lazy">';
        } else {
          h += '<div class="kx-hist-track-cover-fallback">♪</div>';
        }
        h += '<div class="kx-hist-track-play-overlay">';
        h += '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
        h += '</div>';
        h += '</div>';

        // Info
        h += '<div class="kx-hist-track-info">';
        h += '<div class="kx-hist-track-title">' + titulo + '</div>';
        h += '<div class="kx-hist-track-meta">';
        if (album) h += '<span class="kx-hist-track-album">' + album + '</span>';
        if (dur && dur !== '--:--') h += '<span class="kx-hist-track-duration">' + dur + '</span>';
        h += '</div>';
        h += '</div>';

        // Duration column (desktop)
        h += '<span class="kx-hist-track-duration">' + (dur && dur !== '--:--' ? dur : '') + '</span>';

        // Context menu btn
        h += '<button class="kx-hist-track-ctx" data-action="ctx" data-song-id="' + escapeHtml(songId) + '" aria-label="Más opciones" title="Opciones">';
        h += '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>';
        h += '</button>';

        h += '</li>';
      }

      h += '</ol>';
      h += '</div>';
    }

    // Load more button
    if (visible.length < filteredHistorial.length) {
      h += '<div class="kx-hist-load-more">';
      h += '<button class="kx-hist-load-more-btn" data-action="load-more" aria-label="Cargar más">';
      h += '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14"/><path d="M5 12h14"/></svg>';
      h += '<span>Cargar más (' + (filteredHistorial.length - visible.length) + ' restantes)</span>';
      h += '</button>';
      h += '</div>';
    }

    container.innerHTML = h;
  }

  /* ══════════════════════════════════════════
     ▶ REPRODUCIR DESDE HISTORIAL
     ══════════════════════════════════════════ */
  async function playFromHistorial(songId) {
    if (!songId) return;
    try {
      var r = await db.from('canciones')
        .select('*, albumes(titulo, imagen_url)')
        .eq('id', songId)
        .single();

      if (r.error || !r.data) {
        K.showToast('Canción no encontrada', 'error');
        return;
      }

      var s = r.data;
      K.currentPlaylist = [{
        id: s.id,
        titulo: s.titulo,
        archivo_url: s.archivo_url,
        imagen_url: s.imagen_url || (s.albumes ? s.albumes.imagen_url : '') || '',
        duracion: s.duracion || '--:--',
        album: s.albumes ? s.albumes.titulo : ''
      }];
      K.currentAlbumCover = s.imagen_url || (s.albumes ? s.albumes.imagen_url : '') || '';
      K.playTrack(0);
    } catch (e) {
      console.error('Error playing from historial:', e);
      K.showToast('Error al reproducir', 'error');
    }
  }

  /* ══════════════════════════════════════════
     🗑 LIMPIAR HISTORIAL
     ══════════════════════════════════════════ */
  async function clearHistorial() {
    // Close confirm dialog
    var overlay = $('histConfirmOverlay');
    if (overlay) overlay.classList.remove('show');

    try {
      var r = await db.from('historial_reproducciones')
        .delete()
        .eq('usuario_id', K.currentUser.id);
      if (r.error) throw r.error;
    } catch (e) {
      console.warn('Error borrando historial DB:', e.message);
    }

    var key = 'kxon_historial_' + K.currentUser.id;
    localStorage.removeItem(key);

    allHistorial = [];
    filteredHistorial = [];
    renderList();
    renderStats();
    K.showToast('Historial borrado', 'success');
  }

  /* ══════════════════════════════════════════
     🖱️ EVENT DELEGATION
     ══════════════════════════════════════════ */
  var panel = $('panel-historial');
  if (panel) {
    panel.addEventListener('click', function (e) {
      var target = e.target;

      // Play track
      var trackEl = target.closest('.kx-hist-track[data-action="play"]');
      if (trackEl && !target.closest('[data-action="ctx"]')) {
        var songId = trackEl.getAttribute('data-song-id');
        if (songId) playFromHistorial(songId);
        return;
      }

      // Load more
      var loadMoreBtn = target.closest('[data-action="load-more"]');
      if (loadMoreBtn) {
        currentPage++;
        renderList();
        return;
      }

      // Clear button — show confirm
      var clearBtn = target.closest('#histClearBtn');
      if (clearBtn) {
        var overlay = $('histConfirmOverlay');
        if (overlay) overlay.classList.add('show');
        return;
      }

      // Confirm cancel
      var cancelBtn = target.closest('#histConfirmCancel');
      if (cancelBtn) {
        var overlay2 = $('histConfirmOverlay');
        if (overlay2) overlay2.classList.remove('show');
        return;
      }

      // Confirm accept
      var acceptBtn = target.closest('#histConfirmAccept');
      if (acceptBtn) {
        clearHistorial();
        return;
      }

      // Filter buttons
      var filterBtn = target.closest('.kx-hist-filter');
      if (filterBtn) {
        currentFilter = filterBtn.getAttribute('data-filter');

        var allFilters = panel.querySelectorAll('.kx-hist-filter');
        for (var i = 0; i < allFilters.length; i++) {
          allFilters[i].classList.toggle('active', allFilters[i] === filterBtn);
          allFilters[i].setAttribute('aria-selected', allFilters[i] === filterBtn ? 'true' : 'false');
        }

        applyFilters();
        return;
      }

      // Search clear
      var searchClear = target.closest('#histSearchClear');
      if (searchClear) {
        var si = $('histSearchInput');
        if (si) { si.value = ''; si.focus(); }
        searchClear.style.display = 'none';
        searchTerm = '';
        applyFilters();
        return;
      }

      // Confirm overlay backdrop
      if (target.id === 'histConfirmOverlay') {
        target.classList.remove('show');
        return;
      }
    });

    // Keyboard on tracks
    panel.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var trackEl = e.target.closest('.kx-hist-track[data-action="play"]');
        if (trackEl) {
          var songId = trackEl.getAttribute('data-song-id');
          if (songId) playFromHistorial(songId);
        }
      }
    });

    // Search input
    var searchInput = $('histSearchInput');
    if (searchInput) {
      var searchTimeout;
      searchInput.addEventListener('input', function () {
        var val = this.value.trim();
        var clearBtn = $('histSearchClear');
        if (clearBtn) clearBtn.style.display = val ? 'flex' : 'none';

        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(function () {
          searchTerm = val;
          applyFilters();
        }, 250);
      });
    }
  }

  // Keep backward compat — remove old global
  window._playFromHistorial = function (songId) { playFromHistorial(songId); };
  window._clearHistorial = function () {
    var overlay = $('histConfirmOverlay');
    if (overlay) overlay.classList.add('show');
  };

})();