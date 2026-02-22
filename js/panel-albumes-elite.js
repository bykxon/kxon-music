/* ============================================
   💿 PANEL ÁLBUMES — ELITE INTERACTIONS 2026
   Cursor dinámico + 3D tilt + Ripple
   ⚠️ NO modifica lógica existente
   ============================================ */
(function () {
    'use strict';

    var panel = document.getElementById('panel-albumes');
    if (!panel) return;

    /* ══════════════════════════════════════════
       🖱️ CURSOR DINÁMICO
       ══════════════════════════════════════════ */
    var cursor = document.createElement('div');
    cursor.className = 'alb-cursor';
    panel.appendChild(cursor);

    var cursorVisible = false;
    var cursorX = 0;
    var cursorY = 0;
    var raf = null;

    function updateCursor() {
        cursor.style.transform = 'translate(' + (cursorX - cursor.offsetWidth / 2) + 'px, ' + (cursorY - cursor.offsetHeight / 2) + 'px)';
        raf = null;
    }

    panel.addEventListener('mousemove', function (e) {
        cursorX = e.clientX;
        cursorY = e.clientY;

        if (!cursorVisible) {
            cursor.style.display = 'block';
            cursorVisible = true;
        }

        if (!raf) {
            raf = requestAnimationFrame(updateCursor);
        }
    });

    panel.addEventListener('mouseleave', function () {
        cursor.style.display = 'none';
        cursorVisible = false;
    });

    /* ══════════════════════════════════════════
       🃏 3D TILT EN TARJETAS
       ══════════════════════════════════════════ */
    function handleTilt(e) {
        var card = e.currentTarget;
        var rect = card.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        var centerX = rect.width / 2;
        var centerY = rect.height / 2;

        var rotateX = ((y - centerY) / centerY) * -4;
        var rotateY = ((x - centerX) / centerX) * 4;

        card.style.transform =
            'perspective(800px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) translateY(-8px) translateZ(10px)';
    }

    function resetTilt(e) {
        e.currentTarget.style.transform = '';
    }

    function handleCursorHover(e) {
        var card = e.target.closest('#albumesGrid > .card');
        if (card) {
            cursor.classList.add('alb-cursor-hover');
        } else {
            cursor.classList.remove('alb-cursor-hover');
        }
    }

    /* ══════════════════════════════════════════
       🔊 RIPPLE EN BOTONES
       ══════════════════════════════════════════ */
    function createRipple(e) {
        var btn = e.currentTarget;
        var rect = btn.getBoundingClientRect();
        var ripple = document.createElement('span');
        ripple.className = 'alb-ripple';
        var size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
        btn.appendChild(ripple);
        setTimeout(function () {
            ripple.remove();
        }, 700);
    }

    /* ══════════════════════════════════════════
       🎵 TRACK MOUSE FOLLOW LIGHT
       ══════════════════════════════════════════ */
    function handleTrackMouseMove(e) {
        var track = e.currentTarget;
        var rect = track.getBoundingClientRect();
        var x = ((e.clientX - rect.left) / rect.width) * 100;
        var y = ((e.clientY - rect.top) / rect.height) * 100;
        track.style.setProperty('--mouse-x', x + '%');
        track.style.setProperty('--mouse-y', y + '%');
    }

    /* ══════════════════════════════════════════
       🔄 OBSERVER — DETECTAR CAMBIOS DOM
       ══════════════════════════════════════════ */
    function bindCardEvents() {
        var grid = document.getElementById('albumesGrid');
        if (!grid) return;

        var cards = grid.querySelectorAll('.card:not(.alb-bound)');
        for (var i = 0; i < cards.length; i++) {
            var card = cards[i];
            card.classList.add('alb-bound');

            if (!card.classList.contains('album-locked')) {
                card.addEventListener('mousemove', handleTilt);
                card.addEventListener('mouseleave', resetTilt);
                card.addEventListener('click', createRipple);
            }
        }
    }

    function bindTrackEvents() {
        var trackList = document.getElementById('trackList');
        if (!trackList) return;

        var tracks = trackList.querySelectorAll('.track-item:not(.alb-track-bound)');
        for (var i = 0; i < tracks.length; i++) {
            tracks[i].classList.add('alb-track-bound');
            tracks[i].addEventListener('mousemove', handleTrackMouseMove);
        }
    }

    /* ── Cursor hover delegation ── */
    panel.addEventListener('mouseover', handleCursorHover);

    /* ── Observe grid changes ── */
    var observer = new MutationObserver(function () {
        bindCardEvents();
        bindTrackEvents();
    });

    var grid = document.getElementById('albumesGrid');
    if (grid) {
        observer.observe(grid, { childList: true, subtree: true });
    }

    var trackList = document.getElementById('trackList');
    if (trackList) {
        observer.observe(trackList, { childList: true, subtree: true });
    }

    /* ── Also observe detail view ── */
    var detailView = document.getElementById('albumDetailView');
    if (detailView) {
        observer.observe(detailView, { childList: true, subtree: true });
    }

    /* ── Initial bind ── */
    bindCardEvents();
    bindTrackEvents();

    /* ── Bind add-track button ripple ── */
    var btnAdd = document.getElementById('btnAddTrack');
    if (btnAdd) {
        btnAdd.addEventListener('click', createRipple);
    }

    /* ── Hide custom cursor on mobile ── */
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        cursor.style.display = 'none';
    }

})();