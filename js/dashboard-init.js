/**
 * 🚀 KXON — Dashboard Init v4.1
 * Session · Navigation · Player · Access Control
 * UPDATED: Compatible with kx-ply-* player redesign (SVG icons)
 */
(function () {
    'use strict';

    var db = window.db;

    /* ══════════════════════════════════════
       HELPERS
       ══════════════════════════════════════ */
    function $(id) { return document.getElementById(id); }

    function $on(id, event, fn) {
        var el = $(id);
        if (el) el.addEventListener(event, fn);
        return el;
    }

    /**
     * 🎵 Toggle play/pause SVG icons on any button
     * Works with the new kx-ply-* player that uses SVG icons
     * instead of emoji text content (▶/⏸)
     */
    function _setPlayIcon(el, isPlaying) {
        if (!el) return;
        var playIcon = el.querySelector('.kx-ply-icon-play');
        var pauseIcon = el.querySelector('.kx-ply-icon-pause');
        if (playIcon) playIcon.style.display = isPlaying ? 'none' : 'block';
        if (pauseIcon) pauseIcon.style.display = isPlaying ? 'block' : 'none';
    }

    /* ══════════════════════════════════════
       NAMESPACE GLOBAL
       ══════════════════════════════════════ */
    window.KXON = {
        currentUser: null,
        currentProfile: null,
        currentPanel: 'inicio',
        isAdmin: false,
        currentAlbumId: null,
        currentAlbumCover: '',
        currentTrackIndex: -1,
        currentPlaylist: [],
        isPlaying: false,
        allNoticiasData: [],
        allMarketData: [],
        currentMarketTab: 'beat',
        currentMarketItem: null,
        allVideosData: [],
        allDocuData: [],
        allEpisodiosData: [],
        currentDocuId: null,
        currentDocuCover: '',
        archivoData: [],
        archivoSolicitudes: [],
        archivoCurrentTab: 'todos',
        archivoCurrentPlayingUrl: '',
        radioPlaylist: [],
        radioShuffled: [],
        radioIndex: -1,
        radioIsPlaying: false,
        radioVolume: 0.7,
        radioShuffleMode: true,
        radioReady: false,
        userSubscription: null,
        userAccesos: [],
        activeSource: 'none'
    };

    var K = window.KXON;

    /* ══════════════════════════════════════
       AUDIO ELEMENTS
       ══════════════════════════════════════ */
    K.audioEl = $('audioPlayer');
    K.marketPreviewAudio = new Audio();
    K.archivoPreviewAudio = new Audio();
    K.radioAudio = new Audio();

    /* ══════════════════════════════════════
       TOAST · FORMAT HELPERS
       ══════════════════════════════════════ */
    K.showToast = function (msg, type) {
        var c = $('toastContainer');
        if (!c) return;
        var d = document.createElement('div');
        d.className = 'toast toast-' + type;
        d.textContent = msg;
        c.appendChild(d);
        setTimeout(function () { d.remove(); }, 3500);
    };

    K.formatTime = function (s) {
        var m = Math.floor(s / 60);
        var sec = Math.floor(s % 60);
        return m + ':' + (sec < 10 ? '0' : '') + sec;
    };

    K.formatPrice = function (p) {
        return '$' + Number(p).toLocaleString('es-CO');
    };

    /* ══════════════════════════════════════
       STOP ALL AUDIO
       ══════════════════════════════════════ */
    K.stopAllAudio = function (except) {
        if (except !== 'player' && K.audioEl) K.audioEl.pause();
        if (except !== 'market') K.marketPreviewAudio.pause();
        if (except !== 'archivo') K.archivoPreviewAudio.pause();

        if (except !== 'radio') {
            K.radioAudio.pause();
            if (K.radioIsPlaying) {
                K.radioIsPlaying = false;
                var disc = $('kxRadDisc');
                if (disc) disc.classList.remove('is-spinning');
                var btn = $('kxRadPlayBtn');
                if (btn) {
                    btn.classList.remove('is-playing');
                    var playIcon = btn.querySelector('.kx-rad-icon-play');
                    var pauseIcon = btn.querySelector('.kx-rad-icon-pause');
                    if (playIcon) playIcon.style.display = 'block';
                    if (pauseIcon) pauseIcon.style.display = 'none';
                }
            }
        }
    };

    /* ══════════════════════════════════════
       ACCESS CONTROL / SUBSCRIPTION
       ══════════════════════════════════════ */
    var LOCKABLE_PANELS = [
        'albumes', 'canciones', 'radio', 'videos', 'documentales',
        'playlists', 'envivo', 'chat', 'solicitar-beat',
        'historial', 'favoritos', 'marketplace'
    ];

    var PANEL_NAMES = {
        'albumes': 'Álbumes', 'canciones': 'Canciones', 'radio': 'Radio KXON',
        'videos': 'Videos', 'documentales': 'Documentales', 'playlists': 'Playlists',
        'envivo': 'En Vivo', 'chat': 'Chat', 'solicitar-beat': 'Solicitar Beat',
        'historial': 'Historial', 'favoritos': 'Favoritos', 'marketplace': 'Marketplace'
    };

    var PANEL_ICONS = {
        'albumes': '💿', 'canciones': '🎵', 'radio': '📻', 'videos': '🎬',
        'documentales': '🎞️', 'playlists': '🎶', 'envivo': '🔴', 'chat': '💬',
        'solicitar-beat': '📋', 'historial': '📊', 'favoritos': '❤️', 'marketplace': '🛒'
    };

    var panelOriginalHTML = {};

    K.checkAccess = function (panelId) {
        if (K.isAdmin) return true;
        if (LOCKABLE_PANELS.indexOf(panelId) === -1) return true;
        if (!K.userSubscription) return false;
        return K.userAccesos.indexOf(panelId) >= 0;
    };

    K.loadUserSubscription = async function () {
        if (K.isAdmin) {
            K.userSubscription = { estado: 'admin' };
            K.userAccesos = LOCKABLE_PANELS.slice();
            return;
        }

        try {
            var r = await db.from('suscripciones')
                .select('*, planes(nombre, accesos, duracion_dias)')
                .eq('usuario_id', K.currentUser.id)
                .eq('estado', 'activa')
                .order('fecha_fin', { ascending: false })
                .limit(1);

            if (r.error) throw r.error;

            if (r.data && r.data.length > 0) {
                var sub = r.data[0];
                var fin = new Date(sub.fecha_fin);
                if (fin > new Date()) {
                    K.userSubscription = sub;
                    K.userAccesos = sub.planes ? sub.planes.accesos : [];
                    return;
                }
                await db.from('suscripciones').update({ estado: 'vencida' }).eq('id', sub.id);
            }

            K.userSubscription = null;
            K.userAccesos = [];
        } catch (e) {
            console.error('Error cargando suscripción:', e);
            K.userSubscription = null;
            K.userAccesos = [];
        }
    };

    function renderLockedPanel(panelId) {
        var panel = $('panel-' + panelId);
        if (!panel) return;
        var nombre = PANEL_NAMES[panelId] || panelId;
        var icono = PANEL_ICONS[panelId] || '🔒';

        panel.innerHTML =
            '<div class="panel-locked">' +
                '<div class="locked-icon">🔒</div>' +
                '<h2 class="locked-title">Contenido Bloqueado</h2>' +
                '<p class="locked-desc">Necesitas una suscripción activa para acceder a <strong>' + icono + ' ' + nombre + '</strong></p>' +
                '<div class="locked-feature-preview"><div class="locked-feature-item">' + icono + ' ' + nombre + '</div></div>' +
                '<button class="locked-btn" onclick="window.KXON.showPanel(\'planes\')">🎫 Ver Planes y Suscribirse</button>' +
                '<p class="locked-plan-hint">Elige un plan para desbloquear este y más contenido</p>' +
            '</div>';
    }

    function saveAllPanelHTML() {
        LOCKABLE_PANELS.forEach(function (pid) {
            var el = $('panel-' + pid);
            if (el && !panelOriginalHTML[pid]) {
                panelOriginalHTML[pid] = el.innerHTML;
            }
        });
    }

    function restorePanelHTML(pid) {
        var el = $('panel-' + pid);
        if (el && panelOriginalHTML[pid]) el.innerHTML = panelOriginalHTML[pid];
    }

    K.applyAccessControl = function () {
        LOCKABLE_PANELS.forEach(function (pid) {
            if (K.checkAccess(pid)) restorePanelHTML(pid);
            else renderLockedPanel(pid);
        });
    };

    /* ══════════════════════════════════════
       MODALS
       ══════════════════════════════════════ */
    K.openModal = function (id) {
        var el = $(id);
        if (el) el.classList.add('show');
    };

    K.closeModal = function (id) {
        var el = $(id);
        if (el) el.classList.remove('show');
        resetModalForm(id);
    };

    function resetModalForm(id) {
        var modal = $(id);
        if (!modal) return;

        var inputs = modal.querySelectorAll('input[type="text"], input[type="number"], input[type="datetime-local"], textarea');
        inputs.forEach(function (inp) { inp.value = ''; });

        var fileInputs = modal.querySelectorAll('input[type="file"]');
        fileInputs.forEach(function (fi) { fi.value = ''; });

        var previews = modal.querySelectorAll('.img-preview');
        previews.forEach(function (p) { p.classList.remove('show'); });

        var areas = modal.querySelectorAll('.file-upload-area');
        areas.forEach(function (a) {
            a.classList.remove('has-file');
            var ft = a.querySelector('.file-upload-text');
            if (ft) ft.textContent = ft.getAttribute('data-default') || 'Click para subir';
        });

        var progress = modal.querySelectorAll('.upload-progress');
        progress.forEach(function (p) { p.classList.remove('show'); });

        var fills = modal.querySelectorAll('.upload-bar-fill');
        fills.forEach(function (f) { f.style.width = '0%'; });

        K._selectedCoverFile = null;
        K._selectedAudioFile = null;
        K._selectedNoticiaFile = null;
        K._videoThumbFileSelected = null;
        K._videoFileSelected = null;
        K._docuCoverFileSelected = null;
        K._episodioThumbFileSelected = null;
        K._episodioVideoFileSelected = null;
    }

    /* ══════════════════════════════════════
       SIDEBAR RENDER
       ══════════════════════════════════════ */
    function renderSidebar() {
        var name = K.currentProfile.full_name || K.currentUser.email.split('@')[0];
        var role = K.currentProfile.role || 'fan';
        var av = K.currentProfile.avatar_url ||
                 K.currentUser.user_metadata?.avatar_url ||
                 K.currentUser.user_metadata?.picture || '';

        var sn = $('sidebarName');
        if (sn) sn.textContent = name;

        var sr = $('sidebarRole');
        if (sr) {
            sr.textContent = role;
            sr.className = 'sidebar-user-role role-' + role;
        }

        var sa = $('sidebarAvatar');
        if (sa) {
            if (av) sa.innerHTML = '<img src="' + av + '" alt="">';
            else sa.textContent = name.charAt(0).toUpperCase();
        }

        var adminNavs = document.querySelectorAll('.nav-admin-only');
        adminNavs.forEach(function (n) { n.style.display = K.isAdmin ? 'flex' : 'none'; });
    }

    /* ══════════════════════════════════════
       PANEL NAVIGATION
       ══════════════════════════════════════ */
    var PANEL_TITLES = {
        'inicio': 'Inicio', 'albumes': 'Álbumes', 'canciones': 'Canciones',
        'radio': 'Radio KXON', 'playlists': 'Mis Playlists', 'videos': 'Videos',
        'envivo': 'En Vivo', 'documentales': 'Documentales', 'marketplace': 'Marketplace',
        'archivo': 'Archivo', 'planes': 'Planes', 'historial': 'Historial',
        'perfil': 'Mi Perfil', 'favoritos': 'Mis Favoritos', 'analytics': 'Analytics',
        'chat': 'Chat KXON', 'solicitar-beat': 'Solicitar Beat'
    };

    var PANEL_ADD_TEXT = {
        'inicio': 'Nueva Noticia', 'albumes': 'Nuevo Álbum', 'videos': 'Nuevo Video',
        'documentales': 'Nuevo Documental', 'marketplace': 'Nuevo Producto'
    };

    var navItems = document.querySelectorAll('.nav-item');

    K.showPanel = function (id) {
        K.currentPanel = id;

        var panels = document.querySelectorAll('.panel');
        panels.forEach(function (p) { p.classList.remove('active'); });
        var target = $('panel-' + id);
        if (target) target.classList.add('active');

        navItems.forEach(function (n) {
            n.classList.toggle('active', n.getAttribute('data-panel') === id);
        });

        var ht = $('headerTitle');
        if (ht) ht.textContent = PANEL_TITLES[id] || 'KXON';

        var addText = PANEL_ADD_TEXT[id];
        var btn = $('btnAdminAdd');
        var btnText = $('btnAdminText');
        if (btn) {
            if (K.isAdmin && addText) {
                btn.classList.add('visible');
                if (btnText) btnText.textContent = addText;
            } else {
                btn.classList.remove('visible');
            }
        }

        var sb = $('sidebar');
        if (sb) sb.classList.remove('open');
        var so = $('sidebarOverlay');
        if (so) so.classList.remove('show');

        if (LOCKABLE_PANELS.indexOf(id) >= 0) {
            if (!K.checkAccess(id)) {
                renderLockedPanel(id);
                return;
            }
            if (panelOriginalHTML[id]) {
                var panelEl = $('panel-' + id);
                if (panelEl && panelEl.innerHTML.indexOf('panel-locked') >= 0) {
                    restorePanelHTML(id);
                }
            }
        }

        loadPanelData(id);
    };

    function loadPanelData(id) {
        var loaders = {
            'inicio':         function () { if (typeof K.renderInicio === 'function') K.renderInicio(); },
            'albumes':        function () {
                var alv = $('albumesListView'); if (alv) alv.style.display = 'block';
                var adv = $('albumDetailView'); if (adv) adv.classList.remove('show');
                if (typeof K.loadAlbumes === 'function') K.loadAlbumes();
            },
            'canciones':      function () { if (typeof K.loadAllCanciones === 'function') K.loadAllCanciones(); },
            'radio':          function () { if (typeof K.initRadio === 'function') K.initRadio(); },
            'videos':         function () { if (typeof K.loadVideos === 'function') K.loadVideos(); },
            'envivo':         function () { if (typeof K.loadLiveStatus === 'function') K.loadLiveStatus(); },
            'documentales':   function () {
                var dl = $('docuListSection'); if (dl) dl.style.display = 'block';
                var dd = $('docuDetailView'); if (dd) dd.classList.remove('show');
                if (typeof K.loadDocumentales === 'function') K.loadDocumentales();
            },
            'perfil':         function () { if (typeof K.loadPerfilData === 'function') K.loadPerfilData(); },
            'marketplace':    function () { if (typeof K.loadMarketplace === 'function') K.loadMarketplace(); },
            'archivo':        function () { if (typeof K.loadArchivo === 'function') K.loadArchivo(); },
            'planes':         function () { if (typeof K.loadPlanes === 'function') K.loadPlanes(); },
            'favoritos':      function () { if (typeof K.loadFavsPanel === 'function') K.loadFavsPanel(); },
            'analytics':      function () { if (typeof K.loadAnalytics === 'function') K.loadAnalytics(); },
            'playlists':      function () { if (typeof window._loadPlaylists === 'function') window._loadPlaylists(); },
            'historial':      function () { if (typeof K.loadHistorial === 'function') K.loadHistorial(); },
            'chat':           function () { if (typeof K.loadChat === 'function') K.loadChat(); },
            'solicitar-beat': function () { if (typeof K.loadSolicitudesBeats === 'function') K.loadSolicitudesBeats(); }
        };

        if (loaders[id]) loaders[id]();
    }

    /* ══════════════════════════════════════
       PLAYER BAR — UPDATED FOR SVG ICONS
       ══════════════════════════════════════ */
    var audioEl = K.audioEl;

    $on('playerPlayPause', 'click', function (e) {
        e.stopPropagation();
        var pp = this;

        if (K.isPlaying) {
            pauseCurrentSource();
            _setPlayIcon(pp, false);
            K.isPlaying = false;
        } else {
            playCurrentSource();
            _setPlayIcon(pp, true);
            K.isPlaying = true;
        }
    });

    function pauseCurrentSource() {
        if (K.activeSource === 'radio') {
            K.radioAudio.pause();
            K.radioIsPlaying = false;
        } else if (K.activeSource === 'archivo') {
            K.archivoPreviewAudio.pause();
        } else if (K.activeSource === 'market') {
            K.marketPreviewAudio.pause();
        } else {
            if (audioEl) audioEl.pause();
        }
    }

    function playCurrentSource() {
        if (K.activeSource === 'radio') {
            if (K.radioIndex === -1) {
                if (typeof window._rjump === 'function') window._rjump(0);
            } else {
                K.radioAudio.play();
                K.radioIsPlaying = true;
            }
        } else if (K.activeSource === 'archivo' && K.archivoPreviewAudio.src) {
            K.archivoPreviewAudio.play();
        } else if (K.activeSource === 'market' && K.marketPreviewAudio.src) {
            K.marketPreviewAudio.play();
        } else {
            if (audioEl) audioEl.play();
        }
    }

    $on('playerNext', 'click', function (e) {
        e.stopPropagation();
        if (K.activeSource === 'radio') {
            var list = K.radioShuffleMode ? K.radioShuffled : K.radioPlaylist;
            if (list.length === 0) return;
            var n = (K.radioIndex + 1) % list.length;
            if (typeof window._rjump === 'function') window._rjump(n);
            return;
        }
        if (K.currentTrackIndex < K.currentPlaylist.length - 1) {
            K.playTrack(K.currentTrackIndex + 1);
        }
    });

    $on('playerPrev', 'click', function (e) {
        e.stopPropagation();
        if (K.activeSource === 'radio') {
            var list = K.radioShuffleMode ? K.radioShuffled : K.radioPlaylist;
            if (list.length === 0) return;
            if (K.radioAudio.currentTime > 3) { K.radioAudio.currentTime = 0; return; }
            var p = K.radioIndex - 1;
            if (p < 0) p = list.length - 1;
            if (typeof window._rjump === 'function') window._rjump(p);
            return;
        }
        if (K.currentTrackIndex > 0) K.playTrack(K.currentTrackIndex - 1);
    });

    // Audio timeupdate
    if (audioEl) {
        audioEl.addEventListener('timeupdate', function () {
            if (K.activeSource !== 'player' || !audioEl.duration) return;
            var pf = $('progressFill');
            if (pf) pf.style.width = (audioEl.currentTime / audioEl.duration * 100) + '%';
            var pct = $('playerCurrentTime');
            if (pct) pct.textContent = K.formatTime(audioEl.currentTime);
            var pd = $('playerDuration');
            if (pd) pd.textContent = K.formatTime(audioEl.duration);
        });

        audioEl.addEventListener('ended', function () {
            if (K.currentTrackIndex < K.currentPlaylist.length - 1) {
                K.playTrack(K.currentTrackIndex + 1);
            } else {
                K.isPlaying = false;
                var pp = $('playerPlayPause');
                _setPlayIcon(pp, false);
            }
        });
    }

    // Progress bar click
    $on('progressBar', 'click', function (e) {
        e.stopPropagation();
        var r = this.getBoundingClientRect();
        var pct = (e.clientX - r.left) / r.width;
        if (K.activeSource === 'radio' && K.radioAudio.duration) {
            K.radioAudio.currentTime = pct * K.radioAudio.duration;
        } else if (audioEl && audioEl.duration) {
            audioEl.currentTime = pct * audioEl.duration;
        }
    });

    // Volume bar click
    $on('volumeBar', 'click', function (e) {
        e.stopPropagation();
        var r = this.getBoundingClientRect();
        var p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
        if (K.activeSource === 'radio') {
            K.radioVolume = p;
            K.radioAudio.volume = p;
        } else if (audioEl) {
            audioEl.volume = p;
        }
        var vf = $('volumeFill');
        if (vf) vf.style.width = (p * 100) + '%';
    });

    /* ══════════════════════════════════════
       PLAY TRACK — UPDATED FOR SVG ICONS
       ══════════════════════════════════════ */
    K.playTrack = function (idx) {
        if (!K.currentPlaylist || !K.currentPlaylist[idx]) return;
        var track = K.currentPlaylist[idx];

        K.stopAllAudio('player');
        K.activeSource = 'player';

        if (audioEl) {
            audioEl.src = track.archivo_url;
            audioEl.play();
        }

        K.isPlaying = true;
        K.currentTrackIndex = idx;

        // Update mini player bar
        var pb = $('playerBar');
        if (pb) pb.classList.add('show');

        var pt = $('playerTitle');
        if (pt) pt.textContent = track.titulo;

        var pc = $('playerCover');
        if (pc) pc.src = track.imagen_url || K.currentAlbumCover || '';

        // ✅ Use SVG icon helper instead of textContent
        var pp = $('playerPlayPause');
        _setPlayIcon(pp, true);

        // Update track list UI
        var items = document.querySelectorAll('.track-item');
        items.forEach(function (item, i) {
            item.classList.toggle('playing', i === idx);
            var btn = item.querySelector('.track-play-btn');
            if (btn) btn.textContent = i === idx ? '⏸' : '▶';
        });

        // Register in history
        if (typeof K.addToHistorial === 'function') {
            K.addToHistorial({
                id: track.id,
                titulo: track.titulo,
                imagen_url: track.imagen_url || K.currentAlbumCover || '',
                album: track.album || '',
                duracion: track.duracion || '--:--'
            });
        }

        // Increment plays
        db.rpc('increment_reproducciones', { song_id: track.id });
    };

    window._playTrack = function (idx) { K.playTrack(idx); };

    K.playTrackList = function (tracks, startIndex) {
        if (!tracks || !tracks.length) return;

        K.stopAllAudio('player');
        K.activeSource = 'player';

        K.currentPlaylist = tracks.map(function (t) {
            return {
                id: t.id,
                titulo: t.titulo,
                archivo_url: t.audio_url,
                imagen_url: t.cover || '',
                reproducciones: 0
            };
        });

        var idx = Math.min(startIndex || 0, K.currentPlaylist.length - 1);
        var track = K.currentPlaylist[idx];

        if (audioEl) {
            audioEl.src = track.archivo_url;
            audioEl.play();
        }

        K.isPlaying = true;
        K.currentTrackIndex = idx;

        var pb = $('playerBar');
        if (pb) pb.classList.add('show');

        var pt = $('playerTitle');
        if (pt) pt.textContent = track.titulo;

        var pc = $('playerCover');
        if (pc) pc.src = track.imagen_url || '';

        // ✅ Use SVG icon helper instead of textContent
        var pp = $('playerPlayPause');
        _setPlayIcon(pp, true);
    };

    // Close player — UPDATED FOR SVG ICONS
    $on('playerCloseBtn', 'click', function (e) {
        e.stopPropagation();
        if (audioEl) { audioEl.pause(); audioEl.currentTime = 0; }
        K.marketPreviewAudio.pause(); K.marketPreviewAudio.currentTime = 0;
        K.archivoPreviewAudio.pause(); K.archivoPreviewAudio.currentTime = 0;
        K.archivoCurrentPlayingUrl = '';
        K.radioAudio.pause(); K.radioAudio.currentTime = 0;
        K.radioIsPlaying = false;

        K.isPlaying = false;
        K.activeSource = 'none';

        var pb = $('playerBar');
        if (pb) pb.classList.remove('show');

        // ✅ Reset SVG icons to play state
        var pp = $('playerPlayPause');
        _setPlayIcon(pp, false);

        var pf = $('progressFill');
        if (pf) pf.style.width = '0%';

        document.querySelectorAll('.track-item').forEach(function (item) {
            item.classList.remove('playing');
            var btn = item.querySelector('.track-play-btn');
            if (btn) btn.textContent = '▶';
        });
    });

    /* ══════════════════════════════════════
       EVENT BINDINGS
       ══════════════════════════════════════ */
    navItems.forEach(function (item) {
        item.addEventListener('click', function () {
            K.showPanel(this.getAttribute('data-panel'));
        });
    });

    $on('btnHamburger', 'click', function () {
        var sb = $('sidebar'); if (sb) sb.classList.toggle('open');
        var so = $('sidebarOverlay'); if (so) so.classList.toggle('show');
    });

    $on('sidebarOverlay', 'click', function () {
        var sb = $('sidebar'); if (sb) sb.classList.remove('open');
        this.classList.remove('show');
    });

    $on('btnLogout', 'click', async function () {
        await db.auth.signOut();
        localStorage.removeItem('kxon_role');
        localStorage.removeItem('kxon_name');
        window.location.href = 'login.html';
    });

    $on('btnAdminAdd', 'click', function () {
        var modalMap = {
            'albumes': 'modalAlbum',
            'inicio': 'modalNoticia',
            'videos': 'modalVideo',
            'documentales': 'modalDocumental',
            'marketplace': 'modalMarketAdd'
        };
        var mid = modalMap[K.currentPanel];
        if (mid) K.openModal(mid);
        else K.showToast('Función próximamente', 'success');
    });

    var modalCloseMap = [
        ['modalAlbumClose', 'modalAlbum'], ['modalAlbumCancel', 'modalAlbum'],
        ['modalCancionClose', 'modalCancion'], ['modalCancionCancel', 'modalCancion'],
        ['modalNoticiaClose', 'modalNoticia'], ['modalNoticiaCancel', 'modalNoticia'],
        ['modalVideoClose', 'modalVideo'], ['modalVideoCancel', 'modalVideo'],
        ['modalDocumentalClose', 'modalDocumental'], ['modalDocumentalCancel', 'modalDocumental'],
        ['modalEpisodioClose', 'modalEpisodio'], ['modalEpisodioCancel', 'modalEpisodio']
    ];

    modalCloseMap.forEach(function (pair) {
        $on(pair[0], 'click', function () { K.closeModal(pair[1]); });
    });

    var overlayCloseIds = [
        'modalAlbum', 'modalCancion', 'modalNoticia', 'modalVideo',
        'modalDocumental', 'modalEpisodio', 'modalSolicitudBeat',
        'modalNoticiaDetalle', 'modalPlaylist', 'modalAddToPlaylist',
        'lyricsOverlay', 'lyricsEditOverlay'
    ];

    overlayCloseIds.forEach(function (mid) {
        var el = $(mid);
        if (el) {
            el.addEventListener('click', function (e) {
                if (e.target !== this) return;
                if (mid === 'modalNoticiaDetalle') {
                    this.classList.remove('show');
                } else if (mid === 'modalPlaylist' && typeof window._closePlaylistModal === 'function') {
                    window._closePlaylistModal();
                } else if (mid === 'modalAddToPlaylist' && typeof window._closeAddToPlaylist === 'function') {
                    window._closeAddToPlaylist();
                } else if (mid === 'lyricsOverlay' && typeof window._closeLyrics === 'function') {
                    window._closeLyrics();
                } else if (mid === 'lyricsEditOverlay' && typeof window._closeLyricsEdit === 'function') {
                    window._closeLyricsEdit();
                } else {
                    K.closeModal(mid);
                }
            });
        }
    });

    var specialOverlays = [
        ['modalMarketAdd', function () { if (typeof window._closeMarketModal === 'function') window._closeMarketModal(); }],
        ['marketDetailOverlay', function () { $(this.id)?.classList.remove('show'); K.marketPreviewAudio.pause(); }],
        ['purchaseOverlay', function () { if (typeof window._closePurchase === 'function') window._closePurchase(); }]
    ];

    specialOverlays.forEach(function (pair) {
        var el = $(pair[0]);
        if (el) {
            el.addEventListener('click', function (e) {
                if (e.target === this) pair[1].call(this);
            });
        }
    });

    $on('btnAddTrack', 'click', function () { K.openModal('modalCancion'); });
    $on('btnBackAlbums', 'click', function () {
        var alv = $('albumesListView'); if (alv) alv.style.display = 'block';
        var adv = $('albumDetailView'); if (adv) adv.classList.remove('show');
    });

    /* ══════════════════════════════════════
       STATS
       ══════════════════════════════════════ */
    K.loadStats = async function () {
        try {
            var queries = [
                db.from('albumes').select('id', { count: 'exact', head: true }),
                db.from('canciones').select('id', { count: 'exact', head: true }),
                db.from('beats').select('id', { count: 'exact', head: true }),
                db.from('noticias').select('id', { count: 'exact', head: true })
            ];
            var results = await Promise.all(queries);
            var ids = ['statAlbumes', 'statCanciones', 'statBeats', 'statNoticias'];
            results.forEach(function (r, i) {
                var el = $(ids[i]);
                if (el) el.textContent = r.count || 0;
            });
        } catch (e) { console.error(e); }
    };

    /* ══════════════════════════════════════
       INIT
       ══════════════════════════════════════ */
    async function init() {
        try {
            var r = await db.auth.getSession();
            if (!r.data.session) { window.location.href = 'login.html'; return; }

            K.currentUser = r.data.session.user;

            var pr = await db.from('profiles').select('*').eq('id', K.currentUser.id).single();
            if (pr.data) {
                K.currentProfile = pr.data;
                K.isAdmin = pr.data.role === 'admin';
            } else {
                K.currentProfile = {
                    full_name: K.currentUser.user_metadata?.full_name || K.currentUser.user_metadata?.name || '',
                    role: 'fan',
                    avatar_url: K.currentUser.user_metadata?.avatar_url || ''
                };
                K.isAdmin = false;
            }

            renderSidebar();

            await K.loadUserSubscription();
            saveAllPanelHTML();
            K.applyAccessControl();

            if (typeof K.loadUserFavorites === 'function') await K.loadUserFavorites();

            K.loadStats();

            setTimeout(function () {
                if (typeof K.loadNotifications === 'function') K.loadNotifications();
            }, 100);

            if (typeof K.loadAlbumes === 'function') K.loadAlbumes();
            if (typeof K.loadAllCanciones === 'function') K.loadAllCanciones();
            if (typeof K.loadNoticias === 'function') K.loadNoticias();
            if (typeof K.loadVideos === 'function') K.loadVideos();
            if (typeof K.loadDocumentales === 'function') K.loadDocumentales();
            if (typeof K.loadMarketplace === 'function') K.loadMarketplace();
            if (typeof K.loadArchivo === 'function') K.loadArchivo();

            setTimeout(function () {
                if (typeof K.renderInicio === 'function') K.renderInicio();
                else setTimeout(function () { if (typeof K.renderInicio === 'function') K.renderInicio(); }, 500);
            }, 200);

            K.showPanel('inicio');

            setTimeout(function () {
                var ls = $('loadingScreen');
                if (ls) ls.classList.add('hide');
            }, 500);

        } catch (e) {
            console.error('Error en init:', e);
            window.location.href = 'login.html';
        }
    }

    init();

})();