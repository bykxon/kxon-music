/* ============================================
   🚀 DASHBOARD-INIT.JS — KXON
   Inicialización, sesión, sidebar, navegación,
   player bar, helpers, variables compartidas
   + Sistema de verificación de suscripción
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
        // ── SUSCRIPCIONES ──
        userSubscription: null,
        userAccesos: []
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
       🔒 VERIFICACIÓN DE SUSCRIPCIÓN
       ══════════════════════════════════════════ */
    var panelesBloqueados = ['albumes', 'canciones', 'radio', 'videos', 'documentales'];

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
            K.userAccesos = ['albumes', 'canciones', 'radio', 'videos', 'documentales'];
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

        var nombres = {
            'albumes': 'Álbumes', 'canciones': 'Canciones',
            'radio': 'Radio KXON', 'videos': 'Videos', 'documentales': 'Documentales'
        };

        var planesReq = {
            'albumes': 'Plan Básico o Premium',
            'canciones': 'Plan Básico o Premium',
            'radio': 'Plan Básico o Premium',
            'videos': 'Plan Premium',
            'documentales': 'Plan Premium'
        };

        panel.innerHTML =
            '<div class="panel-locked">' +
            '<div class="locked-icon">🔒</div>' +
            '<h2 class="locked-title">Contenido Bloqueado</h2>' +
            '<p class="locked-desc">Necesitas una suscripción activa para acceder a <strong>' + (nombres[panelId] || panelId) + '</strong></p>' +
            '<button class="locked-btn" onclick="window.KXON.showPanel(\'planes\')">🎫 Ver Planes</button>' +
            '<p class="locked-plan-hint">Requiere: ' + (planesReq[panelId] || 'Un plan activo') + '</p>' +
            '</div>';
    }

    /* Guardar HTML original de paneles para restaurar */
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

    /* Guardar HTML original al inicio */
    function saveAllPanelHTML() {
        for (var i = 0; i < panelesBloqueados.length; i++) {
            savePanelHTML(panelesBloqueados[i]);
        }
    }

    /* Aplicar bloqueo o desbloqueo */
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
        document.getElementById(id).classList.add('show');
    };

    window.KXON.closeModal = function (id) {
        document.getElementById(id).classList.remove('show');

        if (id === 'modalAlbum') {
            document.getElementById('albumTitulo').value = '';
            document.getElementById('albumDesc').value = '';
            K._selectedCoverFile = null;
            var area = document.getElementById('albumCoverArea');
            area.classList.remove('has-file');
            area.querySelector('.file-upload-text').textContent = 'Click para subir imagen';
            document.getElementById('albumCoverPreview').classList.remove('show');
            document.getElementById('albumCoverFile').value = '';
        }
        if (id === 'modalCancion') {
            document.getElementById('cancionTitulo').value = '';
            K._selectedAudioFile = null;
            var area2 = document.getElementById('cancionAudioArea');
            area2.classList.remove('has-file');
            area2.querySelector('.file-upload-text').textContent = 'Click para subir audio';
            document.getElementById('cancionAudioFile').value = '';
            document.getElementById('uploadProgress').classList.remove('show');
            document.getElementById('uploadBarFill').style.width = '0%';
        }
        if (id === 'modalNoticia') {
            document.getElementById('noticiaTitulo').value = '';
            document.getElementById('noticiaDesc').value = '';
            K._selectedNoticiaFile = null;
            var area3 = document.getElementById('noticiaCoverArea');
            area3.classList.remove('has-file');
            area3.querySelector('.file-upload-text').textContent = 'Click para subir imagen';
            document.getElementById('noticiaCoverPreview').classList.remove('show');
            document.getElementById('noticiaCoverFile').value = '';
        }
        if (id === 'modalVideo') {
            document.getElementById('videoTitulo').value = '';
            document.getElementById('videoDesc').value = '';
            K._videoThumbFileSelected = null;
            K._videoFileSelected = null;
            var a4 = document.getElementById('videoThumbArea');
            a4.classList.remove('has-file');
            a4.querySelector('.file-upload-text').textContent = 'Click para subir imagen';
            document.getElementById('videoThumbPreview').classList.remove('show');
            document.getElementById('videoThumbFile').value = '';
            var a5 = document.getElementById('videoFileArea');
            a5.classList.remove('has-file');
            a5.querySelector('.file-upload-text').textContent = 'Click para subir video';
            document.getElementById('videoFileInput').value = '';
            document.getElementById('videoUploadProgress').classList.remove('show');
            document.getElementById('videoUploadFill').style.width = '0%';
        }
        if (id === 'modalDocumental') {
            document.getElementById('docuTitulo').value = '';
            document.getElementById('docuDesc').value = '';
            K._docuCoverFileSelected = null;
            var a6 = document.getElementById('docuCoverArea');
            a6.classList.remove('has-file');
            a6.querySelector('.file-upload-text').textContent = 'Click para subir imagen';
            document.getElementById('docuCoverPreview').classList.remove('show');
            document.getElementById('docuCoverFile').value = '';
        }
        if (id === 'modalEpisodio') {
            document.getElementById('episodioTitulo').value = '';
            document.getElementById('episodioDesc').value = '';
            document.getElementById('episodioNumero').value = '1';
            K._episodioThumbFileSelected = null;
            K._episodioVideoFileSelected = null;
            var a7 = document.getElementById('episodioThumbArea');
            a7.classList.remove('has-file');
            a7.querySelector('.file-upload-text').textContent = 'Click para subir imagen';
            document.getElementById('episodioThumbPreview').classList.remove('show');
            document.getElementById('episodioThumbFile').value = '';
            var a8 = document.getElementById('episodioVideoArea');
            a8.classList.remove('has-file');
            a8.querySelector('.file-upload-text').textContent = 'Click para subir video';
            document.getElementById('episodioVideoFile').value = '';
            document.getElementById('episodioUploadProgress').classList.remove('show');
            document.getElementById('episodioUploadFill').style.width = '0%';
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

        /* Mostrar/ocultar nav items solo admin */
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
            document.getElementById('statAlbumes').textContent = a.count || 0;
            document.getElementById('statCanciones').textContent = s.count || 0;
            document.getElementById('statBeats').textContent = b.count || 0;
            document.getElementById('statNoticias').textContent = n.count || 0;
        } catch (e) { console.error(e); }
    };

    /* ══════════════════════════════════════════
       🔀 PANEL NAVIGATION
       ══════════════════════════════════════════ */
    var panelTitles = {
        'inicio': 'Inicio', 'albumes': 'Álbumes', 'canciones': 'Canciones',
        'radio': 'Radio KXON', 'videos': 'Videos', 'documentales': 'Documentales',
        'marketplace': 'Marketplace', 'archivo': 'Archivo', 'planes': 'Planes',
        'perfil': 'Mi Perfil', 'favoritos': 'Mis Favoritos', 'analytics': 'Analytics'
    };
    var panelAddText = {
        'inicio': 'Nueva Noticia', 'albumes': 'Nuevo Álbum', 'canciones': '',
        'radio': '', 'videos': 'Nuevo Video', 'documentales': 'Nuevo Documental',
        'marketplace': 'Nuevo Producto', 'archivo': '', 'planes': '', 'perfil': '',
        'favoritos': '', 'analytics': ''
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

        /* ── Verificar acceso a panel bloqueado ── */
        if (panelesBloqueados.indexOf(id) >= 0 && !K.checkAccess(id)) {
            renderLockedPanel(id);
            return;
        }

        /* ── Si tiene acceso, restaurar HTML original ── */
        if (panelesBloqueados.indexOf(id) >= 0 && panelOriginalHTML[id]) {
            var currentHTML = document.getElementById('panel-' + id).innerHTML;
            if (currentHTML.indexOf('panel-locked') >= 0) {
                restorePanelHTML(id);
            }
        }

        if (id === 'albumes') {
            document.getElementById('albumesListView').style.display = 'block';
            document.getElementById('albumDetailView').classList.remove('show');
            if (typeof K.loadAlbumes === 'function') K.loadAlbumes();
        }
        if (id === 'canciones' && typeof K.loadAllCanciones === 'function') K.loadAllCanciones();
        if (id === 'radio' && typeof K.initRadio === 'function') K.initRadio();
        if (id === 'videos' && typeof K.loadVideos === 'function') K.loadVideos();
        if (id === 'documentales') {
            document.getElementById('docuListView').style.display = 'block';
            document.getElementById('docuDetailView').classList.remove('show');
            if (typeof K.loadDocumentales === 'function') K.loadDocumentales();
        }
        if (id === 'perfil' && typeof K.loadPerfilData === 'function') K.loadPerfilData();
        if (id === 'marketplace' && typeof K.loadMarketplace === 'function') K.loadMarketplace();
        if (id === 'archivo' && typeof K.loadArchivo === 'function') K.loadArchivo();
        if (id === 'planes' && typeof K.loadPlanes === 'function') K.loadPlanes();
        if (id === 'favoritos' && typeof K.loadFavsPanel === 'function') K.loadFavsPanel();
        if (id === 'analytics' && typeof K.loadAnalytics === 'function') K.loadAnalytics();
    };

    /* ══════════════════════════════════════════
       🎶 PLAYER BAR — controles
       ══════════════════════════════════════════ */
    var audioEl = K.audioEl;

    document.getElementById('playerPlayPause').addEventListener('click', function () {
        if (K.isPlaying) {
            audioEl.pause();
            K.marketPreviewAudio.pause();
            K.archivoPreviewAudio.pause();
            this.textContent = '▶';
            K.isPlaying = false;
        } else {
            if (K.archivoPreviewAudio.src && K.archivoPreviewAudio.currentTime > 0) { K.archivoPreviewAudio.play(); }
            else if (K.marketPreviewAudio.src && K.marketPreviewAudio.currentTime > 0) { K.marketPreviewAudio.play(); }
            else { audioEl.play(); }
            this.textContent = '⏸';
            K.isPlaying = true;
        }
    });

    document.getElementById('playerNext').addEventListener('click', function () {
        if (K.currentTrackIndex < K.currentPlaylist.length - 1) window.KXON.playTrack(K.currentTrackIndex + 1);
    });
    document.getElementById('playerPrev').addEventListener('click', function () {
        if (K.currentTrackIndex > 0) window.KXON.playTrack(K.currentTrackIndex - 1);
    });

    audioEl.addEventListener('timeupdate', function () {
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
        if (audioEl.duration) {
            var r = this.getBoundingClientRect();
            audioEl.currentTime = (e.clientX - r.left) / r.width * audioEl.duration;
        }
    });

    document.getElementById('volumeBar').addEventListener('click', function (e) {
        var r = this.getBoundingClientRect();
        var p = (e.clientX - r.left) / r.width;
        audioEl.volume = Math.max(0, Math.min(1, p));
        document.getElementById('volumeFill').style.width = (p * 100) + '%';
    });

    /* ── PLAY TRACK (compartido) ── */
    window.KXON.playTrack = function (idx) {
        if (!K.currentPlaylist || !K.currentPlaylist[idx]) return;
        var track = K.currentPlaylist[idx];

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

        db.from('canciones').update({ reproducciones: (track.reproducciones || 0) + 1 }).eq('id', track.id);
    };

    window._playTrack = function (idx) { window.KXON.playTrack(idx); };

    /* ── CERRAR PLAYER ── */
    document.getElementById('playerCloseBtn').addEventListener('click', function () {
        audioEl.pause(); audioEl.currentTime = 0;
        K.marketPreviewAudio.pause(); K.marketPreviewAudio.currentTime = 0;
        K.archivoPreviewAudio.pause(); K.archivoPreviewAudio.currentTime = 0;
        K.archivoCurrentPlayingUrl = '';

        var archItems = document.querySelectorAll('.archivo-audio-item');
        for (var ai = 0; ai < archItems.length; ai++) {
            archItems[ai].classList.remove('playing');
            var ab = archItems[ai].querySelector('.archivo-audio-play');
            if (ab) ab.textContent = '▶';
        }

        K.isPlaying = false;
        document.getElementById('playerBar').classList.remove('show');
        document.getElementById('playerPlayPause').textContent = '▶';
        document.getElementById('progressFill').style.width = '0%';

        var items = document.querySelectorAll('.track-item');
        for (var i = 0; i < items.length; i++) {
            items[i].classList.remove('playing');
            var btn4 = items[i].querySelector('.track-play-btn');
            if (btn4) btn4.textContent = '▶';
        }

        if (K.radioIsPlaying) {
            K.radioAudio.pause();
            K.radioIsPlaying = false;
            var d = document.getElementById('radioDisc'); if (d) d.classList.remove('spinning');
            var pb = document.getElementById('radioPlayBtn'); if (pb) pb.classList.remove('playing');
            var pi = document.getElementById('radioPlayIcon'); if (pi) pi.textContent = '▶';
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

    /* ── Modal close listeners ── */
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

    var overlayCloseIds = ['modalAlbum', 'modalCancion', 'modalNoticia', 'modalVideo', 'modalDocumental', 'modalEpisodio'];
    for (var oc = 0; oc < overlayCloseIds.length; oc++) {
        (function (mid) {
            var el = document.getElementById(mid);
            if (el) el.addEventListener('click', function (e) { if (e.target === this) K.closeModal(mid); });
        })(overlayCloseIds[oc]);
    }

    document.getElementById('modalNoticiaDetalle').addEventListener('click', function (e) {
        if (e.target === this) this.classList.remove('show');
    });
    document.getElementById('modalMarketAdd').addEventListener('click', function (e) {
        if (e.target === this && typeof window._closeMarketModal === 'function') window._closeMarketModal();
    });
    document.getElementById('marketDetailOverlay').addEventListener('click', function (e) {
        if (e.target === this) { this.classList.remove('show'); K.marketPreviewAudio.pause(); }
    });
    document.getElementById('purchaseOverlay').addEventListener('click', function (e) {
        if (e.target === this && typeof window._closePurchase === 'function') window._closePurchase();
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

            /* ── Cargar suscripción ANTES de todo ── */
            await K.loadUserSubscription();

            /* ── Guardar HTML original de paneles bloqueables ── */
            saveAllPanelHTML();

            /* ── Aplicar control de acceso ── */
            K.applyAccessControl();
            if (typeof K.loadUserFavorites === 'function') await K.loadUserFavorites();
            K.loadStats();
            K.loadNotifications();

            if (typeof K.loadAlbumes === 'function') K.loadAlbumes();
            if (typeof K.loadAllCanciones === 'function') K.loadAllCanciones();
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
            console.error(e);
            window.location.href = 'login.html';
        }
    }

    init();

})();