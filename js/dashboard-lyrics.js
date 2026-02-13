/* ============================================
   🎵 DASHBOARD-LYRICS.JS — KXON
   Letras de canciones + Créditos de producción
   ============================================ */
(function () {

    var db = window.db;

    function waitForKXON(cb) {
        if (window.KXON && window.KXON.currentUser) cb();
        else setTimeout(function () { waitForKXON(cb); }, 50);
    }

    waitForKXON(function () {
        initLyrics();
    });

    function initLyrics() {
        var K = window.KXON;

        /* ══════════════════════════════════════════
           🎵 ABRIR PANEL DE LETRAS
           ══════════════════════════════════════════ */
        window._openLyrics = async function (songId) {
            if (!songId) {
                /* Usar canción actual */
                if (K.currentPlaylist && K.currentPlaylist[K.currentTrackIndex]) {
                    songId = K.currentPlaylist[K.currentTrackIndex].id;
                }
            }

            if (!songId) {
                K.showToast('No hay canción seleccionada', 'error');
                return;
            }

            try {
                var r = await db.from('canciones')
                    .select('id, titulo, letra, creditos, albumes(titulo)')
                    .eq('id', songId)
                    .single();

                if (r.error) throw r.error;
                var song = r.data;

                /* Llenar modal */
                var titleEl = document.getElementById('lyricsTitle');
                var albumEl = document.getElementById('lyricsAlbum');
                var textEl = document.getElementById('lyricsText');
                var creditsEl = document.getElementById('creditsContent');
                var editBtn = document.getElementById('lyricsEditBtn');

                if (titleEl) titleEl.textContent = song.titulo;
                if (albumEl) albumEl.textContent = song.albumes ? song.albumes.titulo : 'KXON';

                /* Letras */
                if (textEl) {
                    if (song.letra && song.letra.trim().length > 0) {
                        textEl.innerHTML = formatLyrics(song.letra);
                        textEl.classList.remove('no-lyrics');
                    } else {
                        textEl.innerHTML = '<div class="lyrics-empty">'
                            + '<span class="lyrics-empty-icon">📝</span>'
                            + '<span class="lyrics-empty-text">Letra no disponible aún</span>'
                            + '</div>';
                        textEl.classList.add('no-lyrics');
                    }
                }

                /* Créditos */
                if (creditsEl) {
                    var credits = song.creditos || {};
                    if (typeof credits === 'string') {
                        try { credits = JSON.parse(credits); } catch (e) { credits = {}; }
                    }
                    renderCredits(credits, creditsEl);
                }

                /* Botón editar (solo admin) */
                if (editBtn) {
                    if (K.isAdmin) {
                        editBtn.style.display = 'inline-flex';
                        editBtn.onclick = function () {
                            window._editLyrics(songId, song.letra || '', song.creditos || {});
                        };
                    } else {
                        editBtn.style.display = 'none';
                    }
                }

                /* Guardar ID actual */
                K._currentLyricsSongId = songId;

                /* Mostrar modal */
                var overlay = document.getElementById('lyricsOverlay');
                if (overlay) overlay.classList.add('show');

            } catch (e) {
                console.error('Error loading lyrics:', e);
                K.showToast('Error al cargar letra', 'error');
            }
        };

        /* ══════════════════════════════════════════
           ✏️ EDITAR LETRAS Y CRÉDITOS (Admin)
           ══════════════════════════════════════════ */
        window._editLyrics = function (songId, currentLyrics, currentCredits) {
            if (!K.isAdmin) return;

            if (typeof currentCredits === 'string') {
                try { currentCredits = JSON.parse(currentCredits); } catch (e) { currentCredits = {}; }
            }

            var editOverlay = document.getElementById('lyricsEditOverlay');
            if (!editOverlay) return;

            document.getElementById('editLyricsText').value = currentLyrics || '';
            document.getElementById('editCreditProductor').value = currentCredits.productor || '';
            document.getElementById('editCreditCompositor').value = currentCredits.compositor || '';
            document.getElementById('editCreditFeaturing').value = currentCredits.featuring || '';
            document.getElementById('editCreditBpm').value = currentCredits.bpm || '';
            document.getElementById('editCreditTonalidad').value = currentCredits.tonalidad || '';
            document.getElementById('editCreditGenero').value = currentCredits.genero || '';

            K._editingLyricsSongId = songId;
            editOverlay.classList.add('show');
        };

        window._saveLyrics = async function () {
            if (!K.isAdmin || !K._editingLyricsSongId) return;

            var letra = document.getElementById('editLyricsText').value;
            var creditos = {
                productor: document.getElementById('editCreditProductor').value.trim(),
                compositor: document.getElementById('editCreditCompositor').value.trim(),
                featuring: document.getElementById('editCreditFeaturing').value.trim(),
                bpm: document.getElementById('editCreditBpm').value.trim(),
                tonalidad: document.getElementById('editCreditTonalidad').value.trim(),
                genero: document.getElementById('editCreditGenero').value.trim()
            };

            var btn = document.getElementById('btnSaveLyrics');
            if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }

            try {
                var r = await db.from('canciones')
                    .update({ letra: letra, creditos: creditos })
                    .eq('id', K._editingLyricsSongId);

                if (r.error) throw r.error;

                K.showToast('✅ Letra y créditos guardados', 'success');

                /* Cerrar editor y refrescar vista */
                var editOverlay = document.getElementById('lyricsEditOverlay');
                if (editOverlay) editOverlay.classList.remove('show');

                /* Refrescar el modal de letras si está abierto */
                if (K._currentLyricsSongId === K._editingLyricsSongId) {
                    window._openLyrics(K._editingLyricsSongId);
                }

            } catch (e) {
                console.error('Error saving lyrics:', e);
                K.showToast('Error al guardar', 'error');
            }

            if (btn) { btn.disabled = false; btn.textContent = '💾 Guardar'; }
        };

        window._closeLyrics = function () {
            var overlay = document.getElementById('lyricsOverlay');
            if (overlay) overlay.classList.remove('show');
        };

        window._closeLyricsEdit = function () {
            var overlay = document.getElementById('lyricsEditOverlay');
            if (overlay) overlay.classList.remove('show');
        };

        /* ══════════════════════════════════════════
           🎨 RENDER HELPERS
           ══════════════════════════════════════════ */
        function formatLyrics(text) {
            if (!text) return '';
            var lines = text.split('\n');
            var h = '';
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i].trim();
                if (line === '') {
                    h += '<div class="lyrics-break"></div>';
                } else if (line.startsWith('[') && line.endsWith(']')) {
                    h += '<div class="lyrics-section">' + escapeHTML(line.slice(1, -1)) + '</div>';
                } else {
                    h += '<div class="lyrics-line">' + escapeHTML(line) + '</div>';
                }
            }
            return h;
        }

        function renderCredits(credits, container) {
            if (!container) return;

            var fields = [
                { key: 'productor', icon: '🎹', label: 'Productor' },
                { key: 'compositor', icon: '✍️', label: 'Compositor' },
                { key: 'featuring', icon: '🎤', label: 'Featuring' },
                { key: 'bpm', icon: '⏱', label: 'BPM' },
                { key: 'tonalidad', icon: '🎵', label: 'Tonalidad' },
                { key: 'genero', icon: '🎶', label: 'Género' }
            ];

            var hasAny = false;
            var h = '';

            for (var i = 0; i < fields.length; i++) {
                var f = fields[i];
                var val = credits[f.key];
                if (val && val.trim().length > 0) {
                    hasAny = true;
                    h += '<div class="credit-item">';
                    h += '<span class="credit-icon">' + f.icon + '</span>';
                    h += '<div class="credit-info">';
                    h += '<span class="credit-label">' + f.label + '</span>';
                    h += '<span class="credit-value">' + escapeHTML(val) + '</span>';
                    h += '</div></div>';
                }
            }

            if (!hasAny) {
                container.innerHTML = '<div class="credits-empty">Sin créditos disponibles</div>';
            } else {
                container.innerHTML = h;
            }
        }

        function escapeHTML(str) {
            var div = document.createElement('div');
            div.appendChild(document.createTextNode(str));
            return div.innerHTML;
        }

        /* ══════════════════════════════════════════
           🔗 INTEGRAR CON PLAYER
           ══════════════════════════════════════════ */
        /* Botón lyrics en player expandido */
        var lyricsBtn = document.getElementById('playerExpLyrics');
        if (lyricsBtn) {
            lyricsBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                window._openLyrics();
            });
        }

        console.log('✅ dashboard-lyrics.js cargado');
    }

})();