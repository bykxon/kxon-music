/* ============================================
   🏆 DASHBOARD-EMBAJADORES.JS — KXON 2026
   Panel de embajadores, referidos, ranking
   Namespace: kx-emb-*
   ============================================ */
(function () {
    'use strict';

    var db = window.db;
    var K = window.KXON;

    /* ═══ GUARDS ═══ */
    if (!K) {
        console.error('KXON namespace not found');
        return;
    }

    if (!K.formatPrice) {
        K.formatPrice = function (amount) {
            return '$' + (amount || 0).toLocaleString('es-CO');
        };
    }

    /* ═══ EMAILJS CONFIG ═══ */
    var EMAILJS_PUBLIC_KEY = 'JgRyKiNEcoF5oOEjV';
    var EMAILJS_SERVICE_ID = 'service_rdsr8wb';
    var EMAILJS_TEMPLATE_WELCOME = 'template_76gbiq7';
    var EMAILJS_TEMPLATE_REFERIDO = 'template_9b3995p';

    if (window.emailjs) {
        window.emailjs.init(EMAILJS_PUBLIC_KEY);
    }

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

    function setKPI(id, value) {
        var el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    function showSkeletons(containerId, count) {
        var container = document.getElementById(containerId);
        if (!container) return;
        var h = '';
        for (var i = 0; i < (count || 3); i++) {
            h += '<div class="kx-emb-skeleton-item">';
            h += '<div class="kx-emb-skeleton kx-emb-skeleton-avatar"></div>';
            h += '<div style="flex:1">';
            h += '<div class="kx-emb-skeleton kx-emb-skeleton-line kx-emb-skeleton-line--short"></div>';
            h += '<div class="kx-emb-skeleton kx-emb-skeleton-line kx-emb-skeleton-line--tiny"></div>';
            h += '</div>';
            h += '</div>';
        }
        container.innerHTML = h;
    }

    /* ═══ CLIPBOARD ═══ */
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

    function copyWithFeedback(text, buttonEl, toastMsg) {
        copyToClipboard(text);
        if (buttonEl) {
            buttonEl.classList.add('copied');
            var spanEl = buttonEl.querySelector('span');
            var originalText = '';
            if (spanEl) {
                originalText = spanEl.textContent;
                spanEl.textContent = '✓ Copiado';
            }
            setTimeout(function () {
                buttonEl.classList.remove('copied');
                if (spanEl && originalText) {
                    spanEl.textContent = originalText;
                }
            }, 1500);
        }
        if (toastMsg) K.showToast(toastMsg, 'success');
    }

    /* ═══ CONFETTI ═══ */
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
        setTimeout(function () {
            container.classList.remove('active');
            container.innerHTML = '';
        }, 3000);
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
            descripcionPremio: '$3,000 COP por suscrito',
            descripcionCorta: 'Comisión directa por cada persona que se suscriba'
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
            descripcionPremio: 'Rifa del 10% mensual',
            descripcionCorta: 'Participas en la rifa del 10% de ingresos del mes'
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
            descripcionPremio: 'Rifa GRANDE del 20%',
            descripcionCorta: 'Participas en el PREMIO GRANDE — 20% de ingresos'
        }
    };

    function getNivelInfo(nivel) {
        return NIVELES[nivel] || NIVELES.activador;
    }

    function calcNivel(totalSuscritos) {
        if (totalSuscritos >= 15) return 'lider';
        if (totalSuscritos >= 6) return 'constructor';
        return 'activador';
    }

    /* ══════════════════════════════════════════
       🏆 LOAD EMBAJADORES (Main Entry)
       ══════════════════════════════════════════ */
    K.loadEmbajadores = async function () {
        if (!K.currentUser || !K.currentUser.id) {
            console.warn('No hay usuario autenticado para embajadores');
            return;
        }

        // Show skeletons while loading
        showSkeletons('embRankingList', 5);
        showSkeletons('embReferidosList', 3);

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
                previousNivel = myEmbajador.nivel;
                showDashboardView();
                await loadMyReferidos();
                await loadHistorial();
                renderWeeklyChart();
                initShareButtons();
                requestNotificationPermission();
            } else {
                showActivateView();
            }

            // 3) Load ranking (visible for everyone)
            await loadRanking();

            // 4) Admin section
            if (K.isAdmin) {
                await loadAdminSection();
            }

            // 5) Init event listeners
            initEventListeners();

        } catch (e) {
            console.error('Error loading embajadores:', e);
            K.showToast('Error cargando embajadores', 'error');
        }
    };

    /* ══════════════════════════════════════════
       📋 SHOW ACTIVATE VIEW
       ══════════════════════════════════════════ */
    function showActivateView() {
        var activateView = document.getElementById('embActivateView');
        var dashView = document.getElementById('embDashboardView');
        var kpis = document.getElementById('embKPIs');

        if (activateView) activateView.style.display = 'block';
        if (dashView) dashView.style.display = 'none';
        if (kpis) kpis.style.display = 'none';

        setKPI('embStatRegistrados', '0');
        setKPI('embStatSuscritos', '0');
        setKPI('embStatNivel', '—');
        setKPI('embStatComision', '$0');
    }

    /* ══════════════════════════════════════════
       📊 SHOW DASHBOARD VIEW
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

        // Code and Link
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
        var premioEl = document.getElementById('embNivelPremio');

        if (badgeEl) badgeEl.textContent = info.badge;
        if (nameEl) nameEl.textContent = info.name;

        if (cardEl) {
            cardEl.className = 'kx-emb-nivel-card kx-emb-nivel-card--' + myEmbajador.nivel;
        }

        // Premio badge
        if (premioEl) {
            premioEl.textContent = info.descripcionPremio;
            premioEl.className = 'kx-emb-nivel-premio ' +
                (info.comision > 0 ? 'kx-emb-nivel-premio--comision' : 'kx-emb-nivel-premio--rifa');
        }

        if (info.nextName && info.nextMin) {
            var progress = Math.min(100, (total / info.nextMin) * 100);
            var remaining = Math.max(0, info.nextMin - total);

            if (fillEl) fillEl.style.width = progress + '%';
            if (textEl) textEl.textContent = total + ' / ' + info.nextMin + ' para ' + info.nextName;
            if (descEl) descEl.textContent = remaining > 0
                ? 'Te faltan ' + remaining + ' suscritos para ' + info.nextName
                : '¡Ya alcanzaste el nivel ' + info.nextName + '!';
        } else {
            if (fillEl) fillEl.style.width = '100%';
            if (textEl) textEl.textContent = total + ' suscritos — ¡Nivel máximo!';
            if (descEl) descEl.textContent = '¡Felicidades! Eres un Líder KXON 🏆';
        }

        // Check for level up
        var currentCalcNivel = calcNivel(total);
        if (previousNivel && currentCalcNivel !== previousNivel) {
            var newInfo = getNivelInfo(currentCalcNivel);
            launchConfetti();
            K.showToast('🎉 ¡Subiste a ' + newInfo.name + '! ' + newInfo.badge, 'success');
            previousNivel = currentCalcNivel;
        }
    }

    /* ══════════════════════════════════════════
       📋 INIT SHARE BUTTONS
       ══════════════════════════════════════════ */
    function initShareButtons() {
        if (!myEmbajador) return;

        var link = window.location.origin + '/register.html?ref=' + encodeURIComponent(myEmbajador.codigo);
        var msg = '🎵 ¡Únete a KXON, la plataforma musical exclusiva!\n\n🔗 ' + link;

        // Telegram
        var tgBtn = document.getElementById('embBtnTelegram');
        if (tgBtn) {
            tgBtn.href = 'https://t.me/share/url?url=' + encodeURIComponent(link) +
                '&text=' + encodeURIComponent('🎵 ¡Únete a KXON, la plataforma musical exclusiva!');
        }

        // Twitter/X
        var twBtn = document.getElementById('embBtnTwitter');
        if (twBtn) {
            twBtn.href = 'https://twitter.com/intent/tweet?text=' +
                encodeURIComponent('🎵 Únete a KXON, la plataforma musical exclusiva!\n\n' + link);
        }

        // Native Share API
        var nativeBtn = document.getElementById('embBtnNativeShare');
        if (nativeBtn) {
            if (navigator.share) {
                nativeBtn.style.display = 'inline-flex';
                nativeBtn.addEventListener('click', function () {
                    navigator.share({
                        title: 'KXON — Plataforma Musical',
                        text: '🎵 Únete a KXON con mi código de embajador',
                        url: link
                    }).catch(function () { });
                });
            }
        }
    }

    /* ══════════════════════════════════════════
       🔔 NOTIFICATION PERMISSION
       ══════════════════════════════════════════ */
    function requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            setTimeout(function () {
                Notification.requestPermission();
            }, 5000);
        }
    }

    /* ══════════════════════════════════════════
       📊 WEEKLY CHART
       ══════════════════════════════════════════ */
    function renderWeeklyChart() {
        var container = document.getElementById('embChartBars');
        if (!container) return;

        var today = new Date();
        var days = [];
        var dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

        for (var i = 6; i >= 0; i--) {
            var d = new Date(today);
            d.setDate(d.getDate() - i);
            days.push({
                date: d.toISOString().split('T')[0],
                dayName: dayNames[d.getDay()],
                count: 0
            });
        }

        if (myReferidos && myReferidos.length) {
            for (var j = 0; j < myReferidos.length; j++) {
                var refDate = myReferidos[j].fecha_registro;
                if (refDate) {
                    var refDay = refDate.split('T')[0];
                    for (var k = 0; k < days.length; k++) {
                        if (days[k].date === refDay) {
                            days[k].count++;
                            break;
                        }
                    }
                }
            }
        }

        var counts = [];
        for (var m = 0; m < days.length; m++) {
            counts.push(days[m].count);
        }
        var maxCount = Math.max(1, Math.max.apply(null, counts));

        var h = '';
        for (var n = 0; n < days.length; n++) {
            var day = days[n];
            var heightPct = Math.max(3, (day.count / maxCount) * 100);
            var isToday = n === days.length - 1;

            h += '<div class="kx-emb-chart-bar-wrap">';
            h += '<div class="kx-emb-chart-bar" style="height:' + heightPct + '%">';
            h += '<span class="kx-emb-chart-bar-value">' + day.count + '</span>';
            h += '</div>';
            h += '<span class="kx-emb-chart-bar-day"' + (isToday ? ' style="color:#a78bfa;font-weight:700"' : '') + '>';
            h += isToday ? 'Hoy' : day.dayName;
            h += '</span>';
            h += '</div>';
        }

        container.innerHTML = h;
    }

    /* ══════════════════════════════════════════
       🎯 EVENT LISTENERS
       ══════════════════════════════════════════ */
    var listenersInitialized = false;

    function initEventListeners() {
        if (listenersInitialized) return;
        listenersInitialized = true;

        // Activate button
        var btnActivar = document.getElementById('btnActivarEmbajador');
        if (btnActivar) {
            btnActivar.addEventListener('click', handleActivate);
        }

        // Copy buttons
        var btnCopyCodigo = document.getElementById('btnCopyCodigo');
        if (btnCopyCodigo) {
            btnCopyCodigo.addEventListener('click', function () {
                if (!myEmbajador) return;
                copyWithFeedback(myEmbajador.codigo, this, '📋 Código copiado');
            });
        }

        var btnCopyLink = document.getElementById('btnCopyLink');
        if (btnCopyLink) {
            btnCopyLink.addEventListener('click', function () {
                if (!myEmbajador) return;
                var link = window.location.origin + '/register.html?ref=' + encodeURIComponent(myEmbajador.codigo);
                copyWithFeedback(link, this, '🔗 Link copiado');
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
                copyWithFeedback(msg, this, '📋 Mensaje completo copiado');
            });
        }

        // Admin event delegation
        var panelEl = document.getElementById('panel-embajadores');
        if (panelEl) {
            panelEl.addEventListener('click', handleAdminClick);
        }
    }

    /* ══════════════════════════════════════════
       🚀 ACTIVATE AS AMBASSADOR
       ══════════════════════════════════════════ */
    async function handleActivate() {
        if (myEmbajador) {
            K.showToast('Ya eres embajador', 'info');
            return;
        }

        var btn = document.getElementById('btnActivarEmbajador');
        if (!btn) return;

        btn.classList.add('loading');
        btn.disabled = true;

        try {
            var nombre = (K.currentProfile && K.currentProfile.full_name) ||
                K.currentUser.email.split('@')[0];

            // Generate unique code
            var codigo;
            try {
                var codeResult = await db.rpc('generar_codigo_embajador', {
                    nombre: nombre
                });
                if (codeResult.error) throw codeResult.error;
                codigo = codeResult.data;
            } catch (codeErr) {
                var clean = nombre.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8).toUpperCase();
                if (!clean) clean = 'USER';
                codigo = 'KXON-' + clean + '-' + Math.floor(Math.random() * 9999).toString().padStart(4, '0');
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
            previousNivel = 'activador';

            launchConfetti();
            K.showToast('🏆 ¡Ya eres Embajador KXON! Comparte tu código', 'success');
            sendWelcomeEmail(K.currentUser.email, nombre, codigo);

            showDashboardView();
            initShareButtons();
            renderWeeklyChart();
            await loadRanking();
            requestNotificationPermission();

        } catch (e) {
            console.error('Error activating ambassador:', e);

            if (e.message && e.message.indexOf('duplicate') >= 0) {
                K.showToast('Ya tienes una cuenta de embajador', 'error');
                K.loadEmbajadores();
            } else {
                K.showToast('Error: ' + e.message, 'error');
            }
        }

        btn.classList.remove('loading');
        btn.disabled = false;
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
       📜 LOAD HISTORIAL
       ══════════════════════════════════════════ */
    async function loadHistorial() {
        if (!myEmbajador) return;

        var section = document.getElementById('embHistorialSection');
        var container = document.getElementById('embHistorialList');
        if (!container) return;

        try {
            var r = await db.from('historial_recompensas')
                .select('*')
                .eq('embajador_id', myEmbajador.id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (r.error) {
                // Table might not exist yet — hide section silently
                if (section) section.style.display = 'none';
                return;
            }

            var items = r.data || [];

            if (!items.length) {
                if (section) section.style.display = 'none';
                return;
            }

            if (section) section.style.display = 'block';

            var countEl = document.getElementById('embHistorialCount');
            if (countEl) countEl.textContent = items.length + ' registros';

            var h = '';
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                var iconClass = 'kx-emb-historial-item-icon--' + (item.tipo || 'comision');
                var icon = item.tipo === 'rifa' ? '🎰' : item.tipo === 'pago' ? '💰' : '💵';
                var amountClass = item.tipo === 'rifa' ? 'kx-emb-historial-item-amount--rifa' : 'kx-emb-historial-item-amount--positive';

                h += '<div class="kx-emb-historial-item">';
                h += '<div class="kx-emb-historial-item-icon ' + iconClass + '">' + icon + '</div>';
                h += '<div class="kx-emb-historial-item-info">';
                h += '<div class="kx-emb-historial-item-desc">' + esc(item.descripcion) + '</div>';
                h += '<div class="kx-emb-historial-item-date">' + formatDateLong(item.created_at) + '</div>';
                h += '</div>';

                if (item.monto > 0) {
                    h += '<span class="kx-emb-historial-item-amount ' + amountClass + '">+' + K.formatPrice(item.monto) + '</span>';
                }

                if (item.estado) {
                    var statusClass = item.estado === 'pagado' ? 'kx-emb-historial-status--pagado' : 'kx-emb-historial-status--pendiente';
                    h += '<span class="kx-emb-historial-item-status ' + statusClass + '">' + esc(item.estado) + '</span>';
                }

                h += '</div>';
            }

            container.innerHTML = h;

        } catch (e) {
            console.error('Error loading historial:', e);
            if (section) section.style.display = 'none';
        }
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

            h += '<div class="' + itemClass + '" role="listitem" style="animation-delay:' + (i * 0.03) + 's">';
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
       🔧 ADMIN: CLICK HANDLER
       ══════════════════════════════════════════ */
    function handleAdminClick(e) {
        var target = e.target;

        var pauseBtn = target.closest('[data-action="pause-emb"]');
        if (pauseBtn) {
            e.preventDefault();
            e.stopPropagation();
            toggleEmbajadorEstado(pauseBtn.getAttribute('data-emb-id'), 'pausado');
            return;
        }

        var activateBtn = target.closest('[data-action="activate-emb"]');
        if (activateBtn) {
            e.preventDefault();
            e.stopPropagation();
            toggleEmbajadorEstado(activateBtn.getAttribute('data-emb-id'), 'activo');
            return;
        }

        var payBtn = target.closest('[data-action="pay-emb"]');
        if (payBtn) {
            e.preventDefault();
            e.stopPropagation();
            markComisionPaid(
                payBtn.getAttribute('data-emb-id'),
                payBtn.getAttribute('data-emb-name'),
                parseInt(payBtn.getAttribute('data-emb-comision')) || 0,
                parseInt(payBtn.getAttribute('data-emb-pagada')) || 0
            );
            return;
        }
    }

    /* ══════════════════════════════════════════
       🔧 ADMIN SECTION
       ══════════════════════════════════════════ */
    async function loadAdminSection() {
        if (!K.isAdmin) return;

        var section = document.getElementById('embAdminSection');
        if (section) section.style.display = 'block';

        try {
            var r = await db.from('embajadores')
                .select('*')
                .order('total_suscritos', { ascending: false });

            if (r.error) throw r.error;

            var allEmb = r.data || [];

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
            var comisionPendiente = (emb.comision_acumulada || 0) - (emb.comision_pagada || 0);

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

            h += '</div>';
            h += '<span class="kx-emb-admin-item-date">' + esc(fecha) + '</span>';
            h += '<span class="kx-emb-admin-item-estado kx-emb-admin-estado--' + esc(emb.estado) + '">' + esc(emb.estado) + '</span>';
            h += '</div>';
        }

        container.innerHTML = h;
    }

    /* ══════════════════════════════════════════
       🔧 ADMIN: TOGGLE ESTADO
       ══════════════════════════════════════════ */
    async function toggleEmbajadorEstado(embId, nuevoEstado) {
        if (!embId) return;
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
        if (!embId) return;
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

    /* ══════════════════════════════════════════
       📧 EMAIL: BIENVENIDA EMBAJADOR
       ══════════════════════════════════════════ */
    function sendWelcomeEmail(email, nombre, codigo) {
        if (!window.emailjs) {
            console.warn('EmailJS no disponible');
            return;
        }

        var link = window.location.origin + '/register.html?ref=' + encodeURIComponent(codigo);

        window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_WELCOME, {
            to_email: email,
            nombre: nombre,
            codigo: codigo,
            link: link
        }).then(function () {
            console.log('✅ Email de bienvenida enviado a', email);
        }).catch(function (err) {
            console.warn('⚠️ Error enviando email:', err);
        });
    }

    /* ══════════════════════════════════════════
       📧 EMAIL: REFERIDO SE SUSCRIBIÓ
       ══════════════════════════════════════════ */
    K.sendReferidoEmail = function (embajadorEmail, embajadorNombre, referidoNombre, referidoEmail, planNombre, nivelActual, totalSuscritos) {
        if (!window.emailjs) {
            console.warn('EmailJS no disponible');
            return;
        }

        var info = getNivelInfo(nivelActual);
        var rewardType, rewardColor, rewardValue, rewardDesc;

        if (info.comision > 0) {
            rewardType = 'Comisión Ganada';
            rewardColor = '#34c759';
            rewardValue = '+$' + info.comision.toLocaleString('es-CO') + ' COP';
            rewardDesc = 'Se sumó a tu comisión acumulada';
        } else if (info.tieneRifa) {
            rewardType = 'Suma para tu Rifa';
            rewardColor = '#ffd700';
            rewardValue = '🎰 Rifa del ' + info.rifaPorcentaje + '%';
            rewardDesc = 'Este suscrito cuenta para tu participación en la rifa mensual';
        } else {
            rewardType = 'Nuevo Suscrito';
            rewardColor = '#c0c0c0';
            rewardValue = '+1 Suscrito';
            rewardDesc = 'Suma a tu contador de referidos';
        }

        window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_REFERIDO, {
            to_email: embajadorEmail,
            embajador_nombre: embajadorNombre,
            referido_nombre: referidoNombre,
            referido_email: referidoEmail,
            plan_nombre: planNombre,
            reward_type: rewardType,
            reward_color: rewardColor,
            reward_value: rewardValue,
            reward_desc: rewardDesc,
            total_suscritos: String(totalSuscritos),
            nivel_badge: info.badge,
            nivel_name: info.name,
            nivel_color: info.color,
            dashboard_link: window.location.origin + '/dashboard.html'
        }).then(function () {
            console.log('✅ Email de referido enviado a', embajadorEmail);
        }).catch(function (err) {
            console.warn('⚠️ Error enviando email referido:', err);
        });
    };

    /* ══════════════════════════════════════════
       🔔 NOTIFY REFERIDO SUSCRITO
       ══════════════════════════════════════════ */
    K.notifyReferidoSuscrito = function (embajadorId, referidoNombre, planNombre) {
        if (myEmbajador && myEmbajador.id === embajadorId) {
            K.showToast('🎉 ¡' + referidoNombre + ' se suscribió a ' + planNombre + '!', 'success');
        }

        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                new Notification('¡Nuevo suscrito! 🎉', {
                    body: referidoNombre + ' se suscribió al plan ' + planNombre,
                    icon: '/icons/icon-192.png',
                    badge: '/icons/icon-96.png',
                    tag: 'referido-' + Date.now()
                });
            } catch (e) { }
        }
    };

})();