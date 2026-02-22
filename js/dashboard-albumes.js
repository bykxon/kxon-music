/* ============================================
   💿 DASHBOARD-ALBUMES.JS — KXON 2026
   Rediseño Total — Lógica del Panel de Álbumes
   ============================================ */
(function () {

    var db = window.db;
    var K = window.KXON;

    /* ══════════════════════════════════════════
       📅 UTILIDADES DE FECHA
       ══════════════════════════════════════════ */
    function isReleased(fechaLanzamiento) {
        if (!fechaLanzamiento) return true;
        return new Date(fechaLanzamiento) <= new Date();
    }

    function formatReleaseDate(fecha) {
        if (!fecha) return '';
        var d = new Date(fecha);
        var meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
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
        return diffHours >= 0 && diffHours <= 48;
    }

    function formatYear(dateStr) {
        if (!dateStr) return '';
        return new Date(dateStr).getFullYear().toString();
    }

    /* ══════════════════════════════════════════
       💿 CARGAR ÁLBUMES
       ══════════════════════════════════════════ */
    K.loadAlbumes = async function () {
        try {
            var r = await db.from('albumes').select('*, canciones(id)').order('created_at', { ascending: false });
            if (r.error) throw r.error;
            var data = r.data || [];

            /* Stats */
            var totalAlbums = data.length;
            var totalTracks = 0;
            for (var t = 0; t < data.length; t++) {
                totalTracks += (data[t].canciones ? data[t].canciones.length : 0);
            }
            var elStatTotal = document.getElementById('albStatTotal');
            var elStatTracks = document.getElementById('albStatTracks');
            if (elStatTotal) elStatTotal.textContent = totalAlbums;
            if (elStatTracks) elStatTracks.textContent = totalTracks;

            /* Featured — primer álbum released */
            renderFeatured(data);

            /* Grid */
            renderAlbumGrid(data, 'albumesGrid');

            /* Inicio (legacy support) */
            renderAlbumsLegacy(data.slice(0, 5), 'inicioAlbumes');
        } catch (e) { console.error(e); }
    };

    /* ══════════════════════════════════════════
       ⭐ RENDER FEATURED ALBUM
       ══════════════════════════════════════════ */
    function renderFeatured(albums) {
        var featured = document.getElementById('albFeatured');
        if (!featured) return;

        /* Find first released album */
        var album = null;
        for (var i = 0; i < albums.length; i++) {
            if (isReleased(albums[i].fecha_lanzamiento) || K.isAdmin) {
                album = albums[i];
                break;
            }
        }

        if (!album) {
            featured.style.display = 'none';
            return;
        }

        featured.style.display = 'block';

        var img = album.imagen_url || 'https://placehold.co/400x400/111/333?text=♪';
        var cnt = album.canciones ? album.canciones.length : 0;

        var elImg = document.getElementById('albFeaturedImg');
        var elTitle = document.getElementById('albFeaturedTitle');
        var elDesc = document.getElementById('albFeaturedDesc');
        var elTracks = document.getElementById('albFeaturedTracks');
        var elDate = document.getElementById('albFeaturedDate');

        if (elImg) elImg.src = img;
        if (elTitle) elTitle.textContent = album.titulo;
        if (elDesc) elDesc.textContent = album.descripcion || 'Álbum exclusivo de KXON';
        if (elTracks) elTracks.innerHTML = '<span class="alb-meta-icon">♪</span> ' + cnt + ' canciones';
        if (elDate) elDate.innerHTML = '<span class="alb-meta-icon">📅</span> ' + formatYear(album.created_at);

        /* Play button */
        var btnPlay = document.getElementById('albFeaturedPlay');
        if (btnPlay) {
            btnPlay.onclick = function () {
                window._openAlbum(album.id);
                setTimeout(function () {
                    if (K.currentPlaylist.length > 0) {
                        K.playTrack(0);
                    }
                }, 800);
            };
        }

        /* View button */
        var btnView = document.getElementById('albFeaturedView');
        if (btnView) {
            btnView.onclick = function () {
                window._openAlbum(album.id);
            };
        }
    }

    /* ══════════════════════════════════════════
       🎴 RENDER ALBUM GRID — NEW CARDS
       ══════════════════════════════════════════ */
    function renderAlbumGrid(albums, cid) {
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
            var released = isReleased(a.fecha_lanzamiento);
            var locked = !released && !K.isAdmin;

            if (locked) {
                /* LOCKED CARD */
                h += '<div class="alb-card alb-locked" onclick="window._albumLockedMsg(\'' + formatReleaseDate(a.fecha_lanzamiento) + '\')">';
                h += '<div class="alb-card-visual">';
                h += '<img class="alb-card-img" src="' + img + '" alt="" onerror="this.src=\'https://placehold.co/400x400/111/333?text=♪\'">';
                h += '<div class="alb-card-lock-overlay">';
                h += '<div class="alb-lock-icon">🔒</div>';
                h += '<div class="alb-lock-date">' + formatReleaseDate(a.fecha_lanzamiento) + '</div>';
                var countdown = getCountdown(a.fecha_lanzamiento);
                if (countdown) h += '<div class="alb-lock-countdown">' + countdown + '</div>';
                h += '</div>';
                h += '</div>';
                h += '<div class="alb-card-body">';
                h += '<div class="alb-card-title">' + a.titulo + '</div>';
                h += '<div class="alb-card-subtitle">🔒 Próximamente</div>';
                h += '</div>';
                h += '</div>';
            } else {
                /* NORMAL CARD */
                h += '<div class="alb-card" onclick="window._openAlbum(\'' + a.id + '\')">';
                h += '<div class="alb-card-visual">';
                h += '<img class="alb-card-img" src="' + img + '" alt="" onerror="this.src=\'https://placehold.co/400x400/111/333?text=♪\'">';
                h += '<div class="alb-card-hover">';
                h += '<button class="alb-card-play" onclick="event.stopPropagation();window._quickPlayAlbum(\'' + a.id + '\')">▶</button>';
                h += '<span class="alb-card-track-count">' + cnt + ' tracks</span>';
                h += '</div>';
                if (K.isAdmin) {
                    h += '<button class="alb-card-delete" onclick="event.stopPropagation();window._deleteAlbum(\'' + a.id + '\')">✕</button>';
                }
                h += '</div>';
                h += '<div class="alb-card-body">';
                h += '<div class="alb-card-title">' + a.titulo + '</div>';
                h += '<div class="alb-card-subtitle">♪ ' + cnt + ' canciones</div>';
                h += '</div>';
                h += '</div>';
            }
        }
        c.innerHTML = h;
    }

    /* ── Legacy render for Inicio panel ── */
    function renderAlbumsLegacy(albums, cid) {
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

            if (locked) {
                h += '<div class="card album-locked" onclick="window._albumLockedMsg(\'' + formatReleaseDate(a.fecha_lanzamiento) + '\')">';
                h += '<div class="card-img square"><img src="' + img + '" alt="" onerror="this.src=\'https://placehold.co/400x400/111/333?text=♪\'">';
                h += '<div class="album-lock-badge"><div class="album-lock-icon">🔒</div><div class="album-lock-date">' + formatReleaseDate(a.fecha_lanzamiento) + '</div>';
                var cd = getCountdown(a.fecha_lanzamiento);
                if (cd) h += '<div class="album-lock-countdown">' + cd + '</div>';
                h += '</div></div>';
                h += '<div class="card-body"><div class="card-title">' + a.titulo + '</div><div class="card-subtitle">🔒 Próximamente</div></div></div>';
            } else {
                h += '<div class="card" onclick="window._openAlbum(\'' + a.id + '\')">';
                h += '<div class="card-img square"><img src="' + img + '" alt="" onerror="this.src=\'https://placehold.co/400x400/111/333?text=♪\'">';
                h += '<div class="card-overlay"><div class="card-overlay-icon">▶</div></div>';
                if (K.isAdmin) h += '<button class="card-admin-delete visible" onclick="event.stopPropagation();window._deleteAlbum(\'' + a.id + '\')">✕</button>';
                h += '</div><div class="card-body"><div class="card-title">' + a.titulo + '</div><div class="card-subtitle">♪ ' + cnt + ' canciones</div></div></div>';
            }
        }
        c.innerHTML = h;
    }

    window._albumLockedMsg = function (dateStr) {
        K.showToast('🔒 Este álbum se desbloquea el ' + dateStr, 'error');
    };

    /* ── Quick play album from card ── */
    window._quickPlayAlbum = async function (aid) {
        try {
            var sr = await db.from('canciones').select('*').eq('album_id', aid).order('created_at', { ascending: true });
            var songs = sr.data || [];
            var playable = [];
            for (var i = 0; i < songs.length; i++) {
                if (isReleased(songs[i].fecha_lanzamiento) || K.isAdmin) {
                    playable.push(songs[i]);
                }
            }
            if (playable.length === 0) {
                K.showToast('No hay canciones disponibles', 'error');
                return;
            }

            var albumR = await db.from('albumes').select('imagen_url').eq('id', aid).single();
            K.currentAlbumCover = albumR.data ? albumR.data.imagen_url : '';
            K.currentPlaylist = playable;
            K.playTrack(0);
        } catch (e) {
            console.error(e);
            K.showToast('Error al reproducir', 'error');
        }
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

            var elTitle = document.getElementById('albumDetailTitle');
            var elDesc = document.getElementById('albumDetailDesc');
            var elCover = document.getElementById('albumDetailCover');
            var elYear = document.getElementById('albumDetailYear');
            var elHeroBg = document.getElementById('albDetailHeroBg');

            if (elTitle) elTitle.textContent = album.titulo;
            if (elDesc) elDesc.textContent = album.descripcion || 'Sin descripción';
            if (elCover) elCover.src = K.currentAlbumCover;
            if (elYear) elYear.textContent = formatYear(album.created_at);

            /* Dynamic hero background */
            if (elHeroBg) {
                elHeroBg.style.backgroundImage = 'url(' + K.currentAlbumCover + ')';
            }

            /* Release info */
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
                    var cd2 = getCountdown(album.fecha_lanzamiento);
                    if (cd2) releaseDiv.innerHTML += ' — ' + cd2;
                }
                var wrap = document.getElementById('albumReleaseInfoWrap');
                if (wrap) wrap.appendChild(releaseDiv);
            }

            /* Admin btn */
            var btnAdd = document.getElementById('btnAddTrack');
            if (btnAdd) {
                if (K.isAdmin) btnAdd.classList.add('visible');
                else btnAdd.classList.remove('visible');
            }

            await loadAlbumTracks(aid);

            document.getElementById('albumesListView').style.display = 'none';
            document.getElementById('albumDetailView').classList.add('show');
        } catch (e) {
            console.error(e);
            K.showToast('Error al cargar álbum', 'error');
        }
    };

    /* ── Play All ── */
    var albPlayAll = document.getElementById('albPlayAll');
    if (albPlayAll) {
        albPlayAll.addEventListener('click', function () {
            if (K.currentPlaylist.length > 0) {
                K.playTrack(0);
            } else {
                K.showToast('No hay canciones para reproducir', 'error');
            }
        });
    }

    /* ── Shuffle ── */
    var albShuffle = document.getElementById('albShuffle');
    if (albShuffle) {
        albShuffle.addEventListener('click', function () {
            if (K.currentPlaylist.length === 0) {
                K.showToast('No hay canciones para reproducir', 'error');
                return;
            }
            /* Fisher-Yates shuffle */
            var shuffled = K.currentPlaylist.slice();
            for (var i = shuffled.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var temp = shuffled[i];
                shuffled[i] = shuffled[j];
                shuffled[j] = temp;
            }
            K.currentPlaylist = shuffled;
            K.playTrack(0);
            K.showToast('🔀 Reproducción aleatoria', 'success');
        });
    }

    /* ══════════════════════════════════════════
       🎵 LOAD ALBUM TRACKS
       ══════════════════════════════════════════ */
    async function loadAlbumTracks(aid) {
        var sr = await db.from('canciones').select('*').eq('album_id', aid).order('created_at', { ascending: true });
        var songs = sr.data || [];
        var releasedSongs = [];
        var totalSongs = songs.length;

        var elMeta = document.getElementById('albumDetailMeta');
        if (elMeta) elMeta.textContent = totalSongs + ' CANCIONES';

        var elSub = document.getElementById('albTracksSub');

        var trackListEl = document.getElementById('trackList');

        if (!songs.length) {
            if (trackListEl) trackListEl.innerHTML = '<div class="alb-empty"><div class="alb-empty-icon">🎵</div><div class="alb-empty-title">Sin canciones</div><div class="alb-empty-text">Agrega canciones a este álbum</div></div>';
            K.currentPlaylist = [];
            if (elSub) elSub.textContent = 'Álbum vacío';
            return;
        }

        var h = '';
        var playIdx = 0;
        for (var i = 0; i < songs.length; i++) {
            var s = songs[i];
            var songReleased = isReleased(s.fecha_lanzamiento);
            var songLocked = !songReleased;
            var justReleased = isNewRelease(s.fecha_lanzamiento);

            if (songLocked && !K.isAdmin) {
                h += '<div class="track-item track-locked">';
                h += '<span class="track-num">' + (i + 1) + '</span>';
                h += '<div class="track-info"><div class="track-title">' + s.titulo + '</div></div>';
                h += '<div class="track-lock-info">';
                h += '<span class="track-lock-icon">🔒</span>';
                h += '<span class="track-lock-date">' + formatReleaseDate(s.fecha_lanzamiento) + '</span>';
                var cd3 = getCountdown(s.fecha_lanzamiento);
                if (cd3) h += '<span class="track-lock-date" style="color:var(--acento-dorado);border-color:rgba(255,215,0,.15)">' + cd3 + '</span>';
                h += '</div>';
                h += '</div>';
            } else if (songLocked && K.isAdmin) {
                releasedSongs.push(s);
                h += '<div class="track-item track-locked admin-override" onclick="window._playTrack(' + playIdx + ')">';
                h += '<span class="track-num">' + (i + 1) + '</span>';
                h += '<button class="track-play-btn">▶</button>';
                h += '<div class="track-info"><div class="track-title">' + s.titulo + '</div></div>';
                h += '<span class="admin-lock-label">🔒 ' + formatReleaseDate(s.fecha_lanzamiento) + '</span>';
                h += '<span class="track-duration">' + (s.duracion || '--:--') + '</span>';
                h += '<button class="track-delete visible" onclick="event.stopPropagation();window._deleteTrack(\'' + s.id + '\')">🗑</button>';
                h += '</div>';
                playIdx++;
            } else {
                releasedSongs.push(s);
                var justReleasedClass = justReleased ? ' track-just-released' : '';
                h += '<div class="track-item' + justReleasedClass + '" onclick="window._playTrack(' + playIdx + ')">';
                h += '<span class="track-num">' + (i + 1) + '</span>';
                h += '<button class="track-play-btn">▶</button>';
                h += '<div class="track-info"><div class="track-title">' + s.titulo + '</div></div>';
                if (justReleased) h += '<span class="track-new-badge">🆕 NUEVO</span>';
                h += '<span class="track-duration">' + (s.duracion || '--:--') + '</span>';
                if (K.isAdmin) h += '<button class="track-delete visible" onclick="event.stopPropagation();window._deleteTrack(\'' + s.id + '\')">🗑</button>';
                h += '</div>';
                playIdx++;
            }
        }

        if (trackListEl) trackListEl.innerHTML = h;
        K.currentPlaylist = releasedSongs;

        var unreleasedCount = 0;
        for (var j = 0; j < songs.length; j++) {
            if (!isReleased(songs[j].fecha_lanzamiento)) unreleasedCount++;
        }

        if (elMeta) {
            if (unreleasedCount > 0 && !K.isAdmin) {
                elMeta.textContent = (totalSongs - unreleasedCount) + ' DISPONIBLES';
            } else if (unreleasedCount > 0 && K.isAdmin) {
                elMeta.textContent = totalSongs + ' CANCIONES';
            }
        }

        if (elSub) {
            if (unreleasedCount > 0 && !K.isAdmin) {
                elSub.textContent = (totalSongs - unreleasedCount) + ' disponibles · ' + unreleasedCount + ' por desbloquear';
            } else if (unreleasedCount > 0 && K.isAdmin) {
                elSub.textContent = totalSongs + ' canciones · ' + unreleasedCount + ' programadas';
            } else {
                elSub.textContent = totalSongs + ' canciones en este álbum';
            }
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

            var filtered = K.isAdmin ? data : data.filter(function (s) {
                return isReleased(s.fecha_lanzamiento);
            });

            renderAllCanciones(filtered, 'allCancionesList');
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
       💿 CREAR ÁLBUM
       ══════════════════════════════════════════ */
    K._selectedCoverFile = null;

    var albumCoverFile = document.getElementById('albumCoverFile');
    if (albumCoverFile) {
        albumCoverFile.addEventListener('change', function (e) {
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
    }

    var formAlbum = document.getElementById('formAlbum');
    if (formAlbum) {
        formAlbum.addEventListener('submit', async function (e) {
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

                var insertData = {
                    titulo: titulo,
                    descripcion: desc,
                    imagen_url: imageUrl,
                    autor_id: K.currentUser.id
                };

                if (fechaInput) {
                    insertData.fecha_lanzamiento = new Date(fechaInput).toISOString();
                }

                var ins = await db.from('albumes').insert(insertData);
                if (ins.error) throw ins.error;

                var msg = fechaInput ? '¡Álbum programado para el ' + formatReleaseDate(fechaInput) + '!' : '¡Álbum creado!';
                K.showToast(msg, 'success');
                K.closeModal('modalAlbum');
                K.loadAlbumes(); K.loadStats();
            } catch (e2) { console.error(e2); K.showToast('Error: ' + e2.message, 'error'); }
            btn.classList.remove('loading'); btn.disabled = false;
        });
    }

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
       🎵 CREAR CANCIÓN
       ══════════════════════════════════════════ */
    K._selectedAudioFile = null;

    var cancionAudioFile = document.getElementById('cancionAudioFile');
    if (cancionAudioFile) {
        cancionAudioFile.addEventListener('change', function (e) {
            var f = e.target.files[0]; if (!f) return;
            K._selectedAudioFile = f;
            document.getElementById('cancionAudioArea').classList.add('has-file');
            document.getElementById('cancionAudioArea').querySelector('.file-upload-text').textContent = f.name;
        });
    }

    var formCancion = document.getElementById('formCancion');
    if (formCancion) {
        formCancion.addEventListener('submit', async function (e) {
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

                var insertData = {
                    titulo: titulo,
                    archivo_url: audioUrl,
                    imagen_url: K.currentAlbumCover,
                    album_id: K.currentAlbumId,
                    autor_id: K.currentUser.id
                };

                if (fechaInput) {
                    insertData.fecha_lanzamiento = new Date(fechaInput).toISOString();
                }

                var ins = await db.from('canciones').insert(insertData);
                if (ins.error) throw ins.error;
                document.getElementById('uploadBarFill').style.width = '100%';
                document.getElementById('uploadText').textContent = '¡Completado!';

                var msg = fechaInput ? '¡Canción programada para el ' + formatReleaseDate(fechaInput) + '!' : '¡Canción agregada!';
                K.showToast(msg, 'success');
                K.closeModal('modalCancion');
                await loadAlbumTracks(K.currentAlbumId);
                K.loadAllCanciones(); K.loadStats();
            } catch (e2) { console.error(e2); K.showToast('Error: ' + e2.message, 'error'); }
            btn.classList.remove('loading'); btn.disabled = false;
            setTimeout(function () { prog.classList.remove('show'); document.getElementById('uploadBarFill').style.width = '0%'; }, 1500);
        });
    }

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

    /* ── Auto-refresh ── */
    setInterval(function () {
        var albumPanel = document.getElementById('panel-albumes');
        var inicioPanel = document.getElementById('panel-inicio');
        if ((albumPanel && albumPanel.classList.contains('active')) ||
            (inicioPanel && inicioPanel.classList.contains('active'))) {
            K.loadAlbumes();
        }
    }, 60000);

})();