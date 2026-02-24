/* ============================================
   ❤️ DASHBOARD-FAVS-SHARE.JS — KXON
   Favoritos / Likes + Compartir en Redes
   FIX: Columnas separadas cancion, album, beat
   REDESIGN 2026: Panel Favoritos con filtros,
   búsqueda, ordenamiento, vistas grid/list
   ============================================ */
(function () {

    var db = window.db;
    var K = window.KXON;

    /* ══════════════════════════════════════════
       📌 MAPA DE COLUMNAS DE LA TABLA FAVORITOS
       La tabla tiene columnas separadas:
       cancion, album, beat (en vez de item_id)
       ══════════════════════════════════════════ */
    var columnMap = {
        'cancion': 'cancion_id',
        'album': 'album_id',
        'beat': 'beat_id',
        'video': 'cancion_id',
        'documental': 'cancion_id',
        'noticia': 'cancion_id'
    };

    function getColumn(tipo) {
        return columnMap[tipo] || 'cancion';
    }

    /* ══════════════════════════════════════════
       📌 CACHE LOCAL DE FAVORITOS
       ══════════════════════════════════════════ */
    var userFavs = {};   // "tipo_itemId" → true
    var favCounts = {};  // "tipo_itemId" → number

    /* ══════════════════════════════════════════
       📥 CARGAR FAVORITOS DEL USUARIO
       ══════════════════════════════════════════ */
    K.loadUserFavorites = async function () {
        if (!K.currentUser) return;
        try {
            var r = await db.from('favoritos')
                .select('tipo, cancion_id, album_id, beat_id')
                .eq('usuario_id', K.currentUser.id);
            if (r.error) throw r.error;
            userFavs = {};
            var data = r.data || [];
            for (var i = 0; i < data.length; i++) {
                var row = data[i];
                var tipo = row.tipo;
                var col = getColumn(tipo);
                var itemId = row[col];
                if (itemId) {
                    userFavs[tipo + '_' + itemId] = true;
                }
            }
        } catch (e) { console.error('Error cargando favoritos:', e); }
    };

    /* ══════════════════════════════════════════
       🔢 CARGAR CONTEOS DE LIKES
       ══════════════════════════════════════════ */
    async function loadFavCountsForType(tipo, ids) {
        if (!ids || !ids.length) return;
        var col = getColumn(tipo);
        try {
            var r = await db.from('favoritos')
                .select(col)
                .eq('tipo', tipo)
                .in(col, ids);
            if (r.error) throw r.error;
            var data = r.data || [];
            for (var i = 0; i < data.length; i++) {
                var itemId = data[i][col];
                if (itemId) {
                    var key = tipo + '_' + itemId;
                    favCounts[key] = (favCounts[key] || 0) + 1;
                }
            }
        } catch (e) { console.error('Error contando favs:', e); }
    }

    /* ══════════════════════════════════════════
       ❤️ TOGGLE FAVORITO (FIX COMPLETO)
       ══════════════════════════════════════════ */
    async function toggleFavorite(tipo, itemId, btnEl) {
        if (!K.currentUser) { K.showToast('Inicia sesión para dar like', 'error'); return; }

        // Validar que itemId no esté vacío
        if (!itemId || itemId === 'undefined' || itemId === 'null' || itemId === '') {
            console.warn('toggleFavorite: itemId inválido:', itemId);
            K.showToast('No se pudo identificar el elemento', 'error');
            return;
        }

        var key = tipo + '_' + itemId;
        var col = getColumn(tipo);
        var isLiked = userFavs[key];

        // Optimistic UI
        if (isLiked) {
            delete userFavs[key];
            favCounts[key] = Math.max(0, (favCounts[key] || 1) - 1);
        } else {
            userFavs[key] = true;
            favCounts[key] = (favCounts[key] || 0) + 1;
        }
        updateFavBtn(btnEl, !isLiked, favCounts[key]);

        try {
            if (isLiked) {
                // ELIMINAR favorito
                var r = await db.from('favoritos').delete()
                    .eq('usuario_id', K.currentUser.id)
                    .eq('tipo', tipo)
                    .eq(col, itemId);
                if (r.error) throw r.error;
                K.showToast('Eliminado de favoritos', 'success');
            } else {
                // VERIFICAR si ya existe
                var check = await db.from('favoritos')
                    .select('id')
                    .eq('usuario_id', K.currentUser.id)
                    .eq('tipo', tipo)
                    .eq(col, itemId)
                    .limit(1);

                if (check.data && check.data.length > 0) {
                    K.showToast('Ya está en favoritos', 'success');
                    return;
                }

                // INSERTAR — construir objeto con la columna correcta
                var insertData = {
                    usuario_id: K.currentUser.id,
                    tipo: tipo
                };
                insertData[col] = itemId;

                var r2 = await db.from('favoritos').insert(insertData);
                if (r2.error) {
                    console.error('Insert error:', JSON.stringify(r2.error));
                    throw r2.error;
                }
                K.showToast('¡Agregado a favoritos!', 'success');
            }
        } catch (e) {
            // Revert UI
            if (isLiked) { userFavs[key] = true; favCounts[key]++; }
            else { delete userFavs[key]; favCounts[key] = Math.max(0, favCounts[key] - 1); }
            updateFavBtn(btnEl, isLiked, favCounts[key]);
            console.error('Error toggle fav:', e);
            console.error('Datos:', { usuario_id: K.currentUser.id, tipo: tipo, col: col, itemId: itemId });
            K.showToast('Error: ' + (e.message || e.details || 'Revisa consola'), 'error');
        }
    }

    /* ══════════════════════════════════════════
       🎨 ACTUALIZAR VISUAL DEL BOTÓN
       ══════════════════════════════════════════ */
    function updateFavBtn(btnEl, isActive, count) {
        if (!btnEl) return;
        var span = btnEl.querySelector('span:first-child');
        if (isActive) {
            btnEl.classList.add('active');
            if (span) span.textContent = '❤️';
            btnEl.classList.remove('pop');
            void btnEl.offsetWidth;
            btnEl.classList.add('pop');
        } else {
            btnEl.classList.remove('active', 'pop');
            if (span) span.textContent = '🤍';
        }
        var wrapper = btnEl.closest('.fav-wrapper');
        if (wrapper) {
            var countEl = wrapper.querySelector('.fav-count');
            if (countEl) {
                countEl.textContent = count > 0 ? count : '';
                if (isActive) countEl.classList.add('active');
                else countEl.classList.remove('active');
            }
        }
    }

    /* ══════════════════════════════════════════
       🧩 GENERAR HTML FAV+SHARE PARA CARDS
       ══════════════════════════════════════════ */
    function favShareCardHTML(tipo, itemId, itemTitle) {
        var key = tipo + '_' + itemId;
        var isLiked = userFavs[key];
        var count = favCounts[key] || 0;
        var heart = isLiked ? '❤️' : '🤍';
        var ac = isLiked ? ' active' : '';
        var cc = isLiked ? ' active' : '';
        var ct = count > 0 ? count : '';
        var ts = (itemTitle || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');

        return '<div class="card-actions-row">' +
            '<div class="card-actions-left"><div class="fav-wrapper">' +
            '<button class="btn-fav' + ac + '" onclick="event.stopPropagation();window._toggleFav(\'' + tipo + '\',\'' + itemId + '\',this)" title="Favorito">' +
            '<span>' + heart + '</span><span class="fav-burst"></span></button>' +
            '<span class="fav-count' + cc + '">' + ct + '</span>' +
            '</div></div>' +
            '<div class="card-actions-right">' +
            '<button class="btn-share" onclick="event.stopPropagation();window._openShare(event,\'' + tipo + '\',\'' + itemId + '\',\'' + ts + '\')" title="Compartir">↗</button>' +
            '</div></div>';
    }

    function favShareTrackHTML(itemId, itemTitle) {
        var key = 'cancion_' + itemId;
        var isLiked = userFavs[key];
        var heart = isLiked ? '❤️' : '🤍';
        var ac = isLiked ? ' active' : '';
        var ts = (itemTitle || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');

        return '<div class="track-actions">' +
            '<button class="btn-fav' + ac + '" onclick="event.stopPropagation();window._toggleFav(\'cancion\',\'' + itemId + '\',this)" title="Favorito">' +
            '<span>' + heart + '</span><span class="fav-burst"></span></button>' +
            '<button class="btn-share" onclick="event.stopPropagation();window._openShare(event,\'cancion\',\'' + itemId + '\',\'' + ts + '\')" title="Compartir">↗</button>' +
            '</div>';
    }

    /* ══════════════════════════════════════════
       🔌 INYECTAR FAV+SHARE EN RENDERS
       ══════════════════════════════════════════ */
    function injectFavShare() {
        injectIntoCards('albumesGrid', 'album', function () {
            var albums = [];
            var cards = document.getElementById('albumesGrid').querySelectorAll('.card');
            cards.forEach(function (c) {
                var onclick = c.getAttribute('onclick') || '';
                var m = onclick.match(/_openAlbum\('([^']+)'\)/);
                var title = c.querySelector('.card-title');
                if (m) albums.push({ id: m[1], titulo: title ? title.textContent : '' });
            });
            return albums;
        });

        injectIntoCards('inicioAlbumes', 'album', function () {
            var albums = [];
            var cards = document.getElementById('inicioAlbumes').querySelectorAll('.card');
            cards.forEach(function (c) {
                var onclick = c.getAttribute('onclick') || '';
                var m = onclick.match(/_openAlbum\('([^']+)'\)/);
                var title = c.querySelector('.card-title');
                if (m) albums.push({ id: m[1], titulo: title ? title.textContent : '' });
            });
            return albums;
        });

        injectIntoCards('inicioNoticias', 'noticia', function () {
            var items = [];
            var cards = document.getElementById('inicioNoticias').querySelectorAll('.card');
            cards.forEach(function (c) {
                var onclick = c.getAttribute('onclick') || '';
                var m = onclick.match(/_openNoticia\('([^']+)'\)/);
                var title = c.querySelector('.card-title');
                if (m) items.push({ id: m[1], titulo: title ? title.textContent : '' });
            });
            return items;
        });

        injectIntoTracks('allCancionesGrid');
        injectIntoTracks('inicioCanciones');
        injectIntoTracks('detailTracks');
        injectIntoVideoCards('videosGrid');
        injectIntoDocuCards('docuGrid');
        injectIntoMarketCards('marketGrid');
    }

    function injectIntoCards(containerId, tipo, extractFn) {
        var c = document.getElementById(containerId);
        if (!c) return;
        var cards = c.querySelectorAll('.card');
        if (!cards.length) return;
        var items = extractFn();
        cards.forEach(function (card, i) {
            if (card.querySelector('.card-actions-row')) return;
            if (i < items.length) {
                var div = document.createElement('div');
                div.innerHTML = favShareCardHTML(tipo, items[i].id, items[i].titulo);
                card.appendChild(div.firstChild);
            }
        });
    }

    function injectIntoTracks(containerId) {
        var c = document.getElementById(containerId);
        if (!c) return;
        var tracks = c.querySelectorAll('.track-item');
        tracks.forEach(function (track) {
            if (track.querySelector('.track-actions')) return;
            var onclick = track.getAttribute('onclick') || '';
            var titleEl = track.querySelector('.track-title');
            var titulo = titleEl ? titleEl.textContent : '';

            var idx = -1;
            var m = onclick.match(/playTrack\((\d+)\)/) || onclick.match(/_playTrack\((\d+)\)/) || onclick.match(/_playFromAll\((\d+)/);
            if (m) idx = parseInt(m[1]);

            var trackId = '';
            if (K.currentPlaylist && K.currentPlaylist[idx]) {
                trackId = K.currentPlaylist[idx].id;
            }

            if (!trackId) return;

            var adminDel = track.querySelector('.track-delete');
            var frag = document.createElement('div');
            frag.innerHTML = favShareTrackHTML(trackId, titulo);
            var actionsDiv = frag.firstChild;
            if (adminDel) {
                track.insertBefore(actionsDiv, adminDel);
            } else {
                track.appendChild(actionsDiv);
            }
        });
    }

    function injectIntoVideoCards(containerId) {
        var c = document.getElementById(containerId);
        if (!c) return;
        var cards = c.querySelectorAll('.video-card');
        cards.forEach(function (card, i) {
            if (card.querySelector('.card-actions-row')) return;
            if (K.allVideosData && i < K.allVideosData.length) {
                var v = K.allVideosData[i];
                var div = document.createElement('div');
                div.innerHTML = favShareCardHTML('video', v.id, v.titulo);
                card.appendChild(div.firstChild);
            }
        });
    }

    function injectIntoDocuCards(containerId) {
        var c = document.getElementById(containerId);
        if (!c) return;
        var cards = c.querySelectorAll('.docu-card');
        cards.forEach(function (card, i) {
            if (card.querySelector('.card-actions-row')) return;
            if (K.allDocuData && i < K.allDocuData.length) {
                var d = K.allDocuData[i];
                var div = document.createElement('div');
                div.innerHTML = favShareCardHTML('documental', d.id, d.titulo);
                card.appendChild(div.firstChild);
            }
        });
    }

    function injectIntoMarketCards(containerId) {
        var c = document.getElementById(containerId);
        if (!c) return;
        var cards = c.querySelectorAll('.market-card');
        var filtered = (K.allMarketData || []).filter(function (item) { return item.tipo === K.currentMarketTab; });
        cards.forEach(function (card, i) {
            if (card.querySelector('.card-actions-row')) return;
            if (i < filtered.length) {
                var item = filtered[i];
                var div = document.createElement('div');
                div.innerHTML = favShareCardHTML('beat', item.id, item.titulo);
                card.appendChild(div.firstChild);
            }
        });
    }

    /* ══════════════════════════════════════════
   👀 MUTATION OBSERVER — Auto-inject
   FIX: Ignorar mutaciones del panel favoritos
   ══════════════════════════════════════════ */
var debounceTimer = null;
function debouncedInject() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(injectFavShare, 150);
}

var contentArea = document.querySelector('.content-area');
if (contentArea) {
    var observer = new MutationObserver(function (mutations) {
        // Ignorar mutaciones dentro del panel favoritos redesign
        for (var i = 0; i < mutations.length; i++) {
            var target = mutations[i].target;
            if (target && target.closest && target.closest('#panel-favoritos')) {
                return; // No inyectar en el panel de favoritos
            }
        }
        debouncedInject();
    });
    observer.observe(contentArea, { childList: true, subtree: true });
}

    /* ══════════════════════════════════════════
       🌐 GLOBAL TOGGLE
       ══════════════════════════════════════════ */
    window._toggleFav = function (tipo, itemId, btnEl) {
        toggleFavorite(tipo, itemId, btnEl);
    };

    /* ══════════════════════════════════════════
       ↗ COMPARTIR EN REDES SOCIALES
       ══════════════════════════════════════════ */
    var shareData = { tipo: '', itemId: '', title: '' };

    window._openShare = function (event, tipo, itemId, title) {
        event.stopPropagation();
        shareData = { tipo: tipo, itemId: itemId, title: title };

        var dropdown = document.getElementById('shareDropdown');
        var rect = event.currentTarget.getBoundingClientRect();

        var top = rect.bottom + 8;
        var left = rect.left - 80;

        if (left < 10) left = 10;
        if (left + 200 > window.innerWidth) left = window.innerWidth - 210;
        if (top + 250 > window.innerHeight) top = rect.top - 258;

        dropdown.style.top = top + 'px';
        dropdown.style.left = left + 'px';
        dropdown.classList.add('show');

        setTimeout(function () {
            document.addEventListener('click', closeShareDrop);
        }, 10);
    };

    function closeShareDrop() {
        document.getElementById('shareDropdown').classList.remove('show');
        document.removeEventListener('click', closeShareDrop);
    }

    window._shareVia = function (platform) {
        var title = shareData.title || 'KXON';
        var url = window.location.origin;
        var text = '🎵 Escucha "' + title + '" en KXON — ' + url;

        switch (platform) {
            case 'whatsapp':
                window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
                break;
            case 'twitter':
                window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(text), '_blank');
                break;
            case 'facebook':
                window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url) + '&quote=' + encodeURIComponent('🎵 ' + title + ' en KXON'), '_blank');
                break;
            case 'telegram':
                window.open('https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent('🎵 ' + title + ' en KXON'), '_blank');
                break;
            case 'copy':
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(text).then(function () {
                        K.showToast('¡Enlace copiado!', 'success');
                    }).catch(function () { fallbackCopy(text); });
                } else { fallbackCopy(text); }
                break;
        }
        closeShareDrop();
    };

    function fallbackCopy(text) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); K.showToast('¡Enlace copiado!', 'success'); }
        catch (e) { K.showToast('No se pudo copiar', 'error'); }
        document.body.removeChild(ta);
    }

    /* ── Compartir desde Player Bar ── */
    window._shareFromPlayer = function (event) {
        var title = document.getElementById('playerTitle').textContent || 'KXON';
        var itemId = '';

        if (K.activeSource === 'radio') {
            var list = K.radioShuffleMode ? K.radioShuffled : K.radioPlaylist;
            if (list && list[K.radioIndex]) {
                itemId = list[K.radioIndex].id;
                title = list[K.radioIndex].titulo;
            }
        } else if (K.currentPlaylist && K.currentPlaylist[K.currentTrackIndex]) {
            itemId = K.currentPlaylist[K.currentTrackIndex].id;
        }
        window._openShare(event, 'cancion', itemId, title);
    };

    /* ── Compartir desde Radio ── */
    window._shareFromRadio = function (event) {
        var list = K.radioShuffleMode ? K.radioShuffled : K.radioPlaylist;
        var title = 'KXON Radio';
        var itemId = '';
        if (list && list[K.radioIndex]) {
            title = list[K.radioIndex].titulo;
            itemId = list[K.radioIndex].id;
        }
        window._openShare(event, 'cancion', itemId, title);
    };

    /* ══════════════════════════════════════════
       ❤️ PLAYER BAR FAV
       ══════════════════════════════════════════ */
    window._togglePlayerFav = function () {
        var btn = document.getElementById('playerFavBtn');

        if (K.activeSource === 'radio') {
            var list = K.radioShuffleMode ? K.radioShuffled : K.radioPlaylist;
            if (list && list[K.radioIndex]) {
                toggleFavorite('cancion', list[K.radioIndex].id, btn);
            } else {
                K.showToast('No hay canción reproduciéndose', 'error');
            }
        } else if (K.currentPlaylist && K.currentPlaylist[K.currentTrackIndex]) {
            toggleFavorite('cancion', K.currentPlaylist[K.currentTrackIndex].id, btn);
        } else {
            K.showToast('No hay canción reproduciéndose', 'error');
        }
    };

    function updatePlayerFavState() {
        var btn = document.getElementById('playerFavBtn');
        if (!btn) return;
        var trackId = '';

        if (K.activeSource === 'radio') {
            var list = K.radioShuffleMode ? K.radioShuffled : K.radioPlaylist;
            if (list && list[K.radioIndex]) trackId = list[K.radioIndex].id;
        } else if (K.currentPlaylist && K.currentPlaylist[K.currentTrackIndex]) {
            trackId = K.currentPlaylist[K.currentTrackIndex].id;
        }

        if (!trackId) return;
        var key = 'cancion_' + trackId;
        var isLiked = userFavs[key];
        var span = btn.querySelector('span:first-child');
        if (isLiked) { btn.classList.add('active'); if (span) span.textContent = '❤️'; }
        else { btn.classList.remove('active', 'pop'); if (span) span.textContent = '🤍'; }
    }

    /* ── Radio fav ── */
    window._toggleRadioFav = function () {
        var btn = document.getElementById('radioFavBtn');
        var list = K.radioShuffleMode ? K.radioShuffled : K.radioPlaylist;
        if (list && list[K.radioIndex]) {
            toggleFavorite('cancion', list[K.radioIndex].id, btn);
        } else {
            K.showToast('No hay canción reproduciéndose', 'error');
        }
    };

    function updateRadioFavState() {
        var btn = document.getElementById('radioFavBtn');
        var countEl = document.getElementById('radioFavCount');
        if (!btn) return;
        var list = K.radioShuffleMode ? K.radioShuffled : K.radioPlaylist;
        if (!list || !list[K.radioIndex]) return;
        var key = 'cancion_' + list[K.radioIndex].id;
        var isLiked = userFavs[key];
        var count = favCounts[key] || 0;
        var span = btn.querySelector('span:first-child');
        if (isLiked) { btn.classList.add('active'); if (span) span.textContent = '❤️'; }
        else { btn.classList.remove('active', 'pop'); if (span) span.textContent = '🤍'; }
        if (countEl) {
            countEl.textContent = count > 0 ? count : '';
            if (isLiked) countEl.classList.add('active'); else countEl.classList.remove('active');
        }
    }

    /* ── Hook playTrack para actualizar fav state ── */
    var _origPlayTrack = K.playTrack;
    K.playTrack = function (idx) {
        _origPlayTrack(idx);
        setTimeout(updatePlayerFavState, 100);
    };
    window._playTrack = function (idx) { K.playTrack(idx); };

    /* ══════════════════════════════════════════
       ❤️ PANEL FAVORITOS — REDESIGN 2026
       Namespace: kx-fav-*
       ══════════════════════════════════════════ */

    // ── State ──
    var favsTab = 'todos';
    var favsSort = 'recent';
    var favsSearch = '';
    var favsView = 'grid';
    var favsAllData = [];     // Raw favoritos rows + details
    var favsFiltered = [];    // After filter/search/sort

    // ── escapeHtml ──
    function escapeHtml(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    // ── Relative date ──
    function relativeDate(dateStr) {
        if (!dateStr) return '';
        var now = Date.now();
        var then = new Date(dateStr).getTime();
        var diff = now - then;
        var mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Ahora';
        if (mins < 60) return mins + ' min';
        var hrs = Math.floor(mins / 60);
        if (hrs < 24) return hrs + 'h';
        var days = Math.floor(hrs / 24);
        if (days < 30) return days + 'd';
        var months = Math.floor(days / 30);
        if (months < 12) return months + ' mes' + (months > 1 ? 'es' : '');
        return Math.floor(months / 12) + ' año' + (Math.floor(months / 12) > 1 ? 's' : '');
    }

    // ── Type labels & icons ──
    var typeIcons  = { cancion: '🎵', album: '💿', beat: '🎹', video: '🎬', documental: '🎞️', noticia: '📰' };
    var typeLabels = { cancion: 'Canción', album: 'Álbum', beat: 'Beat', video: 'Video', documental: 'Documental', noticia: 'Noticia' };

    // ═══════════════════════════════════
    // EVENT DELEGATION (all toolbar)
    // ═══════════════════════════════════
    (function initFavEvents() {
        var panel = document.getElementById('panel-favoritos');
        if (!panel) return;

        // ── Tab clicks ──
        var filtersEl = document.getElementById('kxFavFilters');
        if (filtersEl) {
            filtersEl.addEventListener('click', function (e) {
                var btn = e.target.closest('[data-fav-tab]');
                if (!btn) return;
                var tab = btn.getAttribute('data-fav-tab');
                if (tab === favsTab) return;
                favsTab = tab;
                // Update active
                var all = filtersEl.querySelectorAll('[data-fav-tab]');
                for (var i = 0; i < all.length; i++) {
                    var isActive = all[i].getAttribute('data-fav-tab') === tab;
                    all[i].classList.toggle('active', isActive);
                    all[i].setAttribute('aria-selected', isActive ? 'true' : 'false');
                }
                applyFavsFilters();
            });
        }

        // ── Search ──
        var searchInput = document.getElementById('kxFavSearch');
        var searchClear = document.getElementById('kxFavSearchClear');
        var searchTimer = null;
        if (searchInput) {
            searchInput.addEventListener('input', function () {
                clearTimeout(searchTimer);
                searchTimer = setTimeout(function () {
                    favsSearch = searchInput.value.trim().toLowerCase();
                    searchClear.style.display = favsSearch ? 'flex' : 'none';
                    applyFavsFilters();
                }, 200);
            });
        }
        if (searchClear) {
            searchClear.addEventListener('click', function () {
                searchInput.value = '';
                favsSearch = '';
                searchClear.style.display = 'none';
                applyFavsFilters();
            });
        }

        // ── Sort ──
        var sortTrigger = document.getElementById('kxFavSortTrigger');
        var sortDropdown = document.getElementById('kxFavSortDropdown');
        if (sortTrigger && sortDropdown) {
            sortTrigger.addEventListener('click', function (e) {
                e.stopPropagation();
                var isOpen = sortDropdown.classList.contains('show');
                sortDropdown.classList.toggle('show', !isOpen);
                sortTrigger.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
            });
            sortDropdown.addEventListener('click', function (e) {
                var opt = e.target.closest('[data-sort]');
                if (!opt) return;
                favsSort = opt.getAttribute('data-sort');
                // Update active
                var opts = sortDropdown.querySelectorAll('[data-sort]');
                for (var i = 0; i < opts.length; i++) {
                    var active = opts[i].getAttribute('data-sort') === favsSort;
                    opts[i].classList.toggle('active', active);
                    opts[i].setAttribute('aria-selected', active ? 'true' : 'false');
                }
                // Update label
                var labelMap = { recent: 'Recientes', oldest: 'Antiguos', az: 'A → Z', za: 'Z → A' };
                document.getElementById('kxFavSortLabel').textContent = labelMap[favsSort] || 'Recientes';
                sortDropdown.classList.remove('show');
                sortTrigger.setAttribute('aria-expanded', 'false');
                applyFavsFilters();
            });
            // Close on outside click
            document.addEventListener('click', function (e) {
                if (!sortTrigger.contains(e.target) && !sortDropdown.contains(e.target)) {
                    sortDropdown.classList.remove('show');
                    sortTrigger.setAttribute('aria-expanded', 'false');
                }
            });
        }

        // ── View Toggle ──
        var viewToggle = document.getElementById('kxFavViewToggle');
        if (viewToggle) {
            viewToggle.addEventListener('click', function (e) {
                var btn = e.target.closest('[data-view]');
                if (!btn) return;
                var view = btn.getAttribute('data-view');
                if (view === favsView) return;
                favsView = view;
                var btns = viewToggle.querySelectorAll('[data-view]');
                for (var i = 0; i < btns.length; i++) {
                    btns[i].classList.toggle('active', btns[i].getAttribute('data-view') === view);
                }
                renderFavsContent();
            });
        }

        // ── Clear filters bar ──
        var clearBtn = document.getElementById('kxFavActiveClear');
        if (clearBtn) {
            clearBtn.addEventListener('click', function () {
                favsTab = 'todos';
                favsSearch = '';
                favsSort = 'recent';
                // Reset UI
                if (searchInput) { searchInput.value = ''; searchClear.style.display = 'none'; }
                var allTabs = filtersEl ? filtersEl.querySelectorAll('[data-fav-tab]') : [];
                for (var i = 0; i < allTabs.length; i++) {
                    var isTodos = allTabs[i].getAttribute('data-fav-tab') === 'todos';
                    allTabs[i].classList.toggle('active', isTodos);
                    allTabs[i].setAttribute('aria-selected', isTodos ? 'true' : 'false');
                }
                var sortOpts = sortDropdown ? sortDropdown.querySelectorAll('[data-sort]') : [];
                for (var j = 0; j < sortOpts.length; j++) {
                    var isRecent = sortOpts[j].getAttribute('data-sort') === 'recent';
                    sortOpts[j].classList.toggle('active', isRecent);
                }
                if (document.getElementById('kxFavSortLabel')) {
                    document.getElementById('kxFavSortLabel').textContent = 'Recientes';
                }
                applyFavsFilters();
            });
        }

        // ── Delegated actions on content (grid + list) ──
        panel.addEventListener('click', function (e) {
            // Open item
            var card = e.target.closest('[data-fav-open]');
            if (card && !e.target.closest('[data-fav-remove]') && !e.target.closest('[data-fav-share]')) {
                var tipo = card.getAttribute('data-fav-tipo');
                var id = card.getAttribute('data-fav-id');
                if (tipo && id) openFavItem(tipo, id);
                return;
            }
            // Remove
            var removeBtn = e.target.closest('[data-fav-remove]');
            if (removeBtn) {
                e.stopPropagation();
                var rTipo = removeBtn.getAttribute('data-fav-tipo');
                var rId = removeBtn.getAttribute('data-fav-id');
                if (rTipo && rId) removeFavItem(rTipo, rId, removeBtn);
                return;
            }
            // Share
            var shareBtn = e.target.closest('[data-fav-share]');
            if (shareBtn) {
                e.stopPropagation();
                var sTipo = shareBtn.getAttribute('data-fav-tipo');
                var sId = shareBtn.getAttribute('data-fav-id');
                var sTitle = shareBtn.getAttribute('data-fav-title') || '';
                window._openShare(e, sTipo, sId, sTitle);
                return;
            }
            // Retry
            var retry = e.target.closest('.kx-fav-error-retry');
            if (retry) {
                loadFavsPanel();
                return;
            }
        });
    })();

    // ═══════════════════════════════════
    // REMOVE FAV (with animation)
    // ═══════════════════════════════════
    function removeFavItem(tipo, itemId, btnEl) {
        // Find the card/list-item and animate out
        var container = btnEl.closest('.kx-fav-card, .kx-fav-list-item');
        if (container) {
            container.style.transition = 'all .3s ease';
            container.style.opacity = '0';
            container.style.transform = 'scale(.9)';
        }
        // Use existing toggleFavorite
        var fakeBtn = document.createElement('button');
        fakeBtn.classList.add('btn-fav', 'active');
        fakeBtn.innerHTML = '<span>❤️</span><span class="fav-burst"></span>';
        toggleFavorite(tipo, itemId, fakeBtn);

        // After animation, remove from local data and re-render
        setTimeout(function () {
            favsAllData = favsAllData.filter(function (f) {
                return !(f.tipo === tipo && f._itemId === itemId);
            });
            applyFavsFilters();
            updateFavsKpis();
        }, 350);
    }

    // ═══════════════════════════════════
    // OPEN FAV ITEM
    // ═══════════════════════════════════
    function openFavItem(tipo, itemId) {
        switch (tipo) {
            case 'cancion':    K.showPanel('canciones'); break;
            case 'album':      K.showPanel('albumes'); window._openAlbum(itemId); break;
            case 'beat':       K.showPanel('marketplace'); setTimeout(function () { window._openMarketDetail(itemId); }, 300); break;
            case 'video':      window._openVideoPlayer(itemId); break;
            case 'documental': K.showPanel('documentales'); window._openDocu(itemId); break;
            case 'noticia':    window._openNoticia(itemId); break;
        }
    }
    // Keep global for backward compat
    window._openFavItem = openFavItem;

    // ═══════════════════════════════════
    // SKELETON RENDER
    // ═══════════════════════════════════
    function renderFavsSkeleton() {
        var gridEl = document.getElementById('kxFavGrid');
        var listEl = document.getElementById('kxFavList');
        if (!gridEl) return;

        if (favsView === 'grid') {
            gridEl.style.display = '';
            listEl.style.display = 'none';
            var sk = '';
            for (var i = 0; i < 8; i++) {
                sk += '<div class="kx-fav-skeleton">' +
                    '<div class="kx-fav-skeleton-img"></div>' +
                    '<div class="kx-fav-skeleton-body">' +
                    '<div class="kx-fav-skeleton-line"></div>' +
                    '<div class="kx-fav-skeleton-line kx-fav-skeleton-line--short"></div>' +
                    '</div></div>';
            }
            gridEl.innerHTML = sk;
        } else {
            gridEl.style.display = 'none';
            listEl.style.display = '';
            var slk = '';
            for (var j = 0; j < 6; j++) {
                slk += '<div class="kx-fav-skeleton-list">' +
                    '<div class="kx-fav-skeleton-list-img"></div>' +
                    '<div class="kx-fav-skeleton-list-info">' +
                    '<div class="kx-fav-skeleton-list-bar"></div>' +
                    '<div class="kx-fav-skeleton-list-bar kx-fav-skeleton-list-bar--short"></div>' +
                    '</div></div>';
            }
            listEl.innerHTML = slk;
        }
    }

    // ═══════════════════════════════════
    // LOAD FAVS PANEL (main data fetch)
    // ═══════════════════════════════════
    async function loadFavsPanel() {
        if (!K.currentUser) return;

        renderFavsSkeleton();

        try {
            var r = await db.from('favoritos')
                .select('*')
                .eq('usuario_id', K.currentUser.id)
                .order('created_at', { ascending: false });

            if (r.error) throw r.error;
            var favs = r.data || [];

            // Add _itemId to each
            for (var i = 0; i < favs.length; i++) {
                var fav = favs[i];
                var col = getColumn(fav.tipo);
                fav._itemId = fav[col];
            }

            // Filter out invalid
            favs = favs.filter(function (f) { return !!f._itemId; });

            // Group by type for batch details
            var byType = {};
            for (var j = 0; j < favs.length; j++) {
                var tipo = favs[j].tipo;
                if (!byType[tipo]) byType[tipo] = [];
                byType[tipo].push(favs[j]._itemId);
            }

            // Fetch details
            var details = {};
            var tableMap = {
                cancion: 'canciones', album: 'albumes', beat: 'beats',
                video: 'videos', documental: 'documentales', noticia: 'noticias'
            };

            for (var tipo in byType) {
                var table = tableMap[tipo];
                if (!table) continue;
                var cols = 'id, titulo';
                if (tipo === 'cancion' || tipo === 'album' || tipo === 'documental' || tipo === 'noticia') cols += ', imagen_url';
                if (tipo === 'beat') cols += ', imagen_url, precio';
                if (tipo === 'video') cols += ', thumbnail_url';

                var dr = await db.from(table).select(cols).in('id', byType[tipo]);
                if (dr.data) {
                    for (var k = 0; k < dr.data.length; k++) {
                        var d = dr.data[k];
                        details[tipo + '_' + d.id] = d;
                    }
                }
            }

            // Merge details into favs
            favsAllData = [];
            for (var m = 0; m < favs.length; m++) {
                var f = favs[m];
                var detail = details[f.tipo + '_' + f._itemId];
                if (!detail) continue;
                f._detail = detail;
                f._titulo = detail.titulo || 'Sin título';
                f._img = detail.imagen_url || detail.thumbnail_url || '';
                favsAllData.push(f);
            }

            updateFavsKpis();
            applyFavsFilters();

        } catch (e) {
            console.error('Error panel favoritos:', e);
            renderFavsError();
        }
    }

    // ═══════════════════════════════════
    // KPIs UPDATE
    // ═══════════════════════════════════
    function updateFavsKpis() {
        var total = favsAllData.length;
        var songs = 0, albums = 0, other = 0;
        for (var i = 0; i < favsAllData.length; i++) {
            if (favsAllData[i].tipo === 'cancion') songs++;
            else if (favsAllData[i].tipo === 'album') albums++;
            else other++;
        }
        var kpiTotal  = document.getElementById('kxFavKpiTotal');
        var kpiSongs  = document.getElementById('kxFavKpiSongs');
        var kpiAlbums = document.getElementById('kxFavKpiAlbums');
        var kpiOther  = document.getElementById('kxFavKpiOther');
        if (kpiTotal)  kpiTotal.textContent  = total;
        if (kpiSongs)  kpiSongs.textContent  = songs;
        if (kpiAlbums) kpiAlbums.textContent = albums;
        if (kpiOther)  kpiOther.textContent  = other;
    }

    // ═══════════════════════════════════
    // APPLY FILTERS + SEARCH + SORT
    // ═══════════════════════════════════
    function applyFavsFilters() {
        // Filter by tab
        var data = favsAllData;
        if (favsTab !== 'todos') {
            data = data.filter(function (f) { return f.tipo === favsTab; });
        }

        // Filter by search
        if (favsSearch) {
            data = data.filter(function (f) {
                return f._titulo.toLowerCase().indexOf(favsSearch) !== -1;
            });
        }

        // Sort
        switch (favsSort) {
            case 'oldest':
                data = data.slice().sort(function (a, b) {
                    return new Date(a.created_at) - new Date(b.created_at);
                });
                break;
            case 'az':
                data = data.slice().sort(function (a, b) {
                    return a._titulo.localeCompare(b._titulo);
                });
                break;
            case 'za':
                data = data.slice().sort(function (a, b) {
                    return b._titulo.localeCompare(a._titulo);
                });
                break;
            default: // recent — already sorted by created_at desc from DB
                break;
        }

        favsFiltered = data;

        // Update active filters bar
        updateActiveBar();

        // Render
        renderFavsContent();
    }

    // ═══════════════════════════════════
    // ACTIVE FILTERS BAR
    // ═══════════════════════════════════
    function updateActiveBar() {
        var bar = document.getElementById('kxFavActiveBar');
        var text = document.getElementById('kxFavActiveText');
        if (!bar || !text) return;

        var hasFilters = favsTab !== 'todos' || favsSearch || favsSort !== 'recent';
        bar.style.display = hasFilters ? 'flex' : 'none';

        if (!hasFilters) return;

        var parts = [];
        if (favsTab !== 'todos') parts.push('Tipo: ' + (typeLabels[favsTab] || favsTab));
        if (favsSearch) parts.push('Búsqueda: "' + escapeHtml(favsSearch) + '"');
        if (favsSort !== 'recent') {
            var sortNames = { oldest: 'Más antiguos', az: 'A → Z', za: 'Z → A' };
            parts.push('Orden: ' + (sortNames[favsSort] || favsSort));
        }
        text.textContent = favsFiltered.length + ' resultado' + (favsFiltered.length !== 1 ? 's' : '') + ' — ' + parts.join(' · ');
    }

    // ═══════════════════════════════════
    // RENDER CONTENT
    // ═══════════════════════════════════
    function renderFavsContent() {
        var gridEl = document.getElementById('kxFavGrid');
        var listEl = document.getElementById('kxFavList');
        var countEl = document.getElementById('kxFavResultCount');

        if (favsView === 'grid') {
            gridEl.style.display = '';
            listEl.style.display = 'none';
            renderFavsGrid(gridEl);
        } else {
            gridEl.style.display = 'none';
            listEl.style.display = '';
            renderFavsList(listEl);
        }

        // Result count
        if (countEl) {
            if (favsFiltered.length > 0 && (favsSearch || favsTab !== 'todos')) {
                countEl.style.display = 'block';
                countEl.textContent = favsFiltered.length + ' favorito' + (favsFiltered.length !== 1 ? 's' : '') + ' encontrado' + (favsFiltered.length !== 1 ? 's' : '');
            } else {
                countEl.style.display = 'none';
            }
        }
    }

    // ═══════════════════════════════════
    // RENDER GRID
    // ═══════════════════════════════════
    function renderFavsGrid(container) {
        if (!favsFiltered.length) {
            container.innerHTML = renderFavsEmpty();
            return;
        }

        var h = '';
        for (var i = 0; i < favsFiltered.length; i++) {
            var f = favsFiltered[i];
            var img = f._img || 'https://placehold.co/400x400/111/333?text=' + encodeURIComponent(typeIcons[f.tipo] || '♪');
            var titulo = escapeHtml(f._titulo);
            var tipoClass = f.tipo;
            var tipoLabel = typeLabels[f.tipo] || f.tipo;
            var tipoIcon = typeIcons[f.tipo] || '❤️';
            var dateStr = relativeDate(f.created_at);
            var escapedTitle = escapeHtml(f._titulo).replace(/'/g, '&#39;');

            h += '<article class="kx-fav-card kx-observed" style="--i:' + i + '" ' +
                'data-fav-open data-fav-tipo="' + f.tipo + '" data-fav-id="' + f._itemId + '" ' +
                'tabindex="0" role="button" aria-label="' + titulo + '">';

            // Visual
            h += '<div class="kx-fav-card-visual">';
            h += '<img class="kx-fav-card-img" src="' + escapeHtml(img) + '" alt="" loading="lazy" ' +
                'onerror="this.src=\'https://placehold.co/400x400/111/333?text=♪\'">';

            // Type badge
            h += '<span class="kx-fav-card-type kx-fav-card-type--' + tipoClass + '">' + tipoIcon + ' ' + tipoLabel + '</span>';

            // Remove button
            h += '<button class="kx-fav-card-remove" data-fav-remove data-fav-tipo="' + f.tipo + '" ' +
                'data-fav-id="' + f._itemId + '" title="Eliminar de favoritos" aria-label="Eliminar de favoritos">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
                '</button>';

            // Overlay
            h += '<div class="kx-fav-card-overlay">';
            h += '<button class="kx-fav-card-play" aria-label="Abrir ' + titulo + '">' +
                '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="8,5 20,12 8,19"/></svg></button>';
            h += '</div>';

            h += '</div>';

            // Body
            h += '<div class="kx-fav-card-body">';
            h += '<div class="kx-fav-card-title">' + titulo + '</div>';
            h += '<div class="kx-fav-card-sub">' + tipoIcon + ' ' + tipoLabel + '</div>';
            if (dateStr) h += '<div class="kx-fav-card-date">Guardado hace ' + dateStr + '</div>';
            h += '</div>';

            h += '</article>';
        }

        container.innerHTML = h;

        // Intersection observer for animations
        observeFavCards(container);
    }

    // ═══════════════════════════════════
    // RENDER LIST
    // ═══════════════════════════════════
    function renderFavsList(container) {
        if (!favsFiltered.length) {
            container.innerHTML = renderFavsEmpty();
            return;
        }

        var h = '';
        for (var i = 0; i < favsFiltered.length; i++) {
            var f = favsFiltered[i];
            var img = f._img || 'https://placehold.co/48x48/111/333?text=' + encodeURIComponent(typeIcons[f.tipo] || '♪');
            var titulo = escapeHtml(f._titulo);
            var tipoClass = f.tipo;
            var tipoLabel = typeLabels[f.tipo] || f.tipo;
            var dateStr = relativeDate(f.created_at);
            var escapedTitle = escapeHtml(f._titulo).replace(/'/g, '&#39;');

            h += '<div class="kx-fav-list-item kx-observed" style="--i:' + i + '" ' +
                'data-fav-open data-fav-tipo="' + f.tipo + '" data-fav-id="' + f._itemId + '" ' +
                'tabindex="0" role="button" aria-label="' + titulo + '">';

            // Cover
            h += '<div class="kx-fav-list-cover">';
            h += '<img src="' + escapeHtml(img) + '" alt="" loading="lazy" ' +
                'onerror="this.src=\'https://placehold.co/48x48/111/333?text=♪\'">';
            h += '<span class="kx-fav-list-type-dot kx-fav-list-type-dot--' + tipoClass + '"></span>';
            h += '</div>';

            // Info
            h += '<div class="kx-fav-list-info">';
            h += '<div class="kx-fav-list-title">' + titulo + '</div>';
            h += '<div class="kx-fav-list-meta">';
            h += '<span class="kx-fav-list-type-label kx-fav-list-type-label--' + tipoClass + '">' + tipoLabel + '</span>';
            h += '</div></div>';

            // Date
            if (dateStr) h += '<span class="kx-fav-list-date">' + dateStr + '</span>';

            // Actions
            h += '<div class="kx-fav-list-actions">';
            h += '<button class="kx-fav-list-action" data-fav-share data-fav-tipo="' + f.tipo + '" ' +
                'data-fav-id="' + f._itemId + '" data-fav-title="' + escapedTitle + '" ' +
                'title="Compartir" aria-label="Compartir">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>' +
                '<polyline points="16,6 12,2 8,6"/><line x1="12" y1="2" x2="12" y2="15"/></svg></button>';
            h += '<button class="kx-fav-list-action kx-fav-list-action--remove" data-fav-remove ' +
                'data-fav-tipo="' + f.tipo + '" data-fav-id="' + f._itemId + '" ' +
                'title="Eliminar" aria-label="Eliminar de favoritos">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg></button>';
            h += '</div>';

            h += '</div>';
        }

        container.innerHTML = h;
        observeFavCards(container);
    }

    // ═══════════════════════════════════
    // EMPTY STATE
    // ═══════════════════════════════════
    function renderFavsEmpty() {
        if (favsSearch) {
            return '<div class="kx-fav-empty">' +
                '<div class="kx-fav-empty-icon">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></div>' +
                '<div class="kx-fav-empty-title">Sin resultados para "' + escapeHtml(favsSearch) + '"</div>' +
                '<div class="kx-fav-empty-text">Intenta con otro término de búsqueda</div></div>';
        }
        if (favsTab !== 'todos') {
            return '<div class="kx-fav-empty">' +
                '<div class="kx-fav-empty-heart">❤️</div>' +
                '<div class="kx-fav-empty-title">No tienes ' + (typeLabels[favsTab] || favsTab) + 's en favoritos</div>' +
                '<div class="kx-fav-empty-text">Explora el catálogo y dale ❤️ a lo que te guste</div></div>';
        }
        return '<div class="kx-fav-empty">' +
            '<div class="kx-fav-empty-heart">❤️</div>' +
            '<div class="kx-fav-empty-title">Sin favoritos aún</div>' +
            '<div class="kx-fav-empty-text">Dale like a canciones, álbumes, beats, videos y más. Todo aparecerá aquí.</div></div>';
    }

    // ═══════════════════════════════════
    // ERROR STATE
    // ═══════════════════════════════════
    function renderFavsError() {
        var gridEl = document.getElementById('kxFavGrid');
        var listEl = document.getElementById('kxFavList');
        var html = '<div class="kx-fav-error">' +
            '<div class="kx-fav-error-icon">⚠️</div>' +
            '<div class="kx-fav-error-title">Error al cargar favoritos</div>' +
            '<div class="kx-fav-error-text">Hubo un problema con la conexión. Inténtalo de nuevo.</div>' +
            '<button class="kx-fav-error-retry">Reintentar</button></div>';
        if (favsView === 'grid' && gridEl) {
            gridEl.style.display = '';
            if (listEl) listEl.style.display = 'none';
            gridEl.innerHTML = html;
        } else if (listEl) {
            if (gridEl) gridEl.style.display = 'none';
            listEl.style.display = '';
            listEl.innerHTML = html;
        }
    }

    // ═══════════════════════════════════
    // INTERSECTION OBSERVER (animations)
    // ═══════════════════════════════════
    var favObserver = null;
    function observeFavCards(container) {
        if (favObserver) favObserver.disconnect();
        if (!('IntersectionObserver' in window)) return;

        favObserver = new IntersectionObserver(function (entries) {
            for (var i = 0; i < entries.length; i++) {
                if (entries[i].isIntersecting) {
                    entries[i].target.classList.add('kx-observed');
                    favObserver.unobserve(entries[i].target);
                }
            }
        }, { threshold: 0.05, rootMargin: '40px' });

        var items = container.querySelectorAll('.kx-fav-card, .kx-fav-list-item');
        for (var i = 0; i < items.length; i++) {
            items[i].classList.remove('kx-observed');
            favObserver.observe(items[i]);
        }
    }

    // ═══════════════════════════════════
    // BACKWARD COMPAT: window._favsTab
    // ═══════════════════════════════════
    window._favsTab = function (tab) {
        favsTab = tab;
        var filtersEl = document.getElementById('kxFavFilters');
        if (filtersEl) {
            var all = filtersEl.querySelectorAll('[data-fav-tab]');
            for (var i = 0; i < all.length; i++) {
                var isActive = all[i].getAttribute('data-fav-tab') === tab;
                all[i].classList.toggle('active', isActive);
                all[i].setAttribute('aria-selected', isActive ? 'true' : 'false');
            }
        }
        applyFavsFilters();
    };

    /* ══════════════════════════════════════════
       🔄 EXPONER FUNCIONES GLOBALES
       ══════════════════════════════════════════ */
    K.loadFavsPanel = loadFavsPanel;
    K.updatePlayerFavState = updatePlayerFavState;
    K.updateRadioFavState = updateRadioFavState;

})();