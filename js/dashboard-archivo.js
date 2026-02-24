/* ═══════════════════════════════════════════════════
   📁 KXON ARCHIVO — REBUILD 2026
   Event delegation · escapeHtml · skeleton loaders
   Search · Sort · Filter · Grid/List views
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

  function $(id) { return document.getElementById(id); }

  function fmtDate(d) {
    if (!d) return '';
    var dt = new Date(d);
    var m = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return dt.getDate() + ' ' + m[dt.getMonth()] + ' ' + dt.getFullYear();
  }

  function fmtDateFull(d) {
    if (!d) return '';
    var dt = new Date(d);
    return dt.toLocaleDateString('es-ES', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  /* ── State ── */
  var st = {
    filter: 'todos',
    sort: 'recent',
    view: 'grid',
    search: '',
    observer: null
  };

  /* ── Observer ── */
  function setupObserver() {
    if (st.observer) st.observer.disconnect();
    if (!('IntersectionObserver' in window)) return;
    st.observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('kx-arc-observed');
          st.observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '40px' });
  }

  function observeCards() {
    var cards = document.querySelectorAll('.kx-arc-card:not(.kx-arc-observed)');
    if (cards.length && st.observer) {
      for (var i = 0; i < cards.length; i++) st.observer.observe(cards[i]);
    }
  }

  /* ── Skeleton ── */
  function showSkeleton() {
    var c = $('archivoGrid');
    if (!c) return;
    var h = '';
    for (var i = 0; i < 4; i++) {
      h += '<div class="kx-arc-skeleton" aria-hidden="true">';
      h += '<div class="kx-arc-skeleton-header">';
      h += '<div class="kx-arc-skeleton-cover"></div>';
      h += '<div class="kx-arc-skeleton-info">';
      h += '<div class="kx-arc-skeleton-line"></div>';
      h += '<div class="kx-arc-skeleton-line kx-arc-skeleton-line--short"></div>';
      h += '<div class="kx-arc-skeleton-line kx-arc-skeleton-line--xs"></div>';
      h += '</div></div>';
      h += '<div class="kx-arc-skeleton-audios">';
      h += '<div class="kx-arc-skeleton-audio"></div>';
      h += '</div></div>';
    }
    c.innerHTML = h;
  }

  /* ── Filter / Sort / Search ── */
  function getProcessed() {
    var data = K.archivoData || [];
    var filtered = [];

    for (var i = 0; i < data.length; i++) {
      var compra = data[i];
      if (!compra.beats) continue;
      var tipo = compra.beats.tipo || 'beat';

      // Filter by tab
      if (st.filter !== 'todos' && tipo !== st.filter) continue;

      // Filter by search
      if (st.search) {
        var q = st.search.toLowerCase();
        var title = (compra.beats.titulo || '').toLowerCase();
        var desc = (compra.beats.descripcion || '').toLowerCase();
        if (title.indexOf(q) === -1 && desc.indexOf(q) === -1) continue;
      }

      filtered.push(compra);
    }

    // Sort
    var sorted = filtered.slice();
    switch (st.sort) {
      case 'oldest':
        sorted.sort(function (a, b) { return new Date(a.created_at) - new Date(b.created_at); });
        break;
      case 'name-az':
        sorted.sort(function (a, b) { return (a.beats.titulo || '').localeCompare(b.beats.titulo || ''); });
        break;
      case 'name-za':
        sorted.sort(function (a, b) { return (b.beats.titulo || '').localeCompare(a.beats.titulo || ''); });
        break;
      case 'price-high':
        sorted.sort(function (a, b) { return Number(b.precio_pagado || 0) - Number(a.precio_pagado || 0); });
        break;
      default: // recent
        sorted.sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });
    }

    return sorted;
  }

  function updateActiveFilters() {
    var el = $('arcActiveFilters');
    var textEl = $('arcActiveFilterText');
    if (!el || !textEl) return;

    var parts = [];
    if (st.filter !== 'todos') {
      parts.push(st.filter === 'beat' ? 'Beats' : 'Canciones');
    }
    if (st.search) parts.push('"' + st.search + '"');

    if (parts.length) {
      textEl.textContent = 'Filtros: ' + parts.join(' · ');
      el.style.display = 'flex';
    } else {
      el.style.display = 'none';
    }
  }

  function updateResultsInfo(count) {
    var el = $('arcResultsInfo');
    var textEl = $('arcResultsText');
    if (!el || !textEl) return;

    if (st.search || st.filter !== 'todos') {
      textEl.textContent = count + ' resultado' + (count !== 1 ? 's' : '') + ' encontrado' + (count !== 1 ? 's' : '');
      el.style.display = 'block';
    } else {
      el.style.display = 'none';
    }
  }

  /* ── SVG Icons ── */
  var SVG = {
    play: '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
    pause: '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>',
    download: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>',
    folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>',
    price: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    calendar: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>'
  };

  /* ══════════════════════════════════════════
     📦 RENDER GRID
     ══════════════════════════════════════════ */
  function renderGrid(items) {
    var c = $('archivoGrid');
    if (!c) return;

    if (!items || !items.length) {
      var tabLabel = st.filter === 'todos' ? 'compras' : st.filter === 'beat' ? 'beats' : 'canciones';
      c.innerHTML = '<div class="kx-arc-empty">' +
        '<div class="kx-arc-empty-icon">' + SVG.folder + '</div>' +
        '<div class="kx-arc-empty-title">Sin ' + esc(tabLabel) + ' aún</div>' +
        '<div class="kx-arc-empty-text">' + (st.search ? 'No se encontraron resultados para "' + esc(st.search) + '"' : 'Visita el Marketplace para comprar') + '</div>' +
        (st.search ? '' : '<a href="#" class="kx-arc-empty-btn" data-action="go-marketplace">' + SVG.folder + ' Ir al Marketplace</a>') +
        '</div>';
      return;
    }

    var h = '';
    for (var j = 0; j < items.length; j++) {
      var compra = items[j];
      var beat = compra.beats;
      var img = beat.imagen_url || 'https://placehold.co/200x200/111/333?text=♪';
      var tipo = beat.tipo || 'beat';
      var badgeClass = tipo === 'beat' ? 'kx-arc-card-type-badge--beat' : 'kx-arc-card-type-badge--song';
      var badgeText = tipo === 'beat' ? 'BEAT' : 'CANCIÓN';
      var fecha = fmtDate(compra.created_at);

      h += '<article class="kx-arc-card" style="--i:' + j + '" role="listitem" tabindex="0" data-compra-idx="' + j + '">';
      h += '<span class="kx-arc-card-status">✓ Comprado</span>';

      // Header
      h += '<div class="kx-arc-card-header">';
      h += '<div class="kx-arc-card-cover">';
      h += '<img src="' + esc(img) + '" alt="' + esc(beat.titulo) + '" loading="lazy" onerror="this.src=\'https://placehold.co/200x200/111/333?text=♪\'">';
      h += '<span class="kx-arc-card-type-badge ' + badgeClass + '">' + badgeText + '</span>';
      h += '</div>';
      h += '<div class="kx-arc-card-info">';
      h += '<div class="kx-arc-card-title">' + esc(beat.titulo) + '</div>';
      h += '<div class="kx-arc-card-desc">' + esc(beat.descripcion || 'Sin descripción') + '</div>';
      h += '<div class="kx-arc-card-meta">';
      h += '<span class="kx-arc-card-meta-item">' + SVG.price + ' ' + esc(K.formatPrice(compra.precio_pagado)) + '</span>';
      h += '<span class="kx-arc-card-meta-item">' + SVG.calendar + ' ' + esc(fecha) + '</span>';
      h += '</div></div></div>';

      // Audio tracks
      h += '<div class="kx-arc-card-audios">';
      if (tipo === 'beat') {
        if (beat.archivo_url) {
          h += '<div class="kx-arc-audio-item" data-audio-url="' + esc(beat.archivo_url) + '">';
          h += '<div class="kx-arc-audio-play">' + SVG.play + '</div>';
          h += '<span class="kx-arc-audio-label">' + esc(beat.titulo) + '</span>';
          h += '<span class="kx-arc-audio-tag">Beat</span>';
          h += '</div>';
        }
      } else {
        if (beat.archivo_url) {
          h += '<div class="kx-arc-audio-item" data-audio-url="' + esc(beat.archivo_url) + '">';
          h += '<div class="kx-arc-audio-play">' + SVG.play + '</div>';
          h += '<span class="kx-arc-audio-label">Canción Completa</span>';
          h += '<span class="kx-arc-audio-tag">Full</span>';
          h += '</div>';
        }
        if (beat.archivo_voz_url) {
          h += '<div class="kx-arc-audio-item" data-audio-url="' + esc(beat.archivo_voz_url) + '">';
          h += '<div class="kx-arc-audio-play">' + SVG.play + '</div>';
          h += '<span class="kx-arc-audio-label">Solo Voz</span>';
          h += '<span class="kx-arc-audio-tag">Voz</span>';
          h += '</div>';
        }
        if (beat.archivo_beat_url) {
          h += '<div class="kx-arc-audio-item" data-audio-url="' + esc(beat.archivo_beat_url) + '">';
          h += '<div class="kx-arc-audio-play">' + SVG.play + '</div>';
          h += '<span class="kx-arc-audio-label">Solo Beat</span>';
          h += '<span class="kx-arc-audio-tag">Beat</span>';
          h += '</div>';
        }
      }
      h += '</div>';

      // Actions
      h += '<div class="kx-arc-card-actions">';
      if (beat.archivo_url) {
        h += '<a href="' + esc(beat.archivo_url) + '" download class="kx-arc-btn-download" target="_blank" rel="noopener">' + SVG.download + ' Descargar</a>';
      }
      if (tipo === 'cancion') {
        if (beat.archivo_voz_url) {
          h += '<a href="' + esc(beat.archivo_voz_url) + '" download class="kx-arc-btn-stem" target="_blank" rel="noopener">🎤 Voz</a>';
        }
        if (beat.archivo_beat_url) {
          h += '<a href="' + esc(beat.archivo_beat_url) + '" download class="kx-arc-btn-stem" target="_blank" rel="noopener">🎹 Beat</a>';
        }
      }
      h += '</div>';

      h += '</article>';
    }

    c.innerHTML = h;
    setupObserver();
    setTimeout(observeCards, 50);
  }

  /* ══════════════════════════════════════════
     📋 RENDER LIST
     ══════════════════════════════════════════ */
  function renderList(items) {
    var c = $('archivoListView');
    if (!c) return;

    if (!items || !items.length) {
      c.innerHTML = '<div class="kx-arc-empty">' +
        '<div class="kx-arc-empty-icon">' + SVG.folder + '</div>' +
        '<div class="kx-arc-empty-title">Sin compras</div>' +
        '</div>';
      return;
    }

    var h = '';
    for (var i = 0; i < items.length; i++) {
      var compra = items[i];
      var beat = compra.beats;
      var img = beat.imagen_url || 'https://placehold.co/200x200/111/333?text=♪';
      var tipo = beat.tipo || 'beat';
      var typeClass = tipo === 'beat' ? 'kx-arc-list-type--beat' : 'kx-arc-list-type--song';
      var typeText = tipo === 'beat' ? 'B' : 'S';

      h += '<div class="kx-arc-list-item" role="listitem" data-compra-idx="' + i + '">';
      h += '<div class="kx-arc-list-cover">';
      h += '<img src="' + esc(img) + '" alt="' + esc(beat.titulo) + '" loading="lazy" onerror="this.src=\'https://placehold.co/200x200/111/333?text=♪\'">';
      h += '<span class="kx-arc-list-type ' + typeClass + '">' + typeText + '</span>';
      h += '</div>';
      h += '<div class="kx-arc-list-info">';
      h += '<div class="kx-arc-list-title">' + esc(beat.titulo) + '</div>';
      h += '<div class="kx-arc-list-meta">' + esc(fmtDate(compra.created_at)) + '</div>';
      h += '</div>';
      h += '<span class="kx-arc-list-price">' + esc(K.formatPrice(compra.precio_pagado)) + '</span>';

      // Play button (first available audio)
      var firstUrl = beat.archivo_url || beat.archivo_voz_url || beat.archivo_beat_url || '';
      if (firstUrl) {
        h += '<button class="kx-arc-list-play" data-audio-url="' + esc(firstUrl) + '" aria-label="Reproducir">' + SVG.play + '</button>';
      }

      if (beat.archivo_url) {
        h += '<a href="' + esc(beat.archivo_url) + '" download class="kx-arc-list-download" target="_blank" rel="noopener" aria-label="Descargar">' + SVG.download + '</a>';
      }

      h += '</div>';
    }

    c.innerHTML = h;
  }

  /* ── Refresh views ── */
  function refreshView() {
    var items = getProcessed();
    updateActiveFilters();
    updateResultsInfo(items.length);

    if (st.view === 'list') {
      renderList(items);
    } else {
      renderGrid(items);
    }
  }

  function switchView(view) {
    st.view = view;
    var grid = $('archivoGrid');
    var list = $('archivoListView');

    if (st.view === 'list') {
      if (grid) grid.style.display = 'none';
      if (list) list.style.display = 'flex';
    } else {
      if (list) list.style.display = 'none';
      if (grid) grid.style.display = 'grid';
    }

    refreshView();
  }

  /* ══════════════════════════════════════════
     📊 STATS
     ══════════════════════════════════════════ */
  function renderStats() {
    var totalBeats = 0, totalCanciones = 0, totalInvertido = 0;
    var data = K.archivoData || [];
    for (var i = 0; i < data.length; i++) {
      var compra = data[i];
      totalInvertido += Number(compra.precio_pagado || 0);
      if (compra.beats) {
        if (compra.beats.tipo === 'cancion') totalCanciones++;
        else totalBeats++;
      } else { totalBeats++; }
    }
    var eT = $('archivoStatTotal');
    var eB = $('archivoStatBeats');
    var eC = $('archivoStatCanciones');
    var eI = $('archivoStatInvertido');
    if (eT) eT.textContent = data.length;
    if (eB) eB.textContent = totalBeats;
    if (eC) eC.textContent = totalCanciones;
    if (eI) eI.textContent = K.formatPrice(totalInvertido);
  }

  /* ══════════════════════════════════════════
     ⏳ SOLICITUDES PENDIENTES
     ══════════════════════════════════════════ */
  function renderPending() {
    var section = $('archivoPendingSection');
    var c = $('archivoPendingList');
    var countEl = $('arcPendingCount');
    if (!section || !c) return;

    if (!K.archivoSolicitudes || K.archivoSolicitudes.length === 0) {
      section.style.display = 'none';
      return;
    }

    section.style.display = 'block';
    if (countEl) countEl.textContent = K.archivoSolicitudes.length + ' pendiente' + (K.archivoSolicitudes.length > 1 ? 's' : '');

    var h = '';
    for (var i = 0; i < K.archivoSolicitudes.length; i++) {
      var sol = K.archivoSolicitudes[i];
      var beatTitle = sol.beats ? sol.beats.titulo : 'Producto';
      var beatImg = sol.beats ? (sol.beats.imagen_url || 'https://placehold.co/100x100/111/333?text=♪') : 'https://placehold.co/100x100/111/333?text=♪';
      var beatPrecio = sol.beats ? K.formatPrice(sol.beats.precio) : '$0';
      var fecha = fmtDateFull(sol.created_at);

      h += '<div class="kx-arc-pend-item" role="listitem">';
      h += '<div class="kx-arc-pend-cover"><img src="' + esc(beatImg) + '" alt="' + esc(beatTitle) + '" loading="lazy" onerror="this.src=\'https://placehold.co/100x100/111/333?text=♪\'"></div>';
      h += '<div class="kx-arc-pend-info">';
      h += '<div class="kx-arc-pend-title">' + esc(beatTitle) + '</div>';
      h += '<div class="kx-arc-pend-detail">' + esc(beatPrecio) + ' — ' + esc(fecha) + '</div>';
      h += '</div>';
      h += '<span class="kx-arc-pend-status">⏳ Pendiente</span>';
      h += '</div>';
    }
    c.innerHTML = h;
  }

  /* ══════════════════════════════════════════
     🔊 REPRODUCIR AUDIO
     ══════════════════════════════════════════ */
  function playAudio(url, itemEl) {
    // If same URL is playing → pause
    if (K.archivoCurrentPlayingUrl === url && !K.archivoPreviewAudio.paused) {
      K.archivoPreviewAudio.pause();
      K.archivoCurrentPlayingUrl = '';
      clearAllPlaying();
      $('playerBar').classList.remove('show');
      K.isPlaying = false;
      return;
    }

    // Stop other sources
    K.stopAllAudio('archivo');
    K.activeSource = 'archivo';

    // Clear all playing states
    clearAllPlaying();

    // Play
    K.archivoPreviewAudio.src = url;
    K.archivoPreviewAudio.volume = 0.7;
    K.archivoPreviewAudio.play();
    K.archivoCurrentPlayingUrl = url;

    if (itemEl) {
      itemEl.classList.add('is-playing');
      var playBtn = itemEl.querySelector('.kx-arc-audio-play');
      if (playBtn) playBtn.innerHTML = SVG.pause;

      // Add EQ
      var existingEq = itemEl.querySelector('.kx-arc-audio-eq');
      if (!existingEq) {
        var eq = document.createElement('div');
        eq.className = 'kx-arc-audio-eq';
        eq.innerHTML = '<span></span><span></span><span></span><span></span>';
        itemEl.appendChild(eq);
      }
    }

    var label = itemEl ? itemEl.querySelector('.kx-arc-audio-label') : null;
    var trackName = label ? label.textContent : 'Archivo KXON';
    var bar = $('playerBar'); if (bar) bar.classList.add('show');
    var pt = $('playerTitle'); if (pt) pt.textContent = trackName;
    var pc = $('playerCover'); if (pc) pc.src = '';
    var pp = $('playerPlayPause'); if (pp) pp.textContent = '⏸';
    K.isPlaying = true;
    K.currentPlaylist = [];
    K.currentTrackIndex = -1;
  }

  function clearAllPlaying() {
    var items = document.querySelectorAll('.kx-arc-audio-item');
    for (var i = 0; i < items.length; i++) {
      items[i].classList.remove('is-playing');
      var btn = items[i].querySelector('.kx-arc-audio-play');
      if (btn) btn.innerHTML = SVG.play;
      var eq = items[i].querySelector('.kx-arc-audio-eq');
      if (eq) eq.remove();
    }
    // List view buttons
    var listBtns = document.querySelectorAll('.kx-arc-list-play');
    for (var j = 0; j < listBtns.length; j++) {
      listBtns[j].innerHTML = SVG.play;
    }
  }

  /* ── Audio events (attached once) ── */
  K.archivoPreviewAudio.addEventListener('timeupdate', function () {
    if (K.activeSource !== 'archivo') return;
    if (!K.archivoPreviewAudio.duration) return;
    var p = (K.archivoPreviewAudio.currentTime / K.archivoPreviewAudio.duration) * 100;
    var pf = $('progressFill'); if (pf) pf.style.width = p + '%';
    var pct = $('playerCurrentTime'); if (pct) pct.textContent = K.formatTime(K.archivoPreviewAudio.currentTime);
    var pd = $('playerDuration'); if (pd) pd.textContent = K.formatTime(K.archivoPreviewAudio.duration);
  });

  K.archivoPreviewAudio.addEventListener('ended', function () {
    K.archivoCurrentPlayingUrl = '';
    clearAllPlaying();
    var pp = $('playerPlayPause'); if (pp) pp.textContent = '▶';
    var pf = $('progressFill'); if (pf) pf.style.width = '0%';
    K.isPlaying = false;
  });

  /* ══════════════════════════════════════════
     🎯 EVENT DELEGATION
     ══════════════════════════════════════════ */
  document.addEventListener('click', function (e) {
    var panel = e.target.closest('#panel-archivo');
    if (!panel) return;

    /* ── FILTERS ── */
    var filterBtn = e.target.closest('.kx-arc-filter');
    if (filterBtn) {
      e.preventDefault();
      panel.querySelectorAll('.kx-arc-filter').forEach(function (b) {
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
    var sortTrigger = e.target.closest('.kx-arc-sort-trigger');
    if (sortTrigger) {
      e.preventDefault();
      e.stopPropagation();
      var drop = $('arcSortDropdown');
      if (drop) {
        var open = drop.classList.toggle('show');
        sortTrigger.setAttribute('aria-expanded', open);
      }
      return;
    }

    /* ── SORT OPTIONS ── */
    var sortOpt = e.target.closest('.kx-arc-sort-option');
    if (sortOpt) {
      e.preventDefault();
      panel.querySelectorAll('.kx-arc-sort-option').forEach(function (o) {
        o.classList.remove('active');
        o.setAttribute('aria-selected', 'false');
      });
      sortOpt.classList.add('active');
      sortOpt.setAttribute('aria-selected', 'true');
      st.sort = sortOpt.getAttribute('data-sort');

      var labels = { recent: 'Reciente', oldest: 'Antiguo', 'name-az': 'A→Z', 'name-za': 'Z→A', 'price-high': 'Mayor precio' };
      var lbl = $('arcSortLabel');
      if (lbl) lbl.textContent = labels[st.sort] || 'Reciente';

      var drop2 = $('arcSortDropdown');
      if (drop2) drop2.classList.remove('show');
      var trigger = $('arcSortBtn');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');

      refreshView();
      return;
    }

    /* ── VIEW TOGGLE ── */
    var viewBtn = e.target.closest('.kx-arc-view-btn');
    if (viewBtn) {
      e.preventDefault();
      panel.querySelectorAll('.kx-arc-view-btn').forEach(function (b) {
        b.classList.remove('active');
        b.setAttribute('aria-checked', 'false');
      });
      viewBtn.classList.add('active');
      viewBtn.setAttribute('aria-checked', 'true');
      switchView(viewBtn.getAttribute('data-view'));
      return;
    }

    /* ── CLEAR FILTERS ── */
    var clearBtn = e.target.closest('#arcClearFilters');
    if (clearBtn) {
      e.preventDefault();
      st.filter = 'todos';
      st.search = '';
      var searchInput = $('arcSearchInput');
      if (searchInput) searchInput.value = '';
      var clearSearch = $('arcSearchClear');
      if (clearSearch) clearSearch.style.display = 'none';

      panel.querySelectorAll('.kx-arc-filter').forEach(function (b) {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      var allFilter = panel.querySelector('.kx-arc-filter[data-filter="todos"]');
      if (allFilter) {
        allFilter.classList.add('active');
        allFilter.setAttribute('aria-selected', 'true');
      }

      refreshView();
      return;
    }

    /* ── GO MARKETPLACE ── */
    var goMkt = e.target.closest('[data-action="go-marketplace"]');
    if (goMkt) {
      e.preventDefault();
      K.showPanel('marketplace');
      return;
    }

    /* ── AUDIO PLAY (grid) ── */
    var audioItem = e.target.closest('.kx-arc-audio-item');
    if (audioItem) {
      e.preventDefault();
      var url = audioItem.getAttribute('data-audio-url');
      if (url) playAudio(url, audioItem);
      return;
    }

    /* ── AUDIO PLAY (list) ── */
    var listPlay = e.target.closest('.kx-arc-list-play');
    if (listPlay) {
      e.preventDefault();
      e.stopPropagation();
      var listUrl = listPlay.getAttribute('data-audio-url');
      if (listUrl) {
        // Use the same logic but with simpler state
        if (K.archivoCurrentPlayingUrl === listUrl && !K.archivoPreviewAudio.paused) {
          K.archivoPreviewAudio.pause();
          K.archivoCurrentPlayingUrl = '';
          clearAllPlaying();
          $('playerBar').classList.remove('show');
          K.isPlaying = false;
        } else {
          K.stopAllAudio('archivo');
          K.activeSource = 'archivo';
          clearAllPlaying();
          K.archivoPreviewAudio.src = listUrl;
          K.archivoPreviewAudio.volume = 0.7;
          K.archivoPreviewAudio.play();
          K.archivoCurrentPlayingUrl = listUrl;
          listPlay.innerHTML = SVG.pause;

          var bar = $('playerBar'); if (bar) bar.classList.add('show');
          var pt = $('playerTitle'); if (pt) pt.textContent = 'Archivo KXON';
          var pp = $('playerPlayPause'); if (pp) pp.textContent = '⏸';
          K.isPlaying = true;
          K.currentPlaylist = [];
          K.currentTrackIndex = -1;
        }
      }
      return;
    }
  });

  /* ── Close sort dropdown on outside click ── */
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.kx-arc-sort-wrap')) {
      var drop = $('arcSortDropdown');
      if (drop) drop.classList.remove('show');
      var trigger = $('arcSortBtn');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    }
  });

  /* ── Search ── */
  var searchTimer = null;
  var searchInput = $('arcSearchInput');
  var searchClear = $('arcSearchClear');

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      var val = this.value.trim();
      if (searchClear) searchClear.style.display = val ? 'flex' : 'none';
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        st.search = val;
        refreshView();
      }, 250);
    });
  }

  if (searchClear) {
    searchClear.addEventListener('click', function () {
      if (searchInput) searchInput.value = '';
      this.style.display = 'none';
      st.search = '';
      refreshView();
    });
  }

  /* ══════════════════════════════════════════
     📁 CARGAR ARCHIVO
     ══════════════════════════════════════════ */
  K.loadArchivo = async function () {
    showSkeleton();
    try {
      var r = await db.from('compras')
        .select('*, beats(id, titulo, descripcion, imagen_url, archivo_url, archivo_voz_url, archivo_beat_url, tipo, precio)')
        .eq('comprador_id', K.currentUser.id)
        .order('created_at', { ascending: false });
      if (r.error) throw r.error;
      K.archivoData = r.data || [];

      var sr = await db.from('solicitudes_compra')
        .select('*, beats(id, titulo, imagen_url, precio, tipo)')
        .eq('comprador_id', K.currentUser.id)
        .eq('estado', 'pendiente')
        .order('created_at', { ascending: false });
      K.archivoSolicitudes = sr.data || [];

      renderStats();
      refreshView();
      renderPending();
    } catch (err) {
      console.error('Error cargando archivo:', err);
      var c = $('archivoGrid');
      if (c) {
        c.innerHTML = '<div class="kx-arc-empty">' +
          '<div class="kx-arc-empty-icon">' + SVG.folder + '</div>' +
          '<div class="kx-arc-empty-title">Error al cargar tu archivo</div>' +
          '<div class="kx-arc-empty-text">Intenta recargar la página</div>' +
          '</div>';
      }
    }
  };

  /* ── Backward compatibility ── */
  window._archivoTab = function (tab) {
    K.archivoCurrentTab = tab;
    st.filter = tab;

    var panel = $('panel-archivo');
    if (panel) {
      panel.querySelectorAll('.kx-arc-filter').forEach(function (b) {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
        if (b.getAttribute('data-filter') === tab) {
          b.classList.add('active');
          b.setAttribute('aria-selected', 'true');
        }
      });
    }

    refreshView();
  };

  window._archivoPlayAudio = function (url, element) {
    playAudio(url, element);
  };

  /* ── Init observer ── */
  setupObserver();

})();