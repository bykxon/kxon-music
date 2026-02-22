/* ============================================
   💿 PANEL ÁLBUMES — ULTRA ELITE INTERACTIONS
   ⚠️ NO modifica lógica existente
   Cursor + 3D Tilt + Ripple + BG Injection
   ============================================ */
(function () {
    'use strict';

    var panel = document.getElementById('panel-albumes');
    if (!panel) return;

    var isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    /* ══════════════════════════════════════════
       🌌 INYECTAR FONDO DINÁMICO
       ══════════════════════════════════════════ */
    function injectBackground() {
        if (panel.querySelector('.alb-bg-layer')) return;

        /* ── Orbs ── */
        var bgLayer = document.createElement('div');
        bgLayer.className = 'alb-bg-layer';
        bgLayer.innerHTML = '<div class="alb-orb"></div><div class="alb-orb"></div><div class="alb-orb"></div>';
        panel.insertBefore(bgLayer, panel.firstChild);

        /* ── Frequency bars ── */
        var freqBars = document.createElement('div');
        freqBars.className = 'alb-freq-bars';
        var barsHTML = '';
        for (var i = 0; i < 40; i++) {
            barsHTML += '<div class="alb-freq-bar" style="animation-delay:' + (i * 0.04) + 's"></div>';
        }
        freqBars.innerHTML = barsHTML;
        panel.insertBefore(freqBars, panel.firstChild);

        /* ── Scanline ── */
        var scanline = document.createElement('div');
        scanline.className = 'alb-scanline';
        panel.insertBefore(scanline, panel.firstChild);

        /* ── Noise ── */
        var noise = document.createElement('div');
        noise.className = 'alb-noise';
        panel.insertBefore(noise, panel.firstChild);
    }

    injectBackground();

    /* ══════════════════════════════════════════
       🖱️ CURSOR PERSONALIZADO DUAL
       ══════════════════════════════════════════ */
    if (isMobile) return; /* No cursor en mobile */

    var cursor = document.createElement('div');
    cursor.className = 'alb-cursor';
    panel.appendChild(cursor);

    var cursorDot = document.createElement('div');
    cursorDot.className = 'alb-cursor-dot';
    panel.appendChild(cursorDot);

    var cx = 0, cy = 0;
    var dx = 0, dy = 0;
    var cursorVisible = false;

    function animateCursor() {
        dx += (cx - dx) * 0.15;
        dy += (cy - dy) * 0.15;
        cursor.style.left = dx + 'px';
        cursor.style.top = dy + 'px';
        cursorDot.style.left = cx + 'px';
        cursorDot.style.top = cy + 'px';
        requestAnimationFrame(animateCursor);
    }

    animateCursor();

    panel.addEventListener('mousemove', function (e) {
        cx = e.clientX;
        cy = e.clientY;

        if (!cursorVisible) {
            cursor.style.display = 'block';
            cursorDot.style.display = 'block';
            cursorVisible = true;
        }
    });

    panel.addEventListener('mouseleave', function () {
        cursor.style.display = 'none';
        cursorDot.style.display = 'none';
        cursorVisible = false;
    });

    /* ══════════════════════════════════════════
       🃏 3D TILT AVANZADO
       ══════════════════════════════════════════ */
    function handleTilt(e) {
        var card = e.currentTarget;
        var rect = card.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        var px = x / rect.width;
        var py = y / rect.height;

        var rotateX = (py - 0.5) * -8;
        var rotateY = (px - 0.5) * 8;
        var translateZ = 15;

        card.style.transform =
            'perspective(1000px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) translateY(-8px) translateZ(' + translateZ + 'px) scale(1.02)';
    }

    function resetTilt(e) {
        var card = e.currentTarget;
        card.style.transform = '';
    }

    /* ══════════════════════════════════════════
       🎵 TRACK MOUSE LIGHT
       ══════════════════════════════════════════ */
    function handleTrackMouse(e) {
        var track = e.currentTarget;
        var rect = track.getBoundingClientRect();
        var x = ((e.clientX - rect.left) / rect.width) * 100;
        var y = ((e.clientY - rect.top) / rect.height) * 100;
        track.style.setProperty('--mx', x + '%');
        track.style.setProperty('--my', y + '%');
    }

    /* ══════════════════════════════════════════
       🖱️ CURSOR STATE POR HOVER
       ══════════════════════════════════════════ */
    panel.addEventListener('mouseover', function (e) {
        var card = e.target.closest('#albumesGrid > .card');
        var track = e.target.closest('#trackList > .track-item');

        cursor.classList.remove('on-card', 'on-track');

        if (card) {
            cursor.classList.add('on-card');
        } else if (track) {
            cursor.classList.add('on-track');
        }
    });

    /* ══════════════════════════════════════════
       🔊 RIPPLE
       ══════════════════════════════════════════ */
    function createRipple(e) {
        var el = e.currentTarget;
        var rect = el.getBoundingClientRect();
        var ripple = document.createElement('span');
        ripple.className = 'alb-ripple';
        var size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
        el.appendChild(ripple);
        setTimeout(function () { ripple.remove(); }, 750);
    }

    /* ══════════════════════════════════════════
       🔄 BIND EVENTS DINÁMICAMENTE
       ══════════════════════════════════════════ */
    function bindCards() {
        var grid = document.getElementById('albumesGrid');
        if (!grid) return;

        var cards = grid.querySelectorAll('.card:not([data-alb-bound])');
        for (var i = 0; i < cards.length; i++) {
            var card = cards[i];
            card.setAttribute('data-alb-bound', '1');

            if (!card.classList.contains('album-locked')) {
                card.addEventListener('mousemove', handleTilt);
                card.addEventListener('mouseleave', resetTilt);
            }
            card.addEventListener('click', createRipple);
        }
    }

    function bindTracks() {
        var trackList = document.getElementById('trackList');
        if (!trackList) return;

        var tracks = trackList.querySelectorAll('.track-item:not([data-alb-bound])');
        for (var i = 0; i < tracks.length; i++) {
            tracks[i].setAttribute('data-alb-bound', '1');
            tracks[i].addEventListener('mousemove', handleTrackMouse);
        }
    }

    /* ── MutationObserver ── */
    var observer = new MutationObserver(function () {
        bindCards();
        bindTracks();
    });

    var grid = document.getElementById('albumesGrid');
    if (grid) observer.observe(grid, { childList: true, subtree: true });

    var trackListEl = document.getElementById('trackList');
    if (trackListEl) observer.observe(trackListEl, { childList: true, subtree: true });

    var detailView = document.getElementById('albumDetailView');
    if (detailView) observer.observe(detailView, { childList: true, subtree: true });

    /* ── Initial bind ── */
    bindCards();
    bindTracks();

    /* ── Ripple on add-track button ── */
    var btnAdd = document.getElementById('btnAddTrack');
    if (btnAdd) btnAdd.addEventListener('click', createRipple);

    /* ── Re-inject BG when panel becomes active ── */
    var panelObserver = new MutationObserver(function () {
        if (panel.classList.contains('active')) {
            injectBackground();
        }
    });
    panelObserver.observe(panel, { attributes: true, attributeFilter: ['class'] });

})();