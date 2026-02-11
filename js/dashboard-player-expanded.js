/* ============================================
   🎵 DASHBOARD-PLAYER-EXPANDED.JS — KXON
   Player expandido estilo Spotify
   ============================================ */
(function () {

    var K = window.KXON;
    var audioEl = K.audioEl;
    var expanded = false;
    var shuffleMode = false;
    var repeatMode = 0; // 0=off, 1=all, 2=one

    /* ══════════════════════════════════════════
       📌 ELEMENTOS
       ══════════════════════════════════════════ */
    var overlay = document.getElementById('playerExpanded');
    var expBg = document.getElementById('playerExpBg');
    var expCoverImg = document.getElementById('playerExpCoverImg');
    var expTitle = document.getElementById('playerExpTitle');
    var expArtist = document.getElementById('playerExpArtist');
    var expPlayPause = document.getElementById('playerExpPlayPause');
    var expProgressBar = document.getElementById('playerExpProgressBar');
    var expProgressFill = document.getElementById('playerExpProgressFill');
    var expCurrentTime = document.getElementById('playerExpCurrentTime');
    var expDuration = document.getElementById('playerExpDuration');
    var expVolBar = document.getElementById('playerExpVolBar');
    var expVolFill = document.getElementById('playerExpVolFill');
    var expVolPct = document.getElementById('playerExpVolPct');
    var expVolIcon = document.getElementById('playerExpVolIcon');
    var expEq = document.getElementById('playerExpEq');
    var expVinyl = document.getElementById('playerExpVinyl');
    var expCoverBox = document.getElementById('playerExpCoverBox');
    var expSource = document.getElementById('playerExpSource');
    var expShuffle = document.getElementById('playerExpShuffle');
    var expRepeat = document.getElementById('playerExpRepeat');
    var expFav = document.getElementById('playerExpFav');

    /* ══════════════════════════════════════════
       🔓 ABRIR / CERRAR EXPANDIDO
       ══════════════════════════════════════════ */
    function openExpanded() {
        if (expanded) return;
        expanded = true;
        syncExpanded();
        overlay.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function closeExpanded() {
        if (!expanded) return;
        expanded = false;
        overlay.classList.remove('show');
        document.body.style.overflow = '';
    }

    // Click en cover o info del player bar para expandir
    document.getElementById('playerBarClickZone').addEventListener('click', function (e) {
        e.stopPropagation();
        openExpanded();
    });
    document.getElementById('playerInfoClickZone').addEventListener('click', function (e) {
        e.stopPropagation();
        openExpanded();
    });

    // Botón minimizar
    document.getElementById('playerExpMinimize').addEventListener('click', closeExpanded);

    // Click en overlay background para cerrar
    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeExpanded();
    });

    // Tecla Escape
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && expanded) closeExpanded();
    });

    /* ── Swipe down para cerrar (móvil) ── */
    var touchStartY = 0;
    var touchStartTime = 0;

    var expContent = document.getElementById('playerExpContent');
    expContent.addEventListener('touchstart', function (e) {
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
    }, { passive: true });

    expContent.addEventListener('touchend', function (e) {
        var deltaY = e.changedTouches[0].clientY - touchStartY;
        var deltaTime = Date.now() - touchStartTime;
        // Swipe down rápido > 80px
        if (deltaY > 80 && deltaTime < 400) {
            closeExpanded();
        }
    }, { passive: true });

    /* ══════════════════════════════════════════
       🔄 SINCRONIZAR ESTADO
       ══════════════════════════════════════════ */
    function syncExpanded() {
        if (!expanded) return;

        var track = K.currentPlaylist[K.currentTrackIndex];
        if (!track) return;

        var coverUrl = track.imagen_url || K.currentAlbumCover || '';
        expCoverImg.src = coverUrl;
        expBg.style.backgroundImage = coverUrl ? 'url(' + coverUrl + ')' : 'none';
        expTitle.textContent = track.titulo || '—';
        expArtist.textContent = 'KXON';

        // Source label
        if (K.activeSource === 'radio') {
            expSource.textContent = '📻 RADIO KXON';
        } else {
            expSource.textContent = '🎵 REPRODUCIENDO';
        }

        // Play/pause state
        expPlayPause.textContent = K.isPlaying ? '⏸' : '▶';

        // Equalizer
        if (K.isPlaying) {
            expEq.classList.add('active');
            expCoverBox.classList.add('playing');
            expVinyl.classList.add('show', 'spinning');
        } else {
            expEq.classList.remove('active');
            expCoverBox.classList.remove('playing');
            expVinyl.classList.remove('spinning');
        }

        // Shuffle / Repeat
        if (shuffleMode) expShuffle.classList.add('active');
        else expShuffle.classList.remove('active');

        updateRepeatUI();
        syncVolume();
    }

    // Llamar syncExpanded cuando cambia el track
    var originalPlayTrack = K.playTrack;
    K.playTrack = function (idx) {
        originalPlayTrack(idx);
        setTimeout(syncExpanded, 50);
    };
    window._playTrack = function (idx) { K.playTrack(idx); };

    /* ══════════════════════════════════════════
       ▶ CONTROLES EXPANDIDOS
       ══════════════════════════════════════════ */

    // Play/Pause
    expPlayPause.addEventListener('click', function (e) {
        e.stopPropagation();
        document.getElementById('playerPlayPause').click();
        setTimeout(function () {
            expPlayPause.textContent = K.isPlaying ? '⏸' : '▶';
            if (K.isPlaying) {
                expEq.classList.add('active');
                expCoverBox.classList.add('playing');
                expVinyl.classList.add('show', 'spinning');
            } else {
                expEq.classList.remove('active');
                expCoverBox.classList.remove('playing');
                expVinyl.classList.remove('spinning');
            }
        }, 50);
    });

    // Next
    document.getElementById('playerExpNext').addEventListener('click', function (e) {
        e.stopPropagation();
        document.getElementById('playerNext').click();
        setTimeout(syncExpanded, 100);
    });

    // Prev
    document.getElementById('playerExpPrev').addEventListener('click', function (e) {
        e.stopPropagation();
        document.getElementById('playerPrev').click();
        setTimeout(syncExpanded, 100);
    });

    // Shuffle
    expShuffle.addEventListener('click', function (e) {
        e.stopPropagation();
        shuffleMode = !shuffleMode;
        if (shuffleMode) {
            expShuffle.classList.add('active');
            K.showToast('🔀 Aleatorio activado', 'success');
            // Shuffle playlist
            if (K.currentPlaylist.length > 1) {
                var current = K.currentPlaylist[K.currentTrackIndex];
                var rest = K.currentPlaylist.filter(function (s, i) { return i !== K.currentTrackIndex; });
                for (var i = rest.length - 1; i > 0; i--) {
                    var j = Math.floor(Math.random() * (i + 1));
                    var temp = rest[i]; rest[i] = rest[j]; rest[j] = temp;
                }
                K.currentPlaylist = [current].concat(rest);
                K.currentTrackIndex = 0;
            }
        } else {
            expShuffle.classList.remove('active');
            K.showToast('Aleatorio desactivado', 'success');
        }
    });

    // Repeat
    expRepeat.addEventListener('click', function (e) {
        e.stopPropagation();
        repeatMode = (repeatMode + 1) % 3;
        updateRepeatUI();
        var msgs = ['Repetir desactivado', '🔁 Repetir todo', '🔂 Repetir una'];
        K.showToast(msgs[repeatMode], 'success');
    });

    function updateRepeatUI() {
        if (repeatMode === 0) {
            expRepeat.classList.remove('active');
            expRepeat.textContent = '🔁';
        } else if (repeatMode === 1) {
            expRepeat.classList.add('active');
            expRepeat.textContent = '🔁';
        } else {
            expRepeat.classList.add('active');
            expRepeat.textContent = '🔂';
        }
    }

    // Override ended para repeat
    audioEl.addEventListener('ended', function () {
        if (repeatMode === 2) {
            // Repeat one
            audioEl.currentTime = 0;
            audioEl.play();
            return;
        }
        if (K.currentTrackIndex < K.currentPlaylist.length - 1) {
            K.playTrack(K.currentTrackIndex + 1);
        } else if (repeatMode === 1) {
            // Repeat all
            K.playTrack(0);
        } else {
            K.isPlaying = false;
            document.getElementById('playerPlayPause').textContent = '▶';
            expPlayPause.textContent = '▶';
            expEq.classList.remove('active');
            expCoverBox.classList.remove('playing');
            expVinyl.classList.remove('spinning');
        }
    });

    /* ══════════════════════════════════════════
       📊 PROGRESS BAR EXPANDIDA
       ══════════════════════════════════════════ */
    function getActiveAudio() {
        if (K.activeSource === 'radio') return K.radioAudio;
        if (K.activeSource === 'archivo') return K.archivoPreviewAudio;
        if (K.activeSource === 'market') return K.marketPreviewAudio;
        return audioEl;
    }

    // Actualizar progreso expandido
    setInterval(function () {
        if (!expanded) return;
        var audio = getActiveAudio();
        if (audio && audio.duration) {
            var pct = (audio.currentTime / audio.duration) * 100;
            expProgressFill.style.width = pct + '%';
            expCurrentTime.textContent = K.formatTime(audio.currentTime);
            expDuration.textContent = K.formatTime(audio.duration);
        }
    }, 200);

    // Click en progress bar expandida
    expProgressBar.addEventListener('click', function (e) {
        e.stopPropagation();
        var audio = getActiveAudio();
        if (audio && audio.duration) {
            var r = this.getBoundingClientRect();
            var pct = (e.clientX - r.left) / r.width;
            audio.currentTime = pct * audio.duration;
        }
    });

    /* ══════════════════════════════════════════
       🔊 VOLUMEN EXPANDIDO
       ══════════════════════════════════════════ */
    function syncVolume() {
        var audio = getActiveAudio();
        var vol = audio ? audio.volume : 0.7;
        var pct = Math.round(vol * 100);
        expVolFill.style.width = pct + '%';
        expVolPct.textContent = pct + '%';
        if (vol === 0) expVolIcon.textContent = '🔇';
        else if (vol < 0.3) expVolIcon.textContent = '🔈';
        else if (vol < 0.7) expVolIcon.textContent = '🔉';
        else expVolIcon.textContent = '🔊';
    }

    expVolBar.addEventListener('click', function (e) {
        e.stopPropagation();
        var r = this.getBoundingClientRect();
        var pct = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
        var audio = getActiveAudio();
        if (audio) audio.volume = pct;
        if (K.activeSource === 'radio') K.radioVolume = pct;
        expVolFill.style.width = (pct * 100) + '%';
        expVolPct.textContent = Math.round(pct * 100) + '%';
        // Sync mini player volume too
        document.getElementById('volumeFill').style.width = (pct * 100) + '%';
        syncVolume();
    });

    // Mute toggle
    var savedVol = 0.7;
    expVolIcon.addEventListener('click', function (e) {
        e.stopPropagation();
        var audio = getActiveAudio();
        if (!audio) return;
        if (audio.volume > 0) {
            savedVol = audio.volume;
            audio.volume = 0;
            if (K.activeSource === 'radio') K.radioVolume = 0;
        } else {
            audio.volume = savedVol;
            if (K.activeSource === 'radio') K.radioVolume = savedVol;
        }
        syncVolume();
        document.getElementById('volumeFill').style.width = (audio.volume * 100) + '%';
    });

    /* ══════════════════════════════════════════
       🔄 SYNC PLAY STATE CON MINI PLAYER
       ══════════════════════════════════════════ */
    // Observar cambios en el mini player play/pause
    var miniPP = document.getElementById('playerPlayPause');
    var observer = new MutationObserver(function () {
        if (expanded) {
            var isPlay = miniPP.textContent.trim() === '⏸';
            expPlayPause.textContent = isPlay ? '⏸' : '▶';
            if (isPlay) {
                expEq.classList.add('active');
                expCoverBox.classList.add('playing');
                expVinyl.classList.add('show', 'spinning');
            } else {
                expEq.classList.remove('active');
                expCoverBox.classList.remove('playing');
                expVinyl.classList.remove('spinning');
            }
        }
    });
    observer.observe(miniPP, { childList: true, characterData: true, subtree: true });

    // Sync title changes
    var miniTitle = document.getElementById('playerTitle');
    var titleObserver = new MutationObserver(function () {
        if (expanded) syncExpanded();
    });
    titleObserver.observe(miniTitle, { childList: true, characterData: true, subtree: true });

    /* ══════════════════════════════════════════
       ❤️ FAVORITO EN EXPANDIDO
       ══════════════════════════════════════════ */
    // Sync fav state
    setInterval(function () {
        if (!expanded) return;
        var miniFav = document.getElementById('playerFavBtn');
        if (miniFav) {
            var isFav = miniFav.querySelector('span').textContent === '❤️';
            expFav.textContent = isFav ? '❤️' : '🤍';
            if (isFav) expFav.classList.add('fav-active');
            else expFav.classList.remove('fav-active');
        }
    }, 500);

    /* ══════════════════════════════════════════
       ➕ AGREGAR A PLAYLIST DESDE EXPANDIDO
       ══════════════════════════════════════════ */
    window._addCurrentToPlaylist = function () {
        if (!K.currentPlaylist || !K.currentPlaylist[K.currentTrackIndex]) {
            K.showToast('No hay canción en reproducción', 'error');
            return;
        }
        var track = K.currentPlaylist[K.currentTrackIndex];
        if (typeof window._openAddToPlaylist === 'function') {
            window._openAddToPlaylist(track.id);
        } else {
            K.showToast('Función de playlists no disponible', 'error');
        }
    };

    /* ══════════════════════════════════════════
       👁 SHOW EXPAND HINT
       ══════════════════════════════════════════ */
    var expandHint = document.getElementById('playerExpandHint');
    if (expandHint) {
        expandHint.style.display = 'flex';
    }

    /* ══════════════════════════════════════════
       ⌨ KEYBOARD SHORTCUTS
       ══════════════════════════════════════════ */
    document.addEventListener('keydown', function (e) {
        // No interceptar si está en un input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        if (e.code === 'Space' && expanded) {
            e.preventDefault();
            expPlayPause.click();
        }
        if (e.code === 'ArrowRight' && expanded) {
            e.preventDefault();
            document.getElementById('playerExpNext').click();
        }
        if (e.code === 'ArrowLeft' && expanded) {
            e.preventDefault();
            document.getElementById('playerExpPrev').click();
        }
        if (e.code === 'ArrowUp' && expanded) {
            e.preventDefault();
            var audio = getActiveAudio();
            if (audio) {
                audio.volume = Math.min(1, audio.volume + 0.1);
                syncVolume();
                document.getElementById('volumeFill').style.width = (audio.volume * 100) + '%';
            }
        }
        if (e.code === 'ArrowDown' && expanded) {
            e.preventDefault();
            var audio2 = getActiveAudio();
            if (audio2) {
                audio2.volume = Math.max(0, audio2.volume - 0.1);
                syncVolume();
                document.getElementById('volumeFill').style.width = (audio2.volume * 100) + '%';
            }
        }
    });

})();