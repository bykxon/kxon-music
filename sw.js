/* ============================================
   ⚡ SERVICE WORKER — KXON PWA
   Cache estratégico + Offline fallback
   ============================================ */

var CACHE_NAME = 'kxon-v1.0';
var STATIC_ASSETS = [
    '/',
    '/index.html',
    '/login.html',
    '/register.html',
    '/dashboard.html',
    '/forgot-password.html',
    '/404.html',
    '/manifest.json',
    '/favicon.svg',
    '/css/global.css',
    '/css/auth.css',
    '/css/landing.css',
    '/css/dashboard-layout.css',
    '/css/dashboard-panels.css',
    '/css/dashboard-player.css',
    '/css/dashboard-modals.css',
    '/css/dashboard-marketplace.css',
    '/css/dashboard-videos.css',
    '/css/dashboard-perfil.css',
    '/css/dashboard-responsive.css',
    '/css/dashboard-favs-share.css',
    '/js/supabase-config.js',
    '/js/landing.js',
    '/js/dashboard-init.js',
    '/js/dashboard-albumes.js',
    '/js/dashboard-noticias.js',
    '/js/dashboard-radio.js',
    '/js/dashboard-marketplace.js',
    '/js/dashboard-archivo.js',
    '/js/dashboard-videos.js',
    '/js/dashboard-perfil.js',
    '/js/dashboard-planes.js',
    '/js/dashboard-modals.js',
    '/js/dashboard-search.js',
    '/js/dashboard-notifications.js',
    '/js/dashboard-favs-share.js'
];

/* ── INSTALL: Cachear assets estáticos ── */
self.addEventListener('install', function (e) {
    console.log('[SW] Installing KXON v1.0');
    e.waitUntil(
        caches.open(CACHE_NAME).then(function (cache) {
            return cache.addAll(STATIC_ASSETS).catch(function (err) {
                console.warn('[SW] Some assets failed to cache:', err);
            });
        })
    );
    self.skipWaiting();
});

/* ── ACTIVATE: Limpiar caches viejos ── */
self.addEventListener('activate', function (e) {
    console.log('[SW] Activating KXON');
    e.waitUntil(
        caches.keys().then(function (names) {
            return Promise.all(
                names.filter(function (name) {
                    return name !== CACHE_NAME;
                }).map(function (name) {
                    console.log('[SW] Deleting old cache:', name);
                    return caches.delete(name);
                })
            );
        })
    );
    self.clients.claim();
});

/* ── FETCH: Network first, fallback to cache ── */
self.addEventListener('fetch', function (e) {
    var url = new URL(e.request.url);

    /* Skip non-GET, Supabase API, Chrome extensions */
    if (e.request.method !== 'GET') return;
    if (url.hostname.indexOf('supabase') >= 0) return;
    if (url.protocol === 'chrome-extension:') return;

    /* Audio/Video: Network only (no cache) */
    var isMedia = url.pathname.match(/\.(mp3|wav|ogg|mp4|webm|mov)$/i);
    if (isMedia) return;

    /* Images from Supabase storage: Cache first */
    if (url.hostname.indexOf('supabase') >= 0 && url.pathname.indexOf('/storage/') >= 0) {
        e.respondWith(
            caches.match(e.request).then(function (cached) {
                if (cached) return cached;
                return fetch(e.request).then(function (response) {
                    if (response && response.status === 200) {
                        var clone = response.clone();
                        caches.open(CACHE_NAME).then(function (cache) {
                            cache.put(e.request, clone);
                        });
                    }
                    return response;
                }).catch(function () {
                    return new Response('', { status: 404 });
                });
            })
        );
        return;
    }

    /* Static assets: Stale-while-revalidate */
    e.respondWith(
        caches.match(e.request).then(function (cached) {
            var fetchPromise = fetch(e.request).then(function (response) {
                if (response && response.status === 200 && response.type === 'basic') {
                    var clone = response.clone();
                    caches.open(CACHE_NAME).then(function (cache) {
                        cache.put(e.request, clone);
                    });
                }
                return response;
            }).catch(function () {
                /* Offline: return cached or offline page */
                if (cached) return cached;
                if (e.request.destination === 'document') {
                    return caches.match('/index.html');
                }
                return new Response('Offline', { status: 503, statusText: 'Offline' });
            });

            return cached || fetchPromise;
        })
    );
});