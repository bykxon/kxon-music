/* ============================================
   🎫 DASHBOARD-PLANES.JS — KXON 2026
   Panel de planes, suscripción, admin gestión
   ============================================ */
(function () {
    'use strict';

    function getDB() { return window.db; }
    function getK() { return window.KXON; }

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
            return new Date(dateStr).toLocaleDateString('es-ES', opts || { day: 'numeric', month: 'short' });
        } catch (e) { return '—'; }
    }

    function formatDateLong(dateStr) {
        return formatDate(dateStr, { day: 'numeric', month: 'long', year: 'numeric' });
    }

    function formatDateFull(dateStr) {
        return formatDate(dateStr, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    function daysRemaining(dateStr) {
        if (!dateStr) return 0;
        return Math.max(0, Math.ceil((new Date(dateStr) - new Date()) / 86400000));
    }

    function safeFormatPrice(precio) {
        var K = getK();
        if (K && typeof K.formatPrice === 'function') return K.formatPrice(precio);
        return '$' + Number(precio || 0).toLocaleString('es-CO');
    }

    function safeShowToast(msg, type) {
        var K = getK();
        if (K && typeof K.showToast === 'function') K.showToast(msg, type);
        else console.log('[Toast ' + type + ']:', msg);
    }

    /* ═══ FEATURES CONFIG ═══ */
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

    var allAccesosConfig = [
        { id: 'editAccAlbumes', key: 'albumes' },
        { id: 'editAccCanciones', key: 'canciones' },
        { id: 'editAccRadio', key: 'radio' },
        { id: 'editAccVideos', key: 'videos' },
        { id: 'editAccDocumentales', key: 'documentales' },
        { id: 'editAccPlaylists', key: 'playlists' },
        { id: 'editAccEnvivo', key: 'envivo' },
        { id: 'editAccChat', key: 'chat' },
        { id: 'editAccSolicitarBeat', key: 'solicitar-beat' },
        { id: 'editAccHistorial', key: 'historial' },
        { id: 'editAccFavoritos', key: 'favoritos' },
        { id: 'editAccMarketplace', key: 'marketplace' }
    ];

    /* ═══ EMAIL HELPER ═══ */
    async function sendEmbajadorEmail(refCode, userId, subId, planNombre) {
        var db = getDB();
        var K = getK();
        if (!db || !K) return;
        try {
            var embForEmail = await db.from('embajadores').select('usuario_email, usuario_nombre, nivel, total_suscritos').eq('codigo', refCode).single();
            if (embForEmail.data && typeof K.sendReferidoEmail === 'function') {
                var userProfile = await db.from('profiles').select('full_name').eq('id', userId).single();
                var refNombre = userProfile.data ? userProfile.data.full_name : 'Usuario';
                var refEmail = '';
                var subData = await db.from('suscripciones').select('usuario_email').eq('id', subId).single();
                if (subData.data) refEmail = subData.data.usuario_email;
                K.sendReferidoEmail(embForEmail.data.usuario_email, embForEmail.data.usuario_nombre, refNombre, refEmail, planNombre, embForEmail.data.nivel, embForEmail.data.total_suscritos);
            }
        } catch (e) {
            console.warn('Error sending referral email:', e);
        }
    }

    /* ══════════════════════════════════════════
       🎫 LOAD PLANES
       ══════════════════════════════════════════ */
    function defineLoadPlanes() {
        var K = getK();
        if (!K) {
            console.warn('[Planes] Esperando KXON... reintentando');
            setTimeout(defineLoadPlanes, 200);
            return;
        }

        K.loadPlanes = async function () {
            var db = getDB();
            var K = getK();

            if (!db || !K || !K.currentUser) {
                console.error('[Planes] Dependencias no disponibles');
                renderError();
                return;
            }

            console.log('[Planes] Cargando planes...');

            try {
                var r = await db.from('planes')
                    .select('*')
                    .eq('activo', true)
                    .order('orden', { ascending: true });

                if (r.error) {
                    console.error('[Planes] Error Supabase:', r.error);
                    throw r.error;
                }

                allPlanes = r.data || [];
                console.log('[Planes] Encontrados:', allPlanes.length, 'planes');

                var pendingSub = null;
                if (!K.isAdmin) {
                    try {
                        var ps = await db.from('suscripciones')
                            .select('*, planes(nombre)')
                            .eq('usuario_id', K.currentUser.id)
                            .eq('estado', 'pendiente')
                            .limit(1);
                        if (ps.data && ps.data.length > 0) pendingSub = ps.data[0];
                    } catch (e) {
                        console.warn('[Planes] Error checking pending:', e);
                    }
                }

                renderKPIs(K, pendingSub);
                renderStatusBanner(K, pendingSub);
                renderPlanes(K, pendingSub);

                if (K.isAdmin) loadSubSolicitudes();

            } catch (e) {
                console.error('[Planes] Error cargando:', e);
                renderError();
            }
        };

        console.log('[Planes] ✅ K.loadPlanes registrado');
    }

    /* ═══ RENDER KPIs ═══ */
    function renderKPIs(K, pendingSub) {
        var el1 = document.getElementById('planStatTotal');
        var el2 = document.getElementById('planStatActive');
        var el3 = document.getElementById('planStatDays');

        if (el1) el1.textContent = allPlanes.length;

        if (K.isAdmin) {
            if (el2) el2.textContent = 'Admin';
            if (el3) el3.textContent = '∞';
        } else if (K.userSubscription) {
            var pn = '—';
            for (var i = 0; i < allPlanes.length; i++) {
                if (allPlanes[i].id === K.userSubscription.plan_id) {
                    pn = allPlanes[i].nombre;
                    break;
                }
            }
            if (el2) el2.textContent = pn;
            if (el3) el3.textContent = daysRemaining(K.userSubscription.fecha_fin) + 'd';
        } else if (pendingSub) {
            if (el2) el2.textContent = 'Pendiente';
            if (el3) el3.textContent = '—';
        } else {
            if (el2) el2.textContent = 'Ninguno';
            if (el3) el3.textContent = '—';
        }
    }

    /* ═══ RENDER STATUS BANNER ═══ */
    function renderStatusBanner(K, pendingSub) {
        var banner = document.getElementById('planStatusBanner');
        var iconEl = document.getElementById('planStatusIcon');
        var titleEl = document.getElementById('planStatusTitle');
        var textEl = document.getElementById('planStatusText');
        var badgeEl = document.getElementById('planStatusBadge');

        if (!banner || !iconEl || !titleEl || !textEl || !badgeEl) return;

        banner.className = 'kx-plan-status-banner';
        badgeEl.className = 'kx-plan-status-badge';

        if (K.isAdmin) {
            banner.style.display = 'flex';
            banner.classList.add('kx-plan-status-banner--admin');
            iconEl.textContent = '👑';
            titleEl.textContent = 'Acceso Administrativo';
            textEl.textContent = 'Tienes acceso total a toda la plataforma.';
            badgeEl.textContent = 'ADMIN';
            badgeEl.classList.add('kx-plan-status-badge--admin');
        } else if (K.userSubscription) {
            banner.style.display = 'flex';
            banner.classList.add('kx-plan-status-banner--active');
            iconEl.textContent = '✅';
            var pn = '—';
            for (var i = 0; i < allPlanes.length; i++) {
                if (allPlanes[i].id === K.userSubscription.plan_id) {
                    pn = allPlanes[i].nombre;
                    break;
                }
            }
            var days = daysRemaining(K.userSubscription.fecha_fin);
            titleEl.textContent = pn + ' — Activo';
            textEl.textContent = 'Vence el ' + formatDateLong(K.userSubscription.fecha_fin) + ' (' + days + ' días restantes).';
            badgeEl.textContent = 'ACTIVO';
            badgeEl.classList.add('kx-plan-status-badge--active');
        } else if (pendingSub) {
            banner.style.display = 'flex';
            banner.classList.add('kx-plan-status-banner--pending');
            iconEl.textContent = '⏳';
            var pName = pendingSub.planes ? pendingSub.planes.nombre : 'Plan';
            titleEl.textContent = 'Solicitud Pendiente';
            textEl.textContent = 'Tu solicitud para el ' + pName + ' está siendo revisada.';
            badgeEl.textContent = 'PENDIENTE';
            badgeEl.classList.add('kx-plan-status-badge--pending');
        } else {
            banner.style.display = 'none';
        }
    }

    /* ═══ RENDER PLANES ═══ */
    function renderPlanes(K, pendingSub) {
        var c = document.getElementById('planesGrid');
        if (!c) {
            console.error('[Planes] #planesGrid no encontrado');
            return;
        }

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

            var cardClass = 'kx-plan-card';
            if (isPremium) cardClass += ' kx-plan-card--premium';
            if (isActivePlan) cardClass += ' kx-plan-card--active';
            cardClass += ' kx-observed';

            h += '<article class="' + cardClass + '" role="listitem" style="--i:' + i + ';" data-plan-id="' + esc(plan.id) + '">';
            h += '<div class="kx-plan-card-ambient" aria-hidden="true"></div>';

            // Admin edit button
            if (K.isAdmin) {
                h += '<button class="kx-plan-edit-btn" data-action="edit-plan" data-plan-id="' + esc(plan.id) + '" title="Editar plan">';
                h += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
                h += '</button>';
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
            h += '<span class="kx-plan-price">' + esc(safeFormatPrice(plan.precio)) + '</span>';
            h += '<span class="kx-plan-price-period">/ ' + esc(String(plan.duracion_dias)) + ' días</span>';
            h += '</div>';

            // Features
            h += '<div class="kx-plan-features" role="list">';
            for (var f = 0; f < allFeatures.length; f++) {
                var feat = allFeatures[f];
                var hasAccess = accesos.indexOf(feat.key) >= 0;
                var featClass = 'kx-plan-feature' + (hasAccess ? '' : ' kx-plan-feature--disabled');

                h += '<div class="' + featClass + '" role="listitem">';
                if (hasAccess) {
                    h += '<span class="kx-plan-feature-check kx-plan-feature-check--yes" aria-hidden="true">';
                    h += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>';
                    h += '</span>';
                } else {
                    h += '<span class="kx-plan-feature-check kx-plan-feature-check--no" aria-hidden="true">';
                    h += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
                    h += '</span>';
                }
                h += '<span class="kx-plan-feature-text">' + esc(feat.icon + ' ' + feat.label) + '</span>';
                h += '</div>';
            }
            h += '</div>';

            // CTA Button
            if (K.isAdmin) {
                h += '<button class="kx-plan-cta kx-plan-cta--admin" disabled>👑 Admin — Acceso Total</button>';
            } else if (isActivePlan) {
                h += '<button class="kx-plan-cta kx-plan-cta--active" disabled>✓ Plan Activo</button>';
                h += '<div class="kx-plan-expiry">Vence: ' + esc(formatDateLong(K.userSubscription.fecha_fin)) + '</div>';
            } else if (isPending) {
                h += '<button class="kx-plan-cta kx-plan-cta--pending" disabled>⏳ Solicitud Pendiente</button>';
            } else {
                var ctaClass = isPremium ? 'kx-plan-cta kx-plan-cta--premium' : 'kx-plan-cta kx-plan-cta--subscribe';
                h += '<button class="' + ctaClass + '" data-action="subscribe" data-plan-id="' + esc(plan.id) + '">🎫 Suscribirse</button>';
            }

            h += '</article>';
        }

        c.innerHTML = h;
        console.log('[Planes] ✅ Renderizados', allPlanes.length, 'planes');
    }

    /* ═══ RENDER ERROR ═══ */
    function renderError() {
        var c = document.getElementById('planesGrid');
        if (!c) return;
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
            var subBtn = e.target.closest('[data-action="subscribe"]');
            if (subBtn) {
                e.preventDefault();
                e.stopPropagation();
                var pid = subBtn.getAttribute('data-plan-id');
                if (pid) handleSubscribe(pid);
                return;
            }

            var editBtn = e.target.closest('[data-action="edit-plan"]');
            if (editBtn) {
                e.preventDefault();
                e.stopPropagation();
                var pid2 = editBtn.getAttribute('data-plan-id');
                if (pid2) handleEditPlan(pid2);
                return;
            }

            var viewBtn = e.target.closest('[data-action="view-sol"]');
            if (viewBtn) {
                e.preventDefault();
                e.stopPropagation();
                var idx = parseInt(viewBtn.getAttribute('data-sol-index'), 10);
                if (!isNaN(idx)) viewSubDetail(idx);
                return;
            }
        });
    }

    /* ══════════════════════════════════════════
       🎫 SUBSCRIBE
       ══════════════════════════════════════════ */
    function handleSubscribe(planId) {
        var K = getK();
        if (!K || !K.currentUser) {
            safeShowToast('Error: sesión no disponible', 'error');
            return;
        }

        var plan = null;
        for (var i = 0; i < allPlanes.length; i++) {
            if (allPlanes[i].id === planId) {
                plan = allPlanes[i];
                break;
            }
        }
        if (!plan) return;
        currentSubPlan = plan;

        var el;
        el = document.getElementById('subUser');
        if (el) el.textContent = K.currentUser.email;

        el = document.getElementById('subPlanName');
        if (el) el.textContent = plan.nombre;

        el = document.getElementById('subPlanPrice');
        if (el) el.textContent = safeFormatPrice(plan.precio);

        el = document.getElementById('subPlanDuration');
        if (el) el.textContent = plan.duracion_dias + ' días';

        var waMsg = 'Hola KXON, quiero suscribirme al: ' + plan.nombre + ' (' + safeFormatPrice(plan.precio) + ') - Mi email: ' + K.currentUser.email;
        el = document.getElementById('subBtnWhatsapp');
        if (el) el.href = 'https://wa.me/573184530020?text=' + encodeURIComponent(waMsg);

        selectedSubCompFile = null;
        var areaEl = document.getElementById('subCompArea');
        if (areaEl) {
            areaEl.classList.remove('has-file');
            var t = areaEl.querySelector('.file-upload-text');
            if (t) t.textContent = 'Click para subir comprobante';
        }
        var prevEl = document.getElementById('subCompPreview');
        if (prevEl) prevEl.classList.remove('show');
        var fileEl = document.getElementById('subCompFile');
        if (fileEl) fileEl.value = '';

        var overlay = document.getElementById('subOverlay');
        if (overlay) overlay.classList.add('show');
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
        var db = getDB();
        var K = getK();

        if (!K || !currentSubPlan) {
            safeShowToast('Error: plan no seleccionado', 'error');
            return;
        }
        if (!selectedSubCompFile) {
            safeShowToast('Sube el comprobante de pago', 'error');
            return;
        }

        var btn = document.getElementById('btnSendSub');
        if (btn) {
            btn.classList.add('loading');
            btn.disabled = true;
        }

        try {
            var fn = Date.now() + '_sub_' + selectedSubCompFile.name.replace(/[^a-zA-Z0-9._-]/g, '');
            var up = await db.storage.from('imagenes').upload('suscripciones/' + fn, selectedSubCompFile, {
                contentType: selectedSubCompFile.type
            });
            if (up.error) throw up.error;

            var compUrl = db.storage.from('imagenes').getPublicUrl('suscripciones/' + fn).data.publicUrl;
            var nombre = (K.currentProfile && K.currentProfile.full_name) || K.currentUser.email.split('@')[0];

            var ins = await db.from('suscripciones').insert({
                usuario_id: K.currentUser.id,
                usuario_email: K.currentUser.email,
                usuario_nombre: nombre,
                plan_id: currentSubPlan.id,
                comprobante_url: compUrl,
                estado: 'pendiente'
            });
            if (ins.error) throw ins.error;

            safeShowToast('¡Solicitud enviada! Espera confirmación del admin', 'success');
            window._closeSubModal();
            if (K.loadPlanes) K.loadPlanes();
        } catch (e) {
            console.error(e);
            safeShowToast('Error: ' + e.message, 'error');
        }

        if (btn) {
            btn.classList.remove('loading');
            btn.disabled = false;
        }
    };

    window._closeSubModal = function () {
        var overlay = document.getElementById('subOverlay');
        if (overlay) overlay.classList.remove('show');
    };

    var subOverlayEl = document.getElementById('subOverlay');
    if (subOverlayEl) {
        subOverlayEl.addEventListener('click', function (e) {
            if (e.target === this) window._closeSubModal();
        });
    }

    /* ══════════════════════════════════════════
       ✏️ ADMIN: EDIT PLAN
       ══════════════════════════════════════════ */
    function handleEditPlan(planId) {
        var plan = null;
        for (var i = 0; i < allPlanes.length; i++) {
            if (allPlanes[i].id === planId) {
                plan = allPlanes[i];
                break;
            }
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
            var db = getDB();
            var K = getK();
            if (!db || !K) return;

            var planId = document.getElementById('editPlanId').value;
            var nombre = (document.getElementById('editPlanNombre').value || '').trim();
            var precio = parseInt(document.getElementById('editPlanPrecio').value) || 0;
            var duracion = parseInt(document.getElementById('editPlanDuracion').value) || 30;
            var orden = parseInt(document.getElementById('editPlanOrden').value) || 1;

            if (!nombre) {
                safeShowToast('Ingresa un nombre', 'error');
                return;
            }

            var accesos = [];
            for (var i = 0; i < allAccesosConfig.length; i++) {
                var cb = document.getElementById(allAccesosConfig[i].id);
                if (cb && cb.checked) accesos.push(allAccesosConfig[i].key);
            }

            var btn = document.getElementById('btnEditPlanSubmit');
            if (btn) {
                btn.classList.add('loading');
                btn.disabled = true;
            }

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

                safeShowToast('¡Plan actualizado!', 'success');
                window._closeEditPlan();
                K.loadPlanes();
            } catch (err) {
                console.error('Error actualizando plan:', err);
                safeShowToast('Error: ' + err.message, 'error');
            }

            if (btn) {
                btn.classList.remove('loading');
                btn.disabled = false;
            }
        });
    }

    /* ══════════════════════════════════════════
       📋 ADMIN: SOLICITUDES
       ══════════════════════════════════════════ */
    async function loadSubSolicitudes() {
        var db = getDB();
        var K = getK();
        if (!db || !K || !K.isAdmin) return;

        var section = document.getElementById('subSolicitudesSection');
        if (section) section.style.display = 'block';

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
            if (!c) return;

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
                h += '<button class="kx-plan-sol-view" data-action="view-sol" data-sol-index="' + i + '" title="Ver detalle">';
                h += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
                h += '</button>';
                h += '</div>';
            }

            c.innerHTML = h;
        } catch (e) {
            console.error('Error cargando solicitudes:', e);
        }
    }

    /* ═══ VIEW SOLICITUD DETAIL ═══ */
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
                if (e.target === overlay || e.target.closest('#subDetailCloseBtn')) {
                    closeSubDetail();
                }
                var confirmBtn = e.target.closest('[data-action="confirm-sub"]');
                if (confirmBtn) {
                    confirmSub(
                        confirmBtn.getAttribute('data-sub-id'),
                        confirmBtn.getAttribute('data-user-id'),
                        confirmBtn.getAttribute('data-plan-id'),
                        parseInt(confirmBtn.getAttribute('data-dur'), 10)
                    );
                    return;
                }
                var rejectBtn = e.target.closest('[data-action="reject-sub"]');
                if (rejectBtn) {
                    rejectSub(rejectBtn.getAttribute('data-sub-id'));
                }
            });
        }

        var nombre = s.usuario_nombre || 'Sin nombre';
        var inicial = esc(nombre.charAt(0).toUpperCase());
        var planName = s.planes ? s.planes.nombre : 'Plan eliminado';
        var planPrecio = s.planes ? safeFormatPrice(s.planes.precio) : '$0';
        var duracion = s.planes ? s.planes.duracion_dias : 30;
        var fecha = formatDateFull(s.created_at);

        var body = document.getElementById('subDetailBody');
        if (!body) return;

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
        h += '<div class="sub-detail-info-item"><div class="sub-detail-info-label">Duración</div><div class="sub-detail-info-value">' + duracion + ' días</div></div>';
        h += '<div class="sub-detail-info-item"><div class="sub-detail-info-label">Fecha</div><div class="sub-detail-info-value" style="font-size:.78rem;">' + esc(fecha) + '</div></div>';
        h += '</div>';

        if (s.comprobante_url) {
            h += '<div class="sub-detail-comprobante">';
            h += '<div class="sub-detail-comprobante-label">Comprobante de pago</div>';
            h += '<img class="sub-detail-comprobante-img" src="' + esc(s.comprobante_url) + '" alt="Comprobante" loading="lazy" style="cursor:pointer;">';
            h += '</div>';
        }

        h += '<div class="sub-detail-actions">';
        h += '<button class="btn-confirm-purchase" data-action="confirm-sub" data-sub-id="' + esc(s.id) + '" data-user-id="' + esc(s.usuario_id) + '" data-plan-id="' + esc(s.plan_id) + '" data-dur="' + duracion + '">✅ Confirmar</button>';
        h += '<button class="btn-reject-purchase" data-action="reject-sub" data-sub-id="' + esc(s.id) + '">❌ Rechazar</button>';
        h += '</div>';

        body.innerHTML = h;

        // Open comprobante in new tab on click
        var compImg = body.querySelector('.sub-detail-comprobante-img');
        if (compImg) {
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

    window._viewSubDetail = viewSubDetail;
    window._closeSubDetail = closeSubDetail;

    /* ═══ CONFIRM SUBSCRIPTION ═══ */
    async function confirmSub(subId, userId, planId, duracion) {
        var db = getDB();
        var K = getK();
        if (!db || !K) return;

        if (!confirm('¿Confirmar esta suscripción? El usuario tendrá acceso por ' + duracion + ' días.')) return;

        try {
            var ahora = new Date();
            var fin = new Date(ahora.getTime() + duracion * 86400000);

            var upd = await db.from('suscripciones').update({
                estado: 'activa',
                fecha_inicio: ahora.toISOString(),
                fecha_fin: fin.toISOString()
            }).eq('id', subId);

            if (upd.error) throw upd.error;

            // Process referral
            try {
                var pr = await db.from('profiles').select('referido_por').eq('id', userId).single();
                if (pr.data && pr.data.referido_por) {
                    var refCode = pr.data.referido_por;
                    var plr = await db.from('planes').select('nombre').eq('id', planId).single();
                    var planNombre = plr.data ? plr.data.nombre : 'Plan';

                    var rpc = await db.rpc('procesar_referido_suscripcion', {
                        p_user_id: userId,
                        p_suscripcion_id: subId,
                        p_plan_nombre: planNombre
                    });

                    if (rpc.error) {
                        console.warn('RPC failed, processing manually:', rpc.error);
                        var emb = await db.from('embajadores')
                            .select('id, nivel, total_suscritos, comision_acumulada')
                            .eq('codigo', refCode)
                            .eq('estado', 'activo')
                            .single();

                        if (emb.data) {
                            var comision = 3000;
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

                            var newTotal = (emb.data.total_suscritos || 0) + 1;
                            var nuevoNivel = newTotal >= 15 ? 'lider' : newTotal >= 6 ? 'constructor' : 'activador';

                            await db.from('embajadores').update({
                                total_suscritos: newTotal,
                                comision_acumulada: (emb.data.comision_acumulada || 0) + comision,
                                nivel: nuevoNivel,
                                updated_at: ahora.toISOString()
                            }).eq('id', emb.data.id);

                            await sendEmbajadorEmail(refCode, userId, subId, planNombre);
                        }
                    } else {
                        await sendEmbajadorEmail(refCode, userId, subId, planNombre);
                    }
                }
            } catch (refErr) {
                console.error('Referral error (non-critical):', refErr);
            }

            safeShowToast('¡Suscripción confirmada! El usuario ya tiene acceso', 'success');
            closeSubDetail();
            loadSubSolicitudes();
        } catch (e) {
            safeShowToast('Error: ' + e.message, 'error');
        }
    }

    /* ═══ REJECT SUBSCRIPTION ═══ */
    async function rejectSub(subId) {
        var db = getDB();
        if (!db) return;

        if (!confirm('¿Rechazar esta solicitud?')) return;

        try {
            var upd = await db.from('suscripciones').update({
                estado: 'cancelada'
            }).eq('id', subId);

            if (upd.error) throw upd.error;

            safeShowToast('Solicitud rechazada', 'success');
            closeSubDetail();
            loadSubSolicitudes();
        } catch (e) {
            safeShowToast('Error: ' + e.message, 'error');
        }
    }

    window._confirmSub = confirmSub;
    window._rejectSub = rejectSub;

    /* ═══ INIT ═══ */
    defineLoadPlanes();

})();