/* ============================================
   📊 DASHBOARD-ANALYTICS.JS — KXON
   Panel Analytics para Admin
   ✅ FIX: Contadores reales de plays y vistas
   ============================================ */
(function () {

    var db = window.db;
    var K = window.KXON;

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

    /* Hook playTrack para tracking analytics event */
    var _origPlay = K.playTrack;
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

    /* ══════════════════════════════════════════
       📊 CARGAR ANALYTICS (solo admin)
       ══════════════════════════════════════════ */
    var analyticsPeriod = '30d';

    K.loadAnalytics = async function () {
        if (!K.isAdmin) return;

        var panel = document.getElementById('panel-analytics');
        if (!panel) return;

        panel.innerHTML =
            '<div class="panel-header">' +
            '<h1 class="panel-title">📊 Analytics</h1>' +
            '<p class="panel-desc">Estadísticas y métricas de la plataforma</p>' +
            '</div>' +
            '<div class="analytics-header-row">' +
            '<div class="analytics-period">' +
            '<button class="analytics-period-btn' + (analyticsPeriod === '7d' ? ' active' : '') + '" onclick="window._analyticsPeriod(\'7d\')">7 días</button>' +
            '<button class="analytics-period-btn' + (analyticsPeriod === '30d' ? ' active' : '') + '" onclick="window._analyticsPeriod(\'30d\')">30 días</button>' +
            '<button class="analytics-period-btn' + (analyticsPeriod === '90d' ? ' active' : '') + '" onclick="window._analyticsPeriod(\'90d\')">90 días</button>' +
            '<button class="analytics-period-btn' + (analyticsPeriod === 'all' ? ' active' : '') + '" onclick="window._analyticsPeriod(\'all\')">Todo</button>' +
            '</div>' +
            '<button class="analytics-refresh" onclick="window.KXON.loadAnalytics()">🔄 Actualizar</button>' +
            '</div>' +
            '<div class="analytics-stats" id="analyticsStats"><div class="empty-state"><div class="empty-icon">⏳</div><div class="empty-title">Cargando estadísticas...</div></div></div>' +
            '<div class="analytics-section" id="analyticsChart"></div>' +
            '<div class="analytics-top-grid" id="analyticsTopGrid"></div>';

        await Promise.all([
            loadOverviewStats(),
            loadActivityChart(),
            loadTopContent()
        ]);
    };

    window._analyticsPeriod = function (p) {
        analyticsPeriod = p;
        K.loadAnalytics();
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
        var c = document.getElementById('analyticsStats');
        if (!c) return;

        try {
            var dateFrom = getDateFrom();

            /* Total users */
            var users = await db.from('profiles').select('id', { count: 'exact', head: true });
            var totalUsers = users.count || 0;

            /* ✅ FIX: Total plays — REAL desde la tabla canciones */
            var playsResult = await db.from('canciones').select('reproducciones');
            var totalPlaysReal = 0;
            if (playsResult.data) {
                for (var p = 0; p < playsResult.data.length; p++) {
                    totalPlaysReal += (playsResult.data[p].reproducciones || 0);
                }
            }

            /* Plays en período (desde analytics_events) */
            var playsEvents = await db.from('analytics_events')
                .select('id', { count: 'exact', head: true })
                .eq('evento', 'play_song')
                .gte('created_at', dateFrom);
            var totalPlaysPeriod = playsEvents.count || 0;

            /* Total sales */
            var sales = await db.from('compras')
                .select('id, precio_pagado', { count: 'exact' })
                .gte('created_at', dateFrom);
            var totalSales = sales.count || 0;
            var totalRevenue = 0;
            if (sales.data) {
                for (var i = 0; i < sales.data.length; i++) {
                    totalRevenue += Number(sales.data[i].precio_pagado || 0);
                }
            }

            /* ✅ FIX: Total video views — REAL desde la tabla */
            var vids = await db.from('videos').select('visualizaciones');
            var totalViews = 0;
            if (vids.data) {
                for (var j = 0; j < vids.data.length; j++) {
                    totalViews += (vids.data[j].visualizaciones || 0);
                }
            }

            /* Episodios views también */
            var eps = await db.from('episodios').select('visualizaciones');
            var totalEpViews = 0;
            if (eps.data) {
                for (var e = 0; e < eps.data.length; e++) {
                    totalEpViews += (eps.data[e].visualizaciones || 0);
                }
            }

            /* Total favorites */
            var favs = await db.from('favoritos')
                .select('id', { count: 'exact', head: true })
                .gte('created_at', dateFrom);
            var totalFavs = favs.count || 0;

            /* Active subscriptions */
            var subs = await db.from('suscripciones')
                .select('id', { count: 'exact', head: true })
                .eq('estado', 'activa');
            var totalSubs = subs.count || 0;

            c.innerHTML =
                '<div class="analytics-stat-card stat-users">' +
                '<div class="analytics-stat-header"><span class="analytics-stat-icon">👥</span></div>' +
                '<div class="analytics-stat-value">' + totalUsers + '</div>' +
                '<div class="analytics-stat-label">Usuarios totales</div>' +
                '</div>' +

                '<div class="analytics-stat-card stat-plays">' +
                '<div class="analytics-stat-header"><span class="analytics-stat-icon">▶️</span></div>' +
                '<div class="analytics-stat-value">' + totalPlaysReal.toLocaleString() + '</div>' +
                '<div class="analytics-stat-label">Reproducciones totales' + (analyticsPeriod !== 'all' ? ' · ' + totalPlaysPeriod + ' en período' : '') + '</div>' +
                '</div>' +

                '<div class="analytics-stat-card stat-sales">' +
                '<div class="analytics-stat-header"><span class="analytics-stat-icon">💰</span></div>' +
                '<div class="analytics-stat-value">' + K.formatPrice(totalRevenue) + '</div>' +
                '<div class="analytics-stat-label">' + totalSales + ' ventas</div>' +
                '</div>' +

                '<div class="analytics-stat-card stat-views">' +
                '<div class="analytics-stat-header"><span class="analytics-stat-icon">👁</span></div>' +
                '<div class="analytics-stat-value">' + (totalViews + totalEpViews).toLocaleString() + '</div>' +
                '<div class="analytics-stat-label">Vistas totales · ' + totalViews + ' videos · ' + totalEpViews + ' episodios</div>' +
                '</div>' +

                '<div class="analytics-stat-card stat-favs">' +
                '<div class="analytics-stat-header"><span class="analytics-stat-icon">❤️</span></div>' +
                '<div class="analytics-stat-value">' + totalFavs.toLocaleString() + '</div>' +
                '<div class="analytics-stat-label">Favoritos</div>' +
                '</div>' +

                '<div class="analytics-stat-card stat-subs">' +
                '<div class="analytics-stat-header"><span class="analytics-stat-icon">🎫</span></div>' +
                '<div class="analytics-stat-value">' + totalSubs + '</div>' +
                '<div class="analytics-stat-label">Suscripciones activas</div>' +
                '</div>';

        } catch (err) {
            console.error('Error analytics stats:', err);
            c.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Error cargando stats</div><div class="empty-text">' + err.message + '</div></div>';
        }
    }

    /* ══════════════════════════════════════════
       📊 ACTIVITY CHART
       ══════════════════════════════════════════ */
    async function loadActivityChart() {
        var c = document.getElementById('analyticsChart');
        if (!c) return;

        try {
            var days = analyticsPeriod === '7d' ? 7 : analyticsPeriod === '30d' ? 14 : 30;
            var dateFrom = new Date(Date.now() - days * 86400000).toISOString();

            var r = await db.from('analytics_events')
                .select('created_at, evento')
                .gte('created_at', dateFrom)
                .order('created_at', { ascending: true });

            var data = r.data || [];

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
            for (var j = 0; j < dayLabels.length; j++) {
                var dl = dayLabels[j];
                var val = byDay[dl.key] || 0;
                var pct = Math.max(2, (val / maxVal) * 100);
                barsHTML +=
                    '<div class="chart-bar-wrapper">' +
                    '<span class="chart-bar-value">' + val + '</span>' +
                    '<div class="chart-bar bar-plays" style="height:' + pct + '%" title="' + dl.label + ': ' + val + ' eventos"></div>' +
                    (showLabels ? '<span class="chart-bar-label">' + dl.label + '</span>' : '') +
                    '</div>';
            }

            c.innerHTML =
                '<div class="analytics-section-title">📈 Actividad diaria</div>' +
                '<div class="analytics-chart"><div class="chart-bars">' + barsHTML + '</div></div>';

        } catch (e) {
            console.error('Error chart:', e);
            c.innerHTML = '';
        }
    }

    /* ══════════════════════════════════════════
       📊 TOP CONTENT — ✅ FIX COMPLETO
       ══════════════════════════════════════════ */
    async function loadTopContent() {
        var c = document.getElementById('analyticsTopGrid');
        if (!c) return;

        try {
            /* ✅ FIX: Top canciones — ordenar por reproducciones DESC, filtrar > 0 */
            var songs = await db.from('canciones')
                .select('id, titulo, reproducciones, imagen_url, albumes(titulo)')
                .order('reproducciones', { ascending: false })
                .limit(10);

            var songsHTML = '<div class="analytics-section">' +
                '<div class="analytics-section-title">🎵 Top Canciones (por reproducciones)</div>' +
                '<div class="analytics-table">' +
                '<div class="analytics-table-header table-3col"><span>#</span><span>Canción</span><span style="text-align:center">▶ Plays</span></div>';

            if (songs.data && songs.data.length) {
                var hasSongPlays = false;
                for (var i = 0; i < songs.data.length; i++) {
                    var s = songs.data[i];
                    var plays = s.reproducciones || 0;
                    if (plays > 0) hasSongPlays = true;
                    var albumInfo = s.albumes ? ' · ' + s.albumes.titulo : '';
                    songsHTML +=
                        '<div class="analytics-table-row table-3col">' +
                        '<span class="table-cell-num" style="text-align:left;color:' + (i < 3 ? 'var(--acento-dorado)' : 'var(--plata-oscura)') + ';">' + (i < 3 ? ['🥇','🥈','🥉'][i] : (i + 1)) + '</span>' +
                        '<span class="table-cell-title" title="' + s.titulo + albumInfo + '">' + s.titulo + '<span style="font-size:.65rem;color:var(--plata-oscura);font-weight:400;">' + albumInfo + '</span></span>' +
                        '<span class="table-cell-num" style="color:' + (plays > 0 ? 'var(--plata-blanca)' : 'var(--plata-oscura)') + ';font-size:.9rem;">' + plays.toLocaleString() + '</span>' +
                        '</div>';
                }
                if (!hasSongPlays) {
                    songsHTML += '<div style="padding:12px 20px;font-size:.75rem;color:var(--plata-oscura);text-align:center;border-top:1px solid rgba(255,255,255,.04);">⚠️ Las canciones aún no tienen reproducciones registradas. Reproduce canciones para ver datos aquí.</div>';
                }
            } else {
                songsHTML += '<div class="analytics-table-row"><span style="grid-column:1/-1;text-align:center;color:var(--plata-oscura);">Sin canciones</span></div>';
            }
            songsHTML += '</div></div>';

            /* ✅ FIX: Top videos — ordenar por visualizaciones DESC */
            var vids = await db.from('videos')
                .select('id, titulo, visualizaciones, thumbnail_url')
                .order('visualizaciones', { ascending: false })
                .limit(10);

            var vidsHTML = '<div class="analytics-section">' +
                '<div class="analytics-section-title">🎬 Top Videos (por vistas)</div>' +
                '<div class="analytics-table">' +
                '<div class="analytics-table-header table-3col"><span>#</span><span>Video</span><span style="text-align:center">👁 Vistas</span></div>';

            if (vids.data && vids.data.length) {
                var hasVideoViews = false;
                for (var j = 0; j < vids.data.length; j++) {
                    var v = vids.data[j];
                    var views = v.visualizaciones || 0;
                    if (views > 0) hasVideoViews = true;
                    vidsHTML +=
                        '<div class="analytics-table-row table-3col">' +
                        '<span class="table-cell-num" style="text-align:left;color:' + (j < 3 ? 'var(--acento-dorado)' : 'var(--plata-oscura)') + ';">' + (j < 3 ? ['🥇','🥈','🥉'][j] : (j + 1)) + '</span>' +
                        '<span class="table-cell-title">' + v.titulo + '</span>' +
                        '<span class="table-cell-num" style="color:' + (views > 0 ? 'var(--plata-blanca)' : 'var(--plata-oscura)') + ';font-size:.9rem;">' + views.toLocaleString() + '</span>' +
                        '</div>';
                }
                if (!hasVideoViews) {
                    vidsHTML += '<div style="padding:12px 20px;font-size:.75rem;color:var(--plata-oscura);text-align:center;border-top:1px solid rgba(255,255,255,.04);">⚠️ Los videos aún no tienen vistas registradas. Reproduce videos para ver datos aquí.</div>';
                }
            } else {
                vidsHTML += '<div class="analytics-table-row"><span style="grid-column:1/-1;text-align:center;color:var(--plata-oscura);">Sin videos</span></div>';
            }
            vidsHTML += '</div></div>';

            /* ✅ NUEVO: Top episodios */
            var episodios = await db.from('episodios')
                .select('id, titulo, visualizaciones, numero, documentales(titulo)')
                .order('visualizaciones', { ascending: false })
                .limit(5);

            var epsHTML = '';
            if (episodios.data && episodios.data.length) {
                epsHTML = '<div class="analytics-section" style="grid-column:1/-1;">' +
                    '<div class="analytics-section-title">🎞️ Top Episodios</div>' +
                    '<div class="analytics-table">' +
                    '<div class="analytics-table-header table-3col"><span>#</span><span>Episodio</span><span style="text-align:center">👁 Vistas</span></div>';

                for (var e = 0; e < episodios.data.length; e++) {
                    var ep = episodios.data[e];
                    var epViews = ep.visualizaciones || 0;
                    var docName = ep.documentales ? ' · ' + ep.documentales.titulo : '';
                    epsHTML +=
                        '<div class="analytics-table-row table-3col">' +
                        '<span class="table-cell-num" style="text-align:left;">' + (e + 1) + '</span>' +
                        '<span class="table-cell-title">Ep. ' + ep.numero + ' — ' + ep.titulo + '<span style="font-size:.65rem;color:var(--plata-oscura);font-weight:400;">' + docName + '</span></span>' +
                        '<span class="table-cell-num">' + epViews.toLocaleString() + '</span>' +
                        '</div>';
                }
                epsHTML += '</div></div>';
            }

            /* Recent users */
            var recentUsers = await db.from('profiles')
                .select('full_name, role, created_at')
                .order('created_at', { ascending: false })
                .limit(8);

            var usersHTML = '<div class="analytics-section" style="grid-column:1/-1;">' +
                '<div class="analytics-section-title">👥 Usuarios recientes</div>' +
                '<div class="analytics-table">' +
                '<div class="analytics-table-header table-3col"><span>Usuario</span><span style="text-align:center">Rol</span><span style="text-align:center">Registro</span></div>';

            if (recentUsers.data && recentUsers.data.length) {
                for (var u = 0; u < recentUsers.data.length; u++) {
                    var user = recentUsers.data[u];
                    var fecha = new Date(user.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
                    var roleColor = user.role === 'admin' ? 'var(--acento-dorado)' : user.role === 'artista' ? 'var(--acento-principal)' : 'var(--acento-exito)';
                    usersHTML +=
                        '<div class="analytics-table-row table-3col">' +
                        '<span class="table-cell-title">' + (user.full_name || 'Sin nombre') + '</span>' +
                        '<span class="table-cell-badge"><span class="badge" style="font-size:.58rem;color:' + roleColor + ';">' + (user.role || 'fan') + '</span></span>' +
                        '<span class="table-cell-num">' + fecha + '</span>' +
                        '</div>';
                }
            }
            usersHTML += '</div></div>';

            c.innerHTML = songsHTML + vidsHTML + epsHTML + usersHTML;

        } catch (err) {
            console.error('Error top content:', err);
            c.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Error cargando rankings</div><div class="empty-text">' + err.message + '</div></div>';
        }
    }

})();