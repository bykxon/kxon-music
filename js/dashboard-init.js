/* ============================================
   🚀 DASHBOARD-INIT.JS — KXON
   Inicialización, sesión, sidebar, navegación,
   player bar, helpers, variables compartidas
   CON BLOQUEO COMPLETO DE TODOS LOS PANELES
   ============================================ */
(function () {

    var db = window.db;

    /* ══════════════════════════════════════════
       📌 NAMESPACE GLOBAL COMPARTIDO
       ══════════════════════════════════════════ */
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

    /* ══════════════════════════════════════════
       🔊 ELEMENTOS DE AUDIO GLOBALES
       ══════════════════════════════════════════ */
    window.KXON.audioEl = document.getElementById('audioPlayer');
    window.KXON.marketPreviewAudio = new Audio();
    window.KXON.archivoPreviewAudio = new Audio();
    window.KXON.radioAudio = new Audio();

    /* ══════════════════════════════════════════
       🔔 HELPERS: TOAST, FORMAT
       ══════════════════════════════════════════ */
    window.KXON.showToast = function (m, t) {
        var c = document.getElementById('toastContainer');
        var d = document.createElement('div');
        d.className = 'toast toast-' + t;
        d.textContent = m;
        c.appendChild(d);
        setTimeout(function () { d.remove(); }, 3500);
    };

    window.KXON.formatTime = function (s) {
        var m = Math.floor(s / 60);
        var sec = Math.floor(s % 60);
        return m + ':' + (sec < 10 ? '0' : '') + sec;
    };

    window.KXON.formatPrice = function (p) {
        return '$' + Number(p).toLocaleString('es-CO');
    };

    /* ══════════════════════════════════════════
       🛑 HELPER: DETENER TODAS LAS FUENTES DE AUDIO
       ══════════════════════════════════════════ */
    window.KXON.stopAllAudio = function (except) {
        if (except !== 'player') {
            K.audioEl.pause();
        }
        if (except !== 'radio') {
            K.radioAudio.pause();
            if (K.radioIsPlaying) {
                K.radioIsPlaying = false;
                var d = document.getElementById('radioDisc'); if (d) d.classList.remove('spinning');
                var pb = document.getElementById('radioPlayBtn'); if (pb) pb.classList.remove('playing');
                var pi = document.getElementById('radioPlayIcon'); if (pi) pi.textContent = '▶';
            }
        }
        if (except !== 'market') {
            K.marketPreviewAudio.pause();
        }
        if (except !== 'archivo') {
            K.archivoPreviewAudio.pause();
        }
    };

    /* ══════════════════════════════════════════
       🔒 VERIFICACIÓN DE SUSCRIPCIÓN
       TODOS LOS PANELES BLOQUEABLES
       ══════════════════════════════════════════ */
    var panelesBloqueados = [
        'albumes', 'canciones', 'radio', 'videos', 'documentales',
        'playlists', 'envivo', 'chat', 'solicitar-beat',
        'historial', 'favoritos', 'marketplace'
    ];

    var panelNombres = {
        'albumes': 'Álbumes',
        'canciones': 'Canciones',
        'radio': 'Radio KXON',
        'videos': 'Videos',
        'documentales': 'Documentales',
        'playlists': 'Playlists',
        'envivo': 'En Vivo',
        'chat': 'Chat',
        'solicitar-beat': 'Solicitar Beat',
        'historial': 'Historial',
        'favoritos': 'Favoritos',
        'marketplace': 'Marketplace'
    };

    var panelIconos = {
        'albumes': '💿',
        'canciones': '🎵',
        'radio': '📻',
        'videos': '🎬',
        'documentales': '🎞️',
        'playlists': '🎶',
        'envivo': '🔴',
        'chat': '💬',
        'solicitar-beat': '📋',
        'historial': '📊',
        'favoritos': '❤️',
        'marketplace': '🛒'
    };

    window.KXON.checkAccess = function (panelId) {
        if (K.isAdmin) return true;
        if (panelesBloqueados.indexOf(panelId) === -1) return true;
        if (!K.userSubscription) return false;
        if (K.userAccesos.indexOf(panelId) >= 0) return true;
        return false;
    };

    window.KXON.loadUserSubscription = async function () {
        if (K.isAdmin) {
            K.userSubscription = { estado: 'admin' };
            K.userAccesos = [
                'albumes', 'canciones', 'radio', 'videos', 'documentales',
                'playlists', 'envivo', 'chat', 'solicitar-beat',
                'historial', 'favoritos', 'marketplace'
            ];
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
                var now = new Date();
                var fin = new Date(sub.fecha_fin);

                if (fin > now) {
                    K.userSubscription = sub;
                    K.userAccesos = sub.planes ? sub.planes.accesos : [];
                    return;
                } else {
                    await db.from('suscripciones').update({ estado: 'vencida' }).eq('id', sub.id);
                }
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
        var panel = document.getElementById('panel-' + panelId);
        if (!panel) return;

        var nombre = panelNombres[panelId] || panelId;
        var icono = panelIconos[panelId] || '🔒';

        panel.innerHTML =
            '<div class="panel-locked">' +
            '<div class="locked-icon">🔒</div>' +
            '<h2 class="locked-title">Contenido Bloqueado</h2>' +
            '<p class="locked-desc">Necesitas una suscripción activa para acceder a <strong>' + icono + ' ' + nombre + '</strong></p>' +
            '<div class="locked-feature-preview">' +
            '<div class="locked-feature-item">' + icono + ' ' + nombre + '</div>' +
            '</div>' +
            '<button class="locked-btn" onclick="window.KXON.showPanel(\'planes\')">🎫 Ver Planes y Suscribirse</button>' +
            '<p class="locked-plan-hint">Elige un plan para desbloquear este y más contenido</p>' +
            '</div>';
    }

    var panelOriginalHTML = {};

    function savePanelHTML(panelId) {
        var el = document.getElementById('panel-' + panelId);
        if (el && !panelOriginalHTML[panelId]) {
            panelOriginalHTML[panelId] = el.innerHTML;
        }
    }

    function restorePanelHTML(panelId) {
        var el = document.getElementById('panel-' + panelId);
        if (el && panelOriginalHTML[panelId]) {
            el.innerHTML = panelOriginalHTML[panelId];
        }
    }

    function saveAllPanelHTML() {
        for (var i = 0; i < panelesBloqueados.length; i++) {
            savePanelHTML(panelesBloqueados[i]);
        }
    }

    window.KXON.applyAccessControl = function () {
        for (var i = 0; i < panelesBloqueados.length; i++) {
            var pid = panelesBloqueados[i];
            if (K.checkAccess(pid)) {
                restorePanelHTML(pid);
            } else {
                renderLockedPanel(pid);
            }
        }
    };

    /* ══════════════════════════════════════════
       🔲 MODALES — ABRIR / CERRAR
       ══════════════════════════════════════════ */
    window.KXON.openModal = function (id) {
        var el = document.getElementById(id);
        if (el) el.classList.add('show');
    };

    window.KXON.closeModal = function (id) {
        var el = document.getElementById(id);
        if (el) el.classList.remove('show');

        if (id === 'modalAlbum') {
            var at = document.getElementById('albumTitulo'); if (at) at.value = '';
            var ad = document.getElementById('albumDesc'); if (ad) ad.value = '';
            var fechaAlbum = document.getElementById('albumFechaLanzamiento');
            if (fechaAlbum) fechaAlbum.value = '';
            K._selectedCoverFile = null;
            var area = document.getElementById('albumCoverArea');
            if (area) { area.classList.remove('has-file'); var ft = area.querySelector('.file-upload-text'); if (ft) ft.textContent = 'Click para subir imagen'; }
            var acp = document.getElementById('albumCoverPreview'); if (acp) acp.classList.remove('show');
            var acf = document.getElementById('albumCoverFile'); if (acf) acf.value = '';
        }
        if (id === 'modalCancion') {
            var ct = document.getElementById('cancionTitulo'); if (ct) ct.value = '';
            var fechaCancion = document.getElementById('cancionFechaLanzamiento');
            if (fechaCancion) fechaCancion.value = '';
            K._selectedAudioFile = null;
            var area2 = document.getElementById('cancionAudioArea');
            if (area2) { area2.classList.remove('has-file'); var ft2 = area2.querySelector('.file-upload-text'); if (ft2) ft2.textContent = 'Click para subir audio'; }
            var caf = document.getElementById('cancionAudioFile'); if (caf) caf.value = '';
            var up = document.getElementById('uploadProgress'); if (up) up.classList.remove('show');
            var ubf = document.getElementById('uploadBarFill'); if (ubf) ubf.style.width = '0%';
        }
        if (id === 'modalNoticia') {
            var nt = document.getElementById('noticiaTitulo'); if (nt) nt.value = '';
            var nd = document.getElementById('noticiaDesc'); if (nd) nd.value = '';
            K._selectedNoticiaFile = null;
            var area3 = document.getElementById('noticiaCoverArea');
            if (area3) { area3.classList.remove('has-file'); var ft3 = area3.querySelector('.file-upload-text'); if (ft3) ft3.textContent = 'Click para subir imagen'; }
            var ncp = document.getElementById('noticiaCoverPreview'); if (ncp) ncp.classList.remove('show');
            var ncf = document.getElementById('noticiaCoverFile'); if (ncf) ncf.value = '';
        }
        if (id === 'modalVideo') {
            var vt = document.getElementById('videoTitulo'); if (vt) vt.value = '';
            var vd = document.getElementById('videoDesc'); if (vd) vd.value = '';
            K._videoThumbFileSelected = null;
            K._videoFileSelected = null;
            var a4 = document.getElementById('videoThumbArea');
            if (a4) { a4.classList.remove('has-file'); var ft4 = a4.querySelector('.file-upload-text'); if (ft4) ft4.textContent = 'Click para subir imagen'; }
            var vtp = document.getElementById('videoThumbPreview'); if (vtp) vtp.classList.remove('show');
            var vtf = document.getElementById('videoThumbFile'); if (vtf) vtf.value = '';
            var a5 = document.getElementById('videoFileArea');
            if (a5) { a5.classList.remove('has-file'); var ft5 = a5.querySelector('.file-upload-text'); if (ft5) ft5.textContent = 'Click para subir video'; }
            var vfi = document.getElementById('videoFileInput'); if (vfi) vfi.value = '';
            var vup = document.getElementById('videoUploadProgress'); if (vup) vup.classList.remove('show');
            var vuf = document.getElementById('videoUploadFill'); if (vuf) vuf.style.width = '0%';
        }
        if (id === 'modalDocumental') {
            var dtt = document.getElementById('docuTitulo'); if (dtt) dtt.value = '';
            var ddd = document.getElementById('docuDesc'); if (ddd) ddd.value = '';
            K._docuCoverFileSelected = null;
            var a6 = document.getElementById('docuCoverArea');
            if (a6) { a6.classList.remove('has-file'); var ft6 = a6.querySelector('.file-upload-text'); if (ft6) ft6.textContent = 'Click para subir imagen'; }
            var dcp = document.getElementById('docuCoverPreview'); if (dcp) dcp.classList.remove('show');
            var dcf = document.getElementById('docuCoverFile'); if (dcf) dcf.value = '';
        }
        if (id === 'modalEpisodio') {
            var ett = document.getElementById('episodioTitulo'); if (ett) ett.value = '';
            var edd = document.getElementById('episodioDesc'); if (edd) edd.value = '';
            var en = document.getElementById('episodioNumero'); if (en) en.value = '1';
            K._episodioThumbFileSelected = null;
            K._episodioVideoFileSelected = null;
            var a7 = document.getElementById('episodioThumbArea');
            if (a7) { a7.classList.remove('has-file'); var ft7 = a7.querySelector('.file-upload-text'); if (ft7) ft7.textContent = 'Click para subir imagen'; }
            var etp = document.getElementById('episodioThumbPreview'); if (etp) etp.classList.remove('show');
            var etf = document.getElementById('episodioThumbFile'); if (etf) etf.value = '';
            var a8 = document.getElementById('episodioVideoArea');
            if (a8) { a8.classList.remove('has-file'); var ft8 = a8.querySelector('.file-upload-text'); if (ft8) ft8.textContent = 'Click para subir video'; }
            var evf = document.getElementById('episodioVideoFile'); if (evf) evf.value = '';
            var eup = document.getElementById('episodioUploadProgress'); if (eup) eup.classList.remove('show');
            var euf = document.getElementById('episodioUploadFill'); if (euf) euf.style.width = '0%';
        }
    };

    /* ══════════════════════════════════════════
       👤 RENDER SIDEBAR
       ══════════════════════════════════════════ */
    function renderSidebar() {
        var name = K.currentProfile.full_name || K.currentUser.email.split('@')[0];
        var role = K.currentProfile.role || 'fan';
        var av = K.currentProfile.avatar_url || K.currentUser.user_metadata?.avatar_url || K.currentUser.user_metadata?.picture || '';

        document.getElementById('sidebarName').textContent = name;
        var re = document.getElementById('sidebarRole');
        re.textContent = role;
        re.className = 'sidebar-user-role role-' + role;

        var ae = document.getElementById('sidebarAvatar');
        if (av) ae.innerHTML = '<img src="' + av + '" alt="">';
        else ae.textContent = name.charAt(0).toUpperCase();

        var adminNavs = document.querySelectorAll('.nav-admin-only');
        for (var an = 0; an < adminNavs.length; an++) {
            adminNavs[an].style.display = K.isAdmin ? 'flex' : 'none';
        }
    }

    /* ══════════════════════════════════════════
       📊 STATS
       ══════════════════════════════════════════ */
    window.KXON.loadStats = async function () {
        try {
            var a = await db.from('albumes').select('id', { count: 'exact', head: true });
            var s = await db.from('canciones').select('id', { count: 'exact', head: true });
            var b = await db.from('beats').select('id', { count: 'exact', head: true });
            var n = await db.from('noticias').select('id', { count: 'exact', head: true });
            var ea = document.getElementById('statAlbumes'); if (ea) ea.textContent = a.count || 0;
            var es = document.getElementById('statCanciones'); if (es) es.textContent = s.count || 0;
            var eb = document.getElementById('statBeats'); if (eb) eb.textContent = b.count || 0;
            var en2 = document.getElementById('statNoticias'); if (en2) en2.textContent = n.count || 0;
        } catch (e) { console.error(e); }
    };

    /* ══════════════════════════════════════════
       🔀 PANEL NAVIGATION
       ══════════════════════════════════════════ */
    var panelTitles = {
        'inicio': 'Inicio', 'albumes': 'Álbumes', 'canciones': 'Canciones',
        'radio': 'Radio KXON', 'playlists': 'Mis Playlists', 'videos': 'Videos',
        'envivo': 'En Vivo',
        'documentales': 'Documentales', 'marketplace': 'Marketplace', 'archivo': 'Archivo',
        'planes': 'Planes', 'historial': 'Historial', 'perfil': 'Mi Perfil',
        'favoritos': 'Mis Favoritos', 'analytics': 'Analytics',
        'chat': 'Chat KXON',
        'solicitar-beat': 'Solicitar Beat'
    };
    var panelAddText = {
        'inicio': 'Nueva Noticia', 'albumes': 'Nuevo Álbum', 'canciones': '',
        'radio': '', 'playlists': '', 'videos': 'Nuevo Video', 'envivo': '',
        'documentales': 'Nuevo Documental', 'marketplace': 'Nuevo Producto',
        'archivo': '', 'planes': '', 'historial': '', 'perfil': '',
        'favoritos': '', 'analytics': '',
        'chat': '',
        'solicitar-beat': ''
    };

    var navItems = document.querySelectorAll('.nav-item');

    window.KXON.showPanel = function (id) {
        K.currentPanel = id;

        var panels = document.querySelectorAll('.panel');
        for (var i = 0; i < panels.length; i++) panels[i].classList.remove('active');
        var t = document.getElementById('panel-' + id);
        if (t) t.classList.add('active');

        for (var j = 0; j < navItems.length; j++) {
            navItems[j].classList.remove('active');
            if (navItems[j].getAttribute('data-panel') === id) navItems[j].classList.add('active');
        }

        document.getElementById('headerTitle').textContent = panelTitles[id] || 'KXON';

        var addText = panelAddText[id];
        var btn = document.getElementById('btnAdminAdd');
        if (K.isAdmin && addText) {
            btn.classList.add('visible');
            document.getElementById('btnAdminText').textContent = addText;
        } else {
            btn.classList.remove('visible');
        }

        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebarOverlay').classList.remove('show');

        if (panelesBloqueados.indexOf(id) >= 0 && !K.checkAccess(id)) {
            renderLockedPanel(id);
            return;
        }

        if (panelesBloqueados.indexOf(id) >= 0 && panelOriginalHTML[id]) {
            var currentHTML = document.getElementById('panel-' + id).innerHTML;
            if (currentHTML.indexOf('panel-locked') >= 0) {
                restorePanelHTML(id);
            }
        }

        if (id === 'inicio') {
            if (typeof K.renderInicio === 'function') K.renderInicio();
        }
        if (id === 'albumes') {
            var alv = document.getElementById('albumesListView'); if (alv) alv.style.display = 'block';
            var adv = document.getElementById('albumDetailView'); if (adv) adv.classList.remove('show');
            if (typeof K.loadAlbumes === 'function') K.loadAlbumes();
        }
        if (id === 'canciones' && typeof K.loadAllCanciones === 'function') K.loadAllCanciones();
        if (id === 'radio' && typeof K.initRadio === 'function') K.initRadio();
        if (id === 'videos' && typeof K.loadVideos === 'function') K.loadVideos();
        if (id === 'envivo' && typeof K.loadLiveStatus === 'function') K.loadLiveStatus();
        if (id === 'documentales') {
            var dlv = document.getElementById('docuListView'); if (dlv) dlv.style.display = 'block';
            var ddv = document.getElementById('docuDetailView'); if (ddv) ddv.classList.remove('show');
            if (typeof K.loadDocumentales === 'function') K.loadDocumentales();
        }
        if (id === 'perfil' && typeof K.loadPerfilData === 'function') K.loadPerfilData();
        if (id === 'marketplace' && typeof K.loadMarketplace === 'function') K.loadMarketplace();
        if (id === 'archivo' && typeof K.loadArchivo === 'function') K.loadArchivo();
        if (id === 'planes' && typeof K.loadPlanes === 'function') K.loadPlanes();
        if (id === 'favoritos' && typeof K.loadFavsPanel === 'function') K.loadFavsPanel();
        if (id === 'analytics' && typeof K.loadAnalytics === 'function') K.loadAnalytics();

        if (id === 'playlists' && typeof window._loadPlaylists === 'function') {
            window._loadPlaylists();
        }

        if (id === 'historial' && typeof window._loadHistorial === 'function') {
            window._loadHistorial();
        }

        if (id === 'chat' && typeof K.loadChat === 'function') {
            K.loadChat();
        }

        if (id === 'solicitar-beat' && typeof K.loadSolicitudesBeats === 'function') {
            K.loadSolicitudesBeats();
        }
    };

    /* ══════════════════════════════════════════
       🎶 PLAYER BAR — controles
       ══════════════════════════════════════════ */
    var audioEl = K.audioEl;

    document.getElementById('playerPlayPause').addEventListener('click', function (e) {
        e.stopPropagation();
        var self = this;

        if (K.isPlaying) {
            if (K.activeSource === 'radio') {
                K.radioAudio.pause();
                K.radioIsPlaying = false;
                var d = document.getElementById('radioDisc'); if (d) d.classList.remove('spinning');
                var pb = document.getElementById('radioPlayBtn'); if (pb) pb.classList.remove('playing');
                var pi = document.getElementById('radioPlayIcon'); if (pi) pi.textContent = '▶';
            } else if (K.activeSource === 'archivo') {
                K.archivoPreviewAudio.pause();
            } else if (K.activeSource === 'market') {
                K.marketPreviewAudio.pause();
            } else {
                audioEl.pause();
            }
            self.textContent = '▶';
            K.isPlaying = false;
        } else {
            if (K.activeSource === 'radio') {
                if (K.radioIndex === -1) {
                    if (typeof window._rjump === 'function') window._rjump(0);
                } else {
                    K.radioAudio.play();
                    K.radioIsPlaying = true;
                    var d2 = document.getElementById('radioDisc'); if (d2) d2.classList.add('spinning');
                    var pb2 = document.getElementById('radioPlayBtn'); if (pb2) pb2.classList.add('playing');
                    var pi2 = document.getElementById('radioPlayIcon'); if (pi2) pi2.textContent = '⏸';
                }
            } else if (K.activeSource === 'archivo' && K.archivoPreviewAudio.src) {
                K.archivoPreviewAudio.play();
            } else if (K.activeSource === 'market' && K.marketPreviewAudio.src) {
                K.marketPreviewAudio.play();
            } else {
                audioEl.play();
            }
            self.textContent = '⏸';
            K.isPlaying = true;
        }
    });

    document.getElementById('playerNext').addEventListener('click', function (e) {
        e.stopPropagation();
        if (K.activeSource === 'radio') {
            var list = K.radioShuffleMode ? K.radioShuffled : K.radioPlaylist;
            if (list.length === 0) return;
            var n = K.radioIndex + 1;
            if (n >= list.length) n = 0;
            if (typeof window._rjump === 'function') window._rjump(n);
            return;
        }
        if (K.currentTrackIndex < K.currentPlaylist.length - 1) {
            window.KXON.playTrack(K.currentTrackIndex + 1);
        }
    });

    document.getElementById('playerPrev').addEventListener('click', function (e) {
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
        if (K.currentTrackIndex > 0) {
            window.KXON.playTrack(K.currentTrackIndex - 1);
        }
    });

    audioEl.addEventListener('timeupdate', function () {
        if (K.activeSource !== 'player') return;
        if (audioEl.duration) {
            document.getElementById('progressFill').style.width = (audioEl.currentTime / audioEl.duration * 100) + '%';
            document.getElementById('playerCurrentTime').textContent = K.formatTime(audioEl.currentTime);
            document.getElementById('playerDuration').textContent = K.formatTime(audioEl.duration);
        }
    });

    audioEl.addEventListener('ended', function () {
        if (K.currentTrackIndex < K.currentPlaylist.length - 1) window.KXON.playTrack(K.currentTrackIndex + 1);
        else { K.isPlaying = false; document.getElementById('playerPlayPause').textContent = '▶'; }
    });

    document.getElementById('progressBar').addEventListener('click', function (e) {
        e.stopPropagation();
        if (K.activeSource === 'radio') {
            if (K.radioAudio.duration) {
                var r = this.getBoundingClientRect();
                K.radioAudio.currentTime = (e.clientX - r.left) / r.width * K.radioAudio.duration;
            }
            return;
        }
        if (audioEl.duration) {
            var r2 = this.getBoundingClientRect();
            audioEl.currentTime = (e.clientX - r2.left) / r2.width * audioEl.duration;
        }
    });

    document.getElementById('volumeBar').addEventListener('click', function (e) {
        e.stopPropagation();
        var r = this.getBoundingClientRect();
        var p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
        if (K.activeSource === 'radio') {
            K.radioVolume = p;
            K.radioAudio.volume = p;
        } else {
            audioEl.volume = p;
        }
        document.getElementById('volumeFill').style.width = (p * 100) + '%';
    });

    window.KXON.playTrack = function (idx) {
        if (!K.currentPlaylist || !K.currentPlaylist[idx]) return;
        var track = K.currentPlaylist[idx];

        K.stopAllAudio('player');
        K.activeSource = 'player';

        audioEl.src = track.archivo_url;
        audioEl.play();
        K.isPlaying = true;
        K.currentTrackIndex = idx;

        document.getElementById('playerBar').classList.add('show');
        document.getElementById('playerTitle').textContent = track.titulo;
        document.getElementById('playerCover').src = track.imagen_url || K.currentAlbumCover || '';
        document.getElementById('playerPlayPause').textContent = '⏸';

        var items = document.querySelectorAll('.track-item');
        for (var i = 0; i < items.length; i++) {
            items[i].classList.remove('playing');
            var btn2 = items[i].querySelector('.track-play-btn');
            if (btn2) btn2.textContent = '▶';
        }
        if (items[idx]) {
            items[idx].classList.add('playing');
            var btn3 = items[idx].querySelector('.track-play-btn');
            if (btn3) btn3.textContent = '⏸';
        }

        db.rpc('increment_reproducciones', { song_id: track.id }).then(function (r) {
            if (r.error) console.warn('Error updating plays:', r.error.message);
            else console.log('✅ Play registrado:', track.titulo);
        });
    };

    window._playTrack = function (idx) { window.KXON.playTrack(idx); };

    window.KXON.playTrackList = function (tracks, startIndex) {
        if (!tracks || !tracks.length) return;

        K.stopAllAudio('player');
        K.activeSource = 'player';

        K.currentPlaylist = [];
        for (var i = 0; i < tracks.length; i++) {
            K.currentPlaylist.push({
                id: tracks[i].id,
                titulo: tracks[i].titulo,
                archivo_url: tracks[i].audio_url,
                imagen_url: tracks[i].cover || '',
                reproducciones: 0
            });
        }

        var idx = startIndex || 0;
        if (idx >= K.currentPlaylist.length) idx = 0;

        var track = K.currentPlaylist[idx];
        audioEl.src = track.archivo_url;
        audioEl.play();
        K.isPlaying = true;
        K.currentTrackIndex = idx;

        document.getElementById('playerBar').classList.add('show');
        document.getElementById('playerTitle').textContent = track.titulo;
        document.getElementById('playerCover').src = track.imagen_url || '';
        document.getElementById('playerPlayPause').textContent = '⏸';
    };

    document.getElementById('playerCloseBtn').addEventListener('click', function (e) {
        e.stopPropagation();
        audioEl.pause(); audioEl.currentTime = 0;
        K.marketPreviewAudio.pause(); K.marketPreviewAudio.currentTime = 0;
        K.archivoPreviewAudio.pause(); K.archivoPreviewAudio.currentTime = 0;
        K.archivoCurrentPlayingUrl = '';

        K.radioAudio.pause(); K.radioAudio.currentTime = 0;
        K.radioIsPlaying = false;
        var rd = document.getElementById('radioDisc'); if (rd) rd.classList.remove('spinning');
        var rpb = document.getElementById('radioPlayBtn'); if (rpb) rpb.classList.remove('playing');
        var rpi = document.getElementById('radioPlayIcon'); if (rpi) rpi.textContent = '▶';
        var rgl = document.getElementById('radioProgressGlow'); if (rgl) rgl.classList.remove('visible');

        var archItems = document.querySelectorAll('.archivo-audio-item');
        for (var ai = 0; ai < archItems.length; ai++) {
            archItems[ai].classList.remove('playing');
            var ab = archItems[ai].querySelector('.archivo-audio-play');
            if (ab) ab.textContent = '▶';
        }

        K.isPlaying = false;
        K.activeSource = 'none';
        document.getElementById('playerBar').classList.remove('show');
        document.getElementById('playerPlayPause').textContent = '▶';
        document.getElementById('progressFill').style.width = '0%';

        var items = document.querySelectorAll('.track-item');
        for (var i = 0; i < items.length; i++) {
            items[i].classList.remove('playing');
            var btn4 = items[i].querySelector('.track-play-btn');
            if (btn4) btn4.textContent = '▶';
        }
    });

    /* ══════════════════════════════════════════
       🖱️ EVENTOS GENERALES
       ══════════════════════════════════════════ */
    for (var i = 0; i < navItems.length; i++) {
        navItems[i].addEventListener('click', function () {
            window.KXON.showPanel(this.getAttribute('data-panel'));
        });
    }

    document.getElementById('btnHamburger').addEventListener('click', function () {
        document.getElementById('sidebar').classList.toggle('open');
        document.getElementById('sidebarOverlay').classList.toggle('show');
    });
    document.getElementById('sidebarOverlay').addEventListener('click', function () {
        document.getElementById('sidebar').classList.remove('open');
        this.classList.remove('show');
    });

    document.getElementById('btnLogout').addEventListener('click', async function () {
        await db.auth.signOut();
        localStorage.removeItem('kxon_role');
        localStorage.removeItem('kxon_name');
        window.location.href = 'login.html';
    });

    document.getElementById('btnAdminAdd').addEventListener('click', function () {
        if (K.currentPanel === 'albumes') K.openModal('modalAlbum');
        else if (K.currentPanel === 'inicio') K.openModal('modalNoticia');
        else if (K.currentPanel === 'videos') K.openModal('modalVideo');
        else if (K.currentPanel === 'documentales') K.openModal('modalDocumental');
        else if (K.currentPanel === 'marketplace') K.openModal('modalMarketAdd');
        else K.showToast('Función próximamente', 'success');
    });

    document.getElementById('btnAddTrack').addEventListener('click', function () { K.openModal('modalCancion'); });
    document.getElementById('btnBackAlbums').addEventListener('click', function () {
        document.getElementById('albumesListView').style.display = 'block';
        document.getElementById('albumDetailView').classList.remove('show');
    });

    var modalCloseMap = [
        ['modalAlbumClose', 'modalAlbum'], ['modalAlbumCancel', 'modalAlbum'],
        ['modalCancionClose', 'modalCancion'], ['modalCancionCancel', 'modalCancion'],
        ['modalNoticiaClose', 'modalNoticia'], ['modalNoticiaCancel', 'modalNoticia'],
        ['modalVideoClose', 'modalVideo'], ['modalVideoCancel', 'modalVideo'],
        ['modalDocumentalClose', 'modalDocumental'], ['modalDocumentalCancel', 'modalDocumental'],
        ['modalEpisodioClose', 'modalEpisodio'], ['modalEpisodioCancel', 'modalEpisodio']
    ];
    for (var mc = 0; mc < modalCloseMap.length; mc++) {
        (function (btnId, modalId) {
            var el = document.getElementById(btnId);
            if (el) el.addEventListener('click', function () { K.closeModal(modalId); });
        })(modalCloseMap[mc][0], modalCloseMap[mc][1]);
    }

    var overlayCloseIds = ['modalAlbum', 'modalCancion', 'modalNoticia', 'modalVideo', 'modalDocumental', 'modalEpisodio', 'modalSolicitudBeat'];
    for (var oc = 0; oc < overlayCloseIds.length; oc++) {
        (function (mid) {
            var el = document.getElementById(mid);
            if (el) el.addEventListener('click', function (e) { if (e.target === this) K.closeModal(mid); });
        })(overlayCloseIds[oc]);
    }

    var mnd = document.getElementById('modalNoticiaDetalle');
    if (mnd) mnd.addEventListener('click', function (e) { if (e.target === this) this.classList.remove('show'); });

    var mma = document.getElementById('modalMarketAdd');
    if (mma) mma.addEventListener('click', function (e) { if (e.target === this && typeof window._closeMarketModal === 'function') window._closeMarketModal(); });

    var mdo = document.getElementById('marketDetailOverlay');
    if (mdo) mdo.addEventListener('click', function (e) { if (e.target === this) { this.classList.remove('show'); K.marketPreviewAudio.pause(); } });

    var po = document.getElementById('purchaseOverlay');
    if (po) po.addEventListener('click', function (e) { if (e.target === this && typeof window._closePurchase === 'function') window._closePurchase(); });

    var mpl = document.getElementById('modalPlaylist');
    if (mpl) mpl.addEventListener('click', function (e) { if (e.target === this && typeof window._closePlaylistModal === 'function') window._closePlaylistModal(); });

    var matp = document.getElementById('modalAddToPlaylist');
    if (matp) matp.addEventListener('click', function (e) { if (e.target === this && typeof window._closeAddToPlaylist === 'function') window._closeAddToPlaylist(); });

    var lyricsOv = document.getElementById('lyricsOverlay');
    if (lyricsOv) lyricsOv.addEventListener('click', function (e) {
        if (e.target === this) window._closeLyrics();
    });

    var lyricsEditOv = document.getElementById('lyricsEditOverlay');
    if (lyricsEditOv) lyricsEditOv.addEventListener('click', function (e) {
        if (e.target === this) window._closeLyricsEdit();
    });

    /* ══════════════════════════════════════════
       🔐 INIT — sesión y carga inicial
       ══════════════════════════════════════════ */
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
                if (typeof K.loadNotifications === 'function') {
                    K.loadNotifications();
                } else {
                    console.warn('⚠️ loadNotifications no disponible aún');
                }
            }, 100);

            if (typeof K.loadAlbumes === 'function') K.loadAlbumes();
            if (typeof K.loadAllCanciones === 'function') K.loadAllCanciones();

            setTimeout(function () {
                if (typeof K.renderInicio === 'function') {
                    K.renderInicio();
                } else {
                    console.warn('⚠️ renderInicio no disponible aún, reintentando...');
                    setTimeout(function () {
                        if (typeof K.renderInicio === 'function') K.renderInicio();
                    }, 500);
                }
            }, 200);

            if (typeof K.loadNoticias === 'function') K.loadNoticias();
            if (typeof K.loadVideos === 'function') K.loadVideos();
            if (typeof K.loadDocumentales === 'function') K.loadDocumentales();
            if (typeof K.loadMarketplace === 'function') K.loadMarketplace();
            if (typeof K.loadArchivo === 'function') K.loadArchivo();

            K.showPanel('inicio');

            setTimeout(function () {
                document.getElementById('loadingScreen').classList.add('hide');
            }, 500);
        } catch (e) {
            console.error('❌ Error en init:', e);
            window.location.href = 'login.html';
        }
    }

    init();

})();