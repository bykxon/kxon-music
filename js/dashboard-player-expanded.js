/* ============================================
   🎵 KXON PLAYER EXPANDED — REDESIGN 2026
   Namespace: kx-ply
   Zero polling · Event-driven · Accessible
   ============================================ */
(function () {
  'use strict';

  var K = window.KXON;
  var audioEl = K.audioEl;
  var expanded = false;
  var shuffleMode = false;
  var repeatMode = 0; // 0=off, 1=all, 2=one
  var _rafId = null;
  var _savedVol = 0.7;

  /* ══════════════════════════════════════════
     📌 ELEMENTS
     ══════════════════════════════════════════ */
  function $(id) { return document.getElementById(id); }

  var overlay       = $('playerExpanded');
  var expBg         = $('playerExpBg');
  var expCoverImg   = $('playerExpCoverImg');
  var expCoverBox   = $('playerExpCoverBox');
  var expTitle      = $('playerExpTitle');
  var expArtist     = $('playerExpArtist');
  var expSource     = $('playerExpSource');
  var expProgressBar= $('playerExpProgressBar');
  var expProgressFill=$('playerExpProgressFill');
  var expCurrentTime= $('playerExpCurrentTime');
  var expDuration   = $('playerExpDuration');
  var expVolBar     = $('playerExpVolBar');
  var expVolFill    = $('playerExpVolFill');
  var expVolPct     = $('playerExpVolPct');
  var expVolIcon    = $('playerExpVolIcon');
  var expEq         = $('playerExpEq');
  var expShuffle    = $('playerExpShuffle');
  var expRepeat     = $('playerExpRepeat');
  var expFav        = $('playerExpFav');
  var expContent    = $('playerExpContent');

  // Mini player icons
  var miniPlayBtn   = $('playerPlayPause');
  var miniPlayIcon  = miniPlayBtn ? miniPlayBtn.querySelector('.kx-ply-icon-play') : null;
  var miniPauseIcon = miniPlayBtn ? miniPlayBtn.querySelector('.kx-ply-icon-pause') : null;
  var playerBar     = $('playerBar');

  // Expanded play button icons
  var expPlayBtn    = $('playerExpPlayPause');
  var expPlayIcon   = expPlayBtn ? expPlayBtn.querySelector('.kx-ply-icon-play') : null;
  var expPauseIcon  = expPlayBtn ? expPlayBtn.querySelector('.kx-ply-icon-pause') : null;

  /* ══════════════════════════════════════════
     🔧 HELPERS
     ══════════════════════════════════════════ */
  function getActiveAudio() {
    if (K.activeSource === 'radio') return K.radioAudio;
    if (K.activeSource === 'archivo') return K.archivoPreviewAudio;
    if (K.activeSource === 'market') return K.marketPreviewAudio;
    return audioEl;
  }

  function setPlayIcons(isPlaying) {
    // Mini player
    if (miniPlayIcon && miniPauseIcon) {
      miniPlayIcon.style.display = isPlaying ? 'none' : 'block';
      miniPauseIcon.style.display = isPlaying ? 'block' : 'none';
    }
    // Expanded
    if (expPlayIcon && expPauseIcon) {
      expPlayIcon.style.display = isPlaying ? 'none' : 'block';
      expPauseIcon.style.display = isPlaying ? 'block' : 'none';
    }
    // Cover effects
    if (expCoverBox) {
      expCoverBox.classList.toggle('is-playing', isPlaying);
    }
    if (playerBar) {
      playerBar.classList.toggle('is-playing', isPlaying);
    }
    // Expanded play btn label
    if (expPlayBtn) {
      expPlayBtn.setAttribute('aria-label', isPlaying ? 'Pausar' : 'Reproducir');
    }
    if (miniPlayBtn) {
      miniPlayBtn.setAttribute('aria-label', isPlaying ? 'Pausar' : 'Reproducir');
    }
  }

  function updateVolumeIcons(vol) {
    // Mini player volume
    var miniVolBtn = $('playerVolIcon');
    if (miniVolBtn) {
      var onIcon = miniVolBtn.querySelector('.kx-ply-icon-vol-on');
      var offIcon = miniVolBtn.querySelector('.kx-ply-icon-vol-off');
      if (onIcon && offIcon) {
        onIcon.style.display = vol > 0 ? 'block' : 'none';
        offIcon.style.display = vol === 0 ? 'block' : 'none';
      }
    }
    // Expanded volume
    if (expVolIcon) {
      var expOn = expVolIcon.querySelector('.kx-ply-icon-vol-on');
      var expOff = expVolIcon.querySelector('.kx-ply-icon-vol-off');
      if (expOn && expOff) {
        expOn.style.display = vol > 0 ? 'block' : 'none';
        expOff.style.display = vol === 0 ? 'block' : 'none';
      }
    }
  }

  /* ══════════════════════════════════════════
     🔓 OPEN / CLOSE EXPANDED
     ══════════════════════════════════════════ */
  function openExpanded() {
    if (expanded) return;
    expanded = true;
    syncExpanded();
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
    startProgressRAF();
  }

  function closeExpanded() {
    if (!expanded) return;
    expanded = false;
    overlay.classList.remove('show');
    document.body.style.overflow = '';
    stopProgressRAF();
  }

  // Click zones
  $('playerBarClickZone').addEventListener('click', function (e) {
    e.stopPropagation();
    openExpanded();
  });
  $('playerInfoClickZone').addEventListener('click', function (e) {
    e.stopPropagation();
    openExpanded();
  });

  // Minimize button
  $('playerExpMinimize').addEventListener('click', closeExpanded);

  // Overlay background click
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeExpanded();
  });

  // Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && expanded) closeExpanded();
  });

  // Swipe down to close (mobile)
  var _touchY = 0;
  var _touchT = 0;
  expContent.addEventListener('touchstart', function (e) {
    _touchY = e.touches[0].clientY;
    _touchT = Date.now();
  }, { passive: true });

  expContent.addEventListener('touchend', function (e) {
    var dy = e.changedTouches[0].clientY - _touchY;
    var dt = Date.now() - _touchT;
    if (dy > 80 && dt < 400) closeExpanded();
  }, { passive: true });

  /* ══════════════════════════════════════════
     🔄 SYNC STATE
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
      expSource.textContent = 'RADIO KXON';
    } else {
      expSource.textContent = 'REPRODUCIENDO';
    }

    setPlayIcons(K.isPlaying);
    updateRepeatUI();
    syncVolume();
    syncFavState();
  }

  // Hook into playTrack
  var _origPlayTrack = K.playTrack;
  K.playTrack = function (idx) {
    _origPlayTrack(idx);
    setPlayIcons(true);
    setTimeout(syncExpanded, 50);
  };
  window._playTrack = function (idx) { K.playTrack(idx); };

  /* ══════════════════════════════════════════
     ▶ TRANSPORT CONTROLS
     ══════════════════════════════════════════ */

  // Play/Pause
  expPlayBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    miniPlayBtn.click();
    setTimeout(function () {
      setPlayIcons(K.isPlaying);
    }, 50);
  });

  // Next / Prev
  $('playerExpNext').addEventListener('click', function (e) {
    e.stopPropagation();
    $('playerNext').click();
    setTimeout(syncExpanded, 100);
  });

  $('playerExpPrev').addEventListener('click', function (e) {
    e.stopPropagation();
    $('playerPrev').click();
    setTimeout(syncExpanded, 100);
  });

  // Shuffle
  expShuffle.addEventListener('click', function (e) {
    e.stopPropagation();
    shuffleMode = !shuffleMode;
    this.classList.toggle('is-active', shuffleMode);
    this.setAttribute('aria-pressed', String(shuffleMode));
    K.showToast(shuffleMode ? 'Aleatorio activado' : 'Aleatorio desactivado', 'success');

    if (shuffleMode && K.currentPlaylist.length > 1) {
      var current = K.currentPlaylist[K.currentTrackIndex];
      var rest = K.currentPlaylist.filter(function (_, i) { return i !== K.currentTrackIndex; });
      for (var i = rest.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = rest[i]; rest[i] = rest[j]; rest[j] = temp;
      }
      K.currentPlaylist = [current].concat(rest);
      K.currentTrackIndex = 0;
    }
  });

  // Repeat
  expRepeat.addEventListener('click', function (e) {
    e.stopPropagation();
    repeatMode = (repeatMode + 1) % 3;
    updateRepeatUI();
    var msgs = ['Repetir desactivado', 'Repetir todo', 'Repetir una'];
    K.showToast(msgs[repeatMode], 'success');
  });

  function updateRepeatUI() {
    expRepeat.classList.toggle('is-active', repeatMode > 0);
    expRepeat.setAttribute('aria-pressed', String(repeatMode > 0));
    // Visual: add a "1" indicator for repeat-one
    var badge = expRepeat.querySelector('.kx-ply-repeat-one');
    if (repeatMode === 2) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'kx-ply-repeat-one';
        badge.textContent = '1';
        badge.style.cssText = 'position:absolute;bottom:2px;right:2px;font-size:0.5rem;font-weight:900;color:var(--kx-ply-accent);font-family:var(--kx-font-display);';
        expRepeat.style.position = 'relative';
        expRepeat.appendChild(badge);
      }
    } else {
      if (badge) badge.remove();
    }
  }

  // Handle ended event for repeat
  audioEl.addEventListener('ended', function () {
    if (repeatMode === 2) {
      audioEl.currentTime = 0;
      audioEl.play();
      return;
    }
    if (K.currentTrackIndex < K.currentPlaylist.length - 1) {
      K.playTrack(K.currentTrackIndex + 1);
    } else if (repeatMode === 1) {
      K.playTrack(0);
    } else {
      K.isPlaying = false;
      setPlayIcons(false);
    }
  });

  /* ══════════════════════════════════════════
     📊 PROGRESS — rAF instead of setInterval
     ══════════════════════════════════════════ */
  function updateProgress() {
    if (!expanded) return;
    var audio = getActiveAudio();
    if (audio && audio.duration && !isNaN(audio.duration)) {
      var pct = (audio.currentTime / audio.duration) * 100;
      expProgressFill.style.width = pct + '%';
      expCurrentTime.textContent = K.formatTime(audio.currentTime);
      expDuration.textContent = K.formatTime(audio.duration);
    }
    _rafId = requestAnimationFrame(updateProgress);
  }

  function startProgressRAF() {
    stopProgressRAF();
    _rafId = requestAnimationFrame(updateProgress);
  }

  function stopProgressRAF() {
    if (_rafId) {
      cancelAnimationFrame(_rafId);
      _rafId = null;
    }
  }

  // Progress bar click
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
     🔊 VOLUME
     ══════════════════════════════════════════ */
  function syncVolume() {
    var audio = getActiveAudio();
    var vol = audio ? audio.volume : 0.7;
    var pct = Math.round(vol * 100);
    expVolFill.style.width = pct + '%';
    expVolPct.textContent = pct + '%';
    updateVolumeIcons(vol);
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
    $('volumeFill').style.width = (pct * 100) + '%';
    updateVolumeIcons(pct);
  });

  // Mute toggle
  expVolIcon.addEventListener('click', function (e) {
    e.stopPropagation();
    var audio = getActiveAudio();
    if (!audio) return;
    if (audio.volume > 0) {
      _savedVol = audio.volume;
      audio.volume = 0;
      if (K.activeSource === 'radio') K.radioVolume = 0;
    } else {
      audio.volume = _savedVol;
      if (K.activeSource === 'radio') K.radioVolume = _savedVol;
    }
    syncVolume();
    $('volumeFill').style.width = (audio.volume * 100) + '%';
  });

  /* ══════════════════════════════════════════
     🔄 SYNC WITH MINI PLAYER — Event-driven
     ══════════════════════════════════════════ */
  // Listen for play/pause state changes on audio elements
  function onPlayState() {
    setTimeout(function () {
      if (expanded) {
        setPlayIcons(K.isPlaying);
      }
    }, 50);
  }

  audioEl.addEventListener('play', onPlayState);
  audioEl.addEventListener('pause', onPlayState);

  // Listen for track title changes via MutationObserver (minimal)
  var miniTitle = $('playerTitle');
  if (miniTitle) {
    var _titleObs = new MutationObserver(function () {
      if (expanded) syncExpanded();
    });
    _titleObs.observe(miniTitle, { childList: true, characterData: true, subtree: true });
  }

  /* ══════════════════════════════════════════
     ❤️ FAVORITE SYNC — Event-driven
     ══════════════════════════════════════════ */
  function syncFavState() {
    var miniFavBtn = $('playerFavBtn');
    if (!miniFavBtn) return;
    var isFav = miniFavBtn.classList.contains('is-fav');
    expFav.classList.toggle('is-fav', isFav);

    // Toggle heart SVGs
    var emptyH = expFav.querySelector('.kx-ply-icon-heart-empty');
    var fullH = expFav.querySelector('.kx-ply-icon-heart-full');
    if (emptyH && fullH) {
      emptyH.style.display = isFav ? 'none' : 'block';
      fullH.style.display = isFav ? 'block' : 'none';
    }
  }

  // Override _togglePlayerFav to sync
  var _origToggleFav = window._togglePlayerFav;
  window._togglePlayerFav = function () {
    if (_origToggleFav) _origToggleFav();
    setTimeout(syncFavState, 100);
  };

  // Observe fav button class changes
  var miniFavBtn = $('playerFavBtn');
  if (miniFavBtn) {
    var _favObs = new MutationObserver(function () {
      if (expanded) syncFavState();
    });
    _favObs.observe(miniFavBtn, { attributes: true, attributeFilter: ['class'] });
  }

    /* ══════════════════════════════════════════
     ➕ ADD TO PLAYLIST — FIXED
     ══════════════════════════════════════════ */
  $('playerExpAddPl').addEventListener('click', function (e) {
    e.stopPropagation();
    if (!K.currentPlaylist || !K.currentPlaylist[K.currentTrackIndex]) {
      K.showToast('No hay canción en reproducción', 'error');
      return;
    }
    var track = K.currentPlaylist[K.currentTrackIndex];
    console.log('[Player] Track actual:', track);
    console.log('[Player] Track ID:', track.id);

    // ★ CERRAR el reproductor expandido PRIMERO
    closeExpanded();

    // ★ Esperar a que se cierre y luego abrir el modal
    setTimeout(function () {
      if (typeof window._openAddToPlaylist === 'function') {
        window._openAddToPlaylist(track.id, track.titulo);
      } else {
        K.showToast('Función de playlists no disponible', 'error');
      }
    }, 350);
  });
  /* ══════════════════════════════════════════
     👁 EXPAND HINT
     ══════════════════════════════════════════ */
  var expandHint = $('playerExpandHint');
  if (expandHint) expandHint.style.display = 'flex';

  /* ══════════════════════════════════════════
     ⌨ KEYBOARD SHORTCUTS
     ══════════════════════════════════════════ */
  document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (!expanded) return;

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        expPlayBtn.click();
        break;
      case 'ArrowRight':
        e.preventDefault();
        $('playerExpNext').click();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        $('playerExpPrev').click();
        break;
      case 'ArrowUp':
        e.preventDefault();
        var audioUp = getActiveAudio();
        if (audioUp) {
          audioUp.volume = Math.min(1, audioUp.volume + 0.1);
          syncVolume();
          $('volumeFill').style.width = (audioUp.volume * 100) + '%';
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        var audioDown = getActiveAudio();
        if (audioDown) {
          audioDown.volume = Math.max(0, audioDown.volume - 0.1);
          syncVolume();
          $('volumeFill').style.width = (audioDown.volume * 100) + '%';
        }
        break;
    }
  });

  /* ══════════════════════════════════════════
     🔧 MINI PLAYER PLAY/PAUSE ICON SYNC
     Hook into the mini player click to update icons
     ══════════════════════════════════════════ */
  if (miniPlayBtn) {
    miniPlayBtn.addEventListener('click', function () {
      // defer to after KXON updates K.isPlaying
      setTimeout(function () {
        setPlayIcons(K.isPlaying);
      }, 50);
    });
  }

})();