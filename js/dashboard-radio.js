/* ============================================
📻 DASHBOARD-RADIO.JS — KXON REDESIGN 2026
Radio KXON: Reproducción continua, cola, shuffle
Namespace: kx-rad-*
✅ FIX: Compatibilidad con init order
✅ FIX: Canciones no cargaban por filtro de fechas
✅ FIX: Event listeners duplicados
✅ FIX: radioAudio referencia segura
============================================ */
(function () {

  /* ══════════════════════════════════════════
     🛡️ SAFE REFERENCES — Espera a que KXON exista
  ══════════════════════════════════════════ */
  function getK() {
    return window.KXON || {};
  }

  function getDb() {
    return window.db;
  }

  function getRadioAudio() {
    var K = getK();
    if (K.radioAudio) return K.radioAudio;
    // Fallback: crear uno si no existe aún
    if (!window._kxRadioAudioFallback) {
      window._kxRadioAudioFallback = new Audio();
    }
    return window._kxRadioAudioFallback;
  }

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
    try {
      var d = new Date(fecha);
      if (isNaN(d.getTime())) return true; // fecha inválida = mostrar
      return d <= new Date();
    } catch (e) {
      return true; // si hay error, mostrar la canción
    }
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
     🎨 VISUALIZER
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
     🎚 BIND ALL EVENTS
  ══════════════════════════════════════════ */
  function bindEvents() {
    if (eventsReady) return;
    eventsReady = true;

    console.log('📻 Radio: Binding events...');

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

    var volIcon = $('kxRadVolIcon');
    if (volIcon) volIcon.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      toggleMute();
    });

    var progressBar = $('kxRadProgressBar');
    if (progressBar) {
      progressBar.addEventListener('click', function (e) {
        var ra = getRadioAudio();
        if (!ra.duration) return;
        var r = this.getBoundingClientRect();
        ra.currentTime = ((e.clientX - r.left) / r.width) * ra.duration;
      });

      progressBar.addEventListener('keydown', function (e) {
        var ra = getRadioAudio();
        if (!ra.duration) return;
        if (e.key === 'ArrowRight') { ra.currentTime = Math.min(ra.duration, ra.currentTime + 5); e.preventDefault(); }
        if (e.key === 'ArrowLeft') { ra.currentTime = Math.max(0, ra.currentTime - 5); e.preventDefault(); }
      });
    }

    var volBar = $('kxRadVolBar');
    if (volBar) {
      volBar.addEventListener('click', function (e) {
        var r = this.getBoundingClientRect();
        var p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
        setVolume(p);
      });

      volBar.addEventListener('keydown', function (e) {
        var K = getK();
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
          setVolume(Math.min(1, (K.radioVolume || 0.7) + 0.05));
          e.preventDefault();
        }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
          setVolume(Math.max(0, (K.radioVolume || 0.7) - 0.05));
          e.preventDefault();
        }
      });
    }

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

    var searchInput = $('kxRadSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', debounce(function () {
        currentSearchTerm = this.value.trim();
        renderQueue();
      }, 200));
    }

    /* ── Audio events ── */
    var radioAudio = getRadioAudio();

    radioAudio.addEventListener('timeupdate', function () {
      var K = getK();
      if (!radioAudio.duration) return;
      var pct = (radioAudio.currentTime / radioAudio.duration) * 100;

      var fill = $('kxRadProgressFill');
      if (fill) fill.style.width = pct + '%';

      var thumb = $('kxRadProgressThumb');
      if (thumb) thumb.style.left = pct + '%';

      var ct = $('kxRadTimeCurrent');
      if (ct && K.formatTime) ct.textContent = K.formatTime(radioAudio.currentTime);

      var dt = $('kxRadTimeDuration');
      if (dt && K.formatTime) dt.textContent = K.formatTime(radioAudio.duration);

      if (K.activeSource === 'radio') {
        var pf = document.getElementById('progressFill');
        if (pf) pf.style.width = pct + '%';
        var pct2 = document.getElementById('playerCurrentTime');
        if (pct2 && K.formatTime) pct2.textContent = K.formatTime(radioAudio.currentTime);
        var pd = document.getElementById('playerDuration');
        if (pd && K.formatTime) pd.textContent = K.formatTime(radioAudio.duration);
      }
    });

    radioAudio.addEventListener('ended', function () {
      radioNext();
    });

    radioAudio.addEventListener('error', function (e) {
      console.error('📻 Radio audio error:', e);
      var K = getK();
      if (K.showToast) K.showToast('Error al reproducir. Saltando...', 'error');
      setTimeout(function () { radioNext(); }, 1000);
    });

    console.log('📻 Radio: Events bound ✅');
  }

  /* ══════════════════════════════════════════
     📻 INIT RADIO — Función principal
  ══════════════════════════════════════════ */
  function initRadio() {
    var K = getK();
    var db = getDb();

    console.log('📻 Radio: initRadio called');
    console.log('📻 Radio: K exists?', !!K);
    console.log('📻 Radio: db exists?', !!db);
    console.log('📻 Radio: radioReady?', K.radioReady);

    // Verificar que el panel HTML existe (no fue reemplazado por access control)
    var queueList = $('kxRadQueueList');
    if (!queueList) {
      console.warn('📻 Radio: Panel HTML no encontrado (posiblemente bloqueado por access control)');
      return;
    }

    initVisualizer();
    bindEvents();

    if (K.radioReady && K.radioPlaylist && K.radioPlaylist.length > 0) {
      console.log('📻 Radio: Already loaded, rendering...');
      renderQueue();
      updateStats();
      return;
    }

    if (!db) {
      console.error('📻 Radio: No database connection');
      renderError('Sin conexión a la base de datos');
      return;
    }

    // Cargar canciones
    loadRadioSongs();
  }

  async function loadRadioSongs() {
    var K = getK();
    var db = getDb();

    try {
      console.log('📻 Radio: Cargando canciones desde Supabase...');

      var r = await db.from('canciones')
        .select('*, albumes(titulo, imagen_url, fecha_lanzamiento)')
        .order('created_at', { ascending: false });

      if (r.error) {
        console.error('📻 Radio: Supabase error:', r.error);
        throw r.error;
      }

      var allSongs = r.data || [];
      console.log('📻 Radio: Total canciones en DB:', allSongs.length);

      // DEBUG: Mostrar las primeras canciones para verificar datos
      if (allSongs.length > 0) {
        console.log('📻 Radio: Primera canción:', JSON.stringify(allSongs[0], null, 2));
      }

      if (allSongs.length === 0) {
        console.warn('📻 Radio: No hay canciones en la tabla "canciones"');
        K.radioPlaylist = [];
        K.radioShuffled = [];
        renderQueue();
        updateStats();
        K.radioReady = true;
        return;
      }

      // Filtrar canciones lanzadas (con logs para debug)
      var released = [];
      var blocked = [];

      for (var i = 0; i < allSongs.length; i++) {
        var s = allSongs[i];
        var songOk = isReleased(s.fecha_lanzamiento);
        var albumOk = true;

        if (s.albumes && s.albumes.fecha_lanzamiento) {
          albumOk = isReleased(s.albumes.fecha_lanzamiento);
        }

        if (songOk && albumOk) {
          released.push(s);
        } else {
          blocked.push({
            titulo: s.titulo,
            fecha_cancion: s.fecha_lanzamiento,
            fecha_album: s.albumes ? s.albumes.fecha_lanzamiento : null,
            songOk: songOk,
            albumOk: albumOk
          });
        }
      }

      console.log('📻 Radio: Canciones disponibles:', released.length);
      console.log('📻 Radio: Canciones bloqueadas por fecha:', blocked.length);

      if (blocked.length > 0) {
        console.log('📻 Radio: Canciones bloqueadas:', JSON.stringify(blocked.slice(0, 5)));
      }

      // Si TODAS están bloqueadas por fecha, mostrar todas de todos modos
      if (released.length === 0 && allSongs.length > 0) {
        console.warn('📻 Radio: TODAS las canciones están bloqueadas por fecha. Mostrando todas de todos modos.');
        released = allSongs;
      }

      // Filtrar canciones sin archivo de audio
      var playable = [];
      var noAudio = [];

      for (var j = 0; j < released.length; j++) {
        if (released[j].archivo_url && released[j].archivo_url.trim() !== '') {
          playable.push(released[j]);
        } else {
          noAudio.push(released[j].titulo);
        }
      }

      if (noAudio.length > 0) {
        console.warn('📻 Radio: Canciones sin archivo_url:', noAudio);
      }

      console.log('📻 Radio: Canciones reproducibles:', playable.length);

      K.radioPlaylist = playable.map(function (s) {
        return {
          id: s.id,
          titulo: s.titulo || 'Sin título',
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

      console.log('📻 Radio: ✅ Listo! ' + K.radioPlaylist.length + ' canciones en la cola');

    } catch (e) {
      console.error('📻 Radio: Error cargando canciones:', e);
      renderError('Error al cargar: ' + (e.message || 'desconocido'));
    }
  }

  // Asignar initRadio al namespace KXON
  // Necesitamos esperar a que KXON exista
  function assignInitRadio() {
    if (window.KXON) {
      window.KXON.initRadio = initRadio;
      console.log('📻 Radio: initRadio asignado a KXON ✅');
    } else {
      // KXON aún no existe, reintentar
      console.log('📻 Radio: Esperando a KXON...');
      setTimeout(assignInitRadio, 50);
    }
  }
  assignInitRadio();

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
    var K = getK();
    return K.radioShuffleMode ? (K.radioShuffled || []) : (K.radioPlaylist || []);
  }

  /* ══════════════════════════════════════════
     📊 STATS
  ══════════════════════════════════════════ */
  function updateStats() {
    var K = getK();
    var list = K.radioPlaylist || [];
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
    var K = getK();
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
    if (pp) {
      var ppPlay = pp.querySelector('.kx-ply-icon-play');
      var ppPause = pp.querySelector('.kx-ply-icon-pause');
      if (ppPlay) ppPlay.style.display = isPlaying ? 'none' : 'block';
      if (ppPause) ppPause.style.display = isPlaying ? 'block' : 'none';
    }
    K.isPlaying = isPlaying;
  }

  function radioPlay(idx) {
    var K = getK();
    var db = getDb();
    var radioAudio = getRadioAudio();
    var list = getRL();

    if (!list || !list[idx]) {
      console.warn('📻 radioPlay: No track at index', idx, 'list length:', list ? list.length : 0);
      return;
    }

    K.radioIndex = idx;
    var t = list[idx];

    console.log('📻 Playing:', t.titulo, 'url:', t.archivo_url ? t.archivo_url.substring(0, 80) + '...' : 'NO URL');

    if (!t.archivo_url) {
      console.error('📻 Track has no archivo_url!');
      if (K.showToast) K.showToast('Canción sin archivo de audio', 'error');
      return;
    }

    if (typeof K.stopAllAudio === 'function') K.stopAllAudio('radio');
    K.activeSource = 'radio';

    radioAudio.src = t.archivo_url;
    radioAudio.volume = K.radioVolume || 0.7;
    
    var playPromise = radioAudio.play();
    if (playPromise && playPromise.catch) {
      playPromise.catch(function (err) {
        console.error('📻 Play error:', err.message);
        if (K.showToast) K.showToast('Error al reproducir: ' + err.message, 'error');
      });
    }

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

    if (db) {
      db.rpc('increment_reproducciones', { song_id: t.id }).then(function (res) {
        if (res && res.error) console.warn('Error updating radio plays:', res.error.message);
      });
    }
  }

  function radioToggle() {
    var K = getK();
    var radioAudio = getRadioAudio();

    if (!K.radioPlaylist || K.radioPlaylist.length === 0) {
      if (K.showToast) K.showToast('No hay canciones disponibles', 'error');
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
        if (typeof K.stopAllAudio === 'function') K.stopAllAudio('radio');
        K.activeSource = 'radio';
        var playPromise = radioAudio.play();
        if (playPromise && playPromise.catch) {
          playPromise.catch(function (err) {
            console.error('📻 Resume error:', err);
          });
        }
        K.radioIsPlaying = true;
        setPlayingUI(true);
      }
    }
  }

  function radioNext() {
    var K = getK();
    var list = getRL();
    if (!list || list.length === 0) return;
    var n = (K.radioIndex || 0) + 1;
    if (n >= list.length) {
      if (K.radioShuffleMode) K.radioShuffled = shuffleArr([].concat(K.radioPlaylist));
      n = 0;
    }
    radioPlay(n);
  }

  function radioPrev() {
    var K = getK();
    var radioAudio = getRadioAudio();
    var list = getRL();
    if (!list || list.length === 0) return;
    if (radioAudio.currentTime > 3) {
      radioAudio.currentTime = 0;
      return;
    }
    var p = (K.radioIndex || 0) - 1;
    if (p < 0) p = list.length - 1;
    radioPlay(p);
  }

  function radioShuffleToggle() {
    var K = getK();
    K.radioShuffleMode = !K.radioShuffleMode;
    var btn = $('kxRadShuffle');

    if (K.radioShuffleMode) {
      if (btn) {
        btn.classList.add('is-active');
        btn.setAttribute('aria-pressed', 'true');
      }
      K.radioShuffled = shuffleArr([].concat(K.radioPlaylist || []));
      if (K.showToast) K.showToast('Aleatorio activado', 'success');
    } else {
      if (btn) {
        btn.classList.remove('is-active');
        btn.setAttribute('aria-pressed', 'false');
      }
      if (K.showToast) K.showToast('Modo secuencial', 'success');
    }

    K.radioIndex = 0;
    renderQueue();
  }

  /* Backward compat */
  window._rjump = function (i) { radioPlay(i); };

  /* ══════════════════════════════════════════
     🔊 VOLUME HELPERS
  ══════════════════════════════════════════ */
  function setVolume(p) {
    var K = getK();
    var radioAudio = getRadioAudio();
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
    var radioAudio = getRadioAudio();
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
    var K = getK();
    var container = $('kxRadQueueList');
    if (!container) {
      console.warn('📻 renderQueue: container not found');
      return;
    }

    var list = getRL();

    console.log('📻 renderQueue: list length =', list ? list.length : 0);

    if (!list || list.length === 0) {
      container.innerHTML =
        '<div class="kx-rad-empty">' +
          '<div class="kx-rad-empty-icon">' +
            '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>' +
          '</div>' +
          '<p class="kx-rad-empty-title">Sin canciones disponibles</p>' +
          '<p class="kx-rad-empty-text">Sube canciones a la tabla "canciones" en Supabase</p>' +
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
    console.log('📻 Queue rendered:', filtered.length, 'items ✅');
  }

  function updateQueueHighlight() {
    var K = getK();
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
  function renderError(msg) {
    var container = $('kxRadQueueList');
    if (!container) return;
    container.innerHTML =
      '<div class="kx-rad-empty">' +
        '<div class="kx-rad-empty-icon">' +
          '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' +
        '</div>' +
        '<p class="kx-rad-empty-title">Error al cargar la radio</p>' +
        '<p class="kx-rad-empty-text">' + escapeHtml(msg || 'Intenta recargar la página') + '</p>' +
        '<button onclick="window.KXON && window.KXON.initRadio && window.KXON.initRadio()" style="margin-top:16px;padding:10px 24px;background:rgba(139,92,246,0.15);border:1px solid rgba(139,92,246,0.25);color:#a78bfa;border-radius:8px;cursor:pointer;font-size:0.8rem;">🔄 Reintentar</button>' +
      '</div>';
  }

})();