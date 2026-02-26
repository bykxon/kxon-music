/* ============================================
   🔴 DASHBOARD-ENVIO.JS — KXON EN VIVO 2026
   Transmisión en vivo con YouTube embed
   IDs match: kxLive*, kxBtn*, kxForm*
   ============================================ */
(function () {
    'use strict';

    var db = window.db;
    var K = window.KXON;

    /* ── State ── */
    var isLive = false;
    var currentStream = null;
    var durationInterval = null;
    var liveStartTime = null;

    /* ═══════════════════════════════════════════
       DOM CACHE
       ═══════════════════════════════════════════ */
    var els = {};

    function cacheElements() {
        // Header
        els.headerDot        = document.getElementById('kxLiveHeaderDot');

        // KPIs
        els.kpiViewers       = document.getElementById('liveKpiViewers');
        els.kpiStatus        = document.getElementById('liveKpiStatus');
        els.kpiDuration      = document.getElementById('liveKpiDuration');

        // Live active section (wrapper)
        els.activeSection    = document.getElementById('kxLiveActiveSection');

        // Hero
        els.hero             = document.getElementById('kxLiveHero');
        els.streamTitle      = document.getElementById('kxLiveStreamTitle');
        els.viewersNum       = document.getElementById('kxLiveViewersNum');
        els.durationText     = document.getElementById('kxLiveDuration');

        // Player
        els.player           = document.getElementById('kxLivePlayer');
        els.iframe           = document.getElementById('kxLiveIframe');

        // Description
        els.descSection      = document.getElementById('kxLiveDescSection');
        els.descText         = document.getElementById('kxLiveDescription');

        // Chat
        els.chatSection      = document.getElementById('kxLiveChatSection');
        els.chatContainer    = document.getElementById('kxLiveChatContainer');
        els.chatIframe       = document.getElementById('kxLiveChatIframe');
        els.chatToggle       = document.getElementById('kxLiveChatToggle');

        // Offline
        els.offlineSection   = document.getElementById('kxLiveOfflineSection');
        els.offlineLast      = document.getElementById('kxLiveOfflineLast');
        els.offlineLastText  = document.getElementById('kxLiveOfflineLastText');

        // Admin
        els.adminSection     = document.getElementById('kxLiveAdminSection');
        els.adminDot         = document.getElementById('kxLiveAdminDot');
        els.adminStatusText  = document.getElementById('kxLiveAdminStatusText');

        // Admin form inputs
        els.inputYoutubeId   = document.getElementById('kxLiveYoutubeId');
        els.inputTitle       = document.getElementById('kxLiveTitle');
        els.inputDesc        = document.getElementById('kxLiveDesc');
        els.inputIncludeChat = document.getElementById('kxLiveIncludeChat');

        // Admin buttons
        els.btnGoLive        = document.getElementById('kxBtnGoLive');
        els.btnStopLive      = document.getElementById('kxBtnStopLive');

        // History
        els.historyList      = document.getElementById('kxLiveHistory');
    }

    /* ═══════════════════════════════════════════
       YOUTUBE HELPERS
       ═══════════════════════════════════════════ */
    function extractYoutubeId(input) {
        if (!input) return null;
        input = input.trim();

        // Si ya es un ID limpio (11 chars)
        if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;

        // Extraer de URL
        var patterns = [
            /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
            /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
            /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
            /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
            /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
            /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/
        ];

        for (var i = 0; i < patterns.length; i++) {
            var match = input.match(patterns[i]);
            if (match && match[1]) return match[1];
        }

        return null;
    }

    function buildEmbedUrl(videoId) {
        return 'https://www.youtube.com/embed/' + videoId +
               '?autoplay=1&rel=0&modestbranding=1&playsinline=1';
    }

    function buildChatUrl(videoId) {
        return 'https://www.youtube.com/live_chat?v=' + videoId +
               '&embed_domain=' + window.location.hostname +
               '&dark_theme=1';
    }

    /* ═══════════════════════════════════════════
       UTILITY
       ═══════════════════════════════════════════ */
    function escHTML(str) {
        if (!str) return '';
        var d = document.createElement('div');
        d.appendChild(document.createTextNode(str));
        return d.innerHTML;
    }

    function pad(n) {
        return n < 10 ? '0' + n : String(n);
    }

    function formatDuration(seconds) {
        var h = Math.floor(seconds / 3600);
        var m = Math.floor((seconds % 3600) / 60);
        var s = seconds % 60;
        if (h > 0) return h + 'h ' + m + 'min';
        if (m > 0) return m + 'min';
        return s + 's';
    }

    function formatDateShort(dateStr) {
        if (!dateStr) return '—';
        try {
            return new Date(dateStr).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        } catch (e) { return '—'; }
    }

    function minutesAgo(dateStr) {
        if (!dateStr) return 0;
        return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    }

    /* ═══════════════════════════════════════════
       🔴 MAIN ENTRY — K.loadEnVivo()
       ═══════════════════════════════════════════ */
    K.loadEnVivo = async function () {
        cacheElements();
        bindEvents();

        try {
            // Buscar stream activo
            var result = await db.from('envivo')
                .select('*')
                .eq('activo', true)
                .order('inicio', { ascending: false })
                .limit(1);

            if (result.error) throw result.error;

            if (result.data && result.data.length > 0) {
                currentStream = result.data[0];
                activateLiveState();
            } else {
                currentStream = null;
                activateOfflineState();
            }

            // Mostrar admin si es admin
            if (K.isAdmin && els.adminSection) {
                els.adminSection.classList.add('visible');
            }

            // Cargar historial
            await loadHistory();

            // Cargar última transmisión para offline
            await loadLastStreamInfo();

        } catch (e) {
            console.error('[EnVivo] Error loading:', e);
            activateOfflineState();
        }
    };

    /* ═══════════════════════════════════════════
       ✅ ACTIVATE LIVE STATE
       ═══════════════════════════════════════════ */
    function activateLiveState() {
        isLive = true;

        if (!currentStream) return;

        var videoId = currentStream.youtube_id;

        // — Show active section, hide offline —
        if (els.activeSection) els.activeSection.style.display = 'block';
        if (els.hero) {
            els.hero.classList.add('active');
            els.hero.style.display = 'block';
        }
        if (els.player) els.player.style.display = 'block';
        if (els.offlineSection) {
            els.offlineSection.classList.remove('active');
            els.offlineSection.style.display = 'none';
        }

        // — Header dot —
        if (els.headerDot) {
            els.headerDot.classList.add('live');
        }

        // — Stream title —
        if (els.streamTitle) {
            els.streamTitle.textContent = currentStream.titulo || 'KXON en directo';
        }

        // — YouTube Player iframe —
        if (els.iframe && videoId) {
            els.iframe.src = buildEmbedUrl(videoId);
        }

        // — Description —
        if (currentStream.descripcion && currentStream.descripcion.trim()) {
            if (els.descSection) els.descSection.style.display = 'block';
            if (els.descText) els.descText.textContent = currentStream.descripcion;
        } else {
            if (els.descSection) els.descSection.style.display = 'none';
        }

        // — Chat —
        var showChat = currentStream.include_chat !== false;
        if (showChat && videoId) {
            if (els.chatSection) {
                els.chatSection.classList.add('active');
                els.chatSection.style.display = 'block';
            }
            if (els.chatIframe) {
                els.chatIframe.src = buildChatUrl(videoId);
            }
        } else {
            if (els.chatSection) {
                els.chatSection.classList.remove('active');
                els.chatSection.style.display = 'none';
            }
        }

        // — Duration —
        liveStartTime = currentStream.inicio
            ? new Date(currentStream.inicio)
            : new Date();
        startDurationCounter();

        // — KPIs —
        updateKPIs();

        // — Admin status —
        updateAdminUI(true);

        // — Pre-fill admin form —
        if (els.inputYoutubeId) els.inputYoutubeId.value = currentStream.youtube_url || currentStream.youtube_id || '';
        if (els.inputTitle) els.inputTitle.value = currentStream.titulo || '';
        if (els.inputDesc) els.inputDesc.value = currentStream.descripcion || '';
        if (els.inputIncludeChat) els.inputIncludeChat.checked = currentStream.include_chat !== false;
    }

    /* ═══════════════════════════════════════════
       ⬛ ACTIVATE OFFLINE STATE
       ═══════════════════════════════════════════ */
    function activateOfflineState() {
        isLive = false;

        // — Hide active, show offline —
        if (els.activeSection) els.activeSection.style.display = 'none';
        if (els.hero) {
            els.hero.classList.remove('active');
            els.hero.style.display = 'none';
        }
        if (els.player) els.player.style.display = 'none';
        if (els.chatSection) {
            els.chatSection.classList.remove('active');
            els.chatSection.style.display = 'none';
        }
        if (els.descSection) els.descSection.style.display = 'none';

        if (els.offlineSection) {
            els.offlineSection.classList.add('active');
            els.offlineSection.style.display = 'block';
        }

        // — Clear iframes —
        if (els.iframe) els.iframe.src = '';
        if (els.chatIframe) els.chatIframe.src = '';

        // — Header dot —
        if (els.headerDot) els.headerDot.classList.remove('live');

        // — Stop counter —
        stopDurationCounter();

        // — KPIs —
        if (els.kpiViewers) els.kpiViewers.textContent = '0';
        if (els.kpiStatus) els.kpiStatus.textContent = 'Offline';
        if (els.kpiDuration) els.kpiDuration.textContent = '0m';

        // — Admin —
        updateAdminUI(false);
    }

    /* ═══════════════════════════════════════════
       ADMIN UI UPDATE
       ═══════════════════════════════════════════ */
    function updateAdminUI(live) {
        if (els.adminDot) {
            els.adminDot.className = 'kx-live-admin-status-dot ' + (live ? 'online' : 'offline');
        }
        if (els.adminStatusText) {
            els.adminStatusText.textContent = live ? 'EN VIVO' : 'Offline';
        }

        // Toggle buttons
        if (els.btnGoLive) {
            els.btnGoLive.style.display = live ? 'none' : 'flex';
            els.btnGoLive.disabled = false;
            els.btnGoLive.innerHTML =
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="6"/></svg>' +
                ' Iniciar En Vivo';
        }
        if (els.btnStopLive) {
            els.btnStopLive.classList.toggle('visible', live);
        }
    }

    /* ═══════════════════════════════════════════
       KPIs
       ═══════════════════════════════════════════ */
    function updateKPIs() {
        if (els.kpiStatus) {
            els.kpiStatus.textContent = isLive ? '🔴 LIVE' : 'Offline';
        }
        if (els.kpiViewers) {
            els.kpiViewers.textContent = isLive ? '—' : '0';
        }
    }

    /* ═══════════════════════════════════════════
       DURATION COUNTER
       ═══════════════════════════════════════════ */
    function startDurationCounter() {
        stopDurationCounter();
        tickDuration();
        durationInterval = setInterval(tickDuration, 1000);
    }

    function stopDurationCounter() {
        if (durationInterval) {
            clearInterval(durationInterval);
            durationInterval = null;
        }
    }

    function tickDuration() {
        if (!liveStartTime) return;

        var diffSec = Math.max(0, Math.floor((Date.now() - liveStartTime.getTime()) / 1000));
        var h = Math.floor(diffSec / 3600);
        var m = Math.floor((diffSec % 3600) / 60);
        var s = diffSec % 60;

        // KPI
        if (els.kpiDuration) {
            if (h > 0) {
                els.kpiDuration.textContent = h + 'h ' + m + 'm';
            } else {
                els.kpiDuration.textContent = m + 'm';
            }
        }

        // Hero duration text
        if (els.durationText) {
            var totalMin = Math.floor(diffSec / 60);
            if (totalMin < 1) {
                els.durationText.innerHTML =
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
                    ' Iniciado hace unos segundos';
            } else if (totalMin < 60) {
                els.durationText.innerHTML =
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
                    ' Iniciado hace ' + totalMin + ' min';
            } else {
                els.durationText.innerHTML =
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
                    ' ' + pad(h) + ':' + pad(m) + ':' + pad(s);
            }
        }
    }

    /* ═══════════════════════════════════════════
       🚀 GO LIVE
       ═══════════════════════════════════════════ */
    async function goLive() {
        if (!els.inputYoutubeId) return;

        var rawInput = els.inputYoutubeId.value.trim();
        var titulo   = els.inputTitle ? els.inputTitle.value.trim() : '';
        var desc     = els.inputDesc ? els.inputDesc.value.trim() : '';
        var inclChat = els.inputIncludeChat ? els.inputIncludeChat.checked : true;

        // Validar
        if (!rawInput) {
            K.showToast('Pega el ID o URL de YouTube', 'error');
            if (els.inputYoutubeId) els.inputYoutubeId.focus();
            return;
        }

        var videoId = extractYoutubeId(rawInput);
        if (!videoId) {
            K.showToast('No se pudo extraer un ID de YouTube válido. Verifica el link.', 'error');
            if (els.inputYoutubeId) els.inputYoutubeId.focus();
            return;
        }

        if (!titulo) titulo = 'KXON en directo';

        // Disable button
        if (els.btnGoLive) {
            els.btnGoLive.disabled = true;
            els.btnGoLive.innerHTML =
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>' +
                ' Iniciando…';
        }

        try {
            // Desactivar streams anteriores
            await db.from('envivo')
                .update({ activo: false, fin: new Date().toISOString() })
                .eq('activo', true);

            // Crear nuevo stream
            var result = await db.from('envivo').insert({
                youtube_id: videoId,
                youtube_url: rawInput,
                titulo: titulo,
                descripcion: desc,
                include_chat: inclChat,
                activo: true,
                inicio: new Date().toISOString(),
                usuario_id: K.currentUser.id
            }).select().single();

            if (result.error) throw result.error;

            currentStream = result.data;
            activateLiveState();

            K.showToast('🔴 ¡Transmisión en vivo iniciada!', 'success');

            // Recargar historial
            await loadHistory();

        } catch (e) {
            console.error('[EnVivo] Error going live:', e);
            K.showToast('Error al iniciar: ' + (e.message || 'Intenta de nuevo'), 'error');
            updateAdminUI(false);
        }
    }

    /* ═══════════════════════════════════════════
       ⛔ STOP LIVE
       ═══════════════════════════════════════════ */
    async function stopLive() {
        if (!confirm('¿Finalizar la transmisión en vivo?')) return;

        try {
            if (currentStream && currentStream.id) {
                await db.from('envivo')
                    .update({
                        activo: false,
                        fin: new Date().toISOString()
                    })
                    .eq('id', currentStream.id);
            } else {
                // Fallback: desactivar todos
                await db.from('envivo')
                    .update({ activo: false, fin: new Date().toISOString() })
                    .eq('activo', true);
            }

            currentStream = null;
            activateOfflineState();

            // Limpiar form
            if (els.inputYoutubeId) els.inputYoutubeId.value = '';
            if (els.inputTitle) els.inputTitle.value = '';
            if (els.inputDesc) els.inputDesc.value = '';
            if (els.inputIncludeChat) els.inputIncludeChat.checked = true;

            K.showToast('Transmisión finalizada', 'success');

            await loadHistory();
            await loadLastStreamInfo();

        } catch (e) {
            console.error('[EnVivo] Error stopping:', e);
            K.showToast('Error al detener: ' + (e.message || ''), 'error');
        }
    }

    /* ═══════════════════════════════════════════
       📜 HISTORY
       ═══════════════════════════════════════════ */
    async function loadHistory() {
        if (!els.historyList) return;

        try {
            var r = await db.from('envivo')
                .select('*')
                .eq('activo', false)
                .order('inicio', { ascending: false })
                .limit(10);

            if (r.error) throw r.error;

            var items = r.data || [];

            if (!items.length) {
                els.historyList.innerHTML =
                    '<div class="kx-live-history-empty">Sin transmisiones anteriores</div>';
                return;
            }

            var html = '';
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                var titulo = item.titulo || 'Sin título';
                var fecha = formatDateShort(item.inicio);

                var durText = '';
                if (item.inicio && item.fin) {
                    var diffSec = Math.floor(
                        (new Date(item.fin).getTime() - new Date(item.inicio).getTime()) / 1000
                    );
                    if (diffSec > 0) durText = ' · ' + formatDuration(diffSec);
                }

                html += '<div class="kx-live-history-item">';
                html += '  <div class="kx-live-history-dot was-live"></div>';
                html += '  <div class="kx-live-history-info">';
                html += '    <div class="kx-live-history-title">' + escHTML(titulo) + '</div>';
                html += '    <div class="kx-live-history-meta">' + escHTML(fecha) + escHTML(durText) + '</div>';
                html += '  </div>';

                if (K.isAdmin) {
                    html += '  <button class="kx-live-history-delete" data-action="delete-stream" data-stream-id="' + escHTML(item.id) + '" title="Eliminar">';
                    html += '    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">';
                    html += '      <polyline points="3 6 5 6 21 6"/>';
                    html += '      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>';
                    html += '    </svg>';
                    html += '  </button>';
                }

                html += '</div>';
            }

            els.historyList.innerHTML = html;

        } catch (e) {
            console.error('[EnVivo] Error loading history:', e);
            if (els.historyList) {
                els.historyList.innerHTML =
                    '<div class="kx-live-history-empty">Error cargando historial</div>';
            }
        }
    }

    /* ═══════════════════════════════════════════
       LAST STREAM INFO (for offline card)
       ═══════════════════════════════════════════ */
    async function loadLastStreamInfo() {
        try {
            var r = await db.from('envivo')
                .select('titulo, inicio, fin')
                .eq('activo', false)
                .order('inicio', { ascending: false })
                .limit(1);

            if (r.error) throw r.error;

            if (r.data && r.data.length > 0) {
                var last = r.data[0];
                if (els.offlineLast) els.offlineLast.style.display = 'inline-flex';
                if (els.offlineLastText) {
                    els.offlineLastText.textContent =
                        'Última: "' + (last.titulo || 'Sin título') + '" — ' +
                        formatDateShort(last.inicio);
                }
            } else {
                if (els.offlineLast) els.offlineLast.style.display = 'none';
            }
        } catch (e) {
            console.error('[EnVivo] Error loading last stream:', e);
        }
    }

    /* ═══════════════════════════════════════════
       DELETE STREAM
       ═══════════════════════════════════════════ */
    async function deleteStream(streamId) {
        if (!confirm('¿Eliminar esta transmisión del historial?')) return;

        try {
            var r = await db.from('envivo').delete().eq('id', streamId);
            if (r.error) throw r.error;

            K.showToast('Transmisión eliminada', 'success');
            await loadHistory();
            await loadLastStreamInfo();

        } catch (e) {
            K.showToast('Error: ' + (e.message || ''), 'error');
        }
    }

    /* ═══════════════════════════════════════════
       CHAT TOGGLE
       ═══════════════════════════════════════════ */
    function toggleChat() {
        if (!els.chatContainer) return;

        var isVisible = els.chatContainer.style.display !== 'none';

        if (isVisible) {
            els.chatContainer.style.display = 'none';
            if (els.chatToggle) els.chatToggle.textContent = 'Mostrar';
        } else {
            els.chatContainer.style.display = 'block';
            if (els.chatToggle) els.chatToggle.textContent = 'Ocultar';
        }
    }

    /* ═══════════════════════════════════════════
       EVENT BINDING
       ═══════════════════════════════════════════ */
    var eventsBound = false;

    function bindEvents() {
        if (eventsBound) return;
        eventsBound = true;

        // Go Live button
        if (els.btnGoLive) {
            els.btnGoLive.addEventListener('click', function (e) {
                e.preventDefault();
                goLive();
            });
        }

        // Stop Live button
        if (els.btnStopLive) {
            els.btnStopLive.addEventListener('click', function (e) {
                e.preventDefault();
                stopLive();
            });
        }

        // Chat toggle
        if (els.chatToggle) {
            els.chatToggle.addEventListener('click', function (e) {
                e.preventDefault();
                toggleChat();
            });
        }

        // Event delegation — delete history items
        var panel = document.getElementById('panel-envivo');
        if (panel) {
            panel.addEventListener('click', function (e) {
                var deleteBtn = e.target.closest('[data-action="delete-stream"]');
                if (deleteBtn) {
                    e.preventDefault();
                    e.stopPropagation();
                    var sid = deleteBtn.getAttribute('data-stream-id');
                    if (sid) deleteStream(sid);
                }
            });
        }

        // Allow Enter key on YouTube ID input to trigger go live
        if (els.inputYoutubeId) {
            els.inputYoutubeId.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    goLive();
                }
            });
        }
    }

})();