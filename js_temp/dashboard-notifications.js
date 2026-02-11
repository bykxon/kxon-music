/* ============================================
   🔔 DASHBOARD-NOTIFICATIONS.JS — KXON
   Sistema de notificaciones en tiempo real
   ============================================ */
(function () {

    var db = window.db;
    var K = window.KXON;

    var notifBtn = document.getElementById('notifBtn');
    var notifDropdown = document.getElementById('notifDropdown');
    var notifBadge = document.getElementById('notifBadge');
    var notifList = document.getElementById('notifList');
    var notifMarkAll = document.getElementById('notifMarkAll');
    var allNotifications = [];

    /* ══════════════════════════════════════════
       📦 CARGAR NOTIFICACIONES
       ══════════════════════════════════════════ */
    K.loadNotifications = async function () {
        if (!K.currentUser) return;
        try {
            var r = await db.from('notificaciones')
                .select('*')
                .eq('usuario_id', K.currentUser.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (r.error) throw r.error;
            allNotifications = r.data || [];
            updateBadge();
            renderNotifications();
        } catch (e) {
            console.error('Error cargando notificaciones:', e);
        }
    };

    /* ══════════════════════════════════════════
       🔢 ACTUALIZAR BADGE
       ══════════════════════════════════════════ */
    function updateBadge() {
        var unread = 0;
        for (var i = 0; i < allNotifications.length; i++) {
            if (!allNotifications[i].leida) unread++;
        }
        if (unread > 0) {
            notifBadge.textContent = unread > 99 ? '99+' : unread;
            notifBadge.classList.add('show');
        } else {
            notifBadge.classList.remove('show');
        }
    }

    /* ══════════════════════════════════════════
       🎨 RENDERIZAR LISTA
       ══════════════════════════════════════════ */
    function renderNotifications() {
        if (!allNotifications.length) {
            notifList.innerHTML =
                '<div class="notif-empty">' +
                '<div class="notif-empty-icon">🔔</div>' +
                '<div class="notif-empty-text">Sin notificaciones</div>' +
                '</div>';
            return;
        }

        var h = '';
        for (var i = 0; i < allNotifications.length; i++) {
            var n = allNotifications[i];
            var iconClass = 'icon-nuevo';
            var iconEmoji = '🔔';

            if (n.tipo === 'compra_confirmada') { iconClass = 'icon-compra'; iconEmoji = '✅'; }
            else if (n.tipo === 'compra_rechazada') { iconClass = 'icon-rechazo'; iconEmoji = '❌'; }
            else if (n.tipo === 'nueva_solicitud') { iconClass = 'icon-nuevo'; iconEmoji = '🛒'; }
            else if (n.tipo === 'nuevo_album') { iconEmoji = '💿'; }
            else if (n.tipo === 'nueva_cancion') { iconEmoji = '🎵'; }
            else if (n.tipo === 'nuevo_video') { iconEmoji = '🎬'; }

            var timeAgo = getTimeAgo(n.created_at);

            h += '<div class="notif-item' + (n.leida ? '' : ' unread') + '" onclick="window._notifClick(\'' + n.id + '\',' + i + ')">';
            h += '<div class="notif-item-icon ' + iconClass + '">' + iconEmoji + '</div>';
            h += '<div class="notif-item-content">';
            h += '<div class="notif-item-title">' + n.titulo + '</div>';
            if (n.mensaje) h += '<div class="notif-item-msg">' + n.mensaje + '</div>';
            h += '<div class="notif-item-time">' + timeAgo + '</div>';
            h += '</div></div>';
        }

        notifList.innerHTML = h;
    }

    /* ══════════════════════════════════════════
       🖱️ CLICK EN NOTIFICACIÓN
       ══════════════════════════════════════════ */
    window._notifClick = async function (notifId, idx) {
        var n = allNotifications[idx];
        if (!n) return;

        /* Marcar como leída */
        if (!n.leida) {
            n.leida = true;
            updateBadge();
            renderNotifications();
            db.from('notificaciones').update({ leida: true }).eq('id', notifId);
        }

        /* Navegar según tipo */
        notifDropdown.classList.remove('show');

        if (n.tipo === 'compra_confirmada') {
            K.showPanel('archivo');
        } else if (n.tipo === 'compra_rechazada') {
            K.showPanel('marketplace');
        } else if (n.tipo === 'nueva_solicitud') {
            K.showPanel('marketplace');
        } else if (n.tipo === 'nuevo_album' && n.data && n.data.album_id) {
            K.showPanel('albumes');
            setTimeout(function () { window._openAlbum(n.data.album_id); }, 200);
        } else if (n.tipo === 'nuevo_video' && n.data && n.data.video_id) {
            K.showPanel('videos');
            setTimeout(function () { window._openVideoPlayer(n.data.video_id); }, 200);
        }
    };

    /* ══════════════════════════════════════════
       ✅ MARCAR TODAS COMO LEÍDAS
       ══════════════════════════════════════════ */
    notifMarkAll.addEventListener('click', async function () {
        if (!allNotifications.length) return;

        for (var i = 0; i < allNotifications.length; i++) {
            allNotifications[i].leida = true;
        }
        updateBadge();
        renderNotifications();

        try {
            await db.from('notificaciones')
                .update({ leida: true })
                .eq('usuario_id', K.currentUser.id)
                .eq('leida', false);
        } catch (e) {
            console.error('Error marcando leídas:', e);
        }
    });

    /* ══════════════════════════════════════════
       📤 ENVIAR NOTIFICACIÓN (helper global)
       ══════════════════════════════════════════ */
    K.sendNotification = async function (userId, tipo, titulo, mensaje, data) {
        try {
            await db.from('notificaciones').insert({
                usuario_id: userId,
                tipo: tipo,
                titulo: titulo,
                mensaje: mensaje || '',
                data: data || {}
            });
        } catch (e) {
            console.error('Error enviando notificación:', e);
        }
    };

    /* ══════════════════════════════════════════
       ⏰ TIEMPO RELATIVO
       ══════════════════════════════════════════ */
    function getTimeAgo(dateStr) {
        var now = new Date();
        var date = new Date(dateStr);
        var diff = Math.floor((now - date) / 1000);

        if (diff < 60) return 'Ahora';
        if (diff < 3600) return Math.floor(diff / 60) + ' min';
        if (diff < 86400) return Math.floor(diff / 3600) + 'h';
        if (diff < 604800) return Math.floor(diff / 86400) + 'd';
        return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    }

    /* ══════════════════════════════════════════
       🎧 EVENTOS
       ══════════════════════════════════════════ */
    notifBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        notifDropdown.classList.toggle('show');
        /* Cerrar buscador si está abierto */
        var sr = document.getElementById('searchResults');
        if (sr) sr.classList.remove('show');
    });

    /* Cerrar al click fuera */
    document.addEventListener('click', function (e) {
        var wrapper = document.getElementById('notifWrapper');
        if (!wrapper.contains(e.target)) {
            notifDropdown.classList.remove('show');
        }
    });

    /* ══════════════════════════════════════════
       🔄 AUTO-REFRESH cada 30 segundos
       ══════════════════════════════════════════ */
    setInterval(function () {
        if (K.currentUser) K.loadNotifications();
    }, 30000);

})();