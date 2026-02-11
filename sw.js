/* ============================================
   ⚡ SERVICE WORKER — KXON PWA v2
   Cache + Offline + Push ready
   ============================================ */

var CACHE_NAME = 'kxon-v2.0';

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
    '/css/dashboard-analytics.css',

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
    '/js/dashboard-favs-share.js',
    '/js/dashboard-analytics.js',
    '/js/dashboard-comments.js',
    '/js/dashboard-playlists.js',

    '/icons/icon-72.png',
    '/icons/icon-96.png',
    '/icons/icon-128.png',
    '/icons/icon-144.png',
    '/icons/icon-152.png',
    '/icons/icon-192.png',
    '/icons/icon-384.png',
    '/icons/icon-512.png'
];

/* ── INSTALL ── */
self.addEventListener('install', function (event) {
    console.log('[SW] Installing KXON v2.0');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function (cache) {
                return cache.addAll(STATIC_ASSETS).catch(function (err) {
                    console.warn('[SW] Some assets failed:', err);
                    /* Cachear lo que se pueda individualmente */
                    return Promise.allSettled(
                        STATIC_ASSETS.map(function (url) {
                            return cache.add(url).catch(function () {
                                console.warn('[SW] Failed to cache:', url);
                            });
                        })
                    );
                });
            })
            .then(function () {
                return self.skipWaiting();
            })
    );
});

/* ── ACTIVATE ── */
self.addEventListener('activate', function (event) {
    console.log('[SW] Activating KXON v2.0');
    event.waitUntil(
        caches.keys().then(function (names) {
            return Promise.all(
                names.filter(function (name) {
                    return name !== CACHE_NAME;
                }).map(function (name) {
                    console.log('[SW] Deleting old cache:', name);
                    return caches.delete(name);
                })
            );
        }).then(function () {
            return self.clients.claim();
        })
    );
});

/* ── FETCH ── */
self.addEventListener('fetch', function (event) {
    var request = event.request;
    var url = new URL(request.url);

    /* Skip: non-GET, Supabase API, extensions */
    if (request.method !== 'GET') return;
    if (url.hostname.indexOf('supabase') >= 0) return;
    if (url.protocol === 'chrome-extension:') return;

    /* Skip: Audio/Video (too large to cache) */
    if (url.pathname.match(/\.(mp3|wav|ogg|mp4|webm|mov)$/i)) return;

    /* Images from Supabase storage: Cache first */
    if (url.hostname.indexOf('supabase') >= 0 && url.pathname.indexOf('/storage/') >= 0) {
        event.respondWith(
            caches.match(request).then(function (cached) {
                if (cached) return cached;
                return fetch(request).then(function (response) {
                    if (response && response.status === 200) {
                        var clone = response.clone();
                        caches.open(CACHE_NAME).then(function (cache) {
                            cache.put(request, clone);
                        });
                    }
                    return response;
                }).catch(function () {
                    /* Placeholder SVG for failed images */
                    return new Response(
                        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="#111" width="200" height="200"/><text fill="#555" x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="40">♪</text></svg>',
                        { headers: { 'Content-Type': 'image/svg+xml' } }
                    );
                });
            })
        );
        return;
    }

    /* Everything else: Stale-while-revalidate */
    event.respondWith(
        caches.match(request).then(function (cached) {
            var fetchPromise = fetch(request).then(function (response) {
                if (response && response.status === 200 && response.type === 'basic') {
                    var clone = response.clone();
                    caches.open(CACHE_NAME).then(function (cache) {
                        cache.put(request, clone);
                    });
                }
                return response;
            }).catch(function () {
                if (cached) return cached;
                /* Offline fallback for navigation */
                if (request.mode === 'navigate') {
                    return caches.match('/dashboard.html').then(function (dash) {
                        return dash || caches.match('/index.html');
                    });
                }
                return new Response('Offline', { status: 503 });
            });

            return cached || fetchPromise;
        })
    );
});

/* ── PUSH NOTIFICATIONS ── */
self.addEventListener('push', function (event) {
    var data = {};
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data = {
                title: 'KXON',
                body: event.data.text(),
                icon: '/icons/icon-192.png'
            };
        }
    }

    event.waitUntil(
        self.registration.showNotification(data.title || 'KXON', {
            body: data.body || 'Nueva notificación',
            icon: data.icon || '/icons/icon-192.png',
            badge: '/icons/icon-72.png',
            vibrate: [100, 50, 100],
            data: { url: data.url || '/dashboard.html' },
            actions: [{ action: 'open', title: 'Abrir KXON' }]
        })
    );
});

/* ── NOTIFICATION CLICK ── */
self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    var url = (event.notification.data && event.notification.data.url) || '/dashboard.html';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(function (clientList) {
                for (var i = 0; i < clientList.length; i++) {
                    if ('focus' in clientList[i]) {
                        return clientList[i].focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow(url);
                }
            })
    );
});

/* ── BACKGROUND SYNC ── */
self.addEventListener('sync', function (event) {
    if (event.tag === 'sync-data') {
        console.log('[SW] Background sync');
    }
});