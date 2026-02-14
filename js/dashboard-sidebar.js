/**
 * 🎵 KXON — World-Class Sidebar Controller
 * Collapse, Search, Ripple, Keyboard, Responsive
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
            collapseBtn.textContent = isCollapsed ? '▶' : '◀';
        }
    }

    if (collapseBtn) {
        collapseBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            toggleCollapse();
        });
    }

    // Restore state on desktop
    if (window.innerWidth > 1024) {
        if (localStorage.getItem(COLLAPSED_KEY) === '1') {
            sidebar.classList.add('collapsed');
            if (collapseBtn) collapseBtn.textContent = '▶';
        }
    }

    /* ══════════════════════════════════════
       SIDEBAR SEARCH (filter nav items)
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

            // Hide empty sections
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
                    if (collapseBtn) collapseBtn.textContent = '◀';
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
       RIPPLE EFFECT ON CLICK
       ══════════════════════════════════════ */
    navItems.forEach(function (item) {
        item.addEventListener('click', function (e) {
            // Create ripple
            var existing = item.querySelector('.nav-item-ripple');
            if (existing) existing.remove();

            var rect = item.getBoundingClientRect();
            var ripple = document.createElement('span');
            ripple.className = 'nav-item-ripple';
            var size = Math.max(rect.width, rect.height);
            ripple.style.width = size + 'px';
            ripple.style.height = size + 'px';
            ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
            ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
            item.appendChild(ripple);

            setTimeout(function () { ripple.remove(); }, 600);
        });
    });

    /* ══════════════════════════════════════
       MOUSE TRACKING FOR HOVER GLOW
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

        // Make items focusable
        navItems.forEach(function (item) {
            item.setAttribute('tabindex', '0');
        });
    }

    /* ══════════════════════════════════════
       DOUBLE CLICK LOGO TO COLLAPSE
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
       RESPONSIVE: Auto-collapse on medium
       ══════════════════════════════════════ */
    var lastW = window.innerWidth;
    window.addEventListener('resize', function () {
        var w = window.innerWidth;

        if (w > 1024 && lastW <= 1024) {
            sidebar.classList.remove('open');
            document.getElementById('sidebarOverlay').classList.remove('show');
        }

        // Auto collapse between 1024-1280
        if (w <= 1280 && w > 1024 && lastW > 1280) {
            sidebar.classList.add('collapsed');
            if (collapseBtn) collapseBtn.textContent = '▶';
        }

        // Auto expand above 1280 (if user didn't manually collapse)
        if (w > 1280 && lastW <= 1280) {
            if (localStorage.getItem(COLLAPSED_KEY) !== '1') {
                sidebar.classList.remove('collapsed');
                if (collapseBtn) collapseBtn.textContent = '◀';
            }
        }

        lastW = w;
    });

    // Initial auto-collapse for medium screens
    if (window.innerWidth <= 1280 && window.innerWidth > 1024) {
        sidebar.classList.add('collapsed');
        if (collapseBtn) collapseBtn.textContent = '▶';
    }

    /* ══════════════════════════════════════
       SCROLL SHADOW INDICATOR
       ══════════════════════════════════════ */
    if (sidebarNav) {
        sidebarNav.addEventListener('scroll', function () {
            if (sidebarNav.scrollTop > 10) {
                sidebarNav.style.maskImage = 'linear-gradient(to bottom, transparent 0px, black 20px, black calc(100% - 20px), transparent 100%)';
                sidebarNav.style.webkitMaskImage = sidebarNav.style.maskImage;
            } else {
                sidebarNav.style.maskImage = 'linear-gradient(to bottom, black 0%, black calc(100% - 20px), transparent 100%)';
                sidebarNav.style.webkitMaskImage = sidebarNav.style.maskImage;
            }
        });

        // Initial mask
        sidebarNav.style.maskImage = 'linear-gradient(to bottom, black 0%, black calc(100% - 20px), transparent 100%)';
        sidebarNav.style.webkitMaskImage = sidebarNav.style.maskImage;
    }

    console.log('%c🎵 KXON Sidebar v2.0 — World Class', 'color:#c0c0c0;font-weight:bold;font-size:12px;');

})();