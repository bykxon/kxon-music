/* ============================================
   📋 DASHBOARD-SOLICITUDES-BEATS.JS — KXON
   Sistema de solicitudes de beats personalizados
   ============================================ */
(function () {

    var db = window.db;

    function waitForKXON(cb) {
        if (window.KXON && window.KXON.currentUser) cb();
        else setTimeout(function () { waitForKXON(cb); }, 50);
    }

    waitForKXON(function () {
        initSolicitudesBeats();
    });

    function initSolicitudesBeats() {
        var K = window.KXON;

        /* ══════════════════════════════════════════
           📋 CARGAR SOLICITUDES
           ══════════════════════════════════════════ */
        K.loadSolicitudesBeats = async function () {
            try {
                var query = db.from('solicitudes_beats')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (!K.isAdmin) {
                    query = query.eq('usuario_id', K.currentUser.id);
                }

                var r = await query;
                if (r.error) throw r.error;

                var data = r.data || [];
                renderSolicitudes(data);
            } catch (e) {
                console.error('Error loading solicitudes beats:', e);
            }
        };

        /* ══════════════════════════════════════════
           🎨 RENDER
           ══════════════════════════════════════════ */
        function renderSolicitudes(solicitudes) {
            var container = document.getElementById('solicitudesBeatsGrid');
            if (!container) return;

            if (!solicitudes.length) {
                container.innerHTML = '<div class="empty-state">'
                    + '<div class="empty-icon">📋</div>'
                    + '<div class="empty-title">Sin solicitudes</div>'
                    + '<div class="empty-text">' + (K.isAdmin ? 'No hay solicitudes de beats pendientes' : 'Solicita un beat personalizado') + '</div>'
                    + '</div>';
                return;
            }

            var h = '';
            for (var i = 0; i < solicitudes.length; i++) {
                var s = solicitudes[i];
                var statusClass = 'status-' + s.estado;
                var statusIcon = s.estado === 'pendiente' ? '⏳' : s.estado === 'aceptada' ? '✅' : s.estado === 'rechazada' ? '❌' : s.estado === 'completada' ? '🎵' : '📋';
                var statusText = s.estado.charAt(0).toUpperCase() + s.estado.slice(1);
                var fecha = new Date(s.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

                h += '<div class="sol-beat-card ' + statusClass + '">';
                h += '<div class="sol-beat-header">';
                h += '<div class="sol-beat-status"><span class="sol-beat-status-icon">' + statusIcon + '</span><span class="sol-beat-status-text">' + statusText + '</span></div>';
                h += '<span class="sol-beat-date">' + fecha + '</span>';
                h += '</div>';

                h += '<div class="sol-beat-body">';
                if (K.isAdmin) {
                    h += '<div class="sol-beat-user">👤 ' + escapeHTML(s.usuario_nombre) + ' — ' + escapeHTML(s.usuario_email) + '</div>';
                }
                h += '<div class="sol-beat-grid">';
                h += '<div class="sol-beat-field"><span class="sol-beat-label">Género</span><span class="sol-beat-value">' + escapeHTML(s.genero) + '</span></div>';
                if (s.bpm) h += '<div class="sol-beat-field"><span class="sol-beat-label">BPM</span><span class="sol-beat-value">' + escapeHTML(s.bpm) + '</span></div>';
                if (s.mood) h += '<div class="sol-beat-field"><span class="sol-beat-label">Mood</span><span class="sol-beat-value">' + escapeHTML(s.mood) + '</span></div>';
                if (s.presupuesto) h += '<div class="sol-beat-field"><span class="sol-beat-label">Presupuesto</span><span class="sol-beat-value">' + escapeHTML(s.presupuesto) + '</span></div>';
                h += '</div>';

                h += '<div class="sol-beat-desc">' + escapeHTML(s.descripcion) + '</div>';

                if (s.referencia) {
                    h += '<div class="sol-beat-ref">🔗 Referencia: ' + escapeHTML(s.referencia) + '</div>';
                }

                if (s.respuesta_admin) {
                    h += '<div class="sol-beat-response">';
                    h += '<div class="sol-beat-response-label">💬 Respuesta del productor:</div>';
                    h += '<div class="sol-beat-response-text">' + escapeHTML(s.respuesta_admin) + '</div>';
                    if (s.precio_final > 0) {
                        h += '<div class="sol-beat-price-final">💰 Precio: $' + Number(s.precio_final).toLocaleString('es-CO') + '</div>';
                    }
                    h += '</div>';
                }

                /* Admin actions */
                if (K.isAdmin && s.estado === 'pendiente') {
                    h += '<div class="sol-beat-admin-actions">';
                    h += '<button class="sol-beat-btn-accept" onclick="window._respondSolicitudBeat(\'' + s.id + '\')">💬 Responder</button>';
                    h += '<button class="sol-beat-btn-reject" onclick="window._rejectSolicitudBeat(\'' + s.id + '\')">❌ Rechazar</button>';
                    h += '</div>';
                }

                h += '</div></div>';
            }

            container.innerHTML = h;
        }

        /* ══════════════════════════════════════════
           📤 CREAR SOLICITUD
           ══════════════════════════════════════════ */
        window._openSolicitudBeat = function () {
            var overlay = document.getElementById('modalSolicitudBeat');
            if (overlay) overlay.classList.add('show');
        };

        window._closeSolicitudBeat = function () {
            var overlay = document.getElementById('modalSolicitudBeat');
            if (overlay) overlay.classList.remove('show');
        };

        window._submitSolicitudBeat = async function (e) {
            if (e) e.preventDefault();

            var genero = document.getElementById('solBeatGenero').value.trim();
            var bpm = document.getElementById('solBeatBpm').value.trim();
            var mood = document.getElementById('solBeatMood').value.trim();
            var referencia = document.getElementById('solBeatReferencia').value.trim();
            var descripcion = document.getElementById('solBeatDescripcion').value.trim();
            var presupuesto = document.getElementById('solBeatPresupuesto').value.trim();

            if (!genero || !descripcion) {
                K.showToast('Completa género y descripción', 'error');
                return;
            }

            var btn = document.getElementById('btnSubmitSolBeat');
            if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }

            try {
                var nombre = K.currentProfile.full_name || K.currentUser.email.split('@')[0];
                var r = await db.from('solicitudes_beats').insert({
                    usuario_id: K.currentUser.id,
                    usuario_nombre: nombre,
                    usuario_email: K.currentUser.email,
                    genero: genero,
                    bpm: bpm,
                    mood: mood,
                    referencia: referencia,
                    descripcion: descripcion,
                    presupuesto: presupuesto
                });

                if (r.error) throw r.error;

                K.showToast('🎵 Solicitud enviada correctamente', 'success');
                window._closeSolicitudBeat();

                /* Limpiar form */
                document.getElementById('solBeatGenero').value = '';
                document.getElementById('solBeatBpm').value = '';
                document.getElementById('solBeatMood').value = '';
                document.getElementById('solBeatReferencia').value = '';
                document.getElementById('solBeatDescripcion').value = '';
                document.getElementById('solBeatPresupuesto').value = '';

                K.loadSolicitudesBeats();

            } catch (e2) {
                K.showToast('Error: ' + e2.message, 'error');
            }

            if (btn) { btn.disabled = false; btn.textContent = '🎵 Enviar Solicitud'; }
        };

        /* ══════════════════════════════════════════
           💬 RESPONDER SOLICITUD (Admin)
           ══════════════════════════════════════════ */
        window._respondSolicitudBeat = async function (id) {
            var respuesta = prompt('Escribe tu respuesta al artista:');
            if (!respuesta) return;
            var precio = prompt('¿Precio del beat? (solo número, 0 si no aplica):');
            precio = parseInt(precio) || 0;

            try {
                var r = await db.from('solicitudes_beats')
                    .update({
                        respuesta_admin: respuesta,
                        precio_final: precio,
                        estado: 'aceptada',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', id);

                if (r.error) throw r.error;
                K.showToast('✅ Respuesta enviada', 'success');
                K.loadSolicitudesBeats();
            } catch (e) {
                K.showToast('Error: ' + e.message, 'error');
            }
        };

        window._rejectSolicitudBeat = async function (id) {
            if (!confirm('¿Rechazar esta solicitud?')) return;
            try {
                var r = await db.from('solicitudes_beats')
                    .update({ estado: 'rechazada', updated_at: new Date().toISOString() })
                    .eq('id', id);

                if (r.error) throw r.error;
                K.showToast('Solicitud rechazada', 'success');
                K.loadSolicitudesBeats();
            } catch (e) {
                K.showToast('Error: ' + e.message, 'error');
            }
        };

        function escapeHTML(str) {
            if (!str) return '';
            var div = document.createElement('div');
            div.appendChild(document.createTextNode(str));
            return div.innerHTML;
        }

        console.log('✅ dashboard-solicitudes-beats.js cargado');
    }

})();