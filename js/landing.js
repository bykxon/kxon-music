/* ============================================
   🏠 LANDING JS - KXON PÁGINA DE INICIO
   Carga noticias, álbumes desde Supabase
   Modales de detalle noticia y álbum
   Usa window.db de supabase-config.js
   ============================================ */

(function(){
    var db = window.db;

    /* ──────────────────────────────────
       📌 VARIABLES DEL DOM
       ────────────────────────────────── */
    var noticiasContainer = document.getElementById('noticias-grid');
    var albumesContainer = document.getElementById('albumes-grid');
    var headerEl = document.getElementById('header');
    var landingNoticias = [];
    var landingAlbumes = [];

    /* ──────────────────────────────────
       🔄 HEADER SCROLL EFFECT
       ────────────────────────────────── */
    window.addEventListener('scroll', function(){
        if (window.scrollY > 50) headerEl.classList.add('scrolled');
        else headerEl.classList.remove('scrolled');
    });

    /* ──────────────────────────────────
       📰 CARGAR NOTICIAS
       ────────────────────────────────── */
    async function cargarNoticias(){
        noticiasContainer.innerHTML = generarSkeletonNoticias(3);
        try {
            var r = await db.from('noticias').select('*').order('created_at', { ascending: false }).limit(6);
            if (r.error) throw r.error;
            if (!r.data || r.data.length === 0) {
                noticiasContainer.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon">📰</div><h3 class="empty-state-title">Sin noticias aún</h3><p class="empty-state-text">Las últimas novedades aparecerán aquí</p></div>';
                return;
            }
            landingNoticias = r.data;
            var html = '';
            for (var i = 0; i < r.data.length; i++) {
                html += crearCardNoticia(r.data[i], i);
            }
            noticiasContainer.innerHTML = html;
        } catch(err) {
            console.error('Error noticias:', err);
            noticiasContainer.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon">⚠️</div><h3 class="empty-state-title">Error al cargar noticias</h3></div>';
        }
    }

    /* ──────────────────────────────────
       💿 CARGAR ÁLBUMES DESTACADOS
       ────────────────────────────────── */
    async function cargarAlbumesDestacados(){
        albumesContainer.innerHTML = generarSkeletonAlbumes(2);
        try {
            var r = await db.from('albumes').select('*, canciones(id, titulo, duracion)').order('created_at', { ascending: false }).limit(2);
            if (r.error) throw r.error;
            if (!r.data || r.data.length === 0) {
                albumesContainer.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon">💿</div><h3 class="empty-state-title">Sin álbumes aún</h3><p class="empty-state-text">Los últimos álbumes aparecerán aquí</p></div>';
                return;
            }
            landingAlbumes = r.data;
            var html = '';
            for (var i = 0; i < r.data.length; i++) {
                html += crearCardAlbum(r.data[i], i);
            }
            albumesContainer.innerHTML = html;
        } catch(err) {
            console.error('Error álbumes:', err);
            albumesContainer.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon">⚠️</div><h3 class="empty-state-title">Error al cargar álbumes</h3></div>';
        }
    }

    /* ──────────────────────────────────
       🃏 CREAR CARD NOTICIA HTML
       ────────────────────────────────── */
    function crearCardNoticia(n, idx){
        var fecha = new Date(n.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
        var img = n.imagen_url || 'https://placehold.co/600x400/111111/333333?text=KXON+NEWS';
        return '<article class="noticia-card" onclick="window._landingAbrirNoticia(' + idx + ')">' +
            '<div class="noticia-imagen">' +
            '<img src="' + img + '" alt="" loading="lazy" onerror="this.src=\'https://placehold.co/600x400/111111/333333?text=KXON\'">' +
            '<span class="noticia-fecha">' + fecha + '</span></div>' +
            '<div class="noticia-body">' +
            '<h3 class="noticia-titulo">' + n.titulo + '</h3>' +
            '<p class="noticia-descripcion">' + n.descripcion + '</p>' +
            '<div class="noticia-read-more">Leer más →</div></div></article>';
    }

    /* ──────────────────────────────────
       🃏 CREAR CARD ÁLBUM HTML
       ────────────────────────────────── */
    function crearCardAlbum(a, idx){
        var img = a.imagen_url || 'https://placehold.co/400x400/111111/333333?text=♪';
        var cnt = a.canciones ? a.canciones.length : 0;
        return '<article class="album-card" onclick="window._landingAbrirAlbum(' + idx + ')">' +
            '<div class="album-cover">' +
            '<img src="' + img + '" alt="" loading="lazy" onerror="this.src=\'https://placehold.co/400x400/111111/333333?text=♪\'">' +
            '<div class="album-cover-overlay"><div class="album-cover-icon">👁</div></div></div>' +
            '<div class="album-info">' +
            '<h4 class="album-titulo">' + a.titulo + '</h4>' +
            '<span class="album-canciones">' + cnt + ' canciones</span></div></article>';
    }

    /* ──────────────────────────────────
       📰 ABRIR NOTICIA (MODAL)
       ────────────────────────────────── */
    window._landingAbrirNoticia = function(idx){
        var n = landingNoticias[idx];
        if (!n) return;
        document.getElementById('noticiaLandingTitulo').textContent = n.titulo;
        document.getElementById('noticiaLandingDesc').textContent = n.descripcion;
        var fecha = new Date(n.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
        document.getElementById('noticiaLandingFecha').textContent = fecha;
        var imgWrap = document.getElementById('noticiaLandingImgWrap');
        var imgEl = document.getElementById('noticiaLandingImg');
        if (n.imagen_url) { imgEl.src = n.imagen_url; imgWrap.style.display = 'block'; }
        else { imgWrap.style.display = 'none'; }
        document.getElementById('modalNoticiaLanding').classList.add('show');
    };

    /* ──────────────────────────────────
       💿 ABRIR ÁLBUM (MODAL SIN REPRODUCIR)
       ────────────────────────────────── */
    window._landingAbrirAlbum = function(idx){
        var a = landingAlbumes[idx];
        if (!a) return;
        document.getElementById('albumLandingTitulo').textContent = a.titulo;
        document.getElementById('albumLandingDesc').textContent = a.descripcion || 'Sin descripción';
        document.getElementById('albumLandingCover').src = a.imagen_url || 'https://placehold.co/300x300/111/333?text=♪';
        var canciones = a.canciones || [];
        document.getElementById('albumLandingMeta').textContent = canciones.length + ' CANCIONES';
        var tc = document.getElementById('albumLandingTracks');
        if (canciones.length === 0) {
            tc.innerHTML = '<div style="text-align:center;padding:30px;color:#555;font-size:.85rem;">Sin canciones en este álbum</div>';
        } else {
            var h = '';
            for (var i = 0; i < canciones.length; i++) {
                var c = canciones[i];
                h += '<div class="album-landing-track">' +
                    '<span class="album-landing-track-num">' + (i + 1) + '</span>' +
                    '<div class="album-landing-track-icon">♪</div>' +
                    '<span class="album-landing-track-title">' + c.titulo + '</span>' +
                    '<span class="album-landing-track-duration">' + (c.duracion || '--:--') + '</span></div>';
            }
            h += '<div class="album-landing-no-play">🔒 Inicia sesión para reproducir</div>';
            tc.innerHTML = h;
        }
        document.getElementById('modalAlbumLanding').classList.add('show');
    };

    /* ──────────────────────────────────
       ✕ CERRAR MODALES (click fuera)
       ────────────────────────────────── */
    document.getElementById('modalNoticiaLanding').addEventListener('click', function(e){
        if (e.target === this) this.classList.remove('show');
    });
    document.getElementById('modalAlbumLanding').addEventListener('click', function(e){
        if (e.target === this) this.classList.remove('show');
    });

    /* ──────────────────────────────────
       💀 SKELETONS DE CARGA
       ────────────────────────────────── */
    function generarSkeletonNoticias(n){
        var h = '';
        for (var i = 0; i < n; i++) {
            h += '<article class="noticia-card"><div class="skeleton skeleton-img"></div><div class="noticia-body"><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text short"></div></div></article>';
        }
        return h;
    }

    function generarSkeletonAlbumes(n){
        var h = '';
        for (var i = 0; i < n; i++) {
            h += '<article class="album-card"><div class="skeleton" style="width:100%;aspect-ratio:1;"></div><div class="album-info"><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-text short"></div></div></article>';
        }
        return h;
    }

    /* ──────────────────────────────────
       🚀 INICIALIZAR LANDING
       ────────────────────────────────── */
    document.addEventListener('DOMContentLoaded', function(){
        cargarNoticias();
        cargarAlbumesDestacados();
    });

})();