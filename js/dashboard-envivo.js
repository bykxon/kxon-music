/* ============================================
   🔴 DASHBOARD-ENVIVO.JS — KXON
   Sistema de transmisión en vivo
   - Embed YouTube (no listado/oculto)
   - Detección automática de estado
   - Contador de viewers en tiempo real
   - Notificaciones automáticas a todos
   - Panel admin para configurar
   ============================================ */
(function () {

    var db = window.db;

    function waitForKXON(cb) {
        if (window.KXON && window.KXON.showToast) cb();
        else setTimeout(function () { waitForKXON(cb); }, 50);
    }

    waitForKXON(function () { initEnVivo(); });

    function initEnVivo() {

        var K = window.KXON;
        var liveCheckInterval = null;
        var viewerInterval = null;
        var durationInterval = null;
        var liveStartTime = null;
        var currentLiveData = null;

        /* ══════════════════════════════════════════
           🔄 CARGAR ESTADO DEL DIRECTO
           ══════════════════════════════════════════ */
        K.loadLiveStatus = async function () {
            try {
                var r = await db.from('live_streams')
                    .select('*')
                    .eq('activo', true)
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (r.error) throw r.error;

                if (r.data && r.data.length > 0) {
                    currentLiveData = r.data[0];
                    showLiveState(currentLiveData);
                } else {
                    currentLiveData = null;
                    showOfflineState();
                }

                if (K.isAdmin) {
                    loadLiveHistory();
                    updateAdminUI();
                }

                var adminSection = document.getElementById('liveAdminSection');
                if (adminSection) {
                    adminSection.style.display = K.isAdmin ? 'block' : 'none';
                }

            } catch (e) {
                console.error('Error cargando estado live:', e);
                showOfflineState();
            }
        };

        /* ══════════════════════════════════════════
           🔴 MOSTRAR ESTADO: EN VIVO
           ══════════════════════════════════════════ */
        function showLiveState(data) {
            var activeSection = document.getElementById('liveActiveSection');
            var offlineSection = document.getElementById('liveOfflineSection');
            if (!activeSection || !offlineSection) return;

            activeSection.style.display = 'block';
            offlineSection.style.display = 'none';

            document.getElementById('liveStreamTitle').textContent = data.titulo || 'KXON en directo';

            var desc = document.getElementById('liveDescription');
            if (data.descripcion) {
                desc.textContent = data.descripcion;
                desc.style.display = 'block';
            } else {
                desc.style.display = 'none';
            }

            var iframe = document.getElementById('liveIframe');
            iframe.src = 'https://www.youtube.com/embed/' + data.youtube_id + '?autoplay=1&rel=0&modestbranding=1&playsinline=1';

            var chatSection = document.getElementById('liveChatSection');
            if (data.incluir_chat) {
                chatSection.style.display = 'block';
                var chatIframe = document.getElementById('liveChatIframe');
                chatIframe.src = 'https://www.youtube.com/live_chat?v=' + data.youtube_id + '&embed_domain=' + window.location.hostname;
            } else {
                chatSection.style.display = 'none';
            }

            var dot = document.getElementById('navLiveDot');
            if (dot) dot.style.display = 'block';

            liveStartTime = new Date(data.created_at);
            updateDuration();
            if (durationInterval) clearInterval(durationInterval);
            durationInterval = setInterval(updateDuration, 60000);

            startViewerCounter(data);
        }

        /* ══════════════════════════════════════════
           📺 MOSTRAR ESTADO: OFFLINE
           ══════════════════════════════════════════ */
        function showOfflineState() {
            var activeSection = document.getElementById('liveActiveSection');
            var offlineSection = document.getElementById('liveOfflineSection');
            if (!activeSection || !offlineSection) return;

            activeSection.style.display = 'none';
            offlineSection.style.display = 'block';

            var dot = document.getElementById('navLiveDot');
            if (dot) dot.style.display = 'none';

            var iframe = document.getElementById('liveIframe');
            if (iframe) iframe.src = '';

            var chatIframe = document.getElementById('liveChatIframe');
            if (chatIframe) chatIframe.src = '';

            if (durationInterval) clearInterval(durationInterval);
            if (viewerInterval) clearInterval(viewerInterval);

            loadLastStream();
        }

        /* ══════════════════════════════════════════
           ⏱ DURACIÓN DEL DIRECTO
           ══════════════════════════════════════════ */
        function updateDuration() {
            if (!liveStartTime) return;
            var now = new Date();
            var diff = Math.floor((now - liveStartTime) / 60000);
            var hours = Math.floor(diff / 60);
            var mins = diff % 60;

            var text = '⏱ Iniciado hace ';
            if (hours > 0) text += hours + 'h ';
            text += mins + ' min';

            var el = document.getElementById('liveDuration');
            if (el) el.textContent = text;
        }

        /* ══════════════════════════════════════════
           👁 CONTADOR DE VIEWERS EN TIEMPO REAL
           ══════════════════════════════════════════ */
        function startViewerCounter(data) {
            if (viewerInterval) clearInterval(viewerInterval);

            async function reportViewing() {
                try {
                    if (!K.currentUser || !currentLiveData) return;
                    await db.from('live_viewers').upsert({
                        stream_id: currentLiveData.id,
                        user_id: K.currentUser.id,
                        last_seen: new Date().toISOString()
                    }, { onConflict: 'stream_id,user_id' });
                } catch (e) { /* silencioso */ }
            }

            async function countViewers() {
                try {
                    if (!currentLiveData) return;
                    var twoMinAgo = new Date(Date.now() - 120000).toISOString();
                    var r = await db.from('live_viewers')
                        .select('id', { count: 'exact', head: true })
                        .eq('stream_id', currentLiveData.id)
                        .gte('last_seen', twoMinAgo);

                    var count = r.count || 0;
                    var el = document.getElementById('liveViewersNum');
                    if (el) el.textContent = count;
                } catch (e) { /* silencioso */ }
            }

            reportViewing();
            countViewers();

            viewerInterval = setInterval(function () {
                reportViewing();
                countViewers();
            }, 30000);
        }

        /* ══════════════════════════════════════════
           💬 TOGGLE CHAT
           ══════════════════════════════════════════ */
        window._toggleLiveChat = function () {
            var container = document.getElementById('liveChatContainer');
            var btn = document.getElementById('liveChatToggle');
            if (!container || !btn) return;
            if (container.style.display === 'none') {
                container.style.display = 'block';
                btn.textContent = 'Ocultar';
            } else {
                container.style.display = 'none';
                btn.textContent = 'Mostrar';
            }
        };

        /* ══════════════════════════════════════════
           🔴 ADMIN: INICIAR EN VIVO
           ══════════════════════════════════════════ */
        window._goLive = async function () {
            var ytId = document.getElementById('liveYoutubeId').value.trim();
            var titulo = document.getElementById('liveTitle').value.trim();
            var desc = document.getElementById('liveDesc').value.trim();
            var includeChat = document.getElementById('liveIncludeChat').checked;

            if (!ytId) {
                K.showToast('Ingresa el ID del video de YouTube', 'error');
                return;
            }
            if (!titulo) titulo = 'KXON en directo';

            var idMatch = ytId.match(/(?:v=|youtu\.be\/|embed\/|\/v\/)([a-zA-Z0-9_-]{11})/);
            if (idMatch) ytId = idMatch[1];

            if (ytId.length !== 11) {
                K.showToast('ID de YouTube inválido (debe tener 11 caracteres)', 'error');
                return;
            }

            var btn = document.getElementById('btnGoLive');
            btn.disabled = true;
            btn.textContent = '⏳ Iniciando...';

            try {
                await db.from('live_streams')
                    .update({ activo: false, ended_at: new Date().toISOString() })
                    .eq('activo', true);

                var ins = await db.from('live_streams').insert({
                    youtube_id: ytId,
                    titulo: titulo,
                    descripcion: desc,
                    incluir_chat: includeChat,
                    activo: true,
                    admin_id: K.currentUser.id
                });

                if (ins.error) throw ins.error;

                K.showToast('🔴 ¡Transmisión en vivo iniciada!', 'success');

                sendLiveNotification(titulo);

                K.loadLiveStatus();

                document.getElementById('liveYoutubeId').value = '';
                document.getElementById('liveTitle').value = '';
                document.getElementById('liveDesc').value = '';
                document.getElementById('liveIncludeChat').checked = false;

            } catch (e) {
                console.error('Error al iniciar live:', e);
                K.showToast('Error: ' + e.message, 'error');
            }

            btn.disabled = false;
            btn.textContent = '🔴 Iniciar En Vivo';
        };

        /* ══════════════════════════════════════════
           ⏹ ADMIN: TERMINAR TRANSMISIÓN
           ══════════════════════════════════════════ */
        window._stopLive = async function () {
            if (!confirm('¿Terminar la transmisión en vivo?')) return;

            try {
                await db.from('live_streams')
                    .update({
                        activo: false,
                        ended_at: new Date().toISOString()
                    })
                    .eq('activo', true);

                if (currentLiveData) {
                    await db.from('live_viewers')
                        .delete()
                        .eq('stream_id', currentLiveData.id);
                }

                K.showToast('⏹ Transmisión finalizada', 'success');
                K.loadLiveStatus();
            } catch (e) {
                console.error(e);
                K.showToast('Error: ' + e.message, 'error');
            }
        };

        /* ══════════════════════════════════════════
           🔔 ENVIAR NOTIFICACIÓN A TODOS
           ══════════════════════════════════════════ */
        async function sendLiveNotification(titulo) {
            try {
                var r = await db.from('profiles').select('id');
                if (r.error || !r.data) return;

                var notifications = [];
                for (var i = 0; i < r.data.length; i++) {
                    if (r.data[i].id === K.currentUser.id) continue;
                    notifications.push({
                        usuario_id: r.data[i].id,
                        tipo: 'live',
                        titulo: '🔴 KXON está en vivo!',
                        mensaje: titulo,
                        leida: false,
                        link_panel: 'envivo'
                    });
                }

                if (notifications.length > 0) {
                    for (var j = 0; j < notifications.length; j += 50) {
                        var batch = notifications.slice(j, j + 50);
                        await db.from('notificaciones').insert(batch);
                    }
                    console.log('✅ Notificaciones live enviadas:', notifications.length);
                }
            } catch (e) {
                console.error('Error enviando notificaciones live:', e);
            }
        }

        /* ══════════════════════════════════════════
           📋 HISTORIAL DE TRANSMISIONES
           ══════════════════════════════════════════ */
        async function loadLiveHistory() {
            try {
                var r = await db.from('live_streams')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(10);

                if (r.error) throw r.error;

                var container = document.getElementById('liveHistory');
                if (!container) return;

                if (!r.data || r.data.length === 0) {
                    container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--plata-oscura);font-size:.82rem;">Sin transmisiones anteriores</div>';
                    return;
                }

                var h = '';
                for (var i = 0; i < r.data.length; i++) {
                    var s = r.data[i];
                    var fecha = new Date(s.created_at).toLocaleDateString('es-ES', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                    });
                    var duracion = '';
                    if (s.ended_at) {
                        var diff = Math.floor((new Date(s.ended_at) - new Date(s.created_at)) / 60000);
                        var hrs = Math.floor(diff / 60);
                        var mins = diff % 60;
                        duracion = ' · ';
                        if (hrs > 0) duracion += hrs + 'h ';
                        duracion += mins + 'min';
                    }

                    h += '<div class="live-history-item">';
                    h += '<span class="live-history-dot ' + (s.activo ? 'was-live' : '') + '"></span>';
                    h += '<div class="live-history-info">';
                    h += '<div class="live-history-title">' + (s.activo ? '🔴 ' : '') + (s.titulo || 'Sin título') + '</div>';
                    h += '<div class="live-history-meta">' + fecha + duracion + '</div>';
                    h += '</div>';
                    h += '<button class="live-history-delete" onclick="window._deleteLiveStream(\'' + s.id + '\')" title="Eliminar">🗑</button>';
                    h += '</div>';
                }
                container.innerHTML = h;
            } catch (e) {
                console.error(e);
            }
        }

        /* ══════════════════════════════════════════
           🗑 ELIMINAR STREAM DEL HISTORIAL
           ══════════════════════════════════════════ */
        window._deleteLiveStream = async function (id) {
            if (!confirm('¿Eliminar esta transmisión del historial?')) return;
            try {
                await db.from('live_viewers').delete().eq('stream_id', id);
                await db.from('live_streams').delete().eq('id', id);
                K.showToast('Transmisión eliminada', 'success');
                loadLiveHistory();
            } catch (e) {
                K.showToast('Error: ' + e.message, 'error');
            }
        };

        /* ══════════════════════════════════════════
           📺 ÚLTIMA TRANSMISIÓN (para offline)
           ══════════════════════════════════════════ */
        async function loadLastStream() {
            try {
                var r = await db.from('live_streams')
                    .select('titulo, created_at, ended_at')
                    .eq('activo', false)
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (r.data && r.data.length > 0) {
                    var last = r.data[0];
                    var fecha = new Date(last.created_at).toLocaleDateString('es-ES', {
                        day: 'numeric', month: 'long', year: 'numeric'
                    });
                    var el = document.getElementById('liveOfflineLast');
                    if (el) {
                        el.innerHTML = '📅 Última transmisión: <strong>' + (last.titulo || 'KXON en directo') + '</strong> — ' + fecha;
                    }
                }
            } catch (e) { /* silencioso */ }
        }

        /* ══════════════════════════════════════════
           ⚙️ ADMIN UI UPDATE
           ══════════════════════════════════════════ */
        function updateAdminUI() {
            var dotEl = document.querySelector('.live-admin-status-dot');
            var textEl = document.getElementById('liveAdminStatusText');
            var btnStart = document.getElementById('btnGoLive');
            var btnStop = document.getElementById('btnStopLive');

            if (currentLiveData && currentLiveData.activo) {
                if (dotEl) { dotEl.classList.remove('offline'); dotEl.classList.add('online'); }
                if (textEl) textEl.textContent = 'EN VIVO — ' + (currentLiveData.titulo || '');
                if (btnStart) btnStart.style.display = 'none';
                if (btnStop) btnStop.style.display = 'block';
            } else {
                if (dotEl) { dotEl.classList.remove('online'); dotEl.classList.add('offline'); }
                if (textEl) textEl.textContent = 'Offline';
                if (btnStart) btnStart.style.display = 'block';
                if (btnStop) btnStop.style.display = 'none';
            }
        }

        /* ══════════════════════════════════════════
           🔄 POLLING: DETECTAR AUTOMÁTICAMENTE
           Cada 30s chequea si hay live activo
           ══════════════════════════════════════════ */
        function startLivePolling() {
            if (liveCheckInterval) clearInterval(liveCheckInterval);

            liveCheckInterval = setInterval(async function () {
                try {
                    var r = await db.from('live_streams')
                        .select('id, activo')
                        .eq('activo', true)
                        .limit(1);

                    var isLive = r.data && r.data.length > 0;
                    var wasLive = currentLiveData && currentLiveData.activo;

                    if (isLive && !wasLive) {
                        console.log('🔴 Directo detectado!');
                        K.loadLiveStatus();
                        var dot = document.getElementById('navLiveDot');
                        if (dot) dot.style.display = 'block';
                    }

                    if (!isLive && wasLive) {
                        console.log('⏹ Directo terminado');
                        currentLiveData = null;
                        showOfflineState();
                    }
                } catch (e) { /* silencioso */ }
            }, 30000);
        }

        /* ══════════════════════════════════════════
           🚀 INICIAR
           ══════════════════════════════════════════ */
        startLivePolling();

        /* Chequear al inicio si hay live activo para el nav dot */
        (async function () {
            try {
                var r = await db.from('live_streams')
                    .select('id')
                    .eq('activo', true)
                    .limit(1);
                if (r.data && r.data.length > 0) {
                    var dot = document.getElementById('navLiveDot');
                    if (dot) dot.style.display = 'block';
                }
            } catch (e) { /* silencioso */ }
        })();

        console.log('✅ dashboard-envivo.js cargado correctamente');
    }

})();