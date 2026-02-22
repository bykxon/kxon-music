/* ═══════════════════════════════════════════════════
   💬 KXON CHAT — REDESIGN 2026
   Arquitectura: IIFE, event delegation, escapeHtml
   Supabase Realtime channels
   ═══════════════════════════════════════════════════ */
(function () {

  var db = window.db;

  function waitForKXON(cb) {
    if (window.KXON && window.KXON.currentUser) cb();
    else setTimeout(function () { waitForKXON(cb); }, 50);
  }

  waitForKXON(function () { initChat(); });

  function initChat() {

    var K = window.KXON;
    var chatMessages = [];
    var chatChannel = null;
    var chatLoaded = false;
    var MAX_MESSAGES = 200;
    var MAX_CHARS = 500;

    /* ── Helpers ── */
    function esc(s) {
      if (!s) return '';
      var d = document.createElement('div');
      d.appendChild(document.createTextNode(s));
      return d.innerHTML;
    }

    function formatChatDate(ts) {
      var d = new Date(ts);
      var today = new Date();
      var yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      if (d.toDateString() === today.toDateString()) return 'Hoy';
      if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
      return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    function formatChatText(text) {
      text = esc(text);
      text = text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="kx-chat-link">$1</a>');
      return text;
    }

    function formatTime(ts) {
      return new Date(ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }

    /* ── KPIs ── */
    function updateKPIs() {
      var el = document.getElementById('chatKpiMessages');
      if (el) el.textContent = chatMessages.length;
      var online = document.getElementById('chatKpiOnline');
      if (online) online.textContent = 'Activo';
    }

    /* ══════════════════════════════════════════
       💬 LOAD
       ══════════════════════════════════════════ */
    K.loadChat = async function () {
      if (chatLoaded) {
        scrollChatBottom();
        return;
      }

      try {
        var r = await db.from('chat_messages')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(100);

        if (r.error) throw r.error;
        chatMessages = r.data || [];
        renderChat();
        subscribeChat();
        chatLoaded = true;
        updateKPIs();
      } catch (e) {
        console.error('Error loading chat:', e);
        var list = document.getElementById('chatMessagesList');
        if (list) {
          list.innerHTML = buildEmpty(
            'Error al cargar el chat',
            'Intenta recargar la página'
          );
        }
      }
    };

    /* ══════════════════════════════════════════
       📡 REALTIME
       ══════════════════════════════════════════ */
    function subscribeChat() {
      if (chatChannel) return;

      chatChannel = db.channel('chat-room')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        }, function (payload) {
          var msg = payload.new;
          var exists = false;
          for (var i = 0; i < chatMessages.length; i++) {
            if (chatMessages[i].id === msg.id) { exists = true; break; }
          }
          if (!exists) {
            chatMessages.push(msg);
            if (chatMessages.length > MAX_MESSAGES) {
              chatMessages = chatMessages.slice(-MAX_MESSAGES);
            }
            appendMessage(msg);
            scrollChatBottom();
            updateKPIs();

            if (K.currentPanel !== 'chat' && msg.usuario_id !== K.currentUser.id) {
              var badge = document.getElementById('chatUnreadBadge');
              if (badge) {
                var count = parseInt(badge.textContent || '0') + 1;
                badge.textContent = count;
                badge.style.display = 'flex';
              }
            }
          }
        })
        .on('postgres_changes', {
          event: 'DELETE',
          schema: 'public',
          table: 'chat_messages'
        }, function (payload) {
          var id = payload.old.id;
          chatMessages = chatMessages.filter(function (m) { return m.id !== id; });
          var el = document.getElementById('kx-chat-msg-' + id);
          if (el) el.remove();
          updateKPIs();
        })
        .subscribe();
    }

    /* ══════════════════════════════════════════
       🎨 RENDER
       ══════════════════════════════════════════ */
    function buildEmpty(title, text) {
      return '<div class="kx-chat-empty">' +
        '<div class="kx-chat-empty-icon">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>' +
        '</div>' +
        '<div class="kx-chat-empty-title">' + esc(title) + '</div>' +
        '<div class="kx-chat-empty-text">' + esc(text) + '</div>' +
      '</div>';
    }

    function renderChat() {
      var list = document.getElementById('chatMessagesList');
      if (!list) return;

      if (!chatMessages.length) {
        list.innerHTML = buildEmpty('¡Sé el primero en escribir!', 'Inicia la conversación con la comunidad KXON');
        return;
      }

      var h = '';
      var lastDate = '';

      for (var i = 0; i < chatMessages.length; i++) {
        var msg = chatMessages[i];
        var msgDate = new Date(msg.created_at).toLocaleDateString('es-ES');

        if (msgDate !== lastDate) {
          h += '<div class="kx-chat-date-sep" aria-hidden="true"><span>' + formatChatDate(msg.created_at) + '</span></div>';
          lastDate = msgDate;
        }

        h += buildMessageHTML(msg);
      }

      list.innerHTML = h;
      scrollChatBottom();
    }

    function appendMessage(msg) {
      var list = document.getElementById('chatMessagesList');
      if (!list) return;

      var empty = list.querySelector('.kx-chat-empty');
      if (empty) empty.remove();

      // Remove skeletons
      var skels = list.querySelectorAll('.kx-chat-skeleton');
      for (var s = 0; s < skels.length; s++) skels[s].remove();

      var items = list.querySelectorAll('.kx-chat-msg');
      var lastItem = items.length > 0 ? items[items.length - 1] : null;
      var msgDate = new Date(msg.created_at).toLocaleDateString('es-ES');

      if (lastItem) {
        var lastTs = lastItem.getAttribute('data-ts');
        var lastDate = lastTs ? new Date(lastTs).toLocaleDateString('es-ES') : '';
        if (msgDate !== lastDate) {
          var sep = document.createElement('div');
          sep.className = 'kx-chat-date-sep';
          sep.setAttribute('aria-hidden', 'true');
          sep.innerHTML = '<span>' + formatChatDate(msg.created_at) + '</span>';
          list.appendChild(sep);
        }
      }

      var div = document.createElement('div');
      div.innerHTML = buildMessageHTML(msg);
      list.appendChild(div.firstChild);
    }

    function buildMessageHTML(msg) {
      var isMe = msg.usuario_id === K.currentUser.id;
      var time = formatTime(msg.created_at);
      var avatarUrl = msg.usuario_avatar || '';
      var initial = (msg.usuario_nombre || '?').charAt(0).toUpperCase();

      var avatarContent;
      if (avatarUrl) {
        avatarContent = '<img src="' + esc(avatarUrl) + '" alt="" loading="lazy">' +
          '<span class="kx-chat-avatar-letter" style="display:none">' + esc(initial) + '</span>';
      } else {
        avatarContent = '<span class="kx-chat-avatar-letter">' + esc(initial) + '</span>';
      }

      var h = '<div class="kx-chat-msg' + (isMe ? ' kx-chat-msg--me' : '') + '" id="kx-chat-msg-' + esc(msg.id) + '" data-ts="' + esc(msg.created_at) + '">';
      h += '<div class="kx-chat-avatar">' + avatarContent + '</div>';
      h += '<div class="kx-chat-msg-content">';
      h += '<div class="kx-chat-msg-header">';
      h += '<span class="kx-chat-msg-name' + (isMe ? ' kx-chat-msg-name--me' : '') + '">' + esc(msg.usuario_nombre) + '</span>';
      h += '<span class="kx-chat-msg-time">' + time + '</span>';

      if (K.isAdmin && !isMe) {
        h += '<button class="kx-chat-msg-delete" data-delete-msg="' + esc(msg.id) + '" title="Eliminar" aria-label="Eliminar mensaje">';
        h += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
        h += '</button>';
      }

      h += '</div>';
      h += '<div class="kx-chat-msg-text">' + formatChatText(msg.mensaje) + '</div>';
      h += '</div></div>';

      return h;
    }

    /* ══════════════════════════════════════════
       📤 SEND
       ══════════════════════════════════════════ */
    async function sendMessage() {
      var input = document.getElementById('chatInput');
      if (!input) return;

      var text = input.value.trim();
      if (!text) return;
      if (text.length > MAX_CHARS) {
        K.showToast('Máximo ' + MAX_CHARS + ' caracteres', 'error');
        return;
      }

      input.value = '';
      updateCharCount();

      var nombre = K.currentProfile.full_name || K.currentUser.email.split('@')[0];
      var avatar = K.currentProfile.avatar_url || '';

      try {
        var r = await db.from('chat_messages').insert({
          usuario_id: K.currentUser.id,
          usuario_nombre: nombre,
          usuario_avatar: avatar,
          mensaje: text,
          tipo: 'general'
        });
        if (r.error) throw r.error;
      } catch (e) {
        K.showToast('Error al enviar mensaje', 'error');
        console.error(e);
      }
    }

    /* ══════════════════════════════════════════
       🗑 DELETE (Admin)
       ══════════════════════════════════════════ */
    async function deleteMessage(msgId) {
      if (!K.isAdmin) return;
      try {
        await db.from('chat_messages').delete().eq('id', msgId);
      } catch (e) {
        K.showToast('Error al eliminar', 'error');
      }
    }

    /* ══════════════════════════════════════════
       🛠 UTILS
       ══════════════════════════════════════════ */
    function scrollChatBottom() {
      var list = document.getElementById('chatMessagesList');
      if (list) {
        setTimeout(function () { list.scrollTop = list.scrollHeight; }, 50);
      }
    }

    function updateCharCount() {
      var input = document.getElementById('chatInput');
      var counter = document.getElementById('chatCharCount');
      if (input && counter) {
        var len = input.value.length;
        counter.textContent = len + '/' + MAX_CHARS;
        if (len > MAX_CHARS * 0.9) counter.classList.add('warn');
        else counter.classList.remove('warn');
      }
    }

    // Avatar onerror fallback via delegation
    function handleAvatarError(img) {
      img.style.display = 'none';
      var letter = img.nextElementSibling;
      if (letter) letter.style.display = 'flex';
    }

    /* ══════════════════════════════════════════
       🎯 EVENT DELEGATION
       ══════════════════════════════════════════ */
    var panel = document.getElementById('panel-chat');
    if (panel) {
      panel.addEventListener('click', function (e) {
        var t = e.target;

        // Delete message
        var delMsg = t.closest('[data-delete-msg]');
        if (delMsg) {
          e.preventDefault();
          e.stopPropagation();
          deleteMessage(delMsg.dataset.deleteMsg);
          return;
        }

        // Send button
        var sendBtn = t.closest('#chatSendBtn');
        if (sendBtn) {
          e.preventDefault();
          sendMessage();
          return;
        }
      });

      // Avatar error handling via event delegation
      panel.addEventListener('error', function (e) {
        if (e.target.tagName === 'IMG' && e.target.closest('.kx-chat-avatar')) {
          handleAvatarError(e.target);
        }
      }, true);
    }

    /* ══════════════════════════════════════════
       ⌨ INPUT EVENTS
       ══════════════════════════════════════════ */
    var chatInput = document.getElementById('chatInput');
    if (chatInput) {
      chatInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });

      chatInput.addEventListener('input', updateCharCount);
    }

    /* ══════════════════════════════════════════
       🔄 PANEL SWITCH HOOK
       ══════════════════════════════════════════ */
    var origShowPanel = K.showPanel;
    K.showPanel = function (id) {
      origShowPanel(id);
      if (id === 'chat') {
        K.loadChat();
        var badge = document.getElementById('chatUnreadBadge');
        if (badge) { badge.textContent = '0'; badge.style.display = 'none'; }
      }
    };

    /* ── Legacy support ── */
    window._sendChatMessage = sendMessage;
    window._deleteChatMsg = function (id) { deleteMessage(id); };

    console.log('✅ dashboard-chat.js (v2) cargado');
  }

})();