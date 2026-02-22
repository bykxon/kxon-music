/* ═══════════════════════════════════════════════════
   💿 KXON ÁLBUMES — REBUILD 2026
   Mantiene TODA la funcionalidad original.
   Clases CSS actualizadas al nuevo namespace kx-alb.
   Seguridad: escapeHtml en toda interpolación.
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

  function countdown(f) {
    if (!f) return '';
    var diff = new Date(f) - new Date();
    if (diff <= 0) return '';
    var days = Math.floor(diff / 864e5);
    var hrs = Math.floor((diff % 864e5) / 36e5);
    if (days > 0) return 'Faltan ' + days + 'd ' + hrs + 'h';
    return 'Faltan ' + hrs + 'h ' + Math.floor((diff % 36e5) / 6e4) + 'm';
  }

  function isNew(f) {
    if (!f) return false;
    var h = (new Date() - new Date(f)) / 36e5;
    return h >= 0 && h <= 48;
  }

  function fmtYear(d) { return d ? new Date(d).getFullYear().toString() : ''; }

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
    var m = Math.floor(s / 60);
    if (m >= 60) return Math.floor(m / 60) + 'h ' + (m % 60) + 'min';
    return m + ' min';
  }

  /* ── State ── */
  var st = {
    allAlbums: [],
    filter: 'todos',
    sort: 'recent',
    view: 'grid',
    observer: null,
    previewAudio: null,
    previewTimeout: null,
    ctxTarget: null,
    ctxType: null,
    colorCache: {}
  };

  /* ── Dynamic color ── */
  function extractColor(src, cb) {
    if (st.colorCache[src]) { cb.apply(null, st.colorCache[src]); return; }
    try {
      var c = document.createElement('canvas'), ctx = c.getContext('2d');
      c.width = 50; c.height = 50;
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () {
        ctx.drawImage(img, 0, 0, 50, 50);
        try {
          var data = ctx.getImageData(0, 0, 50, 50).data;
          var r = 0, g = 0, b = 0, cnt = 0;
          for (var i = 0; i < data.length; i += 16) {
            var br = (data[i] + data[i+1] + data[i+2]) / 3;
            if (br > 30 && br < 220) { r += data[i]; g += data[i+1]; b += data[i+2]; cnt++; }
          }
          if (cnt) { r = Math.round(r/cnt); g = Math.round(g/cnt); b = Math.round(b/cnt); }
          else { r = 192; g = 192; b = 192; }
          st.colorCache[src] = [r, g, b];
          cb(r, g, b);
        } catch (e) { cb(192, 192, 192); }
      };
      img.onerror = function () { cb(192, 192, 192); };
      img.src = src;
    } catch (e) { cb(192, 192, 192); }
  }

  function applyColor(r, g, b) {
    var el = document.getElementById('panel-albumes');
    if (!el) return;
    el.style.setProperty('--kx-dyn-r', r);
    el.style.setProperty('--kx-dyn-g', g);
    el.style.setProperty('--kx-dyn-b', b);
  }

  /* ── Skeleton ── */
  function showSkeletonGrid() {
    var c = document.getElementById('albumesGrid');
    if (!c) return;
    var sp = document.getElementById('albFeatured');
    if (sp) sp.style.display = 'none';
    var h = '';
    for (var i = 0; i < 8; i++) {
      h += '<div class="kx-alb-skeleton" style="--i:' + i + '">';
      h += '<div class="kx-alb-skeleton-img"></div>';
      h += '<div class="kx-alb-skeleton-body">';
      h += '<div class="kx-alb-skeleton-line"></div>';
      h += '<div class="kx-alb-skeleton-line kx-alb-skeleton-line--short"></div>';
      h += '</div></div>';
    }
    c.innerHTML = h;
  }

  function showSkeletonTracks() {
    var c = document.getElementById('trackList');
    if (!c) return;
    var h = '';
    for (var i = 0; i < 6; i++) {
      h += '<div class="kx-alb-skeleton-track">';
      h += '<div class="kx-alb-skeleton-track-num"></div>';
      h += '<div class="kx-alb-skeleton-track-bar"></div>';
      h += '<div class="kx-alb-skeleton-track-dur"></div>';
      h += '</div>';
    }
    c.innerHTML = h;
  }

  /* ── Observer ── */
  function setupObserver() {
    if (st.observer) st.observer.disconnect();
    st.observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('kx-observed'); st.observer.unobserve(e.target); }
      });
    }, { threshold: 0.08, rootMargin: '40px' });
  }

  function observeCards() {
    document.querySelectorAll('.kx-alb-card:not(.kx-observed)').forEach(function (c) { st.observer.observe(c); });
  }

  /* ── Waveform ── */
  function waveform(playing) {
    var bars = 18, h = '<div class="kx-alb-waveform' + (playing ? ' active' : '') + '">';
    for (var i = 0; i < bars; i++) {
      h += '<div class="kx-alb-waveform-bar" style="height:' + (20 + Math.random() * 80) + '%;animation-delay:' + (i * .04).toFixed(2) + 's"></div>';
    }
    return h + '</div>';
  }

  /* ── Filter / Sort ── */
  function filterAlbums(albums, f) {
    var now = new Date();
    switch (f) {
      case 'recientes':
        var d30 = new Date(now - 30 * 864e5);
        return albums.filter(function (a) { return new Date(a.created_at) >= d30 && isReleased(a.fecha_lanzamiento); });
      case 'proximos':
        return albums.filter(function (a) { return !isReleased(a.fecha_lanzamiento); });
      case 'az':
        return albums.slice().sort(function (a, b) { return a.titulo.localeCompare(b.titulo); });
      default: return albums;
    }
  }

  function sortAlbums(albums, s) {
    var sorted = albums.slice();
    switch (s) {
      case 'oldest': sorted.sort(function (a, b) { return new Date(a.created_at) - new Date(b.created_at); }); break;
      case 'name-az': sorted.sort(function (a, b) { return a.titulo.localeCompare(b.titulo); }); break;
      case 'name-za': sorted.sort(function (a, b) { return b.titulo.localeCompare(a.titulo); }); break;
      case 'tracks': sorted.sort(function (a, b) { return (b.canciones ? b.canciones.length : 0) - (a.canciones ? a.canciones.length : 0); }); break;
      default: sorted.sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });
    }
    return sorted;
  }

  function processed() { return sortAlbums(filterAlbums(st.allAlbums, st.filter), st.sort); }

  /* ═══ LOAD ═══ */
  K.loadAlbumes = async function () {
    showSkeletonGrid();
    try {
      var r = await db.from('albumes').select('*, canciones(id, reproducciones)').order('created_at', { ascending: false });
      if (r.error) throw r.error;
      st.allAlbums = r.data || [];

      var totA = st.allAlbums.length, totT = 0, totP = 0;
      for (var i = 0; i < st.allAlbums.length; i++) {
        var cs = st.allAlbums[i].canciones || [];
        totT += cs.length;
        for (var j = 0; j < cs.length; j++) totP += (cs[j].reproducciones || 0);
      }

      var eA = document.getElementById('albStatTotal');
      var eT = document.getElementById('albStatTracks');
      var eP = document.getElementById('albStatPlays');
      if (eA) eA.textContent = totA;
      if (eT) eT.textContent = totT;
      if (eP) eP.textContent = fmtPlays(totP);

      renderSpotlight(st.allAlbums);
      var p = processed();
      if (st.view === 'list') renderList(p);
      else renderGrid(p, 'albumesGrid');
      renderLegacy(st.allAlbums.slice(0, 5), 'inicioAlbumes');
    } catch (e) { console.error(e); }
  };

  /* ═══ SPOTLIGHT ═══ */
  function renderSpotlight(albums) {
    var el = document.getElementById('albFeatured');
    if (!el) return;
    var album = null;
    for (var i = 0; i < albums.length; i++) {
      if (isReleased(albums[i].fecha_lanzamiento) || K.isAdmin) { album = albums[i]; break; }
    }
    if (!album) { el.style.display = 'none'; return; }
    el.style.display = 'block';

    var img = album.imagen_url || 'https://placehold.co/400x400/111/333?text=♪';
    var cnt = album.canciones ? album.canciones.length : 0;
    var plays = 0;
    if (album.canciones) for (var j = 0; j < album.canciones.length; j++) plays += (album.canciones[j].reproducciones || 0);

    var eI = document.getElementById('albFeaturedImg');
    var eT = document.getElementById('albFeaturedTitle');
    var eD = document.getElementById('albFeaturedDesc');
    var eTr = document.getElementById('albFeaturedTracks');
    var eDt = document.getElementById('albFeaturedDate');
    var eP = document.getElementById('albFeaturedPlays');
    var eBg = document.getElementById('albFeaturedBg');

    if (eI) eI.src = img;
    if (eT) eT.textContent = album.titulo;
    if (eD) eD.textContent = album.descripcion || 'Álbum exclusivo de KXON';
    if (eTr) eTr.textContent = cnt + ' canciones';
    if (eDt) eDt.textContent = fmtYear(album.created_at);
    if (eP) eP.textContent = fmtPlays(plays) + ' plays';
    if (eBg) eBg.style.backgroundImage = 'url(' + img + ')';

    if (eI) {
      var tryC = function () { extractColor(img, applyColor); };
      if (eI.complete && eI.naturalWidth > 0) tryC(); else eI.onload = tryC;
    }

    var btnP = document.getElementById('albFeaturedPlay');
    if (btnP) btnP.onclick = function () {
      window._openAlbum(album.id);
      setTimeout(function () { if (K.currentPlaylist.length > 0) K.playTrack(0); }, 800);
    };

    var btnV = document.getElementById('albFeaturedView');
    if (btnV) btnV.onclick = function () { window._openAlbum(album.id); };
  }

  /* ═══ GRID ═══ */
  function renderGrid(albums, cid) {
    var c = document.getElementById(cid);
    if (!c) return;

    if (!albums || !albums.length) {
      c.innerHTML = '<div class="kx-alb-empty"><div class="kx-alb-empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg></div><div class="kx-alb-empty-title">Sin álbumes</div><div class="kx-alb-empty-text">No se encontraron álbumes con este filtro</div></div>';
      return;
    }

    var h = '';
    for (var i = 0; i < albums.length; i++) {
      var a = albums[i];
      var img = a.imagen_url || 'https://placehold.co/400x400/111/333?text=♪';
      var cnt = a.canciones ? a.canciones.length : 0;
      var rel = isReleased(a.fecha_lanzamiento);
      var locked = !rel && !K.isAdmin;

      var progress = 0;
      if (a.canciones && a.canciones.length > 0) {
        var listened = 0;
        for (var j = 0; j < a.canciones.length; j++) { if (a.canciones[j].reproducciones > 0) listened++; }
        progress = Math.round((listened / a.canciones.length) * 100);
      }

      if (locked) {
        h += '<div class="kx-alb-card kx-alb-card--locked" style="--i:' + i + '" role="listitem" onclick="window._albumLockedMsg(\'' + esc(fmtDate(a.fecha_lanzamiento)) + '\')" oncontextmenu="window._albCtx(event,\'' + a.id + '\',\'album-locked\')">';
        h += '<div class="kx-alb-card-visual">';
        h += '<img class="kx-alb-card-img" src="' + esc(img) + '" alt="' + esc(a.titulo) + '" loading="lazy" onerror="this.src=\'https://placehold.co/400x400/111/333?text=♪\'">';
        h += '<div class="kx-alb-lock-overlay">';
        h += '<div class="kx-alb-lock-icon">🔒</div>';
        h += '<div class="kx-alb-lock-date">' + esc(fmtDate(a.fecha_lanzamiento)) + '</div>';
        var cd = countdown(a.fecha_lanzamiento);
        if (cd) h += '<div class="kx-alb-lock-countdown">' + esc(cd) + '</div>';
        h += '</div></div>';
        h += '<div class="kx-alb-card-body"><div class="kx-alb-card-title">' + esc(a.titulo) + '</div><div class="kx-alb-card-sub">Próximamente</div></div></div>';
      } else {
        h += '<div class="kx-alb-card" style="--i:' + i + '" role="listitem" tabindex="0" onclick="window._openAlbum(\'' + a.id + '\')" oncontextmenu="window._albCtx(event,\'' + a.id + '\',\'album\')" data-album-id="' + a.id + '" aria-label="' + esc(a.titulo) + '">';
        h += '<div class="kx-alb-card-visual">';
        h += '<img class="kx-alb-card-img" src="' + esc(img) + '" alt="' + esc(a.titulo) + '" loading="lazy" onerror="this.src=\'https://placehold.co/400x400/111/333?text=♪\'" crossorigin="anonymous">';
        h += '<div class="kx-alb-card-overlay">';
        h += '<button class="kx-alb-card-play" onclick="event.stopPropagation();window._quickPlay(\'' + a.id + '\')" aria-label="Reproducir ' + esc(a.titulo) + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg></button>';
        h += '<span class="kx-alb-card-count">' + cnt + ' tracks</span>';
        h += '</div>';
        if (progress > 0) {
          h += '<div class="kx-alb-card-progress"><div class="kx-alb-card-progress-fill" style="width:' + progress + '%"></div></div>';
        }
        if (K.isAdmin) h += '<button class="kx-alb-card-delete" onclick="event.stopPropagation();window._deleteAlbum(\'' + a.id + '\')" aria-label="Eliminar álbum"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>';
        h += '</div>';
        h += '<div class="kx-alb-card-body"><div class="kx-alb-card-title">' + esc(a.titulo) + '</div><div class="kx-alb-card-sub">' + cnt + ' canciones</div></div></div>';
      }
    }
    c.innerHTML = h;
    setupObserver();
    setTimeout(observeCards, 50);
  }

  /* ═══ LIST ═══ */
  function renderList(albums) {
    var c = document.getElementById('albumesListAlt');
    if (!c) return;
    if (!albums || !albums.length) {
      c.innerHTML = '<div class="kx-alb-empty"><div class="kx-alb-empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg></div><div class="kx-alb-empty-title">Sin álbumes</div></div>';
      return;
    }
    var h = '';
    for (var i = 0; i < albums.length; i++) {
      var a = albums[i], img = a.imagen_url || 'https://placehold.co/400x400/111/333?text=♪';
      var cnt = a.canciones ? a.canciones.length : 0;
      var rel = isReleased(a.fecha_lanzamiento), locked = !rel && !K.isAdmin;

      var progress = 0;
      if (a.canciones && a.canciones.length > 0) {
        var listened = 0;
        for (var j = 0; j < a.canciones.length; j++) { if (a.canciones[j].reproducciones > 0) listened++; }
        progress = Math.round((listened / a.canciones.length) * 100);
      }

      if (locked) {
        h += '<div class="kx-alb-list-item" role="listitem" style="opacity:.5" onclick="window._albumLockedMsg(\'' + esc(fmtDate(a.fecha_lanzamiento)) + '\')">';
        h += '<div class="kx-alb-list-cover"><img src="' + esc(img) + '" alt="" style="filter:blur(3px) brightness(.4)" loading="lazy"></div>';
        h += '<div class="kx-alb-list-info"><div class="kx-alb-list-title">🔒 ' + esc(a.titulo) + '</div><div class="kx-alb-list-meta">' + esc(fmtDate(a.fecha_lanzamiento)) + '</div></div>';
        h += '<span class="kx-alb-list-count">Bloqueado</span>';
        h += '</div>';
      } else {
        h += '<div class="kx-alb-list-item" role="listitem" onclick="window._openAlbum(\'' + a.id + '\')" oncontextmenu="window._albCtx(event,\'' + a.id + '\',\'album\')">';
        h += '<div class="kx-alb-list-cover"><img src="' + esc(img) + '" alt="' + esc(a.titulo) + '" loading="lazy"></div>';
        h += '<div class="kx-alb-list-info"><div class="kx-alb-list-title">' + esc(a.titulo) + '</div><div class="kx-alb-list-meta">' + fmtYear(a.created_at) + ' · ' + cnt + ' canciones</div></div>';
        if (progress > 0) h += '<div class="kx-alb-list-progress"><div class="kx-alb-list-progress-fill" style="width:' + progress + '%"></div></div>';
        h += '<span class="kx-alb-list-count">' + cnt + '</span>';
        h += '<button class="kx-alb-list-play" onclick="event.stopPropagation();window._quickPlay(\'' + a.id + '\')" aria-label="Reproducir"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg></button>';
        if (K.isAdmin) h += '<button class="kx-alb-card-delete" style="position:static;opacity:1;transform:none;width:24px;height:24px;border-radius:6px" onclick="event.stopPropagation();window._deleteAlbum(\'' + a.id + '\')" aria-label="Eliminar"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>';
        h += '</div>';
      }
    }
    c.innerHTML = h;
  }

  /* ── Legacy (Inicio) ── */
  function renderLegacy(albums, cid) {
    var c = document.getElementById(cid);
    if (!c) return;
    if (!albums || !albums.length) {
      c.innerHTML = '<div class="empty-state"><div class="empty-icon">💿</div><div class="empty-title">Sin álbumes</div></div>';
      return;
    }
    var h = '';
    for (var i = 0; i < albums.length; i++) {
      var a = albums[i], img = a.imagen_url || 'https://placehold.co/400x400/111/333?text=♪';
      var cnt = a.canciones ? a.canciones.length : 0;
      var rel = isReleased(a.fecha_lanzamiento), locked = !rel && !K.isAdmin;
      if (locked) {
        h += '<div class="card album-locked" onclick="window._albumLockedMsg(\'' + esc(fmtDate(a.fecha_lanzamiento)) + '\')"><div class="card-img square"><img src="' + esc(img) + '" alt=""><div class="album-lock-badge"><div class="album-lock-icon">🔒</div><div class="album-lock-date">' + esc(fmtDate(a.fecha_lanzamiento)) + '</div>';
        var cd = countdown(a.fecha_lanzamiento); if (cd) h += '<div class="album-lock-countdown">' + esc(cd) + '</div>';
        h += '</div></div><div class="card-body"><div class="card-title">' + esc(a.titulo) + '</div><div class="card-subtitle">🔒 Próximamente</div></div></div>';
      } else {
        h += '<div class="card" onclick="window._openAlbum(\'' + a.id + '\')"><div class="card-img square"><img src="' + esc(img) + '" alt=""><div class="card-overlay"><div class="card-overlay-icon">▶</div></div>';
        if (K.isAdmin) h += '<button class="card-admin-delete visible" onclick="event.stopPropagation();window._deleteAlbum(\'' + a.id + '\')">✕</button>';
        h += '</div><div class="card-body"><div class="card-title">' + esc(a.titulo) + '</div><div class="card-subtitle">♪ ' + cnt + ' canciones</div></div></div>';
      }
    }
    c.innerHTML = h;
  }

  window._albumLockedMsg = function (d) { K.showToast('🔒 Este álbum se desbloquea el ' + d, 'error'); };

  /* ── Quick play ── */
  window._quickPlay = async function (aid) {
    try {
      var sr = await db.from('canciones').select('*').eq('album_id', aid).order('created_at', { ascending: true });
      var songs = sr.data || [], play = [];
      for (var i = 0; i < songs.length; i++) { if (isReleased(songs[i].fecha_lanzamiento) || K.isAdmin) play.push(songs[i]); }
      if (!play.length) { K.showToast('No hay canciones disponibles', 'error'); return; }
      var ar = await db.from('albumes').select('imagen_url').eq('id', aid).single();
      K.currentAlbumCover = ar.data ? ar.data.imagen_url : '';
      K.currentPlaylist = play;
      K.playTrack(0);
    } catch (e) { console.error(e); K.showToast('Error al reproducir', 'error'); }
  };

  /* ═══ TRANSITIONS ═══ */
  function transitionToDetail() {
    var lv = document.getElementById('albumesListView');
    var dv = document.getElementById('albumDetailView');
    if (!lv || !dv) return;
    lv.style.transition = 'opacity .2s ease, transform .2s ease';
    lv.style.opacity = '0';
    lv.style.transform = 'translateY(-8px)';
    setTimeout(function () {
      lv.style.display = 'none';
      lv.style.opacity = ''; lv.style.transform = ''; lv.style.transition = '';
      dv.classList.add('show');
    }, 220);
  }

  function transitionToGrid() {
    var lv = document.getElementById('albumesListView');
    var dv = document.getElementById('albumDetailView');
    if (!lv || !dv) return;
    dv.style.transition = 'opacity .2s ease';
    dv.style.opacity = '0';
    setTimeout(function () {
      dv.classList.remove('show');
      dv.style.opacity = ''; dv.style.transition = '';
      lv.style.display = 'block';
      lv.style.animation = 'kxFadeIn .35s ease both';
      setTimeout(function () { lv.style.animation = ''; }, 400);
    }, 220);
  }

  document.body.addEventListener('click', function (e) {
    if (e.target.closest('#btnBackAlbums')) { e.preventDefault(); e.stopPropagation(); transitionToGrid(); }
  }, true);

  /* ═══ DETAIL ═══ */
  window._openAlbum = async function (aid) {
    K.currentAlbumId = aid;
    showSkeletonTracks();
    try {
      var r = await db.from('albumes').select('*').eq('id', aid).single();
      if (r.error) throw r.error;
      var a = r.data;
      K.currentAlbumCover = a.imagen_url || 'https://placehold.co/400x400/111/333?text=♪';

      var eT = document.getElementById('albumDetailTitle');
      var eD = document.getElementById('albumDetailDesc');
      var eC = document.getElementById('albumDetailCover');
      var eY = document.getElementById('albumDetailYear');
      var eBg = document.getElementById('albDetailHeroBg');

      if (eT) eT.textContent = a.titulo;
      if (eD) eD.textContent = a.descripcion || 'Sin descripción';
      if (eC) eC.src = K.currentAlbumCover;
      if (eY) eY.textContent = fmtYear(a.created_at);
      if (eBg) eBg.style.backgroundImage = 'url(' + K.currentAlbumCover + ')';

      if (eC) {
        var tryC = function () { extractColor(K.currentAlbumCover, applyColor); };
        if (eC.complete && eC.naturalWidth > 0) tryC(); else eC.onload = tryC;
      }

      /* Release info */
      var old = document.getElementById('albumReleaseInfo');
      if (old) old.remove();
      if (a.fecha_lanzamiento) {
        var rel = isReleased(a.fecha_lanzamiento);
        var div = document.createElement('div');
        div.id = 'albumReleaseInfo';
        div.className = 'album-release-info' + (rel ? ' released' : '');
        if (rel) div.innerHTML = '✅ Lanzado el ' + esc(fmtDate(a.fecha_lanzamiento));
        else {
          div.innerHTML = '📅 Lanzamiento: ' + esc(fmtDate(a.fecha_lanzamiento));
          var cd = countdown(a.fecha_lanzamiento);
          if (cd) div.innerHTML += ' — ' + esc(cd);
        }
        var wrap = document.getElementById('albumReleaseInfoWrap');
        if (wrap) { wrap.innerHTML = ''; wrap.appendChild(div); }
      } else {
        var wrap2 = document.getElementById('albumReleaseInfoWrap');
        if (wrap2) wrap2.innerHTML = '';
      }

      var btnAdd = document.getElementById('btnAddTrack');
      if (btnAdd) { if (K.isAdmin) btnAdd.classList.add('visible'); else btnAdd.classList.remove('visible'); }

      await loadTracks(aid);
      transitionToDetail();
    } catch (e) { console.error(e); K.showToast('Error al cargar álbum', 'error'); }
  };

  /* Play All */
  var ePlayAll = document.getElementById('albPlayAll');
  if (ePlayAll) ePlayAll.addEventListener('click', function () {
    if (K.currentPlaylist.length > 0) K.playTrack(0);
    else K.showToast('No hay canciones', 'error');
  });

  /* Shuffle */
  var eShuffle = document.getElementById('albShuffle');
  if (eShuffle) eShuffle.addEventListener('click', function () {
    if (!K.currentPlaylist.length) { K.showToast('No hay canciones', 'error'); return; }
    var s = K.currentPlaylist.slice();
    for (var i = s.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = s[i]; s[i] = s[j]; s[j] = t; }
    K.currentPlaylist = s;
    K.playTrack(0);
    K.showToast('🔀 Reproducción aleatoria', 'success');
  });

  /* Share */
  var eShare = document.getElementById('albDetailShare');
  if (eShare) eShare.addEventListener('click', function (e) {
    if (typeof window._shareFromPlayer === 'function') window._shareFromPlayer(e);
    else K.showToast('Compartir: ' + (document.getElementById('albumDetailTitle')?.textContent || ''), 'info');
  });

  /* ═══ TRACKS ═══ */
  async function loadTracks(aid) {
    var sr = await db.from('canciones').select('*').eq('album_id', aid).order('created_at', { ascending: true });
    var songs = sr.data || [], released = [], total = songs.length;

    var eMeta = document.getElementById('albumDetailMeta');
    var eSub = document.getElementById('albTracksSub');
    var eList = document.getElementById('trackList');
    var eDur = document.getElementById('albumDetailDuration');
    var ePlays = document.getElementById('albumDetailPlays');
    var eMostPop = document.getElementById('albMostPopular');

    if (eMeta) eMeta.textContent = total + ' CANCIONES';

    var totalSeconds = 0, totalPlays = 0, mostPopular = null, maxPlays = 0;
    for (var s = 0; s < songs.length; s++) {
      totalSeconds += parseDuration(songs[s].duracion);
      var p = songs[s].reproducciones || 0;
      totalPlays += p;
      if (p > maxPlays) { maxPlays = p; mostPopular = songs[s]; }
    }

    if (eDur) eDur.textContent = fmtTotalDuration(totalSeconds);
    if (ePlays) ePlays.textContent = fmtPlays(totalPlays) + ' plays';
    if (eMostPop && mostPopular && maxPlays > 0) {
      eMostPop.textContent = '👑 ' + mostPopular.titulo;
      eMostPop.classList.add('show');
    } else if (eMostPop) eMostPop.classList.remove('show');

    if (!songs.length) {
      if (eList) eList.innerHTML = '<div class="kx-alb-empty-tracks"><div class="kx-alb-empty-tracks-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></div><div class="kx-alb-empty-tracks-title">Sin canciones</div><div class="kx-alb-empty-tracks-text">Agrega canciones a este álbum</div></div>';
      K.currentPlaylist = [];
      if (eSub) eSub.textContent = 'Álbum vacío';
      return;
    }

    var h = '', pi = 0;
    for (var i = 0; i < songs.length; i++) {
      var song = songs[i], sRel = isReleased(song.fecha_lanzamiento), sLock = !sRel, sNew = isNew(song.fecha_lanzamiento);
      var songPlays = song.reproducciones || 0;
      var isPopular = mostPopular && song.id === mostPopular.id && maxPlays > 0;
      var isPlaying = K.isPlaying && K.currentPlaylist[K.currentTrackIndex] && K.currentPlaylist[K.currentTrackIndex].id === song.id;

      if (sLock && !K.isAdmin) {
        h += '<li class="track-item track-locked">';
        h += '<span class="track-num">' + (i + 1) + '</span>';
        h += '<div class="track-info"><div class="track-title">' + esc(song.titulo) + '</div></div>';
        h += '<div class="track-lock-info"><span class="track-lock-icon">🔒</span><span class="track-lock-date">' + esc(fmtDate(song.fecha_lanzamiento)) + '</span>';
        var cd2 = countdown(song.fecha_lanzamiento);
        if (cd2) h += '<span class="track-lock-date" style="color:var(--kx-gold);border-color:rgba(212,175,55,.12)">' + esc(cd2) + '</span>';
        h += '</div></li>';
      } else if (sLock && K.isAdmin) {
        released.push(song);
        h += '<li class="track-item track-locked admin-override" onclick="window._playTrack(' + pi + ')" oncontextmenu="window._albCtx(event,\'' + song.id + '\',\'track\')">';
        h += '<span class="track-num">' + (i + 1) + '</span><button class="track-play-btn">▶</button>';
        h += '<div class="track-info"><div class="track-title">' + esc(song.titulo) + '</div></div>';
        h += waveform(false);
        h += '<span class="admin-lock-label">🔒 ' + esc(fmtDate(song.fecha_lanzamiento)) + '</span>';
        h += '<span class="track-duration">' + (song.duracion || '--:--') + '</span>';
        h += '<span class="kx-alb-track-plays">' + fmtPlays(songPlays) + '</span>';
        h += '<button class="track-delete visible" onclick="event.stopPropagation();window._deleteTrack(\'' + song.id + '\')">🗑</button></li>';
        pi++;
      } else {
        released.push(song);
        var nc = sNew ? ' track-just-released' : '';
        var pc = isPlaying ? ' playing' : '';
        h += '<li class="track-item' + nc + pc + '" onclick="window._playTrack(' + pi + ')" oncontextmenu="window._albCtx(event,\'' + song.id + '\',\'track\')">';
        h += '<span class="track-num">' + (i + 1) + '</span><button class="track-play-btn">' + (isPlaying ? '⏸' : '▶') + '</button>';
        h += '<div class="track-info"><div class="track-title">' + esc(song.titulo) + '</div></div>';
        if (sNew) h += '<span class="track-new-badge">NUEVO</span>';
        h += waveform(isPlaying);
        h += '<span class="track-duration">' + (song.duracion || '--:--') + '</span>';
        h += '<span class="kx-alb-track-plays' + (isPopular ? ' popular' : '') + '">' + (isPopular ? '👑 ' : '') + fmtPlays(songPlays) + '</span>';
        if (K.isAdmin) h += '<button class="track-delete visible" onclick="event.stopPropagation();window._deleteTrack(\'' + song.id + '\')">🗑</button>';
        h += '</li>';
        pi++;
      }
    }

    if (eList) eList.innerHTML = h;
    K.currentPlaylist = released;

    var unrel = 0;
    for (var k = 0; k < songs.length; k++) { if (!isReleased(songs[k].fecha_lanzamiento)) unrel++; }

    if (eMeta) {
      if (unrel > 0 && !K.isAdmin) eMeta.textContent = (total - unrel) + ' DISPONIBLES';
      else if (unrel > 0 && K.isAdmin) eMeta.textContent = total + ' CANCIONES';
    }

    if (eSub) {
      if (unrel > 0 && !K.isAdmin) eSub.textContent = (total - unrel) + ' disponibles · ' + unrel + ' por desbloquear';
      else if (unrel > 0 && K.isAdmin) eSub.textContent = total + ' canciones · ' + unrel + ' programadas';
      else eSub.textContent = total + ' canciones · ' + fmtTotalDuration(totalSeconds);
    }
  }

  /* ═══ ALL SONGS ═══ */
  K.loadAllCanciones = async function () {
    try {
      var r = await db.from('canciones').select('*, albumes(titulo, imagen_url)').order('created_at', { ascending: false });
      if (r.error) throw r.error;
      var data = r.data || [];
      var f = K.isAdmin ? data : data.filter(function (s) { return isReleased(s.fecha_lanzamiento); });
      renderAllCanciones(f, 'allCancionesList');
      renderAllCanciones(f.slice(0, 5), 'inicioCanciones');
    } catch (e) { console.error(e); }
  };

  function renderAllCanciones(canciones, cid) {
    var c = document.getElementById(cid);
    if (!c) return;
    if (!canciones || !canciones.length) {
      c.innerHTML = '<div class="empty-state"><div class="empty-icon">🎵</div><div class="empty-title">Sin canciones</div></div>';
      return;
    }
    var h = '';
    for (var i = 0; i < canciones.length; i++) {
      var s = canciones[i], an = s.albumes ? s.albumes.titulo : 'Sin álbum';
      var ci = s.imagen_url || (s.albumes ? s.albumes.imagen_url : '') || '';
      var sR = isReleased(s.fecha_lanzamiento), sN = isNew(s.fecha_lanzamiento);
      if (!sR && K.isAdmin) {
        h += '<div class="track-item track-locked admin-override" onclick="window._playFromAll(' + i + ',\'' + cid + '\')"><span class="track-num">' + (i + 1) + '</span>';
        if (ci) h += '<div class="track-cover"><img src="' + esc(ci) + '" alt=""></div>'; else h += '<button class="track-play-btn">▶</button>';
        h += '<div class="track-info"><div class="track-title">' + esc(s.titulo) + '</div><div class="track-album-name">' + esc(an) + '</div></div>';
        h += '<span class="admin-lock-label">🔒 ' + esc(fmtDate(s.fecha_lanzamiento)) + '</span><span class="track-duration">' + (s.duracion || '--:--') + '</span>';
        h += '<button class="track-delete visible" onclick="event.stopPropagation();window._deleteTrackGlobal(\'' + s.id + '\')">🗑</button></div>';
      } else {
        var nc = sN ? ' track-just-released' : '';
        h += '<div class="track-item' + nc + '" onclick="window._playFromAll(' + i + ',\'' + cid + '\')"><span class="track-num">' + (i + 1) + '</span>';
        if (ci) h += '<div class="track-cover"><img src="' + esc(ci) + '" alt=""></div>'; else h += '<button class="track-play-btn">▶</button>';
        h += '<div class="track-info"><div class="track-title">' + esc(s.titulo) + '</div><div class="track-album-name">' + esc(an) + '</div></div>';
        if (sN) h += '<span class="track-new-badge">NUEVO</span>';
        h += '<span class="track-duration">' + (s.duracion || '--:--') + '</span>';
        if (K.isAdmin) h += '<button class="track-delete visible" onclick="event.stopPropagation();window._deleteTrackGlobal(\'' + s.id + '\')">🗑</button>';
        h += '</div>';
      }
    }
    c.innerHTML = h;
  }

  window._playFromAll = function (idx, cid) {
    db.from('canciones').select('*, albumes(titulo, imagen_url)').order('created_at', { ascending: false }).then(function (r) {
      if (r.data) {
        var all = r.data, f = K.isAdmin ? all : all.filter(function (s) { return isReleased(s.fecha_lanzamiento); });
        var list = cid === 'inicioCanciones' ? f.slice(0, 5) : f;
        K.currentPlaylist = list.map(function (s) {
          return { id: s.id, titulo: s.titulo, archivo_url: s.archivo_url, imagen_url: s.imagen_url || (s.albumes ? s.albumes.imagen_url : '') || '', duracion: s.duracion, reproducciones: s.reproducciones };
        });
        K.currentAlbumCover = '';
        K.playTrack(idx);
      }
    });
  };

  window._deleteTrackGlobal = async function (tid) {
    if (!confirm('¿Eliminar esta canción?')) return;
    try { await db.from('canciones').delete().eq('id', tid); K.showToast('Canción eliminada', 'success'); K.loadAllCanciones(); K.loadAlbumes(); K.loadStats(); } catch (e) { K.showToast('Error: ' + e.message, 'error'); }
  };

  /* ═══ CRUD ALBUM ═══ */
  K._selectedCoverFile = null;

  var acf = document.getElementById('albumCoverFile');
  if (acf) acf.addEventListener('change', function (e) {
    var f = e.target.files[0]; if (!f) return;
    K._selectedCoverFile = f;
    document.getElementById('albumCoverArea').classList.add('has-file');
    document.getElementById('albumCoverArea').querySelector('.file-upload-text').textContent = f.name;
    var rd = new FileReader();
    rd.onload = function (ev) { document.getElementById('albumCoverImg').src = ev.target.result; document.getElementById('albumCoverPreview').classList.add('show'); };
    rd.readAsDataURL(f);
  });

  var fa = document.getElementById('formAlbum');
  if (fa) fa.addEventListener('submit', async function (e) {
    e.preventDefault();
    var titulo = document.getElementById('albumTitulo').value.trim();
    var desc = document.getElementById('albumDesc').value.trim();
    var fechaEl = document.getElementById('albumFechaLanzamiento');
    var fechaInput = fechaEl ? fechaEl.value : '';
    if (!titulo) { K.showToast('Ingresa un título', 'error'); return; }
    var btn = document.getElementById('btnAlbumSubmit');
    btn.classList.add('loading'); btn.disabled = true;
    try {
      var imageUrl = '';
      if (K._selectedCoverFile) {
        var fn = Date.now() + '_' + K._selectedCoverFile.name.replace(/[^a-zA-Z0-9._-]/g, '');
        var up = await db.storage.from('imagenes').upload('covers/' + fn, K._selectedCoverFile, { contentType: K._selectedCoverFile.type });
        if (up.error) throw up.error;
        imageUrl = db.storage.from('imagenes').getPublicUrl('covers/' + fn).data.publicUrl;
      }
      var ins = { titulo: titulo, descripcion: desc, imagen_url: imageUrl, autor_id: K.currentUser.id };
      if (fechaInput) ins.fecha_lanzamiento = new Date(fechaInput).toISOString();
      var r2 = await db.from('albumes').insert(ins);
      if (r2.error) throw r2.error;
      K.showToast(fechaInput ? '¡Álbum programado!' : '¡Álbum creado!', 'success');
      K.closeModal('modalAlbum'); K.loadAlbumes(); K.loadStats();
    } catch (e2) { K.showToast('Error: ' + e2.message, 'error'); }
    btn.classList.remove('loading'); btn.disabled = false;
  });

  window._deleteAlbum = async function (aid) {
    if (!confirm('¿Eliminar este álbum y todas sus canciones?')) return;
    try { await db.from('canciones').delete().eq('album_id', aid); await db.from('albumes').delete().eq('id', aid); K.showToast('Álbum eliminado', 'success'); K.loadAlbumes(); K.loadAllCanciones(); K.loadStats(); } catch (e) { K.showToast('Error: ' + e.message, 'error'); }
  };

  /* ═══ CRUD SONG ═══ */
  K._selectedAudioFile = null;

  var caf = document.getElementById('cancionAudioFile');
  if (caf) caf.addEventListener('change', function (e) {
    var f = e.target.files[0]; if (!f) return;
    K._selectedAudioFile = f;
    document.getElementById('cancionAudioArea').classList.add('has-file');
    document.getElementById('cancionAudioArea').querySelector('.file-upload-text').textContent = f.name;
  });

  var fc = document.getElementById('formCancion');
  if (fc) fc.addEventListener('submit', async function (e) {
    e.preventDefault();
    var titulo = document.getElementById('cancionTitulo').value.trim();
    var fechaEl = document.getElementById('cancionFechaLanzamiento');
    var fechaInput = fechaEl ? fechaEl.value : '';
    if (!titulo) { K.showToast('Ingresa el título', 'error'); return; }
    if (!K._selectedAudioFile) { K.showToast('Selecciona audio', 'error'); return; }
    if (!K.currentAlbumId) { K.showToast('Álbum no seleccionado', 'error'); return; }
    var btn = document.getElementById('btnCancionSubmit');
    btn.classList.add('loading'); btn.disabled = true;
    var prog = document.getElementById('uploadProgress');
    prog.classList.add('show');
    document.getElementById('uploadText').textContent = 'Subiendo audio...';
    document.getElementById('uploadBarFill').style.width = '30%';
    try {
      var fn = Date.now() + '_' + K._selectedAudioFile.name.replace(/[^a-zA-Z0-9._-]/g, '');
      document.getElementById('uploadBarFill').style.width = '50%';
      var up = await db.storage.from('audio').upload('songs/' + fn, K._selectedAudioFile, { contentType: K._selectedAudioFile.type });
      if (up.error) throw up.error;
      document.getElementById('uploadBarFill').style.width = '80%';
      var audioUrl = db.storage.from('audio').getPublicUrl('songs/' + fn).data.publicUrl;
      document.getElementById('uploadText').textContent = 'Guardando...';
      var ins = { titulo: titulo, archivo_url: audioUrl, imagen_url: K.currentAlbumCover, album_id: K.currentAlbumId, autor_id: K.currentUser.id };
      if (fechaInput) ins.fecha_lanzamiento = new Date(fechaInput).toISOString();
      var r3 = await db.from('canciones').insert(ins);
      if (r3.error) throw r3.error;
      document.getElementById('uploadBarFill').style.width = '100%';
      document.getElementById('uploadText').textContent = '¡Completado!';
      K.showToast('¡Canción agregada!', 'success');
      K.closeModal('modalCancion');
      await loadTracks(K.currentAlbumId);
      K.loadAllCanciones(); K.loadStats();
    } catch (e2) { K.showToast('Error: ' + e2.message, 'error'); }
    btn.classList.remove('loading'); btn.disabled = false;
    setTimeout(function () { prog.classList.remove('show'); document.getElementById('uploadBarFill').style.width = '0%'; }, 1500);
  });

  window._deleteTrack = async function (tid) {
    if (!confirm('¿Eliminar esta canción?')) return;
    try { await db.from('canciones').delete().eq('id', tid); K.showToast('Canción eliminada', 'success'); await loadTracks(K.currentAlbumId); K.loadAllCanciones(); K.loadStats(); } catch (e) { K.showToast('Error: ' + e.message, 'error'); }
  };

  /* ═══ TOOLBAR ═══ */
  document.querySelectorAll('.kx-alb-filter').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.kx-alb-filter').forEach(function (b) {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      this.classList.add('active');
      this.setAttribute('aria-selected', 'true');
      st.filter = this.getAttribute('data-filter');
      var p = processed();
      if (st.view === 'list') renderList(p);
      else renderGrid(p, 'albumesGrid');
    });
  });

  var sortBtn = document.getElementById('albSortBtn');
  var sortDrop = document.getElementById('albSortDropdown');

  if (sortBtn) sortBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    var open = sortDrop.classList.toggle('show');
    sortBtn.setAttribute('aria-expanded', open);
  });

  document.querySelectorAll('.kx-alb-sort-option').forEach(function (opt) {
    opt.addEventListener('click', function () {
      document.querySelectorAll('.kx-alb-sort-option').forEach(function (o) {
        o.classList.remove('active');
        o.setAttribute('aria-selected', 'false');
      });
      this.classList.add('active');
      this.setAttribute('aria-selected', 'true');
      st.sort = this.getAttribute('data-sort');
      var labels = { recent: 'Reciente', oldest: 'Antiguo', 'name-az': 'A→Z', 'name-za': 'Z→A', tracks: 'Canciones' };
      var lbl = document.getElementById('albSortLabel');
      if (lbl) lbl.textContent = labels[st.sort] || 'Reciente';
      sortDrop.classList.remove('show');
      sortBtn.setAttribute('aria-expanded', 'false');
      var p = processed();
      if (st.view === 'list') renderList(p);
      else renderGrid(p, 'albumesGrid');
    });
  });

  document.querySelectorAll('.kx-alb-view-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.kx-alb-view-btn').forEach(function (b) {
        b.classList.remove('active');
        b.setAttribute('aria-checked', 'false');
      });
      this.classList.add('active');
      this.setAttribute('aria-checked', 'true');
      st.view = this.getAttribute('data-view');
      var grid = document.getElementById('albumesGrid');
      var list = document.getElementById('albumesListAlt');
      var p = processed();
      if (st.view === 'list') {
        if (grid) grid.style.display = 'none';
        if (list) list.style.display = 'flex';
        renderList(p);
      } else {
        if (list) list.style.display = 'none';
        if (grid) grid.style.display = 'grid';
        renderGrid(p, 'albumesGrid');
      }
      try { localStorage.setItem('kxon_alb_view', st.view); } catch (e) { }
    });
  });

  try {
    var sv = localStorage.getItem('kxon_alb_view');
    if (sv === 'list') {
      st.view = 'list';
      document.querySelectorAll('.kx-alb-view-btn').forEach(function (b) {
        b.classList.remove('active');
        b.setAttribute('aria-checked', 'false');
        if (b.getAttribute('data-view') === 'list') {
          b.classList.add('active');
          b.setAttribute('aria-checked', 'true');
        }
      });
    }
  } catch (e) { }

  document.addEventListener('click', function () { if (sortDrop) { sortDrop.classList.remove('show'); if (sortBtn) sortBtn.setAttribute('aria-expanded', 'false'); } });

  /* ═══ CONTEXT MENU ═══ */
  var ctxMenu = document.getElementById('albCtxMenu');

  window._albCtx = function (e, id, type) {
    e.preventDefault(); e.stopPropagation();
    if (!ctxMenu) return;
    st.ctxTarget = id; st.ctxType = type;
    ctxMenu.querySelectorAll('.kx-alb-ctx-admin').forEach(function (item) {
      item.style.display = K.isAdmin ? 'flex' : 'none';
    });
    var x = e.clientX, y = e.clientY;
    if (x + 210 > window.innerWidth) x = window.innerWidth - 220;
    if (y + 280 > window.innerHeight) y = window.innerHeight - 290;
    ctxMenu.style.left = x + 'px';
    ctxMenu.style.top = y + 'px';
    ctxMenu.classList.add('show');
  };

  if (ctxMenu) {
    ctxMenu.querySelectorAll('.kx-alb-ctx-item').forEach(function (item) {
      item.addEventListener('click', function () {
        var action = this.getAttribute('data-action');
        var id = st.ctxTarget, type = st.ctxType;
        ctxMenu.classList.remove('show');
        switch (action) {
          case 'play': if (type === 'album' || type === 'album-locked') window._quickPlay(id); break;
          case 'queue': K.showToast('Agregado a la cola', 'success'); break;
          case 'playlist': if (typeof window._addCurrentToPlaylist === 'function') window._addCurrentToPlaylist(); else K.showToast('Agregar a playlist', 'info'); break;
          case 'fav': K.showToast('Agregado a favoritos', 'success'); break;
          case 'share': K.showToast('Enlace copiado', 'success'); break;
          case 'delete': if (type === 'album') window._deleteAlbum(id); else if (type === 'track') window._deleteTrack(id); break;
        }
      });
    });
  }

  document.addEventListener('click', function () { if (ctxMenu) ctxMenu.classList.remove('show'); });
  document.addEventListener('scroll', function () { if (ctxMenu) ctxMenu.classList.remove('show'); }, true);

  /* ═══ KEYBOARD ═══ */
  document.addEventListener('keydown', function (e) {
    var panel = document.getElementById('panel-albumes');
    if (!panel || !panel.classList.contains('active')) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

    var dv = document.getElementById('albumDetailView');
    var isDetail = dv && dv.classList.contains('show');

    switch (e.key) {
      case 'Escape':
        if (ctxMenu && ctxMenu.classList.contains('show')) ctxMenu.classList.remove('show');
        else if (isDetail) { e.preventDefault(); transitionToGrid(); }
        break;
      case ' ':
        if (isDetail && K.currentPlaylist.length > 0) { e.preventDefault(); var pp = document.getElementById('playerPlayPause'); if (pp) pp.click(); }
        break;
      case 'ArrowRight':
        if (isDetail && K.isPlaying) { e.preventDefault(); var next = document.getElementById('playerNext'); if (next) next.click(); }
        break;
      case 'ArrowLeft':
        if (isDetail && K.isPlaying) { e.preventDefault(); var prev = document.getElementById('playerPrev'); if (prev) prev.click(); }
        break;
    }
  });

  /* ═══ AUDIO PREVIEW ═══ */
  st.previewAudio = new Audio();
  st.previewAudio.volume = 0;
  var previewCache = {};

  document.addEventListener('mouseenter', function (e) {
    var card = e.target.closest('.kx-alb-card:not(.kx-alb-card--locked)');
    if (!card || K.isPlaying) return;
    var aid = card.getAttribute('data-album-id');
    if (!aid) return;

    clearTimeout(st.previewTimeout);
    st.previewTimeout = setTimeout(function () {
      var doPlay = function (url) {
        var pa = st.previewAudio;
        pa.src = url;
        pa.currentTime = 0;
        pa.volume = 0;
        pa.play().then(function () {
          var vol = 0;
          var fi = setInterval(function () { vol += 0.05; if (vol >= 0.15) { vol = 0.15; clearInterval(fi); } pa.volume = vol; }, 50);
        }).catch(function () { });
      };

      if (previewCache[aid]) { doPlay(previewCache[aid]); return; }

      db.from('canciones').select('archivo_url').eq('album_id', aid).order('created_at', { ascending: true }).limit(1).then(function (r) {
        if (r.data && r.data[0] && r.data[0].archivo_url) {
          previewCache[aid] = r.data[0].archivo_url;
          doPlay(r.data[0].archivo_url);
        }
      });
    }, 800);
  }, true);

  document.addEventListener('mouseleave', function (e) {
    var card = e.target.closest('.kx-alb-card');
    if (!card) return;
    clearTimeout(st.previewTimeout);
    var pa = st.previewAudio;
    if (!pa.paused) {
      var fo = setInterval(function () {
        var v = pa.volume - 0.03;
        if (v <= 0) { v = 0; clearInterval(fo); pa.pause(); pa.currentTime = 0; }
        pa.volume = v;
      }, 30);
    }
  }, true);

  /* ═══ AUTO REFRESH ═══ */
  setInterval(function () {
    var ap = document.getElementById('panel-albumes');
    var ip = document.getElementById('panel-inicio');
    if ((ap && ap.classList.contains('active')) || (ip && ip.classList.contains('active'))) K.loadAlbumes();
  }, 60000);

  setupObserver();

})();