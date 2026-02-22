/* ============================================
   💿 PANEL ÁLBUMES — TOTAL REDESIGN ENGINE
   Background injection + Cursor + 3D Tilt +
   Ripple + Track mouse-follow + Reflection
   ⚠️ NO modifica lógica existente
   ============================================ */
(function () {
    'use strict';

    var panel = document.getElementById('panel-albumes');
    if (!panel) return;

    var isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    /* ══════════════════════════════════════════
       🌌 INYECTAR FONDO
       ══════════════════════════════════════════ */
    function injectEnv() {
        if (panel.querySelector('.alb-env')) return;

        var env = document.createElement('div');
        env.className = 'alb-env';
        env.innerHTML =
            '<div class="alb-env-orb"></div>' +
            '<div class="alb-env-orb"></div>' +
            '<div class="alb-env-orb"></div>';
        panel.insertBefore(env, panel.firstChild);

        var freq = document.createElement('div');
        freq.className = 'alb-env-freq';
        var bars = '';
        for (var i = 0; i < 50; i++) {
            var h = 15 + Math.random() * 75;
            bars += '<div class="alb-fbar" style="height:' + h + '%;animation-delay:' + (i * 0.035) + 's"></div>';
        }
        freq.innerHTML = bars;
        panel.insertBefore(freq, panel.firstChild);

        var scan = document.createElement('div');
        scan.className = 'alb-env-scan';
        panel.insertBefore(scan, panel.firstChild);
    }

    injectEnv();

    /* ══════════════════════════════════════════
       🖼️ REFLECTION EN COVER DEL DETAIL
       ══════════════════════════════════════════ */
    function injectReflection() {
        var cover = document.querySelector('#panel-albumes .album-detail-cover');
        if (!cover || cover.querySelector('.alb-reflection')) return;

        var ref = document.createElement('div');
        ref.className = 'alb-reflection';

        var coverImg = cover.querySelector('img');
        if (coverImg) {
            var refImg = coverImg.cloneNode(true);
            refImg.style.width = '100%';
            refImg.style.height = '100%';
            refImg.style.objectFit = 'cover';
            ref.appendChild(refImg);

            var mo = new MutationObserver(function () {
                refImg.src = coverImg.src;
            });
            mo.observe(coverImg, { attributes: true, attributeFilter: ['src'] });
        }

        cover.style.overflow = 'visible';
        cover.appendChild(ref);
    }

    /* ══════════════════════════════════════════
       🖱️ CURSOR DUAL (desktop only)
       ══════════════════════════════════════════ */
    var cursor, cursorDot;
    var cx = 0, cy = 0, dx = 0, dy = 0;
    var cursorOn = false;

    if (!isMobile) {
        cursor = document.createElement('div');
        cursor.className = 'alb-cursor';
        cursor.style.display = 'none';
        panel.appendChild(cursor);

        cursorDot = document.createElement('div');
        cursorDot.className = 'alb-cursor-dot';
        cursorDot.style.display = 'none';
        panel.appendChild(cursorDot);

        function lerpCursor() {
            dx += (cx - dx) * 0.13;
            dy += (cy - dy) * 0.13;
            cursor.style.left = dx + 'px';
            cursor.style.top = dy + 'px';
            cursorDot.style.left = cx + 'px';
            cursorDot.style.top = cy + 'px';
            requestAnimationFrame(lerpCursor);
        }
        lerpCursor();

        panel.addEventListener('mousemove', function (e) {
            cx = e.clientX;
            cy = e.clientY;
            if (!cursorOn) {
                cursor.style.display = 'block';
                cursorDot.style.display = 'block';
                cursorOn = true;
            }
        });

        panel.addEventListener('mouseleave', function () {
            cursor.style.display = 'none';
            cursorDot.style.display = 'none';
            cursorOn = false;
        });

        panel.addEventListener('mouseover', function (e) {
            var onCard = e.target.closest('#albumesGrid > .card');
            var onTrack = e.target.closest('#trackList > .track-item');
            cursor.classList.remove('on-card', 'on-track');
            if (onCard) cursor.classList.add('on-card');
            else if (onTrack) cursor.classList.add('on-track');
        });
    }

    /* ══════════════════════════════════════════
       🃏 3D TILT
       ══════════════════════════════════════════ */
    function tiltMove(e) {
        var c = e.currentTarget;
        var r = c.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        var rx = (py - 0.5) * -10;
        var ry = (px - 0.5) * 10;
        c.style.transform =
            'perspective(1000px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) translateY(-10px) translateZ(18px) scale(1.02)';
    }

    function tiltReset(e) {
        e.currentTarget.style.transform = '';
    }

    /* ══════════════════════════════════════════
       🎵 TRACK MOUSE LIGHT
       ══════════════════════════════════════════ */
    function trackMouse(e) {
        var t = e.currentTarget;
        var r = t.getBoundingClientRect();
        t.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
        t.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
    }

    /* ══════════════════════════════════════════
       🔊 RIPPLE
       ══════════════════════════════════════════ */
    function ripple(e) {
        var el = e.currentTarget;
        var r = el.getBoundingClientRect();
        var rp = document.createElement('span');
        rp.className = 'alb-ripple';
        var s = Math.max(r.width, r.height);
        rp.style.width = rp.style.height = s + 'px';
        rp.style.left = (e.clientX - r.left - s / 2) + 'px';
        rp.style.top = (e.clientY - r.top - s / 2) + 'px';
        el.appendChild(rp);
        setTimeout(function () { rp.remove(); }, 700);
    }

    /* ══════════════════════════════════════════
       🔄 BIND DINÁMICO
       ══════════════════════════════════════════ */
    function bindCards() {
        var grid = document.getElementById('albumesGrid');
        if (!grid) return;
        var cards = grid.querySelectorAll('.card:not([data-ae])');
        for (var i = 0; i < cards.length; i++) {
            var c = cards[i];
            c.setAttribute('data-ae', '1');
            if (!c.classList.contains('album-locked') && !isMobile) {
                c.addEventListener('mousemove', tiltMove);
                c.addEventListener('mouseleave', tiltReset);
            }
            c.addEventListener('click', ripple);
        }
    }

    function bindTracks() {
        var tl = document.getElementById('trackList');
        if (!tl) return;
        var tracks = tl.querySelectorAll('.track-item:not([data-ae])');
        for (var i = 0; i < tracks.length; i++) {
            tracks[i].setAttribute('data-ae', '1');
            if (!isMobile) {
                tracks[i].addEventListener('mousemove', trackMouse);
            }
        }
    }

    /* ── Observer ── */
    var obs = new MutationObserver(function () {
        bindCards();
        bindTracks();
        injectReflection();
    });

    var albumesGrid = document.getElementById('albumesGrid');
    if (albumesGrid) obs.observe(albumesGrid, { childList: true, subtree: true });

    var trackListEl = document.getElementById('trackList');
    if (trackListEl) obs.observe(trackListEl, { childList: true, subtree: true });

    var detailView = document.getElementById('albumDetailView');
    if (detailView) obs.observe(detailView, { childList: true, subtree: true });

    /* ── Initial ── */
    bindCards();
    bindTracks();
    injectReflection();

    /* ── Btn ripple ── */
    var btnAdd = document.getElementById('btnAddTrack');
    if (btnAdd) btnAdd.addEventListener('click', ripple);

    /* ── Re-inject on panel activate ── */
    var panelObs = new MutationObserver(function () {
        if (panel.classList.contains('active')) {
            injectEnv();
            injectReflection();
            bindCards();
            bindTracks();
        }
    });
    panelObs.observe(panel, { attributes: true, attributeFilter: ['class'] });

})();