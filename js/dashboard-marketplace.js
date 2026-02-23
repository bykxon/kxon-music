/* ═══════════════════════════════════════════════════
   🛒 KXON MARKETPLACE — PREMIUM REDESIGN 2026
   Namespace: kx-mkt-*
   Arquitectura: IIFE, event delegation, escapeHtml
   VERSIÓN CORREGIDA
   ═══════════════════════════════════════════════════ */
(function () {

  var db = window.db;
  var K = window.KXON;

  /* ── Ensure default tab ── */
  if (!K.currentMarketTab) K.currentMarketTab = 'beat';

  /* ══════════════════════════════════════════
     🛡️ HELPERS
     ══════════════════════════════════════════ */
  function esc(s) {
    if (!s) return '';
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(s));
    return d.innerHTML;
  }

  function $(id) { return document.getElementById(id); }

  var PLACEHOLDER_IMG = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">' +
    '<rect fill="#111" width="400" height="400"/>' +
    '<text fill="#333" font-family="sans-serif" font-size="48" x="50%" y="50%" text-anchor="middle" dy=".35em">♪</text></svg>'
  );

  var currentSort = 'recent';
  var currentSearch = '';
  var currentView = 'grid';
  var allSolicitudesData = [];

  /* ══════════════════════════════════════════
     📊 KPIs
     ══════════════════════════════════════════ */
  function updateKPIs() {
    var data = K.allMarketData || [];
    var beats = 0, songs = 0;
    for (var i = 0; i < data.length; i++) {
      if (data[i].tipo === 'beat') beats++; else songs++;
    }
    var el1 = $('mktKpiTotal'); if (el1) el1.textContent = data.length;
    var el2 = $('mktKpiBeats'); if (el2) el2.textContent = beats;
    var el3 = $('mktKpiSongs'); if (el3) el3.textContent = songs;
  }

  /* ══════════════════════════════════════════
     🛒 LOAD
     ══════════════════════════════════════════ */
  K.loadMarketplace = async function () {
    try {
      var r = await db.from('beats').select('*').eq('activo', true).eq('vendido', false)
        .order('created_at', { ascending: false });
      if (r.error) throw r.error;

      var solR = await db.from('solicitudes_compra').select('beat_id').eq('estado', 'pendiente');
      var pendingIds = {};
      if (solR.data) {
        for (var i = 0; i < solR.data.length; i++) pendingIds[solR.data[i].beat_id] = true;
      }

      var filtered = [];
      var allData = r.data || [];
      for (var j = 0; j < allData.length; j++) {
        if (!pendingIds[allData[j].id]) filtered.push(allData[j]);
      }

      K.allMarketData = filtered;
      updateKPIs();
      renderMarket();
      if (K.isAdmin) loadSolicitudes();
    } catch (e) {
      console.error('Error loading marketplace:', e);
      showErrorState();
    }
  };

  /* ══════════════════════════════════════════
     🎨 RENDER
     ══════════════════════════════════════════ */
  function getFilteredData() {
    var data = (K.allMarketData || []).filter(function (item) {
      return item.tipo === K.currentMarketTab;
    });

    if (currentSearch) {
      var q = currentSearch.toLowerCase();
      data = data.filter(function (item) {
        return (item.titulo && item.titulo.toLowerCase().indexOf(q) >= 0) ||
               (item.descripcion && item.descripcion.toLowerCase().indexOf(q) >= 0);
      });
    }

    data = data.slice();
    switch (currentSort) {
      case 'recent': data.sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); }); break;
      case 'price-low': data.sort(function (a, b) { return (a.precio || 0) - (b.precio || 0); }); break;
      case 'price-high': data.sort(function (a, b) { return (b.precio || 0) - (a.precio || 0); }); break;
      case 'name-az': data.sort(function (a, b) { return (a.titulo || '').localeCompare(b.titulo || ''); }); break;
    }

    return data;
  }

  function renderMarket() {
    var data = getFilteredData();
    updateActiveFilters();
    updateResultsInfo(data.length);

    var gridEl = $('marketGrid');
    var listEl = $('marketListView');

    if (currentView === 'grid') {
      if (gridEl) { gridEl.style.display = 'grid'; gridEl.innerHTML = data.length ? buildGridHTML(data) : buildEmptyState(); }
      if (listEl) listEl.style.display = 'none';
    } else {
      if (gridEl) gridEl.style.display = 'none';
      if (listEl) { listEl.style.display = 'flex'; listEl.innerHTML = data.length ? buildListHTML(data) : buildEmptyState(); }
    }
  }

  function buildGridHTML(data) {
    var h = '';
    for (var i = 0; i < data.length; i++) h += buildCardHTML(data[i], i);
    return h;
  }

  function buildListHTML(data) {
    var h = '';
    for (var i = 0; i < data.length; i++) h += buildListItemHTML(data[i], i);
    return h;
  }

  function buildCardHTML(item, idx) {
    var img = item.imagen_url || PLACEHOLDER_IMG;
    var isBeat = item.tipo === 'beat';
    var badgeClass = isBeat ? 'kx-mkt-badge--beat' : 'kx-mkt-badge--song';
    var badgeText = isBeat ? 'BEAT' : 'CANCIÓN';

    var h = '<div class="kx-mkt-card" data-mkt-id="' + esc(item.id) + '" role="listitem" style="animation-delay:' + (idx * 0.05) + 's">';
    h += '<div class="kx-mkt-card-img">';
    h += '<img src="' + esc(img) + '" alt="' + esc(item.titulo) + '" loading="lazy">';
    h += '<div class="kx-mkt-card-img-overlay"><div class="kx-mkt-card-play-hover" data-preview-id="' + esc(item.id) + '">';
    h += '<svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg></div></div>';
    h += '<span class="kx-mkt-card-badge ' + badgeClass + '">' + badgeText + '</span>';
    h += '<span class="kx-mkt-card-price">' + K.formatPrice(item.precio) + '</span>';

    if (K.isAdmin) {
      h += '<button class="kx-mkt-card-del" data-delete-mkt="' + esc(item.id) + '" style="display:flex" title="Eliminar" aria-label="Eliminar">';
      h += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>';
    }
    h += '</div>';

    h += '<div class="kx-mkt-card-body">';
    h += '<div class="kx-mkt-card-title">' + esc(item.titulo) + '</div>';
    h += '<div class="kx-mkt-card-desc">' + esc(item.descripcion || 'Sin descripción') + '</div>';
    h += '<div class="kx-mkt-card-actions">';
    h += '<button class="kx-mkt-btn-listen" data-preview-id="' + esc(item.id) + '">';
    h += '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
    h += '<span>Escuchar</span></button>';
    h += '<button class="kx-mkt-btn-buy" data-detail-id="' + esc(item.id) + '">';
    if (K.isAdmin) {
      h += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
      h += '<span>Ver</span>';
    } else {
      h += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>';
      h += '<span>Comprar</span>';
    }
    h += '</button></div></div></div>';
    return h;
  }

  function buildListItemHTML(item, idx) {
    var img = item.imagen_url || PLACEHOLDER_IMG;
    var isBeat = item.tipo === 'beat';
    var badgeClass = isBeat ? 'kx-mkt-badge--beat' : 'kx-mkt-badge--song';
    var badgeText = isBeat ? 'B' : 'C';

    var h = '<div class="kx-mkt-list-item" data-mkt-id="' + esc(item.id) + '" role="listitem" style="animation-delay:' + (idx * 0.03) + 's">';
    h += '<div class="kx-mkt-list-cover">';
    h += '<img src="' + esc(img) + '" alt="' + esc(item.titulo) + '" loading="lazy">';
    h += '<span class="kx-mkt-list-badge ' + badgeClass + '">' + badgeText + '</span></div>';
    h += '<div class="kx-mkt-list-info">';
    h += '<div class="kx-mkt-list-title">' + esc(item.titulo) + '</div>';
    h += '<div class="kx-mkt-list-desc">' + esc(item.descripcion || 'Sin descripción') + '</div></div>';
    h += '<span class="kx-mkt-list-price">' + K.formatPrice(item.precio) + '</span>';
    h += '<div class="kx-mkt-list-actions">';
    h += '<button class="kx-mkt-btn-listen" data-preview-id="' + esc(item.id) + '">';
    h += '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
    h += '<span>Escuchar</span></button>';
    h += '<button class="kx-mkt-btn-buy" data-detail-id="' + esc(item.id) + '">';
    if (K.isAdmin) {
      h += '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
      h += '<span>Ver</span>';
    } else {
      h += '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>';
      h += '<span>Comprar</span>';
    }
    h += '</button></div></div>';
    return h;
  }

  function buildEmptyState() {
    var icon = K.currentMarketTab === 'beat'
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="20" height="20" rx="2"/><path d="M7 11h10"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';
    var label = K.currentMarketTab === 'beat' ? 'beats' : 'canciones';
    var h = '<div class="kx-mkt-empty">';
    h += '<div class="kx-mkt-empty-icon">' + icon + '</div>';
    if (currentSearch) {
      h += '<div class="kx-mkt-empty-title">Sin resultados</div>';
      h += '<div class="kx-mkt-empty-text">No se encontraron ' + label + ' con "' + esc(currentSearch) + '"</div>';
    } else {
      h += '<div class="kx-mkt-empty-title">Sin ' + label + '</div>';
      h += '<div class="kx-mkt-empty-text">Próximamente se agregarán nuevos productos</div>';
    }
    h += '</div>';
    return h;
  }

  function showErrorState() {
    var c = $('marketGrid');
    if (c) {
      c.innerHTML = '<div class="kx-mkt-empty">' +
        '<div class="kx-mkt-empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg></div>' +
        '<div class="kx-mkt-empty-title">Error al cargar</div>' +
        '<div class="kx-mkt-empty-text">Intenta recargar la página</div></div>';
    }
  }

  function updateActiveFilters() {
    var el = $('mktActiveFilters');
    var text = $('mktActiveFilterText');
    if (!el || !text) return;
    var parts = [];
    if (currentSearch) parts.push('Búsqueda: "' + currentSearch + '"');
    if (currentSort !== 'recent') {
      var labels = { 'price-low': 'Precio ↑', 'price-high': 'Precio ↓', 'name-az': 'A→Z' };
      parts.push('Orden: ' + (labels[currentSort] || currentSort));
    }
    if (parts.length) { text.textContent = parts.join(' · '); el.style.display = 'flex'; }
    else { el.style.display = 'none'; }
  }

  function updateResultsInfo(count) {
    var el = $('mktResultsInfo');
    var text = $('mktResultsText');
    if (!el || !text) return;
    if (currentSearch) {
      text.textContent = count + ' resultado' + (count !== 1 ? 's' : '');
      el.style.display = 'block';
    } else { el.style.display = 'none'; }
  }

  /* ══════════════════════════════════════════
     🔊 PREVIEW
     ══════════════════════════════════════════ */
  function previewItem(id) {
    var item = null;
    for (var i = 0; i < K.allMarketData.length; i++) {
      if (K.allMarketData[i].id === id) { item = K.allMarketData[i]; break; }
    }
    if (!item || !item.archivo_url) return;

    if (!K.marketPreviewAudio.paused && K.activeSource === 'market') {
      K.marketPreviewAudio.pause(); K.marketPreviewAudio.currentTime = 0;
      var pb = $('playerBar'); if (pb) pb.classList.remove('show');
      K.isPlaying = false; K.activeSource = 'none';
      var pp = $('playerPlayPause'); if (pp) pp.textContent = '▶';
      return;
    }

    K.stopAllAudio('market');
    K.activeSource = 'market';
    K.marketPreviewAudio.src = item.archivo_url;
    K.marketPreviewAudio.volume = 0.7;
    K.marketPreviewAudio.play();

    var pb2 = $('playerBar'); if (pb2) pb2.classList.add('show');
    var pt = $('playerTitle'); if (pt) pt.textContent = item.titulo;
    var pc = $('playerCover'); if (pc) pc.src = item.imagen_url || '';
    var pp2 = $('playerPlayPause'); if (pp2) pp2.textContent = '⏸';
    K.isPlaying = true;
    K.currentPlaylist = [];
    K.currentTrackIndex = -1;
  }

  /* ══════════════════════════════════════════
     🛒 DETAIL
     ══════════════════════════════════════════ */
  function openDetail(id) {
    var item = null;
    for (var i = 0; i < K.allMarketData.length; i++) {
      if (K.allMarketData[i].id === id) { item = K.allMarketData[i]; break; }
    }
    if (!item) return;
    K.currentMarketItem = item;

    var img = item.imagen_url || PLACEHOLDER_IMG;
    var el;
    el = $('marketDetCover'); if (el) el.src = img;
    el = $('marketDetTitle'); if (el) el.textContent = item.titulo;
    el = $('marketDetDesc'); if (el) el.textContent = item.descripcion || 'Sin descripción';
    el = $('marketDetPrice'); if (el) el.textContent = K.formatPrice(item.precio);

    var badge = $('marketDetBadge');
    if (badge) {
      badge.textContent = item.tipo === 'beat' ? 'BEAT' : 'CANCIÓN';
      badge.className = 'market-detail-badge ' + (item.tipo === 'beat' ? 'market-badge-beat' : 'market-badge-cancion');
    }

    var audiosHtml = '<h4 class="market-detail-audios-title">🎧 Escuchar</h4>';
    if (item.tipo === 'beat') {
      audiosHtml += buildAudioItem(item.archivo_url, item.titulo, 'Beat');
    } else {
      if (item.archivo_url) audiosHtml += buildAudioItem(item.archivo_url, 'Canción Completa', 'Completa');
      if (item.archivo_voz_url) audiosHtml += buildAudioItem(item.archivo_voz_url, 'Solo Voz', 'Voz');
      if (item.archivo_beat_url) audiosHtml += buildAudioItem(item.archivo_beat_url, 'Solo Beat', 'Beat');
    }
    el = $('marketDetAudios'); if (el) el.innerHTML = audiosHtml;

    var actionsEl = $('marketDetActions');
    if (actionsEl) actionsEl.style.display = K.isAdmin ? 'none' : 'flex';

    var overlay = $('marketDetailOverlay');
    if (overlay) overlay.classList.add('show');
  }

  function buildAudioItem(url, label, tag) {
    return '<div class="market-audio-item" data-play-audio="' + esc(url) + '">' +
      '<button class="market-audio-play">▶</button>' +
      '<span class="market-audio-label">' + esc(label) + '</span>' +
      '<span class="market-audio-tag">' + esc(tag) + '</span></div>';
  }

  /* ══════════════════════════════════════════
     🗑️ DELETE
     ══════════════════════════════════════════ */
  async function deleteItem(id) {
    if (!K.isAdmin) return;
    if (!confirm('¿Eliminar este producto del marketplace?')) return;
    try {
      var r = await db.from('beats').delete().eq('id', id);
      if (r.error) throw r.error;
      K.showToast('Producto eliminado', 'success');
      K.loadMarketplace();
      if (typeof K.loadStats === 'function') K.loadStats();
    } catch (e) { K.showToast('Error: ' + e.message, 'error'); }
  }

  /* ══════════════════════════════════════════
     📋 SOLICITUDES
     ══════════════════════════════════════════ */
  async function loadSolicitudes() {
    if (!K.isAdmin) return;
    var section = $('solicitudesSection'); if (section) section.style.display = 'block';
    try {
      var r = await db.from('solicitudes_compra')
        .select('*, beats(id, titulo, imagen_url, archivo_url, archivo_voz_url, archivo_beat_url, tipo, precio)')
        .eq('estado', 'pendiente').order('created_at', { ascending: false });
      if (r.error) throw r.error;

      allSolicitudesData = r.data || [];
      var countEl = $('mktSolicitudesCount');
      if (countEl) countEl.textContent = allSolicitudesData.length + ' pendiente' + (allSolicitudesData.length !== 1 ? 's' : '');

      var c = $('solicitudesList'); if (!c) return;

      if (!allSolicitudesData.length) {
        c.innerHTML = '<div class="kx-mkt-empty" style="padding:40px 20px;"><div class="kx-mkt-empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg></div><div class="kx-mkt-empty-title">Sin solicitudes pendientes</div></div>';
        return;
      }

      var h = '';
      for (var i = 0; i < allSolicitudesData.length; i++) {
        var s = allSolicitudesData[i];
        var beatTitle = s.beats ? s.beats.titulo : 'Producto eliminado';
        var beatTipo = s.beats ? s.beats.tipo : 'beat';
        var tipoIcon = beatTipo === 'cancion'
          ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>'
          : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2"/><path d="M7 11h10"/></svg>';

        h += '<div class="kx-mkt-sol-row" style="animation-delay:' + (i * 0.05) + 's">';
        h += '<span class="kx-mkt-sol-num">' + (i + 1) + '</span>';
        h += '<span class="kx-mkt-sol-icon">' + tipoIcon + '</span>';
        h += '<div class="kx-mkt-sol-info"><div class="kx-mkt-sol-title">' + esc(beatTitle) + '</div>';
        h += '<div class="kx-mkt-sol-buyer">' + esc(s.comprador_nombre) + '</div></div>';
        h += '<span class="kx-mkt-sol-price">' + K.formatPrice(s.precio) + '</span>';
        h += '<div class="kx-mkt-sol-status"><span class="kx-mkt-sol-status-badge kx-mkt-sol-status-badge--pending">Pendiente</span></div>';
        h += '<button class="kx-mkt-sol-view" data-view-sol="' + i + '" title="Ver detalle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg></button>';
        h += '</div>';
      }
      c.innerHTML = h;
    } catch (e) { console.error('Error loading solicitudes:', e); }
  }

  /* ══════════════════════════════════════════
     🎯 EVENT DELEGATION
     ══════════════════════════════════════════ */
  var panel = $('panel-marketplace');
  if (panel) {
    panel.addEventListener('click', function (e) {
      var t = e.target;

      // Tabs
      var tab = t.closest('[data-mkt-tab]');
      if (tab) {
        e.preventDefault();
        K.currentMarketTab = tab.dataset.mktTab;
        var allTabs = panel.querySelectorAll('[data-mkt-tab]');
        for (var i = 0; i < allTabs.length; i++) {
          allTabs[i].classList.remove('active');
          allTabs[i].setAttribute('aria-selected', 'false');
        }
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        renderMarket();
        return;
      }

      // Preview
      var preview = t.closest('[data-preview-id]');
      if (preview) { e.preventDefault(); e.stopPropagation(); previewItem(preview.dataset.previewId); return; }

      // Detail
      var detail = t.closest('[data-detail-id]');
      if (detail) { e.preventDefault(); e.stopPropagation(); openDetail(detail.dataset.detailId); return; }

      // Delete
      var del = t.closest('[data-delete-mkt]');
      if (del) { e.preventDefault(); e.stopPropagation(); deleteItem(del.dataset.deleteMkt); return; }

      // View solicitud
      var viewSol = t.closest('[data-view-sol]');
      if (viewSol) { e.preventDefault(); e.stopPropagation(); window._openSolicitudDetail(parseInt(viewSol.dataset.viewSol)); return; }

      // Sort trigger
      if (t.closest('#mktSortBtn')) {
        e.preventDefault();
        var dd = $('mktSortDropdown'); if (dd) dd.classList.toggle('show');
        return;
      }

      // Sort option
      var sortOpt = t.closest('.kx-mkt-sort-option');
      if (sortOpt) {
        e.preventDefault();
        currentSort = sortOpt.dataset.sort;
        var allOpts = panel.querySelectorAll('.kx-mkt-sort-option');
        for (var j = 0; j < allOpts.length; j++) { allOpts[j].classList.remove('active'); allOpts[j].setAttribute('aria-selected', 'false'); }
        sortOpt.classList.add('active'); sortOpt.setAttribute('aria-selected', 'true');
        var sl = $('mktSortLabel'); if (sl) sl.textContent = sortOpt.textContent;
        var dd2 = $('mktSortDropdown'); if (dd2) dd2.classList.remove('show');
        renderMarket();
        return;
      }

      // View toggle
      var viewBtn = t.closest('.kx-mkt-view-btn');
      if (viewBtn) {
        e.preventDefault();
        currentView = viewBtn.dataset.view;
        var allV = panel.querySelectorAll('.kx-mkt-view-btn');
        for (var v = 0; v < allV.length; v++) { allV[v].classList.remove('active'); allV[v].setAttribute('aria-checked', 'false'); }
        viewBtn.classList.add('active'); viewBtn.setAttribute('aria-checked', 'true');
        renderMarket();
        return;
      }

      // Clear filters
      if (t.closest('#mktClearFilters')) {
        e.preventDefault();
        currentSearch = ''; currentSort = 'recent';
        var inp = $('mktSearchInput'); if (inp) inp.value = '';
        var clr = $('mktSearchClear'); if (clr) clr.style.display = 'none';
        var slbl = $('mktSortLabel'); if (slbl) slbl.textContent = 'Reciente';
        var sOpts = panel.querySelectorAll('.kx-mkt-sort-option');
        for (var so = 0; so < sOpts.length; so++) { sOpts[so].classList.remove('active'); if (sOpts[so].dataset.sort === 'recent') sOpts[so].classList.add('active'); }
        renderMarket();
        return;
      }

      // Play audio in detail modal (delegated globally)
      var playAudio = t.closest('[data-play-audio]');
      if (playAudio) {
        e.preventDefault(); e.stopPropagation();
        var url = playAudio.dataset.playAudio;
        if (K.marketPreviewAudio.src === url && !K.marketPreviewAudio.paused) K.marketPreviewAudio.pause();
        else { K.marketPreviewAudio.src = url; K.marketPreviewAudio.volume = 0.7; K.marketPreviewAudio.play(); }
        return;
      }
    });

    // Image error
    panel.addEventListener('error', function (e) {
      if (e.target.tagName === 'IMG') e.target.src = PLACEHOLDER_IMG;
    }, true);
  }

  // Also handle audio play in detail modal (outside panel)
  document.addEventListener('click', function (e) {
    var playAudio = e.target.closest('.market-audio-item[data-play-audio]');
    if (playAudio) {
      e.preventDefault(); e.stopPropagation();
      var url = playAudio.dataset.playAudio;
      if (K.marketPreviewAudio.src === url && !K.marketPreviewAudio.paused) K.marketPreviewAudio.pause();
      else { K.marketPreviewAudio.src = url; K.marketPreviewAudio.volume = 0.7; K.marketPreviewAudio.play(); }
    }
  });

  /* ══════════════════════════════════════════
     🔍 SEARCH
     ══════════════════════════════════════════ */
  var searchInput = $('mktSearchInput');
  var searchClear = $('mktSearchClear');
  var searchTimer = null;

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      var val = this.value.trim();
      if (searchClear) searchClear.style.display = val ? 'flex' : 'none';
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () { currentSearch = val; renderMarket(); }, 250);
    });
  }
  if (searchClear) {
    searchClear.addEventListener('click', function () {
      if (searchInput) searchInput.value = '';
      this.style.display = 'none';
      currentSearch = '';
      renderMarket();
    });
  }

  /* ══════════════════════════════════════════
     📡 AUDIO EVENTS
     ══════════════════════════════════════════ */
  K.marketPreviewAudio.addEventListener('timeupdate', function () {
    if (K.activeSource !== 'market') return;
    if (!K.marketPreviewAudio.duration) return;
    var p = (K.marketPreviewAudio.currentTime / K.marketPreviewAudio.duration) * 100;
    var pf = $('progressFill'); if (pf) pf.style.width = p + '%';
    var ct = $('playerCurrentTime'); if (ct) ct.textContent = K.formatTime(K.marketPreviewAudio.currentTime);
    var dur = $('playerDuration'); if (dur) dur.textContent = K.formatTime(K.marketPreviewAudio.duration);
  });

  K.marketPreviewAudio.addEventListener('ended', function () {
    var pp = $('playerPlayPause'); if (pp) pp.textContent = '▶';
    var pf = $('progressFill'); if (pf) pf.style.width = '0%';
    K.isPlaying = false;
  });

  /* Close sort dropdown */
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.kx-mkt-sort-wrap')) {
      var dd = $('mktSortDropdown'); if (dd) dd.classList.remove('show');
    }
  });

  /* ══════════════════════════════════════════
     💳 PURCHASE (compatible)
     ══════════════════════════════════════════ */
  window._initPurchase = function () {
    if (!K.currentMarketItem) return;
    K.marketPreviewAudio.pause();
    var ov = $('marketDetailOverlay'); if (ov) ov.classList.remove('show');
    var pu = $('purchaseUser'); if (pu) pu.textContent = K.currentUser.email;
    var pp = $('purchaseProduct'); if (pp) pp.textContent = K.currentMarketItem.titulo;
    var pprice = $('purchasePrice'); if (pprice) pprice.textContent = K.formatPrice(K.currentMarketItem.precio);
    var waMsg = 'Hola KXON, quiero comprar: ' + K.currentMarketItem.titulo + ' (' + K.formatPrice(K.currentMarketItem.precio) + ') - Mi email: ' + K.currentUser.email;
    var wa = $('btnWhatsapp'); if (wa) wa.href = 'https://wa.me/573184530020?text=' + encodeURIComponent(waMsg);
    selectedCompFile = null;
    var area = $('purchaseCompArea');
    if (area) { area.classList.remove('has-file'); var ft = area.querySelector('.file-upload-text'); if (ft) ft.textContent = 'Click para subir comprobante'; }
    var prev = $('purchaseCompPreview'); if (prev) prev.classList.remove('show');
    var cf = $('purchaseCompFile'); if (cf) cf.value = '';
    var po = $('purchaseOverlay'); if (po) po.classList.add('show');
  };

  var selectedCompFile = null;
  var compFileEl = $('purchaseCompFile');
  if (compFileEl) {
    compFileEl.addEventListener('change', function (e) {
      var f = e.target.files[0]; if (!f) return; selectedCompFile = f;
      var area = $('purchaseCompArea');
      if (area) { area.classList.add('has-file'); var ft = area.querySelector('.file-upload-text'); if (ft) ft.textContent = f.name; }
      var rd = new FileReader();
      rd.onload = function (ev) { var img = $('purchaseCompImg'); if (img) img.src = ev.target.result; var prev = $('purchaseCompPreview'); if (prev) prev.classList.add('show'); };
      rd.readAsDataURL(f);
    });
  }

  window._sendPurchase = async function () {
    if (!K.currentMarketItem) { K.showToast('Error: producto no seleccionado', 'error'); return; }
    if (!selectedCompFile) { K.showToast('Sube el comprobante de pago', 'error'); return; }
    var btn = $('btnSendPurchase'); if (btn) { btn.classList.add('loading'); btn.disabled = true; }
    try {
      var fn = Date.now() + '_comp_' + selectedCompFile.name.replace(/[^a-zA-Z0-9._-]/g, '');
      var up = await db.storage.from('imagenes').upload('comprobantes/' + fn, selectedCompFile, { contentType: selectedCompFile.type });
      if (up.error) throw up.error;
      var compUrl = db.storage.from('imagenes').getPublicUrl('comprobantes/' + fn).data.publicUrl;
      var sol = await db.from('solicitudes_compra').insert({
        beat_id: K.currentMarketItem.id, comprador_id: K.currentUser.id, comprador_email: K.currentUser.email,
        comprador_nombre: K.currentProfile.full_name || K.currentUser.email.split('@')[0],
        precio: K.currentMarketItem.precio, comprobante_url: compUrl, estado: 'pendiente'
      });
      if (sol.error) throw sol.error;
      await db.from('beats').update({ activo: false }).eq('id', K.currentMarketItem.id);
      K.showToast('¡Solicitud enviada! Espera confirmación', 'success');
      window._closePurchase(); K.loadMarketplace();
      if (typeof K.loadArchivo === 'function') K.loadArchivo();
      if (typeof K.loadStats === 'function') K.loadStats();
    } catch (e) { console.error(e); K.showToast('Error: ' + e.message, 'error'); }
    if (btn) { btn.classList.remove('loading'); btn.disabled = false; }
  };

  window._closePurchase = function () { var po = $('purchaseOverlay'); if (po) po.classList.remove('show'); K.marketPreviewAudio.pause(); };

  /* ══════════════════════════════════════════
     ✅❌ CONFIRM / REJECT
     ══════════════════════════════════════════ */
  window._openSolicitudDetail = function (idx) {
    var s = allSolicitudesData[idx]; if (!s) return;
    var beatTitle = s.beats ? s.beats.titulo : 'Producto eliminado';
    var beatImg = s.beats ? (s.beats.imagen_url || PLACEHOLDER_IMG) : PLACEHOLDER_IMG;
    var beatTipo = s.beats ? s.beats.tipo : 'beat';
    var fecha = new Date(s.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    var el;
    el = $('solDetCover'); if (el) el.src = beatImg;
    el = $('solDetTitle'); if (el) el.textContent = beatTitle;
    el = $('solDetPrice'); if (el) el.textContent = K.formatPrice(s.precio);
    var typeEl = $('solDetType');
    if (typeEl) { typeEl.textContent = beatTipo === 'cancion' ? 'CANCIÓN' : 'BEAT'; typeEl.className = 'solicitud-detail-product-type ' + (beatTipo === 'cancion' ? 'market-badge-cancion' : 'market-badge-beat'); }
    el = $('solDetBuyer'); if (el) el.textContent = s.comprador_nombre;
    el = $('solDetEmail'); if (el) el.textContent = s.comprador_email;
    el = $('solDetFecha'); if (el) el.textContent = fecha;
    el = $('solDetEstado'); if (el) el.textContent = '⏳ Pendiente';
    var compWrap = $('solDetCompWrap');
    if (compWrap) { if (s.comprobante_url) { var ci = $('solDetCompImg'); if (ci) ci.src = s.comprobante_url; compWrap.style.display = 'block'; } else { compWrap.style.display = 'none'; } }
    var bc = $('solDetBtnConfirm'); if (bc) bc.onclick = function () { window._confirmPurchase(s.id, s.beat_id, s.comprador_id, s.precio); var ov = $('solicitudDetailOverlay'); if (ov) ov.classList.remove('show'); };
    var br = $('solDetBtnReject'); if (br) br.onclick = function () { window._rejectPurchase(s.id, s.beat_id); var ov = $('solicitudDetailOverlay'); if (ov) ov.classList.remove('show'); };
    var overlay = $('solicitudDetailOverlay'); if (overlay) overlay.classList.add('show');
  };

  window._confirmPurchase = async function (solId, beatId, compradorId, precio) {
    if (!confirm('¿Confirmar esta compra?')) return;
    try {
      await db.from('solicitudes_compra').update({ estado: 'confirmada' }).eq('id', solId);
      await db.from('beats').update({ vendido: true, activo: false }).eq('id', beatId);
      await db.from('compras').insert({ beat_id: beatId, comprador_id: compradorId, precio_pagado: precio });
      if (typeof K.sendNotification === 'function') K.sendNotification(compradorId, 'compra_confirmada', '¡Compra confirmada!', 'Ya puedes descargar desde Mi Archivo.', { beat_id: beatId });
      K.showToast('¡Compra confirmada!', 'success');
      loadSolicitudes(); K.loadMarketplace();
      if (typeof K.loadArchivo === 'function') K.loadArchivo();
      if (typeof K.loadStats === 'function') K.loadStats();
    } catch (e) { K.showToast('Error: ' + e.message, 'error'); }
  };

  window._rejectPurchase = async function (solId, beatId) {
    if (!confirm('¿Rechazar esta solicitud?')) return;
    try {
      var compradorId = null;
      for (var i = 0; i < allSolicitudesData.length; i++) { if (allSolicitudesData[i].id === solId) { compradorId = allSolicitudesData[i].comprador_id; break; } }
      await db.from('solicitudes_compra').update({ estado: 'rechazada' }).eq('id', solId);
      await db.from('beats').update({ activo: true }).eq('id', beatId);
      if (compradorId && typeof K.sendNotification === 'function') K.sendNotification(compradorId, 'compra_rechazada', 'Solicitud rechazada', 'Contacta por WhatsApp si crees que es un error.', { beat_id: beatId });
      K.showToast('Solicitud rechazada', 'success');
      loadSolicitudes(); K.loadMarketplace();
    } catch (e) { K.showToast('Error: ' + e.message, 'error'); }
  };

  /* ══════════════════════════════════════════
     🛒 ADMIN: CREATE PRODUCT
     ══════════════════════════════════════════ */
  var marketImgFile = null, marketAudioMainFile = null, marketAudioVozFile = null, marketAudioBeatFile = null;

  window._setAddType = function (tipo) {
    var h = $('marketAddTipo'); if (h) h.value = tipo;
    var bt = $('addTypeBeat'); if (bt) bt.classList.toggle('active', tipo === 'beat');
    var st = $('addTypeCancion'); if (st) st.classList.toggle('active', tipo === 'cancion');
    if (tipo === 'beat') {
      var l = $('labelAudioMain'); if (l) l.textContent = 'Archivo de audio (Beat)';
      var gv = $('groupAudioVoz'); if (gv) gv.style.display = 'none';
      var gb = $('groupAudioBeat'); if (gb) gb.style.display = 'none';
      var mt = $('modalMarketTitle'); if (mt) mt.textContent = 'Nuevo Beat';
    } else {
      var l2 = $('labelAudioMain'); if (l2) l2.textContent = 'Canción Completa (voz + beat)';
      var gv2 = $('groupAudioVoz'); if (gv2) gv2.style.display = 'flex';
      var gb2 = $('groupAudioBeat'); if (gb2) gb2.style.display = 'flex';
      var mt2 = $('modalMarketTitle'); if (mt2) mt2.textContent = 'Nueva Canción';
    }
  };

  var fileConfigs = [
    ['marketImgFile', 'marketImgArea', 'marketImgPreview', 'marketImgPrev', function (f) { marketImgFile = f; }],
    ['marketAudioMainFile', 'marketAudioMainArea', null, null, function (f) { marketAudioMainFile = f; }],
    ['marketAudioVozFile', 'marketAudioVozArea', null, null, function (f) { marketAudioVozFile = f; }],
    ['marketAudioBeatFile', 'marketAudioBeatArea', null, null, function (f) { marketAudioBeatFile = f; }]
  ];
  for (var fi = 0; fi < fileConfigs.length; fi++) {
    (function (cfg) {
      var inp = $(cfg[0]); if (!inp) return;
      inp.addEventListener('change', function (e) {
        var f = e.target.files[0]; if (!f) return; cfg[4](f);
        var area = $(cfg[1]); if (area) { area.classList.add('has-file'); var ft = area.querySelector('.file-upload-text'); if (ft) ft.textContent = f.name; }
        if (cfg[2] && cfg[3]) { var rd = new FileReader(); rd.onload = function (ev) { var img = $(cfg[3]); if (img) img.src = ev.target.result; var prev = $(cfg[2]); if (prev) prev.classList.add('show'); }; rd.readAsDataURL(f); }
      });
    })(fileConfigs[fi]);
  }

  var formM = $('formMarketAdd');
  if (formM) {
    formM.addEventListener('submit', async function (e) {
      e.preventDefault();
      var titulo = ($('marketAddTitulo') || {}).value; if (titulo) titulo = titulo.trim();
      var desc = ($('marketAddDesc') || {}).value; if (desc) desc = desc.trim();
      var precio = ($('marketAddPrecio') || {}).value;
      var tipo = ($('marketAddTipo') || {}).value || 'beat';
      if (!titulo) { K.showToast('Ingresa un título', 'error'); return; }
      if (!precio || precio <= 0) { K.showToast('Precio válido requerido', 'error'); return; }
      if (!marketAudioMainFile) { K.showToast('Sube el audio principal', 'error'); return; }
      if (tipo === 'cancion' && !marketAudioVozFile) { K.showToast('Sube el archivo de voz', 'error'); return; }
      if (tipo === 'cancion' && !marketAudioBeatFile) { K.showToast('Sube el beat separado', 'error'); return; }

      var btn = $('btnMarketSubmit'); if (btn) { btn.classList.add('loading'); btn.disabled = true; }
      var prog = $('marketUploadProgress'); if (prog) prog.classList.add('show');
      var fill = $('marketUploadFill'); var text = $('marketUploadText');

      try {
        if (text) text.textContent = 'Subiendo imagen...'; if (fill) fill.style.width = '10%';
        var imageUrl = '';
        if (marketImgFile) {
          var fn = Date.now() + '_' + marketImgFile.name.replace(/[^a-zA-Z0-9._-]/g, '');
          var up = await db.storage.from('imagenes').upload('beats/' + fn, marketImgFile, { contentType: marketImgFile.type });
          if (up.error) throw up.error;
          imageUrl = db.storage.from('imagenes').getPublicUrl('beats/' + fn).data.publicUrl;
        }
        if (fill) fill.style.width = '30%'; if (text) text.textContent = 'Subiendo audio...';
        var fn2 = Date.now() + '_main_' + marketAudioMainFile.name.replace(/[^a-zA-Z0-9._-]/g, '');
        var up2 = await db.storage.from('beats').upload('market/' + fn2, marketAudioMainFile, { contentType: marketAudioMainFile.type });
        if (up2.error) throw up2.error;
        var mainUrl = db.storage.from('beats').getPublicUrl('market/' + fn2).data.publicUrl;
        if (fill) fill.style.width = '55%';
        var vozUrl = '';
        if (tipo === 'cancion' && marketAudioVozFile) {
          if (text) text.textContent = 'Subiendo voz...';
          var fn3 = Date.now() + '_voz_' + marketAudioVozFile.name.replace(/[^a-zA-Z0-9._-]/g, '');
          var up3 = await db.storage.from('beats').upload('market/' + fn3, marketAudioVozFile, { contentType: marketAudioVozFile.type });
          if (up3.error) throw up3.error;
          vozUrl = db.storage.from('beats').getPublicUrl('market/' + fn3).data.publicUrl;
        }
        if (fill) fill.style.width = '75%';
        var beatSepUrl = '';
        if (tipo === 'cancion' && marketAudioBeatFile) {
          if (text) text.textContent = 'Subiendo beat...';
          var fn4 = Date.now() + '_beat_' + marketAudioBeatFile.name.replace(/[^a-zA-Z0-9._-]/g, '');
          var up4 = await db.storage.from('beats').upload('market/' + fn4, marketAudioBeatFile, { contentType: marketAudioBeatFile.type });
          if (up4.error) throw up4.error;
          beatSepUrl = db.storage.from('beats').getPublicUrl('market/' + fn4).data.publicUrl;
        }
        if (fill) fill.style.width = '90%'; if (text) text.textContent = 'Guardando...';
        var ins = await db.from('beats').insert({
          titulo: titulo, descripcion: desc, imagen_url: imageUrl, archivo_url: mainUrl,
          archivo_voz_url: vozUrl, archivo_beat_url: beatSepUrl, precio: Number(precio),
          tipo: tipo, autor_id: K.currentUser.id, activo: true, vendido: false
        });
        if (ins.error) throw ins.error;
        if (fill) fill.style.width = '100%'; if (text) text.textContent = '¡Completado!';
        K.showToast('¡Producto publicado!', 'success');
        window._closeMarketModal(); K.loadMarketplace();
        if (typeof K.loadStats === 'function') K.loadStats();
      } catch (err) { console.error(err); K.showToast('Error: ' + err.message, 'error'); }
      if (btn) { btn.classList.remove('loading'); btn.disabled = false; }
      setTimeout(function () { if (prog) prog.classList.remove('show'); if (fill) fill.style.width = '0%'; }, 1500);
    });
  }

  window._closeMarketModal = function () {
    var modal = $('modalMarketAdd'); if (modal) modal.classList.remove('show');
    var inputs = ['marketAddTitulo', 'marketAddDesc', 'marketAddPrecio'];
    for (var i = 0; i < inputs.length; i++) { var el = $(inputs[i]); if (el) el.value = ''; }
    marketImgFile = null; marketAudioMainFile = null; marketAudioVozFile = null; marketAudioBeatFile = null;
    var areas = [
      ['marketImgArea', 'Click para subir imagen', 'marketImgPreview', 'marketImgFile'],
      ['marketAudioMainArea', 'Click para subir audio', null, 'marketAudioMainFile'],
      ['marketAudioVozArea', 'Click para subir voz', null, 'marketAudioVozFile'],
      ['marketAudioBeatArea', 'Click para subir beat', null, 'marketAudioBeatFile']
    ];
    for (var a = 0; a < areas.length; a++) {
      var area = $(areas[a][0]); if (area) { area.classList.remove('has-file'); var ft = area.querySelector('.file-upload-text'); if (ft) ft.textContent = areas[a][1]; }
      if (areas[a][2]) { var prev = $(areas[a][2]); if (prev) prev.classList.remove('show'); }
      var fInput = $(areas[a][3]); if (fInput) fInput.value = '';
    }
    var prog = $('marketUploadProgress'); if (prog) prog.classList.remove('show');
    var fill = $('marketUploadFill'); if (fill) fill.style.width = '0%';
    window._setAddType('beat');
  };

  /* Legacy support */
  window._marketTab = function (tab) {
    K.currentMarketTab = tab;
    var allTabs = document.querySelectorAll('[data-mkt-tab]');
    for (var i = 0; i < allTabs.length; i++) {
      allTabs[i].classList.remove('active');
      allTabs[i].setAttribute('aria-selected', 'false');
      if (allTabs[i].dataset.mktTab === tab) { allTabs[i].classList.add('active'); allTabs[i].setAttribute('aria-selected', 'true'); }
    }
    renderMarket();
  };
  window._deleteMarketItem = function (id) { deleteItem(id); };
  window._previewMarket = function (id) { previewItem(id); };
  window._openMarketDetail = function (id) { openDetail(id); };
  window._playMarketAudio = function (url) {
    if (K.marketPreviewAudio.src === url && !K.marketPreviewAudio.paused) K.marketPreviewAudio.pause();
    else { K.marketPreviewAudio.src = url; K.marketPreviewAudio.volume = 0.7; K.marketPreviewAudio.play(); }
  };

  console.log('✅ dashboard-marketplace.js (v3 — Premium) cargado');

})();