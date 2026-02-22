/* ═══════════════════════════════════════════════════
   🔴 KXON EN VIVO — REDESIGN 2026
   Arquitectura: IIFE, event delegation, escapeHtml
   ═══════════════════════════════════════════════════ */
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

    /* ── Helpers ── */
    function esc(s) {
      if (!s) return '';
      var d = document.createElement('div');
      d.appendChild(document.createTextNode(s));
      return d.innerHTML;
    }

    function formatDuration(mins) {
      var h = Math.floor(mins / 60);
      var m = mins % 60;
      if (h > 0) return h + 'h ' + m + 'm';
      return m + 'm';
    }

    function formatDateFull(iso) {
      if (!iso) return '—';
      return new Date(iso).toLocaleDateString('es-ES', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    }

    function formatDateShort(iso) {
      if (!iso) return '—';
      return new Date(iso).toLocaleDateString('es-ES', {
        day: 'numeric', month: 'long', year: 'numeric'
      });
    }

    /* ══════════════════════════════════════════
       📊 UPDATE KPIs
       ══════════════════════════════════════════ */
    function updateKPIs() {
      var viewers = document.getElementById('liveKpiViewers');
      var status = document.getElementById('liveKpiStatus');
      var duration = document.getElementById('liveKpiDuration');
      var headerDot = document.getElementById('kxLiveHeaderDot');

      if (currentLiveData && currentLiveData.activo) {
        if (status) status.textContent = 'LIVE';
        if (status) status.classList.add('live-red');
        if (headerDot) headerDot.classList.add('live');
        // Duration KPI
        if (liveStartTime && duration) {
          var diff = Math.floor((Date.now() - liveStartTime.getTime()) / 60000);
          duration.textContent = formatDuration(diff);
        }
      } else {
        if (viewers) viewers.textContent = '0';
        if (status) { status.textContent = 'Offline'; status.classList.remove('live-red'); }
        if (duration) duration.textContent = '—';
        if (headerDot) headerDot.classList.remove('live');
      }
    }

    /* ══════════════════════════════════════════
       🔄 CARGAR ESTADO
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

        var adminSection = document.getElementById('kxLiveAdminSection');
        if (adminSection) {
          if (K.isAdmin) adminSection.classList.add('visible');
          else adminSection.classList.remove('visible');
        }

        updateKPIs();
      } catch (e) {
        console.error('Error cargando estado live:', e);
        showOfflineState();
      }
    };

    /* ══════════════════════════════════════════
       🔴 LIVE STATE
       ══════════════════════════════════════════ */
    function showLiveState(data) {
      var hero = document.getElementById('kxLiveHero');
      var player = document.getElementById('kxLivePlayer');
      var offline = document.getElementById('kxLiveOfflineSection');

      if (hero) hero.classList.add('active');
      if (player) player.style.display = '';
      if (offline) offline.classList.remove('active');

      var titleEl = document.getElementById('kxLiveStreamTitle');
      if (titleEl) titleEl.textContent = data.titulo || 'KXON en directo';

      // Description
      var descSection = document.getElementById('kxLiveDescSection');
      var descEl = document.getElementById('kxLiveDescription');
      if (data.descripcion) {
        if (descSection) descSection.style.display = '';
        if (descEl) descEl.textContent = data.descripcion;
      } else {
        if (descSection) descSection.style.display = 'none';
      }

      // Iframe
      var iframe = document.getElementById('kxLiveIframe');
      if (iframe) {
        iframe.src = 'https://www.youtube.com/embed/' + esc(data.youtube_id) +
          '?autoplay=1&rel=0&modestbranding=1&playsinline=1';
      }

      // Chat
      var chatSection = document.getElementById('kxLiveChatSection');
      if (data.incluir_chat) {
        if (chatSection) chatSection.classList.add('active');
        var chatIframe = document.getElementById('kxLiveChatIframe');
        if (chatIframe) {
          chatIframe.src = 'https://www.youtube.com/live_chat?v=' +
            esc(data.youtube_id) + '&embed_domain=' + window.location.hostname;
        }
      } else {
        if (chatSection) chatSection.classList.remove('active');
      }

      // Nav dot
      var dot = document.getElementById('navLiveDot');
      if (dot) dot.style.display = 'block';

      // Duration
      liveStartTime = new Date(data.created_at);
      updateDurationDisplay();
      if (durationInterval) clearInterval(durationInterval);
      durationInterval = setInterval(function () {
        updateDurationDisplay();
        updateKPIs();
      }, 60000);

      startViewerCounter(data);
    }

    /* ══════════════════════════════════════════
       📺 OFFLINE STATE
       ══════════════════════════════════════════ */
    function showOfflineState() {
      var hero = document.getElementById('kxLiveHero');
      var player = document.getElementById('kxLivePlayer');
      var descSection = document.getElementById('kxLiveDescSection');
      var chatSection = document.getElementById('kxLiveChatSection');
      var offline = document.getElementById('kxLiveOfflineSection');

      if (hero) hero.classList.remove('active');
      if (player) player.style.display = 'none';
      if (descSection) descSection.style.display = 'none';
      if (chatSection) chatSection.classList.remove('active');
      if (offline) offline.classList.add('active');

      var dot = document.getElementById('navLiveDot');
      if (dot) dot.style.display = 'none';

      var iframe = document.getElementById('kxLiveIframe');
      if (iframe) iframe.src = '';

      var chatIframe = document.getElementById('kxLiveChatIframe');
      if (chatIframe) chatIframe.src = '';

      if (durationInterval) clearInterval(durationInterval);
      if (viewerInterval) clearInterval(viewerInterval);

      loadLastStream();
      updateKPIs();
    }

    /* ══════════════════════════════════════════
       ⏱ DURATION
       ══════════════════════════════════════════ */
    function updateDurationDisplay() {
      if (!liveStartTime) return;
      var diff = Math.floor((Date.now() - liveStartTime.getTime()) / 60000);
      var el = document.getElementById('kxLiveDuration');
      if (el) {
        el.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
          '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ' +
          'Iniciado hace ' + formatDuration(diff);
      }
    }

    /* ══════════════════════════════════════════
       👁 VIEWERS
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
        } catch (e) { /* silent */ }
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
          var el = document.getElementById('kxLiveViewersNum');
          if (el) el.textContent = count;
          var kpi = document.getElementById('liveKpiViewers');
          if (kpi) kpi.textContent = count;
        } catch (e) { /* silent */ }
      }

      reportViewing();
      countViewers();

      viewerInterval = setInterval(function () {
        reportViewing();
        countViewers();
      }, 30000);
    }

    /* ══════════════════════════════════════════
       🔔 NOTIFICATIONS
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
        }
      } catch (e) {
        console.error('Error enviando notificaciones live:', e);
      }
    }

    /* ══════════════════════════════════════════
       📋 HISTORY
       ══════════════════════════════════════════ */
    async function loadLiveHistory() {
      try {
        var r = await db.from('live_streams')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        if (r.error) throw r.error;

        var container = document.getElementById('kxLiveHistory');
        if (!container) return;

        if (!r.data || !r.data.length) {
          container.innerHTML = '<div class="kx-live-history-empty">Sin transmisiones anteriores</div>';
          return;
        }

        var h = '';
        for (var i = 0; i < r.data.length; i++) {
          var s = r.data[i];
          var fecha = formatDateFull(s.created_at);
          var durText = '';
          if (s.ended_at) {
            var diff = Math.floor((new Date(s.ended_at) - new Date(s.created_at)) / 60000);
            durText = ' · ' + formatDuration(diff);
          }

          h += '<div class="kx-live-history-item" data-stream-id="' + esc(s.id) + '">';
          h += '<span class="kx-live-history-dot ' + (s.activo ? 'was-live' : '') + '"></span>';
          h += '<div class="kx-live-history-info">';
          h += '<div class="kx-live-history-title">' + (s.activo ? '🔴 ' : '') + esc(s.titulo || 'Sin título') + '</div>';
          h += '<div class="kx-live-history-meta">' + esc(fecha + durText) + '</div>';
          h += '</div>';
          h += '<button class="kx-live-history-delete" data-delete-stream="' + esc(s.id) + '" title="Eliminar" aria-label="Eliminar transmisión">';
          h += '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
          h += '</button>';
          h += '</div>';
        }
        container.innerHTML = h;
      } catch (e) {
        console.error(e);
      }
    }

    /* ══════════════════════════════════════════
       📺 LAST STREAM
       ══════════════════════════════════════════ */
    async function loadLastStream() {
      try {
        var r = await db.from('live_streams')
          .select('titulo, created_at')
          .eq('activo', false)
          .order('created_at', { ascending: false })
          .limit(1);

        if (r.data && r.data.length > 0) {
          var last = r.data[0];
          var lastWrap = document.getElementById('kxLiveOfflineLast');
          var lastText = document.getElementById('kxLiveOfflineLastText');
          if (lastWrap && lastText) {
            lastWrap.style.display = '';
            lastText.textContent = (last.titulo || 'KXON en directo') + ' — ' + formatDateShort(last.created_at);
          }
        }
      } catch (e) { /* silent */ }
    }

    /* ══════════════════════════════════════════
       ⚙️ ADMIN UI
       ══════════════════════════════════════════ */
    function updateAdminUI() {
      var dotEl = document.getElementById('kxLiveAdminDot');
      var textEl = document.getElementById('kxLiveAdminStatusText');
      var btnStart = document.getElementById('kxBtnGoLive');
      var btnStop = document.getElementById('kxBtnStopLive');

      if (currentLiveData && currentLiveData.activo) {
        if (dotEl) { dotEl.classList.remove('offline'); dotEl.classList.add('online'); }
        if (textEl) textEl.textContent = 'EN VIVO — ' + (currentLiveData.titulo || '');
        if (btnStart) btnStart.style.display = 'none';
        if (btnStop) btnStop.classList.add('visible');
      } else {
        if (dotEl) { dotEl.classList.remove('online'); dotEl.classList.add('offline'); }
        if (textEl) textEl.textContent = 'Offline';
        if (btnStart) btnStart.style.display = '';
        if (btnStop) btnStop.classList.remove('visible');
      }
    }

    /* ══════════════════════════════════════════
       🔴 GO LIVE
       ══════════════════════════════════════════ */
    async function goLive() {
      var ytId = document.getElementById('kxLiveYoutubeId').value.trim();
      var titulo = document.getElementById('kxLiveTitle').value.trim();
      var desc = document.getElementById('kxLiveDesc').value.trim();
      var includeChat = document.getElementById('kxLiveIncludeChat').checked;

      if (!ytId) { K.showToast('Ingresa el ID del video de YouTube', 'error'); return; }
      if (!titulo) titulo = 'KXON en directo';

      var idMatch = ytId.match(/(?:v=|youtu\.be\/|embed\/|\/v\/)([a-zA-Z0-9_-]{11})/);
      if (idMatch) ytId = idMatch[1];
      if (ytId.length !== 11) {
        K.showToast('ID de YouTube inválido (debe tener 11 caracteres)', 'error');
        return;
      }

      var btn = document.getElementById('kxBtnGoLive');
      btn.disabled = true;
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="6"/></svg> Iniciando...';

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

        document.getElementById('kxLiveYoutubeId').value = '';
        document.getElementById('kxLiveTitle').value = '';
        document.getElementById('kxLiveDesc').value = '';
        document.getElementById('kxLiveIncludeChat').checked = false;
      } catch (e) {
        console.error('Error al iniciar live:', e);
        K.showToast('Error: ' + e.message, 'error');
      }

      btn.disabled = false;
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="6"/></svg> Iniciar En Vivo';
    }

    /* ══════════════════════════════════════════
       ⏹ STOP LIVE
       ══════════════════════════════════════════ */
    async function stopLive() {
      if (!confirm('¿Terminar la transmisión en vivo?')) return;

      try {
        await db.from('live_streams')
          .update({ activo: false, ended_at: new Date().toISOString() })
          .eq('activo', true);

        if (currentLiveData) {
          await db.from('live_viewers').delete().eq('stream_id', currentLiveData.id);
        }

        K.showToast('⏹ Transmisión finalizada', 'success');
        K.loadLiveStatus();
      } catch (e) {
        console.error(e);
        K.showToast('Error: ' + e.message, 'error');
      }
    }

    /* ══════════════════════════════════════════
       🗑 DELETE STREAM
       ══════════════════════════════════════════ */
    async function deleteStream(id) {
      if (!confirm('¿Eliminar esta transmisión del historial?')) return;
      try {
        await db.from('live_viewers').delete().eq('stream_id', id);
        await db.from('live_streams').delete().eq('id', id);
        K.showToast('Transmisión eliminada', 'success');
        loadLiveHistory();
      } catch (e) {
        K.showToast('Error: ' + e.message, 'error');
      }
    }

    /* ══════════════════════════════════════════
       💬 TOGGLE CHAT
       ══════════════════════════════════════════ */
    function toggleChat() {
      var container = document.getElementById('kxLiveChatContainer');
      var btn = document.getElementById('kxLiveChatToggle');
      if (!container || !btn) return;
      if (container.style.display === 'none') {
        container.style.display = '';
        btn.textContent = 'Ocultar';
      } else {
        container.style.display = 'none';
        btn.textContent = 'Mostrar';
      }
    }

    /* ══════════════════════════════════════════
       🎯 EVENT DELEGATION
       ══════════════════════════════════════════ */
    var panel = document.getElementById('panel-envivo');
    if (panel) {
      panel.addEventListener('click', function (e) {
        var t = e.target;

        // Go live
        var goBtn = t.closest('#kxBtnGoLive');
        if (goBtn) { e.preventDefault(); goLive(); return; }

        // Stop live
        var stopBtn = t.closest('#kxBtnStopLive');
        if (stopBtn) { e.preventDefault(); stopLive(); return; }

        // Toggle chat
        var chatToggle = t.closest('#kxLiveChatToggle');
        if (chatToggle) { e.preventDefault(); toggleChat(); return; }

        // Delete stream
        var delStream = t.closest('[data-delete-stream]');
        if (delStream) {
          e.preventDefault();
          e.stopPropagation();
          deleteStream(delStream.dataset.deleteStream);
          return;
        }
      });
    }

    /* ══════════════════════════════════════════
       🔄 POLLING
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
            K.loadLiveStatus();
            var dot = document.getElementById('navLiveDot');
            if (dot) dot.style.display = 'block';
          }

          if (!isLive && wasLive) {
            currentLiveData = null;
            showOfflineState();
          }
        } catch (e) { /* silent */ }
      }, 30000);
    }

    /* ══════════════════════════════════════════
       🚀 INIT
       ══════════════════════════════════════════ */
    startLivePolling();

    // Check initial live state for nav dot
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
      } catch (e) { /* silent */ }
    })();

    // Legacy support
    window._goLive = goLive;
    window._stopLive = stopLive;
    window._toggleLiveChat = toggleChat;
    window._deleteLiveStream = function (id) { deleteStream(id); };

    console.log('✅ dashboard-envivo.js (v2) cargado');
  }

})();