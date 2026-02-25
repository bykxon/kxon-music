/* ============================================
   🏆 DASHBOARD-EMBAJADORES.JS — KXON 2026
   Panel de embajadores, referidos, ranking
   Namespace: kx-emb-*
   ============================================ */
(function () {
    'use strict';

    var db = window.db;
    var K = window.KXON;

    var myEmbajador = null;
    var myReferidos = [];
    var allEmbajadores = [];

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

    /* ═══ NIVEL CONFIG ═══ */
var NIVELES = {
    activador: {
        badge: '🥉',
        name: 'Activador',
        comision: 3000,
        min: 0,
        max: 5,
        nextName: 'Constructor',
        nextMin: 6,
        color: '#cd7f32',
        tieneRifa: false,
        rifaPorcentaje: 0,
        descripcionPremio: 'Solo comisión directa'
    },
    constructor: {
        badge: '🥈',
        name: 'Constructor',
        comision: 0,
        min: 6,
        max: 14,
        nextName: 'Líder KXON',
        nextMin: 15,
        color: '#c0c0c0',
        tieneRifa: true,
        rifaPorcentaje: 10,
        descripcionPremio: 'Rifa del 10% de ingresos'
    },
    lider: {
        badge: '🥇',
        name: 'Líder KXON',
        comision: 0,
        min: 15,
        max: 999,
        nextName: null,
        nextMin: null,
        color: '#ffd700',
        tieneRifa: true,
        rifaPorcentaje: 20,
        descripcionPremio: 'Rifa GRANDE del 20% de ingresos'
    }
};

    function getNivelInfo(nivel) {
        return NIVELES[nivel] || NIVELES.activador;
    }

    /* ══════════════════════════════════════════
       🏆 LOAD EMBAJADORES (Main Entry)
       ══════════════════════════════════════════ */
    K.loadEmbajadores = async function () {
        try {
            // 1) Check if current user is already an ambassador
            var embResult = await db.from('embajadores')
                .select('*')
                .eq('usuario_id', K.currentUser.id)
                .limit(1);

            if (embResult.error) throw embResult.error;

            if (embResult.data && embResult.data.length > 0) {
                myEmbajador = embResult.data[0];
            } else {
                myEmbajador = null;
            }

            // 2) Render views based on status
            if (myEmbajador && myEmbajador.estado === 'activo') {
                showDashboardView();
                await loadMyReferidos();
            } else {
                showActivateView();
            }

            // 3) Load ranking (visible for everyone)
            await loadRanking();

            // 4) Admin section
            if (K.isAdmin) {
                await loadAdminSection();
            }

        } catch (e) {
            console.error('Error loading embajadores:', e);
            K.showToast('Error cargando embajadores', 'error');
        }
    };

    /* ══════════════════════════════════════════
       📋 SHOW ACTIVATE VIEW (not ambassador yet)
       ══════════════════════════════════════════ */
    function showActivateView() {
        var activateView = document.getElementById('embActivateView');
        var dashView = document.getElementById('embDashboardView');
        var kpis = document.getElementById('embKPIs');

        if (activateView) activateView.style.display = 'block';
        if (dashView) dashView.style.display = 'none';
        if (kpis) kpis.style.display = 'none';

        // KPIs to defaults
        setKPI('embStatRegistrados', '0');
        setKPI('embStatSuscritos', '0');
        setKPI('embStatNivel', '—');
        setKPI('embStatComision', '$0');
    }

    /* ══════════════════════════════════════════
       📊 SHOW DASHBOARD VIEW (is ambassador)
       ══════════════════════════════════════════ */
    function showDashboardView() {
        var activateView = document.getElementById('embActivateView');
        var dashView = document.getElementById('embDashboardView');
        var kpis = document.getElementById('embKPIs');

        if (activateView) activateView.style.display = 'none';
        if (dashView) dashView.style.display = 'block';
        if (kpis) kpis.style.display = 'flex';

        if (!myEmbajador) return;

        var info = getNivelInfo(myEmbajador.nivel);

        // KPIs
        setKPI('embStatRegistrados', String(myEmbajador.total_registrados || 0));
        setKPI('embStatSuscritos', String(myEmbajador.total_suscritos || 0));
        setKPI('embStatNivel', info.badge + ' ' + info.name);
        if (info.comision > 0) {
    setKPI('embStatComision', K.formatPrice(myEmbajador.comision_acumulada || 0));
} else {
    setKPI('embStatComision', info.tieneRifa ? '🎰 Rifa ' + info.rifaPorcentaje + '%' : '$0');
}

        // Código y Link
        var codigoEl = document.getElementById('embCodigo');
        var linkEl = document.getElementById('embLink');
        var baseUrl = window.location.origin + '/register.html?ref=';
        var fullLink = baseUrl + encodeURIComponent(myEmbajador.codigo);

        if (codigoEl) codigoEl.textContent = myEmbajador.codigo;
        if (linkEl) linkEl.textContent = fullLink;

        // WhatsApp link
        var waBtn = document.getElementById('embBtnWhatsapp');
        if (waBtn) {
            var waMsg = '🎵 ¡Únete a KXON, la plataforma musical exclusiva!\n\n' +
                'Regístrate con mi código de embajador y accede a música, videos y más.\n\n' +
                '🔗 ' + fullLink + '\n\n' +
                '📌 Código: ' + myEmbajador.codigo;
            waBtn.href = 'https://wa.me/?text=' + encodeURIComponent(waMsg);
        }

        // Nivel progress
        renderNivelProgress();
    }

    function setKPI(id, value) {
        var el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    /* ══════════════════════════════════════════
       🏅 RENDER NIVEL PROGRESS
       ══════════════════════════════════════════ */
    function renderNivelProgress() {
        if (!myEmbajador) return;

        var info = getNivelInfo(myEmbajador.nivel);
        var total = myEmbajador.total_suscritos || 0;

        var badgeEl = document.getElementById('embNivelBadge');
        var nameEl = document.getElementById('embNivelName');
        var descEl = document.getElementById('embNivelDesc');
        var fillEl = document.getElementById('embNivelProgressFill');
        var textEl = document.getElementById('embNivelProgressText');
        var cardEl = document.getElementById('embNivelCard');

        if (badgeEl) badgeEl.textContent = info.badge;
        if (nameEl) nameEl.textContent = info.name;

        if (cardEl) {
            cardEl.className = 'kx-emb-nivel-card kx-emb-nivel-card--' + myEmbajador.nivel;
        }

        if (info.nextName && info.nextMin) {
            // Has next level
            var progress = Math.min(100, (total / info.nextMin) * 100);
            var remaining = Math.max(0, info.nextMin - total);

            if (fillEl) fillEl.style.width = progress + '%';
            if (textEl) textEl.textContent = total + ' / ' + info.nextMin + ' para ' + info.nextName;
            if (descEl) descEl.textContent = remaining > 0
                ? 'Te faltan ' + remaining + ' suscritos para ' + info.nextName
                : '¡Ya alcanzaste el nivel ' + info.nextName + '!';
        } else {
            // Max level
            if (fillEl) fillEl.style.width = '100%';
            if (textEl) textEl.textContent = total + ' suscritos — ¡Nivel máximo!';
            if (descEl) descEl.textContent = '¡Felicidades! Eres un Líder KXON 🏆';
        }
    }

    /* ══════════════════════════════════════════
       🚀 ACTIVATE AS AMBASSADOR
       ══════════════════════════════════════════ */
    var btnActivar = document.getElementById('btnActivarEmbajador');
    if (btnActivar) {
        btnActivar.addEventListener('click', async function () {
            if (myEmbajador) {
                K.showToast('Ya eres embajador', 'info');
                return;
            }

            var btn = this;
            btn.classList.add('loading');
            btn.disabled = true;

            try {
                var nombre = K.currentProfile.full_name ||
                    K.currentUser.email.split('@')[0];

                // Generate unique code via DB function
                var codeResult = await db.rpc('generar_codigo_embajador', {
                    nombre: nombre
                });

                var codigo;
                if (codeResult.error) {
                    // Fallback: generate locally
                    var clean = nombre.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8).toUpperCase();
                    if (!clean) clean = 'USER';
                    codigo = 'KXON-' + clean + '-' + Math.floor(Math.random() * 9999).toString().padStart(4, '0');
                } else {
                    codigo = codeResult.data;
                }

                // Insert ambassador
                var insertResult = await db.from('embajadores').insert({
                    usuario_id: K.currentUser.id,
                    usuario_email: K.currentUser.email,
                    usuario_nombre: nombre,
                    codigo: codigo,
                    estado: 'activo',
                    nivel: 'activador',
                    total_registrados: 0,
                    total_suscritos: 0,
                    comision_acumulada: 0,
                    comision_pagada: 0
                }).select().single();

                if (insertResult.error) throw insertResult.error;

                myEmbajador = insertResult.data;

                K.showToast('🏆 ¡Ya eres Embajador KXON! Comparte tu código', 'success');

                showDashboardView();
                await loadRanking();

            } catch (e) {
                console.error('Error activating ambassador:', e);

                if (e.message && e.message.indexOf('duplicate') >= 0) {
                    K.showToast('Ya tienes una cuenta de embajador', 'error');
                    // Reload to show dashboard
                    K.loadEmbajadores();
                } else {
                    K.showToast('Error: ' + e.message, 'error');
                }
            }

            btn.classList.remove('loading');
            btn.disabled = false;
        });
    }

    /* ══════════════════════════════════════════
       📋 LOAD MY REFERIDOS
       ══════════════════════════════════════════ */
    async function loadMyReferidos() {
        if (!myEmbajador) return;

        try {
            var r = await db.from('referidos')
                .select('*')
                .eq('embajador_id', myEmbajador.id)
                .order('fecha_registro', { ascending: false });

            if (r.error) throw r.error;

            myReferidos = r.data || [];
            renderReferidos();

        } catch (e) {
            console.error('Error loading referidos:', e);
        }
    }

    /* ══════════════════════════════════════════
       📋 RENDER REFERIDOS LIST
       ══════════════════════════════════════════ */
    function renderReferidos() {
        var container = document.getElementById('embReferidosList');
        var countEl = document.getElementById('embReferidosCount');

        if (countEl) countEl.textContent = myReferidos.length + ' personas';

        if (!container) return;

        if (!myReferidos.length) {
            container.innerHTML =
                '<div class="kx-emb-referidos-empty">' +
                    '<div class="kx-emb-referidos-empty-icon">👥</div>' +
                    '<div class="kx-emb-referidos-empty-title">Sin referidos aún</div>' +
                    '<div class="kx-emb-referidos-empty-text">Comparte tu código para empezar a invitar personas</div>' +
                '</div>';
            return;
        }

        var h = '';
        for (var i = 0; i < myReferidos.length; i++) {
            var ref = myReferidos[i];
            var nombre = ref.referido_nombre || ref.referido_email.split('@')[0];
            var inicial = esc(nombre.charAt(0).toUpperCase());
            var isSuscrito = ref.estado === 'suscrito';
            var statusClass = isSuscrito ? 'kx-emb-ref-status--suscrito' : 'kx-emb-ref-status--registrado';
            var statusIcon = isSuscrito ? '✅' : '⏳';
            var statusText = isSuscrito ? 'Suscrito' : 'Registrado';
            var fecha = formatDate(ref.fecha_registro);

            h += '<div class="kx-emb-ref-item" role="listitem">';
            h += '<div class="kx-emb-ref-avatar">' + inicial + '</div>';
            h += '<div class="kx-emb-ref-info">';
            h += '<div class="kx-emb-ref-name">' + esc(nombre) + '</div>';
            h += '<div class="kx-emb-ref-meta">';
            h += '<span class="kx-emb-ref-email">' + esc(ref.referido_email) + '</span>';

            if (isSuscrito && ref.plan_nombre) {
                h += '<span class="kx-emb-ref-plan">' + esc(ref.plan_nombre) + '</span>';
            }

            h += '</div>';
            h += '</div>';
            h += '<div class="kx-emb-ref-right">';
            h += '<span class="kx-emb-ref-status ' + statusClass + '">' + statusIcon + ' ' + statusText + '</span>';

            if (isSuscrito && ref.comision_generada > 0) {
    h += '<span class="kx-emb-ref-comision">+' + K.formatPrice(ref.comision_generada) + '</span>';
} else if (isSuscrito && ref.comision_generada === 0) {
    h += '<span class="kx-emb-ref-rifa-badge">🎰 Cuenta para rifa</span>';
}

            h += '<span class="kx-emb-ref-date">' + esc(fecha) + '</span>';
            h += '</div>';
            h += '</div>';
        }

        container.innerHTML = h;
    }

    /* ══════════════════════════════════════════
       🏆 LOAD RANKING
       ══════════════════════════════════════════ */
    async function loadRanking() {
        try {
            var r = await db.from('embajadores')
                .select('id, usuario_id, usuario_nombre, nivel, total_suscritos, total_registrados')
                .eq('estado', 'activo')
                .order('total_suscritos', { ascending: false })
                .limit(20);

            if (r.error) throw r.error;

            allEmbajadores = r.data || [];
            renderRanking();

        } catch (e) {
            console.error('Error loading ranking:', e);
        }
    }

    /* ══════════════════════════════════════════
       🏆 RENDER RANKING
       ══════════════════════════════════════════ */
    function renderRanking() {
        var container = document.getElementById('embRankingList');
        var subtitleEl = document.getElementById('embRankingSubtitle');

        if (subtitleEl) {
            subtitleEl.textContent = allEmbajadores.length + ' embajadores activos';
        }

        if (!container) return;

        if (!allEmbajadores.length) {
            container.innerHTML =
                '<div class="kx-emb-ranking-empty">' +
                    '<div class="kx-emb-ranking-empty-icon">🏆</div>' +
                    '<div class="kx-emb-ranking-empty-title">Sin embajadores aún</div>' +
                    '<div class="kx-emb-ranking-empty-text">¡Sé el primero en activarte como embajador!</div>' +
                '</div>';
            return;
        }

        var h = '';
        for (var i = 0; i < allEmbajadores.length; i++) {
            var emb = allEmbajadores[i];
            var info = getNivelInfo(emb.nivel);
            var nombre = emb.usuario_nombre || 'Embajador';
            var inicial = esc(nombre.charAt(0).toUpperCase());
            var position = i + 1;
            var isMe = myEmbajador && emb.id === myEmbajador.id;

            var positionBadge;
            if (position === 1) positionBadge = '🥇';
            else if (position === 2) positionBadge = '🥈';
            else if (position === 3) positionBadge = '🥉';
            else positionBadge = '#' + position;

            var itemClass = 'kx-emb-rank-item';
            if (isMe) itemClass += ' kx-emb-rank-item--me';
            if (position <= 3) itemClass += ' kx-emb-rank-item--top';

            h += '<div class="' + itemClass + '" role="listitem">';
            h += '<div class="kx-emb-rank-position">' + positionBadge + '</div>';
            h += '<div class="kx-emb-rank-avatar" style="border-color:' + info.color + '">' + inicial + '</div>';
            h += '<div class="kx-emb-rank-info">';
            h += '<div class="kx-emb-rank-name">';
            h += esc(nombre);
            if (isMe) h += ' <span class="kx-emb-rank-me-badge">TÚ</span>';
            h += '</div>';
            h += '<div class="kx-emb-rank-meta">';
            h += '<span class="kx-emb-rank-nivel-badge" style="color:' + info.color + '">' + info.badge + ' ' + info.name + '</span>';
            if (info.tieneRifa) {
    h += '<span class="kx-emb-rank-rifa-tag">🎰 Rifa ' + info.rifaPorcentaje + '%</span>';
}
            h += '</div>';
            h += '</div>';
            h += '<div class="kx-emb-rank-stats">';
            h += '<span class="kx-emb-rank-suscritos">' + (emb.total_suscritos || 0) + '</span>';
            h += '<span class="kx-emb-rank-stats-label">suscritos</span>';
            h += '</div>';
            h += '</div>';
        }

        container.innerHTML = h;
    }

    /* ══════════════════════════════════════════
       🔧 ADMIN SECTION
       ══════════════════════════════════════════ */
    async function loadAdminSection() {
        if (!K.isAdmin) return;

        var section = document.getElementById('embAdminSection');
        if (section) section.style.display = 'block';

        try {
            // Load all ambassadors
            var r = await db.from('embajadores')
                .select('*')
                .order('total_suscritos', { ascending: false });

            if (r.error) throw r.error;

            var allEmb = r.data || [];

            // Stats
            var totalEmb = allEmb.length;
            var totalRef = 0;
            var totalSusc = 0;
            var totalComision = 0;

            for (var i = 0; i < allEmb.length; i++) {
                totalRef += allEmb[i].total_registrados || 0;
                totalSusc += allEmb[i].total_suscritos || 0;
                totalComision += allEmb[i].comision_acumulada || 0;
            }

            setKPI('embAdminTotalEmb', String(totalEmb));
            setKPI('embAdminTotalRef', String(totalRef));
            setKPI('embAdminTotalSusc', String(totalSusc));
            setKPI('embAdminTotalComision', K.formatPrice(totalComision));

            var countEl = document.getElementById('embAdminCount');
            if (countEl) countEl.textContent = totalEmb + ' embajadores';

            // Render list
            renderAdminList(allEmb);

        } catch (e) {
            console.error('Error loading admin section:', e);
        }
    }

    function renderAdminList(embs) {
        var container = document.getElementById('embAdminList');
        if (!container) return;

        if (!embs.length) {
            container.innerHTML =
                '<div class="kx-emb-admin-empty">' +
                    '<div class="kx-emb-admin-empty-icon">📋</div>' +
                    '<div class="kx-emb-admin-empty-title">Sin embajadores registrados</div>' +
                '</div>';
            return;
        }

        var h = '';
        for (var i = 0; i < embs.length; i++) {
            var emb = embs[i];
            var info = getNivelInfo(emb.nivel);
            var nombre = emb.usuario_nombre || 'Sin nombre';
            var inicial = esc(nombre.charAt(0).toUpperCase());
            var isActivo = emb.estado === 'activo';
            var fecha = formatDate(emb.created_at);

            h += '<div class="kx-emb-admin-item" role="listitem" data-emb-id="' + esc(emb.id) + '">';
            h += '<div class="kx-emb-admin-item-avatar" style="border-color:' + info.color + '">' + inicial + '</div>';
            h += '<div class="kx-emb-admin-item-info">';
            h += '<div class="kx-emb-admin-item-name">' + esc(nombre) + '</div>';
            h += '<div class="kx-emb-admin-item-meta">';
            h += '<span class="kx-emb-admin-item-email">' + esc(emb.usuario_email) + '</span>';
            h += '<span class="kx-emb-admin-item-code">' + esc(emb.codigo) + '</span>';
            h += '</div>';
            h += '</div>';
            h += '<div class="kx-emb-admin-item-stats">';
            h += '<span class="kx-emb-admin-item-nivel" style="color:' + info.color + '">' + info.badge + ' ' + info.name + '</span>';
            h += '<span class="kx-emb-admin-item-count">' + (emb.total_suscritos || 0) + ' susc. / ' + (emb.total_registrados || 0) + ' reg.</span>';
            var comisionPendiente = (emb.comision_acumulada || 0) - (emb.comision_pagada || 0);

if (info.comision > 0 && comisionPendiente > 0) {
    h += '<span class="kx-emb-admin-item-comision">Pendiente: ' + K.formatPrice(comisionPendiente) + '</span>';
} else if (info.tieneRifa) {
    h += '<span class="kx-emb-admin-item-rifa">🎰 Participa en rifa ' + info.rifaPorcentaje + '%</span>';
} else {
    h += '<span class="kx-emb-admin-item-comision-paid">✅ Sin deuda</span>';
}
            h += '</div>';
            h += '<div class="kx-emb-admin-item-actions">';

            if (isActivo) {
                h += '<button class="kx-emb-admin-btn kx-emb-admin-btn--pause" data-action="pause-emb" data-emb-id="' + esc(emb.id) + '" title="Pausar">';
                h += '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
                h += '</button>';
            } else {
                h += '<button class="kx-emb-admin-btn kx-emb-admin-btn--activate" data-action="activate-emb" data-emb-id="' + esc(emb.id) + '" title="Activar">';
                h += '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
                h += '</button>';
            }

            if (info.comision > 0 && comisionPendiente > 0) {
    h += '<button class="kx-emb-admin-btn kx-emb-admin-btn--pay" data-action="pay-emb" data-emb-id="' + esc(emb.id) + '" data-emb-name="' + esc(nombre) + '" data-emb-comision="' + (emb.comision_acumulada || 0) + '" data-emb-pagada="' + (emb.comision_pagada || 0) + '" title="Marcar comisión pagada">';
    h += '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>';
    h += '</button>';
}

            h += '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>';
            h += '</button>';

            h += '</div>';
            h += '<span class="kx-emb-admin-item-date">' + esc(fecha) + '</span>';
            h += '<span class="kx-emb-admin-item-estado kx-emb-admin-estado--' + esc(emb.estado) + '">' + esc(emb.estado) + '</span>';
            h += '</div>';
        }

        container.innerHTML = h;
    }

    /* ══════════════════════════════════════════
       📋 COPY BUTTONS
       ══════════════════════════════════════════ */
    var btnCopyCodigo = document.getElementById('btnCopyCodigo');
    if (btnCopyCodigo) {
        btnCopyCodigo.addEventListener('click', function () {
            if (!myEmbajador) return;
            copyToClipboard(myEmbajador.codigo);
            K.showToast('📋 Código copiado', 'success');
        });
    }

    var btnCopyLink = document.getElementById('btnCopyLink');
    if (btnCopyLink) {
        btnCopyLink.addEventListener('click', function () {
            if (!myEmbajador) return;
            var link = window.location.origin + '/register.html?ref=' + encodeURIComponent(myEmbajador.codigo);
            copyToClipboard(link);
            K.showToast('🔗 Link copiado', 'success');
        });
    }

    var btnCopyAll = document.getElementById('embBtnCopyAll');
    if (btnCopyAll) {
        btnCopyAll.addEventListener('click', function () {
            if (!myEmbajador) return;
            var link = window.location.origin + '/register.html?ref=' + encodeURIComponent(myEmbajador.codigo);
            var msg = '🎵 ¡Únete a KXON, la plataforma musical exclusiva!\n\n' +
                'Regístrate con mi código de embajador y accede a música, videos y más.\n\n' +
                '🔗 ' + link + '\n\n' +
                '📌 Código: ' + myEmbajador.codigo;
            copyToClipboard(msg);
            K.showToast('📋 Mensaje completo copiado', 'success');
        });
    }

    function copyToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).catch(function () {
                fallbackCopy(text);
            });
        } else {
            fallbackCopy(text);
        }
    }

    function fallbackCopy(text) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (e) { }
        document.body.removeChild(ta);
    }

    /* ══════════════════════════════════════════
       🔧 ADMIN EVENT DELEGATION
       ══════════════════════════════════════════ */
    var panelEl = document.getElementById('panel-embajadores');
    if (panelEl) {
        panelEl.addEventListener('click', function (e) {
            var target = e.target;

            // Pause ambassador
            var pauseBtn = target.closest('[data-action="pause-emb"]');
            if (pauseBtn) {
                e.preventDefault();
                e.stopPropagation();
                var embId = pauseBtn.getAttribute('data-emb-id');
                if (embId) toggleEmbajadorEstado(embId, 'pausado');
                return;
            }

            // Activate ambassador
            var activateBtn = target.closest('[data-action="activate-emb"]');
            if (activateBtn) {
                e.preventDefault();
                e.stopPropagation();
                var embId2 = activateBtn.getAttribute('data-emb-id');
                if (embId2) toggleEmbajadorEstado(embId2, 'activo');
                return;
            }

            // Pay commission
            var payBtn = target.closest('[data-action="pay-emb"]');
            if (payBtn) {
                e.preventDefault();
                e.stopPropagation();
                var payEmbId = payBtn.getAttribute('data-emb-id');
                var payName = payBtn.getAttribute('data-emb-name');
                var payComision = parseInt(payBtn.getAttribute('data-emb-comision')) || 0;
                var payPagada = parseInt(payBtn.getAttribute('data-emb-pagada')) || 0;
                if (payEmbId) markComisionPaid(payEmbId, payName, payComision, payPagada);
                return;
            }
        });
    }

    /* ══════════════════════════════════════════
       🔧 ADMIN: TOGGLE ESTADO
       ══════════════════════════════════════════ */
    async function toggleEmbajadorEstado(embId, nuevoEstado) {
        var action = nuevoEstado === 'activo' ? 'activar' : 'pausar';
        if (!confirm('¿' + action.charAt(0).toUpperCase() + action.slice(1) + ' este embajador?')) return;

        try {
            var upd = await db.from('embajadores')
                .update({
                    estado: nuevoEstado,
                    updated_at: new Date().toISOString()
                })
                .eq('id', embId);

            if (upd.error) throw upd.error;

            K.showToast('Embajador ' + (nuevoEstado === 'activo' ? 'activado' : 'pausado'), 'success');
            await loadAdminSection();
            await loadRanking();

        } catch (e) {
            K.showToast('Error: ' + e.message, 'error');
        }
    }

    /* ══════════════════════════════════════════
       🔧 ADMIN: MARK COMISION PAID
       ══════════════════════════════════════════ */
    async function markComisionPaid(embId, nombre, comisionTotal, comisionPagada) {
        var pendiente = comisionTotal - comisionPagada;

        if (pendiente <= 0) {
            K.showToast('No hay comisiones pendientes para ' + nombre, 'info');
            return;
        }

        if (!confirm('¿Marcar como pagada la comisión pendiente de ' + nombre + '?\n\nPendiente: ' + K.formatPrice(pendiente))) return;

        try {
            var upd = await db.from('embajadores')
                .update({
                    comision_pagada: comisionTotal,
                    updated_at: new Date().toISOString()
                })
                .eq('id', embId);

            if (upd.error) throw upd.error;

            K.showToast('✅ Comisión marcada como pagada: ' + K.formatPrice(pendiente), 'success');
            await loadAdminSection();

        } catch (e) {
            K.showToast('Error: ' + e.message, 'error');
        }
    }

})();