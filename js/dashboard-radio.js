/* ============================================
   📻 DASHBOARD-RADIO.JS — KXON
   Radio KXON: reproducción continua, cola, shuffle
   FIX: Imágenes de álbum se muestran correctamente
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
            if (c) c.textContent = K.radioPlaylist.length + ' canciones en cola';
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

    /* ── Actualizar imagen del disco ── */
    function updateDiscImage(imgUrl) {
        var discImg = document.getElementById('radioDiscImg');
        var discFallback = document.getElementById('radioDiscFallback');
        if (!discImg || !discFallback) return;

        if (imgUrl && imgUrl.length > 0) {
            discImg.src = imgUrl;
            discImg.style.display = 'block';
            discFallback.style.display = 'none';
            discImg.onerror = function () {
                this.style.display = 'none';
                discFallback.style.display = 'flex';
            };
        } else {
            discImg.style.display = 'none';
            discFallback.style.display = 'flex';
        }

        /* Actualizar fondo ambiental con color de la portada */
        var ambient = document.getElementById('radioAmbient');
        if (ambient && imgUrl) {
            ambient.style.opacity = '0.06';
        }
    }

    /* ══════════════════════════════════════════
       ▶ PLAY / TOGGLE / NEXT / PREV
       ══════════════════════════════════════════ */
    function radioPlay(idx) {
        var list = getRL();
        if (!list || !list[idx]) return;
        K.radioIndex = idx;
        var t = list[idx];

        K.stopAllAudio('radio');
        K.activeSource = 'radio';

        radioAudio.src = t.archivo_url;
        radioAudio.volume = K.radioVolume;
        radioAudio.play();
        K.radioIsPlaying = true;

        /* Actualizar disco */
        updateDiscImage(t.imagen_url);

        var d = document.getElementById('radioDisc'); if (d) d.classList.add('spinning');
        var oa = document.getElementById('radioOnAir'); if (oa) oa.classList.add('active');
        var pb = document.getElementById('radioPlayBtn'); if (pb) pb.classList.add('playing');
        var pi = document.getElementById('radioPlayIcon'); if (pi) pi.textContent = '⏸';
        var tt = document.getElementById('radioTrackTitle'); if (tt) tt.textContent = t.titulo;
        var ta = document.getElementById('radioTrackAlbum'); if (ta) ta.textContent = t.album;
        var gl = document.getElementById('radioProgressGlow'); if (gl) gl.classList.add('visible');
        var wave = document.getElementById('radioWave'); if (wave) wave.classList.add('active');
        var tonearm = document.getElementById('radioTonearm'); if (tonearm) tonearm.classList.add('playing');

        updateRQHighlight();

        /* Player bar */
        document.getElementById('playerBar').classList.add('show');
        document.getElementById('playerTitle').textContent = t.titulo;
        document.getElementById('playerCover').src = t.imagen_url || '';
        document.getElementById('playerPlayPause').textContent = '⏸';
        K.isPlaying = true;

        if (typeof K.updateRadioFavState === 'function') setTimeout(K.updateRadioFavState, 100);
        if (typeof K.updatePlayerFavState === 'function') setTimeout(K.updatePlayerFavState, 100);

        db.rpc('increment_reproducciones', { song_id: t.id }).then(function (r) {
            if (r.error) console.warn('Error updating radio plays:', r.error.message);
        });
    }

    function radioToggle() {
        if (K.radioPlaylist.length === 0) { K.showToast('No hay canciones', 'error'); return; }
        if (K.radioIsPlaying) {
            radioAudio.pause();
            K.radioIsPlaying = false;
            var d = document.getElementById('radioDisc'); if (d) d.classList.remove('spinning');
            var pb = document.getElementById('radioPlayBtn'); if (pb) pb.classList.remove('playing');
            var pi = document.getElementById('radioPlayIcon'); if (pi) pi.textContent = '▶';
            var wave = document.getElementById('radioWave'); if (wave) wave.classList.remove('active');
            var tonearm = document.getElementById('radioTonearm'); if (tonearm) tonearm.classList.remove('playing');
            document.getElementById('playerPlayPause').textContent = '▶';
            K.isPlaying = false;
        } else {
            if (K.radioIndex === -1) {
                radioPlay(0);
            } else {
                K.stopAllAudio('radio');
                K.activeSource = 'radio';
                radioAudio.play();
                K.radioIsPlaying = true;
                var d2 = document.getElementById('radioDisc'); if (d2) d2.classList.add('spinning');
                var pb2 = document.getElementById('radioPlayBtn'); if (pb2) pb2.classList.add('playing');
                var pi2 = document.getElementById('radioPlayIcon'); if (pi2) pi2.textContent = '⏸';
                var wave2 = document.getElementById('radioWave'); if (wave2) wave2.classList.add('active');
                var tonearm2 = document.getElementById('radioTonearm'); if (tonearm2) tonearm2.classList.add('playing');
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
            K.showToast('🔀 Aleatorio activado', 'success');
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

        var f = document.getElementById('radioProgressFill'); if (f) f.style.width = p + '%';
        var g = document.getElementById('radioProgressGlow'); if (g) g.style.left = p + '%';
        var ct = document.getElementById('radioCurrentTime'); if (ct) ct.textContent = K.formatTime(radioAudio.currentTime);
        var dt = document.getElementById('radioDuration'); if (dt) dt.textContent = K.formatTime(radioAudio.duration);

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
    var rpb = document.getElementById('radioProgressBar');
    if (rpb) rpb.addEventListener('click', function (e) {
        if (!radioAudio.duration) return;
        var r = this.getBoundingClientRect();
        radioAudio.currentTime = ((e.clientX - r.left) / r.width) * radioAudio.duration;
    });

    var rvb = document.getElementById('radioVolumeBar');
    if (rvb) rvb.addEventListener('click', function (e) {
        var r = this.getBoundingClientRect();
        var p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
        K.radioVolume = p; radioAudio.volume = p;
        var vf = document.getElementById('radioVolumeFill'); if (vf) vf.style.width = (p * 100) + '%';
        var vp = document.getElementById('radioVolPct'); if (vp) vp.textContent = Math.round(p * 100) + '%';
        var ic = document.getElementById('radioVolIcon');
        if (ic) {
            if (p === 0) ic.textContent = '🔇'; else if (p < 0.3) ic.textContent = '🔈';
            else if (p < 0.7) ic.textContent = '🔉'; else ic.textContent = '🔊';
        }
    });

    var rvi = document.getElementById('radioVolIcon');
    if (rvi) rvi.addEventListener('click', function () {
        if (radioAudio.volume > 0) {
            radioAudio.volume = 0;
            var vf = document.getElementById('radioVolumeFill'); if (vf) vf.style.width = '0%';
            var vp = document.getElementById('radioVolPct'); if (vp) vp.textContent = '0%';
            this.textContent = '🔇';
        } else {
            radioAudio.volume = K.radioVolume || 0.7;
            var vf2 = document.getElementById('radioVolumeFill'); if (vf2) vf2.style.width = (K.radioVolume * 100) + '%';
            var vp2 = document.getElementById('radioVolPct'); if (vp2) vp2.textContent = Math.round(K.radioVolume * 100) + '%';
            this.textContent = '🔊';
        }
    });

    var rpBtn = document.getElementById('radioPlayBtn');
    if (rpBtn) rpBtn.addEventListener('click', function () { radioToggle(); });
    var rnBtn = document.getElementById('radioNext');
    if (rnBtn) rnBtn.addEventListener('click', function () { radioNextT(); });
    var rpvBtn = document.getElementById('radioPrev');
    if (rpvBtn) rpvBtn.addEventListener('click', function () { radioPrevT(); });
    var rsBtn = document.getElementById('radioShuffle');
    if (rsBtn) rsBtn.addEventListener('click', function () { radioShuffleToggle(); });

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
            var img = s.imagen_url || '';
            var imgHtml = '';
            if (img) {
                imgHtml = '<img src="' + img + '" alt="" onerror="this.parentElement.innerHTML=\'<span class=radio-queue-cover-fallback>♪</span>\'">';
            } else {
                imgHtml = '<span class="radio-queue-cover-fallback">♪</span>';
            }
            h += '<div class="radio-queue-item' + (now ? ' now-playing' : '') + '" onclick="window._rjump(' + i + ')">';
            h += '<span class="radio-queue-num">' + (now ? '▶' : (i + 1)) + '</span>';
            h += '<div class="radio-queue-cover">' + imgHtml + '</div>';
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
                if (eq) { var dd = list[i] ? list[i].duracion : '--:--'; eq.outerHTML = '<span class="radio-queue-duration">' + dd + '</span>'; }
            }
        }
    }

    window._rjump = function (i) { radioPlay(i); };

})();