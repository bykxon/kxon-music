/* ============================================
   💿 DASHBOARD-ALBUMES.JS — KXON ÉLITE 2026
   Rediseño Total — Lógica del Panel de Álbumes
   ============================================ */
(function () {

    var db = window.db;
    var K = window.KXON;

    /* ══════════════════════════════════
       📅 UTILIDADES DE FECHA
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

    /* ══════════════════════════════════
       💿 CARGAR ÁLBUMES
       ══════════════════════════════════ */
    K.loadAlbumes = async function () {
        try {
            var r = await db.from('albumes').select('*, canciones(id)').order('created_at', { ascending: false });
            if (r.error) throw r.error;
            var data = r.data || [];

            var totA = data.length, totT = 0;
            for (var i = 0; i < data.length; i++) totT += (data[i].canciones ? data[i].canciones.length : 0);

            var elA = document.getElementById('albStatTotal');
            var elT = document.getElementById('albStatTracks');
            if (elA) elA.textContent = totA;
            if (elT) elT.textContent = totT;

            renderSpotlight(data);
            renderGrid(data, 'albumesGrid');
            renderLegacy(data.slice(0, 5), 'inicioAlbumes');
        } catch (e) { console.error(e); }
    };

    /* ══════════════════════════════════
       ⭐ SPOTLIGHT
       ══════════════════════════════════ */
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

        var eI = document.getElementById('albFeaturedImg');
        var eT = document.getElementById('albFeaturedTitle');
        var eD = document.getElementById('albFeaturedDesc');
        var eTr = document.getElementById('albFeaturedTracks');
        var eDt = document.getElementById('albFeaturedDate');

        if (eI) eI.src = img;
        if (eT) eT.textContent = album.titulo;
        if (eD) eD.textContent = album.descripcion || 'Álbum exclusivo de KXON';
        if (eTr) eTr.innerHTML = '<span class="alb-tag-icon">♪</span> ' + cnt + ' canciones';
        if (eDt) eDt.innerHTML = '<span class="alb-tag-icon">📅</span> ' + fmtYear(album.created_at);

        var btnP = document.getElementById('albFeaturedPlay');
        if (btnP) btnP.onclick = function () {
            window._openAlbum(album.id);
            setTimeout(function () { if (K.currentPlaylist.length > 0) K.playTrack(0); }, 800);
        };

        var btnV = document.getElementById('albFeaturedView');
        if (btnV) btnV.onclick = function () { window._openAlbum(album.id); };
    }

    /* ══════════════════════════════════
       🎴 GRID
       ══════════════════════════════════ */
    function renderGrid(albums, cid) {
        var c = document.getElementById(cid);
        if (!c) return;
        if (!albums || !albums.length) {
            c.innerHTML = '<div class="alb-empty"><div class="alb-empty-icon">💿</div><div class="alb-empty-title">Sin álbumes</div><div class="alb-empty-text">Aún no hay álbumes publicados</div></div>';
            return;
        }

        var h = '';
        for (var i = 0; i < albums.length; i++) {
            var a = albums[i];
            var img = a.imagen_url || 'https://placehold.co/400x400/111/333?text=♪';
            var cnt = a.canciones ? a.canciones.length : 0;
            var rel = isReleased(a.fecha_lanzamiento);
            var locked = !rel && !K.isAdmin;

            if (locked) {
                h += '<div class="alb-card alb-locked" style="--card-i:' + i + '" onclick="window._albumLockedMsg(\'' + fmtDate(a.fecha_lanzamiento) + '\')">';
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
                h += '<div class="alb-card" style="--card-i:' + i + '" onclick="window._openAlbum(\'' + a.id + '\')">';
                h += '<div class="alb-card-visual">';
                h += '<img class="alb-card-img" src="' + img + '" alt="" onerror="this.src=\'https://placehold.co/400x400/111/333?text=♪\'">';
                h += '<div class="alb-card-hover">';
                h += '<button class="alb-card-play" onclick="event.stopPropagation();window._quickPlay(\'' + a.id + '\')">▶</button>';
                h += '<span class="alb-card-count">' + cnt + ' tracks</span>';
                h += '</div>';
                if (K.isAdmin) h += '<button class="alb-card-delete" onclick="event.stopPropagation();window._deleteAlbum(\'' + a.id + '\')">✕</button>';
                h += '</div>';
                h += '<div class="alb-card-body"><div class="alb-card-title">' + a.titulo + '</div><div class="alb-card-sub">♪ ' + cnt + ' canciones</div></div></div>';
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
                h += '<div class="card album-locked" onclick="window._albumLockedMsg(\'' + fmtDate(a.fecha_lanzamiento) + '\')"><div class="card-img square"><img src="' + img + '" alt="" onerror="this.src=\'https://placehold.co/400x400/111/333?text=♪\'"><div class="album-lock-badge"><div class="album-lock-icon">🔒</div><div class="album-lock-date">' + fmtDate(a.fecha_lanzamiento) + '</div>';
                var cd = countdown(a.fecha_lanzamiento); if (cd) h += '<div class="album-lock-countdown">' + cd + '</div>';
                h += '</div></div><div class="card-body"><div class="card-title">' + a.titulo + '</div><div class="card-subtitle">🔒 Próximamente</div></div></div>';
            } else {
                h += '<div class="card" onclick="window._openAlbum(\'' + a.id + '\')"><div class="card-img square"><img src="' + img + '" alt="" onerror="this.src=\'https://placehold.co/400x400/111/333?text=♪\'"><div class="card-overlay"><div class="card-overlay-icon">▶</div></div>';
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

    /* ══════════════════════════════════
       💿 ALBUM DETAIL
       ══════════════════════════════════ */
    window._openAlbum = async function (aid) {
        K.currentAlbumId = aid;
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
                    var cd = countdown(a.fecha_lanzamiento);
                    if (cd) div.innerHTML += ' — ' + cd;
                }
                var wrap = document.getElementById('albumReleaseInfoWrap');
                if (wrap) wrap.appendChild(div);
            }

            var btnAdd = document.getElementById('btnAddTrack');
            if (btnAdd) { if (K.isAdmin) btnAdd.classList.add('visible'); else btnAdd.classList.remove('visible'); }

            await loadTracks(aid);

            document.getElementById('albumesListView').style.display = 'none';
            document.getElementById('albumDetailView').classList.add('show');
        } catch (e) { console.error(e); K.showToast('Error al cargar álbum', 'error'); }
    };

    /* ── Play All ── */
    var ePlayAll = document.getElementById('albPlayAll');
    if (ePlayAll) ePlayAll.addEventListener('click', function () {
        if (K.currentPlaylist.length > 0) K.playTrack(0);
        else K.showToast('No hay canciones', 'error');
    });

    /* ── Shuffle ── */
    var eShuffle = document.getElementById('albShuffle');
    if (eShuffle) eShuffle.addEventListener('click', function () {
        if (!K.currentPlaylist.length) { K.showToast('No hay canciones', 'error'); return; }
        var s = K.currentPlaylist.slice();
        for (var i = s.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = s[i]; s[i] = s[j]; s[j] = t; }
        K.currentPlaylist = s;
        K.playTrack(0);
        K.showToast('🔀 Reproducción aleatoria', 'success');
    });

    /* ══════════════════════════════════
       🎵 TRACKS
       ══════════════════════════════════ */
    async function loadTracks(aid) {
        var sr = await db.from('canciones').select('*').eq('album_id', aid).order('created_at', { ascending: true });
        var songs = sr.data || [], released = [], total = songs.length;

        var eMeta = document.getElementById('albumDetailMeta');
        if (eMeta) eMeta.textContent = total + ' CANCIONES';

        var eSub = document.getElementById('albTracksSub');
        var eList = document.getElementById('trackList');

        if (!songs.length) {
            if (eList) eList.innerHTML = '<div class="alb-empty-tracks"><div class="alb-empty-tracks-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.15"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></div><div class="alb-empty-tracks-title">Sin canciones</div><div class="alb-empty-tracks-text">Agrega canciones a este álbum</div></div>';
            K.currentPlaylist = [];
            if (eSub) eSub.textContent = 'Álbum vacío';
            return;
        }

        var h = '', pi = 0;
        for (var i = 0; i < songs.length; i++) {
            var s = songs[i], sRel = isReleased(s.fecha_lanzamiento), sLock = !sRel, sNew = isNew(s.fecha_lanzamiento);

            if (sLock && !K.isAdmin) {
                h += '<div class="track-item track-locked">';
                h += '<span class="track-num">' + (i+1) + '</span>';
                h += '<div class="track-info"><div class="track-title">' + s.titulo + '</div></div>';
                h += '<div class="track-lock-info"><span class="track-lock-icon">🔒</span><span class="track-lock-date">' + fmtDate(s.fecha_lanzamiento) + '</span>';
                var cd = countdown(s.fecha_lanzamiento);
                if (cd) h += '<span class="track-lock-date" style="color:var(--acento-dorado);border-color:rgba(255,215,0,.15)">' + cd + '</span>';
                h += '</div></div>';
            } else if (sLock && K.isAdmin) {
                released.push(s);
                h += '<div class="track-item track-locked admin-override" onclick="window._playTrack(' + pi + ')">';
                h += '<span class="track-num">' + (i+1) + '</span><button class="track-play-btn">▶</button>';
                h += '<div class="track-info"><div class="track-title">' + s.titulo + '</div></div>';
                h += '<span class="admin-lock-label">🔒 ' + fmtDate(s.fecha_lanzamiento) + '</span>';
                h += '<span class="track-duration">' + (s.duracion || '--:--') + '</span>';
                h += '<button class="track-delete visible" onclick="event.stopPropagation();window._deleteTrack(\'' + s.id + '\')">🗑</button></div>';
                pi++;
            } else {
                released.push(s);
                var nc = sNew ? ' track-just-released' : '';
                h += '<div class="track-item' + nc + '" onclick="window._playTrack(' + pi + ')">';
                h += '<span class="track-num">' + (i+1) + '</span><button class="track-play-btn">▶</button>';
                h += '<div class="track-info"><div class="track-title">' + s.titulo + '</div></div>';
                if (sNew) h += '<span class="track-new-badge">🆕 NUEVO</span>';
                h += '<span class="track-duration">' + (s.duracion || '--:--') + '</span>';
                if (K.isAdmin) h += '<button class="track-delete visible" onclick="event.stopPropagation();window._deleteTrack(\'' + s.id + '\')">🗑</button>';
                h += '</div>';
                pi++;
            }
        }

        if (eList) eList.innerHTML = h;
        K.currentPlaylist = released;

        var unrel = 0;
        for (var j = 0; j < songs.length; j++) { if (!isReleased(songs[j].fecha_lanzamiento)) unrel++; }

        if (eMeta) {
            if (unrel > 0 && !K.isAdmin) eMeta.textContent = (total - unrel) + ' DISPONIBLES';
            else if (unrel > 0 && K.isAdmin) eMeta.textContent = total + ' CANCIONES';
        }

        if (eSub) {
            if (unrel > 0 && !K.isAdmin) eSub.textContent = (total - unrel) + ' disponibles · ' + unrel + ' por desbloquear';
            else if (unrel > 0 && K.isAdmin) eSub.textContent = total + ' canciones · ' + unrel + ' programadas';
            else eSub.textContent = total + ' canciones en este álbum';
        }
    }

    /* ══════════════════════════════════
       🎵 TODAS LAS CANCIONES
       ══════════════════════════════════ */
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
                h += '<div class="track-item track-locked admin-override" onclick="window._playFromAll(' + i + ',\'' + cid + '\')"><span class="track-num">' + (i+1) + '</span>';
                if (ci) h += '<div class="track-cover"><img src="' + ci + '" alt=""></div>'; else h += '<button class="track-play-btn">▶</button>';
                h += '<div class="track-info"><div class="track-title">' + s.titulo + '</div><div class="track-album-name">' + an + '</div></div>';
                h += '<span class="admin-lock-label">🔒 ' + fmtDate(s.fecha_lanzamiento) + '</span><span class="track-duration">' + (s.duracion || '--:--') + '</span>';
                h += '<button class="track-delete visible" onclick="event.stopPropagation();window._deleteTrackGlobal(\'' + s.id + '\')">🗑</button></div>';
            } else {
                var nc = sN ? ' track-just-released' : '';
                h += '<div class="track-item' + nc + '" onclick="window._playFromAll(' + i + ',\'' + cid + '\')"><span class="track-num">' + (i+1) + '</span>';
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
        try {
            var r = await db.from('canciones').delete().eq('id', tid);
            if (r.error) throw r.error;
            K.showToast('Canción eliminada', 'success');
            K.loadAllCanciones(); K.loadAlbumes(); K.loadStats();
        } catch (e) { K.showToast('Error: ' + e.message, 'error'); }
    };

    /* ══════════════════════════════════
       💿 CREAR ÁLBUM
       ══════════════════════════════════ */
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

            var r = await db.from('albumes').insert(ins);
            if (r.error) throw r.error;

            K.showToast(fechaInput ? '¡Álbum programado para el ' + fmtDate(fechaInput) + '!' : '¡Álbum creado!', 'success');
            K.closeModal('modalAlbum');
            K.loadAlbumes(); K.loadStats();
        } catch (e2) { console.error(e2); K.showToast('Error: ' + e2.message, 'error'); }
        btn.classList.remove('loading'); btn.disabled = false;
    });

    window._deleteAlbum = async function (aid) {
        if (!confirm('¿Eliminar este álbum y todas sus canciones?')) return;
        try {
            await db.from('canciones').delete().eq('album_id', aid);
            var r = await db.from('albumes').delete().eq('id', aid);
            if (r.error) throw r.error;
            K.showToast('Álbum eliminado', 'success');
            K.loadAlbumes(); K.loadAllCanciones(); K.loadStats();
        } catch (e) { K.showToast('Error: ' + e.message, 'error'); }
    };

    /* ══════════════════════════════════
       🎵 CREAR CANCIÓN
       ══════════════════════════════════ */
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
        if (!K._selectedAudioFile) { K.showToast('Selecciona un archivo de audio', 'error'); return; }
        if (!K.currentAlbumId) { K.showToast('Error: álbum no seleccionado', 'error'); return; }

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

            var r = await db.from('canciones').insert(ins);
            if (r.error) throw r.error;
            document.getElementById('uploadBarFill').style.width = '100%';
            document.getElementById('uploadText').textContent = '¡Completado!';

            K.showToast(fechaInput ? '¡Canción programada para el ' + fmtDate(fechaInput) + '!' : '¡Canción agregada!', 'success');
            K.closeModal('modalCancion');
            await loadTracks(K.currentAlbumId);
            K.loadAllCanciones(); K.loadStats();
        } catch (e2) { console.error(e2); K.showToast('Error: ' + e2.message, 'error'); }
        btn.classList.remove('loading'); btn.disabled = false;
        setTimeout(function () { prog.classList.remove('show'); document.getElementById('uploadBarFill').style.width = '0%'; }, 1500);
    });

    window._deleteTrack = async function (tid) {
        if (!confirm('¿Eliminar esta canción?')) return;
        try {
            var r = await db.from('canciones').delete().eq('id', tid);
            if (r.error) throw r.error;
            K.showToast('Canción eliminada', 'success');
            await loadTracks(K.currentAlbumId);
            K.loadAllCanciones(); K.loadStats();
        } catch (e) { K.showToast('Error: ' + e.message, 'error'); }
    };

    /* ── Auto-refresh ── */
    setInterval(function () {
        var ap = document.getElementById('panel-albumes');
        var ip = document.getElementById('panel-inicio');
        if ((ap && ap.classList.contains('active')) || (ip && ip.classList.contains('active'))) K.loadAlbumes();
    }, 60000);

})();