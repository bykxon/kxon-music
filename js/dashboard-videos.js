/* ═══════════════════════════════════════════════════
   🎬 KXON VIDEOS — REDESIGN 2026
   Arquitectura: IIFE, event delegation, escapeHtml
   ═══════════════════════════════════════════════════ */
(function () {

  var db = window.db;
  var K  = window.KXON;

  /* ── Helpers ── */
  function esc(s) {
    if (!s) return '';
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(s));
    return d.innerHTML;
  }

  function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function formatViews(n) {
    n = n || 0;
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  }

  function isRecent(dateStr) {
    if (!dateStr) return false;
    var diff = Date.now() - new Date(dateStr).getTime();
    return diff < 7 * 24 * 60 * 60 * 1000; // 7 days
  }

  /* ── State ── */
  var state = {
    activeTab: 'videos',
    viewMode: 'grid',
    sortBy: 'recent',
    searchTerm: '',
    filteredVideos: [],
    filteredDocus: []
  };

  /* ══════════════════════════════════════════
     📊 KPIs
     ══════════════════════════════════════════ */
  function updateKPIs() {
    var vids = K.allVideosData || [];
    var docs = K.allDocuData || [];
    var totalViews = 0;
    for (var i = 0; i < vids.length; i++) totalViews += (vids[i].visualizaciones || 0);

    var elTotal = document.getElementById('vidStatTotal');
    var elViews = document.getElementById('vidStatViews');
    var elDocus = document.getElementById('vidStatDocus');
    if (elTotal) elTotal.textContent = vids.length;
    if (elViews) elViews.textContent = formatViews(totalViews);
    if (elDocus) elDocus.textContent = docs.length;
  }

  /* ══════════════════════════════════════════
     🎬 LOAD VIDEOS
     ══════════════════════════════════════════ */
  K.loadVideos = async function () {
    var grid = document.getElementById('videosGrid');
    if (grid) grid.innerHTML = buildSkeletons(6);

    try {
      var r = await db.from('videos').select('*').order('created_at', { ascending: false });
      if (r.error) throw r.error;
      K.allVideosData = r.data || [];
      applyFiltersAndRender();
      updateKPIs();
      updateFeatured();
    } catch (e) {
      console.error('Error cargando videos:', e);
      if (grid) grid.innerHTML = buildError('Error al cargar videos');
    }
  };

  /* ══════════════════════════════════════════
     🎞️ LOAD DOCUMENTALES
     ══════════════════════════════════════════ */
  K.loadDocumentales = async function () {
    var grid = document.getElementById('docuGrid');
    if (grid) grid.innerHTML = buildDocuSkeletons(4);

    try {
      var r = await db.from('documentales').select('*, episodios(id)').order('created_at', { ascending: false });
      if (r.error) throw r.error;
      K.allDocuData = r.data || [];
      renderDocuGrid();
      updateKPIs();
    } catch (e) {
      console.error('Error cargando documentales:', e);
      if (grid) grid.innerHTML = buildError('Error al cargar documentales');
    }
  };

  /* ══════════════════════════════════════════
     🏗️ SKELETONS
     ══════════════════════════════════════════ */
  function buildSkeletons(n) {
    var h = '';
    for (var i = 0; i < n; i++) {
      h += '<div class="kx-vid-skeleton" aria-hidden="true">' +
        '<div class="kx-vid-skeleton-thumb"></div>' +
        '<div class="kx-vid-skeleton-body">' +
          '<div class="kx-vid-skeleton-line"></div>' +
          '<div class="kx-vid-skeleton-line kx-vid-skeleton-line--short"></div>' +
          '<div class="kx-vid-skeleton-line kx-vid-skeleton-line--xs"></div>' +
        '</div></div>';
    }
    return h;
  }

  function buildDocuSkeletons(n) {
    var h = '';
    for (var i = 0; i < n; i++) {
      h += '<div class="kx-vid-skeleton" aria-hidden="true">' +
        '<div class="kx-vid-skeleton-thumb" style="aspect-ratio:16/10"></div>' +
        '<div class="kx-vid-skeleton-body">' +
          '<div class="kx-vid-skeleton-line"></div>' +
          '<div class="kx-vid-skeleton-line kx-vid-skeleton-line--short"></div>' +
        '</div></div>';
    }
    return h;
  }

  function buildEmpty(icon, title, text) {
    return '<div class="kx-vid-empty" role="status">' +
      '<div class="kx-vid-empty-icon">' + icon + '</div>' +
      '<p class="kx-vid-empty-title">' + esc(title) + '</p>' +
      '<p class="kx-vid-empty-text">' + esc(text) + '</p></div>';
  }

  function buildError(msg) {
    return buildEmpty(
      '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>',
      msg, 'Intenta recargar la página'
    );
  }

  /* ══════════════════════════════════════════
     ⭐ FEATURED
     ══════════════════════════════════════════ */
  function updateFeatured() {
    var section = document.getElementById('vidFeatured');
    if (!section) return;
    var vids = K.allVideosData || [];
    if (!vids.length) { section.style.display = 'none'; return; }

    var v = vids[0];
    var thumb = v.thumbnail_url || 'https://placehold.co/640x360/111/333?text=🎬+KXON';

    section.style.display = '';
    section.dataset.vid = v.id;

    var bg = document.getElementById('vidFeaturedBg');
    if (bg) bg.style.backgroundImage = 'url(' + thumb + ')';

    var img = document.getElementById('vidFeaturedImg');
    if (img) { img.src = thumb; img.alt = esc(v.titulo); }

    var t = document.getElementById('vidFeaturedTitle');
    if (t) t.textContent = v.titulo || '';

    var d = document.getElementById('vidFeaturedDesc');
    if (d) d.textContent = v.descripcion || '';

    var views = document.getElementById('vidFeaturedViews');
    if (views) views.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg> ' + formatViews(v.visualizaciones || 0) + ' vistas';

    var date = document.getElementById('vidFeaturedDate');
    if (date) date.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg> ' + formatDate(v.created_at);
  }

  /* ══════════════════════════════════════════
     🔍 FILTERS & SORT
     ══════════════════════════════════════════ */
  function applyFiltersAndRender() {
    var vids = (K.allVideosData || []).slice();
    var term = state.searchTerm.toLowerCase();

    // Search
    if (term) {
      vids = vids.filter(function (v) {
        return (v.titulo || '').toLowerCase().indexOf(term) !== -1 ||
               (v.descripcion || '').toLowerCase().indexOf(term) !== -1;
      });
    }

    // Sort
    switch (state.sortBy) {
      case 'oldest':
        vids.sort(function (a, b) { return new Date(a.created_at) - new Date(b.created_at); });
        break;
      case 'name-az':
        vids.sort(function (a, b) { return (a.titulo || '').localeCompare(b.titulo || ''); });
        break;
      case 'most-viewed':
        vids.sort(function (a, b) { return (b.visualizaciones || 0) - (a.visualizaciones || 0); });
        break;
      default: // recent
        vids.sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });
    }

    state.filteredVideos = vids;

    if (state.viewMode === 'grid') {
      renderVideosGrid(vids);
      var listEl = document.getElementById('videosListView');
      if (listEl) listEl.style.display = 'none';
      var gridEl = document.getElementById('videosGrid');
      if (gridEl) gridEl.style.display = '';
    } else {
      renderVideosList(vids);
      var gridEl2 = document.getElementById('videosGrid');
      if (gridEl2) gridEl2.style.display = 'none';
      var listEl2 = document.getElementById('videosListView');
      if (listEl2) listEl2.style.display = '';
    }

    // Results info
    var info = document.getElementById('vidResultsInfo');
    var text = document.getElementById('vidResultsText');
    if (term && info && text) {
      info.style.display = '';
      text.textContent = vids.length + ' resultado' + (vids.length !== 1 ? 's' : '') + ' para "' + state.searchTerm + '"';
    } else if (info) {
      info.style.display = 'none';
    }
  }

  /* ══════════════════════════════════════════
     🎬 RENDER VIDEOS GRID
     ══════════════════════════════════════════ */
  function renderVideosGrid(vids) {
    var c = document.getElementById('videosGrid');
    if (!c) return;

    if (!vids || !vids.length) {
      c.innerHTML = buildEmpty(
        '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2"/></svg>',
        state.searchTerm ? 'Sin resultados' : 'Sin videos aún',
        state.searchTerm ? 'No se encontraron videos con ese término' : 'Los videos se mostrarán aquí cuando se publiquen'
      );
      return;
    }

    var h = '';
    for (var i = 0; i < vids.length; i++) {
      var v = vids[i];
      var thumb = v.thumbnail_url || 'https://placehold.co/640x360/111/333?text=🎬+KXON';
      var recent = isRecent(v.created_at);

      h += '<article class="kx-vid-card kx-observed" style="--i:' + i + '" data-vid="' + esc(v.id) + '" role="listitem" tabindex="0" aria-label="' + esc(v.titulo) + '">';
      h += '<div class="kx-vid-card-thumb">';
      h += '<img class="kx-vid-card-img" src="' + esc(thumb) + '" alt="" loading="lazy">';
      h += '<div class="kx-vid-card-play-zone">';
      h += '<button class="kx-vid-card-play" aria-label="Reproducir" tabindex="-1"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg></button>';
      h += '</div>';
      h += '<span class="kx-vid-card-views"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg> ' + formatViews(v.visualizaciones || 0) + '</span>';
      if (recent) h += '<span class="kx-vid-card-new">NUEVO</span>';
      if (K.isAdmin) {
        h += '<button class="kx-vid-card-delete" data-delete-vid="' + esc(v.id) + '" aria-label="Eliminar video" tabindex="-1">';
        h += '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
        h += '</button>';
      }
      h += '</div>';
      h += '<div class="kx-vid-card-body">';
      h += '<h3 class="kx-vid-card-title">' + esc(v.titulo) + '</h3>';
      if (v.descripcion) h += '<p class="kx-vid-card-desc">' + esc(v.descripcion) + '</p>';
      h += '<div class="kx-vid-card-footer">';
      h += '<span class="kx-vid-card-date">' + formatDate(v.created_at) + '</span>';
      h += '</div>';
      h += '</div></article>';
    }
    c.innerHTML = h;
  }

  /* ══════════════════════════════════════════
     🎬 RENDER VIDEOS LIST
     ══════════════════════════════════════════ */
  function renderVideosList(vids) {
    var c = document.getElementById('videosListView');
    if (!c) return;

    if (!vids || !vids.length) {
      c.innerHTML = buildEmpty(
        '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2"/></svg>',
        'Sin videos', ''
      );
      return;
    }

    var h = '';
    for (var i = 0; i < vids.length; i++) {
      var v = vids[i];
      var thumb = v.thumbnail_url || 'https://placehold.co/160x90/111/333?text=🎬';

      h += '<div class="kx-vid-list-item" data-vid="' + esc(v.id) + '" role="listitem" tabindex="0">';
      h += '<div class="kx-vid-list-thumb">';
      h += '<img src="' + esc(thumb) + '" alt="" loading="lazy">';
      h += '<div class="kx-vid-list-thumb-play"><svg width="16" height="16" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>';
      h += '</div>';
      h += '<div class="kx-vid-list-info">';
      h += '<div class="kx-vid-list-title">' + esc(v.titulo) + '</div>';
      if (v.descripcion) h += '<div class="kx-vid-list-desc">' + esc(v.descripcion) + '</div>';
      h += '</div>';
      h += '<span class="kx-vid-list-views">' + formatViews(v.visualizaciones || 0) + ' vistas</span>';
      h += '<span class="kx-vid-list-date">' + formatDate(v.created_at) + '</span>';
      if (K.isAdmin) {
        h += '<button class="kx-vid-list-delete" data-delete-vid="' + esc(v.id) + '" aria-label="Eliminar">';
        h += '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
        h += '</button>';
      }
      h += '</div>';
    }
    c.innerHTML = h;
  }

  /* ══════════════════════════════════════════
     🎞️ RENDER DOCU GRID
     ══════════════════════════════════════════ */
  function renderDocuGrid() {
    var c = document.getElementById('docuGrid');
    if (!c) return;
    var docs = K.allDocuData || [];

    if (!docs.length) {
      c.innerHTML = buildEmpty(
        '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect width="18" height="14" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>',
        'Sin documentales aún',
        'Los documentales se mostrarán aquí cuando se publiquen'
      );
      return;
    }

    var h = '';
    for (var i = 0; i < docs.length; i++) {
      var d = docs[i];
      var img = d.imagen_url || 'https://placehold.co/400x250/111/333?text=🎞️+KXON';
      var numEps = d.episodios ? d.episodios.length : 0;

      h += '<article class="kx-vid-docu-card kx-observed" style="--i:' + i + '" data-docu="' + esc(d.id) + '" role="listitem" tabindex="0" aria-label="' + esc(d.titulo) + '">';
      h += '<div class="kx-vid-docu-card-visual">';
      h += '<img class="kx-vid-docu-card-img" src="' + esc(img) + '" alt="" loading="lazy">';
      h += '<div class="kx-vid-docu-card-overlay">';
      h += '<button class="kx-vid-docu-card-play" aria-label="Ver documental" tabindex="-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg></button>';
      h += '</div>';
      h += '<span class="kx-vid-docu-eps-badge">' + numEps + ' episodio' + (numEps !== 1 ? 's' : '') + '</span>';
      if (K.isAdmin) {
        h += '<button class="kx-vid-docu-card-delete" data-delete-docu="' + esc(d.id) + '" aria-label="Eliminar documental" tabindex="-1">';
        h += '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
        h += '</button>';
      }
      h += '</div>';
      h += '<div class="kx-vid-docu-card-body">';
      h += '<h3 class="kx-vid-docu-card-title">' + esc(d.titulo) + '</h3>';
      h += '<p class="kx-vid-docu-card-desc">' + esc(d.descripcion || 'Sin descripción') + '</p>';
      h += '</div></article>';
    }
    c.innerHTML = h;
  }

  /* ══════════════════════════════════════════
     ▶ VIDEO PLAYER
     ══════════════════════════════════════════ */
  window._openVideoPlayer = function (vid) {
    var video = (K.allVideosData || []).find(function (x) { return x.id === vid; });
    if (!video && K.allEpisodiosData) {
      video = K.allEpisodiosData.find(function (x) { return x.id === vid; });
    }
    if (!video) return;

    // Pause other audio
    if (K.audioEl) K.audioEl.pause();
    if (K.marketPreviewAudio) K.marketPreviewAudio.pause();
    if (K.archivoPreviewAudio) K.archivoPreviewAudio.pause();
    if (K.radioAudio) K.radioAudio.pause();

    var titleEl = document.getElementById('videoPlayerTitle');
    if (titleEl) titleEl.textContent = video.titulo || '';

    var descEl = document.getElementById('videoPlayerDesc');
    if (descEl) descEl.textContent = video.descripcion || '';

    var viewsEl = document.getElementById('videoPlayerViews');
    if (viewsEl) viewsEl.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg> ' + formatViews(video.visualizaciones || 0) + ' vistas';

    var fecha = formatDate(video.created_at);
    var dateEl = document.getElementById('videoPlayerDate');
    if (dateEl) dateEl.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg> ' + fecha;

    var metaInline = document.getElementById('videoPlayerMetaInline');
    if (metaInline) metaInline.textContent = formatViews(video.visualizaciones || 0) + ' vistas · ' + fecha;

    var playerEl = document.getElementById('videoPlayerEl');
    playerEl.src = video.video_url;
    playerEl.load();

    document.getElementById('videoPlayerOverlay').classList.add('show');
    setTimeout(function () { playerEl.play().catch(function () { }); }, 300);

    // Increment views
    var tabla = video.documental_id ? 'episodios' : 'videos';
    db.rpc('increment_visualizaciones', { video_id: video.id, tabla: tabla }).then(function (r) {
      if (r.error) console.warn('Error updating views:', r.error.message);
    });
  };

  /* ── Close player ── */
  function closePlayer() {
    var playerEl = document.getElementById('videoPlayerEl');
    if (playerEl) { playerEl.pause(); playerEl.src = ''; }
    document.getElementById('videoPlayerOverlay').classList.remove('show');
    var wrapper = document.getElementById('videoPlayerWrapper');
    if (wrapper) wrapper.classList.remove('fullscreen-active');
  }

  /* ── Fullscreen ── */
  function toggleFullscreen() {
    var videoEl = document.getElementById('videoPlayerEl');
    var wrapper = document.getElementById('videoPlayerWrapper');

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (videoEl.requestFullscreen) {
      videoEl.requestFullscreen();
    } else if (videoEl.webkitRequestFullscreen) {
      videoEl.webkitRequestFullscreen();
    } else if (videoEl.webkitEnterFullscreen) {
      videoEl.webkitEnterFullscreen();
    } else {
      wrapper.classList.toggle('fullscreen-active');
    }
  }

  /* ── Delete video ── */
  window._deleteVideo = async function (vid) {
    if (!confirm('¿Eliminar este video permanentemente?')) return;
    try {
      var r = await db.from('videos').delete().eq('id', vid);
      if (r.error) throw r.error;
      K.showToast('Video eliminado', 'success');
      K.loadVideos();
    } catch (e) { K.showToast('Error: ' + e.message, 'error'); }
  };

  /* ══════════════════════════════════════════
     🎞️ DOCU DETAIL
     ══════════════════════════════════════════ */
  window._openDocu = async function (docId) {
    K.currentDocuId = docId;
    try {
      var r = await db.from('documentales').select('*').eq('id', docId).single();
      if (r.error) throw r.error;
      var docu = r.data;
      K.currentDocuCover = docu.imagen_url || 'https://placehold.co/400x250/111/333?text=🎞️';

      var titleEl = document.getElementById('docuDetailTitle');
      if (titleEl) titleEl.textContent = docu.titulo || '';

      var descEl = document.getElementById('docuDetailDesc');
      if (descEl) descEl.textContent = docu.descripcion || 'Sin descripción';

      var coverEl = document.getElementById('docuDetailCover');
      if (coverEl) coverEl.src = K.currentDocuCover;

      var heroBg = document.getElementById('docuHeroBg');
      if (heroBg) heroBg.style.backgroundImage = 'url(' + K.currentDocuCover + ')';

      var btnAdd = document.getElementById('btnAddEpisodioNew');
      if (btnAdd) {
        if (K.isAdmin) btnAdd.classList.add('visible');
        else btnAdd.classList.remove('visible');
      }

      await loadEpisodios(docId);

      document.getElementById('docuListSection').style.display = 'none';
      document.getElementById('docuDetailView').classList.add('show');
    } catch (e) {
      console.error(e);
      K.showToast('Error al cargar documental', 'error');
    }
  };

  /* ── Episodios ── */
  async function loadEpisodios(docId) {
    var r = await db.from('episodios').select('*').eq('documental_id', docId).order('numero', { ascending: true });
    var eps = r.data || [];
    K.allEpisodiosData = eps;

    var metaEl = document.getElementById('docuDetailMeta');
    if (metaEl) metaEl.textContent = eps.length + ' EPISODIO' + (eps.length !== 1 ? 'S' : '');

    var countEl = document.getElementById('episodeCount');
    if (countEl) countEl.textContent = eps.length + ' episodio' + (eps.length !== 1 ? 's' : '');

    var c = document.getElementById('episodioList');
    if (!c) return;

    if (!eps.length) {
      c.innerHTML = buildEmpty(
        '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect width="18" height="14" x="3" y="3" rx="2"/><path d="M3 9h18"/></svg>',
        'Sin episodios', 'Agrega el primer episodio'
      );
      return;
    }

    var h = '';
    for (var i = 0; i < eps.length; i++) {
      var ep = eps[i];
      var thumb = ep.thumbnail_url || K.currentDocuCover;

      h += '<div class="kx-vid-episode" data-ep-vid="' + esc(ep.id) + '" role="listitem" tabindex="0">';
      h += '<span class="kx-vid-episode-num">' + ep.numero + '</span>';
      h += '<div class="kx-vid-episode-thumb">';
      h += '<img src="' + esc(thumb) + '" alt="" loading="lazy">';
      h += '<div class="kx-vid-episode-thumb-play"><svg width="14" height="14" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>';
      h += '</div>';
      h += '<div class="kx-vid-episode-info">';
      h += '<div class="kx-vid-episode-title">' + esc(ep.titulo) + '</div>';
      if (ep.descripcion) h += '<div class="kx-vid-episode-desc">' + esc(ep.descripcion) + '</div>';
      h += '</div>';
      h += '<span class="kx-vid-episode-views"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg> ' + formatViews(ep.visualizaciones || 0) + '</span>';
      if (K.isAdmin) {
        h += '<button class="kx-vid-episode-delete" data-delete-ep="' + esc(ep.id) + '" aria-label="Eliminar episodio">';
        h += '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
        h += '</button>';
      }
      h += '</div>';
    }
    c.innerHTML = h;
  }

  /* ── Delete docu ── */
  window._deleteDocu = async function (docId) {
    if (!confirm('¿Eliminar este documental y todos sus episodios?')) return;
    try {
      await db.from('episodios').delete().eq('documental_id', docId);
      var r = await db.from('documentales').delete().eq('id', docId);
      if (r.error) throw r.error;
      K.showToast('Documental eliminado', 'success');
      K.loadDocumentales();
    } catch (e) { K.showToast('Error: ' + e.message, 'error'); }
  };

  /* ── Delete episodio ── */
  window._deleteEpisodio = async function (epId) {
    if (!confirm('¿Eliminar este episodio?')) return;
    try {
      var r = await db.from('episodios').delete().eq('id', epId);
      if (r.error) throw r.error;
      K.showToast('Episodio eliminado', 'success');
      await loadEpisodios(K.currentDocuId);
      K.loadDocumentales();
    } catch (e) { K.showToast('Error: ' + e.message, 'error'); }
  };

  /* ══════════════════════════════════════════
     🎯 EVENT DELEGATION
     ══════════════════════════════════════════ */
  var panel = document.getElementById('panel-videos');
  if (panel) {
    panel.addEventListener('click', function (e) {
      var t = e.target;

      // ── Tabs ──
      var tab = t.closest('.kx-vid-tab');
      if (tab) {
        e.preventDefault();
        var tabs = panel.querySelectorAll('.kx-vid-tab');
        for (var i = 0; i < tabs.length; i++) {
          tabs[i].classList.remove('active');
          tabs[i].setAttribute('aria-selected', 'false');
        }
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        state.activeTab = tab.dataset.vidTab;

        document.getElementById('vidTabVideos').style.display = state.activeTab === 'videos' ? '' : 'none';
        document.getElementById('vidTabDocumentales').style.display = state.activeTab === 'documentales' ? '' : 'none';

        // Show/hide featured
        var feat = document.getElementById('vidFeatured');
        if (feat) feat.style.display = state.activeTab === 'videos' ? '' : 'none';
        return;
      }

      // ── Sort trigger ──
      var sortTrigger = t.closest('.kx-vid-sort-trigger');
      if (sortTrigger) {
        e.preventDefault();
        var dd = document.getElementById('vidSortDropdown');
        dd.classList.toggle('show');
        sortTrigger.setAttribute('aria-expanded', dd.classList.contains('show'));
        return;
      }

      // ── Sort option ──
      var sortOpt = t.closest('.kx-vid-sort-option');
      if (sortOpt) {
        e.preventDefault();
        var opts = panel.querySelectorAll('.kx-vid-sort-option');
        for (var j = 0; j < opts.length; j++) {
          opts[j].classList.remove('active');
          opts[j].setAttribute('aria-selected', 'false');
        }
        sortOpt.classList.add('active');
        sortOpt.setAttribute('aria-selected', 'true');
        state.sortBy = sortOpt.dataset.sort;
        document.getElementById('vidSortLabel').textContent = sortOpt.textContent;
        document.getElementById('vidSortDropdown').classList.remove('show');
        document.getElementById('vidSortBtn').setAttribute('aria-expanded', 'false');
        applyFiltersAndRender();
        return;
      }

      // ── View toggle ──
      var viewBtn = t.closest('.kx-vid-view-btn');
      if (viewBtn) {
        e.preventDefault();
        var btns = panel.querySelectorAll('.kx-vid-view-btn');
        for (var k = 0; k < btns.length; k++) {
          btns[k].classList.remove('active');
          btns[k].setAttribute('aria-checked', 'false');
        }
        viewBtn.classList.add('active');
        viewBtn.setAttribute('aria-checked', 'true');
        state.viewMode = viewBtn.dataset.view;
        applyFiltersAndRender();
        return;
      }

      // ── Delete video ──
      var delVid = t.closest('[data-delete-vid]');
      if (delVid) {
        e.preventDefault();
        e.stopPropagation();
        window._deleteVideo(delVid.dataset.deleteVid);
        return;
      }

      // ── Delete docu ──
      var delDocu = t.closest('[data-delete-docu]');
      if (delDocu) {
        e.preventDefault();
        e.stopPropagation();
        window._deleteDocu(delDocu.dataset.deleteDocu);
        return;
      }

      // ── Delete episodio ──
      var delEp = t.closest('[data-delete-ep]');
      if (delEp) {
        e.preventDefault();
        e.stopPropagation();
        window._deleteEpisodio(delEp.dataset.deleteEp);
        return;
      }

      // ── Open video card ──
      var vidCard = t.closest('.kx-vid-card');
      if (vidCard && vidCard.dataset.vid) {
        e.preventDefault();
        window._openVideoPlayer(vidCard.dataset.vid);
        return;
      }

      // ── Open video list item ──
      var vidList = t.closest('.kx-vid-list-item');
      if (vidList && vidList.dataset.vid) {
        e.preventDefault();
        window._openVideoPlayer(vidList.dataset.vid);
        return;
      }

      // ── Open docu card ──
      var docuCard = t.closest('.kx-vid-docu-card');
      if (docuCard && docuCard.dataset.docu) {
        e.preventDefault();
        window._openDocu(docuCard.dataset.docu);
        return;
      }

      // ── Episode play ──
      var epItem = t.closest('.kx-vid-episode');
      if (epItem && epItem.dataset.epVid) {
        e.preventDefault();
        window._openVideoPlayer(epItem.dataset.epVid);
        return;
      }

      // ── Featured play ──
      var featPlay = t.closest('#vidFeaturedPlay');
      if (featPlay) {
        e.preventDefault();
        var featSection = document.getElementById('vidFeatured');
        if (featSection && featSection.dataset.vid) {
          window._openVideoPlayer(featSection.dataset.vid);
        }
        return;
      }

      // ── Featured click ──
      var featuredEl = t.closest('.kx-vid-featured');
      if (featuredEl && !t.closest('button')) {
        e.preventDefault();
        if (featuredEl.dataset.vid) window._openVideoPlayer(featuredEl.dataset.vid);
        return;
      }

      // ── Back from docu detail ──
      var backDocu = t.closest('#btnBackDocuNew');
      if (backDocu) {
        e.preventDefault();
        document.getElementById('docuListSection').style.display = '';
        document.getElementById('docuDetailView').classList.remove('show');
        return;
      }

      // ── Add episodio ──
      var addEp = t.closest('#btnAddEpisodioNew');
      if (addEp) {
        e.preventDefault();
        K.openModal('modalEpisodio');
        return;
      }

      // ── Play first episode ──
      var playFirst = t.closest('#docuPlayFirst');
      if (playFirst) {
        e.preventDefault();
        if (K.allEpisodiosData && K.allEpisodiosData.length) {
          window._openVideoPlayer(K.allEpisodiosData[0].id);
        }
        return;
      }

      // ── Search clear ──
      var searchClear = t.closest('#vidSearchClear');
      if (searchClear) {
        e.preventDefault();
        var input = document.getElementById('vidSearchInput');
        if (input) { input.value = ''; state.searchTerm = ''; }
        searchClear.style.display = 'none';
        applyFiltersAndRender();
        return;
      }
    });
  }

  // ── Player overlay events ──
  var overlay = document.getElementById('videoPlayerOverlay');
  if (overlay) {
    overlay.addEventListener('click', function (e) {
      var closeBtn = e.target.closest('#videoPlayerCloseBtn');
      if (closeBtn) { closePlayer(); return; }

      var fsBtn = e.target.closest('#videoFullscreenBtn');
      if (fsBtn) { toggleFullscreen(); return; }

      var backdrop = e.target.closest('.kx-vid-player-backdrop');
      if (backdrop) { closePlayer(); return; }
    });
  }

  // ── Search input ──
  var searchInput = document.getElementById('vidSearchInput');
  if (searchInput) {
    var searchTimer;
    searchInput.addEventListener('input', function () {
      clearTimeout(searchTimer);
      var val = this.value;
      var clearBtn = document.getElementById('vidSearchClear');
      if (clearBtn) clearBtn.style.display = val ? '' : 'none';

      searchTimer = setTimeout(function () {
        state.searchTerm = val.trim();
        applyFiltersAndRender();
      }, 250);
    });
  }

  // ── Close sort dropdown on outside click ──
  document.addEventListener('click', function (e) {
    var dd = document.getElementById('vidSortDropdown');
    var btn = document.getElementById('vidSortBtn');
    if (dd && dd.classList.contains('show') && !dd.contains(e.target) && !btn.contains(e.target)) {
      dd.classList.remove('show');
      btn.setAttribute('aria-expanded', 'false');
    }
  });

  // ── Keyboard: Escape to close player ──
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var overlayEl = document.getElementById('videoPlayerOverlay');
      if (overlayEl && overlayEl.classList.contains('show')) {
        closePlayer();
      }
    }
  });

  /* ══════════════════════════════════════════
     🎬 CREAR VIDEO (ADMIN) — PRESERVED
     ══════════════════════════════════════════ */
  K._videoThumbFileSelected = null;
  K._videoFileSelected = null;

  document.getElementById('videoThumbFile').addEventListener('change', function (e) {
    var f = e.target.files[0]; if (!f) return;
    K._videoThumbFileSelected = f;
    document.getElementById('videoThumbArea').classList.add('has-file');
    document.getElementById('videoThumbArea').querySelector('.file-upload-text').textContent = f.name;
    var rd = new FileReader();
    rd.onload = function (ev) {
      document.getElementById('videoThumbImg').src = ev.target.result;
      document.getElementById('videoThumbPreview').classList.add('show');
    };
    rd.readAsDataURL(f);
  });

  document.getElementById('videoFileInput').addEventListener('change', function (e) {
    var f = e.target.files[0]; if (!f) return;
    K._videoFileSelected = f;
    document.getElementById('videoFileArea').classList.add('has-file');
    document.getElementById('videoFileArea').querySelector('.file-upload-text').textContent = f.name;
  });

  document.getElementById('formVideo').addEventListener('submit', async function (e) {
    e.preventDefault();
    var titulo = document.getElementById('videoTitulo').value.trim();
    var desc = document.getElementById('videoDesc').value.trim();
    if (!titulo) { K.showToast('Ingresa un título', 'error'); return; }
    if (!K._videoFileSelected) { K.showToast('Selecciona un archivo de video', 'error'); return; }

    var btn = document.getElementById('btnVideoSubmit');
    btn.classList.add('loading'); btn.disabled = true;
    var prog = document.getElementById('videoUploadProgress');
    prog.classList.add('show');
    document.getElementById('videoUploadText').textContent = 'Subiendo thumbnail...';
    document.getElementById('videoUploadFill').style.width = '10%';

    try {
      var thumbUrl = '';
      if (K._videoThumbFileSelected) {
        var fn = Date.now() + '_vthumb_' + K._videoThumbFileSelected.name.replace(/[^a-zA-Z0-9._-]/g, '');
        var up = await db.storage.from('imagenes').upload('videos/' + fn, K._videoThumbFileSelected, { contentType: K._videoThumbFileSelected.type });
        if (up.error) throw up.error;
        thumbUrl = db.storage.from('imagenes').getPublicUrl('videos/' + fn).data.publicUrl;
      }
      document.getElementById('videoUploadFill').style.width = '25%';

      document.getElementById('videoUploadText').textContent = 'Subiendo video... (puede tardar)';
      var fn2 = Date.now() + '_vid_' + K._videoFileSelected.name.replace(/[^a-zA-Z0-9._-]/g, '');
      var up2 = await db.storage.from('videos').upload('clips/' + fn2, K._videoFileSelected, { contentType: K._videoFileSelected.type });
      if (up2.error) throw up2.error;
      var videoUrl = db.storage.from('videos').getPublicUrl('clips/' + fn2).data.publicUrl;
      document.getElementById('videoUploadFill').style.width = '85%';

      document.getElementById('videoUploadText').textContent = 'Guardando...';
      var ins = await db.from('videos').insert({
        titulo: titulo, descripcion: desc, video_url: videoUrl,
        thumbnail_url: thumbUrl, autor_id: K.currentUser.id
      });
      if (ins.error) throw ins.error;

      document.getElementById('videoUploadFill').style.width = '100%';
      document.getElementById('videoUploadText').textContent = '¡Completado!';
      K.showToast('¡Video publicado!', 'success');
      K.closeModal('modalVideo');
      K.loadVideos();
    } catch (e2) { console.error(e2); K.showToast('Error: ' + e2.message, 'error'); }
    btn.classList.remove('loading'); btn.disabled = false;
    setTimeout(function () { prog.classList.remove('show'); document.getElementById('videoUploadFill').style.width = '0%'; }, 1500);
  });

  /* ══════════════════════════════════════════
     🎞️ CREAR DOCUMENTAL (ADMIN) — PRESERVED
     ══════════════════════════════════════════ */
  K._docuCoverFileSelected = null;

  document.getElementById('docuCoverFile').addEventListener('change', function (e) {
    var f = e.target.files[0]; if (!f) return;
    K._docuCoverFileSelected = f;
    document.getElementById('docuCoverArea').classList.add('has-file');
    document.getElementById('docuCoverArea').querySelector('.file-upload-text').textContent = f.name;
    var rd = new FileReader();
    rd.onload = function (ev) {
      document.getElementById('docuCoverImg').src = ev.target.result;
      document.getElementById('docuCoverPreview').classList.add('show');
    };
    rd.readAsDataURL(f);
  });

  document.getElementById('formDocumental').addEventListener('submit', async function (e) {
    e.preventDefault();
    var titulo = document.getElementById('docuTitulo').value.trim();
    var desc = document.getElementById('docuDesc').value.trim();
    if (!titulo) { K.showToast('Ingresa un título', 'error'); return; }

    var btn = document.getElementById('btnDocuSubmit');
    btn.classList.add('loading'); btn.disabled = true;

    try {
      var imageUrl = '';
      if (K._docuCoverFileSelected) {
        var fn = Date.now() + '_docu_' + K._docuCoverFileSelected.name.replace(/[^a-zA-Z0-9._-]/g, '');
        var up = await db.storage.from('imagenes').upload('documentales/' + fn, K._docuCoverFileSelected, { contentType: K._docuCoverFileSelected.type });
        if (up.error) throw up.error;
        imageUrl = db.storage.from('imagenes').getPublicUrl('documentales/' + fn).data.publicUrl;
      }
      var ins = await db.from('documentales').insert({
        titulo: titulo, descripcion: desc, imagen_url: imageUrl, autor_id: K.currentUser.id
      });
      if (ins.error) throw ins.error;

      K.showToast('¡Documental creado!', 'success');
      K.closeModal('modalDocumental');
      K.loadDocumentales();
    } catch (e2) { console.error(e2); K.showToast('Error: ' + e2.message, 'error'); }
    btn.classList.remove('loading'); btn.disabled = false;
  });

  /* ══════════════════════════════════════════
     🎬 CREAR EPISODIO (ADMIN) — PRESERVED
     ══════════════════════════════════════════ */
  K._episodioThumbFileSelected = null;
  K._episodioVideoFileSelected = null;

  document.getElementById('episodioThumbFile').addEventListener('change', function (e) {
    var f = e.target.files[0]; if (!f) return;
    K._episodioThumbFileSelected = f;
    document.getElementById('episodioThumbArea').classList.add('has-file');
    document.getElementById('episodioThumbArea').querySelector('.file-upload-text').textContent = f.name;
    var rd = new FileReader();
    rd.onload = function (ev) {
      document.getElementById('episodioThumbImg').src = ev.target.result;
      document.getElementById('episodioThumbPreview').classList.add('show');
    };
    rd.readAsDataURL(f);
  });

  document.getElementById('episodioVideoFile').addEventListener('change', function (e) {
    var f = e.target.files[0]; if (!f) return;
    K._episodioVideoFileSelected = f;
    document.getElementById('episodioVideoArea').classList.add('has-file');
    document.getElementById('episodioVideoArea').querySelector('.file-upload-text').textContent = f.name;
  });

  document.getElementById('formEpisodio').addEventListener('submit', async function (e) {
    e.preventDefault();
    var titulo = document.getElementById('episodioTitulo').value.trim();
    var desc = document.getElementById('episodioDesc').value.trim();
    var numero = parseInt(document.getElementById('episodioNumero').value) || 1;
    if (!titulo) { K.showToast('Ingresa un título', 'error'); return; }
    if (!K._episodioVideoFileSelected) { K.showToast('Selecciona un archivo de video', 'error'); return; }
    if (!K.currentDocuId) { K.showToast('Error: documental no seleccionado', 'error'); return; }

    var btn = document.getElementById('btnEpisodioSubmit');
    btn.classList.add('loading'); btn.disabled = true;
    var prog = document.getElementById('episodioUploadProgress');
    prog.classList.add('show');
    document.getElementById('episodioUploadText').textContent = 'Subiendo thumbnail...';
    document.getElementById('episodioUploadFill').style.width = '10%';

    try {
      var thumbUrl = '';
      if (K._episodioThumbFileSelected) {
        var fn = Date.now() + '_epthumb_' + K._episodioThumbFileSelected.name.replace(/[^a-zA-Z0-9._-]/g, '');
        var up = await db.storage.from('imagenes').upload('episodios/' + fn, K._episodioThumbFileSelected, { contentType: K._episodioThumbFileSelected.type });
        if (up.error) throw up.error;
        thumbUrl = db.storage.from('imagenes').getPublicUrl('episodios/' + fn).data.publicUrl;
      }
      document.getElementById('episodioUploadFill').style.width = '25%';

      document.getElementById('episodioUploadText').textContent = 'Subiendo video... (puede tardar)';
      var fn2 = Date.now() + '_ep_' + K._episodioVideoFileSelected.name.replace(/[^a-zA-Z0-9._-]/g, '');
      var up2 = await db.storage.from('videos').upload('episodios/' + fn2, K._episodioVideoFileSelected, { contentType: K._episodioVideoFileSelected.type });
      if (up2.error) throw up2.error;
      var videoUrl = db.storage.from('videos').getPublicUrl('episodios/' + fn2).data.publicUrl;
      document.getElementById('episodioUploadFill').style.width = '85%';

      document.getElementById('episodioUploadText').textContent = 'Guardando...';
      var ins = await db.from('episodios').insert({
        titulo: titulo, descripcion: desc, video_url: videoUrl,
        thumbnail_url: thumbUrl, numero: numero,
        documental_id: K.currentDocuId, autor_id: K.currentUser.id
      });
      if (ins.error) throw ins.error;

      document.getElementById('episodioUploadFill').style.width = '100%';
      document.getElementById('episodioUploadText').textContent = '¡Completado!';
      K.showToast('¡Episodio agregado!', 'success');
      K.closeModal('modalEpisodio');
      await loadEpisodios(K.currentDocuId);
      K.loadDocumentales();
    } catch (e2) { console.error(e2); K.showToast('Error: ' + e2.message, 'error'); }
    btn.classList.remove('loading'); btn.disabled = false;
    setTimeout(function () { prog.classList.remove('show'); document.getElementById('episodioUploadFill').style.width = '0%'; }, 1500);
  });

  /* ── Botón agregar episodio (legacy support) ── */
  var legacyAddEp = document.getElementById('btnAddEpisodio');
  if (legacyAddEp) {
    legacyAddEp.addEventListener('click', function () {
      K.openModal('modalEpisodio');
    });
  }
  /* ══════════════════════════════════════════
     📌 SIDEBAR: Documentales → Videos tab
     ══════════════════════════════════════════ */
  var navItems = document.querySelectorAll('.nav-item[data-panel]');
  for (var n = 0; n < navItems.length; n++) {
    if (navItems[n].dataset.panel === 'documentales') {
      navItems[n].addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        // 1. Activar panel videos
        var panels = document.querySelectorAll('.panel');
        for (var p = 0; p < panels.length; p++) panels[p].classList.remove('active');
        document.getElementById('panel-videos').classList.add('active');

        // 2. Activar tab documentales
        var tabs = document.querySelectorAll('.kx-vid-tab');
        for (var t = 0; t < tabs.length; t++) {
          var isDocu = tabs[t].dataset.vidTab === 'documentales';
          tabs[t].classList.toggle('active', isDocu);
          tabs[t].setAttribute('aria-selected', isDocu ? 'true' : 'false');
        }

        // 3. Mostrar contenido correcto
        document.getElementById('vidTabVideos').style.display = 'none';
        document.getElementById('vidTabDocumentales').style.display = '';
        var feat = document.getElementById('vidFeatured');
        if (feat) feat.style.display = 'none';

        // 4. Actualizar sidebar active state
        var allNav = document.querySelectorAll('.nav-item');
        for (var a = 0; a < allNav.length; a++) allNav[a].classList.remove('active');
        this.classList.add('active');

        // 5. Actualizar header
        var header = document.getElementById('headerTitle');
        if (header) header.textContent = 'Videos';

        // 6. Actualizar state
        state.activeTab = 'documentales';
      });
      break;
    }
  }

})();