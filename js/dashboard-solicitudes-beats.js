/* ============================================
   📋 DASHBOARD-SOLICITUDES-BEATS.JS — KXON 2026
   Namespace: kx-req-*
   Sistema de solicitudes de beats personalizados
   Full redesign with event delegation, filters,
   search, sort, premium modals, skeleton loaders
   ============================================ */
(function () {
    'use strict';

    var db = window.db;

    /* ══════════════════════════════════════════
       HELPERS
       ══════════════════════════════════════════ */
    function $(id) { return document.getElementById(id); }

    function escapeHtml(str) {
        if (!str) return '';
        var d = document.createElement('div');
        d.appendChild(document.createTextNode(str));
        return d.innerHTML;
    }

    function waitForKXON(cb) {
        if (window.KXON && window.KXON.currentUser) cb();
        else setTimeout(function () { waitForKXON(cb); }, 50);
    }

    waitForKXON(function () { initSolicitudesBeats(); });

    function initSolicitudesBeats() {
        var K = window.KXON;

        /* ── State ── */
        var allSolicitudes = [];
        var currentFilter = 'todas';
        var currentSort = 'recent';
        var currentSearch = '';
        var respondingId = null;
        var rejectingId = null;

        /* ── DOM refs ── */
        var grid = $('solicitudesBeatsGrid');
        var searchInput = $('reqSearchInput');
        var searchClear = $('reqSearchClear');
        var activeFiltersWrap = $('reqActiveFilters');
        var activeFilterText = $('reqActiveFilterText');
        var resultsInfo = $('reqResultsInfo');
        var resultsText = $('reqResultsText');
        var sortDropdown = $('reqSortDropdown');
        var sortLabel = $('reqSortLabel');

        /* ══════════════════════════════════════════
           📋 LOAD
           ══════════════════════════════════════════ */
        K.loadSolicitudesBeats = async function () {
            showSkeletons();
            try {
                var query = db.from('solicitudes_beats')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (!K.isAdmin) {
                    query = query.eq('usuario_id', K.currentUser.id);
                }

                var r = await query;
                if (r.error) throw r.error;

                allSolicitudes = r.data || [];
                updateKPIs();
                renderFiltered();
            } catch (e) {
                console.error('Error loading solicitudes beats:', e);
                renderError();
            }
        };

        /* ══════════════════════════════════════════
           📊 KPIs
           ══════════════════════════════════════════ */
        function updateKPIs() {
            var total = allSolicitudes.length;
            var pending = 0;
            var completed = 0;

            for (var i = 0; i < allSolicitudes.length; i++) {
                if (allSolicitudes[i].estado === 'pendiente') pending++;
                if (allSolicitudes[i].estado === 'completada') completed++;
            }

            var elTotal = $('reqStatTotal');
            var elPending = $('reqStatPending');
            var elCompleted = $('reqStatCompleted');
            if (elTotal) elTotal.textContent = total;
            if (elPending) elPending.textContent = pending;
            if (elCompleted) elCompleted.textContent = completed;
        }

        /* ══════════════════════════════════════════
           🔍 FILTER + SEARCH + SORT
           ══════════════════════════════════════════ */
        function getFilteredData() {
            var data = allSolicitudes.slice();

            // Filter by status
            if (currentFilter !== 'todas') {
                data = data.filter(function (s) { return s.estado === currentFilter; });
            }

            // Search
            if (currentSearch) {
                var q = currentSearch.toLowerCase();
                data = data.filter(function (s) {
                    return (s.genero && s.genero.toLowerCase().indexOf(q) >= 0) ||
                           (s.descripcion && s.descripcion.toLowerCase().indexOf(q) >= 0) ||
                           (s.mood && s.mood.toLowerCase().indexOf(q) >= 0) ||
                           (s.usuario_nombre && s.usuario_nombre.toLowerCase().indexOf(q) >= 0);
                });
            }

            // Sort
            if (currentSort === 'oldest') {
                data.sort(function (a, b) {
                    return new Date(a.created_at) - new Date(b.created_at);
                });
            }
            // 'recent' is default from query

            return data;
        }

        function renderFiltered() {
            var data = getFilteredData();

            // Active filters badge
            var hasFilters = currentFilter !== 'todas' || currentSearch;
            if (activeFiltersWrap) activeFiltersWrap.style.display = hasFilters ? 'flex' : 'none';

            if (hasFilters && activeFilterText) {
                var parts = [];
                if (currentFilter !== 'todas') parts.push('Estado: ' + currentFilter);
                if (currentSearch) parts.push('Búsqueda: "' + currentSearch + '"');
                activeFilterText.textContent = parts.join(' · ');
            }

            // Section count
            var sectionCount = $('reqSectionCount');
            if (sectionCount) {
                sectionCount.textContent = data.length + ' solicitud' + (data.length !== 1 ? 'es' : '');
            }

            // Results info
            if (hasFilters && resultsInfo) {
                resultsInfo.style.display = 'block';
                if (resultsText) {
                    resultsText.textContent = data.length + ' resultado' + (data.length !== 1 ? 's' : '') +
                        ' de ' + allSolicitudes.length + ' solicitudes';
                }
            } else if (resultsInfo) {
                resultsInfo.style.display = 'none';
            }

            renderSolicitudes(data);
        }

        /* ══════════════════════════════════════════
           🎨 RENDER
           ══════════════════════════════════════════ */
        function renderSolicitudes(solicitudes) {
            if (!grid) return;

            if (!solicitudes.length) {
                if (currentFilter !== 'todas' || currentSearch) {
                    grid.innerHTML = '<div class="kx-req-no-results" role="status">' +
                        '<div class="kx-req-no-results-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>' +
                        '<p class="kx-req-no-results-title">Sin resultados</p>' +
                        '<p class="kx-req-no-results-text">No se encontraron solicitudes con esos filtros</p>' +
                        '</div>';
                } else {
                    grid.innerHTML = '<div class="kx-req-empty" role="status">' +
                        '<div class="kx-req-empty-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="m9 15 3-3 3 3"/></svg></div>' +
                        '<h3 class="kx-req-empty-title">' + (K.isAdmin ? 'Sin solicitudes pendientes' : 'No tienes solicitudes') + '</h3>' +
                        '<p class="kx-req-empty-text">' + (K.isAdmin ? 'Cuando un artista solicite un beat personalizado, aparecerá aquí.' : 'Solicita un beat personalizado y te lo producimos a medida.') + '</p>' +
                        (K.isAdmin ? '' : '<button class="kx-req-empty-btn" data-action="new-request"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg> Nueva Solicitud</button>') +
                        '</div>';
                }
                return;
            }

            var h = '';
            for (var i = 0; i < solicitudes.length; i++) {
                var s = solicitudes[i];
                var statusText = s.estado.charAt(0).toUpperCase() + s.estado.slice(1);
                var fecha = new Date(s.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

                h += '<article class="kx-req-card" data-status="' + escapeHtml(s.estado) + '" data-id="' + escapeHtml(s.id) + '" role="listitem">';

                // Header
                h += '<div class="kx-req-card-header">';
                h += '<div class="kx-req-status" data-status="' + escapeHtml(s.estado) + '"><span class="kx-req-status-dot"></span><span>' + escapeHtml(statusText) + '</span></div>';
                h += '<span class="kx-req-card-date">' + escapeHtml(fecha) + '</span>';
                h += '</div>';

                // Body
                h += '<div class="kx-req-card-body">';

                // Admin: user info
                if (K.isAdmin && s.usuario_nombre) {
                    var initial = s.usuario_nombre ? s.usuario_nombre.charAt(0).toUpperCase() : '?';
                    h += '<div class="kx-req-user">';
                    h += '<div class="kx-req-user-avatar">' + escapeHtml(initial) + '</div>';
                    h += '<div class="kx-req-user-info">';
                    h += '<div class="kx-req-user-name">' + escapeHtml(s.usuario_nombre) + '</div>';
                    h += '<div class="kx-req-user-email">' + escapeHtml(s.usuario_email || '') + '</div>';
                    h += '</div></div>';
                }

                // Fields grid
                h += '<div class="kx-req-fields">';
                h += '<div class="kx-req-field"><span class="kx-req-field-label">Género</span><span class="kx-req-field-value">' + escapeHtml(s.genero) + '</span></div>';
                if (s.bpm) h += '<div class="kx-req-field"><span class="kx-req-field-label">BPM</span><span class="kx-req-field-value">' + escapeHtml(s.bpm) + '</span></div>';
                if (s.mood) h += '<div class="kx-req-field"><span class="kx-req-field-label">Mood</span><span class="kx-req-field-value">' + escapeHtml(s.mood) + '</span></div>';
                if (s.presupuesto) h += '<div class="kx-req-field"><span class="kx-req-field-label">Presupuesto</span><span class="kx-req-field-value">' + escapeHtml(s.presupuesto) + '</span></div>';
                h += '</div>';

                // Description
                h += '<p class="kx-req-desc">' + escapeHtml(s.descripcion) + '</p>';

                // Reference
                if (s.referencia) {
                    h += '<div class="kx-req-ref">';
                    h += '<span class="kx-req-ref-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></span>';
                    h += '<span class="kx-req-ref-text">' + escapeHtml(s.referencia) + '</span>';
                    h += '</div>';
                }

                // Response
                if (s.respuesta_admin) {
                    h += '<div class="kx-req-response">';
                    h += '<div class="kx-req-response-header">';
                    h += '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>';
                    h += '<span class="kx-req-response-label">Respuesta del Productor</span>';
                    h += '</div>';
                    h += '<p class="kx-req-response-text">' + escapeHtml(s.respuesta_admin) + '</p>';
                    if (s.precio_final > 0) {
                        h += '<div class="kx-req-price-final"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> $' + Number(s.precio_final).toLocaleString('es-CO') + '</div>';
                    }
                    h += '</div>';
                }

                // Admin actions
                if (K.isAdmin && s.estado === 'pendiente') {
                    h += '<div class="kx-req-admin-actions">';
                    h += '<button class="kx-req-btn-respond" data-action="respond" data-id="' + escapeHtml(s.id) + '"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg> Responder</button>';
                    h += '<button class="kx-req-btn-reject" data-action="reject" data-id="' + escapeHtml(s.id) + '"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg> Rechazar</button>';
                    h += '</div>';
                }

                // Admin: mark completed for accepted
                if (K.isAdmin && s.estado === 'aceptada') {
                    h += '<div class="kx-req-admin-actions">';
                    h += '<button class="kx-req-btn-complete" data-action="complete" data-id="' + escapeHtml(s.id) + '"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Marcar Completada</button>';
                    h += '</div>';
                }

                h += '</div></article>';
            }

            grid.innerHTML = h;
        }

        /* ══════════════════════════════════════════
           💀 SKELETONS
           ══════════════════════════════════════════ */
        function showSkeletons() {
            if (!grid) return;
            var sk = '';
            for (var i = 0; i < 3; i++) {
                sk += '<div class="kx-req-skeleton" aria-hidden="true">';
                sk += '<div class="kx-req-skeleton-row"><div class="kx-req-skeleton-badge"></div><div class="kx-req-skeleton-date"></div></div>';
                sk += '<div class="kx-req-skeleton-fields"><div class="kx-req-skeleton-field"></div><div class="kx-req-skeleton-field"></div><div class="kx-req-skeleton-field"></div></div>';
                sk += '<div class="kx-req-skeleton-text"></div><div class="kx-req-skeleton-text kx-req-skeleton-text--short"></div>';
                sk += '</div>';
            }
            grid.innerHTML = sk;
        }

        function renderError() {
            if (!grid) return;
            grid.innerHTML = '<div class="kx-req-empty" role="alert">' +
                '<div class="kx-req-empty-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg></div>' +
                '<h3 class="kx-req-empty-title">Error al cargar</h3>' +
                '<p class="kx-req-empty-text">No se pudieron cargar las solicitudes. Intenta de nuevo.</p>' +
                '</div>';
        }

        /* ══════════════════════════════════════════
           📤 CREATE (unchanged functionality)
           ══════════════════════════════════════════ */
        window._openSolicitudBeat = function () {
            var overlay = $('modalSolicitudBeat');
            if (overlay) overlay.classList.add('show');
        };

        window._closeSolicitudBeat = function () {
            var overlay = $('modalSolicitudBeat');
            if (overlay) overlay.classList.remove('show');
        };

        window._submitSolicitudBeat = async function (e) {
            if (e) e.preventDefault();

            var genero = $('solBeatGenero').value.trim();
            var bpm = $('solBeatBpm').value.trim();
            var mood = $('solBeatMood').value.trim();
            var referencia = $('solBeatReferencia').value.trim();
            var descripcion = $('solBeatDescripcion').value.trim();
            var presupuesto = $('solBeatPresupuesto').value.trim();

            if (!genero || !descripcion) {
                K.showToast('Completa género y descripción', 'error');
                return;
            }

            var btn = $('btnSubmitSolBeat');
            if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }

            try {
                var nombre = K.currentProfile.full_name || K.currentUser.email.split('@')[0];
                var r = await db.from('solicitudes_beats').insert({
                    usuario_id: K.currentUser.id,
                    usuario_nombre: nombre,
                    usuario_email: K.currentUser.email,
                    genero: genero,
                    bpm: bpm,
                    mood: mood,
                    referencia: referencia,
                    descripcion: descripcion,
                    presupuesto: presupuesto
                });

                if (r.error) throw r.error;

                K.showToast('🎵 Solicitud enviada correctamente', 'success');
                window._closeSolicitudBeat();

                // Clear form
                $('solBeatGenero').value = '';
                $('solBeatBpm').value = '';
                $('solBeatMood').value = '';
                $('solBeatReferencia').value = '';
                $('solBeatDescripcion').value = '';
                $('solBeatPresupuesto').value = '';

                K.loadSolicitudesBeats();
            } catch (err) {
                K.showToast('Error: ' + err.message, 'error');
            }

            if (btn) { btn.disabled = false; btn.textContent = '🎵 Enviar Solicitud'; }
        };

        /* ══════════════════════════════════════════
           💬 RESPOND (Admin) — Premium Modal
           ══════════════════════════════════════════ */
        function openRespondModal(id) {
            respondingId = id;
            $('reqRespondId').value = id;
            $('reqRespondText').value = '';
            $('reqRespondPrice').value = '0';
            $('reqRespondOverlay').classList.add('show');
            setTimeout(function () { $('reqRespondText').focus(); }, 200);
        }

        function closeRespondModal() {
            respondingId = null;
            $('reqRespondOverlay').classList.remove('show');
        }

        async function submitRespond() {
            var id = $('reqRespondId').value;
            var respuesta = $('reqRespondText').value.trim();
            var precio = parseInt($('reqRespondPrice').value) || 0;

            if (!respuesta) {
                K.showToast('Escribe una respuesta', 'error');
                return;
            }

            var btn = $('reqRespondSubmit');
            if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }

            try {
                var r = await db.from('solicitudes_beats')
                    .update({
                        respuesta_admin: respuesta,
                        precio_final: precio,
                        estado: 'aceptada',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', id);

                if (r.error) throw r.error;
                K.showToast('✅ Respuesta enviada', 'success');
                closeRespondModal();
                K.loadSolicitudesBeats();
            } catch (err) {
                K.showToast('Error: ' + err.message, 'error');
            }

            if (btn) { btn.disabled = false; btn.textContent = '✅ Enviar Respuesta'; }
        }

        /* ══════════════════════════════════════════
           ❌ REJECT (Admin) — Premium Confirm
           ══════════════════════════════════════════ */
        function openRejectConfirm(id) {
            rejectingId = id;
            $('reqConfirmId').value = id;
            $('reqConfirmOverlay').classList.add('show');
        }

        function closeRejectConfirm() {
            rejectingId = null;
            $('reqConfirmOverlay').classList.remove('show');
        }

        async function confirmReject() {
            var id = $('reqConfirmId').value;

            try {
                var r = await db.from('solicitudes_beats')
                    .update({ estado: 'rechazada', updated_at: new Date().toISOString() })
                    .eq('id', id);

                if (r.error) throw r.error;
                K.showToast('Solicitud rechazada', 'success');
                closeRejectConfirm();
                K.loadSolicitudesBeats();
            } catch (err) {
                K.showToast('Error: ' + err.message, 'error');
            }
        }

        /* ══════════════════════════════════════════
           ✅ COMPLETE (Admin)
           ══════════════════════════════════════════ */
        async function markCompleted(id) {
            try {
                var r = await db.from('solicitudes_beats')
                    .update({ estado: 'completada', updated_at: new Date().toISOString() })
                    .eq('id', id);

                if (r.error) throw r.error;
                K.showToast('🎵 Beat marcado como completado', 'success');
                K.loadSolicitudesBeats();
            } catch (err) {
                K.showToast('Error: ' + err.message, 'error');
            }
        }

        /* ══════════════════════════════════════════
           🎯 EVENT DELEGATION
           ══════════════════════════════════════════ */
        var panel = $('panel-solicitar-beat');
        if (panel) {
            panel.addEventListener('click', function (e) {
                var target = e.target;

                // ── New request button ──
                if (target.closest('#reqBtnNew') || target.closest('[data-action="new-request"]')) {
                    e.preventDefault();
                    window._openSolicitudBeat();
                    return;
                }

                // ── Filters ──
                var filterBtn = target.closest('.kx-req-filter');
                if (filterBtn) {
                    e.preventDefault();
                    currentFilter = filterBtn.getAttribute('data-filter') || 'todas';
                    var allFilters = panel.querySelectorAll('.kx-req-filter');
                    for (var i = 0; i < allFilters.length; i++) {
                        allFilters[i].classList.toggle('active', allFilters[i] === filterBtn);
                        allFilters[i].setAttribute('aria-selected', allFilters[i] === filterBtn ? 'true' : 'false');
                    }
                    renderFiltered();
                    return;
                }

                // ── Sort trigger ──
                var sortTrigger = target.closest('#reqSortBtn');
                if (sortTrigger) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (sortDropdown) sortDropdown.classList.toggle('show');
                    return;
                }

                // ── Sort option ──
                var sortOption = target.closest('.kx-req-sort-option');
                if (sortOption) {
                    e.preventDefault();
                    currentSort = sortOption.getAttribute('data-sort') || 'recent';
                    if (sortLabel) sortLabel.textContent = sortOption.textContent;
                    var allSortOpts = panel.querySelectorAll('.kx-req-sort-option');
                    for (var j = 0; j < allSortOpts.length; j++) {
                        allSortOpts[j].classList.toggle('active', allSortOpts[j] === sortOption);
                    }
                    if (sortDropdown) sortDropdown.classList.remove('show');
                    renderFiltered();
                    return;
                }

                // ── Clear filters ──
                if (target.closest('#reqClearFilters')) {
                    e.preventDefault();
                    currentFilter = 'todas';
                    currentSearch = '';
                    if (searchInput) searchInput.value = '';
                    if (searchClear) searchClear.style.display = 'none';
                    var allF = panel.querySelectorAll('.kx-req-filter');
                    for (var k = 0; k < allF.length; k++) {
                        allF[k].classList.toggle('active', allF[k].getAttribute('data-filter') === 'todas');
                    }
                    renderFiltered();
                    return;
                }

                // ── Search clear ──
                if (target.closest('#reqSearchClear')) {
                    e.preventDefault();
                    currentSearch = '';
                    if (searchInput) searchInput.value = '';
                    if (searchClear) searchClear.style.display = 'none';
                    renderFiltered();
                    return;
                }

                // ── Admin: Respond ──
                var respondBtn = target.closest('[data-action="respond"]');
                if (respondBtn) {
                    e.preventDefault();
                    openRespondModal(respondBtn.getAttribute('data-id'));
                    return;
                }

                // ── Admin: Reject ──
                var rejectBtn = target.closest('[data-action="reject"]');
                if (rejectBtn) {
                    e.preventDefault();
                    openRejectConfirm(rejectBtn.getAttribute('data-id'));
                    return;
                }

                // ── Admin: Complete ──
                var completeBtn = target.closest('[data-action="complete"]');
                if (completeBtn) {
                    e.preventDefault();
                    markCompleted(completeBtn.getAttribute('data-id'));
                    return;
                }

                // ── Respond modal: close ──
                if (target.closest('#reqRespondClose') || target.closest('#reqRespondCancel')) {
                    e.preventDefault();
                    closeRespondModal();
                    return;
                }

                // ── Respond modal: submit ──
                if (target.closest('#reqRespondSubmit')) {
                    e.preventDefault();
                    submitRespond();
                    return;
                }

                // ── Confirm: cancel ──
                if (target.closest('#reqConfirmCancel')) {
                    e.preventDefault();
                    closeRejectConfirm();
                    return;
                }

                // ── Confirm: accept ──
                if (target.closest('#reqConfirmAccept')) {
                    e.preventDefault();
                    confirmReject();
                    return;
                }
            });

            // ── Overlay click to close ──
            var respondOverlay = $('reqRespondOverlay');
            if (respondOverlay) {
                respondOverlay.addEventListener('click', function (e) {
                    if (e.target === this) closeRespondModal();
                });
            }

            var confirmOverlay = $('reqConfirmOverlay');
            if (confirmOverlay) {
                confirmOverlay.addEventListener('click', function (e) {
                    if (e.target === this) closeRejectConfirm();
                });
            }
        }

        // ── Search input ──
        if (searchInput) {
            var searchTimer = null;
            searchInput.addEventListener('input', function () {
                clearTimeout(searchTimer);
                var val = this.value;
                if (searchClear) searchClear.style.display = val ? 'flex' : 'none';
                searchTimer = setTimeout(function () {
                    currentSearch = val.trim();
                    renderFiltered();
                }, 250);
            });
        }

        // ── Close sort dropdown on outside click ──
        document.addEventListener('click', function (e) {
            if (sortDropdown && sortDropdown.classList.contains('show')) {
                if (!e.target.closest('.kx-req-sort-wrap')) {
                    sortDropdown.classList.remove('show');
                }
            }
        });

        // ── Keyboard: Escape ──
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                if ($('reqRespondOverlay') && $('reqRespondOverlay').classList.contains('show')) {
                    closeRespondModal();
                }
                if ($('reqConfirmOverlay') && $('reqConfirmOverlay').classList.contains('show')) {
                    closeRejectConfirm();
                }
                if (sortDropdown && sortDropdown.classList.contains('show')) {
                    sortDropdown.classList.remove('show');
                }
            }
        });

        console.log('✅ dashboard-solicitudes-beats.js v2.0 cargado');
    }

})();