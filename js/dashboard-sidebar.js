/**
 * 🎵 KXON — Elite Sidebar Controller v3.0
 * Collapse, Search, Ripple, Mouse-tracking,
 * Keyboard Nav, Responsive, Scroll Masks
 */
(function () {
    'use strict';

    var sidebar = document.getElementById('sidebar');
    var collapseBtn = document.getElementById('sidebarCollapseBtn');
    var searchField = document.getElementById('sidebarSearchField');
    var sidebarNav = document.getElementById('sidebarNav');

    if (!sidebar) return;

    var COLLAPSED_KEY = 'kxon-sidebar-collapsed';
    var navItems = sidebar.querySelectorAll('.nav-item[data-panel]');

    /* ══════════════════════════════════════
       COLLAPSE / EXPAND
       ══════════════════════════════════════ */
    function toggleCollapse() {
        sidebar.classList.toggle('collapsed');
        var isCollapsed = sidebar.classList.contains('collapsed');
        localStorage.setItem(COLLAPSED_KEY, isCollapsed ? '1' : '0');

        if (collapseBtn) {
            var svg = collapseBtn.querySelector('svg');
            if (svg) {
                svg.style.transform = isCollapsed ? 'rotate(180deg)' : '';
                svg.style.transition = 'transform 0.3s ease';
            }
        }
    }

    if (collapseBtn) {
        collapseBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            toggleCollapse();
        });
    }

    // Restore state
    if (window.innerWidth > 1024) {
        if (localStorage.getItem(COLLAPSED_KEY) === '1') {
            sidebar.classList.add('collapsed');
            var svg = collapseBtn ? collapseBtn.querySelector('svg') : null;
            if (svg) svg.style.transform = 'rotate(180deg)';
        }
    }

    /* ══════════════════════════════════════
       SIDEBAR SEARCH
       ══════════════════════════════════════ */
    if (searchField) {
        searchField.addEventListener('input', function () {
            var query = this.value.toLowerCase().trim();
            var sections = sidebarNav.querySelectorAll('.nav-section-label');

            navItems.forEach(function (item) {
                var text = item.querySelector('.nav-text');
                if (!text) return;
                var match = text.textContent.toLowerCase().indexOf(query) >= 0;
                item.style.display = (query === '' || match) ? '' : 'none';
            });

            sections.forEach(function (sec) {
                var next = sec.nextElementSibling;
                var hasVisible = false;
                while (next && !next.classList.contains('nav-section-label')) {
                    if (next.classList.contains('nav-item') && next.style.display !== 'none') {
                        hasVisible = true;
                    }
                    next = next.nextElementSibling;
                }
                sec.style.display = (query === '' || hasVisible) ? '' : 'none';
            });
        });

        // ⌘K shortcut
        document.addEventListener('keydown', function (e) {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                if (sidebar.classList.contains('collapsed')) {
                    sidebar.classList.remove('collapsed');
                    localStorage.setItem(COLLAPSED_KEY, '0');
                    var svg = collapseBtn ? collapseBtn.querySelector('svg') : null;
                    if (svg) svg.style.transform = '';
                }
                searchField.focus();
            }
            if (e.key === 'Escape' && document.activeElement === searchField) {
                searchField.value = '';
                searchField.dispatchEvent(new Event('input'));
                searchField.blur();
            }
        });
    }

    /* ══════════════════════════════════════
       RIPPLE EFFECT
       ══════════════════════════════════════ */
    navItems.forEach(function (item) {
        item.addEventListener('click', function (e) {
            var existing = item.querySelectorAll('.nav-item-ripple');
            existing.forEach(function (r) { r.remove(); });

            var rect = item.getBoundingClientRect();
            var ripple = document.createElement('span');
            ripple.className = 'nav-item-ripple';
            var size = Math.max(rect.width, rect.height) * 2;
            ripple.style.width = size + 'px';
            ripple.style.height = size + 'px';
            ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
            ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
            item.appendChild(ripple);

            setTimeout(function () { ripple.remove(); }, 700);
        });
    });

    /* ══════════════════════════════════════
       MOUSE TRACKING — LIGHT FOLLOW
       ══════════════════════════════════════ */
    navItems.forEach(function (item) {
        item.addEventListener('mousemove', function (e) {
            var rect = item.getBoundingClientRect();
            var x = ((e.clientX - rect.left) / rect.width * 100);
            var y = ((e.clientY - rect.top) / rect.height * 100);
            item.style.setProperty('--mouse-x', x + '%');
            item.style.setProperty('--mouse-y', y + '%');
        });
    });

    /* ══════════════════════════════════════
       KEYBOARD NAVIGATION
       ══════════════════════════════════════ */
    if (sidebarNav) {
        sidebarNav.addEventListener('keydown', function (e) {
            var visible = [];
            navItems.forEach(function (it) {
                if (it.style.display !== 'none') visible.push(it);
            });
            var current = document.activeElement;
            var idx = visible.indexOf(current);

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                var next = visible[idx + 1] || visible[0];
                if (next) next.focus();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                var prev = visible[idx - 1] || visible[visible.length - 1];
                if (prev) prev.focus();
            } else if (e.key === 'Enter' && current && current.classList.contains('nav-item')) {
                current.click();
            }
        });

        navItems.forEach(function (item) {
            item.setAttribute('tabindex', '0');
        });
    }

    /* ══════════════════════════════════════
       DOUBLE CLICK LOGO → COLLAPSE
       ══════════════════════════════════════ */
    var logoArea = sidebar.querySelector('.sidebar-header');
    var lastClickTime = 0;
    if (logoArea) {
        logoArea.addEventListener('click', function (e) {
            if (e.target.closest('.sidebar-collapse-btn')) return;
            if (e.target.closest('a')) return;
            var now = Date.now();
            if (now - lastClickTime < 350) {
                toggleCollapse();
            }
            lastClickTime = now;
        });
    }

    /* ══════════════════════════════════════
       SCROLL FADE MASK
       ══════════════════════════════════════ */
    if (sidebarNav) {
        function updateScrollMask() {
            var scrollTop = sidebarNav.scrollTop;
            var scrollHeight = sidebarNav.scrollHeight;
            var clientHeight = sidebarNav.clientHeight;
            var atTop = scrollTop < 5;
            var atBottom = scrollTop + clientHeight >= scrollHeight - 5;

            var mask;
            if (atTop && atBottom) {
                mask = 'none';
            } else if (atTop) {
                mask = 'linear-gradient(to bottom, black 0%, black calc(100% - 28px), transparent 100%)';
            } else if (atBottom) {
                mask = 'linear-gradient(to bottom, transparent 0%, black 28px, black 100%)';
            } else {
                mask = 'linear-gradient(to bottom, transparent 0%, black 28px, black calc(100% - 28px), transparent 100%)';
            }

            sidebarNav.style.maskImage = mask;
            sidebarNav.style.webkitMaskImage = mask;
        }

        sidebarNav.addEventListener('scroll', updateScrollMask, { passive: true });
        setTimeout(updateScrollMask, 100);

        // Update on resize
        window.addEventListener('resize', updateScrollMask);
    }

    /* ══════════════════════════════════════
       RESPONSIVE
       ══════════════════════════════════════ */
    var lastW = window.innerWidth;
    window.addEventListener('resize', function () {
        var w = window.innerWidth;

        if (w > 1024 && lastW <= 1024) {
            sidebar.classList.remove('open');
            var overlay = document.getElementById('sidebarOverlay');
            if (overlay) overlay.classList.remove('show');
        }

        if (w <= 1280 && w > 1024 && lastW > 1280) {
            sidebar.classList.add('collapsed');
            var svg2 = collapseBtn ? collapseBtn.querySelector('svg') : null;
            if (svg2) svg2.style.transform = 'rotate(180deg)';
        }

        if (w > 1280 && lastW <= 1280) {
            if (localStorage.getItem(COLLAPSED_KEY) !== '1') {
                sidebar.classList.remove('collapsed');
                var svg3 = collapseBtn ? collapseBtn.querySelector('svg') : null;
                if (svg3) svg3.style.transform = '';
            }
        }

        lastW = w;
    });

    if (window.innerWidth <= 1280 && window.innerWidth > 1024) {
        sidebar.classList.add('collapsed');
        var svg4 = collapseBtn ? collapseBtn.querySelector('svg') : null;
        if (svg4) svg4.style.transform = 'rotate(180deg)';
    }

    /* ══════════════════════════════════════
       ACTIVE ITEM SCROLL INTO VIEW
       ══════════════════════════════════════ */
    setTimeout(function () {
        var activeItem = sidebar.querySelector('.nav-item.active');
        if (activeItem && sidebarNav) {
            activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, 300);

    console.log('%c🎵 KXON Sidebar Elite v3.0', 'color:#c0c0c0;font-weight:bold;font-size:12px;background:#08080c;padding:4px 12px;border-radius:4px;');

})();