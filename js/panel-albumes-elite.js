/* ============================================
   💿 PANEL ÁLBUMES — ELITE ENGINE
   BG + Cursor + Tilt + Ripple + Reflection
   ⚠️ NO modifica lógica existente
   ============================================ */
(function () {
    'use strict';

    var panel = document.getElementById('panel-albumes');
    if (!panel) return;

    var mob = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    /* ═══════════════════════════════
       🌌 INJECT BACKGROUND
       ═══════════════════════════════ */
    function injectEnv() {
        if (panel.querySelector('.ae-env')) return;

        var env = document.createElement('div');
        env.className = 'ae-env';
        env.innerHTML = '<div class="ae-orb"></div><div class="ae-orb"></div><div class="ae-orb"></div>';
        panel.insertBefore(env, panel.firstChild);

        var freq = document.createElement('div');
        freq.className = 'ae-freq';
        var b = '';
        for (var i = 0; i < 55; i++) {
            var h = 12 + Math.random() * 78;
            b += '<div class="ae-fbar" style="height:' + h + '%;animation-delay:' + (i * 0.032) + 's"></div>';
        }
        freq.innerHTML = b;
        panel.insertBefore(freq, panel.firstChild);

        var scan = document.createElement('div');
        scan.className = 'ae-scan';
        panel.insertBefore(scan, panel.firstChild);

        var grid = document.createElement('div');
        grid.className = 'ae-grid';
        panel.insertBefore(grid, panel.firstChild);
    }

    injectEnv();

    /* ═══════════════════════════════
       🖼️ COVER REFLECTION
       ═══════════════════════════════ */
    function injectRef() {
        var cover = panel.querySelector('.album-detail-cover');
        if (!cover || cover.querySelector('.alb-ref')) return;

        var r = document.createElement('div');
        r.className = 'alb-ref';

        var img = cover.querySelector('img');
        if (img) {
            var clone = img.cloneNode(true);
            clone.style.cssText = 'width:100%;height:100%;object-fit:cover;';
            r.appendChild(clone);

            new MutationObserver(function () {
                clone.src = img.src;
            }).observe(img, { attributes: true, attributeFilter: ['src'] });
        }

        cover.style.overflow = 'visible';
        cover.appendChild(r);
    }

    /* ═══════════════════════════════
       🖱️ CURSOR (desktop)
       ═══════════════════════════════ */
    var cur, dot, cx = 0, cy = 0, lx = 0, ly = 0, on = false;

    if (!mob) {
        cur = document.createElement('div');
        cur.className = 'ae-cur';
        cur.style.display = 'none';
        panel.appendChild(cur);

        dot = document.createElement('div');
        dot.className = 'ae-dot';
        dot.style.display = 'none';
        panel.appendChild(dot);

        (function loop() {
            lx += (cx - lx) * 0.12;
            ly += (cy - ly) * 0.12;
            cur.style.left = lx + 'px';
            cur.style.top = ly + 'px';
            dot.style.left = cx + 'px';
            dot.style.top = cy + 'px';
            requestAnimationFrame(loop);
        })();

        panel.addEventListener('mousemove', function (e) {
            cx = e.clientX; cy = e.clientY;
            if (!on) { cur.style.display = 'block'; dot.style.display = 'block'; on = true; }
        });

        panel.addEventListener('mouseleave', function () {
            cur.style.display = 'none'; dot.style.display = 'none'; on = false;
        });

        panel.addEventListener('mouseover', function (e) {
            var c = e.target.closest('#albumesGrid > .card');
            var t = e.target.closest('#trackList > .track-item');
            cur.classList.remove('ae-c-card', 'ae-c-trk');
            if (c) cur.classList.add('ae-c-card');
            else if (t) cur.classList.add('ae-c-trk');
        });
    }

    /* ═══════════════════════════════
       🃏 3D TILT
       ═══════════════════════════════ */
    function tiltM(e) {
        var c = e.currentTarget, r = c.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        c.style.transform =
            'perspective(1000px) rotateX(' + ((py - 0.5) * -10) +
            'deg) rotateY(' + ((px - 0.5) * 10) +
            'deg) translateY(-10px) translateZ(20px) scale(1.02)';
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
        rp.className = 'ae-rip';
        var s = Math.max(r.width, r.height);
        rp.style.width = rp.style.height = s + 'px';
        rp.style.left = (e.clientX - r.left - s / 2) + 'px';
        rp.style.top = (e.clientY - r.top - s / 2) + 'px';
        el.appendChild(rp);
        setTimeout(function () { rp.remove(); }, 700);
    }

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
    var obs = new MutationObserver(function () { bindC(); bindT(); injectRef(); });

    var g = document.getElementById('albumesGrid');
    if (g) obs.observe(g, { childList: true, subtree: true });

    var tl = document.getElementById('trackList');
    if (tl) obs.observe(tl, { childList: true, subtree: true });

    var dv = document.getElementById('albumDetailView');
    if (dv) obs.observe(dv, { childList: true, subtree: true });

    bindC(); bindT(); injectRef();

    var ba = document.getElementById('btnAddTrack');
    if (ba) ba.addEventListener('click', rip);

    /* ── Re-init on panel activate ── */
    new MutationObserver(function () {
        if (panel.classList.contains('active')) {
            injectEnv(); injectRef(); bindC(); bindT();
        }
    }).observe(panel, { attributes: true, attributeFilter: ['class'] });

})();