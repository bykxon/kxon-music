/* ============================================
   📻 DASHBOARD-RADIO.JS — KXON REDESIGN 2026
   Radio KXON: Reproducción continua, cola, shuffle
   Namespace: kx-rad-*
   ✅ escapeHtml en toda interpolación
   ✅ Event delegation
   ✅ ARIA + Accesibilidad
   ✅ Lazy loading de imágenes
   ✅ Búsqueda en cola
   ✅ FIX: Event listeners se registran en initRadio
   ============================================ */
(function () {

  var db = window.db;
  var K = window.KXON;
  var radioAudio = K.radioAudio;
  var eventsReady = false;

  /* ══════════════════════════════════════════
     🛡️ HELPERS
     ══════════════════════════════════════════ */
  function escapeHtml(str) {
    if (!str) return '';
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(str));
    return d.innerHTML;
  }

  function $(id) {
    return document.getElementById(id);
  }

  function isReleased(fecha) {
    if (!fecha) return true;
    return new Date(fecha) <= new Date();
  }

  function parseDuration(dur) {
    if (!dur || dur === '--:--') return 0;
    var parts = String(dur).split(':');
    if (parts.length === 2) return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    if (parts.length === 3) return parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10);
    return 0;
  }

  function formatDuration(totalSecs) {
    var h = Math.floor(totalSecs / 3600);
    var m = Math.floor((totalSecs % 3600) / 60);
    var s = Math.floor(totalSecs % 60);
    if (h > 0) return h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function formatNumber(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
  }

  function debounce(fn, ms) {
    var timer;
    return function () {
      var self = this, args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(self, args); }, ms);
    };
  }


  /* ══════════════════════════════════════════
     🎨 VISUALIZER — Generate bars via JS
     ══════════════════════════════════════════ */
  function initVisualizer() {
    var wave = $('kxRadWave');
    if (!wave || wave.children.length > 0) return;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < 24; i++) {
      var bar = document.createElement('div');
      bar.className = 'kx-rad-viz-bar';
      bar.style.animationDelay = (i * 0.03) + 's';
      frag.appendChild(bar);
    }
    wave.appendChild(frag);
  }


  /* ══════════════════════════════════════════
     🎚 BIND ALL EVENTS — Called once on first init
     ══════════════════════════════════════════ */
  function bindEvents() {
    if (eventsReady) return;
    eventsReady = true;

    console.log('📻 Radio: Binding events...');

    /* ── Play / Nav / Shuffle buttons ── */
    var playBtn = $('kxRadPlayBtn');
    if (playBtn) playBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      radioToggle();
    });

    var nextBtn = $('kxRadNext');
    if (nextBtn) nextBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      radioNext();
    });

    var prevBtn = $('kxRadPrev');
    if (prevBtn) prevBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      radioPrev();
    });

    var shuffleBtn = $('kxRadShuffle');
    if (shuffleBtn) shuffleBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      radioShuffleToggle();
    });

    /* ── Volume icon (mute toggle) ── */
    var volIcon = $('kxRadVolIcon');
    if (volIcon) volIcon.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      toggleMute();
    });

    /* ── Progress bar ── */
    var progressBar = $('kxRadProgressBar');
    if (progressBar) {
      progressBar.addEventListener('click', function (e) {
        if (!radioAudio.duration) return;
        var r = this.getBoundingClientRect();
        radioAudio.currentTime = ((e.clientX - r.left) / r.width) * radioAudio.duration;
      });

      progressBar.addEventListener('keydown', function (e) {
        if (!radioAudio.duration) return;
        if (e.key === 'ArrowRight') { radioAudio.currentTime = Math.min(radioAudio.duration, radioAudio.currentTime + 5); e.preventDefault(); }
        if (e.key === 'ArrowLeft') { radioAudio.currentTime = Math.max(0, radioAudio.currentTime - 5); e.preventDefault(); }
      });
    }

    /* ── Volume bar ── */
    var volBar = $('kxRadVolBar');
    if (volBar) {
      volBar.addEventListener('click', function (e) {
        var r = this.getBoundingClientRect();
        var p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
        setVolume(p);
      });

      volBar.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
          setVolume(Math.min(1, K.radioVolume + 0.05));
          e.preventDefault();
        }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
          setVolume(Math.max(0, K.radioVolume - 0.05));
          e.preventDefault();
        }
      });
    }

    /* ── Queue list — Event delegation ── */
    var queueList = $('kxRadQueueList');
    if (queueList) {
      queueList.addEventListener('click', function (e) {
        var item = e.target.closest('.kx-rad-item');
        if (!item) return;
        var idx = parseInt(item.getAttribute('data-idx'), 10);
        console.log('📻 Queue click, idx:', idx);
        if (!isNaN(idx)) radioPlay(idx);
      });

      queueList.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        var item = e.target.closest('.kx-rad-item');
        if (!item) return;
        e.preventDefault();
        var idx = parseInt(item.getAttribute('data-idx'), 10);
        if (!isNaN(idx)) radioPlay(idx);
      });
    } else {
      console.warn('📻 Radio: kxRadQueueList NOT FOUND');
    }

    /* ── Search ── */
    var searchInput = $('kxRadSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', debounce(function () {
        currentSearchTerm = this.value.trim();
        renderQueue();
      }, 200));
    }

    console.log('📻 Radio: Events bound ✅');
  }


  /* ══════════════════════════════════════════
     📻 INIT RADIO
     ══════════════════════════════════════════ */
  K.initRadio = async function () {
    initVisualizer();
    bindEvents();

    if (K.radioReady && K.radioPlaylist.length > 0) {
      renderQueue();
      updateStats();
      return;
    }

    try {
      var r = await db.from('canciones')
        .select('*, albumes(titulo, imagen_url, fecha_lanzamiento)')
        .order('created_at', { ascending: false });

      if (r.error) throw r.error;

      var allSongs = r.data || [];

      var released = allSongs.filter(function (s) {
        var songOk = isReleased(s.fecha_lanzamiento);
        var albumOk = true;
        if (s.albumes && s.albumes.fecha_lanzamiento) {
          albumOk = isReleased(s.albumes.fecha_lanzamiento);
        }
        return songOk && albumOk;
      });

      K.radioPlaylist = released.map(function (s) {
        return {
          id: s.id,
          titulo: s.titulo,
          archivo_url: s.archivo_url,
          imagen_url: s.imagen_url || (s.albumes ? s.albumes.imagen_url : '') || '',
          album: s.albumes ? s.albumes.titulo : 'KXON Radio',
          duracion: s.duracion || '--:--',
          reproducciones: s.reproducciones || 0
        };
      });

      K.radioShuffled = shuffleArr([].concat(K.radioPlaylist));

      renderQueue();
      updateStats();
      K.radioReady = true;

      console.log('📻 Radio: ' + released.length + ' canciones disponibles (filtradas ' + (allSongs.length - released.length) + ' no lanzadas)');

    } catch (e) {
      console.error('Radio error:', e);
      renderError();
    }
  };


  /* ══════════════════════════════════════════
     🔧 HELPERS
     ══════════════════════════════════════════ */
  function shuffleArr(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function getRL() {
    return K.radioShuffleMode ? K.radioShuffled : K.radioPlaylist;
  }


  /* ══════════════════════════════════════════
     📊 STATS
     ══════════════════════════════════════════ */
  function updateStats() {
    var list = K.radioPlaylist;
    var totalPlays = 0;
    var totalDurSecs = 0;

    for (var i = 0; i < list.length; i++) {
      totalPlays += (list[i].reproducciones || 0);
      totalDurSecs += parseDuration(list[i].duracion);
    }

    var elCount = $('kxRadQueueCount');
    if (elCount) elCount.textContent = list.length + ' canciones en cola';

    var elTotal = $('kxRadStatTotal');
    if (elTotal) elTotal.textContent = list.length;

    var elPlays = $('kxRadStatPlays');
    if (elPlays) elPlays.textContent = formatNumber(totalPlays);

    var elDur = $('kxRadStatDuration');
    if (elDur) elDur.textContent = formatDuration(totalDurSecs);
  }


  /* ══════════════════════════════════════════
     🖼️ DISC IMAGE
     ══════════════════════════════════════════ */
  function updateDiscImage(imgUrl) {
    var img = $('kxRadDiscImg');
    var fallback = $('kxRadDiscFallback');
    if (!img || !fallback) return;

    if (imgUrl && imgUrl.length > 0) {
      img.src = imgUrl;
      img.style.display = 'block';
      fallback.style.display = 'none';
      img.onerror = function () {
        this.style.display = 'none';
        fallback.style.display = 'flex';
      };
    } else {
      img.style.display = 'none';
      fallback.style.display = 'flex';
    }

    var bg = $('kxRadHeroBg');
    if (bg && imgUrl) {
      bg.style.backgroundImage = 'url(' + imgUrl + ')';
    }
  }


  /* ══════════════════════════════════════════
     🎵 PLAY / TOGGLE / NEXT / PREV
     ══════════════════════════════════════════ */
  function setPlayingUI(isPlaying) {
    var disc = $('kxRadDisc');
    var onAir = $('kxRadOnAir');
    var playBtn = $('kxRadPlayBtn');
    var iconPlay = playBtn ? playBtn.querySelector('.kx-rad-icon-play') : null;
    var iconPause = playBtn ? playBtn.querySelector('.kx-rad-icon-pause') : null;
    var wave = $('kxRadWave');
    var arm = $('kxRadArm');

    if (disc) disc.classList.toggle('is-spinning', isPlaying);
    if (onAir) onAir.classList.toggle('is-active', isPlaying);
    if (playBtn) playBtn.classList.toggle('is-playing', isPlaying);
    if (iconPlay) iconPlay.style.display = isPlaying ? 'none' : 'block';
    if (iconPause) iconPause.style.display = isPlaying ? 'block' : 'none';
    if (wave) wave.classList.toggle('is-active', isPlaying);
    if (arm) arm.classList.toggle('is-playing', isPlaying);

    var pp = document.getElementById('playerPlayPause');
    if (pp) pp.textContent = isPlaying ? '⏸' : '▶';
    K.isPlaying = isPlaying;
  }

  function radioPlay(idx) {
    var list = getRL();
    if (!list || !list[idx]) {
      console.warn('📻 radioPlay: No track at index', idx, 'list length:', list ? list.length : 0);
      return;
    }
    K.radioIndex = idx;
    var t = list[idx];

    console.log('📻 Playing:', t.titulo, 'idx:', idx);

    K.stopAllAudio('radio');
    K.activeSource = 'radio';

    radioAudio.src = t.archivo_url;
    radioAudio.volume = K.radioVolume;
    radioAudio.play().catch(function(err) {
      console.error('📻 Play error:', err);
    });
    K.radioIsPlaying = true;

    updateDiscImage(t.imagen_url);
    setPlayingUI(true);

    var tt = $('kxRadTitle');
    if (tt) tt.textContent = t.titulo;
    var ta = $('kxRadAlbum');
    if (ta) ta.textContent = t.album;

    var thumb = $('kxRadProgressThumb');
    if (thumb) thumb.style.transform = 'translate(-50%,-50%) scale(1)';

    updateQueueHighlight();

    /* Player bar */
    var playerBar = document.getElementById('playerBar');
    if (playerBar) playerBar.classList.add('show');
    var playerTitle = document.getElementById('playerTitle');
    if (playerTitle) playerTitle.textContent = t.titulo;
    var playerCover = document.getElementById('playerCover');
    if (playerCover) playerCover.src = t.imagen_url || '';

    /* Playlist for expanded player */
    K.currentPlaylist = list.map(function (song) {
      return {
        id: song.id,
        titulo: song.titulo,
        archivo_url: song.archivo_url,
        imagen_url: song.imagen_url,
        duracion: song.duracion
      };
    });
    K.currentTrackIndex = idx;
    K.currentAlbumCover = t.imagen_url || '';

    if (typeof K.updateRadioFavState === 'function') setTimeout(K.updateRadioFavState, 100);
    if (typeof K.updatePlayerFavState === 'function') setTimeout(K.updatePlayerFavState, 100);

    if (typeof K.addToHistorial === 'function') {
      K.addToHistorial(t);
    }

    db.rpc('increment_reproducciones', { song_id: t.id }).then(function (res) {
      if (res.error) console.warn('Error updating radio plays:', res.error.message);
    });
  }

  function radioToggle() {
    if (K.radioPlaylist.length === 0) {
      K.showToast('No hay canciones disponibles', 'error');
      return;
    }

    if (K.radioIsPlaying) {
      radioAudio.pause();
      K.radioIsPlaying = false;
      setPlayingUI(false);
    } else {
      if (K.radioIndex === -1) {
        radioPlay(0);
      } else {
        K.stopAllAudio('radio');
        K.activeSource = 'radio';
        radioAudio.play().catch(function(err) {
          console.error('📻 Resume error:', err);
        });
        K.radioIsPlaying = true;
        setPlayingUI(true);
      }
    }
  }

  function radioNext() {
    var list = getRL();
    if (list.length === 0) return;
    var n = K.radioIndex + 1;
    if (n >= list.length) {
      if (K.radioShuffleMode) K.radioShuffled = shuffleArr([].concat(K.radioPlaylist));
      n = 0;
    }
    radioPlay(n);
  }

  function radioPrev() {
    var list = getRL();
    if (list.length === 0) return;
    if (radioAudio.currentTime > 3) {
      radioAudio.currentTime = 0;
      return;
    }
    var p = K.radioIndex - 1;
    if (p < 0) p = list.length - 1;
    radioPlay(p);
  }

  function radioShuffleToggle() {
    K.radioShuffleMode = !K.radioShuffleMode;
    var btn = $('kxRadShuffle');

    if (K.radioShuffleMode) {
      if (btn) {
        btn.classList.add('is-active');
        btn.setAttribute('aria-pressed', 'true');
      }
      K.radioShuffled = shuffleArr([].concat(K.radioPlaylist));
      K.showToast('Aleatorio activado', 'success');
    } else {
      if (btn) {
        btn.classList.remove('is-active');
        btn.setAttribute('aria-pressed', 'false');
      }
      K.showToast('Modo secuencial', 'success');
    }

    K.radioIndex = 0;
    renderQueue();
  }

  /* Backward compat */
  window._rjump = function (i) { radioPlay(i); };


  /* ══════════════════════════════════════════
     ⏱ AUDIO EVENTS
     ══════════════════════════════════════════ */
  radioAudio.addEventListener('timeupdate', function () {
    if (!radioAudio.duration) return;
    var pct = (radioAudio.currentTime / radioAudio.duration) * 100;

    var fill = $('kxRadProgressFill');
    if (fill) fill.style.width = pct + '%';

    var thumb = $('kxRadProgressThumb');
    if (thumb) thumb.style.left = pct + '%';

    var ct = $('kxRadTimeCurrent');
    if (ct) ct.textContent = K.formatTime(radioAudio.currentTime);

    var dt = $('kxRadTimeDuration');
    if (dt) dt.textContent = K.formatTime(radioAudio.duration);

    if (K.activeSource === 'radio') {
      var pf = document.getElementById('progressFill');
      if (pf) pf.style.width = pct + '%';
      var pct2 = document.getElementById('playerCurrentTime');
      if (pct2) pct2.textContent = K.formatTime(radioAudio.currentTime);
      var pd = document.getElementById('playerDuration');
      if (pd) pd.textContent = K.formatTime(radioAudio.duration);
    }
  });

  radioAudio.addEventListener('ended', function () {
    radioNext();
  });


  /* ══════════════════════════════════════════
     🔊 VOLUME HELPERS
     ══════════════════════════════════════════ */
  function setVolume(p) {
    K.radioVolume = p;
    radioAudio.volume = p;

    var vf = $('kxRadVolFill');
    if (vf) vf.style.width = (p * 100) + '%';

    var vp = $('kxRadVolPct');
    if (vp) vp.textContent = Math.round(p * 100) + '%';

    var vbar = $('kxRadVolBar');
    if (vbar) vbar.setAttribute('aria-valuenow', Math.round(p * 100));

    updateVolIcon(p);
  }

  function updateVolIcon(vol) {
    var iconEl = $('kxRadVolIcon');
    if (!iconEl) return;
    var high = iconEl.querySelector('.kx-rad-icon-vol-high');
    var mid = iconEl.querySelector('.kx-rad-icon-vol-mid');
    var low = iconEl.querySelector('.kx-rad-icon-vol-low');
    var mute = iconEl.querySelector('.kx-rad-icon-vol-mute');
    if (!high || !mid || !low || !mute) return;

    high.style.display = 'none';
    mid.style.display = 'none';
    low.style.display = 'none';
    mute.style.display = 'none';

    if (vol === 0) mute.style.display = 'block';
    else if (vol < 0.3) low.style.display = 'block';
    else if (vol < 0.7) mid.style.display = 'block';
    else high.style.display = 'block';
  }

  var savedVolume = 0.7;

  function toggleMute() {
    if (radioAudio.volume > 0) {
      savedVolume = radioAudio.volume;
      setVolume(0);
    } else {
      setVolume(savedVolume || 0.7);
    }
  }


  /* ══════════════════════════════════════════
     📋 QUEUE RENDERING
     ══════════════════════════════════════════ */
  var currentSearchTerm = '';

  function renderQueue() {
    var container = $('kxRadQueueList');
    if (!container) {
      console.warn('📻 renderQueue: container not found');
      return;
    }

    var list = getRL();

    if (!list || list.length === 0) {
      container.innerHTML =
        '<div class="kx-rad-empty">' +
          '<div class="kx-rad-empty-icon">' +
            '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>' +
          '</div>' +
          '<p class="kx-rad-empty-title">Sin canciones disponibles</p>' +
          '<p class="kx-rad-empty-text">Las canciones aparecerán cuando se lancen</p>' +
        '</div>';
      return;
    }

    var filtered;
    var noResults = $('kxRadNoResults');

    if (currentSearchTerm) {
      var term = currentSearchTerm.toLowerCase();
      filtered = [];
      for (var fi = 0; fi < list.length; fi++) {
        if (list[fi].titulo.toLowerCase().indexOf(term) >= 0 ||
            list[fi].album.toLowerCase().indexOf(term) >= 0) {
          filtered.push({ item: list[fi], originalIndex: fi });
        }
      }

      if (filtered.length === 0) {
        container.innerHTML = '';
        if (noResults) noResults.style.display = 'block';
        return;
      }

      if (noResults) noResults.style.display = 'none';
    } else {
      if (noResults) noResults.style.display = 'none';
      filtered = list.map(function (item, idx) { return { item: item, originalIndex: idx }; });
    }

    var html = '';
    var MUSIC_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';
    var EQ_HTML = '<div class="kx-rad-item-eq"><span></span><span></span><span></span><span></span></div>';

    for (var i = 0; i < filtered.length; i++) {
      var s = filtered[i].item;
      var origIdx = filtered[i].originalIndex;
      var isNow = (origIdx === K.radioIndex);

      var coverHtml;
      if (s.imagen_url) {
        coverHtml = '<img src="' + escapeHtml(s.imagen_url) + '" alt="" loading="lazy">';
      } else {
        coverHtml = '<div class="kx-rad-item-cover-fallback">' + MUSIC_SVG + '</div>';
      }

      var numText = isNow
        ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>'
        : String(origIdx + 1);

      var endHtml;
      if (isNow && K.radioIsPlaying) {
        endHtml = EQ_HTML;
      } else {
        endHtml = '<span class="kx-rad-item-duration">' + escapeHtml(s.duracion) + '</span>';
      }

      html += '<div class="kx-rad-item' + (isNow ? ' is-playing' : '') + '" role="listitem" data-idx="' + origIdx + '" style="--i:' + (i < 30 ? i : 0) + '" tabindex="0" aria-label="' + escapeHtml(s.titulo) + ' - ' + escapeHtml(s.album) + '">';
      html += '<span class="kx-rad-item-num">' + numText + '</span>';
      html += '<div class="kx-rad-item-cover">' + coverHtml + '</div>';
      html += '<div class="kx-rad-item-info">';
      html += '<div class="kx-rad-item-title">' + escapeHtml(s.titulo) + '</div>';
      html += '<div class="kx-rad-item-album">' + escapeHtml(s.album) + '</div>';
      html += '</div>';
      html += endHtml;
      html += '</div>';
    }

    container.innerHTML = html;
    console.log('📻 Queue rendered:', filtered.length, 'items');
  }


  function updateQueueHighlight() {
    var items = document.querySelectorAll('.kx-rad-item');
    var list = getRL();
    var PLAY_SVG = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
    var EQ_HTML = '<div class="kx-rad-item-eq"><span></span><span></span><span></span><span></span></div>';

    for (var i = 0; i < items.length; i++) {
      var idx = parseInt(items[i].getAttribute('data-idx'), 10);
      var isNow = (idx === K.radioIndex);

      items[i].classList.toggle('is-playing', isNow);

      var num = items[i].querySelector('.kx-rad-item-num');
      if (num) {
        num.innerHTML = isNow ? PLAY_SVG : String(idx + 1);
      }

      var existingEq = items[i].querySelector('.kx-rad-item-eq');
      var existingDur = items[i].querySelector('.kx-rad-item-duration');

      if (isNow && K.radioIsPlaying) {
        if (existingDur) existingDur.outerHTML = EQ_HTML;
        items[i].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        if (existingEq) {
          var song = list[idx];
          var dur = song ? song.duracion : '--:--';
          existingEq.outerHTML = '<span class="kx-rad-item-duration">' + escapeHtml(dur) + '</span>';
        }
      }
    }
  }


  /* ══════════════════════════════════════════
     ❌ ERROR STATE
     ══════════════════════════════════════════ */
  function renderError() {
    var container = $('kxRadQueueList');
    if (!container) return;
    container.innerHTML =
      '<div class="kx-rad-empty">' +
        '<div class="kx-rad-empty-icon">' +
          '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' +
        '</div>' +
        '<p class="kx-rad-empty-title">Error al cargar la radio</p>' +
        '<p class="kx-rad-empty-text">Intenta recargar la página</p>' +
      '</div>';
  }

})();