/* ============================================
   🎫 DASHBOARD-PLANES.JS — KXON
   Panel de planes, suscripción, admin gestión
   Lista compacta + modal detalle
   ============================================ */
(function () {

    var db = window.db;
    var K = window.KXON;

    var allPlanes = [];
    var allSubSolicitudes = [];
    var currentSubPlan = null;
    var selectedSubCompFile = null;

    /* ══════════════════════════════════════════
       🎫 CARGAR PLANES
       ══════════════════════════════════════════ */
    window.KXON.loadPlanes = async function () {
        try {
            var r = await db.from('planes')
                .select('*')
                .eq('activo', true)
                .order('orden', { ascending: true });

            if (r.error) throw r.error;
            allPlanes = r.data || [];

            var pendingSub = null;
            if (!K.isAdmin) {
                var ps = await db.from('suscripciones')
                    .select('*, planes(nombre)')
                    .eq('usuario_id', K.currentUser.id)
                    .eq('estado', 'pendiente')
                    .limit(1);
                if (ps.data && ps.data.length > 0) pendingSub = ps.data[0];
            }

            renderPlanes(pendingSub);
            if (K.isAdmin) loadSubSolicitudes();
        } catch (e) {
            console.error('Error cargando planes:', e);
        }
    };

    /* ══════════════════════════════════════════
       🎫 RENDER PLANES
       ══════════════════════════════════════════ */
    function renderPlanes(pendingSub) {
        var c = document.getElementById('planesGrid');
        if (!allPlanes.length) {
            c.innerHTML = '<div class="empty-state"><div class="empty-icon">🎫</div><div class="empty-title">Sin planes disponibles</div></div>';
            return;
        }

        var h = '';
        for (var i = 0; i < allPlanes.length; i++) {
            var plan = allPlanes[i];
            var isPremium = plan.orden === 2 || plan.nombre.toLowerCase().indexOf('premium') >= 0;
            var isActivePlan = K.userSubscription && K.userSubscription.plan_id === plan.id;
            var isPending = pendingSub && pendingSub.plan_id === plan.id;

                        var allFeatures = [
                { key: 'albumes', label: 'Álbumes completos', icon: '💿' },
                { key: 'canciones', label: 'Todas las canciones', icon: '🎵' },
                { key: 'radio', label: 'Radio KXON', icon: '📻' },
                { key: 'videos', label: 'Videos exclusivos', icon: '🎬' },
                { key: 'documentales', label: 'Documentales', icon: '🎞️' },
                { key: 'playlists', label: 'Playlists', icon: '🎶' },
                { key: 'envivo', label: 'En Vivo', icon: '🔴' },
                { key: 'chat', label: 'Chat', icon: '💬' },
                { key: 'solicitar-beat', label: 'Solicitar Beat', icon: '📋' },
                { key: 'historial', label: 'Historial', icon: '📊' },
                { key: 'favoritos', label: 'Favoritos', icon: '❤️' },
                { key: 'marketplace', label: 'Marketplace', icon: '🛒' }
            ];

            h += '<div class="plan-card' + (isActivePlan ? ' plan-active' : '') + (isPremium ? ' plan-premium' : '') + '">';

            if (K.isAdmin) {
                h += '<button class="plan-admin-edit visible" onclick="window._editPlan(\'' + plan.id + '\')" title="Editar">✏️</button>';
            }

            if (isActivePlan) {
                h += '<span class="plan-badge plan-badge-active">✓ Activo</span>';
            } else if (isPremium) {
                h += '<span class="plan-badge plan-badge-premium">⭐ Recomendado</span>';
            } else {
                h += '<span class="plan-badge">Básico</span>';
            }

            h += '<h3 class="plan-name">' + plan.nombre + '</h3>';
            h += '<div class="plan-price">' + K.formatPrice(plan.precio) + '</div>';
            h += '<div class="plan-price-period">/ ' + plan.duracion_dias + ' días</div>';

            h += '<div class="plan-features">';
            for (var f = 0; f < allFeatures.length; f++) {
                var feat = allFeatures[f];
                var hasAccess = plan.accesos && plan.accesos.indexOf(feat.key) >= 0;
                h += '<div class="plan-feature' + (hasAccess ? '' : ' disabled') + '">';
                h += '<span class="plan-feature-icon">' + (hasAccess ? '✅' : '❌') + '</span>';
                h += '<span>' + feat.label + '</span>';
                h += '</div>';
            }
            h += '</div>';

            if (K.isAdmin) {
                h += '<button class="plan-btn plan-btn-active" disabled>Admin — Acceso Total</button>';
            } else if (isActivePlan) {
                h += '<button class="plan-btn plan-btn-active" disabled>✓ Plan Activo</button>';
                var fechaFin = new Date(K.userSubscription.fecha_fin).toLocaleDateString('es-ES', {
                    day: 'numeric', month: 'long', year: 'numeric'
                });
                h += '<div class="plan-expires">Vence: ' + fechaFin + '</div>';
            } else if (isPending) {
                h += '<button class="plan-btn plan-btn-pending" disabled>⏳ Solicitud Pendiente</button>';
            } else {
                h += '<button class="plan-btn" onclick="window._subscribePlan(\'' + plan.id + '\')">🎫 Suscribirse</button>';
            }

            h += '</div>';
        }

        c.innerHTML = h;
    }

    /* ══════════════════════════════════════════
       🎫 SUSCRIBIRSE A PLAN
       ══════════════════════════════════════════ */
    window._subscribePlan = function (planId) {
        var plan = allPlanes.find(function (p) { return p.id === planId; });
        if (!plan) return;
        currentSubPlan = plan;

        document.getElementById('subUser').textContent = K.currentUser.email;
        document.getElementById('subPlanName').textContent = plan.nombre;
        document.getElementById('subPlanPrice').textContent = K.formatPrice(plan.precio);
        document.getElementById('subPlanDuration').textContent = plan.duracion_dias + ' días';

        var waMsg = 'Hola KXON, quiero suscribirme al: ' + plan.nombre + ' (' + K.formatPrice(plan.precio) + ') - Mi email: ' + K.currentUser.email;
        document.getElementById('subBtnWhatsapp').href = 'https://wa.me/573184530020?text=' + encodeURIComponent(waMsg);

        selectedSubCompFile = null;
        document.getElementById('subCompArea').classList.remove('has-file');
        document.getElementById('subCompArea').querySelector('.file-upload-text').textContent = 'Click para subir comprobante';
        document.getElementById('subCompPreview').classList.remove('show');
        document.getElementById('subCompFile').value = '';

        document.getElementById('subOverlay').classList.add('show');
    };

    /* ── Comprobante file ── */
    document.getElementById('subCompFile').addEventListener('change', function (e) {
        var f = e.target.files[0];
        if (!f) return;
        selectedSubCompFile = f;
        document.getElementById('subCompArea').classList.add('has-file');
        document.getElementById('subCompArea').querySelector('.file-upload-text').textContent = f.name;
        var rd = new FileReader();
        rd.onload = function (ev) {
            document.getElementById('subCompImg').src = ev.target.result;
            document.getElementById('subCompPreview').classList.add('show');
        };
        rd.readAsDataURL(f);
    });

    /* ── Enviar solicitud ── */
    window._sendSubscription = async function () {
        if (!currentSubPlan) { K.showToast('Error: plan no seleccionado', 'error'); return; }
        if (!selectedSubCompFile) { K.showToast('Sube el comprobante de pago', 'error'); return; }

        var btn = document.getElementById('btnSendSub');
        btn.classList.add('loading');
        btn.disabled = true;

        try {
            var fn = Date.now() + '_sub_' + selectedSubCompFile.name.replace(/[^a-zA-Z0-9._-]/g, '');
            var up = await db.storage.from('imagenes').upload('suscripciones/' + fn, selectedSubCompFile, { contentType: selectedSubCompFile.type });
            if (up.error) throw up.error;
            var compUrl = db.storage.from('imagenes').getPublicUrl('suscripciones/' + fn).data.publicUrl;

            var nombre = K.currentProfile.full_name || K.currentUser.email.split('@')[0];
            var ins = await db.from('suscripciones').insert({
                usuario_id: K.currentUser.id,
                usuario_email: K.currentUser.email,
                usuario_nombre: nombre,
                plan_id: currentSubPlan.id,
                comprobante_url: compUrl,
                estado: 'pendiente'
            });
            if (ins.error) throw ins.error;

            K.showToast('¡Solicitud enviada! Espera confirmación del admin', 'success');
            window._closeSubModal();
            K.loadPlanes();
        } catch (e) {
            console.error(e);
            K.showToast('Error: ' + e.message, 'error');
        }

        btn.classList.remove('loading');
        btn.disabled = false;
    };

    window._closeSubModal = function () {
        document.getElementById('subOverlay').classList.remove('show');
    };

    document.getElementById('subOverlay').addEventListener('click', function (e) {
        if (e.target === this) window._closeSubModal();
    });

         /* ══════════════════════════════════════════
       🔧 ADMIN: EDITAR PLAN (TODOS LOS ACCESOS)
       ══════════════════════════════════════════ */

    // Lista maestra de todos los accesos disponibles
    var allAccesosConfig = [
        { id: 'editAccAlbumes',       key: 'albumes' },
        { id: 'editAccCanciones',     key: 'canciones' },
        { id: 'editAccRadio',         key: 'radio' },
        { id: 'editAccVideos',        key: 'videos' },
        { id: 'editAccDocumentales',  key: 'documentales' },
        { id: 'editAccPlaylists',     key: 'playlists' },
        { id: 'editAccEnvivo',        key: 'envivo' },
        { id: 'editAccChat',          key: 'chat' },
        { id: 'editAccSolicitarBeat', key: 'solicitar-beat' },
        { id: 'editAccHistorial',     key: 'historial' },
        { id: 'editAccFavoritos',     key: 'favoritos' },
        { id: 'editAccMarketplace',   key: 'marketplace' }
    ];

    window._editPlan = function (planId) {
        var plan = allPlanes.find(function (p) { return p.id === planId; });
        if (!plan) return;

        // Campos básicos
        document.getElementById('editPlanId').value = plan.id;
        document.getElementById('editPlanNombre').value = plan.nombre || '';
        document.getElementById('editPlanPrecio').value = plan.precio || 0;
        document.getElementById('editPlanDuracion').value = plan.duracion_dias || 30;
        document.getElementById('editPlanOrden').value = plan.orden || 1;

        // Marcar/desmarcar todos los checkboxes de accesos
        var accesos = plan.accesos || [];
        for (var i = 0; i < allAccesosConfig.length; i++) {
            var cb = document.getElementById(allAccesosConfig[i].id);
            if (cb) {
                cb.checked = accesos.indexOf(allAccesosConfig[i].key) >= 0;
            }
        }

        document.getElementById('modalEditPlan').classList.add('show');
    };

    window._closeEditPlan = function () {
        document.getElementById('modalEditPlan').classList.remove('show');
    };

    document.getElementById('modalEditPlan').addEventListener('click', function (e) {
        if (e.target === this) window._closeEditPlan();
    });

    document.getElementById('formEditPlan').addEventListener('submit', async function (e) {
        e.preventDefault();

        var planId = document.getElementById('editPlanId').value;
        var nombre = document.getElementById('editPlanNombre').value.trim();
        var precio = parseInt(document.getElementById('editPlanPrecio').value) || 0;
        var duracion = parseInt(document.getElementById('editPlanDuracion').value) || 30;
        var orden = parseInt(document.getElementById('editPlanOrden').value) || 1;

        if (!nombre) { K.showToast('Ingresa un nombre', 'error'); return; }

        // Recoger TODOS los accesos seleccionados
        var accesos = [];
        for (var i = 0; i < allAccesosConfig.length; i++) {
            var cb = document.getElementById(allAccesosConfig[i].id);
            if (cb && cb.checked) {
                accesos.push(allAccesosConfig[i].key);
            }
        }

        var btn = document.getElementById('btnEditPlanSubmit');
        btn.classList.add('loading');
        btn.disabled = true;

        try {
            var upd = await db.from('planes').update({
                nombre: nombre,
                precio: precio,
                duracion_dias: duracion,
                orden: orden,
                accesos: accesos,
                updated_at: new Date().toISOString()
            }).eq('id', planId);

            if (upd.error) throw upd.error;

            K.showToast('¡Plan actualizado correctamente!', 'success');
            window._closeEditPlan();
            K.loadPlanes();
        } catch (err) {
            console.error('Error actualizando plan:', err);
            K.showToast('Error: ' + err.message, 'error');
        }

        btn.classList.remove('loading');
        btn.disabled = false;
    });
    /* ══════════════════════════════════════════
       📋 ADMIN: SOLICITUDES — LISTA COMPACTA
       ══════════════════════════════════════════ */
    async function loadSubSolicitudes() {
        if (!K.isAdmin) return;

        document.getElementById('subSolicitudesSection').style.display = 'block';

        try {
            var r = await db.from('suscripciones')
                .select('*, planes(nombre, duracion_dias, accesos, precio)')
                .eq('estado', 'pendiente')
                .order('created_at', { ascending: false });

            if (r.error) throw r.error;
            allSubSolicitudes = r.data || [];
            var c = document.getElementById('subSolicitudesList');

            if (!allSubSolicitudes.length) {
                c.innerHTML = '<div class="empty-state" style="padding:40px 20px;"><div class="empty-icon">✅</div><div class="empty-title">Sin solicitudes pendientes</div></div>';
                return;
            }

            var h = '<div class="sub-list">';
            for (var i = 0; i < allSubSolicitudes.length; i++) {
                var s = allSubSolicitudes[i];
                var nombre = s.usuario_nombre || 'Sin nombre';
                var inicial = nombre.charAt(0).toUpperCase();
                var planName = s.planes ? s.planes.nombre : 'Plan';
                var isPremium = planName.toLowerCase().indexOf('premium') >= 0;
                var fecha = new Date(s.created_at).toLocaleDateString('es-ES', {
                    day: 'numeric', month: 'short'
                });

                h += '<div class="sub-list-item">';
                h += '<div class="sub-list-avatar">' + inicial + '</div>';
                h += '<div class="sub-list-info">';
                h += '<div class="sub-list-name">' + nombre + '</div>';
                h += '<div class="sub-list-meta">';
                h += '<span class="sub-list-plan-badge' + (isPremium ? ' premium' : '') + '">' + planName + '</span>';
                h += '<span>' + (s.usuario_email || '') + '</span>';
                h += '</div></div>';
                h += '<span class="sub-list-date">' + fecha + '</span>';
                h += '<button class="sub-list-view" onclick="window._viewSubDetail(' + i + ')" title="Ver detalle">👁</button>';
                h += '</div>';
            }
            h += '</div>';

            c.innerHTML = h;
        } catch (e) {
            console.error('Error cargando solicitudes sub:', e);
        }
    }

    /* ══════════════════════════════════════════
       👁 VER DETALLE SOLICITUD (MODAL)
       ══════════════════════════════════════════ */
    window._viewSubDetail = function (idx) {
        var s = allSubSolicitudes[idx];
        if (!s) return;

        var overlay = document.getElementById('subDetailOverlay');
        if (!overlay) {
            /* Crear modal dinámicamente la primera vez */
            overlay = document.createElement('div');
            overlay.className = 'sub-detail-overlay';
            overlay.id = 'subDetailOverlay';
            overlay.innerHTML = '<div class="sub-detail-modal">' +
                '<div class="sub-detail-header"><h3 class="sub-detail-title">Solicitud de Suscripción</h3><button class="sub-detail-close" onclick="window._closeSubDetail()">✕</button></div>' +
                '<div class="sub-detail-body" id="subDetailBody"></div>' +
                '</div>';
            document.body.appendChild(overlay);

            overlay.addEventListener('click', function (e) {
                if (e.target === this) window._closeSubDetail();
            });
        }

        var nombre = s.usuario_nombre || 'Sin nombre';
        var inicial = nombre.charAt(0).toUpperCase();
        var planName = s.planes ? s.planes.nombre : 'Plan eliminado';
        var planPrecio = s.planes ? K.formatPrice(s.planes.precio) : '$0';
        var duracion = s.planes ? s.planes.duracion_dias : 30;
        var fecha = new Date(s.created_at).toLocaleDateString('es-ES', {
            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        var body = document.getElementById('subDetailBody');
        var h = '';

        /* Usuario */
        h += '<div class="sub-detail-user">';
        h += '<div class="sub-detail-avatar">' + inicial + '</div>';
        h += '<div class="sub-detail-user-info">';
        h += '<div class="sub-detail-user-name">' + nombre + '</div>';
        h += '<div class="sub-detail-user-email">' + (s.usuario_email || '') + '</div>';
        h += '</div></div>';

        /* Info grid */
        h += '<div class="sub-detail-info-grid">';
        h += '<div class="sub-detail-info-item"><div class="sub-detail-info-label">Plan</div><div class="sub-detail-info-value">' + planName + '</div></div>';
        h += '<div class="sub-detail-info-item"><div class="sub-detail-info-label">Precio</div><div class="sub-detail-info-value">' + planPrecio + '</div></div>';
        h += '<div class="sub-detail-info-item"><div class="sub-detail-info-label">Duración</div><div class="sub-detail-info-value">' + duracion + ' días</div></div>';
        h += '<div class="sub-detail-info-item"><div class="sub-detail-info-label">Fecha solicitud</div><div class="sub-detail-info-value" style="font-size:.78rem;">' + fecha + '</div></div>';
        h += '</div>';

        /* Comprobante */
        if (s.comprobante_url) {
            h += '<div class="sub-detail-comprobante">';
            h += '<div class="sub-detail-comprobante-label">Comprobante de pago</div>';
            h += '<img class="sub-detail-comprobante-img" src="' + s.comprobante_url + '" alt="Comprobante" onclick="window.open(\'' + s.comprobante_url + '\',\'_blank\')">';
            h += '</div>';
        }

        /* Botones */
        h += '<div class="sub-detail-actions">';
        h += '<button class="btn-confirm-purchase" onclick="window._confirmSub(\'' + s.id + '\',\'' + s.usuario_id + '\',\'' + s.plan_id + '\',' + duracion + ')">✅ Confirmar</button>';
        h += '<button class="btn-reject-purchase" onclick="window._rejectSub(\'' + s.id + '\')">❌ Rechazar</button>';
        h += '</div>';

        body.innerHTML = h;
        overlay.classList.add('show');
    };

    window._closeSubDetail = function () {
        var overlay = document.getElementById('subDetailOverlay');
        if (overlay) overlay.classList.remove('show');
    };

    /* ══════════════════════════════════════════
       ✅ CONFIRMAR SUSCRIPCIÓN
       ══════════════════════════════════════════ */
    window._confirmSub = async function (subId, userId, planId, duracion) {
        if (!confirm('¿Confirmar esta suscripción? El usuario tendrá acceso por ' + duracion + ' días.')) return;

        try {
            var ahora = new Date();
            var fin = new Date(ahora.getTime() + duracion * 24 * 60 * 60 * 1000);

            var upd = await db.from('suscripciones').update({
                estado: 'activa',
                fecha_inicio: ahora.toISOString(),
                fecha_fin: fin.toISOString()
            }).eq('id', subId);

            if (upd.error) throw upd.error;

            K.showToast('¡Suscripción confirmada! El usuario ya tiene acceso', 'success');
            window._closeSubDetail();
            loadSubSolicitudes();
        } catch (e) {
            K.showToast('Error: ' + e.message, 'error');
        }
    };

    /* ══════════════════════════════════════════
       ❌ RECHAZAR SUSCRIPCIÓN
       ══════════════════════════════════════════ */
    window._rejectSub = async function (subId) {
        if (!confirm('¿Rechazar esta solicitud?')) return;

        try {
            var upd = await db.from('suscripciones').update({
                estado: 'cancelada'
            }).eq('id', subId);

            if (upd.error) throw upd.error;

            K.showToast('Solicitud rechazada', 'success');
            window._closeSubDetail();
            loadSubSolicitudes();
        } catch (e) {
            K.showToast('Error: ' + e.message, 'error');
        }
    };

})();