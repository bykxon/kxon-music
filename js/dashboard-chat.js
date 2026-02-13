/* ============================================
   💬 DASHBOARD-CHAT.JS — KXON
   Chat en tiempo real con Supabase Realtime
   ============================================ */
(function () {

    var db = window.db;

    function waitForKXON(cb) {
        if (window.KXON && window.KXON.currentUser) cb();
        else setTimeout(function () { waitForKXON(cb); }, 50);
    }

    waitForKXON(function () {
        initChat();
    });

    function initChat() {
        var K = window.KXON;
        var chatMessages = [];
        var chatChannel = null;
        var chatLoaded = false;
        var MAX_MESSAGES = 200;
        var MAX_CHARS = 500;

        /* ══════════════════════════════════════════
           💬 CARGAR CHAT
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
            } catch (e) {
                console.error('Error loading chat:', e);
            }
        };

        /* ══════════════════════════════════════════
           📡 SUSCRIPCIÓN EN TIEMPO REAL
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
                    /* Evitar duplicados */
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

                        /* Notificación si no estamos en el panel chat */
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
                    var el = document.getElementById('chat-msg-' + id);
                    if (el) el.remove();
                })
                .subscribe();
        }

        /* ══════════════════════════════════════════
           🎨 RENDER CHAT
           ══════════════════════════════════════════ */
        function renderChat() {
            var list = document.getElementById('chatMessagesList');
            if (!list) return;

            if (!chatMessages.length) {
                list.innerHTML = '<div class="chat-empty">'
                    + '<div class="chat-empty-icon">💬</div>'
                    + '<div class="chat-empty-title">¡Sé el primero en escribir!</div>'
                    + '<div class="chat-empty-text">Inicia la conversación con la comunidad KXON</div>'
                    + '</div>';
                return;
            }

            var h = '';
            var lastDate = '';

            for (var i = 0; i < chatMessages.length; i++) {
                var msg = chatMessages[i];
                var msgDate = new Date(msg.created_at).toLocaleDateString('es-ES');

                /* Separador de fecha */
                if (msgDate !== lastDate) {
                    h += '<div class="chat-date-sep"><span>' + formatChatDate(msg.created_at) + '</span></div>';
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

            /* Si estaba vacío, limpiar empty state */
            var empty = list.querySelector('.chat-empty');
            if (empty) empty.remove();

            /* Separador de fecha si es necesario */
            var items = list.querySelectorAll('.chat-msg');
            var lastItem = items.length > 0 ? items[items.length - 1] : null;
            var msgDate = new Date(msg.created_at).toLocaleDateString('es-ES');

            if (lastItem) {
                var lastTs = lastItem.getAttribute('data-ts');
                var lastDate = lastTs ? new Date(lastTs).toLocaleDateString('es-ES') : '';
                if (msgDate !== lastDate) {
                    var sep = document.createElement('div');
                    sep.className = 'chat-date-sep';
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
            var isAdmin = false;
            var time = new Date(msg.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            var avatar = msg.usuario_avatar || '';
            var initial = (msg.usuario_nombre || '?').charAt(0).toUpperCase();
            var avatarHTML = avatar
                ? '<img src="' + avatar + '" alt="" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'"><span class="chat-avatar-letter" style="display:none">' + initial + '</span>'
                : '<span class="chat-avatar-letter">' + initial + '</span>';

            var h = '<div class="chat-msg' + (isMe ? ' chat-msg-me' : '') + '" id="chat-msg-' + msg.id + '" data-ts="' + msg.created_at + '">';
            h += '<div class="chat-msg-avatar">' + avatarHTML + '</div>';
            h += '<div class="chat-msg-content">';
            h += '<div class="chat-msg-header">';
            h += '<span class="chat-msg-name' + (isMe ? ' me' : '') + '">' + escapeHTML(msg.usuario_nombre) + '</span>';
            h += '<span class="chat-msg-time">' + time + '</span>';
            if (K.isAdmin && !isMe) {
                h += '<button class="chat-msg-delete" onclick="window._deleteChatMsg(\'' + msg.id + '\')" title="Eliminar">🗑</button>';
            }
            h += '</div>';
            h += '<div class="chat-msg-text">' + formatChatText(msg.mensaje) + '</div>';
            h += '</div></div>';

            return h;
        }

        /* ══════════════════════════════════════════
           📤 ENVIAR MENSAJE
           ══════════════════════════════════════════ */
        window._sendChatMessage = async function () {
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
        };

        /* ══════════════════════════════════════════
           🗑 ELIMINAR MENSAJE (Admin)
           ══════════════════════════════════════════ */
        window._deleteChatMsg = async function (msgId) {
            if (!K.isAdmin) return;
            try {
                await db.from('chat_messages').delete().eq('id', msgId);
            } catch (e) {
                K.showToast('Error al eliminar', 'error');
            }
        };

        /* ══════════════════════════════════════════
           🛠 HELPERS
           ══════════════════════════════════════════ */
        function scrollChatBottom() {
            var list = document.getElementById('chatMessagesList');
            if (list) {
                setTimeout(function () {
                    list.scrollTop = list.scrollHeight;
                }, 50);
            }
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
            text = escapeHTML(text);
            /* Emojis y links */
            text = text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="chat-link">$1</a>');
            return text;
        }

        function escapeHTML(str) {
            var div = document.createElement('div');
            div.appendChild(document.createTextNode(str));
            return div.innerHTML;
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

        /* ══════════════════════════════════════════
           ⌨ EVENTOS
           ══════════════════════════════════════════ */
        var chatInput = document.getElementById('chatInput');
        if (chatInput) {
            chatInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    window._sendChatMessage();
                }
            });

            chatInput.addEventListener('input', updateCharCount);
        }

        var chatSendBtn = document.getElementById('chatSendBtn');
        if (chatSendBtn) {
            chatSendBtn.addEventListener('click', function () {
                window._sendChatMessage();
            });
        }

        /* Limpiar badge al entrar al chat */
        var origShowPanel = K.showPanel;
        K.showPanel = function (id) {
            origShowPanel(id);
            if (id === 'chat') {
                K.loadChat();
                var badge = document.getElementById('chatUnreadBadge');
                if (badge) { badge.textContent = '0'; badge.style.display = 'none'; }
            }
        };

        console.log('✅ dashboard-chat.js cargado');
    }

})();