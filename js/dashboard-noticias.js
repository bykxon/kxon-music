/* ============================================
   📰 DASHBOARD-NOTICIAS.JS — KXON
   Noticias: carga, render, CRUD, detalle
   ============================================ */
(function () {

    var db = window.db;
    var K = window.KXON;

    /* ══════════════════════════════════════════
       📰 CARGAR NOTICIAS
       ══════════════════════════════════════════ */
    K.loadNoticias = async function () {
        try {
            var r = await db.from('noticias').select('*').order('created_at', { ascending: false });
            if (r.error) throw r.error;
            K.allNoticiasData = r.data || [];
            renderNoticias(K.allNoticiasData.slice(0, 6), 'inicioNoticias');
        } catch (e) { console.error(e); }
    };

    function renderNoticias(noticias, cid) {
        var c = document.getElementById(cid);
        if (!noticias || !noticias.length) {
            c.innerHTML = '<div class="empty-state"><div class="empty-icon">📰</div><div class="empty-title">Sin noticias</div></div>';
            return;
        }
        var h = '';
        for (var i = 0; i < noticias.length; i++) {
            var n = noticias[i];
            var img = n.imagen_url || 'https://placehold.co/600x300/111/333?text=KXON+NEWS';
            var fecha = new Date(n.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
            h += '<div class="card" onclick="window._openNoticia(\'' + n.id + '\')">';
            h += '<div class="card-img"><img src="' + img + '" alt="" onerror="this.src=\'https://placehold.co/600x300/111/333?text=KXON\'">';
            if (K.isAdmin) h += '<button class="card-admin-delete visible" onclick="event.stopPropagation();window._deleteNoticia(\'' + n.id + '\')">✕</button>';
            h += '</div><div class="card-body"><div class="card-title">' + n.titulo + '</div><div class="card-subtitle">' + fecha + '</div><div class="card-read-more">Leer más →</div></div></div>';
        }
        c.innerHTML = h;
    }

    /* ══════════════════════════════════════════
       📰 ABRIR NOTICIA DETALLE
       ══════════════════════════════════════════ */
    window._openNoticia = async function (nid) {
        try {
            var r = await db.from('noticias').select('*').eq('id', nid).single();
            if (r.error) throw r.error;
            var n = r.data;
            document.getElementById('noticiaDetalleTitulo').textContent = n.titulo;
            document.getElementById('noticiaDetalleDesc').textContent = n.descripcion;
            var fecha = new Date(n.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
            document.getElementById('noticiaDetalleFecha').textContent = fecha;
            var imgWrap = document.getElementById('noticiaDetalleImgWrap');
            var imgEl = document.getElementById('noticiaDetalleImg');
            if (n.imagen_url) { imgEl.src = n.imagen_url; imgWrap.style.display = 'block'; }
            else { imgWrap.style.display = 'none'; }
            document.getElementById('modalNoticiaDetalle').classList.add('show');
        } catch (e) { console.error(e); K.showToast('Error al cargar noticia', 'error'); }
    };

    /* ══════════════════════════════════════════
       📰 ELIMINAR NOTICIA
       ══════════════════════════════════════════ */
    window._deleteNoticia = async function (nid) {
        if (!confirm('¿Eliminar esta noticia?')) return;
        try {
            var r = await db.from('noticias').delete().eq('id', nid);
            if (r.error) throw r.error;
            K.showToast('Noticia eliminada', 'success');
            K.loadNoticias(); K.loadStats();
        } catch (e) { K.showToast('Error: ' + e.message, 'error'); }
    };

    /* ══════════════════════════════════════════
       📰 CREAR NOTICIA
       ══════════════════════════════════════════ */
    K._selectedNoticiaFile = null;

    document.getElementById('noticiaCoverFile').addEventListener('change', function (e) {
        var f = e.target.files[0]; if (!f) return;
        K._selectedNoticiaFile = f;
        document.getElementById('noticiaCoverArea').classList.add('has-file');
        document.getElementById('noticiaCoverArea').querySelector('.file-upload-text').textContent = f.name;
        var rd = new FileReader();
        rd.onload = function (ev) {
            document.getElementById('noticiaCoverImg').src = ev.target.result;
            document.getElementById('noticiaCoverPreview').classList.add('show');
        };
        rd.readAsDataURL(f);
    });

    document.getElementById('formNoticia').addEventListener('submit', async function (e) {
        e.preventDefault();
        var titulo = document.getElementById('noticiaTitulo').value.trim();
        var desc = document.getElementById('noticiaDesc').value.trim();
        if (!titulo || !desc) { K.showToast('Completa título y descripción', 'error'); return; }

        var btn = document.getElementById('btnNoticiaSubmit');
        btn.classList.add('loading'); btn.disabled = true;

        try {
            var imageUrl = '';
            if (K._selectedNoticiaFile) {
                var fn = Date.now() + '_' + K._selectedNoticiaFile.name.replace(/[^a-zA-Z0-9._-]/g, '');
                var up = await db.storage.from('imagenes').upload('noticias/' + fn, K._selectedNoticiaFile, { contentType: K._selectedNoticiaFile.type });
                if (up.error) throw up.error;
                imageUrl = db.storage.from('imagenes').getPublicUrl('noticias/' + fn).data.publicUrl;
            }
            var ins = await db.from('noticias').insert({ titulo: titulo, descripcion: desc, imagen_url: imageUrl, autor_id: K.currentUser.id });
            if (ins.error) throw ins.error;
            K.showToast('¡Noticia publicada!', 'success');
            K.closeModal('modalNoticia');
            K.loadNoticias(); K.loadStats();
        } catch (e2) { console.error(e2); K.showToast('Error: ' + e2.message, 'error'); }
        btn.classList.remove('loading'); btn.disabled = false;
    });

})();