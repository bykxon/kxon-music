/* ============================================
   📊 DASHBOARD-HISTORIAL.JS — KXON
   Historial de reproducciones del usuario
   Guarda cada canción reproducida con fecha/hora
   ============================================ */
(function () {

    var db = window.db;
    var K = window.KXON;

    /* ══════════════════════════════════════════
       📅 UTILIDADES
       ══════════════════════════════════════════ */
    function getDateLabel(dateStr) {
        var date = new Date(dateStr);
        var now = new Date();
        var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        var yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        var itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

        if (itemDate.getTime() === today.getTime()) return 'Hoy';
        if (itemDate.getTime() === yesterday.getTime()) return 'Ayer';

        var diff = Math.floor((today - itemDate) / (1000 * 60 * 60 * 24));
        if (diff < 7) return 'Hace ' + diff + ' días';

        var meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        return date.getDate() + ' ' + meses[date.getMonth()] + ' ' + date.getFullYear();
    }

    function formatTime(dateStr) {
        var d = new Date(dateStr);
        var h = d.getHours();
        var m = d.getMinutes();
        var ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        h = h ? h : 12;
        return h + ':' + (m < 10 ? '0' : '') + m + ' ' + ampm;
    }

    function isToday(dateStr) {
        var d = new Date(dateStr);
        var now = new Date();
        return d.getFullYear() === now.getFullYear() &&
               d.getMonth() === now.getMonth() &&
               d.getDate() === now.getDate();
    }

    function isThisWeek(dateStr) {
        var d = new Date(dateStr);
        var now = new Date();
        var weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return d >= weekAgo;
    }

    /* ══════════════════════════════════════════
       💾 AGREGAR AL HISTORIAL
       ══════════════════════════════════════════ */
    K.addToHistorial = async function (track) {
        if (!track || !track.id || !K.currentUser) return;

        try {
            await db.from('historial_reproducciones').insert({
                usuario_id: K.currentUser.id,
                cancion_id: track.id,
                titulo: track.titulo,
                imagen_url: track.imagen_url || '',
                album: track.album || '',
                duracion: track.duracion || '--:--'
            });
        } catch (e) {
            /* Si la tabla no existe, usar localStorage como fallback */
            console.warn('Historial DB error, usando localStorage:', e.message);
            addToLocalHistorial(track);
        }
    };

    function addToLocalHistorial(track) {
        var key = 'kxon_historial_' + K.currentUser.id;
        var historial = [];
        try {
            historial = JSON.parse(localStorage.getItem(key) || '[]');
        } catch (e) { historial = []; }

        historial.unshift({
            id: track.id,
            titulo: track.titulo,
            imagen_url: track.imagen_url || '',
            album: track.album || '',
            duracion: track.duracion || '--:--',
            created_at: new Date().toISOString()
        });

        /* Limitar a 500 entradas */
        if (historial.length > 500) historial = historial.slice(0, 500);

        localStorage.setItem(key, JSON.stringify(historial));
    }

    /* ══════════════════════════════════════════
       📊 CARGAR HISTORIAL
       ══════════════════════════════════════════ */
    K.loadHistorial = async function () {
        if (!K.currentUser) return;

        var historial = [];

        try {
            /* Intentar cargar desde Supabase */
            var r = await db.from('historial_reproducciones')
                .select('*')
                .eq('usuario_id', K.currentUser.id)
                .order('created_at', { ascending: false })
                .limit(200);

            if (r.error) throw r.error;
            historial = r.data || [];

        } catch (e) {
            /* Fallback: cargar desde localStorage */
            console.warn('Cargando historial desde localStorage');
            var key = 'kxon_historial_' + K.currentUser.id;
            try {
                historial = JSON.parse(localStorage.getItem(key) || '[]');
            } catch (e2) { historial = []; }
        }

        renderHistorialStats(historial);
        renderHistorialList(historial);
    };

    /* ══════════════════════════════════════════
       📊 STATS DEL HISTORIAL
       ══════════════════════════════════════════ */
    function renderHistorialStats(historial) {
        var total = historial.length;
        var hoy = 0;
        var semana = 0;
        var uniqueIds = {};

        for (var i = 0; i < historial.length; i++) {
            var item = historial[i];
            if (isToday(item.created_at)) hoy++;
            if (isThisWeek(item.created_at)) semana++;
            var songId = item.cancion_id || item.id;
            if (songId) uniqueIds[songId] = true;
        }

        var unicas = Object.keys(uniqueIds).length;

        var elTotal = document.getElementById('histStatTotal');
        var elHoy = document.getElementById('histStatHoy');
        var elSemana = document.getElementById('histStatSemana');
        var elUnicas = document.getElementById('histStatUnicas');

        if (elTotal) elTotal.textContent = total;
        if (elHoy) elHoy.textContent = hoy;
        if (elSemana) elSemana.textContent = semana;
        if (elUnicas) elUnicas.textContent = unicas;
    }

    /* ══════════════════════════════════════════
       📋 RENDER LISTA DE HISTORIAL
       ══════════════════════════════════════════ */
    function renderHistorialList(historial) {
        var container = document.getElementById('historialList');
        if (!container) return;

        if (!historial || historial.length === 0) {
            container.innerHTML = '<div class="empty-state">' +
                '<div class="empty-icon">📊</div>' +
                '<div class="empty-title">Sin historial</div>' +
                '<div class="empty-text">Tu actividad de reproducción aparecerá aquí</div>' +
                '</div>';
            return;
        }

        /* Agrupar por fecha */
        var groups = {};
        var groupOrder = [];

        for (var i = 0; i < historial.length; i++) {
            var item = historial[i];
            var label = getDateLabel(item.created_at);
            if (!groups[label]) {
                groups[label] = [];
                groupOrder.push(label);
            }
            groups[label].push(item);
        }

        var h = '';
        for (var g = 0; g < groupOrder.length; g++) {
            var dateLabel = groupOrder[g];
            var items = groups[dateLabel];

            h += '<div class="historial-date-group">';
            h += '<div class="historial-date-label">' + dateLabel + ' <span style="color:var(--plata-oscura);font-size:.6rem;">(' + items.length + ')</span></div>';

            for (var j = 0; j < items.length; j++) {
                var track = items[j];
                var img = track.imagen_url || '';
                var titulo = track.titulo || 'Canción desconocida';
                var album = track.album || '';
                var time = formatTime(track.created_at);
                var songId = track.cancion_id || track.id;

                h += '<div class="historial-track-item" onclick="window._playFromHistorial(\'' + songId + '\')">';

                /* Cover */
                h += '<div class="historial-track-cover">';
                if (img) {
                    h += '<img src="' + img + '" alt="" onerror="this.parentElement.innerHTML=\'<div style=display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:var(--negro-hover);color:var(--plata-oscura);font-size:1.1rem>♪</div>\'">';
                } else {
                    h += '<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:var(--negro-hover);color:var(--plata-oscura);font-size:1.1rem;">♪</div>';
                }
                h += '</div>';

                /* Info */
                h += '<div class="historial-track-info">';
                h += '<div class="historial-track-title">' + titulo + '</div>';
                h += '<div class="historial-track-meta">';
                if (album) h += '<span>' + album + '</span>';
                h += '</div>';
                h += '</div>';

                /* Hora */
                h += '<span class="historial-track-time">' + time + '</span>';

                h += '</div>';
            }

            h += '</div>';
        }

        container.innerHTML = h;
    }

    /* ══════════════════════════════════════════
       ▶ REPRODUCIR DESDE HISTORIAL
       ══════════════════════════════════════════ */
    window._playFromHistorial = async function (songId) {
        if (!songId) return;
        try {
            var r = await db.from('canciones')
                .select('*, albumes(titulo, imagen_url)')
                .eq('id', songId)
                .single();

            if (r.error || !r.data) {
                K.showToast('Canción no encontrada', 'error');
                return;
            }

            var s = r.data;
            K.currentPlaylist = [{
                id: s.id,
                titulo: s.titulo,
                archivo_url: s.archivo_url,
                imagen_url: s.imagen_url || (s.albumes ? s.albumes.imagen_url : '') || '',
                duracion: s.duracion || '--:--'
            }];
            K.currentAlbumCover = s.imagen_url || (s.albumes ? s.albumes.imagen_url : '') || '';
            K.playTrack(0);
        } catch (e) {
            console.error('Error playing from historial:', e);
            K.showToast('Error al reproducir', 'error');
        }
    };

    /* ══════════════════════════════════════════
       🗑 LIMPIAR HISTORIAL
       ══════════════════════════════════════════ */
    window._clearHistorial = async function () {
        if (!confirm('¿Borrar todo tu historial de reproducciones?')) return;

        try {
            /* Intentar borrar de Supabase */
            var r = await db.from('historial_reproducciones')
                .delete()
                .eq('usuario_id', K.currentUser.id);

            if (r.error) throw r.error;
        } catch (e) {
            console.warn('Error borrando historial DB:', e.message);
        }

        /* Borrar también de localStorage */
        var key = 'kxon_historial_' + K.currentUser.id;
        localStorage.removeItem(key);

        K.showToast('🗑 Historial borrado', 'success');
        K.loadHistorial();
    };

})();