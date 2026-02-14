/* ============================================
   🏠 LANDING JS - KXON PÁGINA DE INICIO
   ✨ VERSIÓN EXPERTA CON 3D ASSEMBLY SCROLL
   + HERO INTRO ANIMATION
   + 30 SEC PREVIEW PLAYER
   ============================================ */

(function(){
    var db = window.db;

    var noticiasContainer = null;
    var albumesContainer = null;
    var headerEl = null;
    var scrollProgressEl = null;
    var landingNoticias = [];
    var landingAlbumes = [];

    /* ══════════════════════════════════════════
       🎵 PREVIEW PLAYER (30 SEGUNDOS)
       ══════════════════════════════════════════ */
    var previewAudio = new Audio();
    var previewPlaying = false;
    var previewTrackId = null;
    var previewTimer = null;
    var previewInterval = null;
    var PREVIEW_DURATION = 30; // segundos

    previewAudio.volume = 0.7;

    function playPreview(trackId, audioUrl, buttonEl) {
        // Si ya está sonando esta misma canción, pausar
        if (previewPlaying && previewTrackId === trackId) {
            stopPreview();
            return;
        }

        // Detener cualquier preview anterior
        stopPreview();

        if (!audioUrl) {
            alert('Esta canción no tiene audio disponible');
            return;
        }

        previewTrackId = trackId;
        previewAudio.src = audioUrl;
        previewAudio.currentTime = 0;

        previewAudio.play().then(function() {
            previewPlaying = true;
            updateAllPreviewButtons();

            // Timer para detener a los 30 segundos
            previewTimer = setTimeout(function() {
                stopPreview();
            }, PREVIEW_DURATION * 1000);

            // Actualizar barra de progreso
            previewInterval = setInterval(function() {
                updatePreviewProgress(buttonEl);
            }, 100);

        }).catch(function(err) {
            console.error('Error reproduciendo preview:', err);
            alert('No se pudo reproducir el preview');
        });
    }

    function stopPreview() {
        previewAudio.pause();
        previewAudio.currentTime = 0;
        previewPlaying = false;
        previewTrackId = null;

        if (previewTimer) {
            clearTimeout(previewTimer);
            previewTimer = null;
        }
        if (previewInterval) {
            clearInterval(previewInterval);
            previewInterval = null;
        }

        updateAllPreviewButtons();
    }

    function updateAllPreviewButtons() {
        var allBtns = document.querySelectorAll('.preview-play-btn');
        for (var i = 0; i < allBtns.length; i++) {
            var btn = allBtns[i];
            var id = btn.getAttribute('data-track-id');
            var progressBar = btn.querySelector('.preview-progress');
            var icon = btn.querySelector('.preview-icon');
            var timeLabel = btn.querySelector('.preview-time');

            if (previewPlaying && id === String(previewTrackId)) {
                btn.classList.add('playing');
                if (icon) icon.textContent = '⏸';
                if (timeLabel) timeLabel.textContent = 'Reproduciendo...';
            } else {
                btn.classList.remove('playing');
                if (icon) icon.textContent = '▶';
                if (progressBar) progressBar.style.width = '0%';
                if (timeLabel) timeLabel.textContent = '0:30 preview';
            }
        }
    }

    function updatePreviewProgress(buttonEl) {
        if (!previewPlaying) return;
        var currentTime = previewAudio.currentTime;
        var pct = Math.min((currentTime / PREVIEW_DURATION) * 100, 100);
        var remaining = Math.max(0, PREVIEW_DURATION - Math.floor(currentTime));

        // Actualizar TODOS los botones con el mismo track ID
        var allBtns = document.querySelectorAll('.preview-play-btn[data-track-id="' + previewTrackId + '"]');
        for (var i = 0; i < allBtns.length; i++) {
            var progressBar = allBtns[i].querySelector('.preview-progress');
            var timeLabel = allBtns[i].querySelector('.preview-time');
            if (progressBar) progressBar.style.width = pct + '%';
            if (timeLabel) timeLabel.textContent = '0:' + (remaining < 10 ? '0' : '') + remaining;
        }
    }

    // Detener preview cuando el audio termina naturalmente
    previewAudio.addEventListener('ended', function() {
        stopPreview();
    });

    // Exponer globalmente
    window._playLandingPreview = function(trackId, audioUrl, el) {
        playPreview(trackId, audioUrl, el);
    };

    /* ══════════════════════════════════════════
       🔝 SCROLL PROGRESS BAR
       ══════════════════════════════════════════ */
    function updateScrollProgress() {
        if (!scrollProgressEl) return;
        var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        var docHeight = document.documentElement.scrollHeight - window.innerHeight;
        var progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        scrollProgressEl.style.width = progress + '%';
    }

    /* ══════════════════════════════════════════
       🔄 HEADER SCROLL EFFECT
       ══════════════════════════════════════════ */
    function handleHeaderScroll() {
        if (!headerEl) return;
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
            rootMargin: '0px 0px -80px 0px',
            threshold: 0.12
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
            for (var j = 0; j < counters.length; j++) {
                animateCounter(counters[j]);
            }
        }, delay);
    }

    /* ══════════════════════════════════════════
       🔢 COUNTER ANIMATION
       ══════════════════════════════════════════ */
    var counterObserver = null;
    var animatedCounters = new Set();

    function initCounterAnimation() {
        var options = { root: null, rootMargin: '0px', threshold: 0.5 };

        counterObserver = new IntersectionObserver(function(entries) {
            for (var i = 0; i < entries.length; i++) {
                var entry = entries[i];
                if (entry.isIntersecting && !animatedCounters.has(entry.target)) {
                    animatedCounters.add(entry.target);
                    animateCounter(entry.target);
                }
            }
        }, options);

        var counters = document.querySelectorAll('.counter-animate');
        for (var i = 0; i < counters.length; i++) {
            counterObserver.observe(counters[i]);
        }
    }

    function animateCounter(el) {
        var target = parseInt(el.getAttribute('data-target')) || 0;
        var suffix = el.getAttribute('data-suffix') || '';
        var duration = 2000;
        var startTime = null;

        function easeOutExpo(t) {
            return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        }

        function update(timestamp) {
            if (!startTime) startTime = timestamp;
            var elapsed = timestamp - startTime;
            var progress = Math.min(elapsed / duration, 1);
            var easedProgress = easeOutExpo(progress);
            var currentValue = Math.round(target * easedProgress);
            el.textContent = currentValue + suffix;
            if (progress < 1) requestAnimationFrame(update);
        }

        requestAnimationFrame(update);
    }

    /* ══════════════════════════════════════════
       🧲 MAGNETIC BUTTON EFFECT
       ══════════════════════════════════════════ */
    function initMagneticButtons() {
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
       ✨ HERO PARTICLES
       ══════════════════════════════════════════ */
    function initHeroParticles() {
        var container = document.getElementById('heroParticles');
        if (!container) return;
        var count = window.innerWidth < 768 ? 15 : 30;
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
       🏠 HERO INTRO - Logo Animation & Particles
       ══════════════════════════════════════════ */
    function initHeroIntro() {
        var particlesContainer = document.getElementById('heroIntroParticles');
        if (particlesContainer) {
            var count = window.innerWidth < 768 ? 20 : 40;
            for (var i = 0; i < count; i++) {
                var p = document.createElement('div');
                p.className = 'hero-intro-particle';
                var size = Math.random() * 3 + 1;
                p.style.width = size + 'px';
                p.style.height = size + 'px';
                p.style.left = Math.random() * 100 + '%';
                p.style.animationDuration = (Math.random() * 12 + 8) + 's';
                p.style.animationDelay = (Math.random() * 8) + 's';
                p.style.opacity = Math.random() * 0.4 + 0.1;
                particlesContainer.appendChild(p);
            }
        }

        var scrollIndicator = document.getElementById('heroIntroScroll');
        if (scrollIndicator) {
            scrollIndicator.addEventListener('click', function() {
                var heroSection = document.getElementById('kxonHeroIntro');
                if (heroSection) {
                    var nextSection = heroSection.nextElementSibling;
                    if (nextSection) {
                        var offsetTop = nextSection.getBoundingClientRect().top + window.pageYOffset;
                        window.scrollTo({ top: offsetTop, behavior: 'smooth' });
                    }
                }
            });
        }

        var heroIntro = document.getElementById('kxonHeroIntro');
        if (heroIntro) {
            window.addEventListener('scroll', function() {
                var scrollY = window.pageYOffset;
                var heroHeight = heroIntro.offsetHeight;
                var scrollEl = document.getElementById('heroIntroScroll');
                if (scrollEl) {
                    if (scrollY > heroHeight * 0.3) {
                        scrollEl.style.opacity = '0';
                        scrollEl.style.pointerEvents = 'none';
                    } else {
                        scrollEl.style.opacity = '';
                        scrollEl.style.pointerEvents = '';
                    }
                }
            }, { passive: true });
        }
    }

    /* ══════════════════════════════════════════
       📰🔄 SCROLL REVEAL FOR DYNAMIC CONTENT
       ══════════════════════════════════════════ */
    function applyScrollRevealToChildren(containerSelector) {
        var container = document.querySelector(containerSelector);
        if (!container || !container.classList.contains('scroll-reveal-children')) return;
        var animation = container.getAttribute('data-animation') || 'scale-up';
        var stagger = parseInt(container.getAttribute('data-stagger')) || 100;
        var children = container.children;
        for (var i = 0; i < children.length; i++) {
            var child = children[i];
            if (!child.classList.contains('scroll-reveal')) {
                child.classList.add('scroll-reveal');
                child.setAttribute('data-animation', animation);
                child.setAttribute('data-delay', String(i * stagger));
                if (revealObserver) revealObserver.observe(child);
            }
        }
    }

    /* ══════════════════════════════════════════
       🌊 PARALLAX EFFECT
       ══════════════════════════════════════════ */
    function handleParallax() {
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
                    var parallaxValue = (rect.top / window.innerHeight) * 30;
                    videoMedia.style.transform = 'scale(1.05) translateY(' + parallaxValue + 'px)';
                }
            }
        }
    }

    /* ══════════════════════════════════════════
       🎯 SMOOTH SCROLL FOR ANCHOR LINKS
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
                    var offsetTop = target.getBoundingClientRect().top + window.pageYOffset - 80;
                    window.scrollTo({ top: offsetTop, behavior: 'smooth' });
                }
            });
        }
    }

    /* ══════════════════════════════════════════════════════
       🎛️🎤 3D ASSEMBLY ENGINE
       ══════════════════════════════════════════════════════ */
    var assemblySections = [];

    function initAssemblyEngine() {
        var sections = document.querySelectorAll('.assembly-section');
        for (var i = 0; i < sections.length; i++) {
            var section = sections[i];
            var sticky = section.querySelector('.assembly-sticky');
            var pieces = section.querySelectorAll('.assembly-piece');
            var texts = section.querySelectorAll('.assembly-text');
            var glows = section.querySelectorAll('.assembly-glow');
            var progressBar = section.querySelector('.assembly-progress-bar');
            var scrollHint = section.querySelector('.assembly-scroll-hint');

            var piecesData = [];
            for (var j = 0; j < pieces.length; j++) {
                var piece = pieces[j];
                piecesData.push({
                    el: piece,
                    start: parseFloat(piece.getAttribute('data-assemble-start')) || 0,
                    end: parseFloat(piece.getAttribute('data-assemble-end')) || 1
                });
            }

            var textsData = [];
            for (var k = 0; k < texts.length; k++) {
                var text = texts[k];
                textsData.push({
                    el: text,
                    start: parseFloat(text.getAttribute('data-text-start')) || 0.5,
                    end: parseFloat(text.getAttribute('data-text-end')) || 1
                });
            }

            var glowsData = [];
            for (var g = 0; g < glows.length; g++) {
                var glow = glows[g];
                glowsData.push({
                    el: glow,
                    start: parseFloat(glow.getAttribute('data-glow-start')) || 0.5
                });
            }

            assemblySections.push({
                section: section,
                sticky: sticky,
                pieces: piecesData,
                texts: textsData,
                glows: glowsData,
                progressBar: progressBar,
                scrollHint: scrollHint
            });
        }
    }

    function updateAssembly() {
        for (var i = 0; i < assemblySections.length; i++) {
            var data = assemblySections[i];
            var section = data.section;
            var rect = section.getBoundingClientRect();
            var sectionHeight = section.offsetHeight - window.innerHeight;

            var scrolled = -rect.top;
            var progress = sectionHeight > 0 ? Math.max(0, Math.min(1, scrolled / sectionHeight)) : 0;

            if (data.progressBar) {
                data.progressBar.style.width = (progress * 100) + '%';
            }

            if (data.scrollHint) {
                if (progress > 0.15) {
                    data.scrollHint.classList.add('hidden');
                } else {
                    data.scrollHint.classList.remove('hidden');
                }
            }

            for (var j = 0; j < data.pieces.length; j++) {
                var piece = data.pieces[j];
                var pieceProgress = 0;

                if (progress <= piece.start) {
                    pieceProgress = 0;
                } else if (progress >= piece.end) {
                    pieceProgress = 1;
                } else {
                    pieceProgress = (progress - piece.start) / (piece.end - piece.start);
                }

                pieceProgress = easeOutCubic(pieceProgress);
                applyPieceTransform(piece.el, pieceProgress);
            }

            for (var k = 0; k < data.texts.length; k++) {
                var text = data.texts[k];
                if (progress >= text.start) {
                    text.el.classList.add('visible');
                } else {
                    text.el.classList.remove('visible');
                }
            }

            for (var g = 0; g < data.glows.length; g++) {
                var glow = data.glows[g];
                if (progress >= glow.start) {
                    glow.el.classList.add('active');
                } else {
                    glow.el.classList.remove('active');
                }
            }

            var scene = section.querySelector('.assembly-3d-scene');
            if (scene) {
                var rotateX = (1 - progress) * 8 - 4;
                var rotateY = Math.sin(progress * Math.PI) * 3;
                var translateZ = -50 + progress * 50;
                scene.style.transform = 'perspective(1200px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) translateZ(' + translateZ + 'px)';
            }
        }
    }

    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    function applyPieceTransform(el, progress) {
        if (progress <= 0) {
            el.style.opacity = '0';
            el.classList.remove('assembled');
            return;
        }

        if (progress >= 1) {
            el.style.opacity = '1';
            el.classList.add('assembled');
            return;
        }

        el.style.opacity = String(progress);
        el.classList.remove('assembled');

        var scale = 0.3 + (1 - 0.3) * progress;
        var translateY = (1 - progress) * 80;
        var rotateAmount = (1 - progress) * 25;

        var translateX = 0;
        var rotateAxis = 'rotateX';

        if (el.classList.contains('studio-monitor-l') || el.classList.contains('mic-popfilter')) {
            translateX = -(1 - progress) * 120;
            rotateAxis = 'rotateY';
        } else if (el.classList.contains('studio-monitor-r')) {
            translateX = (1 - progress) * 120;
            rotateAxis = 'rotateY';
        } else if (el.classList.contains('studio-screen') || el.classList.contains('mic-capsule')) {
            translateY = -(1 - progress) * 100;
        } else if (el.classList.contains('studio-headphones')) {
            translateY = -(1 - progress) * 100;
            translateX = (1 - progress) * 50;
            rotateAxis = 'rotate';
        } else if (el.classList.contains('mic-stand')) {
            // scaleY
        } else if (el.classList.contains('mic-arm')) {
            translateX = -(1 - progress) * 80;
            translateY = (1 - progress) * 60;
            rotateAxis = 'rotate';
            rotateAmount = (1 - progress) * -35;
        } else if (el.classList.contains('mic-body')) {
            translateY = -(1 - progress) * 120;
            rotateAxis = 'rotateZ';
            rotateAmount = (1 - progress) * 15;
        }

        var transform = '';

        if (el.classList.contains('studio-desk') || el.classList.contains('studio-screen') ||
            el.classList.contains('studio-keyboard') || el.classList.contains('mic-base')) {
            transform = 'translate(-50%, ' + translateY + 'px) scale(' + scale + ') ' + rotateAxis + '(' + rotateAmount + 'deg)';
        } else if (el.classList.contains('mic-stand') || el.classList.contains('mic-body') || el.classList.contains('mic-capsule')) {
            transform = 'translate(-50%, ' + translateY + 'px) scale(' + scale + ') scaleY(' + (el.classList.contains('mic-stand') ? progress : 1) + ') ' + rotateAxis + '(' + rotateAmount + 'deg)';
        } else {
            transform = 'translate(' + translateX + 'px, ' + translateY + 'px) scale(' + scale + ') ' + rotateAxis + '(' + rotateAmount + 'deg)';
        }

        el.style.transform = transform;
    }

    /* ══════════════════════════════════════════
       📜 MASTER SCROLL HANDLER
       ══════════════════════════════════════════ */
    var ticking = false;

    function onScroll() {
        if (!ticking) {
            requestAnimationFrame(function() {
                handleHeaderScroll();
                updateScrollProgress();
                handleParallax();
                updateAssembly();
                ticking = false;
            });
            ticking = true;
        }
    }

    window.addEventListener('scroll', onScroll, { passive: true });

    /* ──────────────────────────────────
       📰 CARGAR NOTICIAS
       ────────────────────────────────── */
    async function cargarNoticias(){
        if (!noticiasContainer) return;
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
            setTimeout(function() { applyScrollRevealToChildren('#noticias-grid'); }, 50);
        } catch(err) {
            console.error('Error noticias:', err);
            if (noticiasContainer) {
                noticiasContainer.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon">⚠️</div><h3 class="empty-state-title">Error al cargar noticias</h3></div>';
            }
        }
    }

    /* ──────────────────────────────────
       💿 CARGAR ÁLBUMES DESTACADOS
       ────────────────────────────────── */
    async function cargarAlbumesDestacados(){
        if (!albumesContainer) return;
        albumesContainer.innerHTML = generarSkeletonAlbumes(2);
        try {
            var r = await db.from('albumes').select('*, canciones(id, titulo, duracion, audio_url)').order('created_at', { ascending: false }).limit(2);
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
            setTimeout(function() { applyScrollRevealToChildren('#albumes-grid'); }, 50);
        } catch(err) {
            console.error('Error álbumes:', err);
            if (albumesContainer) {
                albumesContainer.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon">⚠️</div><h3 class="empty-state-title">Error al cargar álbumes</h3></div>';
            }
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
        var tituloEl = document.getElementById('noticiaLandingTitulo');
        var descEl = document.getElementById('noticiaLandingDesc');
        var fechaEl = document.getElementById('noticiaLandingFecha');
        var imgWrap = document.getElementById('noticiaLandingImgWrap');
        var imgEl = document.getElementById('noticiaLandingImg');
        var modalEl = document.getElementById('modalNoticiaLanding');

        if (tituloEl) tituloEl.textContent = n.titulo;
        if (descEl) descEl.textContent = n.descripcion;
        var fecha = new Date(n.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
        if (fechaEl) fechaEl.textContent = fecha;
        if (imgWrap && imgEl) {
            if (n.imagen_url) { imgEl.src = n.imagen_url; imgWrap.style.display = 'block'; }
            else { imgWrap.style.display = 'none'; }
        }
        if (modalEl) modalEl.classList.add('show');
    };

    /* ──────────────────────────────────
       💿 ABRIR ÁLBUM (MODAL CON PREVIEW 30s)
       ────────────────────────────────── */
    window._landingAbrirAlbum = function(idx){
        // Detener cualquier preview al abrir nuevo álbum
        stopPreview();

        var a = landingAlbumes[idx];
        if (!a) return;
        var tituloEl = document.getElementById('albumLandingTitulo');
        var descEl = document.getElementById('albumLandingDesc');
        var coverEl = document.getElementById('albumLandingCover');
        var metaEl = document.getElementById('albumLandingMeta');
        var tc = document.getElementById('albumLandingTracks');
        var modalEl = document.getElementById('modalAlbumLanding');

        if (tituloEl) tituloEl.textContent = a.titulo;
        if (descEl) descEl.textContent = a.descripcion || 'Sin descripción';
        if (coverEl) coverEl.src = a.imagen_url || 'https://placehold.co/300x300/111/333?text=♪';
        var canciones = a.canciones || [];
        if (metaEl) metaEl.textContent = canciones.length + ' CANCIONES';
        if (tc) {
            if (canciones.length === 0) {
                tc.innerHTML = '<div style="text-align:center;padding:30px;color:#555;font-size:.85rem;">Sin canciones en este álbum</div>';
            } else {
                var h = '';
                for (var i = 0; i < canciones.length; i++) {
                    var c = canciones[i];
                    var audioUrl = c.audio_url || '';
                    var escapedUrl = audioUrl.replace(/'/g, "\\'").replace(/"/g, '&quot;');

                    h += '<div class="album-landing-track preview-track" onclick="event.stopPropagation()">' +
                        '<span class="album-landing-track-num">' + (i + 1) + '</span>' +
                        '<button class="preview-play-btn" data-track-id="' + c.id + '" onclick="window._playLandingPreview(\'' + c.id + '\', \'' + escapedUrl + '\', this)">' +
                            '<span class="preview-icon">▶</span>' +
                            '<div class="preview-progress-bar"><div class="preview-progress"></div></div>' +
                        '</button>' +
                        '<div class="preview-track-info">' +
                            '<span class="album-landing-track-title">' + c.titulo + '</span>' +
                            '<span class="preview-time">0:30 preview</span>' +
                        '</div>' +
                        '<span class="album-landing-track-duration">' + (c.duracion || '--:--') + '</span>' +
                    '</div>';
                }
                h += '<div class="album-landing-preview-notice">' +
                    '<span class="preview-notice-icon">🎧</span>' +
                    '<span>Preview de 30 segundos · <a href="register.html" class="preview-register-link">Regístrate</a> para escuchar completo</span>' +
                '</div>';
                tc.innerHTML = h;
            }
        }
        if (modalEl) modalEl.classList.add('show');
    };

    /* ──────────────────────────────────
       ✕ CERRAR MODALES
       ────────────────────────────────── */
    function initModalClose() {
        var modalNoticia = document.getElementById('modalNoticiaLanding');
        var modalAlbum = document.getElementById('modalAlbumLanding');

        if (modalNoticia) {
            modalNoticia.addEventListener('click', function(e){
                if (e.target === this) this.classList.remove('show');
            });
        }
        if (modalAlbum) {
            modalAlbum.addEventListener('click', function(e){
                if (e.target === this) {
                    stopPreview();
                    this.classList.remove('show');
                }
            });
            // También detener preview cuando se cierra con la X
            var closeBtn = modalAlbum.querySelector('.modal-landing-close');
            if (closeBtn) {
                var originalOnclick = closeBtn.getAttribute('onclick');
                closeBtn.removeAttribute('onclick');
                closeBtn.addEventListener('click', function() {
                    stopPreview();
                    modalAlbum.classList.remove('show');
                });
            }
        }
    }

    /* ──────────────────────────────────
       💀 SKELETONS
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

    /* ══════════════════════════════════════════
       🚀 INICIALIZAR LANDING
       ══════════════════════════════════════════ */
    document.addEventListener('DOMContentLoaded', function(){
        noticiasContainer = document.getElementById('noticias-grid');
        albumesContainer = document.getElementById('albumes-grid');
        headerEl = document.getElementById('header');
        scrollProgressEl = document.getElementById('scrollProgress');

        initScrollReveal();
        initCounterAnimation();
        initMagneticButtons();
        initHeroParticles();
        initHeroIntro();
        initSmoothScroll();
        initAssemblyEngine();
        initModalClose();

        if (noticiasContainer) cargarNoticias();
        if (albumesContainer) cargarAlbumesDestacados();

        handleHeaderScroll();
        updateScrollProgress();
        updateAssembly();

        console.log('🎵 KXON Landing inicializada con Hero Intro + 3D Assembly + 30s Preview');
    });

})();