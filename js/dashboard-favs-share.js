/* ============================================
   ❤️ DASHBOARD-FAVS-SHARE.JS — KXON
   Favoritos / Likes + Compartir en Redes
   FIX: Columnas separadas cancion, album, beat
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
       ══════════════════════════════════════════ */
    var debounceTimer = null;
    function debouncedInject() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(injectFavShare, 150);
    }

    var contentArea = document.querySelector('.content-area');
    if (contentArea) {
        var observer = new MutationObserver(function () {
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
       ❤️ PANEL FAVORITOS
       ══════════════════════════════════════════ */
    var favsTab = 'todos';

    window._favsTab = function (tab) {
        favsTab = tab;
        var tabs = document.querySelectorAll('[data-favs-tab]');
        for (var i = 0; i < tabs.length; i++) {
            tabs[i].classList.remove('active');
            if (tabs[i].getAttribute('data-favs-tab') === tab) tabs[i].classList.add('active');
        }
        loadFavsPanel();
    };

    async function loadFavsPanel() {
        var c = document.getElementById('favsContent');
        var statEl = document.getElementById('favsStat');
        if (!c) return;
        c.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><div class="empty-title">Cargando...</div></div>';

        try {
            var query = db.from('favoritos')
                .select('*')
                .eq('usuario_id', K.currentUser.id)
                .order('created_at', { ascending: false });

            if (favsTab !== 'todos') query = query.eq('tipo', favsTab);

            var r = await query;
            if (r.error) throw r.error;
            var favs = r.data || [];

            if (statEl) statEl.textContent = favs.length + ' favorito' + (favs.length !== 1 ? 's' : '');

            if (!favs.length) {
                c.innerHTML = '<div class="empty-state"><div class="empty-icon">❤️</div><div class="empty-title">Sin favoritos aún</div><div class="empty-text">Dale like a canciones, álbumes, videos y más</div></div>';
                return;
            }

            // Agrupar por tipo y obtener el ID correcto de cada columna
            var byType = {};
            for (var i = 0; i < favs.length; i++) {
                var fav = favs[i];
                var tipo = fav.tipo;
                var col = getColumn(tipo);
                var itemId = fav[col];
                if (!itemId) continue;
                if (!byType[tipo]) byType[tipo] = [];
                byType[tipo].push(itemId);
                // Guardar itemId en el objeto fav para uso posterior
                fav._itemId = itemId;
            }

            var details = {};
            var tableMap = { cancion: 'canciones', album: 'albumes', beat: 'beats', video: 'videos', documental: 'documentales', noticia: 'noticias' };

            for (var tipo in byType) {
                var table = tableMap[tipo];
                if (!table) continue;
                var cols = 'id, titulo';
                if (tipo === 'cancion') cols += ', imagen_url';
                else if (tipo === 'album') cols += ', imagen_url';
                else if (tipo === 'beat') cols += ', imagen_url, precio';
                else if (tipo === 'video') cols += ', thumbnail_url';
                else if (tipo === 'documental') cols += ', imagen_url';
                else if (tipo === 'noticia') cols += ', imagen_url';

                var dr = await db.from(table).select(cols).in('id', byType[tipo]);
                if (dr.data) {
                    for (var j = 0; j < dr.data.length; j++) {
                        details[tipo + '_' + dr.data[j].id] = dr.data[j];
                        details[tipo + '_' + dr.data[j].id]._tipo = tipo;
                    }
                }
            }

            var icons = { cancion: '🎵', album: '💿', beat: '🎹', video: '🎬', documental: '🎞️', noticia: '📰' };
            var labels = { cancion: 'Canción', album: 'Álbum', beat: 'Beat', video: 'Video', documental: 'Documental', noticia: 'Noticia' };

            var h = '';
            for (var k = 0; k < favs.length; k++) {
                var f = favs[k];
                var fItemId = f._itemId;
                if (!fItemId) continue;
                var item = details[f.tipo + '_' + fItemId];
                if (!item) continue;

                var img = item.imagen_url || item.thumbnail_url || 'https://placehold.co/400x400/111/333?text=' + (icons[f.tipo] || '♪');
                var titulo = item.titulo || 'Sin título';

                h += '<div class="card" onclick="window._openFavItem(\'' + f.tipo + '\',\'' + fItemId + '\')">';
                h += '<div class="card-img square"><img src="' + img + '" alt="" onerror="this.src=\'https://placehold.co/400x400/111/333?text=♪\'">';
                h += '<div class="card-overlay"><div class="card-overlay-icon">' + (icons[f.tipo] || '❤️') + '</div></div>';
                h += '</div><div class="card-body">';
                h += '<div class="card-title">' + titulo + '</div>';
                h += '<div class="card-subtitle">' + (icons[f.tipo] || '') + ' ' + (labels[f.tipo] || f.tipo) + '</div>';
                h += '</div>';
                h += favShareCardHTML(f.tipo, fItemId, titulo);
                h += '</div>';
            }
            c.innerHTML = h;

        } catch (e) {
            console.error('Error panel favoritos:', e);
            c.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Error al cargar</div></div>';
        }
    }

    window._openFavItem = function (tipo, itemId) {
        switch (tipo) {
            case 'cancion': K.showPanel('canciones'); break;
            case 'album': K.showPanel('albumes'); window._openAlbum(itemId); break;
            case 'beat': K.showPanel('marketplace'); setTimeout(function () { window._openMarketDetail(itemId); }, 300); break;
            case 'video': window._openVideoPlayer(itemId); break;
            case 'documental': K.showPanel('documentales'); window._openDocu(itemId); break;
            case 'noticia': window._openNoticia(itemId); break;
        }
    };

    /* ══════════════════════════════════════════
       🔄 EXPONER loadFavsPanel para showPanel
       ══════════════════════════════════════════ */
    K.loadFavsPanel = loadFavsPanel;
    K.updatePlayerFavState = updatePlayerFavState;
    K.updateRadioFavState = updateRadioFavState;

})();