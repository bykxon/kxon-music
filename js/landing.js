/* ============================================
   🏠 LANDING JS ULTRA - KXON
   ✨ Custom Cursor, Split Text, Typewriter,
   3D Tilt, Counter, Parallax, Nav Dots,
   Line Draw, Scroll Velocity, Particles
   ============================================ */

(function(){
    var db = window.db;
    var noticiasContainer = document.getElementById('noticias-grid');
    var albumesContainer = document.getElementById('albumes-grid');
    var headerEl = document.getElementById('header');
    var scrollProgressEl = document.getElementById('scrollProgress');
    var landingNoticias = [];
    var landingAlbumes = [];
    var isMobile = window.innerWidth < 768;
    var isTouch = 'ontouchstart' in window;

    /* ══════════════════════════════════════════
       🖱️ CUSTOM CURSOR
       ══════════════════════════════════════════ */
    function initCustomCursor() {
        if (isTouch || isMobile) return;
        var cursor = document.getElementById('customCursor');
        if (!cursor) return;
        var dot = cursor.querySelector('.cursor-dot');
        var ring = cursor.querySelector('.cursor-ring');
        var mouseX = 0, mouseY = 0;
        var ringX = 0, ringY = 0;

        document.addEventListener('mousemove', function(e) {
            mouseX = e.clientX;
            mouseY = e.clientY;
            dot.style.transform = 'translate(' + mouseX + 'px, ' + mouseY + 'px)';
        });

        // Ring follows with easing
        function animateRing() {
            ringX += (mouseX - ringX) * 0.12;
            ringY += (mouseY - ringY) * 0.12;
            ring.style.transform = 'translate(' + ringX + 'px, ' + ringY + 'px)';
            requestAnimationFrame(animateRing);
        }
        animateRing();

        // Hover effect on interactive elements
        var hoverables = document.querySelectorAll('a, button, .faq-item, .noticia-card, .album-card, .ventaja-card, .plan-landing-card, .app-platform-btn, .magnetic-btn');
        for (var i = 0; i < hoverables.length; i++) {
            hoverables[i].addEventListener('mouseenter', function() { cursor.classList.add('cursor-hover'); });
            hoverables[i].addEventListener('mouseleave', function() { cursor.classList.remove('cursor-hover'); });
        }

        // Click effect
        document.addEventListener('mousedown', function() { cursor.classList.add('cursor-click'); });
        document.addEventListener('mouseup', function() { cursor.classList.remove('cursor-click'); });
    }

    /* ══════════════════════════════════════════
       ✍️ TEXT SPLIT (letra por letra)
       ══════════════════════════════════════════ */
    function initTextSplit() {
        var elements = document.querySelectorAll('.split-chars[data-split]');
        for (var i = 0; i < elements.length; i++) {
            var el = elements[i];
            var text = el.textContent.trim();
            el.innerHTML = '';
            el.removeAttribute('data-split');
            for (var j = 0; j < text.length; j++) {
                var span = document.createElement('span');
                span.className = 'char';
                span.textContent = text[j] === ' ' ? '\u00A0' : text[j];
                el.appendChild(span);
            }
        }
    }

    /* ══════════════════════════════════════════
       ⌨️ TYPEWRITER EFFECT
       ══════════════════════════════════════════ */
    function initTypewriter() {
        var el = document.getElementById('heroTypewriter');
        if (!el) return;
        var text = 'El nuevo artista digital en un universo sonoro exclusivo. Álbumes, canciones y beats de producción propia en una plataforma diseñada para artistas y fans.';
        var index = 0;
        var speed = 30;

        function type() {
            if (index < text.length) {
                el.textContent += text.charAt(index);
                index++;
                setTimeout(type, speed);
            }
        }

        // Start after hero animation
        setTimeout(type, 1200);
    }

    /* ══════════════════════════════════════════
       🔝 SCROLL PROGRESS
       ══════════════════════════════════════════ */
    function updateScrollProgress() {
        var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        var docHeight = document.documentElement.scrollHeight - window.innerHeight;
        var progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        if (scrollProgressEl) scrollProgressEl.style.width = progress + '%';
    }

    /* ══════════════════════════════════════════
       🔄 HEADER SCROLL
       ══════════════════════════════════════════ */
    function handleHeaderScroll() {
        if (window.scrollY > 50) headerEl.classList.add('scrolled');
        else headerEl.classList.remove('scrolled');
    }

    /* ══════════════════════════════════════════
       ✨ SCROLL REVEAL ENGINE
       ══════════════════════════════════════════ */
    var revealObserver = null;
    var revealedElements = new Set();

    function initScrollReveal() {
        var options = {
            root: null,
            rootMargin: '0px 0px -60px 0px',
            threshold: 0.1
        };

        revealObserver = new IntersectionObserver(function(entries) {
            for (var i = 0; i < entries.length; i++) {
                var entry = entries[i];
                if (entry.isIntersecting && !revealedElements.has(entry.target)) {
                    revealedElements.add(entry.target);
                    var delay = parseInt(entry.target.getAttribute('data-delay')) || 0;
                    revealElement(entry.target, delay);
                }
            }
        }, options);

        var elements = document.querySelectorAll('.scroll-reveal');
        for (var i = 0; i < elements.length; i++) {
            revealObserver.observe(elements[i]);
        }
    }

    function revealElement(el, delay) {
        setTimeout(function() {
            el.classList.add('is-visible');
            var counters = el.querySelectorAll('.counter-animate');
            for (var j = 0; j < counters.length; j++) animateCounter(counters[j]);
        }, delay);
    }

    /* ══════════════════════════════════════════
       📏 LINE DRAW ON SCROLL
       ══════════════════════════════════════════ */
    function initLineDraw() {
        var lines = document.querySelectorAll('[data-line-draw]');
        var observer = new IntersectionObserver(function(entries) {
            for (var i = 0; i < entries.length; i++) {
                if (entries[i].isIntersecting) {
                    entries[i].target.classList.add('is-drawn');
                }
            }
        }, { threshold: 0.5 });

        for (var i = 0; i < lines.length; i++) {
            observer.observe(lines[i]);
        }
    }

    /* ══════════════════════════════════════════
       📍 NAV DOTS
       ══════════════════════════════════════════ */
    function initNavDots() {
        var dots = document.querySelectorAll('.nav-dot');
        var sections = [];

        for (var i = 0; i < dots.length; i++) {
            var sectionId = dots[i].getAttribute('data-section');
            var section = document.getElementById(sectionId);
            if (section) sections.push({ dot: dots[i], section: section });
        }

        function updateActiveDot() {
            var scrollY = window.pageYOffset + window.innerHeight / 3;
            var activeIdx = 0;

            for (var i = 0; i < sections.length; i++) {
                if (scrollY >= sections[i].section.offsetTop) {
                    activeIdx = i;
                }
            }

            for (var j = 0; j < dots.length; j++) {
                dots[j].classList.remove('active');
            }
            if (sections[activeIdx]) sections[activeIdx].dot.classList.add('active');
        }

        window.addEventListener('scroll', updateActiveDot, { passive: true });
        updateActiveDot();

        // Click navigation
        for (var k = 0; k < dots.length; k++) {
            dots[k].addEventListener('click', function(e) {
                e.preventDefault();
                var target = document.getElementById(this.getAttribute('data-section'));
                if (target) {
                    window.scrollTo({ top: target.offsetTop - 80, behavior: 'smooth' });
                }
            });
        }
    }

    /* ══════════════════════════════════════════
       🔢 COUNTER ANIMATION
       ══════════════════════════════════════════ */
    var animatedCounters = new Set();

    function initCounterAnimation() {
        var observer = new IntersectionObserver(function(entries) {
            for (var i = 0; i < entries.length; i++) {
                if (entries[i].isIntersecting && !animatedCounters.has(entries[i].target)) {
                    animatedCounters.add(entries[i].target);
                    animateCounter(entries[i].target);
                }
            }
        }, { threshold: 0.5 });

        var counters = document.querySelectorAll('.counter-animate');
        for (var i = 0; i < counters.length; i++) observer.observe(counters[i]);
    }

    function animateCounter(el) {
        var target = parseInt(el.getAttribute('data-target')) || 0;
        var suffix = el.getAttribute('data-suffix') || '';
        var duration = 2000;
        var startTime = null;

        function easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }

        function update(timestamp) {
            if (!startTime) startTime = timestamp;
            var progress = Math.min((timestamp - startTime) / duration, 1);
            var val = Math.round(target * easeOutExpo(progress));
            el.textContent = val + suffix;
            if (progress < 1) requestAnimationFrame(update);
        }

        requestAnimationFrame(update);
    }

    /* ══════════════════════════════════════════
       🧲 MAGNETIC BUTTONS
       ══════════════════════════════════════════ */
    function initMagneticButtons() {
        if (isTouch || isMobile) return;
        var buttons = document.querySelectorAll('.magnetic-btn');

        for (var i = 0; i < buttons.length; i++) {
            (function(btn) {
                btn.addEventListener('mousemove', function(e) {
                    var rect = btn.getBoundingClientRect();
                    var x = e.clientX - rect.left - rect.width / 2;
                    var y = e.clientY - rect.top - rect.height / 2;
                    btn.style.transform = 'translate(' + (x * 0.15) + 'px, ' + (y * 0.15) + 'px)';
                });
                btn.addEventListener('mouseleave', function() {
                    btn.style.transform = '';
                });
            })(buttons[i]);
        }
    }

    /* ══════════════════════════════════════════
       🎴 3D TILT CARDS
       ══════════════════════════════════════════ */
    function initTiltCards() {
        if (isTouch || isMobile) return;
        var cards = document.querySelectorAll('.tilt-card');

        for (var i = 0; i < cards.length; i++) {
            (function(card) {
                card.addEventListener('mousemove', function(e) {
                    var rect = card.getBoundingClientRect();
                    var x = (e.clientX - rect.left) / rect.width;
                    var y = (e.clientY - rect.top) / rect.height;
                    var tiltX = (0.5 - y) * 12;
                    var tiltY = (x - 0.5) * 12;

                    card.style.transform = 'perspective(800px) rotateX(' + tiltX + 'deg) rotateY(' + tiltY + 'deg) scale(1.02)';

                    // Update shine position
                    var shine = card.querySelector('.card-shine');
                    if (shine) {
                        shine.style.setProperty('--mouse-x', (x * 100) + '%');
                        shine.style.setProperty('--mouse-y', (y * 100) + '%');
                    }
                });

                card.addEventListener('mouseleave', function() {
                    card.style.transform = '';
                    card.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
                    setTimeout(function() { card.style.transition = ''; }, 500);
                });
            })(cards[i]);
        }
    }

    /* ══════════════════════════════════════════
       ✨ HERO PARTICLES
       ══════════════════════════════════════════ */
    function initHeroParticles() {
        var container = document.getElementById('heroParticles');
        if (!container) return;
        var count = isMobile ? 12 : 35;

        for (var i = 0; i < count; i++) {
            var p = document.createElement('div');
            p.className = 'hero-particle';
            var size = Math.random() * 3 + 1;
            p.style.width = size + 'px';
            p.style.height = size + 'px';
            p.style.left = Math.random() * 100 + '%';
            p.style.animationDuration = (Math.random() * 15 + 10) + 's';
            p.style.animationDelay = (Math.random() * 10) + 's';
            p.style.opacity = Math.random() * 0.5 + 0.1;
            container.appendChild(p);
        }
    }

    /* ══════════════════════════════════════════
       🌊 PARALLAX
       ══════════════════════════════════════════ */
    function handleParallax() {
        if (isMobile) return;
        var scrollY = window.pageYOffset;

        var circle2 = document.querySelector('.hero-circle-2');
        var circle3 = document.querySelector('.hero-circle-3');
        if (circle2) circle2.style.transform = 'translate(-50%, calc(-50% + ' + (scrollY * 0.1) + 'px))';
        if (circle3) circle3.style.transform = 'translate(-50%, calc(-50% + ' + (scrollY * 0.05) + 'px))';

        var videoMedia = document.querySelector('.video-hero-media');
        if (videoMedia) {
            var videoSection = document.getElementById('video-presentacion');
            if (videoSection) {
                var rect = videoSection.getBoundingClientRect();
                if (rect.top < window.innerHeight && rect.bottom > 0) {
                    var pv = (rect.top / window.innerHeight) * 30;
                    videoMedia.style.transform = 'scale(1.05) translateY(' + pv + 'px)';
                }
            }
        }
    }

    /* ══════════════════════════════════════════
       🔗 SMOOTH SCROLL
       ══════════════════════════════════════════ */
    function initSmoothScroll() {
        var links = document.querySelectorAll('a[href^="#"]');
        for (var i = 0; i < links.length; i++) {
            links[i].addEventListener('click', function(e) {
                var href = this.getAttribute('href');
                if (href === '#') return;
                var target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    window.scrollTo({ top: target.offsetTop - 80, behavior: 'smooth' });
                }
            });
        }
    }

    /* ══════════════════════════════════════════
       📰 DYNAMIC CHILDREN REVEAL
       ══════════════════════════════════════════ */
    function applyScrollRevealToChildren(sel) {
        var container = document.querySelector(sel);
        if (!container || !container.classList.contains('scroll-reveal-children')) return;
        var animation = container.getAttribute('data-animation') || 'scale-up';
        var stagger = parseInt(container.getAttribute('data-stagger')) || 100;
        var children = container.children;

        for (var i = 0; i < children.length; i++) {
            if (!children[i].classList.contains('scroll-reveal')) {
                children[i].classList.add('scroll-reveal');
                children[i].setAttribute('data-animation', animation);
                children[i].setAttribute('data-delay', String(i * stagger));
                if (revealObserver) revealObserver.observe(children[i]);
            }
        }

        // Re-init tilt for new cards
        if (!isTouch && !isMobile) {
            var newCards = container.querySelectorAll('.noticia-card, .album-card');
            for (var j = 0; j < newCards.length; j++) {
                newCards[j].classList.add('tilt-card');
                initSingleTilt(newCards[j]);
            }
        }

        // Re-init cursor hover for new elements
        reattachCursorHover();
    }

    function initSingleTilt(card) {
        if (isTouch || isMobile) return;
        card.addEventListener('mousemove', function(e) {
            var rect = card.getBoundingClientRect();
            var x = (e.clientX - rect.left) / rect.width;
            var y = (e.clientY - rect.top) / rect.height;
            card.style.transform = 'perspective(800px) rotateX(' + ((0.5 - y) * 8) + 'deg) rotateY(' + ((x - 0.5) * 8) + 'deg) scale(1.02)';
        });
        card.addEventListener('mouseleave', function() {
            card.style.transform = '';
            card.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
            setTimeout(function() { card.style.transition = ''; }, 500);
        });
    }

    function reattachCursorHover() {
        if (isTouch || isMobile) return;
        var cursor = document.getElementById('customCursor');
        if (!cursor) return;
        var all = document.querySelectorAll('.noticia-card, .album-card');
        for (var i = 0; i < all.length; i++) {
            all[i].addEventListener('mouseenter', function() { cursor.classList.add('cursor-hover'); });
            all[i].addEventListener('mouseleave', function() { cursor.classList.remove('cursor-hover'); });
        }
    }

    /* ══════════════════════════════════════════
       📜 MASTER SCROLL
       ══════════════════════════════════════════ */
    var ticking = false;
    function onScroll() {
        if (!ticking) {
            requestAnimationFrame(function() {
                handleHeaderScroll();
                updateScrollProgress();
                handleParallax();
                ticking = false;
            });
            ticking = true;
        }
    }
    window.addEventListener('scroll', onScroll, { passive: true });

    /* ──────────────────────────────────
       📰 CARGAR NOTICIAS
       ────────────────────────────────── */
    async function cargarNoticias() {
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
            for (var i = 0; i < r.data.length; i++) html += crearCardNoticia(r.data[i], i);
            noticiasContainer.innerHTML = html;
            setTimeout(function() { applyScrollRevealToChildren('#noticias-grid'); }, 50);
        } catch(err) {
            console.error('Error noticias:', err);
            noticiasContainer.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon">⚠️</div><h3 class="empty-state-title">Error al cargar noticias</h3></div>';
        }
    }

    /* ──────────────────────────────────
       💿 CARGAR ÁLBUMES
       ────────────────────────────────── */
    async function cargarAlbumesDestacados() {
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
            for (var i = 0; i < r.data.length; i++) html += crearCardAlbum(r.data[i], i);
            albumesContainer.innerHTML = html;
            setTimeout(function() { applyScrollRevealToChildren('#albumes-grid'); }, 50);
        } catch(err) {
            console.error('Error álbumes:', err);
            albumesContainer.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon">⚠️</div><h3 class="empty-state-title">Error al cargar álbumes</h3></div>';
        }
    }

    function crearCardNoticia(n, idx) {
        var fecha = new Date(n.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
        var img = n.imagen_url || 'https://placehold.co/600x400/111/333?text=KXON+NEWS';
        return '<article class="noticia-card" onclick="window._landingAbrirNoticia(' + idx + ')">' +
            '<div class="noticia-imagen"><img src="' + img + '" alt="" loading="lazy" onerror="this.src=\'https://placehold.co/600x400/111/333?text=KXON\'"><span class="noticia-fecha">' + fecha + '</span></div>' +
            '<div class="noticia-body"><h3 class="noticia-titulo">' + n.titulo + '</h3><p class="noticia-descripcion">' + n.descripcion + '</p><div class="noticia-read-more">Leer más →</div></div></article>';
    }

    function crearCardAlbum(a, idx) {
        var img = a.imagen_url || 'https://placehold.co/400x400/111/333?text=♪';
        var cnt = a.canciones ? a.canciones.length : 0;
        return '<article class="album-card" onclick="window._landingAbrirAlbum(' + idx + ')">' +
            '<div class="album-cover"><img src="' + img + '" alt="" loading="lazy" onerror="this.src=\'https://placehold.co/400x400/111/333?text=♪\'"><div class="album-cover-overlay"><div class="album-cover-icon">👁</div></div></div>' +
            '<div class="album-info"><h4 class="album-titulo">' + a.titulo + '</h4><span class="album-canciones">' + cnt + ' canciones</span></div></article>';
    }

    window._landingAbrirNoticia = function(idx) {
        var n = landingNoticias[idx]; if (!n) return;
        document.getElementById('noticiaLandingTitulo').textContent = n.titulo;
        document.getElementById('noticiaLandingDesc').textContent = n.descripcion;
        document.getElementById('noticiaLandingFecha').textContent = new Date(n.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
        var imgWrap = document.getElementById('noticiaLandingImgWrap');
        var imgEl = document.getElementById('noticiaLandingImg');
        if (n.imagen_url) { imgEl.src = n.imagen_url; imgWrap.style.display = 'block'; } else imgWrap.style.display = 'none';
        document.getElementById('modalNoticiaLanding').classList.add('show');
    };

    window._landingAbrirAlbum = function(idx) {
        var a = landingAlbumes[idx]; if (!a) return;
        document.getElementById('albumLandingTitulo').textContent = a.titulo;
        document.getElementById('albumLandingDesc').textContent = a.descripcion || 'Sin descripción';
        document.getElementById('albumLandingCover').src = a.imagen_url || 'https://placehold.co/300x300/111/333?text=♪';
        var canciones = a.canciones || [];
        document.getElementById('albumLandingMeta').textContent = canciones.length + ' CANCIONES';
        var tc = document.getElementById('albumLandingTracks');
        if (canciones.length === 0) {
            tc.innerHTML = '<div style="text-align:center;padding:30px;color:#555;font-size:.85rem;">Sin canciones</div>';
        } else {
            var h = '';
            for (var i = 0; i < canciones.length; i++) {
                h += '<div class="album-landing-track"><span class="album-landing-track-num">' + (i+1) + '</span><div class="album-landing-track-icon">♪</div><span class="album-landing-track-title">' + canciones[i].titulo + '</span><span class="album-landing-track-duration">' + (canciones[i].duracion || '--:--') + '</span></div>';
            }
            h += '<div class="album-landing-no-play">🔒 Inicia sesión para reproducir</div>';
            tc.innerHTML = h;
        }
        document.getElementById('modalAlbumLanding').classList.add('show');
    };

    document.getElementById('modalNoticiaLanding').addEventListener('click', function(e) { if (e.target === this) this.classList.remove('show'); });
    document.getElementById('modalAlbumLanding').addEventListener('click', function(e) { if (e.target === this) this.classList.remove('show'); });

    function generarSkeletonNoticias(n) {
        var h = '';
        for (var i = 0; i < n; i++) h += '<article class="noticia-card"><div class="skeleton skeleton-img"></div><div class="noticia-body"><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text short"></div></div></article>';
        return h;
    }

    function generarSkeletonAlbumes(n) {
        var h = '';
        for (var i = 0; i < n; i++) h += '<article class="album-card"><div class="skeleton" style="width:100%;aspect-ratio:1;"></div><div class="album-info"><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-text short"></div></div></article>';
        return h;
    }

    /* ══════════════════════════════════════════
       🚀 INIT
       ══════════════════════════════════════════ */
    document.addEventListener('DOMContentLoaded', function() {
        // Core animations
        initTextSplit();
        initTypewriter();
        initScrollReveal();
        initLineDraw();
        initNavDots();
        initCounterAnimation();
        initHeroParticles();
        initSmoothScroll();

        // Desktop only
        initCustomCursor();
        initMagneticButtons();
        initTiltCards();

        // Data
        cargarNoticias();
        cargarAlbumesDestacados();

        // Initial state
        handleHeaderScroll();
        updateScrollProgress();

        console.log('🎵 KXON Landing ULTRA initialized');
    });

    // Handle resize
    window.addEventListener('resize', function() {
        isMobile = window.innerWidth < 768;
    });

})();