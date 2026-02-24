/* ============================================
   📋 DASHBOARD-SOLICITUDES-BEATS.JS — KXON 2026
   Namespace: kx-req-*
   v2.2 — Fixed DOM reference caching bug
   ============================================ */
(function () {
    'use strict';

    var db = window.db;

    function $(id) { return document.getElementById(id); }

    function escapeHtml(str) {
        if (!str) return '';
        var d = document.createElement('div');
        d.appendChild(document.createTextNode(String(str)));
        return d.innerHTML;
    }

    function waitForKXON(cb) {
        if (window.KXON && window.KXON.currentUser) return cb();
        setTimeout(function () { waitForKXON(cb); }, 100);
    }

    waitForKXON(function () { initSolicitudesBeats(); });

    function initSolicitudesBeats() {
        var K = window.KXON;

        /* ── State ── */
        var allSolicitudes = [];
        var currentFilter = 'todas';
        var currentSort = 'recent';
        var currentSearch = '';
        var eventsAttached = false;

        /* ══════════════════════════════════════════
           🔑 FRESH DOM REFS
           Every time we need DOM elements, we grab
           them fresh. This fixes the issue where
           saveAllPanelHTML / restorePanelHTML
           replaces innerHTML and our cached refs
           point to detached nodes.
           ══════════════════════════════════════════ */
        function getPanel()        { return $('panel-solicitar-beat'); }
        function getGrid()         { return $('solicitudesBeatsGrid'); }
        function getSearchInput()  { return $('reqSearchInput'); }
        function getSearchClear()  { return $('reqSearchClear'); }
        function getActiveFilters(){ return $('reqActiveFilters'); }
        function getActiveText()   { return $('reqActiveFilterText'); }
        function getResultsInfo()  { return $('reqResultsInfo'); }
        function getResultsText()  { return $('reqResultsText'); }
        function getSortDropdown() { return $('reqSortDropdown'); }
        function getSortLabel()    { return $('reqSortLabel'); }

        /* ══════════════════════════════════════════
           📋 LOAD
           ══════════════════════════════════════════ */
        K.loadSolicitudesBeats = async function () {
            console.log('📋 loadSolicitudesBeats called');

            var grid = getGrid();
            if (!grid) {
                console.warn('⚠️ solicitudesBeatsGrid not found — panel may be locked or not rendered');
                return;
            }

            /* Re-attach events every time we load,
               because innerHTML restore kills listeners */
            attachEvents();

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
                console.log('   ✅ Loaded:', allSolicitudes.length, 'solicitudes');

                updateKPIs();
                renderFiltered();
            } catch (e) {
                console.error('❌ Error loading solicitudes beats:', e);
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
                var estado = allSolicitudes[i].estado;
                if (estado === 'pendiente') pending++;
                if (estado === 'completada') completed++;
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

            if (currentFilter !== 'todas') {
                data = data.filter(function (s) {
                    return s.estado === currentFilter;
                });
            }

            if (currentSearch) {
                var q = currentSearch.toLowerCase();
                data = data.filter(function (s) {
                    return (s.genero && s.genero.toLowerCase().indexOf(q) >= 0) ||
                           (s.descripcion && s.descripcion.toLowerCase().indexOf(q) >= 0) ||
                           (s.mood && s.mood.toLowerCase().indexOf(q) >= 0) ||
                           (s.usuario_nombre && s.usuario_nombre.toLowerCase().indexOf(q) >= 0);
                });
            }

            if (currentSort === 'oldest') {
                data.sort(function (a, b) {
                    return new Date(a.created_at) - new Date(b.created_at);
                });
            } else {
                data.sort(function (a, b) {
                    return new Date(b.created_at) - new Date(a.created_at);
                });
            }

            return data;
        }

        function renderFiltered() {
            var data = getFilteredData();
            var activeFiltersWrap = getActiveFilters();
            var activeFilterText = getActiveText();
            var resultsInfo = getResultsInfo();
            var resultsText = getResultsText();

            var hasFilters = currentFilter !== 'todas' || currentSearch;
            if (activeFiltersWrap) activeFiltersWrap.style.display = hasFilters ? 'flex' : 'none';

            if (hasFilters && activeFilterText) {
                var parts = [];
                if (currentFilter !== 'todas') parts.push('Estado: ' + currentFilter);
                if (currentSearch) parts.push('Búsqueda: "' + currentSearch + '"');
                activeFilterText.textContent = parts.join(' · ');
            }

            var sectionCount = $('reqSectionCount');
            if (sectionCount) {
                sectionCount.textContent = data.length + ' solicitud' + (data.length !== 1 ? 'es' : '');
            }

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
            var grid = getGrid();
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
                var estado = s.estado || 'pendiente';
                var statusText = estado.charAt(0).toUpperCase() + estado.slice(1);
                var fecha = '';
                try {
                    fecha = new Date(s.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
                } catch (e) {
                    fecha = s.created_at || '';
                }

                h += '<article class="kx-req-card" data-status="' + escapeHtml(estado) + '" data-id="' + escapeHtml(s.id) + '" role="listitem">';

                h += '<div class="kx-req-card-header">';
                h += '<div class="kx-req-status" data-status="' + escapeHtml(estado) + '"><span class="kx-req-status-dot"></span><span>' + escapeHtml(statusText) + '</span></div>';
                h += '<span class="kx-req-card-date">' + escapeHtml(fecha) + '</span>';
                h += '</div>';

                h += '<div class="kx-req-card-body">';

                if (K.isAdmin && s.usuario_nombre) {
                    var initial = s.usuario_nombre.charAt(0).toUpperCase();
                    h += '<div class="kx-req-user">';
                    h += '<div class="kx-req-user-avatar">' + escapeHtml(initial) + '</div>';
                    h += '<div class="kx-req-user-info">';
                    h += '<div class="kx-req-user-name">' + escapeHtml(s.usuario_nombre) + '</div>';
                    h += '<div class="kx-req-user-email">' + escapeHtml(s.usuario_email || '') + '</div>';
                    h += '</div></div>';
                }

                h += '<div class="kx-req-fields">';
                if (s.genero) h += '<div class="kx-req-field"><span class="kx-req-field-label">Género</span><span class="kx-req-field-value">' + escapeHtml(s.genero) + '</span></div>';
                if (s.bpm) h += '<div class="kx-req-field"><span class="kx-req-field-label">BPM</span><span class="kx-req-field-value">' + escapeHtml(s.bpm) + '</span></div>';
                if (s.mood) h += '<div class="kx-req-field"><span class="kx-req-field-label">Mood</span><span class="kx-req-field-value">' + escapeHtml(s.mood) + '</span></div>';
                if (s.presupuesto) h += '<div class="kx-req-field"><span class="kx-req-field-label">Presupuesto</span><span class="kx-req-field-value">' + escapeHtml(s.presupuesto) + '</span></div>';
                h += '</div>';

                if (s.descripcion) {
                    h += '<p class="kx-req-desc">' + escapeHtml(s.descripcion) + '</p>';
                }

                if (s.referencia) {
                    h += '<div class="kx-req-ref">';
                    h += '<span class="kx-req-ref-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></span>';
                    h += '<span class="kx-req-ref-text">' + escapeHtml(s.referencia) + '</span>';
                    h += '</div>';
                }

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

                if (K.isAdmin && estado === 'pendiente') {
                    h += '<div class="kx-req-admin-actions">';
                    h += '<button class="kx-req-btn-respond" data-action="respond" data-id="' + escapeHtml(s.id) + '"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg> Responder</button>';
                    h += '<button class="kx-req-btn-reject" data-action="reject" data-id="' + escapeHtml(s.id) + '"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg> Rechazar</button>';
                    h += '</div>';
                }

                if (K.isAdmin && estado === 'aceptada') {
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
            var grid = getGrid();
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
            var grid = getGrid();
            if (!grid) return;
            grid.innerHTML = '<div class="kx-req-empty" role="alert">' +
                '<div class="kx-req-empty-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg></div>' +
                '<h3 class="kx-req-empty-title">Error al cargar</h3>' +
                '<p class="kx-req-empty-text">No se pudieron cargar las solicitudes. Intenta de nuevo.</p>' +
                '</div>';
        }

        /* ══════════════════════════════════════════
           📤 MODAL: NUEVA SOLICITUD
           ══════════════════════════════════════════ */
        function openNewModal() {
            var overlay = $('modalSolicitudBeat');
            if (overlay) overlay.classList.add('show');
        }

        function closeNewModal() {
            var overlay = $('modalSolicitudBeat');
            if (overlay) overlay.classList.remove('show');
        }

        async function submitNewSolicitud(e) {
            if (e) e.preventDefault();

            var genero = $('solBeatGenero');
            var bpm = $('solBeatBpm');
            var mood = $('solBeatMood');
            var referencia = $('solBeatReferencia');
            var descripcion = $('solBeatDescripcion');
            var presupuesto = $('solBeatPresupuesto');

            var generoVal = genero ? genero.value.trim() : '';
            var descripcionVal = descripcion ? descripcion.value.trim() : '';

            if (!generoVal || !descripcionVal) {
                K.showToast('Completa género y descripción', 'error');
                return;
            }

            var btn = $('btnSubmitSolBeat');
            if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }

            try {
                var nombre = '';
                if (K.currentProfile && K.currentProfile.full_name) {
                    nombre = K.currentProfile.full_name;
                } else {
                    nombre = K.currentUser.email.split('@')[0];
                }

                var insertData = {
                    usuario_id: K.currentUser.id,
                    usuario_nombre: nombre,
                    usuario_email: K.currentUser.email,
                    genero: generoVal,
                    bpm: bpm ? bpm.value.trim() : '',
                    mood: mood ? mood.value.trim() : '',
                    referencia: referencia ? referencia.value.trim() : '',
                    descripcion: descripcionVal,
                    presupuesto: presupuesto ? presupuesto.value.trim() : '',
                    estado: 'pendiente'
                };

                var r = await db.from('solicitudes_beats').insert(insertData);
                if (r.error) throw r.error;

                K.showToast('🎵 Solicitud enviada correctamente', 'success');
                closeNewModal();

                if (genero) genero.value = '';
                if (bpm) bpm.value = '';
                if (mood) mood.value = '';
                if (referencia) referencia.value = '';
                if (descripcion) descripcion.value = '';
                if (presupuesto) presupuesto.value = '';

                K.loadSolicitudesBeats();
            } catch (err) {
                console.error('❌ Error submitting:', err);
                K.showToast('Error: ' + err.message, 'error');
            }

            if (btn) { btn.disabled = false; btn.textContent = '🎵 Enviar Solicitud'; }
        }

        window._openSolicitudBeat = openNewModal;
        window._closeSolicitudBeat = closeNewModal;
        window._submitSolicitudBeat = submitNewSolicitud;

        /* ══════════════════════════════════════════
           💬 RESPOND (Admin)
           ══════════════════════════════════════════ */
        function openRespondModal(id) {
            var el = $('reqRespondId');
            var text = $('reqRespondText');
            var price = $('reqRespondPrice');
            var overlay = $('reqRespondOverlay');

            if (el) el.value = id;
            if (text) text.value = '';
            if (price) price.value = '0';
            if (overlay) overlay.classList.add('show');
            if (text) setTimeout(function () { text.focus(); }, 200);
        }

        function closeRespondModal() {
            var overlay = $('reqRespondOverlay');
            if (overlay) overlay.classList.remove('show');
        }

        async function submitRespond() {
            var id = $('reqRespondId') ? $('reqRespondId').value : '';
            var respuesta = $('reqRespondText') ? $('reqRespondText').value.trim() : '';
            var precio = $('reqRespondPrice') ? parseInt($('reqRespondPrice').value) || 0 : 0;

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
           ❌ REJECT (Admin)
           ══════════════════════════════════════════ */
        function openRejectConfirm(id) {
            var el = $('reqConfirmId');
            var overlay = $('reqConfirmOverlay');
            if (el) el.value = id;
            if (overlay) overlay.classList.add('show');
        }

        function closeRejectConfirm() {
            var overlay = $('reqConfirmOverlay');
            if (overlay) overlay.classList.remove('show');
        }

        async function confirmReject() {
            var id = $('reqConfirmId') ? $('reqConfirmId').value : '';

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
           🎯 EVENT DELEGATION — RE-ATTACHABLE
           Uses a flag + fresh DOM refs each time.
           We attach to document-level for the panel
           click handler since the panel element itself
           gets its innerHTML replaced.
           ══════════════════════════════════════════ */
        function attachEvents() {
            if (eventsAttached) return;
            eventsAttached = true;

            /* ── Main click delegation on document,
                  scoped to panel ── */
            document.addEventListener('click', function (e) {
                var panel = getPanel();
                if (!panel) return;
                if (!panel.contains(e.target)) return;

                var target = e.target;

                // ── New request ──
                if (target.closest('#reqBtnNew') || target.closest('[data-action="new-request"]')) {
                    e.preventDefault();
                    openNewModal();
                    return;
                }

                // ── Close new modal ──
                if (target.closest('#reqNewClose') || target.closest('#reqNewCancel')) {
                    e.preventDefault();
                    closeNewModal();
                    return;
                }

                // ── Filters ──
                var filterBtn = target.closest('.kx-req-filter');
                if (filterBtn && panel.contains(filterBtn)) {
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
                if (target.closest('#reqSortBtn')) {
                    e.preventDefault();
                    e.stopPropagation();
                    var dd = getSortDropdown();
                    if (dd) dd.classList.toggle('show');
                    return;
                }

                // ── Sort option ──
                var sortOption = target.closest('.kx-req-sort-option');
                if (sortOption && panel.contains(sortOption)) {
                    e.preventDefault();
                    currentSort = sortOption.getAttribute('data-sort') || 'recent';
                    var sl = getSortLabel();
                    if (sl) sl.textContent = sortOption.textContent.trim();
                    var allSortOpts = panel.querySelectorAll('.kx-req-sort-option');
                    for (var j = 0; j < allSortOpts.length; j++) {
                        allSortOpts[j].classList.toggle('active', allSortOpts[j] === sortOption);
                    }
                    var sdd = getSortDropdown();
                    if (sdd) sdd.classList.remove('show');
                    renderFiltered();
                    return;
                }

                // ── Clear filters ──
                if (target.closest('#reqClearFilters')) {
                    e.preventDefault();
                    currentFilter = 'todas';
                    currentSearch = '';
                    var si = getSearchInput();
                    if (si) si.value = '';
                    var sc = getSearchClear();
                    if (sc) sc.style.display = 'none';
                    var allF = panel.querySelectorAll('.kx-req-filter');
                    for (var k = 0; k < allF.length; k++) {
                        allF[k].classList.toggle('active', allF[k].getAttribute('data-filter') === 'todas');
                        allF[k].setAttribute('aria-selected', allF[k].getAttribute('data-filter') === 'todas' ? 'true' : 'false');
                    }
                    renderFiltered();
                    return;
                }

                // ── Search clear ──
                if (target.closest('#reqSearchClear')) {
                    e.preventDefault();
                    currentSearch = '';
                    var si2 = getSearchInput();
                    if (si2) si2.value = '';
                    var sc2 = getSearchClear();
                    if (sc2) sc2.style.display = 'none';
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

            /* ── Overlay click to close modals ── */
            document.addEventListener('click', function (e) {
                if (e.target.id === 'modalSolicitudBeat' && e.target.classList.contains('show')) {
                    closeNewModal();
                }
                if (e.target.id === 'reqRespondOverlay' && e.target.classList.contains('show')) {
                    closeRespondModal();
                }
                if (e.target.id === 'reqConfirmOverlay' && e.target.classList.contains('show')) {
                    closeRejectConfirm();
                }
            });

            /* ── Search input (use delegation too) ── */
            var searchTimer = null;
            document.addEventListener('input', function (e) {
                if (e.target.id !== 'reqSearchInput') return;
                clearTimeout(searchTimer);
                var val = e.target.value;
                var sc = getSearchClear();
                if (sc) sc.style.display = val ? 'flex' : 'none';
                searchTimer = setTimeout(function () {
                    currentSearch = val.trim();
                    renderFiltered();
                }, 250);
            });

            /* ── Form submit ── */
            document.addEventListener('submit', function (e) {
                if (e.target.id === 'formSolicitudBeat') {
                    e.preventDefault();
                    submitNewSolicitud(e);
                }
            });

            /* ── Close sort dropdown on outside click ── */
            document.addEventListener('click', function (e) {
                var dd = getSortDropdown();
                if (dd && dd.classList.contains('show')) {
                    if (!e.target.closest('.kx-req-sort-wrap')) {
                        dd.classList.remove('show');
                    }
                }
            });

            /* ── Escape key ── */
            document.addEventListener('keydown', function (e) {
                if (e.key !== 'Escape') return;

                var modalNew = $('modalSolicitudBeat');
                if (modalNew && modalNew.classList.contains('show')) {
                    closeNewModal();
                    return;
                }
                var respondOv = $('reqRespondOverlay');
                if (respondOv && respondOv.classList.contains('show')) {
                    closeRespondModal();
                    return;
                }
                var confirmOv = $('reqConfirmOverlay');
                if (confirmOv && confirmOv.classList.contains('show')) {
                    closeRejectConfirm();
                    return;
                }
                var dd = getSortDropdown();
                if (dd && dd.classList.contains('show')) {
                    dd.classList.remove('show');
                }
            });

            console.log('🔌 Solicitudes beats events attached (document-level delegation)');
        }

        console.log('✅ dashboard-solicitudes-beats.js v2.2 initialized');
    }

})();