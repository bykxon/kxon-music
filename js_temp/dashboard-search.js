/* ============================================
   🔍 DASHBOARD-SEARCH.JS — KXON
   Buscador global: canciones, álbumes, beats,
   noticias, videos
   ============================================ */
(function () {

    var db = window.db;
    var K = window.KXON;

    var searchInput = document.getElementById('searchInput');
    var searchResults = document.getElementById('searchResults');
    var searchClear = document.getElementById('searchClear');
    var searchTimeout = null;
    var searchCache = {
        canciones: [],
        albumes: [],
        beats: [],
        noticias: [],
        videos: []
    };
    var cacheLoaded = false;

    /* ══════════════════════════════════════════
       📦 CARGAR CACHE DE BÚSQUEDA
       ══════════════════════════════════════════ */
    async function loadSearchCache() {
        if (cacheLoaded) return;
        try {
            var p1 = db.from('canciones').select('id, titulo, imagen_url, albumes(titulo, imagen_url)').order('created_at', { ascending: false });
            var p2 = db.from('albumes').select('id, titulo, imagen_url, canciones(id)').order('created_at', { ascending: false });
            var p3 = db.from('beats').select('id, titulo, imagen_url, tipo, precio').eq('activo', true).eq('vendido', false).order('created_at', { ascending: false });
            var p4 = db.from('noticias').select('id, titulo, imagen_url').order('created_at', { ascending: false });
            var p5 = db.from('videos').select('id, titulo, thumbnail_url').order('created_at', { ascending: false });

            var results = await Promise.all([p1, p2, p3, p4, p5]);

            searchCache.canciones = results[0].data || [];
            searchCache.albumes = results[1].data || [];
            searchCache.beats = results[2].data || [];
            searchCache.noticias = results[3].data || [];
            searchCache.videos = results[4].data || [];

            cacheLoaded = true;
        } catch (e) {
            console.error('Error cargando caché de búsqueda:', e);
        }
    }

    /* ══════════════════════════════════════════
       🔍 BUSCAR
       ══════════════════════════════════════════ */
    function search(query) {
        if (!query || query.length < 2) {
            searchResults.classList.remove('show');
            return;
        }

        var q = query.toLowerCase().trim();
        var results = [];

        /* Canciones */
        for (var i = 0; i < searchCache.canciones.length; i++) {
            var c = searchCache.canciones[i];
            if (c.titulo.toLowerCase().indexOf(q) >= 0) {
                results.push({
                    type: 'cancion',
                    typeLabel: 'Canción',
                    typeClass: 'type-cancion',
                    icon: '🎵',
                    title: c.titulo,
                    meta: c.albumes ? c.albumes.titulo : 'Sin álbum',
                    img: c.imagen_url || (c.albumes ? c.albumes.imagen_url : '') || '',
                    id: c.id,
                    albumId: null
                });
            }
        }

        /* Álbumes */
        for (var i = 0; i < searchCache.albumes.length; i++) {
            var a = searchCache.albumes[i];
            if (a.titulo.toLowerCase().indexOf(q) >= 0) {
                var cnt = a.canciones ? a.canciones.length : 0;
                results.push({
                    type: 'album',
                    typeLabel: 'Álbum',
                    typeClass: 'type-album',
                    icon: '💿',
                    title: a.titulo,
                    meta: cnt + ' canciones',
                    img: a.imagen_url || '',
                    id: a.id
                });
            }
        }

        /* Beats/Canciones Marketplace */
        for (var i = 0; i < searchCache.beats.length; i++) {
            var b = searchCache.beats[i];
            if (b.titulo.toLowerCase().indexOf(q) >= 0) {
                results.push({
                    type: 'beat',
                    typeLabel: b.tipo === 'cancion' ? 'Marketplace' : 'Beat',
                    typeClass: 'type-beat',
                    icon: b.tipo === 'cancion' ? '🎤' : '🎹',
                    title: b.titulo,
                    meta: K.formatPrice(b.precio),
                    img: b.imagen_url || '',
                    id: b.id
                });
            }
        }

        /* Noticias */
        for (var i = 0; i < searchCache.noticias.length; i++) {
            var n = searchCache.noticias[i];
            if (n.titulo.toLowerCase().indexOf(q) >= 0) {
                results.push({
                    type: 'noticia',
                    typeLabel: 'Noticia',
                    typeClass: 'type-noticia',
                    icon: '📰',
                    title: n.titulo,
                    meta: 'Noticia',
                    img: n.imagen_url || '',
                    id: n.id
                });
            }
        }

        /* Videos */
        for (var i = 0; i < searchCache.videos.length; i++) {
            var v = searchCache.videos[i];
            if (v.titulo.toLowerCase().indexOf(q) >= 0) {
                results.push({
                    type: 'video',
                    typeLabel: 'Video',
                    typeClass: 'type-video',
                    icon: '🎬',
                    title: v.titulo,
                    meta: 'Video',
                    img: v.thumbnail_url || '',
                    id: v.id
                });
            }
        }

        renderResults(results, q);
    }

    /* ══════════════════════════════════════════
       🎨 RENDERIZAR RESULTADOS
       ══════════════════════════════════════════ */
    function renderResults(results, query) {
        if (!results.length) {
            searchResults.innerHTML =
                '<div class="search-no-results">' +
                '<div class="search-no-results-icon">🔍</div>' +
                '<div class="search-no-results-text">Sin resultados para "' + escapeHtml(query) + '"</div>' +
                '</div>';
            searchResults.classList.add('show');
            return;
        }

        /* Agrupar por tipo */
        var groups = {};
        var order = ['cancion', 'album', 'beat', 'noticia', 'video'];
        var labels = {
            cancion: '🎵 Canciones',
            album: '💿 Álbumes',
            beat: '🛒 Marketplace',
            noticia: '📰 Noticias',
            video: '🎬 Videos'
        };

        for (var i = 0; i < results.length; i++) {
            var r = results[i];
            if (!groups[r.type]) groups[r.type] = [];
            groups[r.type].push(r);
        }

        var h = '';
        for (var j = 0; j < order.length; j++) {
            var type = order[j];
            if (!groups[type]) continue;
            var items = groups[type].slice(0, 5); /* Max 5 por categoría */

            h += '<div class="search-section-label">' + labels[type] + ' (' + groups[type].length + ')</div>';

            for (var k = 0; k < items.length; k++) {
                var item = items[k];
                var imgHtml = item.img
                    ? '<img src="' + item.img + '" alt="" onerror="this.style.display=\'none\';this.parentNode.textContent=\'' + item.icon + '\'">'
                    : item.icon;

                h += '<div class="search-item" data-type="' + item.type + '" data-id="' + item.id + '" onclick="window._searchGo(\'' + item.type + '\',\'' + item.id + '\')">';
                h += '<div class="search-item-icon">' + imgHtml + '</div>';
                h += '<div class="search-item-info">';
                h += '<div class="search-item-title">' + highlightMatch(item.title, searchInput.value) + '</div>';
                h += '<div class="search-item-meta">' + item.meta + '</div>';
                h += '</div>';
                h += '<span class="search-item-type ' + item.typeClass + '">' + item.typeLabel + '</span>';
                h += '</div>';
            }
        }

        searchResults.innerHTML = h;
        searchResults.classList.add('show');
    }

    /* ══════════════════════════════════════════
       🚀 NAVEGAR AL RESULTADO
       ══════════════════════════════════════════ */
    window._searchGo = function (type, id) {
        searchResults.classList.remove('show');
        searchInput.value = '';
        searchClear.classList.remove('show');

        if (type === 'album') {
            K.showPanel('albumes');
            setTimeout(function () { window._openAlbum(id); }, 200);
        } else if (type === 'cancion') {
            K.showPanel('canciones');
            /* Buscar índice en todas las canciones y reproducir */
            db.from('canciones').select('*,albumes(titulo,imagen_url)').order('created_at', { ascending: false }).then(function (r) {
                if (r.data) {
                    K.currentPlaylist = r.data.map(function (s) {
                        return {
                            id: s.id, titulo: s.titulo, archivo_url: s.archivo_url,
                            imagen_url: s.imagen_url || (s.albumes ? s.albumes.imagen_url : '') || '',
                            duracion: s.duracion, reproducciones: s.reproducciones
                        };
                    });
                    K.currentAlbumCover = '';
                    for (var i = 0; i < K.currentPlaylist.length; i++) {
                        if (K.currentPlaylist[i].id === id) {
                            window._playTrack(i);
                            break;
                        }
                    }
                }
            });
        } else if (type === 'beat') {
            K.showPanel('marketplace');
            setTimeout(function () { window._openMarketDetail(id); }, 300);
        } else if (type === 'noticia') {
            K.showPanel('inicio');
            setTimeout(function () { window._openNoticia(id); }, 200);
        } else if (type === 'video') {
            K.showPanel('videos');
            setTimeout(function () { window._openVideoPlayer(id); }, 200);
        }
    };

    /* ══════════════════════════════════════════
       🛠️ HELPERS
       ══════════════════════════════════════════ */
    function highlightMatch(text, query) {
        if (!query) return escapeHtml(text);
        var escaped = escapeHtml(text);
        var q = escapeHtml(query.trim());
        var regex = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
        return escaped.replace(regex, '<strong style="color:var(--plata-blanca);">$1</strong>');
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /* Refrescar caché cuando cambian datos */
    K.refreshSearchCache = function () {
        cacheLoaded = false;
        loadSearchCache();
    };

    /* ══════════════════════════════════════════
       🎧 EVENTOS
       ══════════════════════════════════════════ */
    searchInput.addEventListener('focus', function () {
        loadSearchCache();
    });

    searchInput.addEventListener('input', function () {
        var val = this.value.trim();

        if (val.length > 0) {
            searchClear.classList.add('show');
        } else {
            searchClear.classList.remove('show');
            searchResults.classList.remove('show');
        }

        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(function () {
            search(val);
        }, 250);
    });

    searchClear.addEventListener('click', function () {
        searchInput.value = '';
        searchClear.classList.remove('show');
        searchResults.classList.remove('show');
        searchInput.focus();
    });

    /* Cerrar al hacer click fuera */
    document.addEventListener('click', function (e) {
        var wrapper = document.getElementById('searchWrapper');
        if (!wrapper.contains(e.target)) {
            searchResults.classList.remove('show');
        }
    });

    /* Tecla ESC para cerrar */
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            searchResults.classList.remove('show');
            searchInput.blur();
        }
    });

})();