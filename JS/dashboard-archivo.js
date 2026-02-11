/* ============================================
   📁 DASHBOARD-ARCHIVO.JS — KXON
   Archivo de compras: carga, render, preview,
   tabs, solicitudes pendientes
   ============================================ */
(function () {

    var db = window.db;
    var K = window.KXON;

    /* ══════════════════════════════════════════
       📁 CARGAR ARCHIVO
       ══════════════════════════════════════════ */
    K.loadArchivo = async function () {
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

            renderArchivoStats();
            renderArchivoGrid();
            renderArchivoPending();
        } catch (e) {
            console.error('Error cargando archivo:', e);
            document.getElementById('archivoGrid').innerHTML =
                '<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Error al cargar tu archivo</div></div>';
        }
    };

    /* ══════════════════════════════════════════
       📊 STATS
       ══════════════════════════════════════════ */
    function renderArchivoStats() {
        var totalBeats = 0, totalCanciones = 0, totalInvertido = 0;
        for (var i = 0; i < K.archivoData.length; i++) {
            var compra = K.archivoData[i];
            totalInvertido += Number(compra.precio_pagado || 0);
            if (compra.beats) {
                if (compra.beats.tipo === 'cancion') totalCanciones++;
                else totalBeats++;
            } else { totalBeats++; }
        }
        document.getElementById('archivoStatTotal').textContent = K.archivoData.length;
        document.getElementById('archivoStatBeats').textContent = totalBeats;
        document.getElementById('archivoStatCanciones').textContent = totalCanciones;
        document.getElementById('archivoStatInvertido').textContent = K.formatPrice(totalInvertido);
    }

    /* ══════════════════════════════════════════
       🔀 TABS
       ══════════════════════════════════════════ */
    window._archivoTab = function (tab) {
        K.archivoCurrentTab = tab;
        var tabs = document.querySelectorAll('[data-archivo-tab]');
        for (var i = 0; i < tabs.length; i++) {
            tabs[i].classList.remove('active');
            if (tabs[i].getAttribute('data-archivo-tab') === tab) tabs[i].classList.add('active');
        }
        renderArchivoGrid();
    };

    /* ══════════════════════════════════════════
       📦 RENDER GRID
       ══════════════════════════════════════════ */
    function renderArchivoGrid() {
        var c = document.getElementById('archivoGrid');
        var filtered = [];
        for (var i = 0; i < K.archivoData.length; i++) {
            var compra = K.archivoData[i];
            if (!compra.beats) continue;
            var tipo = compra.beats.tipo || 'beat';
            if (K.archivoCurrentTab === 'todos' || tipo === K.archivoCurrentTab) filtered.push(compra);
        }

        if (!filtered.length) {
            var tabLabel = K.archivoCurrentTab === 'todos' ? 'compras' : K.archivoCurrentTab === 'beat' ? 'beats' : 'canciones';
            c.innerHTML = '<div class="empty-state"><div class="empty-icon">' +
                (K.archivoCurrentTab === 'cancion' ? '🎤' : '🎹') +
                '</div><div class="empty-title">Sin ' + tabLabel + ' aún</div>' +
                '<div class="empty-text">Visita el Marketplace para comprar</div></div>';
            return;
        }

        var h = '';
        for (var j = 0; j < filtered.length; j++) {
            var compra2 = filtered[j];
            var beat = compra2.beats;
            var img = beat.imagen_url || 'https://placehold.co/200x200/111/333?text=♪';
            var tipo2 = beat.tipo || 'beat';
            var badgeClass = tipo2 === 'beat' ? 'cover-badge-beat' : 'cover-badge-cancion';
            var badgeText = tipo2 === 'beat' ? 'BEAT' : 'CANCIÓN';
            var fecha = new Date(compra2.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

            h += '<div class="archivo-card">';
            h += '<span class="archivo-status-badge status-confirmada">✓ Comprado</span>';
            h += '<div class="archivo-card-header">';
            h += '<div class="archivo-card-cover"><img src="' + img + '" alt="" onerror="this.src=\'https://placehold.co/200x200/111/333?text=♪\'"><span class="archivo-card-cover-badge ' + badgeClass + '">' + badgeText + '</span></div>';
            h += '<div class="archivo-card-info">';
            h += '<div class="archivo-card-title">' + beat.titulo + '</div>';
            h += '<div class="archivo-card-desc">' + (beat.descripcion || 'Sin descripción') + '</div>';
            h += '<div class="archivo-card-meta">';
            h += '<span class="archivo-meta-item archivo-meta-precio"><span class="meta-icon">💰</span> ' + K.formatPrice(compra2.precio_pagado) + '</span>';
            h += '<span class="archivo-meta-item archivo-meta-fecha"><span class="meta-icon">📅</span> ' + fecha + '</span>';
            h += '</div></div></div>';

            /* ── Audios ── */
            h += '<div class="archivo-card-audios">';
            if (tipo2 === 'beat') {
                h += '<div class="archivo-audio-item" onclick="window._archivoPlayAudio(\'' + beat.archivo_url + '\', this)">';
                h += '<button class="archivo-audio-play">▶</button>';
                h += '<span class="archivo-audio-label">' + beat.titulo + '</span>';
                h += '<span class="archivo-audio-tag">Beat</span></div>';
            } else {
                if (beat.archivo_url) {
                    h += '<div class="archivo-audio-item" onclick="window._archivoPlayAudio(\'' + beat.archivo_url + '\', this)">';
                    h += '<button class="archivo-audio-play">▶</button>';
                    h += '<span class="archivo-audio-label">Canción Completa</span>';
                    h += '<span class="archivo-audio-tag">Completa</span></div>';
                }
                if (beat.archivo_voz_url) {
                    h += '<div class="archivo-audio-item" onclick="window._archivoPlayAudio(\'' + beat.archivo_voz_url + '\', this)">';
                    h += '<button class="archivo-audio-play">▶</button>';
                    h += '<span class="archivo-audio-label">Solo Voz</span>';
                    h += '<span class="archivo-audio-tag">Voz</span></div>';
                }
                if (beat.archivo_beat_url) {
                    h += '<div class="archivo-audio-item" onclick="window._archivoPlayAudio(\'' + beat.archivo_beat_url + '\', this)">';
                    h += '<button class="archivo-audio-play">▶</button>';
                    h += '<span class="archivo-audio-label">Solo Beat</span>';
                    h += '<span class="archivo-audio-tag">Beat</span></div>';
                }
            }
            h += '</div>';

            /* ── Botones descarga ── */
            h += '<div class="archivo-card-actions">';
            h += '<a href="' + beat.archivo_url + '" download class="archivo-btn-download" target="_blank">⬇ Descargar</a>';
            if (tipo2 === 'cancion') {
                if (beat.archivo_voz_url) h += '<a href="' + beat.archivo_voz_url + '" download class="archivo-btn-listen" target="_blank">🎤 Voz</a>';
                if (beat.archivo_beat_url) h += '<a href="' + beat.archivo_beat_url + '" download class="archivo-btn-listen" target="_blank">🎹 Beat</a>';
            }
            h += '</div></div>';
        }
        c.innerHTML = h;
    }

    /* ══════════════════════════════════════════
       🔊 REPRODUCIR AUDIO ARCHIVO
       ══════════════════════════════════════════ */
    window._archivoPlayAudio = function (url, element) {
        /* Si ya está sonando la misma URL → pausar */
        if (K.archivoCurrentPlayingUrl === url && !K.archivoPreviewAudio.paused) {
            K.archivoPreviewAudio.pause();
            K.archivoCurrentPlayingUrl = '';
            var allItems = document.querySelectorAll('.archivo-audio-item');
            for (var i = 0; i < allItems.length; i++) {
                allItems[i].classList.remove('playing');
                var btn = allItems[i].querySelector('.archivo-audio-play');
                if (btn) btn.textContent = '▶';
            }
            document.getElementById('playerBar').classList.remove('show');
            K.isPlaying = false;
            return;
        }

        /* Pausar otros reproductores */
        K.audioEl.pause();
        K.marketPreviewAudio.pause();
        K.radioAudio.pause();

        /* Quitar estado playing de todos */
        var allItems2 = document.querySelectorAll('.archivo-audio-item');
        for (var j = 0; j < allItems2.length; j++) {
            allItems2[j].classList.remove('playing');
            var btn2 = allItems2[j].querySelector('.archivo-audio-play');
            if (btn2) btn2.textContent = '▶';
        }

        /* Reproducir */
        K.archivoPreviewAudio.src = url;
        K.archivoPreviewAudio.volume = 0.7;
        K.archivoPreviewAudio.play();
        K.archivoCurrentPlayingUrl = url;

        if (element) {
            element.classList.add('playing');
            var playBtn = element.querySelector('.archivo-audio-play');
            if (playBtn) playBtn.textContent = '⏸';
        }

        var label = element ? element.querySelector('.archivo-audio-label') : null;
        var trackName = label ? label.textContent : 'Archivo KXON';
        document.getElementById('playerBar').classList.add('show');
        document.getElementById('playerTitle').textContent = trackName;
        document.getElementById('playerCover').src = '';
        document.getElementById('playerPlayPause').textContent = '⏸';
        K.isPlaying = true;
        K.currentPlaylist = [];
        K.currentTrackIndex = -1;
    };

    /* ── timeupdate ── */
    K.archivoPreviewAudio.addEventListener('timeupdate', function () {
        if (!K.archivoPreviewAudio.duration) return;
        var p = (K.archivoPreviewAudio.currentTime / K.archivoPreviewAudio.duration) * 100;
        document.getElementById('progressFill').style.width = p + '%';
        document.getElementById('playerCurrentTime').textContent = K.formatTime(K.archivoPreviewAudio.currentTime);
        document.getElementById('playerDuration').textContent = K.formatTime(K.archivoPreviewAudio.duration);
    });

    /* ── ended ── */
    K.archivoPreviewAudio.addEventListener('ended', function () {
        K.archivoCurrentPlayingUrl = '';
        var allItems = document.querySelectorAll('.archivo-audio-item');
        for (var i = 0; i < allItems.length; i++) {
            allItems[i].classList.remove('playing');
            var btn = allItems[i].querySelector('.archivo-audio-play');
            if (btn) btn.textContent = '▶';
        }
        document.getElementById('playerPlayPause').textContent = '▶';
        document.getElementById('progressFill').style.width = '0%';
        K.isPlaying = false;
    });

    /* ══════════════════════════════════════════
       ⏳ SOLICITUDES PENDIENTES
       ══════════════════════════════════════════ */
    function renderArchivoPending() {
        var section = document.getElementById('archivoPendingSection');
        var c = document.getElementById('archivoPendingList');
        if (!K.archivoSolicitudes || K.archivoSolicitudes.length === 0) {
            section.style.display = 'none';
            return;
        }
        section.style.display = 'block';
        var h = '';
        for (var i = 0; i < K.archivoSolicitudes.length; i++) {
            var sol = K.archivoSolicitudes[i];
            var beatTitle = sol.beats ? sol.beats.titulo : 'Producto';
            var beatImg = sol.beats ? (sol.beats.imagen_url || 'https://placehold.co/100x100/111/333?text=♪') : '';
            var beatPrecio = sol.beats ? K.formatPrice(sol.beats.precio) : '$0';
            var fecha = new Date(sol.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

            h += '<div class="archivo-pending-card">';
            h += '<div class="archivo-pending-cover"><img src="' + beatImg + '" alt="" onerror="this.src=\'https://placehold.co/100x100/111/333?text=♪\'"></div>';
            h += '<div class="archivo-pending-info"><div class="archivo-pending-title">' + beatTitle + '</div><div class="archivo-pending-detail">' + beatPrecio + ' — Enviado el ' + fecha + '</div></div>';
            h += '<div class="archivo-pending-status"><span class="archivo-status-badge status-pendiente">⏳ Pendiente</span></div>';
            h += '</div>';
        }
        c.innerHTML = h;
    }

})();