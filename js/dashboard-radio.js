/* ============================================
   📻 DASHBOARD-RADIO.JS — KXON
   Radio KXON: reproducción continua, cola, shuffle
   FIX: Conflicto con player bar resuelto
   ============================================ */
(function () {

    var db = window.db;
    var K = window.KXON;
    var radioAudio = K.radioAudio;

    /* ══════════════════════════════════════════
       📻 INICIALIZAR RADIO
       ══════════════════════════════════════════ */
    K.initRadio = async function () {
        if (K.radioReady && K.radioPlaylist.length > 0) { renderRadioQueue(); return; }
        try {
            var r = await db.from('canciones').select('*, albumes(titulo, imagen_url)').order('created_at', { ascending: false });
            if (r.error) throw r.error;
            K.radioPlaylist = (r.data || []).map(function (s) {
                return {
                    id: s.id, titulo: s.titulo, archivo_url: s.archivo_url,
                    imagen_url: s.imagen_url || (s.albumes ? s.albumes.imagen_url : '') || '',
                    album: s.albumes ? s.albumes.titulo : 'KXON Radio',
                    duracion: s.duracion || '--:--', reproducciones: s.reproducciones || 0
                };
            });
            K.radioShuffled = shuffleArr([].concat(K.radioPlaylist));
            var c = document.getElementById('radioQueueCount');
            if (c) c.textContent = K.radioPlaylist.length + ' canciones';
            renderRadioQueue();
            K.radioReady = true;
        } catch (e) { console.error('Radio error:', e); }
    };

    /* ── Helpers ── */
    function shuffleArr(a) {
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
    }

    function getRL() { return K.radioShuffleMode ? K.radioShuffled : K.radioPlaylist; }

    /* ══════════════════════════════════════════
       ▶ PLAY / TOGGLE / NEXT / PREV
       ══════════════════════════════════════════ */
    function radioPlay(idx) {
        var list = getRL();
        if (!list || !list[idx]) return;
        K.radioIndex = idx;
        var t = list[idx];

        // ✅ FIX: Detener TODAS las otras fuentes de audio antes de reproducir radio
        K.stopAllAudio('radio');
        K.activeSource = 'radio';

        radioAudio.src = t.archivo_url;
        radioAudio.volume = K.radioVolume;
        radioAudio.play();
        K.radioIsPlaying = true;

        // Actualizar UI del radio
        var d = document.getElementById('radioDisc'); if (d) d.classList.add('spinning');
        var di = document.getElementById('radioDiscImg'); if (di) di.src = t.imagen_url || 'https://placehold.co/300x300/111/333?text=♪';
        var oa = document.getElementById('radioOnAir'); if (oa) oa.classList.add('active');
        var pb = document.getElementById('radioPlayBtn'); if (pb) pb.classList.add('playing');
        var pi = document.getElementById('radioPlayIcon'); if (pi) pi.textContent = '⏸';
        var tt = document.getElementById('radioTrackTitle'); if (tt) tt.textContent = t.titulo;
        var ta = document.getElementById('radioTrackAlbum'); if (ta) ta.textContent = t.album;
        var gl = document.getElementById('radioProgressGlow'); if (gl) gl.classList.add('visible');

        updateRQHighlight();

        // ✅ FIX: Actualizar player bar con info de radio
        document.getElementById('playerBar').classList.add('show');
        document.getElementById('playerTitle').textContent = t.titulo;
        document.getElementById('playerCover').src = t.imagen_url || '';
        document.getElementById('playerPlayPause').textContent = '⏸';
        K.isPlaying = true;

        // Actualizar fav state si existe la función
        if (typeof K.updateRadioFavState === 'function') {
            setTimeout(K.updateRadioFavState, 100);
        }
        if (typeof K.updatePlayerFavState === 'function') {
            setTimeout(K.updatePlayerFavState, 100);
        }

        db.from('canciones').update({ reproducciones: (t.reproducciones || 0) + 1 }).eq('id', t.id);
    }

    function radioToggle() {
        if (K.radioPlaylist.length === 0) { K.showToast('No hay canciones', 'error'); return; }
        if (K.radioIsPlaying) {
            radioAudio.pause();
            K.radioIsPlaying = false;
            var d = document.getElementById('radioDisc'); if (d) d.classList.remove('spinning');
            var pb = document.getElementById('radioPlayBtn'); if (pb) pb.classList.remove('playing');
            var pi = document.getElementById('radioPlayIcon'); if (pi) pi.textContent = '▶';
            document.getElementById('playerPlayPause').textContent = '▶';
            K.isPlaying = false;
        } else {
            if (K.radioIndex === -1) {
                radioPlay(0);
            } else {
                // ✅ FIX: Detener otras fuentes antes de reanudar radio
                K.stopAllAudio('radio');
                K.activeSource = 'radio';

                radioAudio.play();
                K.radioIsPlaying = true;
                var d2 = document.getElementById('radioDisc'); if (d2) d2.classList.add('spinning');
                var pb2 = document.getElementById('radioPlayBtn'); if (pb2) pb2.classList.add('playing');
                var pi2 = document.getElementById('radioPlayIcon'); if (pi2) pi2.textContent = '⏸';
                document.getElementById('playerPlayPause').textContent = '⏸';
                K.isPlaying = true;
            }
        }
    }

    function radioNextT() {
        var list = getRL(); if (list.length === 0) return;
        var n = K.radioIndex + 1;
        if (n >= list.length) { if (K.radioShuffleMode) K.radioShuffled = shuffleArr([].concat(K.radioPlaylist)); n = 0; }
        radioPlay(n);
    }

    function radioPrevT() {
        var list = getRL(); if (list.length === 0) return;
        if (radioAudio.currentTime > 3) { radioAudio.currentTime = 0; return; }
        var p = K.radioIndex - 1; if (p < 0) p = list.length - 1;
        radioPlay(p);
    }

    function radioShuffleToggle() {
        K.radioShuffleMode = !K.radioShuffleMode;
        var btn = document.getElementById('radioShuffle');
        if (K.radioShuffleMode) {
            if (btn) btn.classList.add('active');
            K.radioShuffled = shuffleArr([].concat(K.radioPlaylist));
            K.showToast('Aleatorio activado', 'success');
        } else {
            if (btn) btn.classList.remove('active');
            K.showToast('Modo secuencial', 'success');
        }
        K.radioIndex = 0; renderRadioQueue();
    }

    /* ══════════════════════════════════════════
       ⏱ EVENTOS DE AUDIO RADIO
       ══════════════════════════════════════════ */
    radioAudio.addEventListener('timeupdate', function () {
        if (!radioAudio.duration) return;
        var p = (radioAudio.currentTime / radioAudio.duration) * 100;

        // Actualizar barra del radio
        var f = document.getElementById('radioProgressFill'); if (f) f.style.width = p + '%';
        var g = document.getElementById('radioProgressGlow'); if (g) g.style.left = p + '%';
        var ct = document.getElementById('radioCurrentTime'); if (ct) ct.textContent = K.formatTime(radioAudio.currentTime);
        var dt = document.getElementById('radioDuration'); if (dt) dt.textContent = K.formatTime(radioAudio.duration);

        // ✅ FIX: Solo actualizar player bar si la fuente activa es radio
        if (K.activeSource === 'radio') {
            document.getElementById('progressFill').style.width = p + '%';
            document.getElementById('playerCurrentTime').textContent = K.formatTime(radioAudio.currentTime);
            document.getElementById('playerDuration').textContent = K.formatTime(radioAudio.duration);
        }
    });

    radioAudio.addEventListener('ended', function () { radioNextT(); });

    /* ══════════════════════════════════════════
       🎚 CONTROLES UI
       ══════════════════════════════════════════ */
    document.getElementById('radioProgressBar').addEventListener('click', function (e) {
        if (!radioAudio.duration) return;
        var r = this.getBoundingClientRect();
        radioAudio.currentTime = ((e.clientX - r.left) / r.width) * radioAudio.duration;
    });

    document.getElementById('radioVolumeBar').addEventListener('click', function (e) {
        var r = this.getBoundingClientRect();
        var p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
        K.radioVolume = p; radioAudio.volume = p;
        document.getElementById('radioVolumeFill').style.width = (p * 100) + '%';
        document.getElementById('radioVolPct').textContent = Math.round(p * 100) + '%';
        var ic = document.getElementById('radioVolIcon');
        if (p === 0) ic.textContent = '🔇'; else if (p < 0.3) ic.textContent = '🔈';
        else if (p < 0.7) ic.textContent = '🔉'; else ic.textContent = '🔊';
    });

    document.getElementById('radioVolIcon').addEventListener('click', function () {
        if (radioAudio.volume > 0) {
            radioAudio.volume = 0;
            document.getElementById('radioVolumeFill').style.width = '0%';
            document.getElementById('radioVolPct').textContent = '0%'; this.textContent = '🔇';
        } else {
            radioAudio.volume = K.radioVolume || 0.7;
            document.getElementById('radioVolumeFill').style.width = (K.radioVolume * 100) + '%';
            document.getElementById('radioVolPct').textContent = Math.round(K.radioVolume * 100) + '%'; this.textContent = '🔊';
        }
    });

    document.getElementById('radioPlayBtn').addEventListener('click', function () { radioToggle(); });
    document.getElementById('radioNext').addEventListener('click', function () { radioNextT(); });
    document.getElementById('radioPrev').addEventListener('click', function () { radioPrevT(); });
    document.getElementById('radioShuffle').addEventListener('click', function () { radioShuffleToggle(); });

    /* ══════════════════════════════════════════
       📋 COLA DE REPRODUCCIÓN
       ══════════════════════════════════════════ */
    function renderRadioQueue() {
        var c = document.getElementById('radioQueueList'); if (!c) return;
        var list = getRL();
        if (!list || list.length === 0) {
            c.innerHTML = '<div class="empty-state"><div class="empty-icon">🎵</div><div class="empty-title">Sin canciones</div><div class="empty-text">Sube canciones desde álbumes</div></div>';
            return;
        }
        var h = '';
        for (var i = 0; i < list.length; i++) {
            var s = list[i]; var now = (i === K.radioIndex);
            var img = s.imagen_url || 'https://placehold.co/80x80/111/333?text=♪';
            h += '<div class="radio-queue-item' + (now ? ' now-playing' : '') + '" onclick="window._rjump(' + i + ')">';
            h += '<span class="radio-queue-num">' + (now ? '▶' : (i + 1)) + '</span>';
            h += '<div class="radio-queue-cover"><img src="' + img + '" alt="" onerror="this.src=\'https://placehold.co/80x80/111/333?text=♪\'"></div>';
            h += '<div class="radio-queue-info"><div class="radio-queue-title">' + s.titulo + '</div><div class="radio-queue-album">' + s.album + '</div></div>';
            if (now && K.radioIsPlaying) {
                h += '<div class="radio-eq"><div class="radio-eq-bar"></div><div class="radio-eq-bar"></div><div class="radio-eq-bar"></div><div class="radio-eq-bar"></div></div>';
            } else {
                h += '<span class="radio-queue-duration">' + s.duracion + '</span>';
            }
            h += '</div>';
        }
        c.innerHTML = h;
    }

    function updateRQHighlight() {
        var items = document.querySelectorAll('.radio-queue-item');
        var list = getRL();
        for (var i = 0; i < items.length; i++) {
            items[i].classList.remove('now-playing');
            var num = items[i].querySelector('.radio-queue-num');
            if (i === K.radioIndex) {
                items[i].classList.add('now-playing');
                if (num) num.textContent = '▶';
                var dur = items[i].querySelector('.radio-queue-duration');
                if (dur) dur.outerHTML = '<div class="radio-eq"><div class="radio-eq-bar"></div><div class="radio-eq-bar"></div><div class="radio-eq-bar"></div><div class="radio-eq-bar"></div></div>';
                items[i].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                if (num) num.textContent = (i + 1);
                var eq = items[i].querySelector('.radio-eq');
                if (eq) { var d = list[i] ? list[i].duracion : '--:--'; eq.outerHTML = '<span class="radio-queue-duration">' + d + '</span>'; }
            }
        }
    }

    window._rjump = function (i) { radioPlay(i); };

})();