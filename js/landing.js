/* ============================================
   🏠 LANDING JS — KXON MUSIC PLATFORM
   Rediseño ULTRA PREMIUM 2026 — v10.0
   "SINTONIZA TU UNIVERSO" Edition
   ★ Star field, DNA waveform canvas, orbital tilt,
   spectrum analyzer, holographic albums,
   editorial news grid, kinetic chars
   ============================================ */

(function () {
    'use strict';

    const db = window.db;

    // ── State ──
    let landingNoticias = [];
    let landingAlbumes = [];
    let currentNewsPage = 0;
    let currentAlbumIndex = 0;
    const NEWS_PER_PAGE = 3;

    // ── DOM helpers ──
    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => ctx.querySelectorAll(sel);

    // ── Device ──
    const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = () => window.innerWidth < 768;

    // ═══════════════════════════════════════
    //  🔃 PAGE LOADER
    // ═══════════════════════════════════════
    function initPageLoader() {
        const loader = $('#pageLoader');
        const counter = $('#loaderCounter');
        if (!loader) return;

        let progress = 0;
        const startTime = Date.now();
        const duration = 2200;

        function updateCounter() {
            const elapsed = Date.now() - startTime;
            const t = Math.min(elapsed / duration, 1);
            const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            progress = Math.round(eased * 100);
            if (counter) counter.textContent = progress + '%';
            if (t < 1) requestAnimationFrame(updateCounter);
        }

        requestAnimationFrame(updateCounter);

        const hide = () => {
            loader.classList.add('is-hidden');
            document.body.classList.add('is-loaded');
            setTimeout(() => { loader.style.display = 'none'; }, 900);
        };

        if (document.readyState === 'complete') {
            setTimeout(hide, 2400);
        } else {
            window.addEventListener('load', () => setTimeout(hide, 1800));
            setTimeout(hide, 4000);
        }
    }

    // ═══════════════════════════════════════
    //  🖱️ CUSTOM CURSOR
    // ═══════════════════════════════════════
    function initCustomCursor() {
        if (isTouchDevice() || prefersReducedMotion()) return;

        const cursor = $('#kxCursor');
        if (!cursor) return;

        const dot = cursor.querySelector('.kx-cursor__dot');
        const ring = cursor.querySelector('.kx-cursor__ring');
        const trail = cursor.querySelector('.kx-cursor__trail');
        if (!dot || !ring) return;

        let mouseX = -100, mouseY = -100;
        let ringX = -100, ringY = -100;
        let trailX = -100, trailY = -100;

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            dot.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
        }, { passive: true });

        function updateRing() {
            ringX += (mouseX - ringX) * 0.15;
            ringY += (mouseY - ringY) * 0.15;
            ring.style.transform = `translate(${ringX}px, ${ringY}px)`;

            if (trail) {
                trailX += (mouseX - trailX) * 0.08;
                trailY += (mouseY - trailY) * 0.08;
                trail.style.transform = `translate(${trailX}px, ${trailY}px)`;
            }

            requestAnimationFrame(updateRing);
        }
        updateRing();

        const hoverTargets = 'a, button, [data-magnetic], .kx-news-v10__card, .kx-news-magazine__card, .kx-albums-v10__disc, .kx-landing-faq__question, [data-tilt-card], .kx-landing-compare__row';

        document.addEventListener('mouseover', (e) => {
            if (e.target.closest(hoverTargets)) cursor.classList.add('is-hovering');
        });
        document.addEventListener('mouseout', (e) => {
            if (e.target.closest(hoverTargets)) cursor.classList.remove('is-hovering');
        });
        document.addEventListener('mousedown', () => cursor.classList.add('is-clicking'));
        document.addEventListener('mouseup', () => cursor.classList.remove('is-clicking'));
        document.addEventListener('mouseleave', () => { cursor.style.opacity = '0'; });
        document.addEventListener('mouseenter', () => { cursor.style.opacity = '1'; });

        document.body.style.cursor = 'none';
        const style = document.createElement('style');
        style.textContent = 'a,button,[data-magnetic],[data-tilt-card],input,textarea,select{cursor:none!important}';
        document.head.appendChild(style);
    }

    // ═══════════════════════════════════════
    //  🧲 MAGNETIC BUTTONS
    // ═══════════════════════════════════════
    function initMagneticButtons() {
        if (isTouchDevice() || prefersReducedMotion()) return;

        $$('[data-magnetic]').forEach(el => {
            let currentX = 0, currentY = 0, targetX = 0, targetY = 0;
            let animating = false;
            const strength = el.closest('.kx-hero-v10__cta-group') ? 0.4 : 0.3;
            const smoothness = 0.12;

            function animate() {
                const dx = targetX - currentX;
                const dy = targetY - currentY;
                currentX += dx * smoothness;
                currentY += dy * smoothness;

                if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
                    currentX = targetX; currentY = targetY;
                    el.style.transform = targetX === 0 && targetY === 0 ? '' : `translate(${currentX}px, ${currentY}px)`;
                    animating = false;
                    return;
                }

                el.style.transform = `translate(${currentX}px, ${currentY}px)`;
                requestAnimationFrame(animate);
            }

            el.addEventListener('mousemove', (e) => {
                const rect = el.getBoundingClientRect();
                targetX = (e.clientX - rect.left - rect.width / 2) * strength;
                targetY = (e.clientY - rect.top - rect.height / 2) * strength;
                if (!animating) { animating = true; requestAnimationFrame(animate); }
            });

            el.addEventListener('mouseleave', () => {
                targetX = 0; targetY = 0;
                if (!animating) { animating = true; requestAnimationFrame(animate); }
            });
        });
    }

    // ═══════════════════════════════════════
    //  💡 SPOTLIGHT + TILT CARDS
    // ═══════════════════════════════════════
    function initSpotlightCards() {
        if (isTouchDevice() || prefersReducedMotion()) return;
        $$('[data-spotlight]').forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                card.style.setProperty('--kx-mouse-x', (e.clientX - rect.left) + 'px');
                card.style.setProperty('--kx-mouse-y', (e.clientY - rect.top) + 'px');
            });
        });
    }

    function initTiltCards() {
        if (isTouchDevice() || prefersReducedMotion()) return;
        const maxTilt = 4;
        $$('[data-tilt-card]').forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const rotateX = ((e.clientY - rect.top - rect.height / 2) / (rect.height / 2)) * -maxTilt;
                const rotateY = ((e.clientX - rect.left - rect.width / 2) / (rect.width / 2)) * maxTilt;
                card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = '';
                card.style.transition = 'transform 0.5s var(--kx-ease-spring)';
                setTimeout(() => { card.style.transition = ''; }, 500);
            });
        });
    }

    // ═══════════════════════════════════════
    //  🔤 MORPHING TEXT
    // ═══════════════════════════════════════
    function initMorphingText() {
        const container = $('#heroMorphWords');
        if (!container) return;
        const words = container.querySelectorAll('.kx-landing-hero__morph-word');
        if (words.length <= 1) return;

        let currentIndex = 0;
        setInterval(() => {
            const current = words[currentIndex];
            current.classList.remove('is-active');
            current.classList.add('is-exiting');
            setTimeout(() => { current.classList.remove('is-exiting'); }, 400);
            currentIndex = (currentIndex + 1) % words.length;
            setTimeout(() => { words[currentIndex].classList.add('is-active'); }, 300);
        }, 3000);
    }

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
            if (this.playing && this.trackId === trackId) { this.stop(); return; }
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
            }).catch(() => this.stop());
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
    //  📊 SCROLL + HEADER + STICKY
    // ═══════════════════════════════════════
    function updateScrollProgress() {
        const el = $('#scrollProgress');
        if (!el) return;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        el.style.width = docHeight > 0 ? (window.scrollY / docHeight) * 100 + '%' : '0%';
    }

    function handleHeaderScroll() {
        const header = $('#landingHeader');
        if (header) header.classList.toggle('is-scrolled', window.scrollY > 60);
    }

    function handleStickyCta() {
        const sticky = $('#stickyCta');
        const hero = $('#hero');
        if (!sticky || !hero) return;
        const heroBottom = hero.offsetTop + hero.offsetHeight;
        const shouldShow = window.scrollY > heroBottom - 200
            && window.scrollY < document.documentElement.scrollHeight - window.innerHeight - 200;
        if (shouldShow) sticky.removeAttribute('hidden');
        else sticky.setAttribute('hidden', '');
    }

    // ═══════════════════════════════════════
    //  🍔 MOBILE MENU
    // ═══════════════════════════════════════
    function initMobileMenu() {
        const toggle = $('#mobileMenuToggle');
        const menu = $('#mobileMenu');
        if (!toggle || !menu) return;

        menu.removeAttribute('hidden');

        function openMenu() {
            toggle.setAttribute('aria-expanded', 'true');
            toggle.setAttribute('aria-label', 'Cerrar menú');
            menu.classList.add('is-open');
            document.body.style.overflow = 'hidden';
        }

        function closeMenu() {
            toggle.setAttribute('aria-expanded', 'false');
            toggle.setAttribute('aria-label', 'Abrir menú');
            menu.classList.remove('is-open');
            document.body.style.overflow = '';
        }

        toggle.addEventListener('click', () => {
            toggle.getAttribute('aria-expanded') === 'true' ? closeMenu() : openMenu();
        });

        menu.addEventListener('click', (e) => {
            if (e.target.closest('.kx-landing-mobile__link')) closeMenu();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && menu.classList.contains('is-open')) closeMenu();
        });
    }

    // ═══════════════════════════════════════
    //  ✨ SCROLL REVEAL
    // ═══════════════════════════════════════
    let revealObserver = null;

    function initScrollReveal() {
        if (prefersReducedMotion()) {
            $$('.kx-reveal').forEach(el => el.classList.add('is-visible'));
            return;
        }

        revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const delay = parseInt(entry.target.dataset.delay) || 0;
                    setTimeout(() => {
                        entry.target.classList.add('is-visible');
                        entry.target.querySelectorAll('.kx-counter').forEach(animateCounter);
                        entry.target.querySelectorAll('[data-counter]').forEach(animateCounterInline);
                    }, delay);
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { rootMargin: '0px 0px -60px 0px', threshold: 0.1 });

        $$('.kx-reveal').forEach(el => revealObserver.observe(el));
    }

    // ═══════════════════════════════════════
    //  🔢 COUNTER ANIMATIONS
    // ═══════════════════════════════════════
    const animatedCounters = new WeakSet();

    function animateCounter(el) {
        if (animatedCounters.has(el)) return;
        animatedCounters.add(el);
        const target = parseInt(el.dataset.target) || 0;
        const suffix = el.dataset.suffix || '';
        const duration = 2000;
        let startTime = null;

        function easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }

        function update(timestamp) {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            el.textContent = Math.round(target * easeOutExpo(progress)) + suffix;
            if (progress < 1) requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
    }

    function animateCounterInline(el) {
        if (animatedCounters.has(el)) return;
        animatedCounters.add(el);
        const target = parseInt(el.dataset.counter) || 0;
        const suffix = el.dataset.suffix || '';
        const duration = 2200;
        let startTime = null;

        function easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }

        function update(timestamp) {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            el.textContent = Math.round(target * easeOutExpo(progress)) + suffix;
            if (progress < 1) requestAnimationFrame(update);
        }

        // Decode scramble
        const chars = '0123456789!@#$%&';
        let decodeFrame = 0;
        const decodeInterval = setInterval(() => {
            if (decodeFrame > 6) {
                clearInterval(decodeInterval);
                requestAnimationFrame(update);
                return;
            }
            let str = '';
            for (let i = 0; i < String(target).length; i++) {
                str += chars[Math.floor(Math.random() * chars.length)];
            }
            el.textContent = str + suffix;
            decodeFrame++;
        }, 60);
    }

    // ═══════════════════════════════════════
    //  ★ STAR FIELD — Twinkling Stars
    // ═══════════════════════════════════════
    function initStarField() {
        const container = $('#starField');
        if (!container || prefersReducedMotion()) return;

        const count = isMobile() ? 30 : 80;
        const fragment = document.createDocumentFragment();

        for (let i = 0; i < count; i++) {
            const star = document.createElement('div');
            star.className = 'kx-hero-v10__star';
            const size = Math.random() * 2 + 0.5;
            star.style.cssText = `
                width: ${size}px;
                height: ${size}px;
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                animation-duration: ${Math.random() * 4 + 2}s;
                animation-delay: ${Math.random() * 5}s;
            `;
            fragment.appendChild(star);
        }
        container.appendChild(fragment);
    }

    // ═══════════════════════════════════════
    //  ★ HERO PARTICLES v10
    // ═══════════════════════════════════════
    function initHeroParticlesV10() {
        const container = $('#heroParticlesV10');
        if (!container || prefersReducedMotion()) return;

        const count = isMobile() ? 8 : 25;
        const fragment = document.createDocumentFragment();

        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            p.className = 'kx-hero-v10__particle';
            const size = Math.random() * 3 + 1;
            const hue = Math.random() > 0.5 ? '139, 92, 246' : '59, 130, 246';
            p.style.cssText = `
                width: ${size}px;
                height: ${size}px;
                left: ${Math.random() * 100}%;
                background: rgba(${hue}, ${Math.random() * 0.5 + 0.3});
                animation-duration: ${Math.random() * 14 + 8}s;
                animation-delay: ${Math.random() * 10}s;
                opacity: ${Math.random() * 0.4 + 0.1};
            `;
            fragment.appendChild(p);
        }
        container.appendChild(fragment);
    }

    function initCtaParticles() {
        const container = $('#ctaParticles');
        if (!container || prefersReducedMotion() || isMobile()) return;

        const count = 12;
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            p.className = 'kx-hero-v10__particle';
            const size = Math.random() * 2 + 0.5;
            p.style.cssText = `
                width: ${size}px;
                height: ${size}px;
                left: ${Math.random() * 100}%;
                background: rgba(139, 92, 246, ${Math.random() * 0.4 + 0.1});
                animation-duration: ${Math.random() * 10 + 6}s;
                animation-delay: ${Math.random() * 8}s;
                opacity: ${Math.random() * 0.3 + 0.05};
            `;
            fragment.appendChild(p);
        }
        container.appendChild(fragment);
    }

    // ═══════════════════════════════════════
    //  ★ DNA WAVEFORM CANVAS
    //  Dual helix waveform behind hero
    // ═══════════════════════════════════════
    function initDNAWaveform() {
        const canvas = $('#heroWaveCanvas');
        if (!canvas || prefersReducedMotion()) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;

        function resize() {
            const parent = canvas.parentElement;
            if (!parent) return;
            const r = parent.getBoundingClientRect();
            canvas.width = r.width * dpr;
            canvas.height = r.height * dpr;
            canvas.style.width = r.width + 'px';
            canvas.style.height = r.height + 'px';
            ctx.scale(dpr, dpr);
        }

        resize();
        window.addEventListener('resize', resize, { passive: true });

        let time = 0;
        let animId = null;

        function draw() {
            const w = canvas.width / dpr;
            const h = canvas.height / dpr;
            const centerY = h / 2;

            ctx.clearRect(0, 0, w, h);

            // DNA Helix strand 1
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(139, 92, 246, 0.35)';
            ctx.lineWidth = 1.5;
            ctx.lineCap = 'round';
            for (let x = 0; x <= w; x += 2) {
                const t = x / w;
                const envelope = Math.sin(t * Math.PI);
                const y = centerY +
                    Math.sin(x * 0.018 + time * 0.025) * 30 * envelope +
                    Math.sin(x * 0.04 + time * 0.035 + 1) * 10 * envelope;
                if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();

            // DNA Helix strand 2 (mirrored)
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.25)';
            ctx.lineWidth = 1;
            for (let x = 0; x <= w; x += 2) {
                const t = x / w;
                const envelope = Math.sin(t * Math.PI);
                const y = centerY -
                    Math.sin(x * 0.018 + time * 0.025) * 28 * envelope -
                    Math.sin(x * 0.04 + time * 0.035 + 1) * 8 * envelope;
                if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();

            // Cross-links (DNA rungs)
            ctx.strokeStyle = 'rgba(139, 92, 246, 0.06)';
            ctx.lineWidth = 0.5;
            for (let x = 0; x <= w; x += 30) {
                const t = x / w;
                const envelope = Math.sin(t * Math.PI);
                const y1 = centerY + Math.sin(x * 0.018 + time * 0.025) * 30 * envelope;
                const y2 = centerY - Math.sin(x * 0.018 + time * 0.025) * 28 * envelope;
                ctx.beginPath();
                ctx.moveTo(x, y1);
                ctx.lineTo(x, y2);
                ctx.stroke();
            }

            // Third subtle wave
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(6, 182, 212, 0.12)';
            ctx.lineWidth = 0.8;
            for (let x = 0; x <= w; x += 2) {
                const t = x / w;
                const envelope = Math.sin(t * Math.PI);
                const y = centerY +
                    Math.sin(x * 0.012 + time * 0.015 + 2.5) * 20 * envelope;
                if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();

            time++;
            animId = requestAnimationFrame(draw);
        }

        // Start after loader
        setTimeout(() => { draw(); }, 3000);

        // Pause when not visible
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                if (!animId) draw();
            } else {
                if (animId) { cancelAnimationFrame(animId); animId = null; }
            }
        }, { threshold: 0.1 });

        if (canvas.parentElement) observer.observe(canvas.parentElement);
    }

    // ═══════════════════════════════════════
    //  ★ ORBITAL SYSTEM — Mouse Reactive
    // ═══════════════════════════════════════
    function initOrbitalSystem() {
        if (isTouchDevice() || prefersReducedMotion()) return;

        const orbSystem = $('#heroOrbSystem');
        const hero = $('#hero');
        if (!orbSystem || !hero) return;

        hero.addEventListener('mousemove', (e) => {
            const rect = hero.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width - 0.5) * 30;
            const y = ((e.clientY - rect.top) / rect.height - 0.5) * 30;
            orbSystem.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
        }, { passive: true });

        hero.addEventListener('mouseleave', () => {
            orbSystem.style.transform = 'translate(-50%, -50%)';
            orbSystem.style.transition = 'transform 0.6s var(--kx-ease-spring)';
            setTimeout(() => { orbSystem.style.transition = ''; }, 600);
        });
    }

    // ═══════════════════════════════════════
    //  ★ HERO COUNTERS + RIBBON
    // ═══════════════════════════════════════
    function initHeroCounters() {
        const ribbon = $('#heroRibbon');
        if (!ribbon) return;

        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                ribbon.querySelectorAll('[data-counter]').forEach(animateCounterInline);
                observer.unobserve(ribbon);
            }
        }, { threshold: 0.5 });

        observer.observe(ribbon);
    }

    // ═══════════════════════════════════════
    //  🎯 HERO SCROLL BUTTON
    // ═══════════════════════════════════════
    function initHeroScroll() {
        const btn = $('#heroScrollBtn');
        if (!btn) return;
        btn.addEventListener('click', () => {
            const hero = btn.closest('.kx-hero-v10');
            if (hero?.nextElementSibling) {
                hero.nextElementSibling.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    // ═══════════════════════════════════════
    //  🎬 VIDEO SOUND TOGGLE
    // ═══════════════════════════════════════
    function initVideoSound() {
        const btn = $('#btnVideoSound');
        const video = $('.kx-landing-video__media');
        const text = $('#videoSoundText');
        if (!btn || !video) return;

        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) video.play().catch(() => {});
            else video.pause();
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
                const headerHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--kx-header-height')) || 72;
                const offset = headerHeight + 20;
                const targetPosition = target.getBoundingClientRect().top + window.scrollY - offset;

                window.scrollTo({ top: targetPosition, behavior: 'smooth' });

                const toggle = $('#mobileMenuToggle');
                const menu = $('#mobileMenu');
                if (toggle?.getAttribute('aria-expanded') === 'true') {
                    toggle.setAttribute('aria-expanded', 'false');
                    toggle.setAttribute('aria-label', 'Abrir menú');
                    menu?.classList.remove('is-open');
                    document.body.style.overflow = '';
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
                handleStickyCta();
                scrollTicking = false;
            });
            scrollTicking = true;
        }
    }

    // ═══════════════════════════════════════
    //  🎬 PARALLAX
    // ═══════════════════════════════════════
    function initParallax() {
        if (prefersReducedMotion() || isTouchDevice()) return;

        const glowLeft = $('.kx-landing-glow--left');
        const glowRight = $('.kx-landing-glow--right');
        let ticking = false;

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    const scrollY = window.scrollY;
                    if (glowLeft) glowLeft.style.transform = `translateY(${scrollY * 0.05}px)`;
                    if (glowRight) glowRight.style.transform = `translateY(${scrollY * -0.03}px)`;
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    // ═══════════════════════════════════════
    //  📱 PHONE TILT
    // ═══════════════════════════════════════
    function initPhoneTilt() {
        if (isTouchDevice() || prefersReducedMotion()) return;
        const phone = $('[data-tilt]');
        if (!phone) return;
        const maxTilt = 8;
        phone.addEventListener('mousemove', (e) => {
            const rect = phone.getBoundingClientRect();
            const rotateX = ((e.clientY - rect.top - rect.height / 2) / (rect.height / 2)) * -maxTilt;
            const rotateY = ((e.clientX - rect.left - rect.width / 2) / (rect.width / 2)) * maxTilt;
            phone.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });
        phone.addEventListener('mouseleave', () => {
            phone.style.transform = '';
            phone.style.transition = 'transform 0.5s var(--kx-ease-spring)';
            setTimeout(() => { phone.style.transition = ''; }, 500);
        });
    }

    // ═══════════════════════════════════════
    //  📰 NEWS — Editorial Grid v10
    // ═══════════════════════════════════════
    async function loadNews() {
        const grid = $('#newsGrid');
        if (!grid || !db) return;
        grid.innerHTML = buildSkeletons(NEWS_PER_PAGE);
        try {
            const { data, error } = await db.from('noticias')
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
        for (let i = start; i < end; i++) html += buildNewsCard(landingNoticias[i], i);
        grid.innerHTML = html;
        grid.querySelectorAll('.kx-news-v10__card').forEach((card, idx) => {
            card.classList.add('kx-reveal', 'is-visible');
            card.style.animationDelay = idx * 100 + 'ms';
        });
    }

    function buildNewsCard(n, idx) {
        const fecha = new Date(n.created_at)
            .toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
            .toUpperCase();
        const img = n.imagen_url || 'https://placehold.co/600x400/0e0e0e/333?text=KXON';
        return `
            <article class="kx-news-v10__card" data-news-idx="${idx}">
                <div class="kx-landing-news__img">
                    <img src="${img}" alt="${n.titulo || ''}" loading="lazy" onerror="this.src='https://placehold.co/600x400/0e0e0e/333?text=KXON'">
                    <span class="kx-landing-news__date">${fecha}</span>
                </div>
                <div class="kx-landing-news__body">
                    <h3 class="kx-landing-news__title">${n.titulo || ''}</h3>
                    <p class="kx-landing-news__excerpt">${n.descripcion || ''}</p>
                    <span class="kx-landing-news__read-more">Leer más <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></span>
                </div>
            </article>`;
    }

    function updateNewsPagination() {
        const dotsContainer = $('#newsPaginationDots');
        if (!dotsContainer) return;
        const totalPages = Math.ceil(landingNoticias.length / NEWS_PER_PAGE);
        dotsContainer.innerHTML = Array.from({ length: totalPages }, (_, i) =>
            `<span class="kx-news-v10__nav-dot${i === currentNewsPage ? ' is-active' : ''}" data-page="${i}"></span>`
        ).join('');
    }

    function initNewsPagination() {
        const prevBtn = $('#newsPrev');
        const nextBtn = $('#newsNext');
        const dotsContainer = $('#newsPaginationDots');

        if (prevBtn) prevBtn.addEventListener('click', () => {
            const total = Math.ceil(landingNoticias.length / NEWS_PER_PAGE);
            if (total === 0) return;
            currentNewsPage = (currentNewsPage - 1 + total) % total;
            renderNewsPage(); updateNewsPagination();
        });

        if (nextBtn) nextBtn.addEventListener('click', () => {
            const total = Math.ceil(landingNoticias.length / NEWS_PER_PAGE);
            if (total === 0) return;
            currentNewsPage = (currentNewsPage + 1) % total;
            renderNewsPage(); updateNewsPagination();
        });

        if (dotsContainer) dotsContainer.addEventListener('click', (e) => {
            const dot = e.target.closest('.kx-news-v10__nav-dot');
            if (!dot) return;
            currentNewsPage = parseInt(dot.dataset.page);
            renderNewsPage(); updateNewsPagination();
        });
    }

    // ═══════════════════════════════════════
    //  💿 ALBUM GALLERY — Holographic v10
    // ═══════════════════════════════════════
    async function loadAlbums() {
        if (!db) return;
        try {
            const { data, error } = await db.from('albumes')
                .select('*, canciones(id, titulo, duracion, archivo_url)')
                .order('created_at', { ascending: false })
                .limit(8);
            if (error) throw error;
            if (!data || data.length === 0) { hideCarousel(); return; }
            landingAlbumes = data;
            currentAlbumIndex = 0;
            renderCarousel();
            updateCarouselDots();
            initCarouselControls();
            initCarouselSwipe();
        } catch (err) {
            console.error('Error cargando álbumes:', err);
            hideCarousel();
        }
    }

    function hideCarousel() {
        const stage = $('#carouselStage');
        const hud = $('#carouselHud');
        const controls = $('.kx-albums-v10__controls');
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

        const mainImg = mainEl.querySelector('.kx-albums-v10__disc-cover img');
        const prevImg = prevEl.querySelector('img');
        const nextImg = nextEl.querySelector('img');

        if (mainImg) {
            mainImg.src = current.imagen_url || placeholder;
            mainImg.alt = current.titulo || '';
        }
        if (prevImg) prevImg.src = landingAlbumes[prevIdx].imagen_url || placeholder;
        if (nextImg) nextImg.src = landingAlbumes[nextIdx].imagen_url || placeholder;

        const titleEl = $('#carouselTitle');
        const artistEl = $('#carouselArtist');
        const tracksEl = $('#carouselTracks');

        if (titleEl) titleEl.textContent = current.titulo || '';
        if (artistEl) {
            artistEl.textContent = (current.artista || 'KXON') + ' · ' + new Date().getFullYear() + ' Edition';
        }
        if (tracksEl) {
            const cnt = current.canciones ? current.canciones.length : 0;
            tracksEl.textContent = String(currentAlbumIndex + 1).padStart(2, '0')
                + ' / ' + String(cnt).padStart(2, '0') + ' TRACKS';
        }

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
        setTimeout(() => { if (stage) stage.classList.remove('is-transitioning'); }, 700);
    }

    function updateCarouselDots() {
        const container = $('#carouselDots');
        if (!container) return;
        container.innerHTML = landingAlbumes.map((_, i) =>
            `<div class="kx-albums-v10__dot${i === currentAlbumIndex ? ' is-active' : ''}" data-idx="${i}"></div>`
        ).join('');
    }

    function initCarouselControls() {
        const prevBtn = $('#carouselBtnPrev');
        const nextBtn = $('#carouselBtnNext');
        const dotsContainer = $('#carouselDots');
        const mainEl = $('#carouselMain');

        if (prevBtn) prevBtn.addEventListener('click', () => navigateCarousel('prev'));
        if (nextBtn) nextBtn.addEventListener('click', () => navigateCarousel('next'));
        if (dotsContainer) dotsContainer.addEventListener('click', (e) => {
            const dot = e.target.closest('.kx-albums-v10__dot');
            if (!dot) return;
            const idx = parseInt(dot.dataset.idx);
            if (idx !== currentAlbumIndex) {
                currentAlbumIndex = idx;
                renderCarousel();
                updateCarouselDots();
            }
        });
        if (mainEl) mainEl.addEventListener('click', () => openAlbumModal(currentAlbumIndex));
    }

    function initCarouselSwipe() {
        const stage = $('#carouselStage');
        if (!stage) return;
        let startX = 0, isDragging = false;
        stage.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isDragging = true;
        }, { passive: true });
        stage.addEventListener('touchend', (e) => {
            if (!isDragging) return;
            isDragging = false;
            const diffX = e.changedTouches[0].clientX - startX;
            if (Math.abs(diffX) > 50) {
                diffX > 0 ? navigateCarousel('prev') : navigateCarousel('next');
            }
        }, { passive: true });
    }

    // ═══════════════════════════════════════
    //  📰 NEWS MODAL
    // ═══════════════════════════════════════
    function openNewsModal(idx) {
        const n = landingNoticias[idx];
        if (!n) return;
        const modal = $('#modalNoticia');
        if ($('#noticiaModalTitle')) $('#noticiaModalTitle').textContent = n.titulo;
        if ($('#noticiaDesc')) $('#noticiaDesc').textContent = n.descripcion;
        if ($('#noticiaFecha')) {
            $('#noticiaFecha').textContent = new Date(n.created_at)
                .toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
        }
        const imgWrap = $('#noticiaImgWrap');
        const img = $('#noticiaImg');
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

        if ($('#albumModalTitle')) $('#albumModalTitle').textContent = a.titulo;
        if ($('#albumDesc')) $('#albumDesc').textContent = a.descripcion || 'Sin descripción';
        if ($('#albumCover')) {
            $('#albumCover').src = a.imagen_url || 'https://placehold.co/300x300/0e0e0e/333?text=♪';
            $('#albumCover').alt = a.titulo || '';
        }

        const canciones = a.canciones || [];
        if ($('#albumMeta')) $('#albumMeta').textContent = canciones.length + ' CANCIONES';

        const tracks = $('#albumTracks');
        if (tracks) {
            if (canciones.length === 0) {
                tracks.innerHTML = '<div style="text-align:center;padding:24px;color:var(--kx-silver-700);font-size:var(--kx-text-sm)">Sin canciones en este álbum</div>';
            } else {
                let html = '';
                canciones.forEach((c, i) => {
                    const url = (c.archivo_url || '').replace(/'/g, "\\'");
                    html += `<div class="kx-landing-track" data-track-id="${c.id}" data-audio-url="${url}">
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
                html += `<div class="kx-landing-track__notice"><span>🎧</span><span>Preview de 30 segundos · <a href="register.html">Regístrate</a> para escuchar completo</span></div>`;
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
        requestAnimationFrame(() => {
            modal.querySelector('.kx-landing-modal__close')?.focus();
        });
    }

    function closeModal(modal) {
        if (!modal) return;
        modal.setAttribute('hidden', '');
        document.body.style.overflow = '';
        preview.stop();
    }

    function initModals() {
        document.addEventListener('click', (e) => {
            const closeBtn = e.target.closest('.kx-landing-modal__close, [data-close-modal]');
            if (closeBtn) { closeModal(closeBtn.closest('.kx-landing-modal')); return; }

            const backdrop = e.target.closest('.kx-landing-modal__backdrop');
            if (backdrop) { closeModal(backdrop.closest('.kx-landing-modal')); return; }

            // News card click — v10 class
            const newsCard = e.target.closest('.kx-news-v10__card, .kx-news-magazine__card');
            if (newsCard) { openNewsModal(parseInt(newsCard.dataset.newsIdx)); return; }

            const playBtn = e.target.closest('.kx-landing-track__play');
            if (playBtn) {
                const track = playBtn.closest('.kx-landing-track');
                if (track) preview.play(track.dataset.trackId, track.dataset.audioUrl);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openModalEl = document.querySelector('.kx-landing-modal:not([hidden])');
                if (openModalEl) closeModal(openModalEl);
            }
        });
    }

    // ═══════════════════════════════════════
    //  📲 iOS MODAL
    // ═══════════════════════════════════════
    function initIosModal() {
        const btn = $('#btnIosInstall');
        const modal = $('#iosModal');
        if (btn && modal) btn.addEventListener('click', () => openModal(modal));
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
                if (isOpen) links.setAttribute('hidden', '');
                else links.removeAttribute('hidden');
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
                } catch { /* user cancelled */ }
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
    //  🎭 FAQ ACCORDION
    // ═══════════════════════════════════════
    function initFaqAccordion() {
        $$('.kx-landing-faq__item').forEach(item => {
            const question = item.querySelector('.kx-landing-faq__question');
            if (!question) return;
            question.addEventListener('click', () => {
                $$('.kx-landing-faq__item[open]').forEach(other => {
                    if (other !== item) other.removeAttribute('open');
                });
            });
        });
    }

    // ═══════════════════════════════════════
    //  🎨 ACTIVE NAV HIGHLIGHT
    // ═══════════════════════════════════════
    function initActiveNav() {
        const sections = $$('section[id]');
        const navLinks = $$('.kx-landing-header__link');
        if (sections.length === 0 || navLinks.length === 0) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('id');
                    navLinks.forEach(link => {
                        link.classList.toggle('is-active', link.getAttribute('href') === '#' + id);
                    });
                }
            });
        }, { rootMargin: '-30% 0px -60% 0px', threshold: 0 });

        sections.forEach(section => observer.observe(section));
    }

    // ═══════════════════════════════════════
    //  ⌨️ KEYBOARD NAV CAROUSEL
    // ═══════════════════════════════════════
    function initCarouselKeyboard() {
        document.addEventListener('keydown', (e) => {
            const carousel = $('.kx-albums-v10');
            if (!carousel) return;
            const rect = carousel.getBoundingClientRect();
            if (rect.top > window.innerHeight || rect.bottom < 0) return;
            if (e.key === 'ArrowLeft') { e.preventDefault(); navigateCarousel('prev'); }
            else if (e.key === 'ArrowRight') { e.preventDefault(); navigateCarousel('next'); }
        });
    }

    // ═══════════════════════════════════════
    //  📊 COMPARE TABLE ANIMATION
    // ═══════════════════════════════════════
    function initCompareTable() {
        const rows = $$('.kx-landing-compare__row');
        if (rows.length === 0) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const allRows = entry.target.querySelectorAll('.kx-landing-compare__row');
                    allRows.forEach((row, i) => {
                        setTimeout(() => {
                            row.style.opacity = '1';
                            row.style.transform = 'translateY(0)';
                        }, i * 80);
                    });
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.2 });

        const table = $('.kx-landing-compare');
        if (table) {
            rows.forEach(row => {
                row.style.opacity = '0';
                row.style.transform = 'translateY(12px)';
                row.style.transition = 'opacity 0.5s var(--kx-ease-spring), transform 0.5s var(--kx-ease-spring)';
            });
            observer.observe(table);
        }
    }

    // ═══════════════════════════════════════
    //  🔧 STEPS ANIMATION
    // ═══════════════════════════════════════
    function initStepsAnimation() {
        const stepsContainer = $('.kx-landing-steps');
        if (!stepsContainer || prefersReducedMotion()) return;

        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                stepsContainer.classList.add('is-animated');
                observer.unobserve(stepsContainer);
            }
        }, { threshold: 0.3 });

        observer.observe(stepsContainer);
    }

    // ═══════════════════════════════════════
    //  🧩 HELPERS
    // ═══════════════════════════════════════
    function buildSkeletons(count) {
        return Array.from({ length: count }, () => `
            <article class="kx-news-v10__card">
                <div class="kx-landing-news__skeleton" style="width:100%;aspect-ratio:16/9;border-radius:var(--kx-radius-lg)"></div>
                <div style="padding:var(--kx-space-5)">
                    <div class="kx-landing-news__skeleton" style="height:18px;width:75%;margin-bottom:var(--kx-space-3)"></div>
                    <div class="kx-landing-news__skeleton" style="height:14px;width:100%;margin-bottom:var(--kx-space-2)"></div>
                    <div class="kx-landing-news__skeleton" style="height:14px;width:55%"></div>
                </div>
            </article>`).join('');
    }

    function buildEmpty(icon, title, text = '') {
        return `<div style="grid-column:1/-1;text-align:center;padding:var(--kx-space-16) var(--kx-space-6)">
            <div style="font-size:2.5rem;margin-bottom:var(--kx-space-5);opacity:0.3">${icon}</div>
            <h3 style="font-size:var(--kx-text-lg);color:var(--kx-silver-600);margin-bottom:var(--kx-space-2)">${title}</h3>
            ${text ? `<p style="font-size:var(--kx-text-sm);color:var(--kx-silver-700)">${text}</p>` : ''}
        </div>`;
    }

    // ═══════════════════════════════════════
    //  🚀 INIT
    // ═══════════════════════════════════════
    function init() {
        // Core
        initPageLoader();
        preview.init();
        initCustomCursor();
        initMagneticButtons();
        initSpotlightCards();
        initTiltCards();
        initMorphingText();
        initMobileMenu();
        initScrollReveal();
        initHeroScroll();
        initHeroCounters();
        initVideoSound();
        initSmoothScroll();
        initModals();
        initIosModal();
        initNewsPagination();
        initFloating();
        initFaqAccordion();
        initParallax();
        initPhoneTilt();
        initActiveNav();
        initCarouselKeyboard();
        initCompareTable();
        initStepsAnimation();

        // ★ v10 NEW modules
        initStarField();
        initHeroParticlesV10();
        initCtaParticles();
        initDNAWaveform();
        initOrbitalSystem();

        // Scroll
        window.addEventListener('scroll', onScroll, { passive: true });
        handleHeaderScroll();
        updateScrollProgress();
        handleStickyCta();

        // Load data
        loadNews();
        loadAlbums();

        console.log('🎵 KXON Landing v10.0 — ULTRA PREMIUM 2026 · "SINTONIZA TU UNIVERSO" Edition');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();