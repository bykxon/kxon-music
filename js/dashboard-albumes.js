/* ============================================
   💿 DASHBOARD-ALBUMES.JS — KXON
   Álbumes, detalle, canciones, CRUD
   Con sistema de lanzamiento programado 📅
   ============================================ */
(function () {

    var db = window.db;
    var K = window.KXON;

    /* ══════════════════════════════════════════
       📅 UTILIDADES DE FECHA
       ══════════════════════════════════════════ */
    function isReleased(fechaLanzamiento) {
        if (!fechaLanzamiento) return true; // Sin fecha = publicado
        return new Date(fechaLanzamiento) <= new Date();
    }

    function formatReleaseDate(fecha) {
        if (!fecha) return '';
        var d = new Date(fecha);
        var meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
            'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        return d.getDate() + ' ' + meses[d.getMonth()] + ' ' + d.getFullYear();
    }

    function getCountdown(fecha) {
        if (!fecha) return '';
        var now = new Date();
        var target = new Date(fecha);
        var diff = target - now;
        if (diff <= 0) return '';
        var days = Math.floor(diff / (1000 * 60 * 60 * 24));
        var hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        if (days > 0) return 'Faltan ' + days + 'd ' + hours + 'h';
        var mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return 'Faltan ' + hours + 'h ' + mins + 'm';
    }

    function isNewRelease(fecha) {
        if (!fecha) return false;
        var release = new Date(fecha);
        var now = new Date();
        var diffHours = (now - release) / (1000 * 60 * 60);
        return diffHours >= 0 && diffHours <= 48; // "Nuevo" por 48 horas
    }

    /* ══════════════════════════════════════════
       💿 CARGAR ÁLBUMES
       ══════════════════════════════════════════ */
    K.loadAlbumes = async function () {
        try {
            var r = await db.from('albumes').select('*, canciones(id)').order('created_at', { ascending: false });
            if (r.error) throw r.error;
            var data = r.data || [];
            renderAlbums(data, 'albumesGrid');
            renderAlbums(data.slice(0, 5), 'inicioAlbumes');
        } catch (e) { console.error(e); }
    };

    function renderAlbums(albums, cid) {
        var c = document.getElementById(cid);
        if (!c) return;
        if (!albums || !albums.length) {
            c.innerHTML = '<div class="empty-state"><div class="empty-icon">💿</div><div class="empty-title">Sin álbumes</div></div>';
            return;
        }
        var h = '';
        for (var i = 0; i < albums.length; i++) {
            var a = albums[i];
            var img = a.imagen_url || 'https://placehold.co/400x400/111/333?text=♪';
            var cnt = a.canciones ? a.canciones.length : 0;
            var released = isReleased(a.fecha_lanzamiento);
            var locked = !released && !K.isAdmin;
            var lockedClass = locked ? ' album-locked' : '';

            if (locked) {
                // Álbum bloqueado para fans
                h += '<div class="card' + lockedClass + '" onclick="window._albumLockedMsg(\'' + formatReleaseDate(a.fecha_lanzamiento) + '\')">';
                h += '<div class="card-img square"><img src="' + img + '" alt="" onerror="this.src=\'https://placehold.co/400x400/111/333?text=♪\'">';
                h += '<div class="album-lock-badge">';
                h += '<div class="album-lock-icon">🔒</div>';
                h += '<div class="album-lock-date">' + formatReleaseDate(a.fecha_lanzamiento) + '</div>';
                var countdown = getCountdown(a.fecha_lanzamiento);
                if (countdown) h += '<div class="album-lock-countdown">' + countdown + '</div>';
                h += '</div>';
                h += '</div>';
                h += '<div class="card-body"><div class="card-title">' + a.titulo + '</div><div class="card-subtitle">🔒 Próximamente</div></div></div>';
            } else {
                // Álbum disponible
                h += '<div class="card" onclick="window._openAlbum(\'' + a.id + '\')">';
                h += '<div class="card-img square"><img src="' + img + '" alt="" onerror="this.src=\'https://placehold.co/400x400/111/333?text=♪\'">';
                h += '<div class="card-overlay"><div class="card-overlay-icon">▶</div></div>';
                if (K.isAdmin) h += '<button class="card-admin-delete visible" onclick="event.stopPropagation();window._deleteAlbum(\'' + a.id + '\')">✕</button>';
                h += '</div><div class="card-body"><div class="card-title">' + a.titulo + '</div><div class="card-subtitle">♪ ' + cnt + ' canciones</div></div></div>';
            }
        }
        c.innerHTML = h;
    }

    // Mensaje cuando fan hace click en álbum bloqueado
    window._albumLockedMsg = function (dateStr) {
        K.showToast('🔒 Este álbum se desbloquea el ' + dateStr, 'error');
    };

    /* ══════════════════════════════════════════
       💿 ALBUM DETAIL
       ══════════════════════════════════════════ */
    window._openAlbum = async function (aid) {
        K.currentAlbumId = aid;
        try {
            var r = await db.from('albumes').select('*').eq('id', aid).single();
            if (r.error) throw r.error;
            var album = r.data;
            K.currentAlbumCover = album.imagen_url || 'https://placehold.co/400x400/111/333?text=♪';
            document.getElementById('detailTitle').textContent = album.titulo;
            document.getElementById('detailDesc').textContent = album.descripcion || 'Sin descripción';
            document.getElementById('detailCover').src = K.currentAlbumCover;

            // Mostrar info de lanzamiento del álbum
            var existingRelease = document.getElementById('albumReleaseInfo');
            if (existingRelease) existingRelease.remove();

            if (album.fecha_lanzamiento) {
                var released = isReleased(album.fecha_lanzamiento);
                var releaseDiv = document.createElement('div');
                releaseDiv.id = 'albumReleaseInfo';
                releaseDiv.className = 'album-release-info' + (released ? ' released' : '');
                if (released) {
                    releaseDiv.innerHTML = '✅ Lanzado el ' + formatReleaseDate(album.fecha_lanzamiento);
                } else {
                    releaseDiv.innerHTML = '📅 Lanzamiento: ' + formatReleaseDate(album.fecha_lanzamiento);
                    var countdown = getCountdown(album.fecha_lanzamiento);
                    if (countdown) releaseDiv.innerHTML += ' — ' + countdown;
                }
                var detailInfo = document.querySelector('.album-detail-info');
                if (detailInfo) detailInfo.appendChild(releaseDiv);
            }

            var btnAdd = document.getElementById('btnAddTrack');
            if (K.isAdmin) btnAdd.classList.add('visible'); else btnAdd.classList.remove('visible');

            await loadAlbumTracks(aid);

            document.getElementById('albumesListView').style.display = 'none';
            document.getElementById('albumDetailView').classList.add('show');
        } catch (e) { console.error(e); K.showToast('Error al cargar álbum', 'error'); }
    };

    async function loadAlbumTracks(aid) {
        var sr = await db.from('canciones').select('*').eq('album_id', aid).order('created_at', { ascending: true });
        var songs = sr.data || [];
        var releasedSongs = [];
        var totalSongs = songs.length;

        document.getElementById('detailMeta').textContent = totalSongs + ' CANCIONES';

        if (!songs.length) {
            document.getElementById('detailTracks').innerHTML = '<div class="empty-state"><div class="empty-icon">🎵</div><div class="empty-title">Sin canciones</div></div>';
            K.currentPlaylist = [];
            return;
        }

        var h = '';
        for (var i = 0; i < songs.length; i++) {
            var s = songs[i];
            var songReleased = isReleased(s.fecha_lanzamiento);
            var songLocked = !songReleased;
            var justReleased = isNewRelease(s.fecha_lanzamiento);

            if (songLocked && !K.isAdmin) {
                // Canción bloqueada para fans
                h += '<div class="track-item track-locked">';
                h += '<span class="track-num">' + (i + 1) + '</span>';
                h += '<div class="track-info"><div class="track-title">' + s.titulo + '</div></div>';
                h += '<div class="track-lock-info">';
                h += '<span class="track-lock-icon">🔒</span>';
                h += '<span class="track-lock-date">' + formatReleaseDate(s.fecha_lanzamiento) + '</span>';
                var countdown = getCountdown(s.fecha_lanzamiento);
                if (countdown) h += '<span class="track-lock-date" style="color:var(--acento-dorado);border-color:rgba(255,215,0,.15)">' + countdown + '</span>';
                h += '</div>';
                h += '</div>';
            } else if (songLocked && K.isAdmin) {
                // Canción bloqueada PERO admin puede reproducir
                releasedSongs.push(s);
                var idx = releasedSongs.length - 1;
                h += '<div class="track-item track-locked admin-override" onclick="window._playTrack(' + idx + ')">';
                h += '<span class="track-num">' + (i + 1) + '</span>';
                h += '<button class="track-play-btn">▶</button>';
                h += '<div class="track-info"><div class="track-title">' + s.titulo + '</div></div>';
                h += '<span class="admin-lock-label">🔒 ' + formatReleaseDate(s.fecha_lanzamiento) + '</span>';
                h += '<span class="track-duration">' + (s.duracion || '--:--') + '</span>';
                h += '<button class="track-delete visible" onclick="event.stopPropagation();window._deleteTrack(\'' + s.id + '\')">🗑</button>';
                h += '</div>';
            } else {
                // Canción disponible
                releasedSongs.push(s);
                var idx2 = releasedSongs.length - 1;
                var justReleasedClass = justReleased ? ' track-just-released' : '';
                h += '<div class="track-item' + justReleasedClass + '" onclick="window._playTrack(' + idx2 + ')">';
                h += '<span class="track-num">' + (i + 1) + '</span>';
                h += '<button class="track-play-btn">▶</button>';
                h += '<div class="track-info"><div class="track-title">' + s.titulo + '</div></div>';
                if (justReleased) h += '<span class="track-new-badge">🆕 NUEVO</span>';
                h += '<span class="track-duration">' + (s.duracion || '--:--') + '</span>';
                if (K.isAdmin) h += '<button class="track-delete visible" onclick="event.stopPropagation();window._deleteTrack(\'' + s.id + '\')">🗑</button>';
                h += '</div>';
            }
        }

        document.getElementById('detailTracks').innerHTML = h;

        // Solo las canciones desbloqueadas van al playlist reproducible
        K.currentPlaylist = releasedSongs;

        // Actualizar meta con info de desbloqueo
        var lockedCount = totalSongs - releasedSongs.length + (K.isAdmin ? 0 : 0);
        var unreleasedCount = 0;
        for (var j = 0; j < songs.length; j++) {
            if (!isReleased(songs[j].fecha_lanzamiento)) unreleasedCount++;
        }
        if (unreleasedCount > 0 && !K.isAdmin) {
            document.getElementById('detailMeta').textContent = (totalSongs - unreleasedCount) + ' DISPONIBLES · ' + unreleasedCount + ' POR DESBLOQUEAR';
        } else if (unreleasedCount > 0 && K.isAdmin) {
            document.getElementById('detailMeta').textContent = totalSongs + ' CANCIONES · ' + unreleasedCount + ' PROGRAMADAS';
        }
    }

    /* ══════════════════════════════════════════
       🎵 TODAS LAS CANCIONES
       ══════════════════════════════════════════ */
    K.loadAllCanciones = async function () {
        try {
            var r = await db.from('canciones').select('*, albumes(titulo, imagen_url)').order('created_at', { ascending: false });
            if (r.error) throw r.error;
            var data = r.data || [];

            // Filtrar: fans solo ven canciones ya lanzadas
            var filtered = K.isAdmin ? data : data.filter(function (s) {
                return isReleased(s.fecha_lanzamiento);
            });

            renderAllCanciones(filtered, 'allCancionesGrid');
            renderAllCanciones(filtered.slice(0, 5), 'inicioCanciones');
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
            var s = canciones[i];
            var albumName = s.albumes ? s.albumes.titulo : 'Sin álbum';
            var coverImg = s.imagen_url || (s.albumes ? s.albumes.imagen_url : '') || '';
            var songReleased = isReleased(s.fecha_lanzamiento);
            var justReleased = isNewRelease(s.fecha_lanzamiento);

            // Si es admin y no lanzada, mostrar con indicador
            if (!songReleased && K.isAdmin) {
                h += '<div class="track-item track-locked admin-override" onclick="window._playFromAll(' + i + ',\'' + cid + '\')">';
                h += '<span class="track-num">' + (i + 1) + '</span>';
                if (coverImg) { h += '<div class="track-cover"><img src="' + coverImg + '" alt=""></div>'; }
                else { h += '<button class="track-play-btn">▶</button>'; }
                h += '<div class="track-info"><div class="track-title">' + s.titulo + '</div><div class="track-album-name">' + albumName + '</div></div>';
                h += '<span class="admin-lock-label">🔒 ' + formatReleaseDate(s.fecha_lanzamiento) + '</span>';
                h += '<span class="track-duration">' + (s.duracion || '--:--') + '</span>';
                h += '<button class="track-delete visible" onclick="event.stopPropagation();window._deleteTrackGlobal(\'' + s.id + '\')">🗑</button>';
                h += '</div>';
            } else {
                var justReleasedClass = justReleased ? ' track-just-released' : '';
                h += '<div class="track-item' + justReleasedClass + '" onclick="window._playFromAll(' + i + ',\'' + cid + '\')">';
                h += '<span class="track-num">' + (i + 1) + '</span>';
                if (coverImg) { h += '<div class="track-cover"><img src="' + coverImg + '" alt=""></div>'; }
                else { h += '<button class="track-play-btn">▶</button>'; }
                h += '<div class="track-info"><div class="track-title">' + s.titulo + '</div><div class="track-album-name">' + albumName + '</div></div>';
                if (justReleased) h += '<span class="track-new-badge">🆕 NUEVO</span>';
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
                // Filtrar solo lanzadas (excepto admin)
                var allData = r.data;
                var filtered = K.isAdmin ? allData : allData.filter(function (s) {
                    return isReleased(s.fecha_lanzamiento);
                });
                var list = cid === 'inicioCanciones' ? filtered.slice(0, 5) : filtered;
                K.currentPlaylist = list.map(function (s) {
                    return {
                        id: s.id, titulo: s.titulo, archivo_url: s.archivo_url,
                        imagen_url: s.imagen_url || (s.albumes ? s.albumes.imagen_url : '') || '',
                        duracion: s.duracion, reproducciones: s.reproducciones
                    };
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

    /* ══════════════════════════════════════════
       💿 CREAR ÁLBUM (con fecha lanzamiento)
       ══════════════════════════════════════════ */
    K._selectedCoverFile = null;

    document.getElementById('albumCoverFile').addEventListener('change', function (e) {
        var f = e.target.files[0]; if (!f) return;
        K._selectedCoverFile = f;
        document.getElementById('albumCoverArea').classList.add('has-file');
        document.getElementById('albumCoverArea').querySelector('.file-upload-text').textContent = f.name;
        var rd = new FileReader();
        rd.onload = function (ev) {
            document.getElementById('albumCoverImg').src = ev.target.result;
            document.getElementById('albumCoverPreview').classList.add('show');
        };
        rd.readAsDataURL(f);
    });

    document.getElementById('formAlbum').addEventListener('submit', async function (e) {
        e.preventDefault();
        var titulo = document.getElementById('albumTitulo').value.trim();
        var desc = document.getElementById('albumDesc').value.trim();
        var fechaInput = document.getElementById('albumFechaLanzamiento').value;
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

            var insertData = {
                titulo: titulo,
                descripcion: desc,
                imagen_url: imageUrl,
                autor_id: K.currentUser.id
            };

            // Agregar fecha de lanzamiento si se especificó
            if (fechaInput) {
                insertData.fecha_lanzamiento = new Date(fechaInput).toISOString();
            }

            var ins = await db.from('albumes').insert(insertData);
            if (ins.error) throw ins.error;

            var msg = fechaInput
                ? '¡Álbum programado para el ' + formatReleaseDate(fechaInput) + '!'
                : '¡Álbum creado!';
            K.showToast(msg, 'success');
            K.closeModal('modalAlbum');

            // Reset campo fecha
            document.getElementById('albumFechaLanzamiento').value = '';

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

    /* ══════════════════════════════════════════
       🎵 CREAR CANCIÓN (con fecha lanzamiento)
       ══════════════════════════════════════════ */
    K._selectedAudioFile = null;

    document.getElementById('cancionAudioFile').addEventListener('change', function (e) {
        var f = e.target.files[0]; if (!f) return;
        K._selectedAudioFile = f;
        document.getElementById('cancionAudioArea').classList.add('has-file');
        document.getElementById('cancionAudioArea').querySelector('.file-upload-text').textContent = f.name;
    });

    document.getElementById('formCancion').addEventListener('submit', async function (e) {
        e.preventDefault();
        var titulo = document.getElementById('cancionTitulo').value.trim();
        var fechaInput = document.getElementById('cancionFechaLanzamiento').value;
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

            var insertData = {
                titulo: titulo,
                archivo_url: audioUrl,
                imagen_url: K.currentAlbumCover,
                album_id: K.currentAlbumId,
                autor_id: K.currentUser.id
            };

            // Agregar fecha de lanzamiento si se especificó
            if (fechaInput) {
                insertData.fecha_lanzamiento = new Date(fechaInput).toISOString();
            }

            var ins = await db.from('canciones').insert(insertData);
            if (ins.error) throw ins.error;
            document.getElementById('uploadBarFill').style.width = '100%';
            document.getElementById('uploadText').textContent = '¡Completado!';

            var msg = fechaInput
                ? '¡Canción programada para el ' + formatReleaseDate(fechaInput) + '!'
                : '¡Canción agregada!';
            K.showToast(msg, 'success');
            K.closeModal('modalCancion');

            // Reset campo fecha
            document.getElementById('cancionFechaLanzamiento').value = '';

            await loadAlbumTracks(K.currentAlbumId);
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
            await loadAlbumTracks(K.currentAlbumId);
            K.loadAllCanciones(); K.loadStats();
        } catch (e) { K.showToast('Error: ' + e.message, 'error'); }
    };

    /* ══════════════════════════════════════════
       🔄 AUTO-REFRESH COUNTDOWN (cada minuto)
       ══════════════════════════════════════════ */
    setInterval(function () {
        // Refrescar álbumes cada 60 segundos para actualizar countdowns
        var albumPanel = document.getElementById('panel-albumes');
        var inicioPanel = document.getElementById('panel-inicio');
        if ((albumPanel && albumPanel.classList.contains('active')) ||
            (inicioPanel && inicioPanel.classList.contains('active'))) {
            K.loadAlbumes();
        }
    }, 60000);

})();