/* ============================================
   🏠 LANDING JS — KXON MUSIC PLATFORM
   Rediseño Total 2026 — v3.0
   Vanilla JS · Event Delegation · IntersectionObserver
   ============================================ */

(function () {
    'use strict';

    // ── Supabase reference ──
    const db = window.db;

    // ── State ──
    let landingNoticias = [];
    let landingAlbumes = [];
    let currentNewsPage = 0;
    let currentAlbumIndex = 0;
    const NEWS_PER_PAGE = 3;

    // ── DOM Cache ──
    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => ctx.querySelectorAll(sel);

    // ═══════════════════════════════════════
    //  🎵 PREVIEW PLAYER (30s)
    // ═══════════════════════════════════════
    const preview = {
        audio: new Audio(),
        playing: false,
        trackId: null,
        timer: null,
        interval: null,
        DURATION: 30,

        play(trackId, audioUrl) {
            if (this.playing && this.trackId === trackId) {
                this.stop();
                return;
            }
            this.stop();
            if (!audioUrl) return;

            this.trackId = trackId;
            this.audio.src = audioUrl;
            this.audio.currentTime = 0;
            this.audio.volume = 0.7;

            this.audio.play().then(() => {
                this.playing = true;
                this.updateButtons();

                this.timer = setTimeout(() => this.stop(), this.DURATION * 1000);
                this.interval = setInterval(() => this.updateProgress(), 100);
            }).catch(() => {
                this.stop();
            });
        },

        stop() {
            this.audio.pause();
            this.audio.currentTime = 0;
            this.playing = false;
            this.trackId = null;

            if (this.timer) { clearTimeout(this.timer); this.timer = null; }
            if (this.interval) { clearInterval(this.interval); this.interval = null; }

            this.updateButtons();
        },

        updateButtons() {
            $$('.kx-landing-track__play').forEach(btn => {
                const id = btn.dataset.trackId;
                const icon = btn.querySelector('.kx-landing-track__icon');
                const progress = btn.querySelector('.kx-landing-track__progress');
                const time = btn.closest('.kx-landing-track')?.querySelector('.kx-landing-track__time');

                if (this.playing && id === String(this.trackId)) {
                    btn.classList.add('is-playing');
                    if (icon) icon.textContent = '⏸';
                    if (time) time.textContent = 'Reproduciendo...';
                } else {
                    btn.classList.remove('is-playing');
                    if (icon) icon.textContent = '▶';
                    if (progress) progress.style.width = '0%';
                    if (time) time.textContent = '0:30 preview';
                }
            });
        },

        updateProgress() {
            if (!this.playing) return;
            const current = this.audio.currentTime;
            const pct = Math.min((current / this.DURATION) * 100, 100);
            const remaining = Math.max(0, this.DURATION - Math.floor(current));

            $$('.kx-landing-track__play[data-track-id="' + this.trackId + '"]').forEach(btn => {
                const progress = btn.querySelector('.kx-landing-track__progress');
                const time = btn.closest('.kx-landing-track')?.querySelector('.kx-landing-track__time');
                if (progress) progress.style.width = pct + '%';
                if (time) time.textContent = '0:' + String(remaining).padStart(2, '0');
            });
        },

        init() {
            this.audio.addEventListener('ended', () => this.stop());
        }
    };

    // ═══════════════════════════════════════
    //  📊 SCROLL PROGRESS
    // ═══════════════════════════════════════
    function updateScrollProgress() {
        const el = $('#scrollProgress');
        if (!el) return;
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        el.style.width = docHeight > 0 ? (scrollTop / docHeight) * 100 + '%' : '0%';
    }

    // ═══════════════════════════════════════
    //  📌 HEADER SCROLL
    // ═══════════════════════════════════════
    function handleHeaderScroll() {
        const header = $('#landingHeader');
        if (!header) return;
        header.classList.toggle('is-scrolled', window.scrollY > 60);
    }

    // ═══════════════════════════════════════
    //  🍔 MOBILE MENU
    // ═══════════════════════════════════════
    function initMobileMenu() {
        const toggle = $('#mobileMenuToggle');
        const menu = $('#mobileMenu');
        if (!toggle || !menu) return;

        toggle.addEventListener('click', () => {
            const isOpen = toggle.getAttribute('aria-expanded') === 'true';
            toggle.setAttribute('aria-expanded', String(!isOpen));
            toggle.setAttribute('aria-label', isOpen ? 'Abrir menú' : 'Cerrar menú');

            if (isOpen) {
                menu.setAttribute('hidden', '');
            } else {
                menu.removeAttribute('hidden');
            }
        });

        // Close on link click
        menu.addEventListener('click', (e) => {
            if (e.target.closest('.kx-landing-mobile__link')) {
                toggle.setAttribute('aria-expanded', 'false');
                toggle.setAttribute('aria-label', 'Abrir menú');
                menu.setAttribute('hidden', '');
            }
        });
    }

    // ═══════════════════════════════════════
    //  ✨ SCROLL REVEAL
    // ═══════════════════════════════════════
    let revealObserver = null;

    function initScrollReveal() {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const delay = parseInt(entry.target.dataset.delay) || 0;
                    setTimeout(() => {
                        entry.target.classList.add('is-visible');

                        // Trigger counter animation if present
                        entry.target.querySelectorAll('.kx-counter').forEach(animateCounter);
                    }, delay);
                    revealObserver.unobserve(entry.target);
                }
            });
        }, {
            rootMargin: '0px 0px -60px 0px',
            threshold: 0.1
        });

        $$('.kx-reveal').forEach(el => revealObserver.observe(el));
    }

    function observeNewElements(container) {
        if (!revealObserver) return;
        container.querySelectorAll('.kx-reveal:not(.is-visible)').forEach(el => {
            revealObserver.observe(el);
        });
    }

    // ═══════════════════════════════════════
    //  🔢 COUNTER ANIMATION
    // ═══════════════════════════════════════
    const animatedCounters = new WeakSet();

    function animateCounter(el) {
        if (animatedCounters.has(el)) return;
        animatedCounters.add(el);

        const target = parseInt(el.dataset.target) || 0;
        const suffix = el.dataset.suffix || '';
        const duration = 2000;
        let startTime = null;

        function easeOutExpo(t) {
            return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        }

        function update(timestamp) {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            el.textContent = Math.round(target * easeOutExpo(progress)) + suffix;
            if (progress < 1) requestAnimationFrame(update);
        }

        requestAnimationFrame(update);
    }

    // ═══════════════════════════════════════
    //  ✨ HERO PARTICLES
    // ═══════════════════════════════════════
    function initHeroParticles() {
        const container = $('#heroParticles');
        if (!container) return;

        const count = window.innerWidth < 768 ? 18 : 35;
        const fragment = document.createDocumentFragment();

        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            p.className = 'kx-landing-hero__particle';
            const size = Math.random() * 2.5 + 1;
            p.style.cssText = `
                width:${size}px;height:${size}px;
                left:${Math.random()*100}%;
                animation-duration:${Math.random()*14+9}s;
                animation-delay:${Math.random()*10}s;
                opacity:${Math.random()*0.4+0.1};
            `;
            fragment.appendChild(p);
        }
        container.appendChild(fragment);
    }

    // ═══════════════════════════════════════
    //  🎯 HERO SCROLL BUTTON
    // ═══════════════════════════════════════
    function initHeroScroll() {
        const btn = $('#heroScrollBtn');
        if (!btn) return;

        btn.addEventListener('click', () => {
            const hero = btn.closest('.kx-landing-hero');
            if (!hero) return;
            const next = hero.nextElementSibling;
            if (next) {
                next.scrollIntoView({ behavior: 'smooth' });
            }
        });

        // Fade on scroll
        const hero = btn.closest('.kx-landing-hero');
        if (hero) {
            const observer = new IntersectionObserver(([entry]) => {
                btn.style.opacity = entry.intersectionRatio > 0.7 ? '' : '0';
                btn.style.pointerEvents = entry.intersectionRatio > 0.7 ? '' : 'none';
            }, { threshold: [0, 0.3, 0.7, 1] });
            observer.observe(hero);
        }
    }

    // ═══════════════════════════════════════
    //  🎬 VIDEO SOUND TOGGLE
    // ═══════════════════════════════════════
    function initVideoSound() {
        const btn = $('#btnVideoSound');
        const video = $('.kx-landing-video__media');
        const text = $('#videoSoundText');
        if (!btn || !video) return;

        // Auto play when visible
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                video.play().catch(() => {});
            } else {
                video.pause();
            }
        }, { threshold: 0.3 });
        observer.observe(video);

        btn.addEventListener('click', () => {
            video.muted = !video.muted;
            const isUnmuted = !video.muted;

            btn.setAttribute('aria-pressed', String(isUnmuted));
            btn.classList.toggle('is-unmuted', isUnmuted);
            if (text) text.textContent = isUnmuted ? 'Silenciar' : 'Activar sonido';
        });
    }

    // ═══════════════════════════════════════
    //  🔗 SMOOTH SCROLL
    // ═══════════════════════════════════════
    function initSmoothScroll() {
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href^="#"]');
            if (!link) return;
            const href = link.getAttribute('href');
            if (href === '#') return;

            const target = $(href);
            if (target) {
                e.preventDefault();
                const offset = target.getBoundingClientRect().top + window.scrollY - 80;
                window.scrollTo({ top: offset, behavior: 'smooth' });

                // Close mobile menu if open
                const toggle = $('#mobileMenuToggle');
                const menu = $('#mobileMenu');
                if (toggle && menu && toggle.getAttribute('aria-expanded') === 'true') {
                    toggle.setAttribute('aria-expanded', 'false');
                    menu.setAttribute('hidden', '');
                }
            }
        });
    }

    // ═══════════════════════════════════════
    //  📜 SCROLL HANDLER
    // ═══════════════════════════════════════
    let scrollTicking = false;

    function onScroll() {
        if (!scrollTicking) {
            requestAnimationFrame(() => {
                handleHeaderScroll();
                updateScrollProgress();
                scrollTicking = false;
            });
            scrollTicking = true;
        }
    }

    // ═══════════════════════════════════════
    //  📰 NEWS
    // ═══════════════════════════════════════
    async function loadNews() {
        const grid = $('#newsGrid');
        if (!grid || !db) return;

        grid.innerHTML = buildSkeletons(NEWS_PER_PAGE);

        try {
            const { data, error } = await db
                .from('noticias')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(9);

            if (error) throw error;

            if (!data || data.length === 0) {
                grid.innerHTML = buildEmpty('📰', 'Sin noticias aún', 'Las últimas novedades aparecerán aquí');
                return;
            }

            landingNoticias = data;
            currentNewsPage = 0;
            renderNewsPage();
            updateNewsPagination();
        } catch (err) {
            console.error('Error cargando noticias:', err);
            grid.innerHTML = buildEmpty('⚠️', 'Error al cargar noticias');
        }
    }

    function renderNewsPage() {
        const grid = $('#newsGrid');
        if (!grid) return;

        const start = currentNewsPage * NEWS_PER_PAGE;
        const end = Math.min(start + NEWS_PER_PAGE, landingNoticias.length);
        let html = '';

        for (let i = start; i < end; i++) {
            html += buildNewsCard(landingNoticias[i], i);
        }

        grid.innerHTML = html;

        // Animate cards in
        grid.querySelectorAll('.kx-landing-news__card').forEach((card, idx) => {
            card.classList.add('kx-reveal', 'is-visible');
            card.style.animationDelay = idx * 100 + 'ms';
        });
    }

    function buildNewsCard(n, idx) {
        const fecha = new Date(n.created_at)
            .toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
            .toUpperCase();
        const img = n.imagen_url || 'https://placehold.co/600x400/0e0e0e/333?text=KXON';
        const desc = n.descripcion || '';

        return `
            <article class="kx-landing-news__card" data-news-idx="${idx}">
                <div class="kx-landing-news__img">
                    <img src="${img}" alt="${n.titulo || ''}" loading="lazy"
                         onerror="this.src='https://placehold.co/600x400/0e0e0e/333?text=KXON'">
                    <span class="kx-landing-news__date">${fecha}</span>
                </div>
                <div class="kx-landing-news__body">
                    <h3 class="kx-landing-news__title">${n.titulo || ''}</h3>
                    <p class="kx-landing-news__excerpt">${desc}</p>
                    <span class="kx-landing-news__read-more">
                        Leer más
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                    </span>
                </div>
            </article>`;
    }

    function updateNewsPagination() {
        const dotsContainer = $('#newsPaginationDots');
        if (!dotsContainer) return;

        const totalPages = Math.ceil(landingNoticias.length / NEWS_PER_PAGE);
        dotsContainer.innerHTML = Array.from({ length: totalPages }, (_, i) =>
            `<span class="kx-landing-news__dot${i === currentNewsPage ? ' is-active' : ''}" data-page="${i}"></span>`
        ).join('');
    }

    function initNewsPagination() {
        const prevBtn = $('#newsPrev');
        const nextBtn = $('#newsNext');
        const dotsContainer = $('#newsPaginationDots');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                const total = Math.ceil(landingNoticias.length / NEWS_PER_PAGE);
                if (total === 0) return;
                currentNewsPage = (currentNewsPage - 1 + total) % total;
                renderNewsPage();
                updateNewsPagination();
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                const total = Math.ceil(landingNoticias.length / NEWS_PER_PAGE);
                if (total === 0) return;
                currentNewsPage = (currentNewsPage + 1) % total;
                renderNewsPage();
                updateNewsPagination();
            });
        }

        if (dotsContainer) {
            dotsContainer.addEventListener('click', (e) => {
                const dot = e.target.closest('.kx-landing-news__dot');
                if (!dot) return;
                currentNewsPage = parseInt(dot.dataset.page);
                renderNewsPage();
                updateNewsPagination();
            });
        }
    }

    // ═══════════════════════════════════════
    //  💿 ALBUMS CAROUSEL
    // ═══════════════════════════════════════
    async function loadAlbums() {
        if (!db) return;

        try {
            const { data, error } = await db
                .from('albumes')
                .select('*, canciones(id, titulo, duracion, archivo_url)')
                .order('created_at', { ascending: false })
                .limit(8);

            if (error) throw error;

            if (!data || data.length === 0) {
                hideCarousel();
                return;
            }

            landingAlbumes = data;
            currentAlbumIndex = 0;
            renderCarousel();
            updateCarouselDots();
            initCarouselControls();
        } catch (err) {
            console.error('Error cargando álbumes:', err);
            hideCarousel();
        }
    }

    function hideCarousel() {
        const stage = $('#carouselStage');
        const hud = $('#carouselHud');
        const controls = $('.kx-landing-carousel__controls');

        if (stage) stage.innerHTML = buildEmpty('💿', 'Sin álbumes aún');
        if (hud) hud.style.display = 'none';
        if (controls) controls.style.display = 'none';
    }

    function renderCarousel() {
        if (landingAlbumes.length === 0) return;

        const mainEl = $('#carouselMain');
        const prevEl = $('#carouselPrev');
        const nextEl = $('#carouselNext');
        if (!mainEl || !prevEl || !nextEl) return;

        const current = landingAlbumes[currentAlbumIndex];
        const prevIdx = (currentAlbumIndex - 1 + landingAlbumes.length) % landingAlbumes.length;
        const nextIdx = (currentAlbumIndex + 1) % landingAlbumes.length;
        const placeholder = 'https://placehold.co/400x400/0e0e0e/333?text=♪';

        const mainImg = mainEl.querySelector('img');
        const prevImg = prevEl.querySelector('img');
        const nextImg = nextEl.querySelector('img');

        if (mainImg) { mainImg.src = current.imagen_url || placeholder; mainImg.alt = current.titulo || ''; }
        if (prevImg) prevImg.src = landingAlbumes[prevIdx].imagen_url || placeholder;
        if (nextImg) nextImg.src = landingAlbumes[nextIdx].imagen_url || placeholder;

        // HUD
        const titleEl = $('#carouselTitle');
        const artistEl = $('#carouselArtist');
        const tracksEl = $('#carouselTracks');

        if (titleEl) titleEl.textContent = current.titulo || '';
        if (artistEl) {
            artistEl.textContent = (current.artista || 'KXON') + ' · ' + new Date().getFullYear() + ' Edition';
        }
        if (tracksEl) {
            const cnt = current.canciones ? current.canciones.length : 0;
            const pos = currentAlbumIndex + 1;
            tracksEl.textContent = String(pos).padStart(2, '0') + ' / ' + String(cnt).padStart(2, '0') + ' TRACKS';
        }

        // Show/hide prev/next
        const hide = landingAlbumes.length <= 1;
        prevEl.style.display = hide ? 'none' : '';
        nextEl.style.display = hide ? 'none' : '';
    }

    function navigateCarousel(direction) {
        if (landingAlbumes.length <= 1) return;

        const stage = $('#carouselStage');
        if (stage) stage.classList.add('is-transitioning');

        currentAlbumIndex = direction === 'next'
            ? (currentAlbumIndex + 1) % landingAlbumes.length
            : (currentAlbumIndex - 1 + landingAlbumes.length) % landingAlbumes.length;

        renderCarousel();
        updateCarouselDots();

        setTimeout(() => {
            if (stage) stage.classList.remove('is-transitioning');
        }, 700);
    }

    function updateCarouselDots() {
        const container = $('#carouselDots');
        if (!container) return;

        container.innerHTML = landingAlbumes.map((_, i) =>
            `<div class="kx-landing-carousel__dot${i === currentAlbumIndex ? ' is-active' : ''}" data-idx="${i}"></div>`
        ).join('');
    }

    function initCarouselControls() {
        const prevBtn = $('#carouselBtnPrev');
        const nextBtn = $('#carouselBtnNext');
        const dotsContainer = $('#carouselDots');
        const mainEl = $('#carouselMain');

        if (prevBtn) prevBtn.addEventListener('click', () => navigateCarousel('prev'));
        if (nextBtn) nextBtn.addEventListener('click', () => navigateCarousel('next'));

        if (dotsContainer) {
            dotsContainer.addEventListener('click', (e) => {
                const dot = e.target.closest('.kx-landing-carousel__dot');
                if (!dot) return;
                const idx = parseInt(dot.dataset.idx);
                if (idx !== currentAlbumIndex) {
                    currentAlbumIndex = idx;
                    renderCarousel();
                    updateCarouselDots();
                }
            });
        }

        if (mainEl) {
            mainEl.addEventListener('click', () => openAlbumModal(currentAlbumIndex));
        }
    }

    // ═══════════════════════════════════════
    //  📰 NEWS MODAL
    // ═══════════════════════════════════════
    function openNewsModal(idx) {
        const n = landingNoticias[idx];
        if (!n) return;

        const modal = $('#modalNoticia');
        const titulo = $('#noticiaModalTitle');
        const desc = $('#noticiaDesc');
        const fecha = $('#noticiaFecha');
        const imgWrap = $('#noticiaImgWrap');
        const img = $('#noticiaImg');

        if (titulo) titulo.textContent = n.titulo;
        if (desc) desc.textContent = n.descripcion;
        if (fecha) {
            fecha.textContent = new Date(n.created_at)
                .toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
        }

        if (imgWrap && img) {
            if (n.imagen_url) {
                img.src = n.imagen_url;
                img.alt = n.titulo || '';
                imgWrap.removeAttribute('hidden');
            } else {
                imgWrap.setAttribute('hidden', '');
            }
        }

        openModal(modal);
    }

    // ═══════════════════════════════════════
    //  💿 ALBUM MODAL
    // ═══════════════════════════════════════
    function openAlbumModal(idx) {
        preview.stop();
        const a = landingAlbumes[idx];
        if (!a) return;

        const modal = $('#modalAlbum');
        const titulo = $('#albumModalTitle');
        const desc = $('#albumDesc');
        const cover = $('#albumCover');
        const meta = $('#albumMeta');
        const tracks = $('#albumTracks');

        if (titulo) titulo.textContent = a.titulo;
        if (desc) desc.textContent = a.descripcion || 'Sin descripción';
        if (cover) { cover.src = a.imagen_url || 'https://placehold.co/300x300/0e0e0e/333?text=♪'; cover.alt = a.titulo || ''; }

        const canciones = a.canciones || [];
        if (meta) meta.textContent = canciones.length + ' CANCIONES';

        if (tracks) {
            if (canciones.length === 0) {
                tracks.innerHTML = '<div style="text-align:center;padding:24px;color:var(--kx-silver-700);font-size:var(--kx-text-sm)">Sin canciones en este álbum</div>';
            } else {
                let html = '';
                canciones.forEach((c, i) => {
                    const url = (c.archivo_url || '').replace(/'/g, "\\'");
                    html += `
                        <div class="kx-landing-track" data-track-id="${c.id}" data-audio-url="${url}">
                            <span class="kx-landing-track__num">${i + 1}</span>
                            <button class="kx-landing-track__play" data-track-id="${c.id}" type="button" aria-label="Reproducir ${c.titulo}">
                                <span class="kx-landing-track__icon">▶</span>
                                <div class="kx-landing-track__progress-bar"><div class="kx-landing-track__progress"></div></div>
                            </button>
                            <div class="kx-landing-track__info">
                                <span class="kx-landing-track__title">${c.titulo}</span>
                                <span class="kx-landing-track__time">0:30 preview</span>
                            </div>
                            <span class="kx-landing-track__duration">${c.duracion || '--:--'}</span>
                        </div>`;
                });

                html += `
                    <div class="kx-landing-track__notice">
                        <span>🎧</span>
                        <span>Preview de 30 segundos · <a href="register.html">Regístrate</a> para escuchar completo</span>
                    </div>`;

                tracks.innerHTML = html;
            }
        }

        openModal(modal);
    }

    // ═══════════════════════════════════════
    //  🎭 MODAL SYSTEM
    // ═══════════════════════════════════════
    function openModal(modal) {
        if (!modal) return;
        modal.removeAttribute('hidden');
        document.body.style.overflow = 'hidden';

        // Focus trap
        requestAnimationFrame(() => {
            const closeBtn = modal.querySelector('.kx-landing-modal__close');
            if (closeBtn) closeBtn.focus();
        });
    }

    function closeModal(modal) {
        if (!modal) return;
        modal.setAttribute('hidden', '');
        document.body.style.overflow = '';
        preview.stop();
    }

    function initModals() {
        // Event delegation for all modal interactions
        document.addEventListener('click', (e) => {
            // Close button
            const closeBtn = e.target.closest('.kx-landing-modal__close, [data-close-modal]');
            if (closeBtn) {
                const modal = closeBtn.closest('.kx-landing-modal');
                closeModal(modal);
                return;
            }

            // Backdrop click
            const backdrop = e.target.closest('.kx-landing-modal__backdrop');
            if (backdrop) {
                const modal = backdrop.closest('.kx-landing-modal');
                closeModal(modal);
                return;
            }

            // News card click
            const newsCard = e.target.closest('.kx-landing-news__card');
            if (newsCard) {
                const idx = parseInt(newsCard.dataset.newsIdx);
                openNewsModal(idx);
                return;
            }

            // Preview play button
            const playBtn = e.target.closest('.kx-landing-track__play');
            if (playBtn) {
                const track = playBtn.closest('.kx-landing-track');
                if (track) {
                    preview.play(track.dataset.trackId, track.dataset.audioUrl);
                }
                return;
            }
        });

        // ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.kx-landing-modal:not([hidden])');
                if (openModal) closeModal(openModal);
            }
        });
    }

    // ═══════════════════════════════════════
    //  📲 iOS MODAL
    // ═══════════════════════════════════════
    function initIosModal() {
        const btn = $('#btnIosInstall');
        const modal = $('#iosModal');
        if (!btn || !modal) return;

        btn.addEventListener('click', () => openModal(modal));
    }

    // ═══════════════════════════════════════
    //  🔗 FLOATING SOCIAL
    // ═══════════════════════════════════════
    function initFloating() {
        const toggle = $('#floatingToggle');
        const links = $('#floatingLinks');
        const shareBtn = $('#btnShare');

        if (toggle && links) {
            toggle.addEventListener('click', () => {
                const isOpen = toggle.getAttribute('aria-expanded') === 'true';
                toggle.setAttribute('aria-expanded', String(!isOpen));

                if (isOpen) {
                    links.setAttribute('hidden', '');
                } else {
                    links.removeAttribute('hidden');
                }
            });
        }

        if (shareBtn) {
            shareBtn.addEventListener('click', async () => {
                const url = 'https://kxon-music.vercel.app';
                try {
                    if (navigator.share) {
                        await navigator.share({ title: 'KXON Music', url });
                    } else {
                        await navigator.clipboard.writeText(url);
                        showToast('Enlace copiado ✓', 'success');
                    }
                } catch {
                    // User cancelled share
                }
            });
        }
    }

    // ═══════════════════════════════════════
    //  🔔 TOAST
    // ═══════════════════════════════════════
    function showToast(message, type = 'info') {
        const container = $('#toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'kx-toast kx-toast--' + type;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(24px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ═══════════════════════════════════════
    //  🧩 HELPERS
    // ═══════════════════════════════════════
    function buildSkeletons(count) {
        return Array.from({ length: count }, () => `
            <article class="kx-landing-news__card">
                <div class="kx-landing-news__skeleton" style="width:100%;aspect-ratio:16/9"></div>
                <div style="padding-top:var(--kx-space-5)">
                    <div class="kx-landing-news__skeleton" style="height:18px;width:75%;margin-bottom:var(--kx-space-3)"></div>
                    <div class="kx-landing-news__skeleton" style="height:14px;width:100%;margin-bottom:var(--kx-space-2)"></div>
                    <div class="kx-landing-news__skeleton" style="height:14px;width:55%"></div>
                </div>
            </article>`
        ).join('');
    }

    function buildEmpty(icon, title, text = '') {
        return `
            <div style="grid-column:1/-1;text-align:center;padding:var(--kx-space-16) var(--kx-space-6)">
                <div style="font-size:2.5rem;margin-bottom:var(--kx-space-5);opacity:0.3">${icon}</div>
                <h3 style="font-size:var(--kx-text-lg);color:var(--kx-silver-600);margin-bottom:var(--kx-space-2)">${title}</h3>
                ${text ? `<p style="font-size:var(--kx-text-sm);color:var(--kx-silver-700)">${text}</p>` : ''}
            </div>`;
    }

    // ═══════════════════════════════════════
    //  🚀 INIT
    // ═══════════════════════════════════════
    document.addEventListener('DOMContentLoaded', () => {
        // Core
        preview.init();
        initMobileMenu();
        initScrollReveal();
        initHeroParticles();
        initHeroScroll();
        initVideoSound();
        initSmoothScroll();
        initModals();
        initIosModal();
        initNewsPagination();
        initFloating();

        // Scroll
        window.addEventListener('scroll', onScroll, { passive: true });
        handleHeaderScroll();
        updateScrollProgress();

        // Data
        loadNews();
        loadAlbums();

        console.log('🎵 KXON Landing v3.0 — Rediseño Total 2026');
    });

})();