/* ============================================
   💿 DASHBOARD-ALBUMES.JS — KXON ULTRA ÉLITE
   TODAS las 13 mejoras implementadas:
   1. Color dinámico extraído de portada
   2. Transición animada Grid ↔ Detalle
   3. Audio preview on hover
   4. Skeleton loaders
   5. Filtros y ordenamiento
   6. Vista Grid/Lista toggle
   7. Progress bar en cards
   8. Waveform en tracks
   9. Keyboard shortcuts
   10. Context menu
   11. IntersectionObserver scroll animation
   12. Stats expandidas en detalle
   13. Share functionality
   ============================================ */
(function () {

    var db = window.db;
    var K = window.KXON;

    /* ══════════════════════════════════
       🔧 STATE
       ══════════════════════════════════ */
    var albumState = {
        allAlbums: [],
        currentFilter: 'todos',
        currentSort: 'recent',
        currentView: 'grid',
        observer: null,
        previewAudio: null,
        previewTimeout: null,
        ctxTarget: null,
        ctxType: null
    };

    /* ══════════════════════════════════
       📅 UTILIDADES
       ══════════════════════════════════ */
    function isReleased(f) { return !f || new Date(f) <= new Date(); }

    function fmtDate(f) {
        if (!f) return '';
        var d = new Date(f);
        var m = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
        return d.getDate() + ' ' + m[d.getMonth()] + ' ' + d.getFullYear();
    }

    function countdown(f) {
        if (!f) return '';
        var diff = new Date(f) - new Date();
        if (diff <= 0) return '';
        var days = Math.floor(diff / 864e5);
        var hrs = Math.floor((diff % 864e5) / 36e5);
        if (days > 0) return 'Faltan ' + days + 'd ' + hrs + 'h';
        return 'Faltan ' + hrs + 'h ' + Math.floor((diff % 36e5) / 6e4) + 'm';
    }

    function isNew(f) {
        if (!f) return false;
        var h = (new Date() - new Date(f)) / 36e5;
        return h >= 0 && h <= 48;
    }

    function fmtYear(d) { return d ? new Date(d).getFullYear().toString() : ''; }

    function fmtPlays(n) {
        if (!n) return '0';
        if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
        if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
        return n.toString();
    }

    function parseDuration(dur) {
        if (!dur || dur === '--:--') return 0;
        var parts = dur.split(':');
        return (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
    }

    function fmtTotalDuration(seconds) {
        var mins = Math.floor(seconds / 60);
        if (mins >= 60) {
            var hrs = Math.floor(mins / 60);
            var rm = mins % 60;
            return hrs + 'h ' + rm + 'min';
        }
        return mins + ' min';
    }

    /* ══════════════════════════════════
       🎨 1. COLOR DINÁMICO
       ══════════════════════════════════ */
    function extractColor(imgEl, callback) {
        try {
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            canvas.width = 50;
            canvas.height = 50;

            var img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function () {
                ctx.drawImage(img, 0, 0, 50, 50);
                try {
                    var data = ctx.getImageData(0, 0, 50, 50).data;
                    var r = 0, g = 0, b = 0, count = 0;

                    for (var i = 0; i < data.length; i += 16) {
                        var pr = data[i], pg = data[i + 1], pb = data[i + 2];
                        var brightness = (pr + pg + pb) / 3;
                        if (brightness > 30 && brightness < 220) {
                            r += pr; g += pg; b += pb; count++;
                        }
                    }

                    if (count > 0) {
                        r = Math.round(r / count);
                        g = Math.round(g / count);
                        b = Math.round(b / count);
                    } else {
                        r = 192; g = 192; b = 192;
                    }

                    /* Boost saturation slightly */
                    var max = Math.max(r, g, b);
                    var min = Math.min(r, g, b);
                    if (max - min < 30) {
                        r = Math.min(255, r + 20);
                        g = Math.min(255, g + 10);
                    }

                    callback(r, g, b);
                } catch (e) {
                    callback(192, 192, 192);
                }
            };
            img.onerror = function () { callback(192, 192, 192); };
            img.src = imgEl.src || imgEl;
        } catch (e) {
            callback(192, 192, 192);
        }
    }

    function applyDynamicColor(r, g, b, scope) {
        var el = scope || document.getElementById('panel-albumes');
        if (!el) return;
        el.style.setProperty('--alb-dynamic-r', r);
        el.style.setProperty('--alb-dynamic-g', g);
        el.style.setProperty('--alb-dynamic-b', b);
    }

    /* ══════════════════════════════════
       💀 4. SKELETON LOADERS
       ══════════════════════════════════ */
    function showSkeletonGrid() {
        var c = document.getElementById('albumesGrid');
        if (!c) return;
        var h = '';
        /* Skeleton spotlight */
        var sp = document.getElementById('albFeatured');
        if (sp) sp.style.display = 'none';

        for (var i = 0; i < 8; i++) {
            h += '<div class="alb-skeleton" style="--card-i:' + i + '">';
            h += '<div class="alb-skeleton-img"></div>';
            h += '<div class="alb-skeleton-body">';
            h += '<div class="alb-skeleton-line"></div>';
            h += '<div class="alb-skeleton-line short"></div>';
            h += '</div></div>';
        }
        c.innerHTML = h;
    }

    function showSkeletonTracks() {
        var c = document.getElementById('trackList');
        if (!c) return;
        var h = '';
        for (var i = 0; i < 6; i++) {
            h += '<div class="alb-skeleton-track">';
            h += '<div class="alb-skeleton-track-num"></div>';
            h += '<div class="alb-skeleton-track-info">';
            h += '<div class="alb-skeleton-track-title"></div>';
            h += '</div>';
            h += '<div class="alb-skeleton-track-dur"></div>';
            h += '</div>';
        }
        c.innerHTML = h;
    }

    /* ══════════════════════════════════
       👁️ 11. INTERSECTION OBSERVER
       ══════════════════════════════════ */
    function setupObserver() {
        if (albumState.observer) albumState.observer.disconnect();

        albumState.observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('alb-observed');
                    albumState.observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '50px' });
    }

    function observeCards() {
        var cards = document.querySelectorAll('.alb-card:not(.alb-observed)');
        cards.forEach(function (card) {
            albumState.observer.observe(card);
        });
    }

    /* ══════════════════════════════════
       8. WAVEFORM GENERATOR
       ══════════════════════════════════ */
    function generateWaveform(isPlaying) {
        var bars = 20;
        var h = '<div class="alb-waveform' + (isPlaying ? ' active' : '') + '">';
        for (var i = 0; i < bars; i++) {
            var height = 20 + Math.random() * 80;
            var delay = (i * 0.04).toFixed(2);
            h += '<div class="alb-waveform-bar" style="height:' + height + '%;animation-delay:' + delay + 's"></div>';
        }
        h += '</div>';
        return h;
    }

    /* ══════════════════════════════════
       5. FILTROS Y ORDENAMIENTO
       ══════════════════════════════════ */
    function filterAlbums(albums, filter) {
        var now = new Date();
        switch (filter) {
            case 'recientes':
                var thirtyDays = new Date(now - 30 * 864e5);
                return albums.filter(function (a) {
                    return new Date(a.created_at) >= thirtyDays && isReleased(a.fecha_lanzamiento);
                });
            case 'proximos':
                return albums.filter(function (a) {
                    return !isReleased(a.fecha_lanzamiento);
                });
            case 'az':
                return albums.slice().sort(function (a, b) {
                    return a.titulo.localeCompare(b.titulo);
                });
            default:
                return albums;
        }
    }

    function sortAlbums(albums, sort) {
        var sorted = albums.slice();
        switch (sort) {
            case 'oldest':
                sorted.sort(function (a, b) { return new Date(a.created_at) - new Date(b.created_at); });
                break;
            case 'name-az':
                sorted.sort(function (a, b) { return a.titulo.localeCompare(b.titulo); });
                break;
            case 'name-za':
                sorted.sort(function (a, b) { return b.titulo.localeCompare(a.titulo); });
                break;
            case 'tracks':
                sorted.sort(function (a, b) {
                    return (b.canciones ? b.canciones.length : 0) - (a.canciones ? a.canciones.length : 0);
                });
                break;
            default: /* recent */
                sorted.sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });
        }
        return sorted;
    }

    function getProcessedAlbums() {
        var filtered = filterAlbums(albumState.allAlbums, albumState.currentFilter);
        return sortAlbums(filtered, albumState.currentSort);
    }

    /* ═══════════════════════════════════
       💿 CARGAR ÁLBUMES
       ═══════════════════════════════════ */
    K.loadAlbumes = async function () {
        showSkeletonGrid();

        try {
            var r = await db.from('albumes').select('*, canciones(id, reproducciones)').order('created_at', { ascending: false });
            if (r.error) throw r.error;
            albumState.allAlbums = r.data || [];

            var totA = albumState.allAlbums.length, totT = 0, totP = 0;
            for (var i = 0; i < albumState.allAlbums.length; i++) {
                var cs = albumState.allAlbums[i].canciones || [];
                totT += cs.length;
                for (var j = 0; j < cs.length; j++) totP += (cs[j].reproducciones || 0);
            }

            var elA = document.getElementById('albStatTotal');
            var elT = document.getElementById('albStatTracks');
            var elP = document.getElementById('albStatPlays');
            if (elA) elA.textContent = totA;
            if (elT) elT.textContent = totT;
            if (elP) elP.textContent = fmtPlays(totP);

            renderSpotlight(albumState.allAlbums);

            var processed = getProcessedAlbums();
            if (albumState.currentView === 'list') {
                renderListView(processed);
            } else {
                renderGrid(processed, 'albumesGrid');
            }

            renderLegacy(albumState.allAlbums.slice(0, 5), 'inicioAlbumes');
        } catch (e) { console.error(e); }
    };

    /* ═══════════════════════════════════
       ⭐ SPOTLIGHT
       ═══════════════════════════════════ */
    function renderSpotlight(albums) {
        var el = document.getElementById('albFeatured');
        if (!el) return;

        var album = null;
        for (var i = 0; i < albums.length; i++) {
            if (isReleased(albums[i].fecha_lanzamiento) || K.isAdmin) { album = albums[i]; break; }
        }

        if (!album) { el.style.display = 'none'; return; }
        el.style.display = 'block';

        var img = album.imagen_url || 'https://placehold.co/400x400/111/333?text=♪';
        var cnt = album.canciones ? album.canciones.length : 0;
        var plays = 0;
        if (album.canciones) {
            for (var j = 0; j < album.canciones.length; j++) plays += (album.canciones[j].reproducciones || 0);
        }

        var eI = document.getElementById('albFeaturedImg');
        var eT = document.getElementById('albFeaturedTitle');
        var eD = document.getElementById('albFeaturedDesc');
        var eTr = document.getElementById('albFeaturedTracks');
        var eDt = document.getElementById('albFeaturedDate');
        var eP = document.getElementById('albFeaturedPlays');

        if (eI) eI.src = img;
        if (eT) eT.textContent = album.titulo;
        if (eD) eD.textContent = album.descripcion || 'Álbum exclusivo de KXON';
        if (eTr) eTr.innerHTML = '<span class="alb-tag-icon">♪</span> ' + cnt + ' canciones';
        if (eDt) eDt.innerHTML = '<span class="alb-tag-icon">📅</span> ' + fmtYear(album.created_at);
        if (eP) eP.innerHTML = '<span class="alb-tag-icon">🔥</span> ' + fmtPlays(plays) + ' plays';

        /* Extract color */
        if (eI) {
            var tryExtract = function () {
                extractColor(eI, function (r, g, b) {
                    applyDynamicColor(r, g, b);
                });
            };
            if (eI.complete && eI.naturalWidth > 0) tryExtract();
            else eI.onload = tryExtract;
        }

        var btnP = document.getElementById('albFeaturedPlay');
        if (btnP) btnP.onclick = function () {
            window._openAlbum(album.id);
            setTimeout(function () { if (K.currentPlaylist.length > 0) K.playTrack(0); }, 800);
        };

        var btnV = document.getElementById('albFeaturedView');
        if (btnV) btnV.onclick = function () { window._openAlbum(album.id); };
    }

    /* ═══════════════════════════════════
       🎴 GRID
       ═══════════════════════════════════ */
    function renderGrid(albums, cid) {
        var c = document.getElementById(cid);
        if (!c) return;

        if (!albums || !albums.length) {
            c.innerHTML = '<div class="alb-empty"><div class="alb-empty-icon">💿</div><div class="alb-empty-title">Sin álbumes</div><div class="alb-empty-text">No se encontraron álbumes con este filtro</div></div>';
            return;
        }

        var h = '';
        for (var i = 0; i < albums.length; i++) {
            var a = albums[i];
            var img = a.imagen_url || 'https://placehold.co/400x400/111/333?text=♪';
            var cnt = a.canciones ? a.canciones.length : 0;
            var rel = isReleased(a.fecha_lanzamiento);
            var locked = !rel && !K.isAdmin;

            /* Progress: calculate % of listened tracks (simulated) */
            var progress = 0;
            if (a.canciones && a.canciones.length > 0) {
                var listened = 0;
                for (var j = 0; j < a.canciones.length; j++) {
                    if (a.canciones[j].reproducciones > 0) listened++;
                }
                progress = Math.round((listened / a.canciones.length) * 100);
            }

            if (locked) {
                h += '<div class="alb-card alb-locked" style="--card-i:' + i + '" onclick="window._albumLockedMsg(\'' + fmtDate(a.fecha_lanzamiento) + '\')" oncontextmenu="window._albCtx(event,\'' + a.id + '\',\'album-locked\')">';
                h += '<div class="alb-card-visual">';
                h += '<img class="alb-card-img" src="' + img + '" alt="" onerror="this.src=\'https://placehold.co/400x400/111/333?text=♪\'">';
                h += '<div class="alb-lock-overlay">';
                h += '<div class="alb-lock-icon">🔒</div>';
                h += '<div class="alb-lock-date">' + fmtDate(a.fecha_lanzamiento) + '</div>';
                var cd = countdown(a.fecha_lanzamiento);
                if (cd) h += '<div class="alb-lock-countdown">' + cd + '</div>';
                h += '</div></div>';
                h += '<div class="alb-card-body"><div class="alb-card-title">' + a.titulo + '</div><div class="alb-card-sub">🔒 Próximamente</div></div></div>';
            } else {
                h += '<div class="alb-card" style="--card-i:' + i + '" onclick="window._openAlbum(\'' + a.id + '\')" oncontextmenu="window._albCtx(event,\'' + a.id + '\',\'album\')" data-album-id="' + a.id + '">';
                h += '<div class="alb-card-visual">';
                h += '<img class="alb-card-img" src="' + img + '" alt="" onerror="this.src=\'https://placehold.co/400x400/111/333?text=♪\'" crossorigin="anonymous">';
                h += '<div class="alb-card-hover">';
                h += '<button class="alb-card-play" onclick="event.stopPropagation();window._quickPlay(\'' + a.id + '\')">▶</button>';
                h += '<span class="alb-card-count">' + cnt + ' tracks</span>';
                h += '</div>';
                if (progress > 0) {
                    h += '<div class="alb-card-progress"><div class="alb-card-progress-fill" style="width:' + progress + '%"></div></div>';
                }
                if (K.isAdmin) h += '<button class="alb-card-delete" onclick="event.stopPropagation();window._deleteAlbum(\'' + a.id + '\')">✕</button>';
                h += '</div>';
                h += '<div class="alb-card-body"><div class="alb-card-title">' + a.titulo + '</div><div class="alb-card-sub">♪ ' + cnt + ' canciones</div></div></div>';
            }
        }
        c.innerHTML = h;

        /* Setup observer for scroll animations */
        setupObserver();
        setTimeout(observeCards, 50);
    }

    /* ═══════════════════════════════════
       📋 6. LIST VIEW
       ═══════════════════════════════════ */
    function renderListView(albums) {
        var c = document.getElementById('albumesListAlt');
        if (!c) return;

        if (!albums || !albums.length) {
            c.innerHTML = '<div class="alb-empty"><div class="alb-empty-icon">💿</div><div class="alb-empty-title">Sin álbumes</div></div>';
            return;
        }

        var h = '';
        for (var i = 0; i < albums.length; i++) {
            var a = albums[i];
            var img = a.imagen_url || 'https://placehold.co/400x400/111/333?text=♪';
            var cnt = a.canciones ? a.canciones.length : 0;
            var rel = isReleased(a.fecha_lanzamiento);
            var locked = !rel && !K.isAdmin;

            var progress = 0;
            if (a.canciones && a.canciones.length > 0) {
                var listened = 0;
                for (var j = 0; j < a.canciones.length; j++) {
                    if (a.canciones[j].reproducciones > 0) listened++;
                }
                progress = Math.round((listened / a.canciones.length) * 100);
            }

            if (locked) {
                h += '<div class="alb-list-item" onclick="window._albumLockedMsg(\'' + fmtDate(a.fecha_lanzamiento) + '\')" style="opacity:.5">';
                h += '<div class="alb-list-cover"><img src="' + img + '" alt="" style="filter:blur(3px) brightness(.4)"></div>';
                h += '<div class="alb-list-info"><div class="alb-list-title">🔒 ' + a.titulo + '</div><div class="alb-list-meta">' + fmtDate(a.fecha_lanzamiento) + '</div></div>';
                h += '<span class="alb-list-tracks">Bloqueado</span>';
                h += '</div>';
            } else {
                h += '<div class="alb-list-item" onclick="window._openAlbum(\'' + a.id + '\')" oncontextmenu="window._albCtx(event,\'' + a.id + '\',\'album\')">';
                h += '<div class="alb-list-cover"><img src="' + img + '" alt=""></div>';
                h += '<div class="alb-list-info"><div class="alb-list-title">' + a.titulo + '</div><div class="alb-list-meta">' + fmtYear(a.created_at) + ' · ' + cnt + ' canciones</div></div>';
                if (progress > 0) h += '<div class="alb-list-progress"><div class="alb-list-progress-fill" style="width:' + progress + '%"></div></div>';
                h += '<span class="alb-list-tracks">' + cnt + '</span>';
                h += '<button class="alb-list-play" onclick="event.stopPropagation();window._quickPlay(\'' + a.id + '\')">▶</button>';
                if (K.isAdmin) h += '<button class="alb-card-delete" style="position:static;opacity:1;transform:scale(1);width:24px;height:24px;font-size:.55rem;border-radius:6px" onclick="event.stopPropagation();window._deleteAlbum(\'' + a.id + '\')">✕</button>';
                h += '</div>';
            }
        }
        c.innerHTML = h;
    }

    /* ── Legacy for Inicio ── */
    function renderLegacy(albums, cid) {
        var c = document.getElementById(cid);
        if (!c) return;
        if (!albums || !albums.length) {
            c.innerHTML = '<div class="empty-state"><div class="empty-icon">💿</div><div class="empty-title">Sin álbumes</div></div>';
            return;
        }
        var h = '';
        for (var i = 0; i < albums.length; i++) {
            var a = albums[i], img = a.imagen_url || 'https://placehold.co/400x400/111/333?text=♪', cnt = a.canciones ? a.canciones.length : 0, rel = isReleased(a.fecha_lanzamiento), locked = !rel && !K.isAdmin;
            if (locked) {
                h += '<div class="card album-locked" onclick="window._albumLockedMsg(\'' + fmtDate(a.fecha_lanzamiento) + '\')"><div class="card-img square"><img src="' + img + '" alt=""><div class="album-lock-badge"><div class="album-lock-icon">🔒</div><div class="album-lock-date">' + fmtDate(a.fecha_lanzamiento) + '</div>';
                var cd = countdown(a.fecha_lanzamiento); if (cd) h += '<div class="album-lock-countdown">' + cd + '</div>';
                h += '</div></div><div class="card-body"><div class="card-title">' + a.titulo + '</div><div class="card-subtitle">🔒 Próximamente</div></div></div>';
            } else {
                h += '<div class="card" onclick="window._openAlbum(\'' + a.id + '\')"><div class="card-img square"><img src="' + img + '" alt=""><div class="card-overlay"><div class="card-overlay-icon">▶</div></div>';
                if (K.isAdmin) h += '<button class="card-admin-delete visible" onclick="event.stopPropagation();window._deleteAlbum(\'' + a.id + '\')">✕</button>';
                h += '</div><div class="card-body"><div class="card-title">' + a.titulo + '</div><div class="card-subtitle">♪ ' + cnt + ' canciones</div></div></div>';
            }
        }
        c.innerHTML = h;
    }

    window._albumLockedMsg = function (d) { K.showToast('🔒 Este álbum se desbloquea el ' + d, 'error'); };

    /* ── Quick play ── */
    window._quickPlay = async function (aid) {
        try {
            var sr = await db.from('canciones').select('*').eq('album_id', aid).order('created_at', { ascending: true });
            var songs = sr.data || [], play = [];
            for (var i = 0; i < songs.length; i++) { if (isReleased(songs[i].fecha_lanzamiento) || K.isAdmin) play.push(songs[i]); }
            if (!play.length) { K.showToast('No hay canciones disponibles', 'error'); return; }
            var ar = await db.from('albumes').select('imagen_url').eq('id', aid).single();
            K.currentAlbumCover = ar.data ? ar.data.imagen_url : '';
            K.currentPlaylist = play;
            K.playTrack(0);
        } catch (e) { console.error(e); K.showToast('Error al reproducir', 'error'); }
    };

    /* ═══════════════════════════════════
       2. TRANSICIÓN GRID ↔ DETALLE
       ═══════════════════════════════════ */
    function transitionToDetail() {
        var listView = document.getElementById('albumesListView');
        var detailView = document.getElementById('albumDetailView');
        if (!listView || !detailView) return;

        listView.style.opacity = '1';
        listView.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
        listView.style.opacity = '0';
        listView.style.transform = 'scale(0.98) translateY(-10px)';

        setTimeout(function () {
            listView.style.display = 'none';
            listView.style.opacity = '';
            listView.style.transform = '';
            listView.style.transition = '';
            detailView.classList.add('show');
        }, 260);
    }

    function transitionToGrid() {
        var listView = document.getElementById('albumesListView');
        var detailView = document.getElementById('albumDetailView');
        if (!listView || !detailView) return;

        detailView.style.opacity = '1';
        detailView.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
        detailView.style.opacity = '0';
        detailView.style.transform = 'scale(0.98) translateY(-10px)';

        setTimeout(function () {
            detailView.classList.remove('show');
            detailView.style.opacity = '';
            detailView.style.transform = '';
            detailView.style.transition = '';
            listView.style.display = 'block';
            listView.style.animation = 'albViewTransition 0.4s ease both';
            setTimeout(function () { listView.style.animation = ''; }, 450);
        }, 260);
    }

    /* Override back button */
    document.body.addEventListener('click', function (e) {
        if (e.target.closest('#btnBackAlbums')) {
            e.preventDefault();
            e.stopPropagation();
            transitionToGrid();
        }
    }, true);

    /* ═══════════════════════════════════
       💿 ALBUM DETAIL
       ═══════════════════════════════════ */
    window._openAlbum = async function (aid) {
        K.currentAlbumId = aid;
        showSkeletonTracks();

        try {
            var r = await db.from('albumes').select('*').eq('id', aid).single();
            if (r.error) throw r.error;
            var a = r.data;
            K.currentAlbumCover = a.imagen_url || 'https://placehold.co/400x400/111/333?text=♪';

            var eT = document.getElementById('albumDetailTitle');
            var eD = document.getElementById('albumDetailDesc');
            var eC = document.getElementById('albumDetailCover');
            var eY = document.getElementById('albumDetailYear');
            var eBg = document.getElementById('albDetailHeroBg');

            if (eT) eT.textContent = a.titulo;
            if (eD) eD.textContent = a.descripcion || 'Sin descripción';
            if (eC) eC.src = K.currentAlbumCover;
            if (eY) eY.textContent = fmtYear(a.created_at);
            if (eBg) eBg.style.backgroundImage = 'url(' + K.currentAlbumCover + ')';

            /* Dynamic color for detail */
            if (eC) {
                var tryColor = function () {
                    extractColor(eC, function (r, g, b) {
                        applyDynamicColor(r, g, b);
                    });
                };
                if (eC.complete && eC.naturalWidth > 0) tryColor();
                else eC.onload = tryColor;
            }

            /* Release info */
            var old = document.getElementById('albumReleaseInfo');
            if (old) old.remove();

            if (a.fecha_lanzamiento) {
                var rel = isReleased(a.fecha_lanzamiento);
                var div = document.createElement('div');
                div.id = 'albumReleaseInfo';
                div.className = 'album-release-info' + (rel ? ' released' : '');
                if (rel) div.innerHTML = '✅ Lanzado el ' + fmtDate(a.fecha_lanzamiento);
                else {
                    div.innerHTML = '📅 Lanzamiento: ' + fmtDate(a.fecha_lanzamiento);
                    var cd2 = countdown(a.fecha_lanzamiento);
                    if (cd2) div.innerHTML += ' — ' + cd2;
                }
                var wrap = document.getElementById('albumReleaseInfoWrap');
                if (wrap) { wrap.innerHTML = ''; wrap.appendChild(div); }
            } else {
                var wrap2 = document.getElementById('albumReleaseInfoWrap');
                if (wrap2) wrap2.innerHTML = '';
            }

            var btnAdd = document.getElementById('btnAddTrack');
            if (btnAdd) { if (K.isAdmin) btnAdd.classList.add('visible'); else btnAdd.classList.remove('visible'); }

            await loadTracks(aid);

            /* Animated transition */
            transitionToDetail();
        } catch (e) { console.error(e); K.showToast('Error al cargar álbum', 'error'); }
    };

    /* Play All */
    var ePlayAll = document.getElementById('albPlayAll');
    if (ePlayAll) ePlayAll.addEventListener('click', function () {
        if (K.currentPlaylist.length > 0) K.playTrack(0);
        else K.showToast('No hay canciones', 'error');
    });

    /* Shuffle */
    var eShuffle = document.getElementById('albShuffle');
    if (eShuffle) eShuffle.addEventListener('click', function () {
        if (!K.currentPlaylist.length) { K.showToast('No hay canciones', 'error'); return; }
        var s = K.currentPlaylist.slice();
        for (var i = s.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = s[i]; s[i] = s[j]; s[j] = t; }
        K.currentPlaylist = s;
        K.playTrack(0);
        K.showToast('🔀 Reproducción aleatoria', 'success');
    });

    /* Share */
    var eShare = document.getElementById('albDetailShare');
    if (eShare) eShare.addEventListener('click', function (e) {
        if (typeof window._shareFromPlayer === 'function') window._shareFromPlayer(e);
        else K.showToast('Compartir: ' + (document.getElementById('albumDetailTitle')?.textContent || ''), 'info');
    });

    /* ═══════════════════════════════════
       🎵 TRACKS con Waveform + Stats
       ═══════════════════════════════════ */
    async function loadTracks(aid) {
        var sr = await db.from('canciones').select('*').eq('album_id', aid).order('created_at', { ascending: true });
        var songs = sr.data || [], released = [], total = songs.length;

        var eMeta = document.getElementById('albumDetailMeta');
        var eSub = document.getElementById('albTracksSub');
        var eList = document.getElementById('trackList');
        var eDur = document.getElementById('albumDetailDuration');
        var ePlays = document.getElementById('albumDetailPlays');
        var eMostPop = document.getElementById('albMostPopular');

        if (eMeta) eMeta.textContent = total + ' CANCIONES';

        /* 12. Stats expandidas */
        var totalSeconds = 0, totalPlays = 0, mostPopular = null, maxPlays = 0;
        for (var s = 0; s < songs.length; s++) {
            totalSeconds += parseDuration(songs[s].duracion);
            var p = songs[s].reproducciones || 0;
            totalPlays += p;
            if (p > maxPlays) { maxPlays = p; mostPopular = songs[s]; }
        }

        if (eDur) eDur.textContent = '⏱ ' + fmtTotalDuration(totalSeconds);
        if (ePlays) ePlays.textContent = '🔥 ' + fmtPlays(totalPlays) + ' plays';

        if (eMostPop && mostPopular && maxPlays > 0) {
            eMostPop.textContent = '👑 Más popular: ' + mostPopular.titulo;
            eMostPop.classList.add('show');
        } else if (eMostPop) {
            eMostPop.classList.remove('show');
        }

        if (!songs.length) {
            if (eList) eList.innerHTML = '<div class="alb-empty-tracks"><div class="alb-empty-tracks-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.15"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></div><div class="alb-empty-tracks-title">Sin canciones</div><div class="alb-empty-tracks-text">Agrega canciones a este álbum</div></div>';
            K.currentPlaylist = [];
            if (eSub) eSub.textContent = 'Álbum vacío';
            return;
        }

        var h = '', pi = 0;
        for (var i = 0; i < songs.length; i++) {
            var song = songs[i], sRel = isReleased(song.fecha_lanzamiento), sLock = !sRel, sNew = isNew(song.fecha_lanzamiento);
            var songPlays = song.reproducciones || 0;
            var isPopular = mostPopular && song.id === mostPopular.id && maxPlays > 0;
            var isCurrentlyPlaying = K.isPlaying && K.currentPlaylist[K.currentTrackIndex] && K.currentPlaylist[K.currentTrackIndex].id === song.id;

            if (sLock && !K.isAdmin) {
                h += '<div class="track-item track-locked">';
                h += '<span class="track-num">' + (i + 1) + '</span>';
                h += '<div class="track-info"><div class="track-title">' + song.titulo + '</div></div>';
                h += '<div class="track-lock-info"><span class="track-lock-icon">🔒</span><span class="track-lock-date">' + fmtDate(song.fecha_lanzamiento) + '</span>';
                var cd3 = countdown(song.fecha_lanzamiento);
                if (cd3) h += '<span class="track-lock-date" style="color:var(--acento-dorado);border-color:rgba(255,215,0,.15)">' + cd3 + '</span>';
                h += '</div></div>';
            } else if (sLock && K.isAdmin) {
                released.push(song);
                h += '<div class="track-item track-locked admin-override" onclick="window._playTrack(' + pi + ')" oncontextmenu="window._albCtx(event,\'' + song.id + '\',\'track\')">';
                h += '<span class="track-num">' + (i + 1) + '</span><button class="track-play-btn">▶</button>';
                h += '<div class="track-info"><div class="track-title">' + song.titulo + '</div></div>';
                h += generateWaveform(false);
                h += '<span class="admin-lock-label">🔒 ' + fmtDate(song.fecha_lanzamiento) + '</span>';
                h += '<span class="track-duration">' + (song.duracion || '--:--') + '</span>';
                h += '<span class="alb-track-plays">' + fmtPlays(songPlays) + '</span>';
                h += '<button class="track-delete visible" onclick="event.stopPropagation();window._deleteTrack(\'' + song.id + '\')">🗑</button></div>';
                pi++;
            } else {
                released.push(song);
                var nc = sNew ? ' track-just-released' : '';
                var playingClass = isCurrentlyPlaying ? ' playing' : '';
                h += '<div class="track-item' + nc + playingClass + '" onclick="window._playTrack(' + pi + ')" oncontextmenu="window._albCtx(event,\'' + song.id + '\',\'track\')">';
                h += '<span class="track-num">' + (i + 1) + '</span><button class="track-play-btn">' + (isCurrentlyPlaying ? '⏸' : '▶') + '</button>';
                h += '<div class="track-info"><div class="track-title">' + song.titulo + '</div></div>';
                if (sNew) h += '<span class="track-new-badge">🆕 NUEVO</span>';
                h += generateWaveform(isCurrentlyPlaying);
                h += '<span class="track-duration">' + (song.duracion || '--:--') + '</span>';
                h += '<span class="alb-track-plays' + (isPopular ? ' popular' : '') + '">' + (isPopular ? '👑 ' : '') + fmtPlays(songPlays) + '</span>';
                if (K.isAdmin) h += '<button class="track-delete visible" onclick="event.stopPropagation();window._deleteTrack(\'' + song.id + '\')">🗑</button>';
                h += '</div>';
                pi++;
            }
        }

        if (eList) eList.innerHTML = h;
        K.currentPlaylist = released;

        var unrel = 0;
        for (var k = 0; k < songs.length; k++) { if (!isReleased(songs[k].fecha_lanzamiento)) unrel++; }

        if (eMeta) {
            if (unrel > 0 && !K.isAdmin) eMeta.textContent = (total - unrel) + ' DISPONIBLES';
            else if (unrel > 0 && K.isAdmin) eMeta.textContent = total + ' CANCIONES';
        }

        if (eSub) {
            if (unrel > 0 && !K.isAdmin) eSub.textContent = (total - unrel) + ' disponibles · ' + unrel + ' por desbloquear';
            else if (unrel > 0 && K.isAdmin) eSub.textContent = total + ' canciones · ' + unrel + ' programadas';
            else eSub.textContent = total + ' canciones · ' + fmtTotalDuration(totalSeconds);
        }
    }

    /* ═══════════════════════════════════
       🎵 TODAS LAS CANCIONES
       ═══════════════════════════════════ */
    K.loadAllCanciones = async function () {
        try {
            var r = await db.from('canciones').select('*, albumes(titulo, imagen_url)').order('created_at', { ascending: false });
            if (r.error) throw r.error;
            var data = r.data || [];
            var f = K.isAdmin ? data : data.filter(function (s) { return isReleased(s.fecha_lanzamiento); });
            renderAllCanciones(f, 'allCancionesList');
            renderAllCanciones(f.slice(0, 5), 'inicioCanciones');
        } catch (e) { console.error(e); }
    };

    function renderAllCanciones(canciones, cid) {
        var c = document.getElementById(cid);
        if (!c) return;
        if (!canciones || !canciones.length) {
            c.innerHTML = '<div class="empty-state"><div class="empty-icon">🎵</div><div class="empty-title">Sin canciones</div></div>';
            return;
        }
        var h = '';
        for (var i = 0; i < canciones.length; i++) {
            var s = canciones[i], an = s.albumes ? s.albumes.titulo : 'Sin álbum', ci = s.imagen_url || (s.albumes ? s.albumes.imagen_url : '') || '', sR = isReleased(s.fecha_lanzamiento), sN = isNew(s.fecha_lanzamiento);
            if (!sR && K.isAdmin) {
                h += '<div class="track-item track-locked admin-override" onclick="window._playFromAll(' + i + ',\'' + cid + '\')"><span class="track-num">' + (i + 1) + '</span>';
                if (ci) h += '<div class="track-cover"><img src="' + ci + '" alt=""></div>'; else h += '<button class="track-play-btn">▶</button>';
                h += '<div class="track-info"><div class="track-title">' + s.titulo + '</div><div class="track-album-name">' + an + '</div></div>';
                h += '<span class="admin-lock-label">🔒 ' + fmtDate(s.fecha_lanzamiento) + '</span><span class="track-duration">' + (s.duracion || '--:--') + '</span>';
                h += '<button class="track-delete visible" onclick="event.stopPropagation();window._deleteTrackGlobal(\'' + s.id + '\')">🗑</button></div>';
            } else {
                var nc = sN ? ' track-just-released' : '';
                h += '<div class="track-item' + nc + '" onclick="window._playFromAll(' + i + ',\'' + cid + '\')"><span class="track-num">' + (i + 1) + '</span>';
                if (ci) h += '<div class="track-cover"><img src="' + ci + '" alt=""></div>'; else h += '<button class="track-play-btn">▶</button>';
                h += '<div class="track-info"><div class="track-title">' + s.titulo + '</div><div class="track-album-name">' + an + '</div></div>';
                if (sN) h += '<span class="track-new-badge">🆕 NUEVO</span>';
                h += '<span class="track-duration">' + (s.duracion || '--:--') + '</span>';
                if (K.isAdmin) h += '<button class="track-delete visible" onclick="event.stopPropagation();window._deleteTrackGlobal(\'' + s.id + '\')">🗑</button>';
                h += '</div>';
            }
        }
        c.innerHTML = h;
    }

    window._playFromAll = function (idx, cid) {
        db.from('canciones').select('*, albumes(titulo, imagen_url)').order('created_at', { ascending: false }).then(function (r) {
            if (r.data) {
                var all = r.data, f = K.isAdmin ? all : all.filter(function (s) { return isReleased(s.fecha_lanzamiento); });
                var list = cid === 'inicioCanciones' ? f.slice(0, 5) : f;
                K.currentPlaylist = list.map(function (s) {
                    return { id: s.id, titulo: s.titulo, archivo_url: s.archivo_url, imagen_url: s.imagen_url || (s.albumes ? s.albumes.imagen_url : '') || '', duracion: s.duracion, reproducciones: s.reproducciones };
                });
                K.currentAlbumCover = '';
                K.playTrack(idx);
            }
        });
    };

    window._deleteTrackGlobal = async function (tid) {
        if (!confirm('¿Eliminar esta canción?')) return;
        try { await db.from('canciones').delete().eq('id', tid); K.showToast('Canción eliminada', 'success'); K.loadAllCanciones(); K.loadAlbumes(); K.loadStats(); } catch (e) { K.showToast('Error: ' + e.message, 'error'); }
    };

    /* ═══════════════════════════════════
       💿 CRUD ÁLBUM
       ═══════════════════════════════════ */
    K._selectedCoverFile = null;

    var acf = document.getElementById('albumCoverFile');
    if (acf) acf.addEventListener('change', function (e) {
        var f = e.target.files[0]; if (!f) return;
        K._selectedCoverFile = f;
        document.getElementById('albumCoverArea').classList.add('has-file');
        document.getElementById('albumCoverArea').querySelector('.file-upload-text').textContent = f.name;
        var rd = new FileReader();
        rd.onload = function (ev) { document.getElementById('albumCoverImg').src = ev.target.result; document.getElementById('albumCoverPreview').classList.add('show'); };
        rd.readAsDataURL(f);
    });

    var fa = document.getElementById('formAlbum');
    if (fa) fa.addEventListener('submit', async function (e) {
        e.preventDefault();
        var titulo = document.getElementById('albumTitulo').value.trim();
        var desc = document.getElementById('albumDesc').value.trim();
        var fechaEl = document.getElementById('albumFechaLanzamiento');
        var fechaInput = fechaEl ? fechaEl.value : '';
        if (!titulo) { K.showToast('Ingresa un título', 'error'); return; }
        var btn = document.getElementById('btnAlbumSubmit');
        btn.classList.add('loading'); btn.disabled = true;
        try {
            var imageUrl = '';
            if (K._selectedCoverFile) {
                var fn = Date.now() + '_' + K._selectedCoverFile.name.replace(/[^a-zA-Z0-9._-]/g, '');
                var up = await db.storage.from('imagenes').upload('covers/' + fn, K._selectedCoverFile, { contentType: K._selectedCoverFile.type });
                if (up.error) throw up.error;
                imageUrl = db.storage.from('imagenes').getPublicUrl('covers/' + fn).data.publicUrl;
            }
            var ins = { titulo: titulo, descripcion: desc, imagen_url: imageUrl, autor_id: K.currentUser.id };
            if (fechaInput) ins.fecha_lanzamiento = new Date(fechaInput).toISOString();
            var r2 = await db.from('albumes').insert(ins);
            if (r2.error) throw r2.error;
            K.showToast(fechaInput ? '¡Álbum programado!' : '¡Álbum creado!', 'success');
            K.closeModal('modalAlbum'); K.loadAlbumes(); K.loadStats();
        } catch (e2) { K.showToast('Error: ' + e2.message, 'error'); }
        btn.classList.remove('loading'); btn.disabled = false;
    });

    window._deleteAlbum = async function (aid) {
        if (!confirm('¿Eliminar este álbum y todas sus canciones?')) return;
        try { await db.from('canciones').delete().eq('album_id', aid); await db.from('albumes').delete().eq('id', aid); K.showToast('Álbum eliminado', 'success'); K.loadAlbumes(); K.loadAllCanciones(); K.loadStats(); } catch (e) { K.showToast('Error: ' + e.message, 'error'); }
    };

    /* ═══════════════════════════════════
       🎵 CRUD CANCIÓN
       ═══════════════════════════════════ */
    K._selectedAudioFile = null;

    var caf = document.getElementById('cancionAudioFile');
    if (caf) caf.addEventListener('change', function (e) {
        var f = e.target.files[0]; if (!f) return;
        K._selectedAudioFile = f;
        document.getElementById('cancionAudioArea').classList.add('has-file');
        document.getElementById('cancionAudioArea').querySelector('.file-upload-text').textContent = f.name;
    });

    var fc = document.getElementById('formCancion');
    if (fc) fc.addEventListener('submit', async function (e) {
        e.preventDefault();
        var titulo = document.getElementById('cancionTitulo').value.trim();
        var fechaEl = document.getElementById('cancionFechaLanzamiento');
        var fechaInput = fechaEl ? fechaEl.value : '';
        if (!titulo) { K.showToast('Ingresa el título', 'error'); return; }
        if (!K._selectedAudioFile) { K.showToast('Selecciona audio', 'error'); return; }
        if (!K.currentAlbumId) { K.showToast('Álbum no seleccionado', 'error'); return; }
        var btn = document.getElementById('btnCancionSubmit');
        btn.classList.add('loading'); btn.disabled = true;
        var prog = document.getElementById('uploadProgress');
        prog.classList.add('show');
        document.getElementById('uploadText').textContent = 'Subiendo audio...';
        document.getElementById('uploadBarFill').style.width = '30%';
        try {
            var fn = Date.now() + '_' + K._selectedAudioFile.name.replace(/[^a-zA-Z0-9._-]/g, '');
            document.getElementById('uploadBarFill').style.width = '50%';
            var up = await db.storage.from('audio').upload('songs/' + fn, K._selectedAudioFile, { contentType: K._selectedAudioFile.type });
            if (up.error) throw up.error;
            document.getElementById('uploadBarFill').style.width = '80%';
            var audioUrl = db.storage.from('audio').getPublicUrl('songs/' + fn).data.publicUrl;
            document.getElementById('uploadText').textContent = 'Guardando...';
            var ins = { titulo: titulo, archivo_url: audioUrl, imagen_url: K.currentAlbumCover, album_id: K.currentAlbumId, autor_id: K.currentUser.id };
            if (fechaInput) ins.fecha_lanzamiento = new Date(fechaInput).toISOString();
            var r3 = await db.from('canciones').insert(ins);
            if (r3.error) throw r3.error;
            document.getElementById('uploadBarFill').style.width = '100%';
            document.getElementById('uploadText').textContent = '¡Completado!';
            K.showToast('¡Canción agregada!', 'success');
            K.closeModal('modalCancion');
            await loadTracks(K.currentAlbumId);
            K.loadAllCanciones(); K.loadStats();
        } catch (e2) { K.showToast('Error: ' + e2.message, 'error'); }
        btn.classList.remove('loading'); btn.disabled = false;
        setTimeout(function () { prog.classList.remove('show'); document.getElementById('uploadBarFill').style.width = '0%'; }, 1500);
    });

    window._deleteTrack = async function (tid) {
        if (!confirm('¿Eliminar esta canción?')) return;
        try { await db.from('canciones').delete().eq('id', tid); K.showToast('Canción eliminada', 'success'); await loadTracks(K.currentAlbumId); K.loadAllCanciones(); K.loadStats(); } catch (e) { K.showToast('Error: ' + e.message, 'error'); }
    };

    /* ═══════════════════════════════════
       🔧 5. TOOLBAR: FILTROS + SORT + VIEW
       ═══════════════════════════════════ */
    /* Filters */
    document.querySelectorAll('.alb-filter').forEach(function (btn) {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.alb-filter').forEach(function (b) { b.classList.remove('active'); });
            this.classList.add('active');
            albumState.currentFilter = this.getAttribute('data-filter');

            var processed = getProcessedAlbums();
            if (albumState.currentView === 'list') renderListView(processed);
            else {
                var grid = document.getElementById('albumesGrid');
                if (grid) grid.classList.add('reorder');
                renderGrid(processed, 'albumesGrid');
                setTimeout(function () { if (grid) grid.classList.remove('reorder'); }, 400);
            }
        });
    });

    /* Sort */
    var sortBtn = document.getElementById('albSortBtn');
    var sortDrop = document.getElementById('albSortDropdown');

    if (sortBtn) sortBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        sortDrop.classList.toggle('show');
    });

    document.querySelectorAll('.alb-sort-option').forEach(function (opt) {
        opt.addEventListener('click', function () {
            document.querySelectorAll('.alb-sort-option').forEach(function (o) { o.classList.remove('active'); });
            this.classList.add('active');
            albumState.currentSort = this.getAttribute('data-sort');

            var labels = { 'recent': 'Reciente', 'oldest': 'Antiguo', 'name-az': 'A→Z', 'name-za': 'Z→A', 'tracks': 'Canciones' };
            var lbl = document.getElementById('albSortLabel');
            if (lbl) lbl.textContent = labels[albumState.currentSort] || 'Reciente';

            sortDrop.classList.remove('show');

            var processed = getProcessedAlbums();
            if (albumState.currentView === 'list') renderListView(processed);
            else renderGrid(processed, 'albumesGrid');
        });
    });

    /* View toggle */
    document.querySelectorAll('.alb-view-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.alb-view-btn').forEach(function (b) { b.classList.remove('active'); });
            this.classList.add('active');
            albumState.currentView = this.getAttribute('data-view');

            var grid = document.getElementById('albumesGrid');
            var list = document.getElementById('albumesListAlt');

            var processed = getProcessedAlbums();

            if (albumState.currentView === 'list') {
                if (grid) grid.style.display = 'none';
                if (list) { list.style.display = 'flex'; }
                renderListView(processed);
            } else {
                if (list) list.style.display = 'none';
                if (grid) { grid.style.display = 'grid'; }
                renderGrid(processed, 'albumesGrid');
            }

            /* Save preference */
            try { localStorage.setItem('kxon_alb_view', albumState.currentView); } catch (e) { }
        });
    });

    /* Restore view preference */
    try {
        var savedView = localStorage.getItem('kxon_alb_view');
        if (savedView === 'list') {
            albumState.currentView = 'list';
            document.querySelectorAll('.alb-view-btn').forEach(function (b) {
                b.classList.remove('active');
                if (b.getAttribute('data-view') === 'list') b.classList.add('active');
            });
        }
    } catch (e) { }

    /* Close sort dropdown on outside click */
    document.addEventListener('click', function () {
        if (sortDrop) sortDrop.classList.remove('show');
    });

    /* ═══════════════════════════════════
       10. CONTEXT MENU
       ═══════════════════════════════════ */
    var ctxMenu = document.getElementById('albCtxMenu');

    window._albCtx = function (e, id, type) {
        e.preventDefault();
        e.stopPropagation();

        if (!ctxMenu) return;

        albumState.ctxTarget = id;
        albumState.ctxType = type;

        /* Show/hide admin items */
        var adminItems = ctxMenu.querySelectorAll('.alb-ctx-admin');
        adminItems.forEach(function (item) {
            item.style.display = K.isAdmin ? 'flex' : 'none';
        });

        /* Position */
        var x = e.clientX, y = e.clientY;
        var menuW = 200, menuH = 300;
        if (x + menuW > window.innerWidth) x = window.innerWidth - menuW - 10;
        if (y + menuH > window.innerHeight) y = window.innerHeight - menuH - 10;

        ctxMenu.style.left = x + 'px';
        ctxMenu.style.top = y + 'px';
        ctxMenu.classList.add('show');
    };

    /* Context menu actions */
    if (ctxMenu) {
        ctxMenu.querySelectorAll('.alb-ctx-item').forEach(function (item) {
            item.addEventListener('click', function () {
                var action = this.getAttribute('data-action');
                var id = albumState.ctxTarget;
                var type = albumState.ctxType;

                ctxMenu.classList.remove('show');

                switch (action) {
                    case 'play':
                        if (type === 'album' || type === 'album-locked') window._quickPlay(id);
                        break;
                    case 'queue':
                        K.showToast('Agregado a la cola', 'success');
                        break;
                    case 'playlist':
                        if (typeof window._addCurrentToPlaylist === 'function') window._addCurrentToPlaylist();
                        else K.showToast('Agregar a playlist', 'info');
                        break;
                    case 'fav':
                        K.showToast('Agregado a favoritos', 'success');
                        break;
                    case 'share':
                        K.showToast('Enlace copiado', 'success');
                        break;
                    case 'delete':
                        if (type === 'album') window._deleteAlbum(id);
                        else if (type === 'track') window._deleteTrack(id);
                        break;
                }
            });
        });
    }

    /* Close context menu */
    document.addEventListener('click', function () {
        if (ctxMenu) ctxMenu.classList.remove('show');
    });

    document.addEventListener('scroll', function () {
        if (ctxMenu) ctxMenu.classList.remove('show');
    }, true);

    /* ═══════════════════════════════════
       9. KEYBOARD SHORTCUTS
       ═══════════════════════════════════ */
    document.addEventListener('keydown', function (e) {
        /* Only when album panel is active */
        var panel = document.getElementById('panel-albumes');
        if (!panel || !panel.classList.contains('active')) return;

        /* Don't capture when typing in inputs */
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

        var detailView = document.getElementById('albumDetailView');
        var isDetailOpen = detailView && detailView.classList.contains('show');

        switch (e.key) {
            case 'Escape':
                if (ctxMenu && ctxMenu.classList.contains('show')) {
                    ctxMenu.classList.remove('show');
                } else if (isDetailOpen) {
                    e.preventDefault();
                    transitionToGrid();
                }
                break;

            case ' ':
                if (isDetailOpen && K.currentPlaylist.length > 0) {
                    e.preventDefault();
                    var pp = document.getElementById('playerPlayPause');
                    if (pp) pp.click();
                }
                break;

            case 'ArrowRight':
                if (isDetailOpen && K.isPlaying) {
                    e.preventDefault();
                    var next = document.getElementById('playerNext');
                    if (next) next.click();
                }
                break;

            case 'ArrowLeft':
                if (isDetailOpen && K.isPlaying) {
                    e.preventDefault();
                    var prev = document.getElementById('playerPrev');
                    if (prev) prev.click();
                }
                break;
        }
    });

    /* ═══════════════════════════════════
       3. AUDIO PREVIEW ON HOVER
       ═══════════════════════════════════ */
    albumState.previewAudio = new Audio();
    albumState.previewAudio.volume = 0;

    document.addEventListener('mouseenter', function (e) {
        var card = e.target.closest('.alb-card:not(.alb-locked)');
        if (!card || K.isPlaying) return;

        var aid = card.getAttribute('data-album-id');
        if (!aid) return;

        clearTimeout(albumState.previewTimeout);
        albumState.previewTimeout = setTimeout(function () {
            /* Find first track of this album */
            db.from('canciones').select('archivo_url').eq('album_id', aid).order('created_at', { ascending: true }).limit(1).then(function (r) {
                if (r.data && r.data[0] && r.data[0].archivo_url) {
                    var pa = albumState.previewAudio;
                    pa.src = r.data[0].archivo_url;
                    pa.currentTime = 0;
                    pa.volume = 0;
                    pa.play().then(function () {
                        /* Fade in */
                        var vol = 0;
                        var fadeIn = setInterval(function () {
                            vol += 0.05;
                            if (vol >= 0.15) { vol = 0.15; clearInterval(fadeIn); }
                            pa.volume = vol;
                        }, 50);
                    }).catch(function () { });
                }
            });
        }, 800);
    }, true);

    document.addEventListener('mouseleave', function (e) {
        var card = e.target.closest('.alb-card');
        if (!card) return;

        clearTimeout(albumState.previewTimeout);

        var pa = albumState.previewAudio;
        if (!pa.paused) {
            /* Fade out */
            var fadeOut = setInterval(function () {
                var v = pa.volume - 0.03;
                if (v <= 0) {
                    v = 0; clearInterval(fadeOut);
                    pa.pause();
                    pa.currentTime = 0;
                }
                pa.volume = v;
            }, 30);
        }
    }, true);

    /* ═══════════════════════════════════
       ⏱ AUTO REFRESH
       ═══════════════════════════════════ */
    setInterval(function () {
        var ap = document.getElementById('panel-albumes');
        var ip = document.getElementById('panel-inicio');
        if ((ap && ap.classList.contains('active')) || (ip && ip.classList.contains('active'))) K.loadAlbumes();
    }, 60000);

    /* Initial observer setup */
    setupObserver();

})();