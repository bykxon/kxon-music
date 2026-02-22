/* ============================================
   💿 PANEL ÁLBUMES — ELITE ENGINE 2026
   Stats counter + 3D Tilt + Track mouse +
   View toggle + Ripple
   ⚠️ NO modifica lógica JS existente
   ============================================ */
(function () {
    'use strict';

    var panel = document.getElementById('panel-albumes');
    if (!panel) return;

    var mob = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    /* ═══════════════════════════════
       📊 STATS COUNTER
       ═══════════════════════════════ */
    function updateStats() {
        var grid = document.getElementById('albumesGrid');
        if (!grid) return;
        var cards = grid.querySelectorAll('.card');
        var countEl = document.getElementById('aeAlbumCount');
        var trackEl = document.getElementById('aeTotalTracks');
        if (countEl) countEl.textContent = cards.length || '—';

        var totalTracks = 0;
        cards.forEach(function (c) {
            var sub = c.querySelector('.card-subtitle');
            if (sub) {
                var m = sub.textContent.match(/(\d+)/);
                if (m) totalTracks += parseInt(m[1], 10);
            }
        });
        if (trackEl) trackEl.textContent = totalTracks || '—';
    }

    /* ═══════════════════════════════
       🔀 VIEW TOGGLE (visual only)
       ═══════════════════════════════ */
    var btnGrid = document.getElementById('aeViewGrid');
    var btnList = document.getElementById('aeViewList');
    var albumGrid = document.getElementById('albumesGrid');

    if (btnGrid && btnList && albumGrid) {
        btnGrid.addEventListener('click', function () {
            albumGrid.style.gridTemplateColumns = '';
            albumGrid.style.gap = '';
            btnGrid.classList.add('ae-view-btn--active');
            btnList.classList.remove('ae-view-btn--active');
        });

        btnList.addEventListener('click', function () {
            albumGrid.style.gridTemplateColumns = '1fr';
            albumGrid.style.gap = '8px';
            btnList.classList.add('ae-view-btn--active');
            btnGrid.classList.remove('ae-view-btn--active');
        });
    }

    /* ═══════════════════════════════
       🃏 3D TILT (desktop)
       ═══════════════════════════════ */
    function tiltM(e) {
        var c = e.currentTarget, r = c.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        c.style.transform =
            'perspective(1000px) rotateX(' + ((py - 0.5) * -8) +
            'deg) rotateY(' + ((px - 0.5) * 8) +
            'deg) translateY(-8px) translateZ(14px) scale(1.02)';
    }

    function tiltR(e) { e.currentTarget.style.transform = ''; }

    /* ═══════════════════════════════
       🎵 TRACK MOUSE
       ═══════════════════════════════ */
    function trkM(e) {
        var t = e.currentTarget, r = t.getBoundingClientRect();
        t.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
        t.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
    }

    /* ═══════════════════════════════
       🔊 RIPPLE
       ═══════════════════════════════ */
    function rip(e) {
        var el = e.currentTarget, r = el.getBoundingClientRect();
        var rp = document.createElement('span');
        rp.style.cssText =
            'position:absolute;border-radius:50%;background:rgba(123,117,232,0.04);' +
            'transform:scale(0);animation:aeRipAnim 0.6s ease-out forwards;pointer-events:none;';
        var s = Math.max(r.width, r.height);
        rp.style.width = rp.style.height = s + 'px';
        rp.style.left = (e.clientX - r.left - s / 2) + 'px';
        rp.style.top = (e.clientY - r.top - s / 2) + 'px';
        el.appendChild(rp);
        setTimeout(function () { rp.remove(); }, 650);
    }

    /* inject ripple keyframes */
    var style = document.createElement('style');
    style.textContent = '@keyframes aeRipAnim{to{transform:scale(4);opacity:0}}';
    document.head.appendChild(style);

    /* ═══════════════════════════════
       🔄 DYNAMIC BIND
       ═══════════════════════════════ */
    function bindC() {
        var g = document.getElementById('albumesGrid');
        if (!g) return;
        var cards = g.querySelectorAll('.card:not([data-ae])');
        for (var i = 0; i < cards.length; i++) {
            cards[i].setAttribute('data-ae', '1');
            if (!cards[i].classList.contains('album-locked') && !mob) {
                cards[i].addEventListener('mousemove', tiltM);
                cards[i].addEventListener('mouseleave', tiltR);
            }
            cards[i].addEventListener('click', rip);
        }
        updateStats();
    }

    function bindT() {
        var tl = document.getElementById('trackList');
        if (!tl) return;
        var trks = tl.querySelectorAll('.track-item:not([data-ae])');
        for (var i = 0; i < trks.length; i++) {
            trks[i].setAttribute('data-ae', '1');
            if (!mob) trks[i].addEventListener('mousemove', trkM);
        }
    }

    /* ── Observer ── */
    var obs = new MutationObserver(function () { bindC(); bindT(); });

    var g = document.getElementById('albumesGrid');
    if (g) obs.observe(g, { childList: true, subtree: true });

    var tl = document.getElementById('trackList');
    if (tl) obs.observe(tl, { childList: true, subtree: true });

    var dv = document.getElementById('albumDetailView');
    if (dv) obs.observe(dv, { childList: true, subtree: true });

    bindC();
    bindT();

    /* ── Re-init on activate ── */
    new MutationObserver(function () {
        if (panel.classList.contains('active')) { bindC(); bindT(); }
    }).observe(panel, { attributes: true, attributeFilter: ['class'] });

})();