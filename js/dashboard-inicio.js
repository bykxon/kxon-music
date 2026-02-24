/* ═══════════════════════════════════════════════════
   🏠 KXON HOME PANEL — REDESIGN 2026
   Namespace: kx-home-*
   Event delegation, escapeHtml, skeleton loading
   ═══════════════════════════════════════════════════ */
(function () {

  var db = window.db;

  /* ── Wait for KXON ── */
  function waitForKXON(cb) {
    if (window.KXON && window.KXON.currentUser !== undefined) cb();
    else setTimeout(function () { waitForKXON(cb); }, 50);
  }

  waitForKXON(function () { initHome(); });

  function initHome() {

    var K = window.KXON;

    /* ══════════════════════════════════════════
       🛡️ HELPERS
       ══════════════════════════════════════════ */
    function $(id) { return document.getElementById(id); }

    function escapeHtml(str) {
      if (!str) return '';
      var s = String(str);
      var map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
      return s.replace(/[&<>"']/g, function (c) { return map[c]; });
    }

    function formatDate(dateStr) {
      if (!dateStr) return '';
      var d = new Date(dateStr);
      return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    function formatDateFull() {
      var d = new Date();
      var opts = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
      var s = d.toLocaleDateString('es-ES', opts);
      return s.charAt(0).toUpperCase() + s.slice(1);
    }

    function getGreeting() {
      var h = new Date().getHours();
      if (h < 6)  return { text: 'BUENAS NOCHES', icon: '🌙', sub: 'La música no duerme.' };
      if (h < 12) return { text: 'BUENOS DÍAS', icon: '☀️', sub: 'Un buen día empieza con buena música.' };
      if (h < 18) return { text: 'BUENAS TARDES', icon: '🌤️', sub: 'Explora lo nuevo en KXON.' };
      return { text: 'BUENAS NOCHES', icon: '🌙', sub: 'El mejor sonido para cerrar el día.' };
    }

    /* ══════════════════════════════════════════
       📅 LAST-SEEN SYSTEM
       ══════════════════════════════════════════ */
    function getSeenKey(section) {
      return 'kxon_seen_' + section + '_' + (K.currentUser ? K.currentUser.id : 'anon');
    }

    function getLastSeen(section) {
      try { return localStorage.getItem(getSeenKey(section)) || null; }
      catch (e) { return null; }
    }

    function setLastSeen(section) {
      try { localStorage.setItem(getSeenKey(section), new Date().toISOString()); }
      catch (e) { /* silent */ }
    }

    function filterNew(items, section, field) {
      var ls = getLastSeen(section);
      if (!ls) return items;
      var d = new Date(ls);
      return items.filter(function (item) { return new Date(item[field || 'created_at']) > d; });
    }

    /* ══════════════════════════════════════════
       🦴 SKELETON RENDERERS
       ══════════════════════════════════════════ */
    function showSkeletonStats() {
      var el = $('kxHomeHeroStats');
      if (!el) return;
      ['kxHomeStatAlbumes', 'kxHomeStatCanciones', 'kxHomeStatBeats', 'kxHomeStatNoticias']
        .forEach(function (id) {
          var s = $(id);
          if (s) s.textContent = '—';
        });
    }

    function showSkeletonNews() {
      var grid = $('kxHomeNewsGrid');
      if (!grid) return;
      var h = '';
      for (var i = 0; i < 4; i++) {
        h += '<div class="kx-home-skeleton-card" style="--i:' + i + '">'
          + '<div class="kx-home-skeleton-card-img"></div>'
          + '<div class="kx-home-skeleton-card-body">'
          + '<div class="kx-home-skeleton-line"></div>'
          + '<div class="kx-home-skeleton-line kx-home-skeleton-line--short"></div>'
          + '</div></div>';
      }
      grid.innerHTML = h;
    }

    function showSkeletonTracks() {
      var el = $('kxHomeSongsList');
      if (!el) return;
      var h = '<div class="kx-home-tracks">';
      for (var i = 0; i < 4; i++) {
        h += '<div class="kx-home-skeleton-track">'
          + '<div class="kx-home-skeleton-track-circle"></div>'
          + '<div class="kx-home-skeleton-track-bar"></div>'
          + '<div class="kx-home-skeleton-track-dur"></div>'
          + '</div>';
      }
      h += '</div>';
      el.innerHTML = h;
    }

    function showSkeletonAlbums() {
      var grid = $('kxHomeAlbGrid');
      if (!grid) return;
      var h = '';
      for (var i = 0; i < 5; i++) {
        h += '<div class="kx-home-skeleton-card" style="--i:' + i + '">'
          + '<div class="kx-home-skeleton-card-img square"></div>'
          + '<div class="kx-home-skeleton-card-body">'
          + '<div class="kx-home-skeleton-line"></div>'
          + '<div class="kx-home-skeleton-line kx-home-skeleton-line--short"></div>'
          + '</div></div>';
      }
      grid.innerHTML = h;
    }

    /* ══════════════════════════════════════════
       🏠 RENDER GREETING & DATE
       ══════════════════════════════════════════ */
    function renderGreeting() {
      var g = getGreeting();
      var name = '';
      if (K.currentProfile && K.currentProfile.full_name) {
        name = K.currentProfile.full_name.split(' ')[0];
      } else if (K.currentUser) {
        name = K.currentUser.email.split('@')[0];
      }

      var timeEl = $('kxHomeGreetingTime');
      if (timeEl) timeEl.textContent = g.text;

      var labelEl = $('kxHomeGreetingLabel');
      if (labelEl) {
        var iconSpan = labelEl.querySelector('span:first-child');
        if (iconSpan) iconSpan.textContent = g.icon;
      }

      var titleEl = $('kxHomeGreetingTitle');
      if (titleEl) titleEl.textContent = name ? ('Hola, ' + escapeHtml(name)) : 'Bienvenido a KXON';

      var subEl = $('kxHomeGreetingSub');
      if (subEl) subEl.textContent = g.sub;

      var dateEl = $('kxHomeDate');
      if (dateEl) dateEl.textContent = formatDateFull();
    }

    /* ══════════════════════════════════════════
       📊 STATS
       ══════════════════════════════════════════ */
    async function loadHomeStats() {
      try {
        var results = await Promise.all([
          db.from('albumes').select('id', { count: 'exact', head: true }),
          db.from('canciones').select('id', { count: 'exact', head: true }),
          db.from('beats').select('id', { count: 'exact', head: true }),
          db.from('noticias').select('id', { count: 'exact', head: true })
        ]);

        var sa = $('kxHomeStatAlbumes');
        var sc = $('kxHomeStatCanciones');
        var sb = $('kxHomeStatBeats');
        var sn = $('kxHomeStatNoticias');
        if (sa) sa.textContent = results[0].count || 0;
        if (sc) sc.textContent = results[1].count || 0;
        if (sb) sb.textContent = results[2].count || 0;
        if (sn) sn.textContent = results[3].count || 0;

        /* Also update old stat elements for compatibility */
        var oldSa = $('statAlbumes'); if (oldSa) oldSa.textContent = results[0].count || 0;
        var oldSc = $('statCanciones'); if (oldSc) oldSc.textContent = results[1].count || 0;
        var oldSb = $('statBeats'); if (oldSb) oldSb.textContent = results[2].count || 0;
        var oldSn = $('statNoticias'); if (oldSn) oldSn.textContent = results[3].count || 0;
      } catch (e) { console.error('Home stats error:', e); }
    }

    /* ══════════════════════════════════════════
       📰 RENDER NEWS
       ══════════════════════════════════════════ */
    function renderNewsSection(allNews, newNews) {
      /* Badge */
      var badge = $('kxHomeNewsBadge');
      if (badge) {
        if (newNews.length > 0) {
          badge.textContent = newNews.length + ' nuevo' + (newNews.length > 1 ? 's' : '');
          badge.style.display = 'inline-flex';
        } else {
          badge.style.display = 'none';
        }
      }

      /* Actions */
      var actionsEl = $('kxHomeNewsActions');
      if (actionsEl) {
        var ah = '';
        if (newNews.length > 0) {
          ah += '<button class="kx-home-section-clear" data-clear="noticias">'
            + '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>'
            + ' Marcar visto</button>';
        } else {
          ah += '<span class="kx-home-section-seen">✓ Al día</span>';
        }
        ah += '<button class="kx-home-section-viewall" data-goto="inicio">Ver todo →</button>';
        actionsEl.innerHTML = ah;
      }

      /* Grid */
      var grid = $('kxHomeNewsGrid');
      if (!grid) return;

      var items = newNews.length > 0 ? newNews.slice(0, 6) : allNews.slice(0, 6);

      if (!items.length) {
        grid.innerHTML = '<div class="kx-home-empty">'
          + '<div class="kx-home-empty-icon">📰</div>'
          + '<div class="kx-home-empty-title">Sin noticias</div>'
          + '<div class="kx-home-empty-text">Cuando se publiquen noticias, aparecerán aquí</div>'
          + '</div>';
        return;
      }

      var h = '';
      for (var i = 0; i < items.length; i++) {
        var n = items[i];
        var img = n.imagen_url || 'https://placehold.co/600x300/111/333?text=KXON+NEWS';
        h += '<article class="kx-home-news-card kx-observed" style="--i:' + i + '"'
          + ' data-action="open-news" data-id="' + escapeHtml(n.id) + '"'
          + ' role="listitem" tabindex="0"'
          + ' aria-label="' + escapeHtml(n.titulo) + '">';

        h += '<div class="kx-home-news-img">'
          + '<img src="' + escapeHtml(img) + '" alt="" loading="lazy"'
          + ' onerror="this.src=\'https://placehold.co/600x300/111/333?text=KXON\'">';

        if (K.isAdmin) {
          h += '<button class="kx-home-news-delete" data-action="delete-news"'
            + ' data-id="' + escapeHtml(n.id) + '" aria-label="Eliminar noticia">'
            + '<svg viewBox="0 0 24 24"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>'
            + '</button>';
        }
        h += '</div>';

        h += '<div class="kx-home-news-body">'
          + '<div class="kx-home-news-date">' + escapeHtml(formatDate(n.created_at)) + '</div>'
          + '<div class="kx-home-news-title">' + escapeHtml(n.titulo) + '</div>'
          + '<div class="kx-home-news-readmore">Leer más →</div>'
          + '</div></article>';
      }
      grid.innerHTML = h;
    }

    /* ══════════════════════════════════════════
       🎵 RENDER SONGS
       ══════════════════════════════════════════ */
    var _homeSongs = [];

    function renderSongsSection(allSongs, newSongs) {
      /* Badge */
      var badge = $('kxHomeSongsBadge');
      if (badge) {
        if (newSongs.length > 0) {
          badge.textContent = newSongs.length + ' nuevo' + (newSongs.length > 1 ? 's' : '');
          badge.style.display = 'inline-flex';
        } else {
          badge.style.display = 'none';
        }
      }

      /* Actions */
      var actionsEl = $('kxHomeSongsActions');
      if (actionsEl) {
        var ah = '';
        if (newSongs.length > 0) {
          ah += '<button class="kx-home-section-clear" data-clear="canciones">'
            + '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>'
            + ' Marcar visto</button>';
        } else {
          ah += '<span class="kx-home-section-seen">✓ Al día</span>';
        }
        ah += '<button class="kx-home-section-viewall" data-goto="canciones">Ver todo →</button>';
        actionsEl.innerHTML = ah;
      }

      /* List */
      var el = $('kxHomeSongsList');
      if (!el) return;

      var items = newSongs.length > 0 ? newSongs.slice(0, 6) : allSongs.slice(0, 6);
      _homeSongs = items;

      if (!items.length) {
        el.innerHTML = '<div class="kx-home-empty">'
          + '<div class="kx-home-empty-icon">🎵</div>'
          + '<div class="kx-home-empty-title">Sin canciones recientes</div>'
          + '<div class="kx-home-empty-text">Las nuevas canciones aparecerán aquí</div>'
          + '</div>';
        return;
      }

      var h = '<div class="kx-home-tracks" role="list">';
      for (var i = 0; i < items.length; i++) {
        var s = items[i];
        var albumName = s.albumes ? s.albumes.titulo : 'Sin álbum';
        var coverImg = s.imagen_url || (s.albumes ? s.albumes.imagen_url : '') || '';

        h += '<div class="kx-home-track" data-action="play-song" data-index="' + i + '"'
          + ' role="listitem" tabindex="0">';
        h += '<span class="kx-home-track-num">' + (i + 1) + '</span>';

        if (coverImg) {
          h += '<div class="kx-home-track-cover">'
            + '<img src="' + escapeHtml(coverImg) + '" alt="" loading="lazy">'
            + '</div>';
        } else {
          h += '<div class="kx-home-track-play">'
            + '<svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>'
            + '</div>';
        }

        h += '<div class="kx-home-track-info">'
          + '<div class="kx-home-track-title">' + escapeHtml(s.titulo) + '</div>'
          + '<div class="kx-home-track-album">' + escapeHtml(albumName) + '</div>'
          + '</div>';

        h += '<span class="kx-home-track-dur">' + escapeHtml(s.duracion || '--:--') + '</span>';
        h += '</div>';
      }
      h += '</div>';
      el.innerHTML = h;
    }

    /* ══════════════════════════════════════════
       💿 RENDER ALBUMS
       ══════════════════════════════════════════ */
    function renderAlbumsSection(allAlbs, newAlbs) {
      /* Badge */
      var badge = $('kxHomeAlbBadge');
      if (badge) {
        if (newAlbs.length > 0) {
          badge.textContent = newAlbs.length + ' nuevo' + (newAlbs.length > 1 ? 's' : '');
          badge.style.display = 'inline-flex';
        } else {
          badge.style.display = 'none';
        }
      }

      /* Actions */
      var actionsEl = $('kxHomeAlbActions');
      if (actionsEl) {
        var ah = '';
        if (newAlbs.length > 0) {
          ah += '<button class="kx-home-section-clear" data-clear="albumes">'
            + '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>'
            + ' Marcar visto</button>';
        } else {
          ah += '<span class="kx-home-section-seen">✓ Al día</span>';
        }
        ah += '<button class="kx-home-section-viewall" data-goto="albumes">Ver todo →</button>';
        actionsEl.innerHTML = ah;
      }

      /* Grid */
      var grid = $('kxHomeAlbGrid');
      if (!grid) return;

      var items = newAlbs.length > 0 ? newAlbs.slice(0, 6) : allAlbs.slice(0, 6);

      if (!items.length) {
        grid.innerHTML = '<div class="kx-home-empty">'
          + '<div class="kx-home-empty-icon">💿</div>'
          + '<div class="kx-home-empty-title">Sin álbumes recientes</div>'
          + '<div class="kx-home-empty-text">Los nuevos álbumes aparecerán aquí</div>'
          + '</div>';
        return;
      }

      var h = '';
      for (var i = 0; i < items.length; i++) {
        var a = items[i];
        var img = a.imagen_url || 'https://placehold.co/400x400/111/333?text=♪';
        var cnt = a.canciones ? a.canciones.length : 0;

        h += '<article class="kx-home-album-card kx-observed" style="--i:' + i + '"'
          + ' data-action="open-album" data-id="' + escapeHtml(a.id) + '"'
          + ' role="listitem" tabindex="0"'
          + ' aria-label="' + escapeHtml(a.titulo) + '">';

        h += '<div class="kx-home-album-visual">'
          + '<img src="' + escapeHtml(img) + '" alt="" loading="lazy"'
          + ' onerror="this.src=\'https://placehold.co/400x400/111/333?text=♪\'">'
          + '<div class="kx-home-album-overlay">'
          + '<button class="kx-home-album-play" data-action="play-album"'
          + ' data-id="' + escapeHtml(a.id) + '" aria-label="Reproducir">'
          + '<svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>'
          + '</button>'
          + '<span class="kx-home-album-count">♪ ' + cnt + '</span>'
          + '</div></div>';

        h += '<div class="kx-home-album-body">'
          + '<div class="kx-home-album-title">' + escapeHtml(a.titulo) + '</div>'
          + '<div class="kx-home-album-sub">♪ ' + cnt + ' canciones</div>'
          + '</div></article>';
      }
      grid.innerHTML = h;
    }

    /* ══════════════════════════════════════════
       🔄 STATUS BAR (clear all)
       ══════════════════════════════════════════ */
    function renderStatusBar(totalNew) {
      var el = $('kxHomeStatus');
      if (!el) return;

      if (totalNew > 0) {
        el.innerHTML = '<div class="kx-home-status-clear" data-action="clear-all" role="button" tabindex="0">'
          + '<span class="kx-home-status-clear-icon">🧹</span>'
          + '<span class="kx-home-status-clear-text">Limpiar todo</span>'
          + '<span class="kx-home-status-clear-badge">' + totalNew + ' nuevo' + (totalNew > 1 ? 's' : '') + '</span>'
          + '</div>';
      } else {
        el.innerHTML = '<div class="kx-home-status-ok">'
          + '<span class="kx-home-status-ok-icon">✨</span>'
          + '<span class="kx-home-status-ok-text">Estás al día — no hay contenido nuevo</span>'
          + '</div>';
      }
    }

    /* ══════════════════════════════════════════
       🏠 MAIN RENDER
       ══════════════════════════════════════════ */
    K.renderInicio = async function () {
      renderGreeting();

      /* Show skeletons */
      showSkeletonStats();
      showSkeletonNews();
      showSkeletonTracks();
      showSkeletonAlbums();

      /* Load stats */
      loadHomeStats();

      try {
        /* Parallel queries */
        var results = await Promise.all([
          db.from('noticias').select('*').order('created_at', { ascending: false }),
          db.from('canciones').select('*, albumes(titulo, imagen_url)').order('created_at', { ascending: false }),
          db.from('albumes').select('*, canciones(id)').order('created_at', { ascending: false })
        ]);

        var allNoticias  = results[0].data || [];
        var allCanciones = results[1].data || [];
        var allAlbumes   = results[2].data || [];

        K.allNoticiasData = allNoticias;

        var newNoticias  = filterNew(allNoticias,  'noticias');
        var newCanciones = filterNew(allCanciones, 'canciones');
        var newAlbumes   = filterNew(allAlbumes,   'albumes');

        renderNewsSection(allNoticias, newNoticias);
        renderSongsSection(allCanciones, newCanciones);
        renderAlbumsSection(allAlbumes, newAlbumes);
        renderStatusBar(newNoticias.length + newCanciones.length + newAlbumes.length);

      } catch (e) {
        console.error('Home render error:', e);
        /* Show error states */
        var grid = $('kxHomeNewsGrid');
        if (grid) grid.innerHTML = '<div class="kx-home-empty"><div class="kx-home-empty-icon">⚠️</div>'
          + '<div class="kx-home-empty-title">Error al cargar</div>'
          + '<div class="kx-home-empty-text">Intenta recargar la página</div></div>';
      }
    };

    /* Also override loadStats to use our parallel version */
    K.loadStats = loadHomeStats;

    /* ══════════════════════════════════════════
       🖱️ EVENT DELEGATION
       ══════════════════════════════════════════ */
    var panel = $('panel-inicio');
    if (!panel) return;

    panel.addEventListener('click', function (e) {
      var target = e.target;

      /* ── Quick Actions ── */
      var action = target.closest('[data-action]');
      if (!action) return;

      var act = action.getAttribute('data-action');

      /* Navigate to panel */
      if (['albumes', 'canciones', 'radio', 'videos', 'marketplace', 'playlists'].indexOf(act) >= 0) {
        e.preventDefault();
        K.showPanel(act);
        return;
      }

      /* Open news */
      if (act === 'open-news') {
        e.preventDefault();
        var nid = action.getAttribute('data-id');
        if (nid && typeof window._openNoticia === 'function') {
          window._openNoticia(nid);
        }
        return;
      }

      /* Delete news */
      if (act === 'delete-news') {
        e.preventDefault();
        e.stopPropagation();
        var dnid = action.getAttribute('data-id');
        if (dnid && typeof window._deleteNoticia === 'function') {
          window._deleteNoticia(dnid);
        }
        return;
      }

      /* Play song */
      if (act === 'play-song') {
        e.preventDefault();
        var idx = parseInt(action.getAttribute('data-index'), 10);
        if (!isNaN(idx) && _homeSongs[idx]) {
          /* Build playlist from home songs */
          K.currentPlaylist = [];
          K.currentAlbumCover = '';
          for (var si = 0; si < _homeSongs.length; si++) {
            var song = _homeSongs[si];
            K.currentPlaylist.push({
              id: song.id,
              titulo: song.titulo,
              archivo_url: song.audio_url,
              imagen_url: song.imagen_url || (song.albumes ? song.albumes.imagen_url : '') || '',
              album: song.albumes ? song.albumes.titulo : '',
              duracion: song.duracion || '--:--'
            });
          }
          K.playTrack(idx);
        }
        return;
      }

      /* Open album */
      if (act === 'open-album') {
        e.preventDefault();
        var aid = action.getAttribute('data-id');
        if (aid && typeof window._openAlbum === 'function') {
          window._openAlbum(aid);
        }
        return;
      }

      /* Play album */
      if (act === 'play-album') {
        e.preventDefault();
        e.stopPropagation();
        var paid = action.getAttribute('data-id');
        if (paid && typeof window._openAlbum === 'function') {
          window._openAlbum(paid);
        }
        return;
      }

      /* Clear section */
      if (act === 'clear-all') {
        e.preventDefault();
        setLastSeen('noticias');
        setLastSeen('canciones');
        setLastSeen('albumes');
        K.showToast('✓ Todo limpiado', 'success');
        K.renderInicio();
        return;
      }

      /* Go to panel */
      var goto = action.getAttribute('data-goto');
      if (goto) {
        e.preventDefault();
        K.showPanel(goto);
        return;
      }
    });

    /* Section clear buttons (delegated) */
    panel.addEventListener('click', function (e) {
      var clearBtn = e.target.closest('[data-clear]');
      if (!clearBtn) return;
      e.preventDefault();
      var section = clearBtn.getAttribute('data-clear');
      if (section) {
        setLastSeen(section);
        K.showToast('✓ Sección limpiada', 'success');
        K.renderInicio();
      }
    });

    /* Keyboard accessibility */
    panel.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        var focusable = e.target.closest('[data-action], [data-clear], [data-goto]');
        if (focusable) {
          e.preventDefault();
          focusable.click();
        }
      }
    });

    /* ══════════════════════════════════════════
       🔗 KEEP COMPATIBILITY
       ══════════════════════════════════════════ */
    /* These global functions are still called from dashboard-noticias.js */
    window._clearSection = function (section) {
      setLastSeen(section);
      K.showToast('✓ Sección limpiada', 'success');
      K.renderInicio();
    };

    window._clearAllSections = function () {
      setLastSeen('noticias');
      setLastSeen('canciones');
      setLastSeen('albumes');
      K.showToast('✓ Todo limpiado', 'success');
      K.renderInicio();
    };

    console.log('✅ dashboard-inicio.js cargado');

  } /* fin initHome */

})();