/* ============================================
   🎬 DASHBOARD-VIDEOS.JS — KXON
   Videos y Documentales: carga, render, CRUD,
   reproductor, episodios
   ============================================ */
(function () {

    var db = window.db;
    var K = window.KXON;

    /* ══════════════════════════════════════════
       🎬 CARGAR VIDEOS
       ══════════════════════════════════════════ */
    K.loadVideos = async function () {
        try {
            var r = await db.from('videos').select('*').order('created_at', { ascending: false });
            if (r.error) throw r.error;
            K.allVideosData = r.data || [];
            renderVideosGrid();
        } catch (e) {
            console.error('Error cargando videos:', e);
            document.getElementById('videosGrid').innerHTML =
                '<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Error al cargar videos</div></div>';
        }
    };

    function renderVideosGrid() {
        var c = document.getElementById('videosGrid');
        if (!K.allVideosData || !K.allVideosData.length) {
            c.innerHTML = '<div class="empty-state"><div class="empty-icon">🎬</div><div class="empty-title">Sin videos aún</div><div class="empty-text">Los videos se mostrarán aquí cuando se publiquen</div></div>';
            return;
        }
        var h = '';
        for (var i = 0; i < K.allVideosData.length; i++) {
            var v = K.allVideosData[i];
            var thumb = v.thumbnail_url || 'https://placehold.co/640x360/111/333?text=🎬+KXON';
            var fecha = new Date(v.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
            var views = v.visualizaciones || 0;

            h += '<div class="video-card" onclick="window._openVideoPlayer(\'' + v.id + '\')">';
            h += '<div class="video-card-thumb">';
            h += '<img src="' + thumb + '" alt="" onerror="this.src=\'https://placehold.co/640x360/111/333?text=🎬\'">';
            h += '<div class="video-card-play-overlay"><div class="video-card-play-icon">▶</div></div>';
            h += '<span class="video-card-views">👁 ' + views + '</span>';
            if (K.isAdmin) h += '<button class="video-card-admin-del visible" onclick="event.stopPropagation();window._deleteVideo(\'' + v.id + '\')">✕</button>';
            h += '</div>';
            h += '<div class="video-card-body">';
            h += '<div class="video-card-title">' + v.titulo + '</div>';
            h += '<div class="video-card-desc">' + (v.descripcion || '') + '</div>';
            h += '<div class="video-card-fecha">📅 ' + fecha + '</div>';
            h += '</div></div>';
        }
        c.innerHTML = h;
    }

    /* ══════════════════════════════════════════
       ▶ REPRODUCTOR DE VIDEO
       ══════════════════════════════════════════ */
    window._openVideoPlayer = function (vid) {
        var video = K.allVideosData.find(function (x) { return x.id === vid; });

        /* Puede ser un episodio */
        if (!video && K.allEpisodiosData) {
            video = K.allEpisodiosData.find(function (x) { return x.id === vid; });
        }
        if (!video) return;

        /* Pausar otros audios */
        K.audioEl.pause();
        K.marketPreviewAudio.pause();
        K.archivoPreviewAudio.pause();
        K.radioAudio.pause();

        document.getElementById('videoPlayerTitle').textContent = video.titulo;
        document.getElementById('videoPlayerDesc').textContent = video.descripcion || '';
        document.getElementById('videoPlayerViews').textContent = '👁 ' + (video.visualizaciones || 0) + ' vistas';
        var fecha = new Date(video.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
        document.getElementById('videoPlayerDate').textContent = '📅 ' + fecha;

        var playerEl = document.getElementById('videoPlayerEl');
        playerEl.src = video.video_url;
        playerEl.load();

        document.getElementById('videoPlayerOverlay').classList.add('show');

        setTimeout(function () { playerEl.play().catch(function () { }); }, 300);

            /* ✅ FIX: Update views con RPC atómico */
        var tabla = video.documental_id ? 'episodios' : 'videos';
        db.rpc('increment_visualizaciones', { video_id: video.id, tabla: tabla }).then(function(r) {
            if (r.error) console.warn('Error updating views:', r.error.message);
            else console.log('✅ Vista registrada:', video.titulo);
        });
    };

    /* ── Cerrar reproductor ── */
    document.getElementById('videoPlayerCloseBtn').addEventListener('click', function () {
        var playerEl = document.getElementById('videoPlayerEl');
        playerEl.pause();
        playerEl.src = '';
        document.getElementById('videoPlayerOverlay').classList.remove('show');
        document.getElementById('videoPlayerWrapper').classList.remove('fullscreen-active');
    });

    document.getElementById('videoPlayerOverlay').addEventListener('click', function (e) {
        if (e.target === this) {
            var playerEl = document.getElementById('videoPlayerEl');
            playerEl.pause();
            playerEl.src = '';
            this.classList.remove('show');
            document.getElementById('videoPlayerWrapper').classList.remove('fullscreen-active');
        }
    });

    /* ── Pantalla completa ── */
    document.getElementById('videoFullscreenBtn').addEventListener('click', function () {
        var wrapper = document.getElementById('videoPlayerWrapper');
        var videoEl = document.getElementById('videoPlayerEl');

        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else if (videoEl.requestFullscreen) {
            videoEl.requestFullscreen();
        } else if (videoEl.webkitRequestFullscreen) {
            videoEl.webkitRequestFullscreen();
        } else if (videoEl.webkitEnterFullscreen) {
            videoEl.webkitEnterFullscreen();
        } else {
            wrapper.classList.toggle('fullscreen-active');
        }
    });

    /* ── Eliminar video ── */
    window._deleteVideo = async function (vid) {
        if (!confirm('¿Eliminar este video permanentemente?')) return;
        try {
            var r = await db.from('videos').delete().eq('id', vid);
            if (r.error) throw r.error;
            K.showToast('Video eliminado', 'success');
            K.loadVideos();
        } catch (e) { K.showToast('Error: ' + e.message, 'error'); }
    };

    /* ══════════════════════════════════════════
       🎬 CREAR VIDEO (ADMIN)
       ══════════════════════════════════════════ */
    K._videoThumbFileSelected = null;
    K._videoFileSelected = null;

    document.getElementById('videoThumbFile').addEventListener('change', function (e) {
        var f = e.target.files[0]; if (!f) return;
        K._videoThumbFileSelected = f;
        document.getElementById('videoThumbArea').classList.add('has-file');
        document.getElementById('videoThumbArea').querySelector('.file-upload-text').textContent = f.name;
        var rd = new FileReader();
        rd.onload = function (ev) {
            document.getElementById('videoThumbImg').src = ev.target.result;
            document.getElementById('videoThumbPreview').classList.add('show');
        };
        rd.readAsDataURL(f);
    });

    document.getElementById('videoFileInput').addEventListener('change', function (e) {
        var f = e.target.files[0]; if (!f) return;
        K._videoFileSelected = f;
        document.getElementById('videoFileArea').classList.add('has-file');
        document.getElementById('videoFileArea').querySelector('.file-upload-text').textContent = f.name;
    });

    document.getElementById('formVideo').addEventListener('submit', async function (e) {
        e.preventDefault();
        var titulo = document.getElementById('videoTitulo').value.trim();
        var desc = document.getElementById('videoDesc').value.trim();
        if (!titulo) { K.showToast('Ingresa un título', 'error'); return; }
        if (!K._videoFileSelected) { K.showToast('Selecciona un archivo de video', 'error'); return; }

        var btn = document.getElementById('btnVideoSubmit');
        btn.classList.add('loading'); btn.disabled = true;
        var prog = document.getElementById('videoUploadProgress');
        prog.classList.add('show');
        document.getElementById('videoUploadText').textContent = 'Subiendo thumbnail...';
        document.getElementById('videoUploadFill').style.width = '10%';

        try {
            var thumbUrl = '';
            if (K._videoThumbFileSelected) {
                var fn = Date.now() + '_vthumb_' + K._videoThumbFileSelected.name.replace(/[^a-zA-Z0-9._-]/g, '');
                var up = await db.storage.from('imagenes').upload('videos/' + fn, K._videoThumbFileSelected, { contentType: K._videoThumbFileSelected.type });
                if (up.error) throw up.error;
                thumbUrl = db.storage.from('imagenes').getPublicUrl('videos/' + fn).data.publicUrl;
            }
            document.getElementById('videoUploadFill').style.width = '25%';

            document.getElementById('videoUploadText').textContent = 'Subiendo video... (puede tardar)';
            var fn2 = Date.now() + '_vid_' + K._videoFileSelected.name.replace(/[^a-zA-Z0-9._-]/g, '');
            var up2 = await db.storage.from('videos').upload('clips/' + fn2, K._videoFileSelected, { contentType: K._videoFileSelected.type });
            if (up2.error) throw up2.error;
            var videoUrl = db.storage.from('videos').getPublicUrl('clips/' + fn2).data.publicUrl;
            document.getElementById('videoUploadFill').style.width = '85%';

            document.getElementById('videoUploadText').textContent = 'Guardando...';
            var ins = await db.from('videos').insert({
                titulo: titulo, descripcion: desc, video_url: videoUrl,
                thumbnail_url: thumbUrl, autor_id: K.currentUser.id
            });
            if (ins.error) throw ins.error;

            document.getElementById('videoUploadFill').style.width = '100%';
            document.getElementById('videoUploadText').textContent = '¡Completado!';
            K.showToast('¡Video publicado!', 'success');
            K.closeModal('modalVideo');
            K.loadVideos();
        } catch (e2) { console.error(e2); K.showToast('Error: ' + e2.message, 'error'); }
        btn.classList.remove('loading'); btn.disabled = false;
        setTimeout(function () { prog.classList.remove('show'); document.getElementById('videoUploadFill').style.width = '0%'; }, 1500);
    });

    /* ══════════════════════════════════════════
       🎞️ DOCUMENTALES
       ══════════════════════════════════════════ */
    K.loadDocumentales = async function () {
        try {
            var r = await db.from('documentales').select('*, episodios(id)').order('created_at', { ascending: false });
            if (r.error) throw r.error;
            K.allDocuData = r.data || [];
            renderDocuGrid();
        } catch (e) {
            console.error('Error cargando documentales:', e);
            document.getElementById('docuGrid').innerHTML =
                '<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Error al cargar</div></div>';
        }
    };

    function renderDocuGrid() {
        var c = document.getElementById('docuGrid');
        if (!K.allDocuData || !K.allDocuData.length) {
            c.innerHTML = '<div class="empty-state"><div class="empty-icon">🎞️</div><div class="empty-title">Sin documentales aún</div></div>';
            return;
        }
        var h = '';
        for (var i = 0; i < K.allDocuData.length; i++) {
            var d = K.allDocuData[i];
            var img = d.imagen_url || 'https://placehold.co/400x250/111/333?text=🎞️+KXON';
            var numEps = d.episodios ? d.episodios.length : 0;

            h += '<div class="docu-card" onclick="window._openDocu(\'' + d.id + '\')">';
            h += '<div class="docu-card-img">';
            h += '<img src="' + img + '" alt="" onerror="this.src=\'https://placehold.co/400x250/111/333?text=🎞️\'">';
            h += '<div class="docu-card-overlay"><div class="docu-card-overlay-icon">▶</div></div>';
            h += '<span class="docu-card-eps-badge">' + numEps + ' episodios</span>';
            if (K.isAdmin) h += '<button class="docu-card-admin-del visible" onclick="event.stopPropagation();window._deleteDocu(\'' + d.id + '\')">✕</button>';
            h += '</div>';
            h += '<div class="docu-card-body">';
            h += '<div class="docu-card-title">' + d.titulo + '</div>';
            h += '<div class="docu-card-desc">' + (d.descripcion || 'Sin descripción') + '</div>';
            h += '</div></div>';
        }
        c.innerHTML = h;
    }

    /* ── Abrir detalle documental ── */
    window._openDocu = async function (docId) {
        K.currentDocuId = docId;
        try {
            var r = await db.from('documentales').select('*').eq('id', docId).single();
            if (r.error) throw r.error;
            var docu = r.data;
            K.currentDocuCover = docu.imagen_url || 'https://placehold.co/400x250/111/333?text=🎞️';

            document.getElementById('docuDetailTitle').textContent = docu.titulo;
            document.getElementById('docuDetailDesc').textContent = docu.descripcion || 'Sin descripción';
            document.getElementById('docuDetailCover').src = K.currentDocuCover;

            var btnAdd = document.getElementById('btnAddEpisodio');
            if (K.isAdmin) btnAdd.classList.add('visible'); else btnAdd.classList.remove('visible');

            await loadEpisodios(docId);

            document.getElementById('docuListView').style.display = 'none';
            document.getElementById('docuDetailView').classList.add('show');
        } catch (e) { console.error(e); K.showToast('Error al cargar documental', 'error'); }
    };

    /* ── Episodios ── */
    async function loadEpisodios(docId) {
        var r = await db.from('episodios').select('*').eq('documental_id', docId).order('numero', { ascending: true });
        var eps = r.data || [];
        K.allEpisodiosData = eps;
        document.getElementById('docuDetailMeta').textContent = eps.length + ' EPISODIOS';

        if (!eps.length) {
            document.getElementById('episodioList').innerHTML =
                '<div class="empty-state"><div class="empty-icon">🎬</div><div class="empty-title">Sin episodios</div><div class="empty-text">Agrega el primer episodio</div></div>';
            return;
        }
        var h = '';
        for (var i = 0; i < eps.length; i++) {
            var ep = eps[i];
            var thumb = ep.thumbnail_url || K.currentDocuCover;
            var views = ep.visualizaciones || 0;

            h += '<div class="episodio-item" onclick="window._openVideoPlayer(\'' + ep.id + '\')">';
            h += '<span class="episodio-num">' + ep.numero + '</span>';
            h += '<div class="episodio-thumb">';
            h += '<img src="' + thumb + '" alt="" onerror="this.src=\'https://placehold.co/160x90/111/333?text=EP\'">';
            h += '<div class="episodio-thumb-play"><span class="episodio-thumb-play-icon">▶</span></div>';
            h += '</div>';
            h += '<div class="episodio-info">';
            h += '<div class="episodio-title">' + ep.titulo + '</div>';
            h += '<div class="episodio-desc-short">' + (ep.descripcion || '') + '</div>';
            h += '</div>';
            h += '<span class="episodio-views">👁 ' + views + '</span>';
            if (K.isAdmin) h += '<button class="episodio-delete visible" onclick="event.stopPropagation();window._deleteEpisodio(\'' + ep.id + '\')">🗑</button>';
            h += '</div>';
        }
        document.getElementById('episodioList').innerHTML = h;
    }

    /* ── Volver a lista ── */
    document.getElementById('btnBackDocu').addEventListener('click', function () {
        document.getElementById('docuListView').style.display = 'block';
        document.getElementById('docuDetailView').classList.remove('show');
    });

    /* ── Eliminar documental ── */
    window._deleteDocu = async function (docId) {
        if (!confirm('¿Eliminar este documental y todos sus episodios?')) return;
        try {
            await db.from('episodios').delete().eq('documental_id', docId);
            var r = await db.from('documentales').delete().eq('id', docId);
            if (r.error) throw r.error;
            K.showToast('Documental eliminado', 'success');
            K.loadDocumentales();
        } catch (e) { K.showToast('Error: ' + e.message, 'error'); }
    };

    /* ── Eliminar episodio ── */
    window._deleteEpisodio = async function (epId) {
        if (!confirm('¿Eliminar este episodio?')) return;
        try {
            var r = await db.from('episodios').delete().eq('id', epId);
            if (r.error) throw r.error;
            K.showToast('Episodio eliminado', 'success');
            await loadEpisodios(K.currentDocuId);
            K.loadDocumentales();
        } catch (e) { K.showToast('Error: ' + e.message, 'error'); }
    };

    /* ══════════════════════════════════════════
       🎞️ CREAR DOCUMENTAL (ADMIN)
       ══════════════════════════════════════════ */
    K._docuCoverFileSelected = null;

    document.getElementById('docuCoverFile').addEventListener('change', function (e) {
        var f = e.target.files[0]; if (!f) return;
        K._docuCoverFileSelected = f;
        document.getElementById('docuCoverArea').classList.add('has-file');
        document.getElementById('docuCoverArea').querySelector('.file-upload-text').textContent = f.name;
        var rd = new FileReader();
        rd.onload = function (ev) {
            document.getElementById('docuCoverImg').src = ev.target.result;
            document.getElementById('docuCoverPreview').classList.add('show');
        };
        rd.readAsDataURL(f);
    });

    document.getElementById('formDocumental').addEventListener('submit', async function (e) {
        e.preventDefault();
        var titulo = document.getElementById('docuTitulo').value.trim();
        var desc = document.getElementById('docuDesc').value.trim();
        if (!titulo) { K.showToast('Ingresa un título', 'error'); return; }

        var btn = document.getElementById('btnDocuSubmit');
        btn.classList.add('loading'); btn.disabled = true;

        try {
            var imageUrl = '';
            if (K._docuCoverFileSelected) {
                var fn = Date.now() + '_docu_' + K._docuCoverFileSelected.name.replace(/[^a-zA-Z0-9._-]/g, '');
                var up = await db.storage.from('imagenes').upload('documentales/' + fn, K._docuCoverFileSelected, { contentType: K._docuCoverFileSelected.type });
                if (up.error) throw up.error;
                imageUrl = db.storage.from('imagenes').getPublicUrl('documentales/' + fn).data.publicUrl;
            }
            var ins = await db.from('documentales').insert({
                titulo: titulo, descripcion: desc, imagen_url: imageUrl, autor_id: K.currentUser.id
            });
            if (ins.error) throw ins.error;

            K.showToast('¡Documental creado!', 'success');
            K.closeModal('modalDocumental');
            K.loadDocumentales();
        } catch (e2) { console.error(e2); K.showToast('Error: ' + e2.message, 'error'); }
        btn.classList.remove('loading'); btn.disabled = false;
    });

    /* ══════════════════════════════════════════
       🎬 CREAR EPISODIO (ADMIN)
       ══════════════════════════════════════════ */
    K._episodioThumbFileSelected = null;
    K._episodioVideoFileSelected = null;

    document.getElementById('episodioThumbFile').addEventListener('change', function (e) {
        var f = e.target.files[0]; if (!f) return;
        K._episodioThumbFileSelected = f;
        document.getElementById('episodioThumbArea').classList.add('has-file');
        document.getElementById('episodioThumbArea').querySelector('.file-upload-text').textContent = f.name;
        var rd = new FileReader();
        rd.onload = function (ev) {
            document.getElementById('episodioThumbImg').src = ev.target.result;
            document.getElementById('episodioThumbPreview').classList.add('show');
        };
        rd.readAsDataURL(f);
    });

    document.getElementById('episodioVideoFile').addEventListener('change', function (e) {
        var f = e.target.files[0]; if (!f) return;
        K._episodioVideoFileSelected = f;
        document.getElementById('episodioVideoArea').classList.add('has-file');
        document.getElementById('episodioVideoArea').querySelector('.file-upload-text').textContent = f.name;
    });

    document.getElementById('formEpisodio').addEventListener('submit', async function (e) {
        e.preventDefault();
        var titulo = document.getElementById('episodioTitulo').value.trim();
        var desc = document.getElementById('episodioDesc').value.trim();
        var numero = parseInt(document.getElementById('episodioNumero').value) || 1;
        if (!titulo) { K.showToast('Ingresa un título', 'error'); return; }
        if (!K._episodioVideoFileSelected) { K.showToast('Selecciona un archivo de video', 'error'); return; }
        if (!K.currentDocuId) { K.showToast('Error: documental no seleccionado', 'error'); return; }

        var btn = document.getElementById('btnEpisodioSubmit');
        btn.classList.add('loading'); btn.disabled = true;
        var prog = document.getElementById('episodioUploadProgress');
        prog.classList.add('show');
        document.getElementById('episodioUploadText').textContent = 'Subiendo thumbnail...';
        document.getElementById('episodioUploadFill').style.width = '10%';

        try {
            var thumbUrl = '';
            if (K._episodioThumbFileSelected) {
                var fn = Date.now() + '_epthumb_' + K._episodioThumbFileSelected.name.replace(/[^a-zA-Z0-9._-]/g, '');
                var up = await db.storage.from('imagenes').upload('episodios/' + fn, K._episodioThumbFileSelected, { contentType: K._episodioThumbFileSelected.type });
                if (up.error) throw up.error;
                thumbUrl = db.storage.from('imagenes').getPublicUrl('episodios/' + fn).data.publicUrl;
            }
            document.getElementById('episodioUploadFill').style.width = '25%';

            document.getElementById('episodioUploadText').textContent = 'Subiendo video... (puede tardar)';
            var fn2 = Date.now() + '_ep_' + K._episodioVideoFileSelected.name.replace(/[^a-zA-Z0-9._-]/g, '');
            var up2 = await db.storage.from('videos').upload('episodios/' + fn2, K._episodioVideoFileSelected, { contentType: K._episodioVideoFileSelected.type });
            if (up2.error) throw up2.error;
            var videoUrl = db.storage.from('videos').getPublicUrl('episodios/' + fn2).data.publicUrl;
            document.getElementById('episodioUploadFill').style.width = '85%';

            document.getElementById('episodioUploadText').textContent = 'Guardando...';
            var ins = await db.from('episodios').insert({
                titulo: titulo, descripcion: desc, video_url: videoUrl,
                thumbnail_url: thumbUrl, numero: numero,
                documental_id: K.currentDocuId, autor_id: K.currentUser.id
            });
            if (ins.error) throw ins.error;

            document.getElementById('episodioUploadFill').style.width = '100%';
            document.getElementById('episodioUploadText').textContent = '¡Completado!';
            K.showToast('¡Episodio agregado!', 'success');
            K.closeModal('modalEpisodio');
            await loadEpisodios(K.currentDocuId);
            K.loadDocumentales();
        } catch (e2) { console.error(e2); K.showToast('Error: ' + e2.message, 'error'); }
        btn.classList.remove('loading'); btn.disabled = false;
        setTimeout(function () { prog.classList.remove('show'); document.getElementById('episodioUploadFill').style.width = '0%'; }, 1500);
    });

    /* ── Botón agregar episodio ── */
    document.getElementById('btnAddEpisodio').addEventListener('click', function () {
        K.openModal('modalEpisodio');
    });

})();