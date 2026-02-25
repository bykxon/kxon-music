/* ============================================
   🎫 DASHBOARD-PLANES.JS — KXON 2026 REBUILD
   Panel de planes, suscripción, admin gestión
   Namespace: kx-plan-*
   escapeHtml + event delegation + ARIA
   ============================================ */
(function () {
    'use strict';

    var db = window.db;
    var K = window.KXON;

    var allPlanes = [];
    var allSubSolicitudes = [];
    var currentSubPlan = null;
    var selectedSubCompFile = null;

    /* ═══ UTILS ═══ */
    function esc(str) {
        if (!str) return '';
        var d = document.createElement('div');
        d.appendChild(document.createTextNode(str));
        return d.innerHTML;
    }

    function formatDate(dateStr, opts) {
        if (!dateStr) return '—';
        try {
            return new Date(dateStr).toLocaleDateString('es-ES', opts || {
                day: 'numeric', month: 'short'
            });
        } catch (e) { return '—'; }
    }

    function formatDateLong(dateStr) {
        return formatDate(dateStr, {
            day: 'numeric', month: 'long', year: 'numeric'
        });
    }

    function formatDateFull(dateStr) {
        return formatDate(dateStr, {
            day: 'numeric', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    function daysRemaining(dateStr) {
        if (!dateStr) return 0;
        var now = new Date();
        var end = new Date(dateStr);
        var diff = end - now;
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    /* ═══ HELPER: ENVIAR EMAIL AL EMBAJADOR ═══ */
    async function sendEmbajadorEmail(refCode, userId, subId, planNombre) {
        try {
            var embForEmail = await db.from('embajadores')
                .select('usuario_email, usuario_nombre, nivel, total_suscritos')
                .eq('codigo', refCode)
                .single();

            if (embForEmail.data && typeof K.sendReferidoEmail === 'function') {
                var userProfile = await db.from('profiles')
                    .select('full_name')
                    .eq('id', userId)
                    .single();

                var refNombre = userProfile.data ? userProfile.data.full_name : 'Usuario';
                var refEmail = '';

                // Get email from suscripcion
                var subData = await db.from('suscripciones')
                    .select('usuario_email')
                    .eq('id', subId)
                    .single();
                if (subData.data) refEmail = subData.data.usuario_email;

                K.sendReferidoEmail(
                    embForEmail.data.usuario_email,
                    embForEmail.data.usuario_nombre,
                    refNombre,
                    refEmail,
                    planNombre,
                    embForEmail.data.nivel,
                    embForEmail.data.total_suscritos
                );
            }
        } catch (emailErr) {
            console.warn('Error sending referral email:', emailErr);
        }
    }

    /* ═══ ALL FEATURES CONFIG ═══ */
    var allFeatures = [
        { key: 'albumes',        label: 'Álbumes completos',  icon: '💿' },
        { key: 'canciones',      label: 'Todas las canciones', icon: '🎵' },
        { key: 'radio',          label: 'Radio KXON',         icon: '📻' },
        { key: 'videos',         label: 'Videos exclusivos',  icon: '🎬' },
        { key: 'documentales',   label: 'Documentales',       icon: '🎞️' },
        { key: 'playlists',      label: 'Playlists',          icon: '🎶' },
        { key: 'envivo',         label: 'En Vivo',            icon: '🔴' },
        { key: 'chat',           label: 'Chat',               icon: '💬' },
        { key: 'solicitar-beat', label: 'Solicitar Beat',     icon: '📋' },
        { key: 'historial',      label: 'Historial',          icon: '📊' },
        { key: 'favoritos',      label: 'Favoritos',          icon: '❤️' },
        { key: 'marketplace',    label: 'Marketplace',        icon: '🛒' }
    ];

    /* ═══ ACCESOS CONFIG (for admin edit) ═══ */
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

    /* ══════════════════════════════════════════
       🎫 LOAD PLANES
       ══════════════════════════════════════════ */
    K.loadPlanes = async function () {
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

            renderKPIs(pendingSub);
            renderStatusBanner(pendingSub);
            renderPlanes(pendingSub);

            if (K.isAdmin) loadSubSolicitudes();
        } catch (e) {
            console.error('Error cargando planes:', e);
            renderError();
        }
    };

    /* ═══ RENDER KPIs ═══ */
    function renderKPIs(pendingSub) {
        document.getElementById('planStatTotal').textContent = allPlanes.length;

        if (K.isAdmin) {
            document.getElementById('planStatActive').textContent = 'Admin';
            document.getElementById('planStatDays').textContent = '∞';
        } else if (K.userSubscription) {
            var planName = '—';
            for (var i = 0; i < allPlanes.length; i++) {
                if (allPlanes[i].id === K.userSubscription.plan_id) {
                    planName = allPlanes[i].nombre;
                    break;
                }
            }
            document.getElementById('planStatActive').textContent = planName;
            var days = daysRemaining(K.userSubscription.fecha_fin);
            document.getElementById('planStatDays').textContent = days + 'd';
        } else if (pendingSub) {
            document.getElementById('planStatActive').textContent = 'Pendiente';
            document.getElementById('planStatDays').textContent = '—';
        } else {
            document.getElementById('planStatActive').textContent = 'Ninguno';
            document.getElementById('planStatDays').textContent = '—';
        }
    }

    /* ═══ RENDER STATUS BANNER ═══ */
    function renderStatusBanner(pendingSub) {
        var banner = document.getElementById('planStatusBanner');
        var iconEl = document.getElementById('planStatusIcon');
        var titleEl = document.getElementById('planStatusTitle');
        var textEl = document.getElementById('planStatusText');
        var badgeEl = document.getElementById('planStatusBadge');

        // Reset classes
        banner.className = 'kx-plan-status-banner';
        badgeEl.className = 'kx-plan-status-badge';

        if (K.isAdmin) {
            banner.style.display = 'flex';
            banner.classList.add('kx-plan-status-banner--admin');
            iconEl.textContent = '👑';
            titleEl.textContent = 'Acceso Administrativo';
            textEl.textContent = 'Tienes acceso total a toda la plataforma como administrador.';
            badgeEl.textContent = 'ADMIN';
            badgeEl.classList.add('kx-plan-status-badge--admin');
        } else if (K.userSubscription) {
            banner.style.display = 'flex';
            banner.classList.add('kx-plan-status-banner--active');
            iconEl.textContent = '✅';
            var planName = '—';
            for (var i = 0; i < allPlanes.length; i++) {
                if (allPlanes[i].id === K.userSubscription.plan_id) {
                    planName = allPlanes[i].nombre;
                    break;
                }
            }
            var days = daysRemaining(K.userSubscription.fecha_fin);
            titleEl.textContent = esc(planName) + ' — Activo';
            textEl.textContent = 'Tu suscripción vence el ' + formatDateLong(K.userSubscription.fecha_fin) + ' (' + days + ' días restantes).';
            badgeEl.textContent = 'ACTIVO';
            badgeEl.classList.add('kx-plan-status-badge--active');
        } else if (pendingSub) {
            banner.style.display = 'flex';
            banner.classList.add('kx-plan-status-banner--pending');
            iconEl.textContent = '⏳';
            var pName = pendingSub.planes ? pendingSub.planes.nombre : 'Plan';
            titleEl.textContent = 'Solicitud Pendiente';
            textEl.textContent = 'Tu solicitud para el ' + esc(pName) + ' está siendo revisada por el administrador.';
            badgeEl.textContent = 'PENDIENTE';
            badgeEl.classList.add('kx-plan-status-badge--pending');
        } else {
            banner.style.display = 'none';
        }
    }

    /* ═══ RENDER PLANES ═══ */
    function renderPlanes(pendingSub) {
        var c = document.getElementById('planesGrid');

        if (!allPlanes.length) {
            c.innerHTML =
                '<div class="kx-plan-empty">' +
                    '<div class="kx-plan-empty-icon">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M6 3h12l4 6-10 13L2 9Z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/></svg>' +
                    '</div>' +
                    '<div class="kx-plan-empty-title">Sin planes disponibles</div>' +
                    '<div class="kx-plan-empty-text">No hay planes de suscripción configurados aún.</div>' +
                '</div>';
            return;
        }

        var h = '';
        for (var i = 0; i < allPlanes.length; i++) {
            var plan = allPlanes[i];
            var isPremium = plan.orden === 2 || (plan.nombre || '').toLowerCase().indexOf('premium') >= 0;
            var isActivePlan = K.userSubscription && K.userSubscription.plan_id === plan.id;
            var isPending = pendingSub && pendingSub.plan_id === plan.id;
            var accesos = plan.accesos || [];

            // Card classes
            var cardClass = 'kx-plan-card';
            if (isPremium) cardClass += ' kx-plan-card--premium';
            if (isActivePlan) cardClass += ' kx-plan-card--active';
            cardClass += ' kx-observed';

            h += '<article class="' + cardClass + '" role="listitem" style="--i:' + i + ';" data-plan-id="' + esc(plan.id) + '">';

            // Ambient bg
            h += '<div class="kx-plan-card-ambient" aria-hidden="true"></div>';

            // Admin edit button
            if (K.isAdmin) {
                h += '<button class="kx-plan-edit-btn" data-action="edit-plan" data-plan-id="' + esc(plan.id) + '" title="Editar plan" aria-label="Editar plan">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
                     '</button>';
            }

            // Badge
            if (isActivePlan) {
                h += '<span class="kx-plan-badge kx-plan-badge--active">✓ Activo</span>';
            } else if (isPremium) {
                h += '<span class="kx-plan-badge kx-plan-badge--premium">⭐ Recomendado</span>';
            } else {
                h += '<span class="kx-plan-badge kx-plan-badge--basic">Básico</span>';
            }

            // Name
            h += '<h3 class="kx-plan-name">' + esc(plan.nombre) + '</h3>';

            // Price
            h += '<div class="kx-plan-price-wrap">';
            h += '<span class="kx-plan-price">' + esc(K.formatPrice(plan.precio)) + '</span>';
            h += '<span class="kx-plan-price-period">/ ' + esc(String(plan.duracion_dias)) + ' días</span>';
            h += '</div>';

            // Features
            h += '<div class="kx-plan-features" role="list" aria-label="Características del plan">';
            for (var f = 0; f < allFeatures.length; f++) {
                var feat = allFeatures[f];
                var hasAccess = accesos.indexOf(feat.key) >= 0;
                var featClass = 'kx-plan-feature' + (hasAccess ? '' : ' kx-plan-feature--disabled');
                h += '<div class="' + featClass + '" role="listitem">';
                if (hasAccess) {
                    h += '<span class="kx-plan-feature-check kx-plan-feature-check--yes" aria-hidden="true">' +
                            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>' +
                         '</span>';
                } else {
                    h += '<span class="kx-plan-feature-check kx-plan-feature-check--no" aria-hidden="true">' +
                            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>' +
                         '</span>';
                }
                h += '<span class="kx-plan-feature-text">' + esc(feat.icon + ' ' + feat.label) + '</span>';
                h += '</div>';
            }
            h += '</div>';

            // CTA
            if (K.isAdmin) {
                h += '<button class="kx-plan-cta kx-plan-cta--admin" disabled aria-disabled="true">👑 Admin — Acceso Total</button>';
            } else if (isActivePlan) {
                h += '<button class="kx-plan-cta kx-plan-cta--active" disabled aria-disabled="true">✓ Plan Activo</button>';
                var fechaFin = formatDateLong(K.userSubscription.fecha_fin);
                h += '<div class="kx-plan-expiry">Vence: ' + esc(fechaFin) + '</div>';
            } else if (isPending) {
                h += '<button class="kx-plan-cta kx-plan-cta--pending" disabled aria-disabled="true">⏳ Solicitud Pendiente</button>';
            } else {
                var ctaClass = isPremium ? 'kx-plan-cta kx-plan-cta--premium' : 'kx-plan-cta kx-plan-cta--subscribe';
                h += '<button class="' + ctaClass + '" data-action="subscribe" data-plan-id="' + esc(plan.id) + '">🎫 Suscribirse</button>';
            }

            h += '</article>';
        }

        c.innerHTML = h;
    }

    /* ═══ RENDER ERROR ═══ */
    function renderError() {
        var c = document.getElementById('planesGrid');
        c.innerHTML =
            '<div class="kx-plan-empty">' +
                '<div class="kx-plan-empty-icon">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>' +
                '</div>' +
                '<div class="kx-plan-empty-title">Error al cargar planes</div>' +
                '<div class="kx-plan-empty-text">Intenta recargar la página.</div>' +
            '</div>';
    }

    /* ══════════════════════════════════════════
       🎫 EVENT DELEGATION
       ══════════════════════════════════════════ */
    var panelEl = document.getElementById('panel-planes');
    if (panelEl) {
        panelEl.addEventListener('click', function (e) {
            var target = e.target;

            // Subscribe button
            var subBtn = target.closest('[data-action="subscribe"]');
            if (subBtn) {
                e.preventDefault();
                e.stopPropagation();
                var planId = subBtn.getAttribute('data-plan-id');
                if (planId) handleSubscribe(planId);
                return;
            }

            // Admin edit button
            var editBtn = target.closest('[data-action="edit-plan"]');
            if (editBtn) {
                e.preventDefault();
                e.stopPropagation();
                var planId2 = editBtn.getAttribute('data-plan-id');
                if (planId2) handleEditPlan(planId2);
                return;
            }

            // View solicitud detail
            var viewBtn = target.closest('[data-action="view-sol"]');
            if (viewBtn) {
                e.preventDefault();
                e.stopPropagation();
                var solIdx = parseInt(viewBtn.getAttribute('data-sol-index'), 10);
                if (!isNaN(solIdx)) viewSubDetail(solIdx);
                return;
            }
        });
    }

    /* ══════════════════════════════════════════
       🎫 SUBSCRIBE
       ══════════════════════════════════════════ */
    function handleSubscribe(planId) {
        var plan = null;
        for (var i = 0; i < allPlanes.length; i++) {
            if (allPlanes[i].id === planId) { plan = allPlanes[i]; break; }
        }
        if (!plan) return;
        currentSubPlan = plan;

        document.getElementById('subUser').textContent = K.currentUser.email;
        document.getElementById('subPlanName').textContent = plan.nombre;
        document.getElementById('subPlanPrice').textContent = K.formatPrice(plan.precio);
        document.getElementById('subPlanDuration').textContent = plan.duracion_dias + ' días';

        var waMsg = 'Hola KXON, quiero suscribirme al: ' + plan.nombre + ' (' + K.formatPrice(plan.precio) + ') - Mi email: ' + K.currentUser.email;
        document.getElementById('subBtnWhatsapp').href = 'https://wa.me/573184530020?text=' + encodeURIComponent(waMsg);

        selectedSubCompFile = null;
        var areaEl = document.getElementById('subCompArea');
        if (areaEl) {
            areaEl.classList.remove('has-file');
            var textEl = areaEl.querySelector('.file-upload-text');
            if (textEl) textEl.textContent = 'Click para subir comprobante';
        }
        var prevEl = document.getElementById('subCompPreview');
        if (prevEl) prevEl.classList.remove('show');
        var fileEl = document.getElementById('subCompFile');
        if (fileEl) fileEl.value = '';

        document.getElementById('subOverlay').classList.add('show');
    }

    /* ── Comprobante file ── */
    var subCompFileEl = document.getElementById('subCompFile');
    if (subCompFileEl) {
        subCompFileEl.addEventListener('change', function (e) {
            var f = e.target.files[0];
            if (!f) return;
            selectedSubCompFile = f;
            var area = document.getElementById('subCompArea');
            if (area) {
                area.classList.add('has-file');
                var txt = area.querySelector('.file-upload-text');
                if (txt) txt.textContent = f.name;
            }
            var rd = new FileReader();
            rd.onload = function (ev) {
                var img = document.getElementById('subCompImg');
                if (img) img.src = ev.target.result;
                var prev = document.getElementById('subCompPreview');
                if (prev) prev.classList.add('show');
            };
            rd.readAsDataURL(f);
        });
    }

    /* ── Send subscription ── */
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

    var subOverlayEl = document.getElementById('subOverlay');
    if (subOverlayEl) {
        subOverlayEl.addEventListener('click', function (e) {
            if (e.target === this) window._closeSubModal();
        });
    }

    /* ══════════════════════════════════════════
       🔧 ADMIN: EDIT PLAN
       ══════════════════════════════════════════ */
    function handleEditPlan(planId) {
        var plan = null;
        for (var i = 0; i < allPlanes.length; i++) {
            if (allPlanes[i].id === planId) { plan = allPlanes[i]; break; }
        }
        if (!plan) return;

        document.getElementById('editPlanId').value = plan.id;
        document.getElementById('editPlanNombre').value = plan.nombre || '';
        document.getElementById('editPlanPrecio').value = plan.precio || 0;
        document.getElementById('editPlanDuracion').value = plan.duracion_dias || 30;
        document.getElementById('editPlanOrden').value = plan.orden || 1;

        var accesos = plan.accesos || [];
        for (var i2 = 0; i2 < allAccesosConfig.length; i2++) {
            var cb = document.getElementById(allAccesosConfig[i2].id);
            if (cb) cb.checked = accesos.indexOf(allAccesosConfig[i2].key) >= 0;
        }

        document.getElementById('modalEditPlan').classList.add('show');
    }

    // Keep these as window globals for the modal buttons
    window._editPlan = handleEditPlan;

    window._closeEditPlan = function () {
        document.getElementById('modalEditPlan').classList.remove('show');
    };

    var modalEditEl = document.getElementById('modalEditPlan');
    if (modalEditEl) {
        modalEditEl.addEventListener('click', function (e) {
            if (e.target === this) window._closeEditPlan();
        });
    }

    var formEditEl = document.getElementById('formEditPlan');
    if (formEditEl) {
        formEditEl.addEventListener('submit', async function (e) {
            e.preventDefault();

            var planId = document.getElementById('editPlanId').value;
            var nombre = document.getElementById('editPlanNombre').value.trim();
            var precio = parseInt(document.getElementById('editPlanPrecio').value) || 0;
            var duracion = parseInt(document.getElementById('editPlanDuracion').value) || 30;
            var orden = parseInt(document.getElementById('editPlanOrden').value) || 1;

            if (!nombre) { K.showToast('Ingresa un nombre', 'error'); return; }

            var accesos = [];
            for (var i = 0; i < allAccesosConfig.length; i++) {
                var cb = document.getElementById(allAccesosConfig[i].id);
                if (cb && cb.checked) accesos.push(allAccesosConfig[i].key);
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
    }

    /* ══════════════════════════════════════════
       📋 ADMIN: SOLICITUDES
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
            var countEl = document.getElementById('planSolCount');

            if (countEl) countEl.textContent = allSubSolicitudes.length + ' pendientes';

            if (!allSubSolicitudes.length) {
                c.innerHTML =
                    '<div class="kx-plan-sol-empty">' +
                        '<div class="kx-plan-sol-empty-icon">✅</div>' +
                        '<div class="kx-plan-sol-empty-title">Sin solicitudes pendientes</div>' +
                        '<div class="kx-plan-sol-empty-text">Todas las solicitudes han sido procesadas.</div>' +
                    '</div>';
                return;
            }

            var h = '';
            for (var i = 0; i < allSubSolicitudes.length; i++) {
                var s = allSubSolicitudes[i];
                var nombre = s.usuario_nombre || 'Sin nombre';
                var inicial = esc(nombre.charAt(0).toUpperCase());
                var planName = s.planes ? s.planes.nombre : 'Plan';
                var isPrem = (planName || '').toLowerCase().indexOf('premium') >= 0;
                var fecha = formatDate(s.created_at);

                h += '<div class="kx-plan-sol-item" role="listitem">';
                h += '<div class="kx-plan-sol-avatar">' + inicial + '</div>';
                h += '<div class="kx-plan-sol-info">';
                h += '<div class="kx-plan-sol-name">' + esc(nombre) + '</div>';
                h += '<div class="kx-plan-sol-meta">';
                h += '<span class="kx-plan-sol-plan-badge' + (isPrem ? ' kx-plan-sol-plan-badge--premium' : '') + '">' + esc(planName) + '</span>';
                h += '<span>' + esc(s.usuario_email || '') + '</span>';
                h += '</div></div>';
                h += '<span class="kx-plan-sol-date">' + esc(fecha) + '</span>';
                h += '<button class="kx-plan-sol-view" data-action="view-sol" data-sol-index="' + i + '" title="Ver detalle" aria-label="Ver detalle de solicitud de ' + esc(nombre) + '">';
                h += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
                h += '</button>';
                h += '</div>';
            }

            c.innerHTML = h;
        } catch (e) {
            console.error('Error cargando solicitudes sub:', e);
        }
    }

    /* ══════════════════════════════════════════
       👁 VIEW SOLICITUD DETAIL (MODAL)
       ══════════════════════════════════════════ */
    function viewSubDetail(idx) {
        var s = allSubSolicitudes[idx];
        if (!s) return;

        var overlay = document.getElementById('subDetailOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'sub-detail-overlay';
            overlay.id = 'subDetailOverlay';
            overlay.innerHTML =
                '<div class="sub-detail-modal">' +
                    '<div class="sub-detail-header">' +
                        '<h3 class="sub-detail-title">Solicitud de Suscripción</h3>' +
                        '<button class="sub-detail-close" id="subDetailCloseBtn" aria-label="Cerrar">✕</button>' +
                    '</div>' +
                    '<div class="sub-detail-body" id="subDetailBody"></div>' +
                '</div>';
            document.body.appendChild(overlay);

            overlay.addEventListener('click', function (e) {
                if (e.target === overlay) closeSubDetail();
            });

            // Delegate close button
            overlay.addEventListener('click', function (e) {
                if (e.target.closest('#subDetailCloseBtn')) closeSubDetail();
            });

            // Delegate confirm/reject
            overlay.addEventListener('click', function (e) {
                var confirmBtn = e.target.closest('[data-action="confirm-sub"]');
                if (confirmBtn) {
                    var subId = confirmBtn.getAttribute('data-sub-id');
                    var userId = confirmBtn.getAttribute('data-user-id');
                    var planId = confirmBtn.getAttribute('data-plan-id');
                    var dur = parseInt(confirmBtn.getAttribute('data-dur'), 10);
                    confirmSub(subId, userId, planId, dur);
                    return;
                }
                var rejectBtn = e.target.closest('[data-action="reject-sub"]');
                if (rejectBtn) {
                    var subId2 = rejectBtn.getAttribute('data-sub-id');
                    rejectSub(subId2);
                    return;
                }
            });
        }

        var nombre = s.usuario_nombre || 'Sin nombre';
        var inicial = esc(nombre.charAt(0).toUpperCase());
        var planName = s.planes ? s.planes.nombre : 'Plan eliminado';
        var planPrecio = s.planes ? K.formatPrice(s.planes.precio) : '$0';
        var duracion = s.planes ? s.planes.duracion_dias : 30;
        var fecha = formatDateFull(s.created_at);

        var body = document.getElementById('subDetailBody');
        var h = '';

        h += '<div class="sub-detail-user">';
        h += '<div class="sub-detail-avatar">' + inicial + '</div>';
        h += '<div class="sub-detail-user-info">';
        h += '<div class="sub-detail-user-name">' + esc(nombre) + '</div>';
        h += '<div class="sub-detail-user-email">' + esc(s.usuario_email || '') + '</div>';
        h += '</div></div>';

        h += '<div class="sub-detail-info-grid">';
        h += '<div class="sub-detail-info-item"><div class="sub-detail-info-label">Plan</div><div class="sub-detail-info-value">' + esc(planName) + '</div></div>';
        h += '<div class="sub-detail-info-item"><div class="sub-detail-info-label">Precio</div><div class="sub-detail-info-value">' + esc(planPrecio) + '</div></div>';
        h += '<div class="sub-detail-info-item"><div class="sub-detail-info-label">Duración</div><div class="sub-detail-info-value">' + esc(String(duracion)) + ' días</div></div>';
        h += '<div class="sub-detail-info-item"><div class="sub-detail-info-label">Fecha solicitud</div><div class="sub-detail-info-value" style="font-size:.78rem;">' + esc(fecha) + '</div></div>';
        h += '</div>';

        if (s.comprobante_url) {
            h += '<div class="sub-detail-comprobante">';
            h += '<div class="sub-detail-comprobante-label">Comprobante de pago</div>';
            h += '<img class="sub-detail-comprobante-img" src="' + esc(s.comprobante_url) + '" alt="Comprobante de pago" loading="lazy">';
            h += '</div>';
        }

        h += '<div class="sub-detail-actions">';
        h += '<button class="btn-confirm-purchase" data-action="confirm-sub" data-sub-id="' + esc(s.id) + '" data-user-id="' + esc(s.usuario_id) + '" data-plan-id="' + esc(s.plan_id) + '" data-dur="' + duracion + '">✅ Confirmar</button>';
        h += '<button class="btn-reject-purchase" data-action="reject-sub" data-sub-id="' + esc(s.id) + '">❌ Rechazar</button>';
        h += '</div>';

        body.innerHTML = h;

        // Comprobante click to open in new tab
        var compImg = body.querySelector('.sub-detail-comprobante-img');
        if (compImg) {
            compImg.style.cursor = 'pointer';
            compImg.addEventListener('click', function () {
                window.open(s.comprobante_url, '_blank');
            });
        }

        overlay.classList.add('show');
    }

    function closeSubDetail() {
        var overlay = document.getElementById('subDetailOverlay');
        if (overlay) overlay.classList.remove('show');
    }

    // Keep as window global for backward compat
    window._viewSubDetail = viewSubDetail;
    window._closeSubDetail = closeSubDetail;

    /* ══════════════════════════════════════════
       ✅ CONFIRM SUBSCRIPTION — WITH REFERRAL PROCESSING
       ══════════════════════════════════════════ */
    async function confirmSub(subId, userId, planId, duracion) {
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

            // ═══ PROCESS REFERRAL ═══
            try {
                // Get user's profile to check if they were referred
                var profileResult = await db.from('profiles')
                    .select('referido_por')
                    .eq('id', userId)
                    .single();

                if (profileResult.data && profileResult.data.referido_por) {
                    var refCode = profileResult.data.referido_por;

                    // Get plan name for the referral record
                    var planResult = await db.from('planes')
                        .select('nombre')
                        .eq('id', planId)
                        .single();

                    var planNombre = planResult.data ? planResult.data.nombre : 'Plan';

                    // Try using the DB function first
                    var rpcResult = await db.rpc('procesar_referido_suscripcion', {
                        p_user_id: userId,
                        p_suscripcion_id: subId,
                        p_plan_nombre: planNombre
                    });

                    if (rpcResult.error) {
                        // Fallback: process manually
                        console.warn('RPC failed, processing manually:', rpcResult.error);

                        // Find ambassador
                        var embResult = await db.from('embajadores')
                            .select('id, nivel, total_suscritos, comision_acumulada')
                            .eq('codigo', refCode)
                            .eq('estado', 'activo')
                            .single();

                        if (embResult.data) {
                            var emb = embResult.data;
                            var nivelInfo = { activador: 3000, constructor: 0, lider: 0 };
                            var comision = nivelInfo[emb.nivel] || 1000;

                            // Update referido record
                            await db.from('referidos').update({
                                estado: 'suscrito',
                                suscripcion_id: subId,
                                plan_nombre: planNombre,
                                comision_generada: comision,
                                fecha_suscripcion: ahora.toISOString()
                            })
                            .eq('embajador_codigo', refCode)
                            .eq('referido_user_id', userId)
                            .eq('estado', 'registrado');

                            // Update ambassador counters
                            var newTotal = (emb.total_suscritos || 0) + 1;
                            var newComision = (emb.comision_acumulada || 0) + comision;

                            // Calculate new level
                            var nuevoNivel = 'activador';
                            if (newTotal >= 15) nuevoNivel = 'lider';
                            else if (newTotal >= 6) nuevoNivel = 'constructor';

                            await db.from('embajadores').update({
                                total_suscritos: newTotal,
                                comision_acumulada: newComision,
                                nivel: nuevoNivel,
                                updated_at: ahora.toISOString()
                            }).eq('id', emb.id);

                            console.log('✅ Referral processed (manual): ambassador ' + refCode + ' gets ' + comision + ' COP');

                            // Enviar email al embajador (fallback manual)
                            await sendEmbajadorEmail(refCode, userId, subId, planNombre);
                        }
                    } else {
                        console.log('✅ Referral processed via RPC for code:', refCode);

                        // Enviar email al embajador (RPC exitoso)
                        await sendEmbajadorEmail(refCode, userId, subId, planNombre);
                    }
                }
            } catch (refError) {
                // Don't fail the whole subscription just because referral processing failed
                console.error('Error processing referral (non-critical):', refError);
            }

            K.showToast('¡Suscripción confirmada! El usuario ya tiene acceso', 'success');
            closeSubDetail();
            loadSubSolicitudes();
        } catch (e) {
            K.showToast('Error: ' + e.message, 'error');
        }
    }

    window._confirmSub = confirmSub;

    /* ══════════════════════════════════════════
       ❌ REJECT SUBSCRIPTION
       ══════════════════════════════════════════ */
    async function rejectSub(subId) {
        if (!confirm('¿Rechazar esta solicitud?')) return;

        try {
            var upd = await db.from('suscripciones').update({
                estado: 'cancelada'
            }).eq('id', subId);

            if (upd.error) throw upd.error;

            K.showToast('Solicitud rechazada', 'success');
            closeSubDetail();
            loadSubSolicitudes();
        } catch (e) {
            K.showToast('Error: ' + e.message, 'error');
        }
    }

    window._rejectSub = rejectSub;

})();