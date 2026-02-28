/* ============================================
   🏆 DASHBOARD-EMBAJADORES.JS — KXON 2026
   Panel de embajadores, referidos, ranking
   SISTEMA: Activador $1.5k → Constructor $2k+Rifa → Líder $3k+Rifa+VIP
   ============================================ */
(function () {
    'use strict';

    var db = window.db;
    var K = window.KXON;

    if (!K) { console.error('KXON namespace not found'); return; }
    if (!K.formatPrice) {
        K.formatPrice = function (amount) {
            return '$' + (amount || 0).toLocaleString('es-CO');
        };
    }

    /* ═══ EMAILJS ═══ */
    var EMAILJS_PUBLIC_KEY = 'JgRyKiNEcoF5oOEjV';
    var EMAILJS_SERVICE_ID = 'service_rdsr8wb';
    var EMAILJS_TEMPLATE_WELCOME = 'template_76gbiq7';
    var EMAILJS_TEMPLATE_REFERIDO = 'template_9b3995p';

    if (window.emailjs) { window.emailjs.init(EMAILJS_PUBLIC_KEY); }

    var myEmbajador = null;
    var myReferidos = [];
    var allEmbajadores = [];
    var previousNivel = null;

    /* ═══ UTILS ═══ */
    function esc(str) {
        if (!str) return '';
        var d = document.createElement('div');
        d.appendChild(document.createTextNode(str));
        return d.innerHTML;
    }

    function formatDate(dateStr, opts) {
        if (!dateStr) return '—';
        try { return new Date(dateStr).toLocaleDateString('es-ES', opts || { day: 'numeric', month: 'short' }); }
        catch (e) { return '—'; }
    }

    function formatDateLong(dateStr) {
        return formatDate(dateStr, { day: 'numeric', month: 'long', year: 'numeric' });
    }

    function setKPI(id, value) {
        var el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    function showSkeletons(containerId, count) {
        var container = document.getElementById(containerId);
        if (!container) return;
        var h = '';
        for (var i = 0; i < (count || 3); i++) {
            h += '<div class="kx-emb-skeleton-item"><div class="kx-emb-skeleton kx-emb-skeleton-avatar"></div><div style="flex:1"><div class="kx-emb-skeleton kx-emb-skeleton-line kx-emb-skeleton-line--short"></div><div class="kx-emb-skeleton kx-emb-skeleton-line kx-emb-skeleton-line--tiny"></div></div></div>';
        }
        container.innerHTML = h;
    }

    function copyToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).catch(function () { fallbackCopy(text); });
        } else { fallbackCopy(text); }
    }

    function fallbackCopy(text) {
        var ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch (e) { }
        document.body.removeChild(ta);
    }

    function copyWithFeedback(text, buttonEl, toastMsg) {
        copyToClipboard(text);
        if (buttonEl) {
            buttonEl.classList.add('copied');
            var spanEl = buttonEl.querySelector('span');
            var originalText = '';
            if (spanEl) { originalText = spanEl.textContent; spanEl.textContent = '✓ Copiado'; }
            setTimeout(function () {
                buttonEl.classList.remove('copied');
                if (spanEl && originalText) { spanEl.textContent = originalText; }
            }, 1500);
        }
        if (toastMsg) K.showToast(toastMsg, 'success');
    }

    function launchConfetti() {
        var container = document.getElementById('embConfettiContainer');
        if (!container) return;
        container.innerHTML = '';
        var colors = ['#8b5cf6', '#a78bfa', '#7c3aed', '#ffd700', '#34d399', '#f472b6'];
        for (var i = 0; i < 40; i++) {
            var piece = document.createElement('div');
            piece.className = 'kx-emb-confetti-piece';
            piece.style.setProperty('--x', (Math.random() * 100) + 'vw');
            piece.style.setProperty('--delay', (Math.random() * 0.5) + 's');
            piece.style.setProperty('--duration', (Math.random() * 1.5 + 1.5) + 's');
            piece.style.setProperty('--rotate', (Math.random() * 720 - 360) + 'deg');
            piece.style.background = colors[Math.floor(Math.random() * colors.length)];
            container.appendChild(piece);
        }
        container.classList.add('active');
        setTimeout(function () { container.classList.remove('active'); container.innerHTML = ''; }, 3000);
    }

    /* ═══ NIVEL CONFIG — CORRECTO ═══ */
    var NIVELES = {
        activador: {
            badge: '🥉', name: 'Activador', comision: 1500,
            min: 0, max: 5, nextName: 'Constructor', nextMin: 6,
            color: '#cd7f32', tieneRifa: false, rifaPorcentaje: 0,
            descripcionPremio: '$1,500 COP por suscrito',
            descripcionCorta: 'Comisión directa por cada persona que se suscriba'
        },
        constructor: {
            badge: '🥈', name: 'Constructor', comision: 2000,
            min: 6, max: 14, nextName: 'Líder KXON', nextMin: 15,
            color: '#c0c0c0', tieneRifa: true, rifaPorcentaje: 10,
            descripcionPremio: '$2,000 + Rifa 10%',
            descripcionCorta: '$2,000 COP por suscrito + participa en rifa del 10% mensual'
        },
        lider: {
            badge: '🥇', name: 'Líder KXON', comision: 3000,
            min: 15, max: 999, nextName: null, nextMin: null,
            color: '#ffd700', tieneRifa: true, rifaPorcentaje: 20,
            descripcionPremio: '$3,000 + Rifa 20% + VIP',
            descripcionCorta: '$3,000 COP por suscrito + rifa del 20% + grupo exclusivo VIP'
        }
    };

    var BONOS_META = [
        { target: 10, bono: 10000, label: '10 referidos/mes', emoji: '🎯' },
        { target: 20, bono: 30000, label: '20 referidos/mes', emoji: '💎' }
    ];

    function getNivelInfo(nivel) { return NIVELES[nivel] || NIVELES.activador; }

    function calcNivel(totalSuscritos) {
        if (totalSuscritos >= 15) return 'lider';
        if (totalSuscritos >= 6) return 'constructor';
        return 'activador';
    }

    function getReferidosDelMes() {
        if (!myReferidos || !myReferidos.length) return 0;
        var now = new Date();
        var mesActual = now.getMonth();
        var anioActual = now.getFullYear();
        var count = 0;
        for (var i = 0; i < myReferidos.length; i++) {
            var ref = myReferidos[i];
            if (ref.estado === 'suscrito' && ref.fecha_registro) {
                var fecha = new Date(ref.fecha_registro);
                if (fecha.getMonth() === mesActual && fecha.getFullYear() === anioActual) count++;
            }
        }
        return count;
    }

    /* ═══ MAIN ENTRY ═══ */
    K.loadEmbajadores = async function () {
        if (!K.currentUser || !K.currentUser.id) return;
        showSkeletons('embRankingList', 5);
        showSkeletons('embReferidosList', 3);

        try {
            var embResult = await db.from('embajadores').select('*').eq('usuario_id', K.currentUser.id).limit(1);
            if (embResult.error) throw embResult.error;
            myEmbajador = (embResult.data && embResult.data.length > 0) ? embResult.data[0] : null;

            if (myEmbajador && myEmbajador.estado === 'activo') {
                previousNivel = myEmbajador.nivel;
                showDashboardView();
                await loadMyReferidos();
                await loadHistorial();
                renderWeeklyChart();
                renderBonoMeta();
                initShareButtons();
                requestNotificationPermission();
            } else {
                showActivateView();
            }

            await loadRanking();
            if (K.isAdmin) await loadAdminSection();
            initEventListeners();
        } catch (e) {
            console.error('Error loading embajadores:', e);
            K.showToast('Error cargando embajadores', 'error');
        }
    };

    /* ═══ VIEWS ═══ */
    function showActivateView() {
        var a = document.getElementById('embActivateView');
        var d = document.getElementById('embDashboardView');
        var k = document.getElementById('embKPIs');
        if (a) a.style.display = 'block';
        if (d) d.style.display = 'none';
        if (k) k.style.display = 'none';
        setKPI('embStatRegistrados', '0');
        setKPI('embStatSuscritos', '0');
        setKPI('embStatNivel', '—');
        setKPI('embStatComision', '$0');
        setKPI('embStatBonoMes', '—');
    }

    function showDashboardView() {
        var a = document.getElementById('embActivateView');
        var d = document.getElementById('embDashboardView');
        var k = document.getElementById('embKPIs');
        if (a) a.style.display = 'none';
        if (d) d.style.display = 'block';
        if (k) k.style.display = 'flex';
        if (!myEmbajador) return;

        var info = getNivelInfo(myEmbajador.nivel);
        setKPI('embStatRegistrados', String(myEmbajador.total_registrados || 0));
        setKPI('embStatSuscritos', String(myEmbajador.total_suscritos || 0));
        setKPI('embStatNivel', info.badge + ' ' + info.name);
        setKPI('embStatComision', K.formatPrice(myEmbajador.comision_acumulada || 0));
        setKPI('embStatBonoMes', '...');

        var codigoEl = document.getElementById('embCodigo');
        var linkEl = document.getElementById('embLink');
        var baseUrl = window.location.origin + '/register.html?ref=';
        var fullLink = baseUrl + encodeURIComponent(myEmbajador.codigo);
        if (codigoEl) codigoEl.textContent = myEmbajador.codigo;
        if (linkEl) linkEl.textContent = fullLink;

        var waBtn = document.getElementById('embBtnWhatsapp');
        if (waBtn) {
            var waMsg = '🎵 ¡Únete a KXON, la plataforma musical exclusiva!\n\n🔗 ' + fullLink + '\n\n📌 Código: ' + myEmbajador.codigo;
            waBtn.href = 'https://wa.me/?text=' + encodeURIComponent(waMsg);
        }

        renderNivelProgress();
    }

    /* ═══ NIVEL PROGRESS ═══ */
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
        var premiosEl = document.getElementById('embNivelPremios');

        if (badgeEl) badgeEl.textContent = info.badge;
        if (nameEl) nameEl.textContent = info.name;
        if (cardEl) cardEl.className = 'kx-emb-nivel-card kx-emb-nivel-card--' + myEmbajador.nivel;

        if (premiosEl) {
            var ph = '<span class="kx-emb-nivel-premio kx-emb-nivel-premio--comision">💰 ' + K.formatPrice(info.comision) + '/suscrito</span>';
            if (info.tieneRifa) ph += '<span class="kx-emb-nivel-premio kx-emb-nivel-premio--rifa">🎟️ Rifa ' + info.rifaPorcentaje + '%</span>';
            if (myEmbajador.nivel === 'lider') ph += '<span class="kx-emb-nivel-premio kx-emb-nivel-premio--vip">👑 VIP</span>';
            premiosEl.innerHTML = ph;
        }

        if (info.nextName && info.nextMin) {
            var progress = Math.min(100, (total / info.nextMin) * 100);
            var remaining = Math.max(0, info.nextMin - total);
            if (fillEl) { fillEl.style.width = progress + '%'; fillEl.className = 'kx-emb-nivel-progress-fill'; }
            if (textEl) textEl.textContent = total + ' / ' + info.nextMin + ' para ' + info.nextName;
            if (descEl) descEl.textContent = remaining > 0 ? 'Te faltan ' + remaining + ' suscritos para ' + info.nextName : '¡Ya alcanzaste ' + info.nextName + '!';
        } else {
            if (fillEl) { fillEl.style.width = '100%'; fillEl.className = 'kx-emb-nivel-progress-fill kx-emb-nivel-progress-fill--gold'; }
            if (textEl) textEl.textContent = total + ' suscritos — ¡Nivel máximo!';
            if (descEl) descEl.textContent = '👑 ¡Eres un Líder KXON! Máximo nivel alcanzado';
        }

        var currentCalcNivel = calcNivel(total);
        if (previousNivel && currentCalcNivel !== previousNivel) {
            var newInfo = getNivelInfo(currentCalcNivel);
            launchConfetti();
            K.showToast('🎉 ¡Subiste a ' + newInfo.name + '! ' + newInfo.badge + ' — ' + newInfo.descripcionPremio, 'success');
            previousNivel = currentCalcNivel;
        }
    }

    /* ═══ BONO META ═══ */
    function renderBonoMeta() {
        var container = document.getElementById('embBonoMetaDashboard');
        if (!container) return;
        var refMes = getReferidosDelMes();
        setKPI('embStatBonoMes', refMes + '/mes');

        var h = '<div class="kx-emb-bono-dash-card">';
        h += '<div class="kx-emb-bono-dash-header"><span class="kx-emb-bono-dash-icon">💎</span><div>';
        h += '<div class="kx-emb-bono-dash-title">Bono Meta Mensual</div>';
        h += '<div class="kx-emb-bono-dash-subtitle">Suscritos este mes: ' + refMes + '</div>';
        h += '</div></div>';
        h += '<div class="kx-emb-bono-dash-items">';

        for (var i = 0; i < BONOS_META.length; i++) {
            var bono = BONOS_META[i];
            var earned = refMes >= bono.target;
            var progress = Math.min(100, (refMes / bono.target) * 100);
            var remaining = Math.max(0, bono.target - refMes);

            h += '<div class="kx-emb-bono-dash-item' + (earned ? ' kx-emb-bono-dash-item--earned' : '') + '">';
            h += '<div class="kx-emb-bono-dash-target">' + bono.emoji + ' ' + bono.label + '</div>';
            h += '<div class="kx-emb-bono-dash-amount">' + K.formatPrice(bono.bono) + '</div>';
            if (earned) {
                h += '<div class="kx-emb-bono-dash-earned-badge">✅ ¡Bono desbloqueado!</div>';
            } else {
                h += '<div class="kx-emb-bono-dash-progress-bar"><div class="kx-emb-bono-dash-progress-fill" style="width:' + progress + '%"></div></div>';
                h += '<div class="kx-emb-bono-dash-progress-text">' + refMes + '/' + bono.target + ' — Faltan ' + remaining + '</div>';
            }
            h += '</div>';
        }

        h += '</div></div>';
        container.innerHTML = h;
    }

    /* ═══ SHARE ═══ */
    function initShareButtons() {
        if (!myEmbajador) return;
        var link = window.location.origin + '/register.html?ref=' + encodeURIComponent(myEmbajador.codigo);

        var tgBtn = document.getElementById('embBtnTelegram');
        if (tgBtn) tgBtn.href = 'https://t.me/share/url?url=' + encodeURIComponent(link) + '&text=' + encodeURIComponent('🎵 ¡Únete a KXON!');

        var twBtn = document.getElementById('embBtnTwitter');
        if (twBtn) twBtn.href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent('🎵 Únete a KXON!\n\n' + link);

        var nativeBtn = document.getElementById('embBtnNativeShare');
        if (nativeBtn && navigator.share) {
            nativeBtn.style.display = 'inline-flex';
            nativeBtn.addEventListener('click', function () {
                navigator.share({ title: 'KXON', text: '🎵 Únete a KXON', url: link }).catch(function () { });
            });
        }
    }

    function requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            setTimeout(function () { Notification.requestPermission(); }, 5000);
        }
    }

    /* ═══ WEEKLY CHART ═══ */
    function renderWeeklyChart() {
        var container = document.getElementById('embChartBars');
        if (!container) return;
        var today = new Date();
        var days = [];
        var dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

        for (var i = 6; i >= 0; i--) {
            var d = new Date(today); d.setDate(d.getDate() - i);
            days.push({ date: d.toISOString().split('T')[0], dayName: dayNames[d.getDay()], count: 0 });
        }

        if (myReferidos && myReferidos.length) {
            for (var j = 0; j < myReferidos.length; j++) {
                var refDate = myReferidos[j].fecha_registro;
                if (refDate) {
                    var refDay = refDate.split('T')[0];
                    for (var k = 0; k < days.length; k++) { if (days[k].date === refDay) { days[k].count++; break; } }
                }
            }
        }

        var counts = [];
        for (var m = 0; m < days.length; m++) counts.push(days[m].count);
        var maxCount = Math.max(1, Math.max.apply(null, counts));

        var h = '';
        for (var n = 0; n < days.length; n++) {
            var day = days[n];
            var heightPct = Math.max(3, (day.count / maxCount) * 100);
            var isToday = n === days.length - 1;
            h += '<div class="kx-emb-chart-bar-wrap"><div class="kx-emb-chart-bar" style="height:' + heightPct + '%"><span class="kx-emb-chart-bar-value">' + day.count + '</span></div>';
            h += '<span class="kx-emb-chart-bar-day"' + (isToday ? ' style="color:#a78bfa;font-weight:700"' : '') + '>' + (isToday ? 'Hoy' : day.dayName) + '</span></div>';
        }
        container.innerHTML = h;
    }

    /* ═══ EVENT LISTENERS ═══ */
    var listenersInitialized = false;
    function initEventListeners() {
        if (listenersInitialized) return;
        listenersInitialized = true;

        var btnActivar = document.getElementById('btnActivarEmbajador');
        if (btnActivar) btnActivar.addEventListener('click', handleActivate);

        var btnCopyCodigo = document.getElementById('btnCopyCodigo');
        if (btnCopyCodigo) btnCopyCodigo.addEventListener('click', function () { if (myEmbajador) copyWithFeedback(myEmbajador.codigo, this, '📋 Código copiado'); });

        var btnCopyLink = document.getElementById('btnCopyLink');
        if (btnCopyLink) btnCopyLink.addEventListener('click', function () {
            if (myEmbajador) copyWithFeedback(window.location.origin + '/register.html?ref=' + encodeURIComponent(myEmbajador.codigo), this, '🔗 Link copiado');
        });

        var btnCopyAll = document.getElementById('embBtnCopyAll');
        if (btnCopyAll) btnCopyAll.addEventListener('click', function () {
            if (!myEmbajador) return;
            var link = window.location.origin + '/register.html?ref=' + encodeURIComponent(myEmbajador.codigo);
            copyWithFeedback('🎵 ¡Únete a KXON!\n\n🔗 ' + link + '\n\n📌 Código: ' + myEmbajador.codigo, this, '📋 Mensaje copiado');
        });

        var panelEl = document.getElementById('panel-embajadores');
        if (panelEl) panelEl.addEventListener('click', handleAdminClick);
    }

    /* ═══ ACTIVATE ═══ */
    async function handleActivate() {
        if (myEmbajador) { K.showToast('Ya eres embajador', 'info'); return; }
        var btn = document.getElementById('btnActivarEmbajador');
        if (!btn) return;
        btn.classList.add('loading'); btn.disabled = true;

        try {
            var nombre = (K.currentProfile && K.currentProfile.full_name) || K.currentUser.email.split('@')[0];
            var codigo;
            try {
                var codeResult = await db.rpc('generar_codigo_embajador', { nombre: nombre });
                if (codeResult.error) throw codeResult.error;
                codigo = codeResult.data;
            } catch (codeErr) {
                var clean = nombre.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8).toUpperCase();
                if (!clean) clean = 'USER';
                codigo = 'KXON-' + clean + '-' + Math.floor(Math.random() * 9999).toString().padStart(4, '0');
            }

            var insertResult = await db.from('embajadores').insert({
                usuario_id: K.currentUser.id, usuario_email: K.currentUser.email, usuario_nombre: nombre,
                codigo: codigo, estado: 'activo', nivel: 'activador',
                total_registrados: 0, total_suscritos: 0, comision_acumulada: 0, comision_pagada: 0
            }).select().single();
            if (insertResult.error) throw insertResult.error;

            myEmbajador = insertResult.data;
            previousNivel = 'activador';
            launchConfetti();
            K.showToast('🏆 ¡Ya eres Embajador KXON! Gana $1,500 por cada suscrito', 'success');
            sendWelcomeEmail(K.currentUser.email, nombre, codigo);
            showDashboardView(); initShareButtons(); renderWeeklyChart(); renderBonoMeta();
            await loadRanking(); requestNotificationPermission();
        } catch (e) {
            console.error('Error activating:', e);
            if (e.message && e.message.indexOf('duplicate') >= 0) { K.showToast('Ya tienes cuenta de embajador', 'error'); K.loadEmbajadores(); }
            else K.showToast('Error: ' + e.message, 'error');
        }
        btn.classList.remove('loading'); btn.disabled = false;
    }

    /* ═══ LOAD REFERIDOS ═══ */
    async function loadMyReferidos() {
        if (!myEmbajador) return;
        try {
            var r = await db.from('referidos').select('*').eq('embajador_id', myEmbajador.id).order('fecha_registro', { ascending: false });
            if (r.error) throw r.error;
            myReferidos = r.data || [];
            renderReferidos();
            renderBonoMeta();
        } catch (e) { console.error('Error loading referidos:', e); }
    }

    function renderReferidos() {
        var container = document.getElementById('embReferidosList');
        var countEl = document.getElementById('embReferidosCount');
        if (countEl) countEl.textContent = myReferidos.length + ' personas';
        if (!container) return;

        if (!myReferidos.length) {
            container.innerHTML = '<div class="kx-emb-referidos-empty"><div class="kx-emb-referidos-empty-icon">👥</div><div class="kx-emb-referidos-empty-title">Sin referidos aún</div><div class="kx-emb-referidos-empty-text">Comparte tu código para empezar a ganar</div></div>';
            return;
        }

        var info = getNivelInfo(myEmbajador ? myEmbajador.nivel : 'activador');
        var h = '';
        for (var i = 0; i < myReferidos.length; i++) {
            var ref = myReferidos[i];
            var nombre = ref.referido_nombre || ref.referido_email.split('@')[0];
            var inicial = esc(nombre.charAt(0).toUpperCase());
            var isSuscrito = ref.estado === 'suscrito';

            h += '<div class="kx-emb-ref-item" role="listitem">';
            h += '<div class="kx-emb-ref-avatar">' + inicial + '</div>';
            h += '<div class="kx-emb-ref-info"><div class="kx-emb-ref-name">' + esc(nombre) + '</div>';
            h += '<div class="kx-emb-ref-meta"><span class="kx-emb-ref-email">' + esc(ref.referido_email) + '</span>';
            if (isSuscrito && ref.plan_nombre) h += '<span class="kx-emb-ref-plan">' + esc(ref.plan_nombre) + '</span>';
            h += '</div></div>';

            h += '<div class="kx-emb-ref-right">';
            h += '<span class="kx-emb-ref-status ' + (isSuscrito ? 'kx-emb-ref-status--suscrito' : 'kx-emb-ref-status--registrado') + '">' + (isSuscrito ? '✅ Suscrito' : '⏳ Registrado') + '</span>';
            if (isSuscrito) {
                h += '<span class="kx-emb-ref-comision">+' + K.formatPrice(ref.comision_generada > 0 ? ref.comision_generada : info.comision) + '</span>';
                if (info.tieneRifa) h += '<span class="kx-emb-ref-rifa-badge">🎟️ +1 rifa</span>';
            }
            h += '<span class="kx-emb-ref-date">' + esc(formatDate(ref.fecha_registro)) + '</span>';
            h += '</div></div>';
        }
        container.innerHTML = h;
    }

    /* ═══ HISTORIAL ═══ */
    async function loadHistorial() {
        if (!myEmbajador) return;
        var section = document.getElementById('embHistorialSection');
        var container = document.getElementById('embHistorialList');
        if (!container) return;

        try {
            var r = await db.from('historial_recompensas').select('*').eq('embajador_id', myEmbajador.id).order('created_at', { ascending: false }).limit(20);
            if (r.error) { if (section) section.style.display = 'none'; return; }
            var items = r.data || [];
            if (!items.length) { if (section) section.style.display = 'none'; return; }
            if (section) section.style.display = 'block';

            var countEl = document.getElementById('embHistorialCount');
            if (countEl) countEl.textContent = items.length + ' registros';

            var h = '';
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                var tipo = item.tipo || 'comision';
                var icon = tipo === 'rifa' ? '🎰' : tipo === 'pago' ? '💰' : tipo === 'bono' ? '💎' : '💵';
                var amtClass = tipo === 'rifa' ? '--rifa' : tipo === 'bono' ? '--bono' : '--positive';

                h += '<div class="kx-emb-historial-item">';
                h += '<div class="kx-emb-historial-item-icon kx-emb-historial-item-icon--' + tipo + '">' + icon + '</div>';
                h += '<div class="kx-emb-historial-item-info"><div class="kx-emb-historial-item-desc">' + esc(item.descripcion) + '</div>';
                h += '<div class="kx-emb-historial-item-date">' + formatDateLong(item.created_at) + '</div></div>';
                if (item.monto > 0) h += '<span class="kx-emb-historial-item-amount kx-emb-historial-item-amount' + amtClass + '">+' + K.formatPrice(item.monto) + '</span>';
                if (item.estado) h += '<span class="kx-emb-historial-item-status kx-emb-historial-status--' + item.estado + '">' + esc(item.estado) + '</span>';
                h += '</div>';
            }
            container.innerHTML = h;
        } catch (e) { console.error('Error loading historial:', e); if (section) section.style.display = 'none'; }
    }

    /* ═══ RANKING ═══ */
    async function loadRanking() {
        try {
            var r = await db.from('embajadores').select('id, usuario_id, usuario_nombre, nivel, total_suscritos, total_registrados').eq('estado', 'activo').order('total_suscritos', { ascending: false }).limit(20);
            if (r.error) throw r.error;
            allEmbajadores = r.data || [];
            renderRanking();
        } catch (e) { console.error('Error loading ranking:', e); }
    }

    function renderRanking() {
        var container = document.getElementById('embRankingList');
        var subtitleEl = document.getElementById('embRankingSubtitle');
        if (subtitleEl) subtitleEl.textContent = allEmbajadores.length + ' embajadores activos';
        if (!container) return;

        if (!allEmbajadores.length) {
            container.innerHTML = '<div class="kx-emb-ranking-empty"><div class="kx-emb-ranking-empty-icon">🏆</div><div class="kx-emb-ranking-empty-title">Sin embajadores aún</div><div class="kx-emb-ranking-empty-text">¡Sé el primero!</div></div>';
            return;
        }

        var h = '';
        for (var i = 0; i < allEmbajadores.length; i++) {
            var emb = allEmbajadores[i];
            var info = getNivelInfo(emb.nivel);
            var nombre = emb.usuario_nombre || 'Embajador';
            var inicial = esc(nombre.charAt(0).toUpperCase());
            var pos = i + 1;
            var isMe = myEmbajador && emb.id === myEmbajador.id;
            var posBadge = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : '#' + pos;
            var cls = 'kx-emb-rank-item' + (isMe ? ' kx-emb-rank-item--me' : '') + (pos <= 3 ? ' kx-emb-rank-item--top' : '');

            h += '<div class="' + cls + '" style="animation-delay:' + (i * 0.03) + 's">';
            h += '<div class="kx-emb-rank-position">' + posBadge + '</div>';
            h += '<div class="kx-emb-rank-avatar" style="border-color:' + info.color + '">' + inicial + '</div>';
            h += '<div class="kx-emb-rank-info"><div class="kx-emb-rank-name">' + esc(nombre);
            if (isMe) h += ' <span class="kx-emb-rank-me-badge">TÚ</span>';
            h += '</div><div class="kx-emb-rank-meta">';
            h += '<span class="kx-emb-rank-nivel-badge" style="color:' + info.color + '">' + info.badge + ' ' + info.name + '</span>';
            h += '<span class="kx-emb-rank-comision-tag">💰 ' + K.formatPrice(info.comision) + '</span>';
            if (info.tieneRifa) h += '<span class="kx-emb-rank-rifa-tag">🎟️ Rifa ' + info.rifaPorcentaje + '%</span>';
            h += '</div></div>';
            h += '<div class="kx-emb-rank-stats"><span class="kx-emb-rank-suscritos">' + (emb.total_suscritos || 0) + '</span><span class="kx-emb-rank-stats-label">suscritos</span></div>';
            h += '</div>';
        }
        container.innerHTML = h;
    }

    /* ═══ ADMIN ═══ */
    function handleAdminClick(e) {
        var target = e.target;
        var pauseBtn = target.closest('[data-action="pause-emb"]');
        if (pauseBtn) { e.preventDefault(); e.stopPropagation(); toggleEmbajadorEstado(pauseBtn.getAttribute('data-emb-id'), 'pausado'); return; }
        var activateBtn = target.closest('[data-action="activate-emb"]');
        if (activateBtn) { e.preventDefault(); e.stopPropagation(); toggleEmbajadorEstado(activateBtn.getAttribute('data-emb-id'), 'activo'); return; }
        var payBtn = target.closest('[data-action="pay-emb"]');
        if (payBtn) { e.preventDefault(); e.stopPropagation(); markComisionPaid(payBtn.getAttribute('data-emb-id'), payBtn.getAttribute('data-emb-name'), parseInt(payBtn.getAttribute('data-emb-comision')) || 0, parseInt(payBtn.getAttribute('data-emb-pagada')) || 0); return; }
    }

    async function loadAdminSection() {
        if (!K.isAdmin) return;
        var section = document.getElementById('embAdminSection');
        if (section) section.style.display = 'block';

        try {
            var r = await db.from('embajadores').select('*').order('total_suscritos', { ascending: false });
            if (r.error) throw r.error;
            var allEmb = r.data || [];
            var totalEmb = allEmb.length, totalRef = 0, totalSusc = 0, totalComision = 0;
            for (var i = 0; i < allEmb.length; i++) { totalRef += allEmb[i].total_registrados || 0; totalSusc += allEmb[i].total_suscritos || 0; totalComision += allEmb[i].comision_acumulada || 0; }
            setKPI('embAdminTotalEmb', String(totalEmb));
            setKPI('embAdminTotalRef', String(totalRef));
            setKPI('embAdminTotalSusc', String(totalSusc));
            setKPI('embAdminTotalComision', K.formatPrice(totalComision));
            var countEl = document.getElementById('embAdminCount');
            if (countEl) countEl.textContent = totalEmb + ' embajadores';
            renderAdminList(allEmb);
        } catch (e) { console.error('Error loading admin:', e); }
    }

    function renderAdminList(embs) {
        var container = document.getElementById('embAdminList');
        if (!container) return;
        if (!embs.length) { container.innerHTML = '<div class="kx-emb-admin-empty"><div class="kx-emb-admin-empty-icon">📋</div><div class="kx-emb-admin-empty-title">Sin embajadores</div></div>'; return; }

        var h = '';
        for (var i = 0; i < embs.length; i++) {
            var emb = embs[i]; var info = getNivelInfo(emb.nivel);
            var nombre = emb.usuario_nombre || 'Sin nombre';
            var inicial = esc(nombre.charAt(0).toUpperCase());
            var isActivo = emb.estado === 'activo';
            var comisionPendiente = (emb.comision_acumulada || 0) - (emb.comision_pagada || 0);

            h += '<div class="kx-emb-admin-item" data-emb-id="' + esc(emb.id) + '">';
            h += '<div class="kx-emb-admin-item-avatar" style="border-color:' + info.color + '">' + inicial + '</div>';
            h += '<div class="kx-emb-admin-item-info"><div class="kx-emb-admin-item-name">' + esc(nombre) + '</div>';
            h += '<div class="kx-emb-admin-item-meta"><span class="kx-emb-admin-item-email">' + esc(emb.usuario_email) + '</span><span class="kx-emb-admin-item-code">' + esc(emb.codigo) + '</span></div></div>';
            h += '<div class="kx-emb-admin-item-stats">';
            h += '<span class="kx-emb-admin-item-nivel" style="color:' + info.color + '">' + info.badge + ' ' + info.name + '</span>';
            h += '<span class="kx-emb-admin-item-count">' + (emb.total_suscritos || 0) + ' susc. / ' + (emb.total_registrados || 0) + ' reg.</span>';
            if (comisionPendiente > 0) h += '<span class="kx-emb-admin-item-comision">Pendiente: ' + K.formatPrice(comisionPendiente) + '</span>';
            else h += '<span class="kx-emb-admin-item-comision-paid">✅ Sin deuda</span>';
            if (info.tieneRifa) h += '<span class="kx-emb-admin-item-rifa">🎟️ Rifa ' + info.rifaPorcentaje + '%</span>';
            h += '</div>';
            h += '<div class="kx-emb-admin-item-actions">';
            if (isActivo) h += '<button class="kx-emb-admin-btn kx-emb-admin-btn--pause" data-action="pause-emb" data-emb-id="' + esc(emb.id) + '" title="Pausar"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg></button>';
            else h += '<button class="kx-emb-admin-btn kx-emb-admin-btn--activate" data-action="activate-emb" data-emb-id="' + esc(emb.id) + '" title="Activar"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg></button>';
            if (comisionPendiente > 0) h += '<button class="kx-emb-admin-btn kx-emb-admin-btn--pay" data-action="pay-emb" data-emb-id="' + esc(emb.id) + '" data-emb-name="' + esc(nombre) + '" data-emb-comision="' + (emb.comision_acumulada || 0) + '" data-emb-pagada="' + (emb.comision_pagada || 0) + '" title="Pagar"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></button>';
            h += '</div>';
            h += '<span class="kx-emb-admin-item-date">' + esc(formatDate(emb.created_at)) + '</span>';
            h += '<span class="kx-emb-admin-item-estado kx-emb-admin-estado--' + esc(emb.estado) + '">' + esc(emb.estado) + '</span>';
            h += '</div>';
        }
        container.innerHTML = h;
    }

    async function toggleEmbajadorEstado(embId, nuevoEstado) {
        if (!embId) return;
        if (!confirm('¿' + (nuevoEstado === 'activo' ? 'Activar' : 'Pausar') + ' este embajador?')) return;
        try {
            var upd = await db.from('embajadores').update({ estado: nuevoEstado, updated_at: new Date().toISOString() }).eq('id', embId);
            if (upd.error) throw upd.error;
            K.showToast('Embajador ' + (nuevoEstado === 'activo' ? 'activado' : 'pausado'), 'success');
            await loadAdminSection(); await loadRanking();
        } catch (e) { K.showToast('Error: ' + e.message, 'error'); }
    }

    async function markComisionPaid(embId, nombre, comisionTotal, comisionPagada) {
        if (!embId) return;
        var pendiente = comisionTotal - comisionPagada;
        if (pendiente <= 0) { K.showToast('Sin comisiones pendientes', 'info'); return; }
        if (!confirm('¿Marcar como pagada la comisión de ' + nombre + '?\nPendiente: ' + K.formatPrice(pendiente))) return;
        try {
            var upd = await db.from('embajadores').update({ comision_pagada: comisionTotal, updated_at: new Date().toISOString() }).eq('id', embId);
            if (upd.error) throw upd.error;
            K.showToast('✅ Pagado: ' + K.formatPrice(pendiente), 'success');
            await loadAdminSection();
        } catch (e) { K.showToast('Error: ' + e.message, 'error'); }
    }

    /* ═══ EMAILS ═══ */
    function sendWelcomeEmail(email, nombre, codigo) {
        if (!window.emailjs) return;
        window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_WELCOME, {
            to_email: email, nombre: nombre, codigo: codigo,
            link: window.location.origin + '/register.html?ref=' + encodeURIComponent(codigo)
        }).then(function () { console.log('✅ Welcome email sent'); }).catch(function (err) { console.warn('⚠️ Email error:', err); });
    }

    K.sendReferidoEmail = function (embajadorEmail, embajadorNombre, referidoNombre, referidoEmail, planNombre, nivelActual, totalSuscritos) {
        if (!window.emailjs) return;
        var info = getNivelInfo(nivelActual);
        var rewardDesc = 'Comisión de +$' + info.comision.toLocaleString('es-CO') + ' COP';
        if (info.tieneRifa) rewardDesc += ' + Cuenta para rifa del ' + info.rifaPorcentaje + '%';

        window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_REFERIDO, {
            to_email: embajadorEmail, embajador_nombre: embajadorNombre,
            referido_nombre: referidoNombre, referido_email: referidoEmail, plan_nombre: planNombre,
            reward_type: 'Comisión Ganada', reward_color: '#34c759',
            reward_value: '+$' + info.comision.toLocaleString('es-CO') + ' COP',
            reward_desc: rewardDesc, total_suscritos: String(totalSuscritos),
            nivel_badge: info.badge, nivel_name: info.name, nivel_color: info.color,
            dashboard_link: window.location.origin + '/dashboard.html'
        }).then(function () { console.log('✅ Referido email sent'); }).catch(function (err) { console.warn('⚠️ Email error:', err); });
    };

    K.notifyReferidoSuscrito = function (embajadorId, referidoNombre, planNombre) {
        if (myEmbajador && myEmbajador.id === embajadorId) {
            var info = getNivelInfo(myEmbajador.nivel);
            K.showToast('🎉 ¡' + referidoNombre + ' se suscribió! +' + K.formatPrice(info.comision), 'success');
        }
        if ('Notification' in window && Notification.permission === 'granted') {
            try { new Notification('¡Nuevo suscrito! 🎉', { body: referidoNombre + ' — ' + planNombre, icon: '/icons/icon-192.png', tag: 'ref-' + Date.now() }); } catch (e) { }
        }
    };

})();