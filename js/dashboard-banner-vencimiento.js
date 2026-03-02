/* ═══════════════════════════════════════════════════
   ⏰ KXON BANNER VENCIMIENTO — 2026
   Muestra banner cuando el plan vence en 7 días o menos
   Se inyecta automáticamente en el panel de inicio
   ═══════════════════════════════════════════════════ */
(function () {

  var db = window.db;

  function waitForKXON(cb) {
    if (window.KXON && window.KXON.currentUser !== undefined) cb();
    else setTimeout(function () { waitForKXON(cb); }, 50);
  }

  waitForKXON(function () { initBanner(); });

  function initBanner() {

    var K = window.KXON;
    var BANNER_ID = 'kxVencimientoBanner';
    var DIAS_AVISO = 7;

    function daysRemaining(dateStr) {
      if (!dateStr) return 0;
      var diff = new Date(dateStr) - new Date();
      return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    function formatFecha(dateStr) {
      if (!dateStr) return '';
      return new Date(dateStr).toLocaleDateString('es-CO', {
        day: 'numeric', month: 'long', year: 'numeric',
        timeZone: 'America/Bogota'
      });
    }

    function removeBanner() {
      var existing = document.getElementById(BANNER_ID);
      if (existing) existing.remove();
    }

    function renderBanner(dias, fechaFin, estado) {
      removeBanner();

      var panel = document.getElementById('panelInicio');
      if (!panel) return;

      var color, icon, titulo, mensaje, urgente;

      if (estado === 'vencida' || dias === 0) {
        color = '#ff4757';
        icon = '🔒';
        titulo = 'Tu plan ha vencido';
        mensaje = 'Renueva ahora para recuperar el acceso completo a KXON';
        urgente = true;
      } else if (dias === 1) {
        color = '#ff4757';
        icon = '⚠️';
        titulo = 'Tu plan vence mañana';
        mensaje = 'Renueva hoy para no perder el acceso';
        urgente = true;
      } else if (dias <= 3) {
        color = '#ffa502';
        icon = '⏰';
        titulo = 'Tu plan vence en ' + dias + ' días';
        mensaje = 'Vence el ' + formatFecha(fechaFin) + ' — Renueva pronto';
        urgente = false;
      } else {
        color = '#c0c0c0';
        icon = '📅';
        titulo = 'Tu plan vence en ' + dias + ' días';
        mensaje = 'Vence el ' + formatFecha(fechaFin);
        urgente = false;
      }

      var banner = document.createElement('div');
      banner.id = BANNER_ID;
      banner.style.cssText = [
        'display:flex',
        'align-items:center',
        'justify-content:space-between',
        'gap:16px',
        'padding:14px 20px',
        'margin:0 0 20px 0',
        'background:rgba(10,10,10,0.9)',
        'border:1px solid ' + color,
        'border-radius:12px',
        'backdrop-filter:blur(12px)',
        urgente ? 'box-shadow:0 0 20px ' + color + '22' : '',
        'animation:kxBannerSlide 0.4s ease',
        'flex-wrap:wrap'
      ].filter(Boolean).join(';');

      banner.innerHTML =
        '<div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0">'
        + '<div style="font-size:1.4rem;flex-shrink:0">' + icon + '</div>'
        + '<div style="min-width:0">'
        + '<div style="font-size:0.88rem;font-weight:700;color:' + color + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + titulo + '</div>'
        + '<div style="font-size:0.75rem;color:#888;margin-top:2px">' + mensaje + '</div>'
        + '</div>'
        + '</div>'
        + '<div style="display:flex;align-items:center;gap:8px;flex-shrink:0">'
        + '<button onclick="window.KXON && window.KXON.showPanel(\'planes\')" style="padding:8px 18px;background:' + color + ';color:' + (urgente ? '#fff' : '#0a0a0a') + ';border:none;border-radius:8px;font-size:0.78rem;font-weight:700;cursor:pointer;white-space:nowrap">Renovar plan →</button>'
        + '<button onclick="document.getElementById(\'' + BANNER_ID + '\') && document.getElementById(\'' + BANNER_ID + '\').remove()" style="width:28px;height:28px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:#666;cursor:pointer;font-size:0.8rem;flex-shrink:0">✕</button>'
        + '</div>';

      // Insertar al inicio del panel
      panel.insertBefore(banner, panel.firstChild);
    }

    async function checkVencimiento() {
      try {
        if (!K.currentUser) return;

        var { data: sub } = await db
          .from('suscripciones')
          .select('estado, fecha_fin')
          .eq('usuario_id', K.currentUser.id)
          .in('estado', ['activa', 'vencida'])
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!sub) return;

        var dias = daysRemaining(sub.fecha_fin);

        // Mostrar si vencida o vence en 7 días o menos
        if (sub.estado === 'vencida' || dias <= DIAS_AVISO) {
          renderBanner(dias, sub.fecha_fin, sub.estado);
        } else {
          removeBanner();
        }

      } catch (e) {
        // Sin suscripción — no mostrar banner
      }
    }

    // Agregar animación CSS
    if (!document.getElementById('kxBannerStyles')) {
      var style = document.createElement('style');
      style.id = 'kxBannerStyles';
      style.textContent = '@keyframes kxBannerSlide { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }';
      document.head.appendChild(style);
    }

    // Ejecutar al cargar y cada vez que se muestre el panel inicio
    var originalRenderInicio = K.renderInicio;
    if (typeof originalRenderInicio === 'function') {
      K.renderInicio = async function () {
        await originalRenderInicio.apply(this, arguments);
        checkVencimiento();
      };
    }

    // También ejecutar ahora si ya estamos en inicio
    setTimeout(checkVencimiento, 500);

    console.log('✅ dashboard-banner-vencimiento.js cargado');
  }

})();
