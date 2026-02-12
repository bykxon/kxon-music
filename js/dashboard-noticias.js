/* ============================================
   📰 DASHBOARD-NOTICIAS.JS — KXON
   Noticias: carga, render, CRUD, detalle
   + Sistema de "Limpiar/Marcar como visto"
   ============================================ */
(function () {

    var db = window.db;
    var K = window.KXON;

    /* ══════════════════════════════════════════
       📅 SISTEMA "MARCAR COMO VISTO"
       Guarda en localStorage la fecha de la última
       vez que el usuario limpió cada sección.
       Solo muestra contenido más reciente.
       ══════════════════════════════════════════ */
    function getLastSeen(section) {
        try {
            var key = 'kxon_seen_' + section + '_' + (K.currentUser ? K.currentUser.id : 'anon');
            var val = localStorage.getItem(key);
            return val || null;
        } catch (e) { return null; }
    }

    function setLastSeen(section) {
        try {
            var key = 'kxon_seen_' + section + '_' + (K.currentUser ? K.currentUser.id : 'anon');
            localStorage.setItem(key, new Date().toISOString());
        } catch (e) { }
    }

    function filterByLastSeen(items, section, dateField) {
        var lastSeen = getLastSeen(section);
        if (!lastSeen) return items;
        var seenDate = new Date(lastSeen);
        return items.filter(function (item) {
            return new Date(item[dateField || 'created_at']) > seenDate;
        });
    }

    /* ══════════════════════════════════════════
       🧹 FUNCIONES GLOBALES PARA LIMPIAR
       ══════════════════════════════════════════ */
    window._clearSection = function (section) {
        setLastSeen(section);
        K.showToast('✓ Sección limpiada', 'success');
        // Re-renderizar el inicio
        K.renderInicio();
    };

    window._clearAllSections = function () {
        setLastSeen('noticias');
        setLastSeen('canciones');
        setLastSeen('albumes');
        K.showToast('✓ Todo limpiado', 'success');
        K.renderInicio();
    };

    /* ══════════════════════════════════════════
       🏠 RENDERIZAR PANEL INICIO CON FILTRO
       ══════════════════════════════════════════ */
    K.renderInicio = async function () {
        try {
            // Cargar datos frescos
            var rn = await db.from('noticias').select('*').order('created_at', { ascending: false });
            var rc = await db.from('canciones').select('*, albumes(titulo, imagen_url)').order('created_at', { ascending: false });
            var ra = await db.from('albumes').select('*, canciones(id)').order('created_at', { ascending: false });

            var allNoticias = (rn.data || []);
            var allCanciones = (rc.data || []);
            var allAlbumes = (ra.data || []);

            K.allNoticiasData = allNoticias;

            // Filtrar por "último visto"
            var noticiasNuevas = filterByLastSeen(allNoticias, 'noticias');
            var cancionesNuevas = filterByLastSeen(allCanciones, 'canciones');
            var albumesNuevos = filterByLastSeen(allAlbumes, 'albumes');

            // Renderizar secciones con headers
            renderSeccionInicio(
                'inicioNoticiasWrap',
                '📰 Últimas Noticias',
                'noticias',
                noticiasNuevas.length,
                allNoticias.length
            );
            renderSeccionInicio(
                'inicioCancionesWrap',
                '🎵 Canciones Recientes',
                'canciones',
                cancionesNuevas.length,
                allCanciones.length
            );
            renderSeccionInicio(
                'inicioAlbumesWrap',
                '💿 Últimos Álbumes',
                'albumes',
                albumesNuevos.length,
                allAlbumes.length
            );

            // Renderizar contenido
            renderNoticias(noticiasNuevas.slice(0, 6), 'inicioNoticias');
            renderInicioCanciones(cancionesNuevas.slice(0, 5), 'inicioCanciones');
            renderInicioAlbumes(albumesNuevos.slice(0, 5), 'inicioAlbumes');

            // Botón global limpiar
            renderGlobalClearBtn(noticiasNuevas.length + cancionesNuevas.length + albumesNuevos.length);

        } catch (e) { console.error('Error renderInicio:', e); }
    };

    function renderSeccionInicio(wrapId, titulo, section, newCount, totalCount) {
        var wrap = document.getElementById(wrapId);
        if (!wrap) return;

        var headerEl = wrap.querySelector('.inicio-section-header');
        if (!headerEl) {
            headerEl = document.createElement('div');
            headerEl.className = 'inicio-section-header';
            wrap.insertBefore(headerEl, wrap.firstChild);
        }

        var h = '<div class="inicio-section-title-row">';
        h += '<span class="panel-section-title" style="margin-bottom:0">' + titulo + '</span>';
        if (newCount > 0) {
            h += '<span class="inicio-new-badge">' + newCount + ' nuevo' + (newCount > 1 ? 's' : '') + '</span>';
        }
        h += '</div>';

        if (newCount > 0) {
            h += '<button class="inicio-clear-btn" onclick="window._clearSection(\'' + section + '\')">';
            h += '<span>✓</span> Marcar como visto';
            h += '</button>';
        } else {
            h += '<span class="inicio-all-seen">✓ Todo al día</span>';
        }

        headerEl.innerHTML = h;
    }

    function renderGlobalClearBtn(totalNew) {
        var container = document.getElementById('inicioClearAllWrap');
        if (!container) return;

        if (totalNew > 0) {
            container.innerHTML = '<button class="inicio-clear-all-btn" onclick="window._clearAllSections()">'
                + '🧹 Limpiar todo (' + totalNew + ' nuevo' + (totalNew > 1 ? 's' : '') + ')'
                + '</button>';
            container.style.display = 'block';
        } else {
            container.innerHTML = '<div class="inicio-all-clear">'
                + '<span class="inicio-all-clear-icon">✨</span>'
                + '<span class="inicio-all-clear-text">Estás al día — No hay contenido nuevo</span>'
                + '</div>';
            container.style.display = 'block';
        }
    }

    /* ══════════════════════════════════════════
       📰 CARGAR NOTICIAS
       ══════════════════════════════════════════ */
    K.loadNoticias = async function () {
        try {
            var r = await db.from('noticias').select('*').order('created_at', { ascending: false });
            if (r.error) throw r.error;
            K.allNoticiasData = r.data || [];

            // Si estamos en el panel inicio, usar renderInicio
            var inicioPanel = document.getElementById('panel-inicio');
            if (inicioPanel && inicioPanel.classList.contains('active')) {
                K.renderInicio();
            } else {
                // Fallback: render directo (por si se llama desde otro lugar)
                renderNoticias(K.allNoticiasData.slice(0, 6), 'inicioNoticias');
            }
        } catch (e) { console.error(e); }
    };

    function renderNoticias(noticias, cid) {
        var c = document.getElementById(cid);
        if (!c) return;
        if (!noticias || !noticias.length) {
            c.innerHTML = '<div class="empty-state empty-state-sm"><div class="empty-icon">📰</div><div class="empty-title">Sin noticias nuevas</div><div class="empty-text">Cuando el admin publique algo, aparecerá aquí</div></div>';
            return;
        }
        var h = '';
        for (var i = 0; i < noticias.length; i++) {
            var n = noticias[i];
            var img = n.imagen_url || 'https://placehold.co/600x300/111/333?text=KXON+NEWS';
            var fecha = new Date(n.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
            h += '<div class="card" onclick="window._openNoticia(\'' + n.id + '\')">';
            h += '<div class="card-img"><img src="' + img + '" alt="" onerror="this.src=\'https://placehold.co/600x300/111/333?text=KXON\'">';
            if (K.isAdmin) h += '<button class="card-admin-delete visible" onclick="event.stopPropagation();window._deleteNoticia(\'' + n.id + '\')">✕</button>';
            h += '</div><div class="card-body"><div class="card-title">' + n.titulo + '</div><div class="card-subtitle">' + fecha + '</div><div class="card-read-more">Leer más →</div></div></div>';
        }
        c.innerHTML = h;
    }

    /* ══════════════════════════════════════════
       🎵 RENDER CANCIONES EN INICIO (con filtro)
       ══════════════════════════════════════════ */
    function renderInicioCanciones(canciones, cid) {
        var c = document.getElementById(cid);
        if (!c) return;
        if (!canciones || !canciones.length) {
            c.innerHTML = '<div class="empty-state empty-state-sm"><div class="empty-icon">🎵</div><div class="empty-title">Sin canciones nuevas</div><div class="empty-text">Las nuevas canciones aparecerán aquí</div></div>';
            return;
        }
        var h = '';
        for (var i = 0; i < canciones.length; i++) {
            var s = canciones[i];
            var albumName = s.albumes ? s.albumes.titulo : 'Sin álbum';
            var coverImg = s.imagen_url || (s.albumes ? s.albumes.imagen_url : '') || '';
            h += '<div class="track-item" onclick="window._playFromAll(' + i + ',\'' + cid + '\')">';
            h += '<span class="track-num">' + (i + 1) + '</span>';
            if (coverImg) { h += '<div class="track-cover"><img src="' + coverImg + '" alt=""></div>'; }
            else { h += '<button class="track-play-btn">▶</button>'; }
            h += '<div class="track-info"><div class="track-title">' + s.titulo + '</div><div class="track-album-name">' + albumName + '</div></div>';
            h += '<span class="track-duration">' + (s.duracion || '--:--') + '</span>';
            h += '</div>';
        }
        c.innerHTML = h;
    }

    /* ══════════════════════════════════════════
       💿 RENDER ÁLBUMES EN INICIO (con filtro)
       ══════════════════════════════════════════ */
    function renderInicioAlbumes(albums, cid) {
        var c = document.getElementById(cid);
        if (!c) return;
        if (!albums || !albums.length) {
            c.innerHTML = '<div class="empty-state empty-state-sm"><div class="empty-icon">💿</div><div class="empty-title">Sin álbumes nuevos</div><div class="empty-text">Los nuevos álbumes aparecerán aquí</div></div>';
            return;
        }
        var h = '';
        for (var i = 0; i < albums.length; i++) {
            var a = albums[i];
            var img = a.imagen_url || 'https://placehold.co/400x400/111/333?text=♪';
            var cnt = a.canciones ? a.canciones.length : 0;
            h += '<div class="card" onclick="window._openAlbum(\'' + a.id + '\')">';
            h += '<div class="card-img square"><img src="' + img + '" alt="" onerror="this.src=\'https://placehold.co/400x400/111/333?text=♪\'">';
            h += '<div class="card-overlay"><div class="card-overlay-icon">▶</div></div>';
            h += '</div><div class="card-body"><div class="card-title">' + a.titulo + '</div><div class="card-subtitle">♪ ' + cnt + ' canciones</div></div></div>';
        }
        c.innerHTML = h;
    }

    /* ══════════════════════════════════════════
       📰 ABRIR NOTICIA DETALLE
       ══════════════════════════════════════════ */
    window._openNoticia = async function (nid) {
        try {
            var r = await db.from('noticias').select('*').eq('id', nid).single();
            if (r.error) throw r.error;
            var n = r.data;
            document.getElementById('noticiaDetalleTitulo').textContent = n.titulo;
            document.getElementById('noticiaDetalleDesc').textContent = n.descripcion;
            var fecha = new Date(n.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
            document.getElementById('noticiaDetalleFecha').textContent = fecha;
            var imgWrap = document.getElementById('noticiaDetalleImgWrap');
            var imgEl = document.getElementById('noticiaDetalleImg');
            if (n.imagen_url) { imgEl.src = n.imagen_url; imgWrap.style.display = 'block'; }
            else { imgWrap.style.display = 'none'; }
            document.getElementById('modalNoticiaDetalle').classList.add('show');
        } catch (e) { console.error(e); K.showToast('Error al cargar noticia', 'error'); }
    };

    /* ══════════════════════════════════════════
       📰 ELIMINAR NOTICIA
       ══════════════════════════════════════════ */
    window._deleteNoticia = async function (nid) {
        if (!confirm('¿Eliminar esta noticia?')) return;
        try {
            var r = await db.from('noticias').delete().eq('id', nid);
            if (r.error) throw r.error;
            K.showToast('Noticia eliminada', 'success');
            K.loadNoticias(); K.loadStats();
        } catch (e) { K.showToast('Error: ' + e.message, 'error'); }
    };

    /* ══════════════════════════════════════════
       📰 CREAR NOTICIA
       ══════════════════════════════════════════ */
    K._selectedNoticiaFile = null;

    document.getElementById('noticiaCoverFile').addEventListener('change', function (e) {
        var f = e.target.files[0]; if (!f) return;
        K._selectedNoticiaFile = f;
        document.getElementById('noticiaCoverArea').classList.add('has-file');
        document.getElementById('noticiaCoverArea').querySelector('.file-upload-text').textContent = f.name;
        var rd = new FileReader();
        rd.onload = function (ev) {
            document.getElementById('noticiaCoverImg').src = ev.target.result;
            document.getElementById('noticiaCoverPreview').classList.add('show');
        };
        rd.readAsDataURL(f);
    });

    document.getElementById('formNoticia').addEventListener('submit', async function (e) {
        e.preventDefault();
        var titulo = document.getElementById('noticiaTitulo').value.trim();
        var desc = document.getElementById('noticiaDesc').value.trim();
        if (!titulo || !desc) { K.showToast('Completa título y descripción', 'error'); return; }

        var btn = document.getElementById('btnNoticiaSubmit');
        btn.classList.add('loading'); btn.disabled = true;

        try {
            var imageUrl = '';
            if (K._selectedNoticiaFile) {
                var fn = Date.now() + '_' + K._selectedNoticiaFile.name.replace(/[^a-zA-Z0-9._-]/g, '');
                var up = await db.storage.from('imagenes').upload('noticias/' + fn, K._selectedNoticiaFile, { contentType: K._selectedNoticiaFile.type });
                if (up.error) throw up.error;
                imageUrl = db.storage.from('imagenes').getPublicUrl('noticias/' + fn).data.publicUrl;
            }
            var ins = await db.from('noticias').insert({ titulo: titulo, descripcion: desc, imagen_url: imageUrl, autor_id: K.currentUser.id });
            if (ins.error) throw ins.error;
            K.showToast('¡Noticia publicada!', 'success');
            K.closeModal('modalNoticia');
            K.loadNoticias(); K.loadStats();
        } catch (e2) { console.error(e2); K.showToast('Error: ' + e2.message, 'error'); }
        btn.classList.remove('loading'); btn.disabled = false;
    });

})();