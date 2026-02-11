/* ============================================
   🛒 DASHBOARD-MARKETPLACE.JS — KXON
   Marketplace: beats/canciones, compra, solicitudes,
   archivo de compras
   ============================================ */
(function () {

    var db = window.db;
    var K = window.KXON;

    /* ══════════════════════════════════════════
       🛒 TABS
       ══════════════════════════════════════════ */
    window._marketTab = function (tab) {
        K.currentMarketTab = tab;
        var tabs = document.querySelectorAll('[data-market-tab]');
        for (var i = 0; i < tabs.length; i++) {
            tabs[i].classList.remove('active');
            if (tabs[i].getAttribute('data-market-tab') === tab) tabs[i].classList.add('active');
        }
        renderMarketGrid();
    };

    /* ══════════════════════════════════════════
       🛒 CARGAR MARKETPLACE
       ══════════════════════════════════════════ */
    K.loadMarketplace = async function () {
        try {
            var r = await db.from('beats').select('*').eq('activo', true).eq('vendido', false).order('created_at', { ascending: false });
            if (r.error) throw r.error;
            var solR = await db.from('solicitudes_compra').select('beat_id').eq('estado', 'pendiente');
            var pendingIds = [];
            if (solR.data) { for (var i = 0; i < solR.data.length; i++) pendingIds.push(solR.data[i].beat_id); }
            var filtered = []; var allData = r.data || [];
            for (var j = 0; j < allData.length; j++) {
                var found = false;
                for (var k = 0; k < pendingIds.length; k++) { if (allData[j].id === pendingIds[k]) { found = true; break; } }
                if (!found) filtered.push(allData[j]);
            }
            K.allMarketData = filtered;
            renderMarketGrid();
            if (K.isAdmin) loadSolicitudes();
        } catch (e) { console.error(e); }
    };

    /* ══════════════════════════════════════════
       🛒 RENDER GRID
       ══════════════════════════════════════════ */
    function renderMarketGrid() {
        var c = document.getElementById('marketGrid');
        var filtered = K.allMarketData.filter(function (item) { return item.tipo === K.currentMarketTab; });
        if (!filtered.length) {
            c.innerHTML = '<div class="empty-state"><div class="empty-icon">' + (K.currentMarketTab === 'beat' ? '🎹' : '🎤') + '</div><div class="empty-title">Sin ' + (K.currentMarketTab === 'beat' ? 'beats' : 'canciones') + '</div><div class="empty-text">Próximamente se agregarán nuevos productos</div></div>';
            return;
        }
        var h = '';
        for (var i = 0; i < filtered.length; i++) {
            var item = filtered[i];
            var img = item.imagen_url || 'https://placehold.co/400x400/111/333?text=♪';
            var badgeClass = item.tipo === 'beat' ? 'market-badge-beat' : 'market-badge-cancion';
            var badgeText = item.tipo === 'beat' ? 'BEAT' : 'CANCIÓN';
            h += '<div class="market-card">';
            h += '<div class="market-card-img"><img src="' + img + '" alt="" onerror="this.src=\'https://placehold.co/400x400/111/333?text=♪\'">';
            h += '<span class="market-card-badge ' + badgeClass + '">' + badgeText + '</span>';
            h += '<span class="market-card-price">' + K.formatPrice(item.precio) + '</span>';
            if (K.isAdmin) h += '<button class="market-card-admin-del visible" onclick="event.stopPropagation();window._deleteMarketItem(\'' + item.id + '\')">✕</button>';
            h += '</div><div class="market-card-body"><div class="market-card-title">' + item.titulo + '</div>';
            h += '<div class="market-card-desc">' + (item.descripcion || 'Sin descripción') + '</div>';
            h += '<div class="market-card-actions">';
            h += '<button class="market-btn-listen" onclick="event.stopPropagation();window._previewMarket(\'' + item.id + '\')">▶ Escuchar</button>';
            h += '<button class="market-btn-buy" onclick="event.stopPropagation();window._openMarketDetail(\'' + item.id + '\')">' + (K.isAdmin ? '👁 Ver' : '🛒 Comprar') + '</button>';
            h += '</div></div></div>';
        }
        c.innerHTML = h;
    }

    /* ══════════════════════════════════════════
       🔊 PREVIEW
       ══════════════════════════════════════════ */
    window._previewMarket = function (id) {
        var item = K.allMarketData.find(function (x) { return x.id === id; });
        if (!item) return;
        if (K.marketPreviewAudio.src && !K.marketPreviewAudio.paused) {
            K.marketPreviewAudio.pause(); K.marketPreviewAudio.currentTime = 0;
            document.getElementById('playerBar').classList.remove('show'); K.isPlaying = false; return;
        }
        K.marketPreviewAudio.src = item.archivo_url; K.marketPreviewAudio.volume = 0.7; K.marketPreviewAudio.play();
        document.getElementById('playerBar').classList.add('show');
        document.getElementById('playerTitle').textContent = item.titulo;
        document.getElementById('playerCover').src = item.imagen_url || '';
        document.getElementById('playerPlayPause').textContent = '⏸';
        K.isPlaying = true; K.currentPlaylist = []; K.currentTrackIndex = -1;
    };

    K.marketPreviewAudio.addEventListener('timeupdate', function () {
        if (!K.marketPreviewAudio.duration) return;
        var p = (K.marketPreviewAudio.currentTime / K.marketPreviewAudio.duration) * 100;
        document.getElementById('progressFill').style.width = p + '%';
        document.getElementById('playerCurrentTime').textContent = K.formatTime(K.marketPreviewAudio.currentTime);
        document.getElementById('playerDuration').textContent = K.formatTime(K.marketPreviewAudio.duration);
    });
    K.marketPreviewAudio.addEventListener('ended', function () {
        document.getElementById('playerPlayPause').textContent = '▶';
        document.getElementById('progressFill').style.width = '0%'; K.isPlaying = false;
    });

    /* ══════════════════════════════════════════
       🛒 DETALLE PRODUCTO
       ══════════════════════════════════════════ */
    window._openMarketDetail = function (id) {
        var item = K.allMarketData.find(function (x) { return x.id === id; });
        if (!item) return; K.currentMarketItem = item;
        var img = item.imagen_url || 'https://placehold.co/400x400/111/333?text=♪';
        document.getElementById('marketDetCover').src = img;
        document.getElementById('marketDetTitle').textContent = item.titulo;
        document.getElementById('marketDetDesc').textContent = item.descripcion || 'Sin descripción';
        document.getElementById('marketDetPrice').textContent = K.formatPrice(item.precio);
        var badge = document.getElementById('marketDetBadge');
        if (item.tipo === 'beat') { badge.textContent = 'BEAT'; badge.className = 'market-detail-badge market-badge-beat'; }
        else { badge.textContent = 'CANCIÓN'; badge.className = 'market-detail-badge market-badge-cancion'; }

        var audiosHtml = '<h4 class="market-detail-audios-title">🎧 Escuchar</h4>';
        if (item.tipo === 'beat') {
            audiosHtml += '<div class="market-audio-item"><button class="market-audio-play" onclick="window._playMarketAudio(\'' + item.archivo_url + '\')">▶</button><span class="market-audio-label">' + item.titulo + '</span><span class="market-audio-tag">Beat</span></div>';
        } else {
            if (item.archivo_url) audiosHtml += '<div class="market-audio-item"><button class="market-audio-play" onclick="window._playMarketAudio(\'' + item.archivo_url + '\')">▶</button><span class="market-audio-label">Canción Completa</span><span class="market-audio-tag">Completa</span></div>';
            if (item.archivo_voz_url) audiosHtml += '<div class="market-audio-item"><button class="market-audio-play" onclick="window._playMarketAudio(\'' + item.archivo_voz_url + '\')">▶</button><span class="market-audio-label">Solo Voz</span><span class="market-audio-tag">Voz</span></div>';
            if (item.archivo_beat_url) audiosHtml += '<div class="market-audio-item"><button class="market-audio-play" onclick="window._playMarketAudio(\'' + item.archivo_beat_url + '\')">▶</button><span class="market-audio-label">Solo Beat</span><span class="market-audio-tag">Beat</span></div>';
        }
        document.getElementById('marketDetAudios').innerHTML = audiosHtml;
        var actionsEl = document.getElementById('marketDetActions');
        if (K.isAdmin) actionsEl.style.display = 'none'; else actionsEl.style.display = 'flex';
        document.getElementById('marketDetailOverlay').classList.add('show');
    };

    window._playMarketAudio = function (url) {
        if (K.marketPreviewAudio.src === url && !K.marketPreviewAudio.paused) { K.marketPreviewAudio.pause(); return; }
        K.marketPreviewAudio.src = url; K.marketPreviewAudio.volume = 0.7; K.marketPreviewAudio.play();
    };

    /* ══════════════════════════════════════════
       💳 COMPRA — NEQUI
       ══════════════════════════════════════════ */
    window._initPurchase = function () {
        if (!K.currentMarketItem) return;
        K.marketPreviewAudio.pause();
        document.getElementById('marketDetailOverlay').classList.remove('show');
        document.getElementById('purchaseUser').textContent = K.currentUser.email;
        document.getElementById('purchaseProduct').textContent = K.currentMarketItem.titulo;
        document.getElementById('purchasePrice').textContent = K.formatPrice(K.currentMarketItem.precio);
        var waMsg = 'Hola KXON, quiero comprar: ' + K.currentMarketItem.titulo + ' (' + K.formatPrice(K.currentMarketItem.precio) + ') - Mi email: ' + K.currentUser.email;
        document.getElementById('btnWhatsapp').href = 'https://wa.me/573184530020?text=' + encodeURIComponent(waMsg);
        selectedCompFile = null;
        document.getElementById('purchaseCompArea').classList.remove('has-file');
        document.getElementById('purchaseCompArea').querySelector('.file-upload-text').textContent = 'Click para subir comprobante';
        document.getElementById('purchaseCompPreview').classList.remove('show');
        document.getElementById('purchaseCompFile').value = '';
        document.getElementById('purchaseOverlay').classList.add('show');
    };

    var selectedCompFile = null;
    document.getElementById('purchaseCompFile').addEventListener('change', function (e) {
        var f = e.target.files[0]; if (!f) return; selectedCompFile = f;
        document.getElementById('purchaseCompArea').classList.add('has-file');
        document.getElementById('purchaseCompArea').querySelector('.file-upload-text').textContent = f.name;
        var rd = new FileReader();
        rd.onload = function (ev) { document.getElementById('purchaseCompImg').src = ev.target.result; document.getElementById('purchaseCompPreview').classList.add('show'); };
        rd.readAsDataURL(f);
    });

    window._sendPurchase = async function () {
        if (!K.currentMarketItem) { K.showToast('Error: producto no seleccionado', 'error'); return; }
        if (!selectedCompFile) { K.showToast('Sube el comprobante de pago', 'error'); return; }
        var btn = document.getElementById('btnSendPurchase'); btn.classList.add('loading'); btn.disabled = true;
        try {
            var fn = Date.now() + '_comp_' + selectedCompFile.name.replace(/[^a-zA-Z0-9._-]/g, '');
            var up = await db.storage.from('imagenes').upload('comprobantes/' + fn, selectedCompFile, { contentType: selectedCompFile.type });
            if (up.error) throw up.error;
            var compUrl = db.storage.from('imagenes').getPublicUrl('comprobantes/' + fn).data.publicUrl;
            var sol = await db.from('solicitudes_compra').insert({
                beat_id: K.currentMarketItem.id, comprador_id: K.currentUser.id,
                comprador_email: K.currentUser.email,
                comprador_nombre: K.currentProfile.full_name || K.currentUser.email.split('@')[0],
                precio: K.currentMarketItem.precio, comprobante_url: compUrl, estado: 'pendiente'
            });
            if (sol.error) throw sol.error;
            await db.from('beats').update({ activo: false }).eq('id', K.currentMarketItem.id);
            K.showToast('¡Solicitud enviada! Espera confirmación del admin', 'success');
            window._closePurchase(); K.loadMarketplace(); K.loadArchivo(); K.loadStats();
        } catch (e) { console.error(e); K.showToast('Error: ' + e.message, 'error'); }
        btn.classList.remove('loading'); btn.disabled = false;
    };

    window._closePurchase = function () {
        document.getElementById('purchaseOverlay').classList.remove('show');
        K.marketPreviewAudio.pause();
    };

    window._deleteMarketItem = async function (id) {
        if (!confirm('¿Eliminar este producto del marketplace?')) return;
        try {
            var r = await db.from('beats').delete().eq('id', id);
            if (r.error) throw r.error;
            K.showToast('Producto eliminado', 'success'); K.loadMarketplace(); K.loadStats();
        } catch (e) { K.showToast('Error: ' + e.message, 'error'); }
    };

    /* ══════════════════════════════════════════
       📋 ADMIN: SOLICITUDES (LISTA COMPACTA + MODAL)
       ══════════════════════════════════════════ */
    var allSolicitudesData = [];

    async function loadSolicitudes() {
        if (!K.isAdmin) return;
        document.getElementById('solicitudesSection').style.display = 'block';
        try {
            var r = await db.from('solicitudes_compra')
                .select('*, beats(id, titulo, imagen_url, archivo_url, archivo_voz_url, archivo_beat_url, tipo, precio)')
                .eq('estado', 'pendiente')
                .order('created_at', { ascending: false });
            if (r.error) throw r.error;

            allSolicitudesData = r.data || [];
            var c = document.getElementById('solicitudesList');

            if (!allSolicitudesData.length) {
                c.innerHTML = '<div class="empty-state" style="padding:40px 20px;"><div class="empty-icon">✅</div><div class="empty-title">Sin solicitudes pendientes</div></div>';
                return;
            }

            var h = '<div class="solicitud-list">';
            for (var i = 0; i < allSolicitudesData.length; i++) {
                var s = allSolicitudesData[i];
                var beatTitle = s.beats ? s.beats.titulo : 'Producto eliminado';
                var beatTipo = s.beats ? s.beats.tipo : 'beat';
                var tipoIcon = beatTipo === 'cancion' ? '🎤' : '🎹';

                h += '<div class="solicitud-row">';
                h += '<span class="solicitud-row-num">' + (i + 1) + '</span>';
                h += '<span class="solicitud-row-icon">' + tipoIcon + '</span>';
                h += '<div class="solicitud-row-info">';
                h += '<div class="solicitud-row-title">' + beatTitle + '</div>';
                h += '<div class="solicitud-row-buyer">' + s.comprador_nombre + '</div>';
                h += '</div>';
                h += '<span class="solicitud-row-price">' + K.formatPrice(s.precio) + '</span>';
                h += '<div class="solicitud-row-status"><span class="solicitud-status pendiente">Pendiente</span></div>';
                h += '<button class="solicitud-row-view" onclick="window._openSolicitudDetail(' + i + ')" title="Ver detalle">👁</button>';
                h += '</div>';
            }
            h += '</div>';
            c.innerHTML = h;
        } catch (e) { console.error(e); }
    }

    /* ── ABRIR MODAL DETALLE SOLICITUD ── */
    window._openSolicitudDetail = function (idx) {
        var s = allSolicitudesData[idx];
        if (!s) return;

        var beatTitle = s.beats ? s.beats.titulo : 'Producto eliminado';
        var beatImg = s.beats ? (s.beats.imagen_url || 'https://placehold.co/200x200/111/333?text=♪') : 'https://placehold.co/200x200/111/333?text=♪';
        var beatTipo = s.beats ? s.beats.tipo : 'beat';
        var fecha = new Date(s.created_at).toLocaleDateString('es-ES', {
            day: 'numeric', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        /* Producto */
        document.getElementById('solDetCover').src = beatImg;
        document.getElementById('solDetTitle').textContent = beatTitle;
        document.getElementById('solDetPrice').textContent = K.formatPrice(s.precio);

        /* Tipo badge */
        var typeEl = document.getElementById('solDetType');
        if (beatTipo === 'cancion') {
            typeEl.textContent = 'CANCIÓN';
            typeEl.className = 'solicitud-detail-product-type market-badge-cancion';
        } else {
            typeEl.textContent = 'BEAT';
            typeEl.className = 'solicitud-detail-product-type market-badge-beat';
        }

        /* Info comprador */
        document.getElementById('solDetBuyer').textContent = s.comprador_nombre;
        document.getElementById('solDetEmail').textContent = s.comprador_email;
        document.getElementById('solDetFecha').textContent = fecha;
        document.getElementById('solDetEstado').textContent = '⏳ Pendiente';

        /* Comprobante */
        var compWrap = document.getElementById('solDetCompWrap');
        if (s.comprobante_url) {
            document.getElementById('solDetCompImg').src = s.comprobante_url;
            compWrap.style.display = 'block';
        } else {
            compWrap.style.display = 'none';
        }

        /* Botones con datos de esta solicitud */
        var btnConfirm = document.getElementById('solDetBtnConfirm');
        var btnReject = document.getElementById('solDetBtnReject');

        btnConfirm.onclick = function () {
            window._confirmPurchase(s.id, s.beat_id, s.comprador_id, s.precio);
            document.getElementById('solicitudDetailOverlay').classList.remove('show');
        };
        btnReject.onclick = function () {
            window._rejectPurchase(s.id, s.beat_id);
            document.getElementById('solicitudDetailOverlay').classList.remove('show');
        };

        document.getElementById('solicitudDetailOverlay').classList.add('show');
    };

    /* ── CERRAR MODAL SOLICITUD (click fuera) ── */
    document.getElementById('solicitudDetailOverlay').addEventListener('click', function (e) {
        if (e.target === this) this.classList.remove('show');
    });

    /* ══════════════════════════════════════════
       ✅❌ CONFIRMAR / RECHAZAR COMPRA
       ══════════════════════════════════════════ */
    window._confirmPurchase = async function (solId, beatId, compradorId, precio) {
        if (!confirm('¿Confirmar esta compra? El beat pasará al archivo del comprador.')) return;
        try {
            var r1 = await db.from('solicitudes_compra').update({ estado: 'confirmada' }).eq('id', solId);
            if (r1.error) throw r1.error;
            var r2 = await db.from('beats').update({ vendido: true, activo: false }).eq('id', beatId);
            if (r2.error) throw r2.error;
            var r3 = await db.from('compras').insert({ beat_id: beatId, comprador_id: compradorId, precio_pagado: precio });
            if (r3.error) throw r3.error;
                        /* Notificar al comprador */
            K.sendNotification(
                compradorId,
                'compra_confirmada',
                '¡Compra confirmada!',
                'Tu compra ha sido aprobada. Ya puedes descargar tu archivo desde Mi Archivo.',
                { beat_id: beatId }
            );
            K.showToast('¡Compra confirmada!', 'success');
            loadSolicitudes(); K.loadMarketplace(); K.loadArchivo(); K.loadStats();
        } catch (e) { console.error(e); K.showToast('Error: ' + e.message, 'error'); }
    };

       window._rejectPurchase = async function (solId, beatId) {
        if (!confirm('¿Rechazar esta solicitud? El producto volverá al marketplace.')) return;
        try {
            /* Buscar comprador_id */
            var compradorId = null;
            for (var i = 0; i < allSolicitudesData.length; i++) {
                if (allSolicitudesData[i].id === solId) {
                    compradorId = allSolicitudesData[i].comprador_id;
                    break;
                }
            }

            var r1 = await db.from('solicitudes_compra').update({ estado: 'rechazada' }).eq('id', solId);
            if (r1.error) throw r1.error;
            var r2 = await db.from('beats').update({ activo: true }).eq('id', beatId);
            if (r2.error) throw r2.error;

            /* Notificar al comprador */
            if (compradorId) {
                K.sendNotification(
                    compradorId,
                    'compra_rechazada',
                    'Solicitud rechazada',
                    'Tu solicitud de compra fue rechazada. El pago no fue verificado. Contacta por WhatsApp si crees que es un error.',
                    { beat_id: beatId }
                );
            }

            K.showToast('Solicitud rechazada. Producto disponible de nuevo', 'success');
            loadSolicitudes(); K.loadMarketplace();
        } catch (e) { console.error(e); K.showToast('Error: ' + e.message, 'error'); }
    };
    /* ══════════════════════════════════════════
       🛒 ADMIN: CREAR PRODUCTO
       ══════════════════════════════════════════ */
    var marketAddType = 'beat';
    var marketImgFile = null, marketAudioMainFile = null, marketAudioVozFile = null, marketAudioBeatFile = null;

    window._setAddType = function (tipo) {
        marketAddType = tipo;
        document.getElementById('marketAddTipo').value = tipo;
        document.getElementById('addTypeBeat').classList.remove('active');
        document.getElementById('addTypeCancion').classList.remove('active');
        if (tipo === 'beat') {
            document.getElementById('addTypeBeat').classList.add('active');
            document.getElementById('labelAudioMain').textContent = 'Archivo de audio (Beat)';
            document.getElementById('groupAudioVoz').style.display = 'none';
            document.getElementById('groupAudioBeat').style.display = 'none';
            document.getElementById('modalMarketTitle').textContent = 'Nuevo Beat';
        } else {
            document.getElementById('addTypeCancion').classList.add('active');
            document.getElementById('labelAudioMain').textContent = 'Canción Completa (voz + beat)';
            document.getElementById('groupAudioVoz').style.display = 'flex';
            document.getElementById('groupAudioBeat').style.display = 'flex';
            document.getElementById('modalMarketTitle').textContent = 'Nueva Canción';
        }
    };

    document.getElementById('marketImgFile').addEventListener('change', function (e) {
        var f = e.target.files[0]; if (!f) return; marketImgFile = f;
        document.getElementById('marketImgArea').classList.add('has-file');
        document.getElementById('marketImgArea').querySelector('.file-upload-text').textContent = f.name;
        var rd = new FileReader();
        rd.onload = function (ev) { document.getElementById('marketImgPrev').src = ev.target.result; document.getElementById('marketImgPreview').classList.add('show'); };
        rd.readAsDataURL(f);
    });
    document.getElementById('marketAudioMainFile').addEventListener('change', function (e) {
        var f = e.target.files[0]; if (!f) return; marketAudioMainFile = f;
        document.getElementById('marketAudioMainArea').classList.add('has-file');
        document.getElementById('marketAudioMainArea').querySelector('.file-upload-text').textContent = f.name;
    });
    document.getElementById('marketAudioVozFile').addEventListener('change', function (e) {
        var f = e.target.files[0]; if (!f) return; marketAudioVozFile = f;
        document.getElementById('marketAudioVozArea').classList.add('has-file');
        document.getElementById('marketAudioVozArea').querySelector('.file-upload-text').textContent = f.name;
    });
    document.getElementById('marketAudioBeatFile').addEventListener('change', function (e) {
        var f = e.target.files[0]; if (!f) return; marketAudioBeatFile = f;
        document.getElementById('marketAudioBeatArea').classList.add('has-file');
        document.getElementById('marketAudioBeatArea').querySelector('.file-upload-text').textContent = f.name;
    });

    document.getElementById('formMarketAdd').addEventListener('submit', async function (e) {
        e.preventDefault();
        var titulo = document.getElementById('marketAddTitulo').value.trim();
        var desc = document.getElementById('marketAddDesc').value.trim();
        var precio = document.getElementById('marketAddPrecio').value;
        var tipo = document.getElementById('marketAddTipo').value;
        if (!titulo) { K.showToast('Ingresa un título', 'error'); return; }
        if (!precio || precio <= 0) { K.showToast('Ingresa un precio válido', 'error'); return; }
        if (!marketAudioMainFile) { K.showToast('Sube el archivo de audio principal', 'error'); return; }
        if (tipo === 'cancion' && !marketAudioVozFile) { K.showToast('Sube el archivo de voz', 'error'); return; }
        if (tipo === 'cancion' && !marketAudioBeatFile) { K.showToast('Sube el archivo de beat separado', 'error'); return; }

        var btn = document.getElementById('btnMarketSubmit'); btn.classList.add('loading'); btn.disabled = true;
        var prog = document.getElementById('marketUploadProgress'); prog.classList.add('show');
        document.getElementById('marketUploadText').textContent = 'Subiendo imagen...';
        document.getElementById('marketUploadFill').style.width = '10%';

        try {
            var imageUrl = '';
            if (marketImgFile) {
                var fn = Date.now() + '_' + marketImgFile.name.replace(/[^a-zA-Z0-9._-]/g, '');
                var up = await db.storage.from('imagenes').upload('beats/' + fn, marketImgFile, { contentType: marketImgFile.type });
                if (up.error) throw up.error;
                imageUrl = db.storage.from('imagenes').getPublicUrl('beats/' + fn).data.publicUrl;
            }
            document.getElementById('marketUploadFill').style.width = '30%';
            document.getElementById('marketUploadText').textContent = 'Subiendo audio principal...';
            var fn2 = Date.now() + '_main_' + marketAudioMainFile.name.replace(/[^a-zA-Z0-9._-]/g, '');
            var up2 = await db.storage.from('beats').upload('market/' + fn2, marketAudioMainFile, { contentType: marketAudioMainFile.type });
            if (up2.error) throw up2.error;
            var mainUrl = db.storage.from('beats').getPublicUrl('market/' + fn2).data.publicUrl;
            document.getElementById('marketUploadFill').style.width = '55%';

            var vozUrl = '';
            if (tipo === 'cancion' && marketAudioVozFile) {
                document.getElementById('marketUploadText').textContent = 'Subiendo voz...';
                var fn3 = Date.now() + '_voz_' + marketAudioVozFile.name.replace(/[^a-zA-Z0-9._-]/g, '');
                var up3 = await db.storage.from('beats').upload('market/' + fn3, marketAudioVozFile, { contentType: marketAudioVozFile.type });
                if (up3.error) throw up3.error;
                vozUrl = db.storage.from('beats').getPublicUrl('market/' + fn3).data.publicUrl;
            }
            document.getElementById('marketUploadFill').style.width = '75%';

            var beatSepUrl = '';
            if (tipo === 'cancion' && marketAudioBeatFile) {
                document.getElementById('marketUploadText').textContent = 'Subiendo beat...';
                var fn4 = Date.now() + '_beat_' + marketAudioBeatFile.name.replace(/[^a-zA-Z0-9._-]/g, '');
                var up4 = await db.storage.from('beats').upload('market/' + fn4, marketAudioBeatFile, { contentType: marketAudioBeatFile.type });
                if (up4.error) throw up4.error;
                beatSepUrl = db.storage.from('beats').getPublicUrl('market/' + fn4).data.publicUrl;
            }
            document.getElementById('marketUploadFill').style.width = '90%';
            document.getElementById('marketUploadText').textContent = 'Guardando...';

            var ins = await db.from('beats').insert({
                titulo: titulo, descripcion: desc, imagen_url: imageUrl, archivo_url: mainUrl,
                archivo_voz_url: vozUrl, archivo_beat_url: beatSepUrl, precio: Number(precio),
                tipo: tipo, autor_id: K.currentUser.id, activo: true, vendido: false
            });
            if (ins.error) throw ins.error;
            document.getElementById('marketUploadFill').style.width = '100%';
            document.getElementById('marketUploadText').textContent = '¡Completado!';
            K.showToast('¡Producto publicado en marketplace!', 'success');
            window._closeMarketModal(); K.loadMarketplace(); K.loadStats();
        } catch (e2) { console.error(e2); K.showToast('Error: ' + e2.message, 'error'); }
        btn.classList.remove('loading'); btn.disabled = false;
        setTimeout(function () { prog.classList.remove('show'); document.getElementById('marketUploadFill').style.width = '0%'; }, 1500);
    });

    window._closeMarketModal = function () {
        document.getElementById('modalMarketAdd').classList.remove('show');
        document.getElementById('marketAddTitulo').value = '';
        document.getElementById('marketAddDesc').value = '';
        document.getElementById('marketAddPrecio').value = '';
        marketImgFile = null; marketAudioMainFile = null; marketAudioVozFile = null; marketAudioBeatFile = null;
        document.getElementById('marketImgArea').classList.remove('has-file');
        document.getElementById('marketImgArea').querySelector('.file-upload-text').textContent = 'Click para subir imagen';
        document.getElementById('marketImgPreview').classList.remove('show');
        document.getElementById('marketImgFile').value = '';
        document.getElementById('marketAudioMainArea').classList.remove('has-file');
        document.getElementById('marketAudioMainArea').querySelector('.file-upload-text').textContent = 'Click para subir audio';
        document.getElementById('marketAudioMainFile').value = '';
        document.getElementById('marketAudioVozArea').classList.remove('has-file');
        document.getElementById('marketAudioVozArea').querySelector('.file-upload-text').textContent = 'Click para subir voz';
        document.getElementById('marketAudioVozFile').value = '';
        document.getElementById('marketAudioBeatArea').classList.remove('has-file');
        document.getElementById('marketAudioBeatArea').querySelector('.file-upload-text').textContent = 'Click para subir beat';
        document.getElementById('marketAudioBeatFile').value = '';
        document.getElementById('marketUploadProgress').classList.remove('show');
        document.getElementById('marketUploadFill').style.width = '0%';
        window._setAddType('beat');
    };

})();