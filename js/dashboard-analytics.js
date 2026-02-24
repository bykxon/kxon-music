/* ============================================
   📊 DASHBOARD-ANALYTICS.JS — KXON 2026
   Panel Analytics para Admin — Rediseñado
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
     📊 TRACKING — Registrar eventos
     ══════════════════════════════════════════ */
  K.trackEvent = async function (evento, data) {
    if (!K.currentUser) return;
    try {
      await db.from('analytics_events').insert({
        evento: evento,
        usuario_id: K.currentUser.id,
        data: data || {}
      });
    } catch (e) { /* silent fail */ }
  };

  /* Auto-track: login */
  K.trackEvent('login', { timestamp: new Date().toISOString() });

  /* Hook playTrack para tracking */
  var _origPlay = K.playTrack;
  if (_origPlay) {
    K.playTrack = function (idx) {
      _origPlay(idx);
      if (K.currentPlaylist && K.currentPlaylist[idx]) {
        K.trackEvent('play_song', {
          song_id: K.currentPlaylist[idx].id,
          song_title: K.currentPlaylist[idx].titulo
        });
      }
    };
    window._playTrack = function (idx) { K.playTrack(idx); };
  }

  /* ══════════════════════════════════════════
     📦 STATE
     ══════════════════════════════════════════ */
  var analyticsPeriod = '30d';
  var isLoading = false;

  /* ══════════════════════════════════════════
     📊 CARGAR ANALYTICS (solo admin)
     ══════════════════════════════════════════ */
  K.loadAnalytics = async function () {
    if (!K.isAdmin) return;
    if (isLoading) return;
    isLoading = true;

    // Update period buttons
    var periods = document.querySelectorAll('.kx-ana-period');
    for (var p = 0; p < periods.length; p++) {
      var isActive = periods[p].getAttribute('data-period') === analyticsPeriod;
      periods[p].classList.toggle('active', isActive);
      periods[p].setAttribute('aria-selected', isActive ? 'true' : 'false');
    }

    // Show loading state on refresh btn
    var refreshBtn = $('anaRefreshBtn');
    if (refreshBtn) refreshBtn.classList.add('is-loading');

    // Show skeletons
    var statsEl = $('anaStats');
    if (statsEl) {
      statsEl.innerHTML =
        '<div class="kx-ana-skeleton-stat" aria-hidden="true"></div>'.repeat(6);
    }

    var chartEl = $('anaChart');
    if (chartEl) {
      chartEl.innerHTML = '<div class="kx-ana-skeleton-chart" aria-hidden="true"></div>';
    }

    var topEl = $('anaTopGrid');
    if (topEl) {
      topEl.innerHTML =
        '<div class="kx-ana-grid-2col">' +
          '<div class="kx-ana-skeleton-table" aria-hidden="true"></div>' +
          '<div class="kx-ana-skeleton-table" aria-hidden="true"></div>' +
        '</div>';
    }

    try {
      await Promise.all([
        loadOverviewStats(),
        loadActivityChart(),
        loadTopContent()
      ]);
    } catch (e) {
      console.error('Analytics load error:', e);
    }

    if (refreshBtn) refreshBtn.classList.remove('is-loading');
    isLoading = false;
  };

  function getDateFrom() {
    var now = new Date();
    if (analyticsPeriod === '7d') return new Date(now - 7 * 86400000).toISOString();
    if (analyticsPeriod === '30d') return new Date(now - 30 * 86400000).toISOString();
    if (analyticsPeriod === '90d') return new Date(now - 90 * 86400000).toISOString();
    return '2020-01-01T00:00:00Z';
  }

  /* ══════════════════════════════════════════
     📊 OVERVIEW STATS
     ══════════════════════════════════════════ */
  async function loadOverviewStats() {
    var c = $('anaStats');
    if (!c) return;

    try {
      var dateFrom = getDateFrom();

      // Parallel queries
      var results = await Promise.all([
        db.from('profiles').select('id', { count: 'exact', head: true }),
        db.from('canciones').select('reproducciones'),
        db.from('analytics_events').select('id', { count: 'exact', head: true }).eq('evento', 'play_song').gte('created_at', dateFrom),
        db.from('compras').select('id, precio_pagado', { count: 'exact' }).gte('created_at', dateFrom),
        db.from('videos').select('visualizaciones'),
        db.from('episodios').select('visualizaciones'),
        db.from('favoritos').select('id', { count: 'exact', head: true }).gte('created_at', dateFrom),
        db.from('suscripciones').select('id', { count: 'exact', head: true }).eq('estado', 'activa')
      ]);

      var totalUsers = results[0].count || 0;

      var totalPlays = 0;
      if (results[1].data) {
        for (var i = 0; i < results[1].data.length; i++) {
          totalPlays += (results[1].data[i].reproducciones || 0);
        }
      }
      var totalPlaysPeriod = results[2].count || 0;

      var totalSales = results[3].count || 0;
      var totalRevenue = 0;
      if (results[3].data) {
        for (var j = 0; j < results[3].data.length; j++) {
          totalRevenue += Number(results[3].data[j].precio_pagado || 0);
        }
      }

      var totalViews = 0;
      if (results[4].data) {
        for (var v = 0; v < results[4].data.length; v++) {
          totalViews += (results[4].data[v].visualizaciones || 0);
        }
      }
      var totalEpViews = 0;
      if (results[5].data) {
        for (var e = 0; e < results[5].data.length; e++) {
          totalEpViews += (results[5].data[e].visualizaciones || 0);
        }
      }

      var totalFavs = results[6].count || 0;
      var totalSubs = results[7].count || 0;

      var stats = [
        {
          cls: 'users', icon: '👥', value: totalUsers,
          label: 'USUARIOS TOTALES', detail: '', trend: null
        },
        {
          cls: 'plays', icon: '▶️', value: totalPlays.toLocaleString(),
          label: 'REPRODUCCIONES',
          detail: analyticsPeriod !== 'all' ? totalPlaysPeriod + ' en período' : '',
          trend: null
        },
        {
          cls: 'sales', icon: '💰', value: K.formatPrice(totalRevenue),
          label: totalSales + ' VENTAS', detail: '', trend: null
        },
        {
          cls: 'views', icon: '👁', value: (totalViews + totalEpViews).toLocaleString(),
          label: 'VISTAS TOTALES',
          detail: totalViews + ' videos · ' + totalEpViews + ' episodios',
          trend: null
        },
        {
          cls: 'favs', icon: '❤️', value: totalFavs.toLocaleString(),
          label: 'FAVORITOS', detail: '', trend: null
        },
        {
          cls: 'subs', icon: '🎫', value: totalSubs,
          label: 'SUSCRIPCIONES ACTIVAS', detail: '', trend: null
        }
      ];

      var html = '';
      for (var s = 0; s < stats.length; s++) {
        var st = stats[s];
        html += '<div class="kx-ana-stat kx-ana-stat--' + st.cls + '">';
        html += '<div class="kx-ana-stat-header">';
        html += '<div class="kx-ana-stat-icon">' + st.icon + '</div>';
        html += '</div>';
        html += '<div class="kx-ana-stat-value">' + st.value + '</div>';
        html += '<div class="kx-ana-stat-label">' + escapeHtml(st.label) + '</div>';
        if (st.detail) html += '<div class="kx-ana-stat-detail">' + escapeHtml(st.detail) + '</div>';
        html += '</div>';
      }

      c.innerHTML = html;

    } catch (err) {
      console.error('Error analytics stats:', err);
      c.innerHTML =
        '<div class="kx-ana-error kx-ana-full">' +
          '<div class="kx-ana-error-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg></div>' +
          '<div class="kx-ana-error-title">Error cargando estadísticas</div>' +
          '<div class="kx-ana-error-text">' + escapeHtml(err.message) + '</div>' +
          '<button class="kx-ana-error-btn" data-action="retry-stats">Reintentar</button>' +
        '</div>';
    }
  }

  /* ══════════════════════════════════════════
     📊 ACTIVITY CHART
     ══════════════════════════════════════════ */
  async function loadActivityChart() {
    var c = $('anaChart');
    if (!c) return;

    try {
      var days = analyticsPeriod === '7d' ? 7 : analyticsPeriod === '30d' ? 14 : 30;
      var dateFrom = new Date(Date.now() - days * 86400000).toISOString();

      var r = await db.from('analytics_events')
        .select('created_at, evento')
        .gte('created_at', dateFrom)
        .order('created_at', { ascending: true });

      var data = r.data || [];

      // Build day map
      var byDay = {};
      var dayLabels = [];
      for (var d = days - 1; d >= 0; d--) {
        var date = new Date(Date.now() - d * 86400000);
        var key = date.toISOString().split('T')[0];
        var label = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
        byDay[key] = 0;
        dayLabels.push({ key: key, label: label });
      }

      for (var i = 0; i < data.length; i++) {
        var dayKey = data[i].created_at.split('T')[0];
        if (byDay[dayKey] !== undefined) byDay[dayKey]++;
      }

      var maxVal = 1;
      for (var k in byDay) { if (byDay[k] > maxVal) maxVal = byDay[k]; }

      var showLabels = days <= 14;
      var barsHTML = '';
      for (var b = 0; b < dayLabels.length; b++) {
        var dl = dayLabels[b];
        var val = byDay[dl.key] || 0;
        var pct = Math.max(2, (val / maxVal) * 100);
        barsHTML +=
          '<div class="kx-ana-chart-bar-wrap">' +
            '<span class="kx-ana-chart-bar-value">' + val + '</span>' +
            '<div class="kx-ana-chart-bar" style="height:' + pct + '%" data-tooltip="' + escapeHtml(dl.label) + ': ' + val + ' eventos"></div>' +
            (showLabels ? '<span class="kx-ana-chart-bar-label">' + escapeHtml(dl.label) + '</span>' : '') +
          '</div>';
      }

      c.innerHTML =
        '<div class="kx-ana-section">' +
          '<div class="kx-ana-section-head">' +
            '<div class="kx-ana-section-icon">📈</div>' +
            '<h3 class="kx-ana-section-title">Actividad Diaria</h3>' +
            '<span class="kx-ana-section-line"></span>' +
          '</div>' +
          '<div class="kx-ana-chart">' +
            '<div class="kx-ana-chart-bars">' + barsHTML + '</div>' +
          '</div>' +
        '</div>';

    } catch (e) {
      console.error('Error chart:', e);
      c.innerHTML = '';
    }
  }

  /* ══════════════════════════════════════════
     📊 TOP CONTENT
     ══════════════════════════════════════════ */
  async function loadTopContent() {
    var c = $('anaTopGrid');
    if (!c) return;

    try {
      var results = await Promise.all([
        db.from('canciones').select('id, titulo, reproducciones, imagen_url, albumes(titulo)').order('reproducciones', { ascending: false }).limit(10),
        db.from('videos').select('id, titulo, visualizaciones, thumbnail_url').order('visualizaciones', { ascending: false }).limit(10),
        db.from('episodios').select('id, titulo, visualizaciones, numero, documentales(titulo)').order('visualizaciones', { ascending: false }).limit(5),
        db.from('profiles').select('full_name, role, created_at').order('created_at', { ascending: false }).limit(8)
      ]);

      var songs = results[0].data || [];
      var vids = results[1].data || [];
      var eps = results[2].data || [];
      var users = results[3].data || [];

      // === TOP SONGS ===
      var songsHTML =
        '<div class="kx-ana-section">' +
          '<div class="kx-ana-section-head">' +
            '<div class="kx-ana-section-icon">🎵</div>' +
            '<h3 class="kx-ana-section-title">Top Canciones</h3>' +
            '<span class="kx-ana-section-line"></span>' +
          '</div>' +
          '<div class="kx-ana-table">' +
            '<div class="kx-ana-table-header kx-ana-tbl-3col"><span>#</span><span>Canción</span><span style="text-align:center">▶ Plays</span></div>';

      if (songs.length) {
        var hasSongPlays = false;
        for (var i = 0; i < songs.length; i++) {
          var s = songs[i];
          var plays = s.reproducciones || 0;
          if (plays > 0) hasSongPlays = true;
          var rankCls = i < 1 ? 'gold' : i < 3 ? 'silver' : 'default';
          var rankText = i < 3 ? ['🥇','🥈','🥉'][i] : (i + 1);
          var albumInfo = s.albumes ? ' · ' + escapeHtml(s.albumes.titulo) : '';

          songsHTML +=
            '<div class="kx-ana-table-row kx-ana-tbl-3col">' +
              '<span class="kx-ana-tbl-rank kx-ana-tbl-rank--' + rankCls + '">' + rankText + '</span>' +
              '<span class="kx-ana-tbl-title">' + escapeHtml(s.titulo) + '<span class="kx-ana-tbl-title-sub">' + albumInfo + '</span></span>' +
              '<span class="kx-ana-tbl-num ' + (plays > 0 ? 'kx-ana-tbl-num--highlight' : 'kx-ana-tbl-num--muted') + '">' + plays.toLocaleString() + '</span>' +
            '</div>';
        }
        if (!hasSongPlays) {
          songsHTML += '<div class="kx-ana-tbl-note">⚠️ Las canciones aún no tienen reproducciones registradas</div>';
        }
      } else {
        songsHTML += '<div class="kx-ana-tbl-note">Sin canciones</div>';
      }
      songsHTML += '</div></div>';

      // === TOP VIDEOS ===
      var vidsHTML =
        '<div class="kx-ana-section">' +
          '<div class="kx-ana-section-head">' +
            '<div class="kx-ana-section-icon">🎬</div>' +
            '<h3 class="kx-ana-section-title">Top Videos</h3>' +
            '<span class="kx-ana-section-line"></span>' +
          '</div>' +
          '<div class="kx-ana-table">' +
            '<div class="kx-ana-table-header kx-ana-tbl-3col"><span>#</span><span>Video</span><span style="text-align:center">👁 Vistas</span></div>';

      if (vids.length) {
        var hasVideoViews = false;
        for (var j = 0; j < vids.length; j++) {
          var v = vids[j];
          var views = v.visualizaciones || 0;
          if (views > 0) hasVideoViews = true;
          var rankClsV = j < 1 ? 'gold' : j < 3 ? 'silver' : 'default';
          var rankTextV = j < 3 ? ['🥇','🥈','🥉'][j] : (j + 1);

          vidsHTML +=
            '<div class="kx-ana-table-row kx-ana-tbl-3col">' +
              '<span class="kx-ana-tbl-rank kx-ana-tbl-rank--' + rankClsV + '">' + rankTextV + '</span>' +
              '<span class="kx-ana-tbl-title">' + escapeHtml(v.titulo) + '</span>' +
              '<span class="kx-ana-tbl-num ' + (views > 0 ? 'kx-ana-tbl-num--highlight' : 'kx-ana-tbl-num--muted') + '">' + views.toLocaleString() + '</span>' +
            '</div>';
        }
        if (!hasVideoViews) {
          vidsHTML += '<div class="kx-ana-tbl-note">⚠️ Los videos aún no tienen vistas registradas</div>';
        }
      } else {
        vidsHTML += '<div class="kx-ana-tbl-note">Sin videos</div>';
      }
      vidsHTML += '</div></div>';

      // === TOP EPISODIOS ===
      var epsHTML = '';
      if (eps.length) {
        epsHTML =
          '<div class="kx-ana-section kx-ana-full">' +
            '<div class="kx-ana-section-head">' +
              '<div class="kx-ana-section-icon">🎞️</div>' +
              '<h3 class="kx-ana-section-title">Top Episodios</h3>' +
              '<span class="kx-ana-section-line"></span>' +
            '</div>' +
            '<div class="kx-ana-table">' +
              '<div class="kx-ana-table-header kx-ana-tbl-3col"><span>#</span><span>Episodio</span><span style="text-align:center">👁 Vistas</span></div>';

        for (var e = 0; e < eps.length; e++) {
          var ep = eps[e];
          var epViews = ep.visualizaciones || 0;
          var docName = ep.documentales ? ' · ' + escapeHtml(ep.documentales.titulo) : '';

          epsHTML +=
            '<div class="kx-ana-table-row kx-ana-tbl-3col">' +
              '<span class="kx-ana-tbl-rank kx-ana-tbl-rank--default">' + (e + 1) + '</span>' +
              '<span class="kx-ana-tbl-title">Ep. ' + ep.numero + ' — ' + escapeHtml(ep.titulo) + '<span class="kx-ana-tbl-title-sub">' + docName + '</span></span>' +
              '<span class="kx-ana-tbl-num">' + epViews.toLocaleString() + '</span>' +
            '</div>';
        }
        epsHTML += '</div></div>';
      }

      // === RECENT USERS ===
      var usersHTML =
        '<div class="kx-ana-section kx-ana-full">' +
          '<div class="kx-ana-section-head">' +
            '<div class="kx-ana-section-icon">👥</div>' +
            '<h3 class="kx-ana-section-title">Usuarios Recientes</h3>' +
            '<span class="kx-ana-section-line"></span>' +
          '</div>' +
          '<div class="kx-ana-table">' +
            '<div class="kx-ana-table-header kx-ana-tbl-3col"><span>Usuario</span><span style="text-align:center">Rol</span><span style="text-align:center">Registro</span></div>';

      if (users.length) {
        for (var u = 0; u < users.length; u++) {
          var user = users[u];
          var fecha = new Date(user.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
          var roleCls = user.role === 'admin' ? 'admin' : user.role === 'artista' ? 'artist' : 'fan';

          usersHTML +=
            '<div class="kx-ana-table-row kx-ana-tbl-3col">' +
              '<span class="kx-ana-tbl-title">' + escapeHtml(user.full_name || 'Sin nombre') + '</span>' +
              '<span style="text-align:center"><span class="kx-ana-tbl-badge kx-ana-tbl-badge--' + roleCls + '">' + escapeHtml(user.role || 'fan') + '</span></span>' +
              '<span class="kx-ana-tbl-num kx-ana-tbl-num--muted">' + fecha + '</span>' +
            '</div>';
        }
      }
      usersHTML += '</div></div>';

      c.innerHTML =
        '<div class="kx-ana-grid-2col">' +
          songsHTML + vidsHTML + epsHTML + usersHTML +
        '</div>';

    } catch (err) {
      console.error('Error top content:', err);
      c.innerHTML =
        '<div class="kx-ana-error">' +
          '<div class="kx-ana-error-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg></div>' +
          '<div class="kx-ana-error-title">Error cargando rankings</div>' +
          '<div class="kx-ana-error-text">' + escapeHtml(err.message) + '</div>' +
          '<button class="kx-ana-error-btn" data-action="retry-all">Reintentar</button>' +
        '</div>';
    }
  }

  /* ══════════════════════════════════════════
     🖱️ EVENT DELEGATION
     ══════════════════════════════════════════ */
  var panel = $('panel-analytics');
  if (panel) {
    panel.addEventListener('click', function (e) {
      var target = e.target;

      // Period buttons
      var periodBtn = target.closest('.kx-ana-period');
      if (periodBtn) {
        analyticsPeriod = periodBtn.getAttribute('data-period');
        K.loadAnalytics();
        return;
      }

      // Refresh button
      var refreshBtn = target.closest('#anaRefreshBtn');
      if (refreshBtn) {
        K.loadAnalytics();
        return;
      }

      // Retry buttons
      var retryBtn = target.closest('[data-action="retry-stats"]') || target.closest('[data-action="retry-all"]');
      if (retryBtn) {
        K.loadAnalytics();
        return;
      }
    });
  }

  // Cleanup old globals
  window._analyticsPeriod = function (p) {
    analyticsPeriod = p;
    K.loadAnalytics();
  };

})();