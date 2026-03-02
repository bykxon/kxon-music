/* ============================================
   KXON AI CHATBOT — Floating Assistant
   Usa /api/chat proxy → OpenRouter (gratis)
   Detecta admin vs fan
   ============================================ */

(function () {
    'use strict';

    // ==============================
    // CONFIG
    // ==============================
    const AI_CONFIG = {
        endpoint: '/api/chat',
        model: 'meta-llama/llama-3.1-8b-instruct:free'
    };

    // ==============================
    // SYSTEM PROMPTS
    // ==============================
    const PROMPT_FAN = `Eres KXON-AI, asistente musical de los fans de KXON. Hablas amigable, natural, como un amigo colombiano. Usas emojis con moderación. Máximo 120 palabras. Siempre pasos numerados para procesos.

CONOCIMIENTOS:
- Reproducir música: Panel Álbumes o Canciones → click canción → reproductor abajo. Radio KXON = shuffle automático.
- Letra: Click reproductor expandido, muestra letra con secciones.
- Búsqueda: Barra arriba del dashboard, busca con 2 letras.
- Favoritos: Click corazón en canción/álbum. Panel Favoritos.
- Playlists: Panel Playlists → Nueva Playlist → agregar canciones.
- Suscripción: Panel Planes → elegir plan → pagar → subir comprobante → esperar aprobación.
- Marketplace beats: Panel Marketplace → preview → Solicitar Compra → comprobante → aprobación → Panel Archivo.
- Live: Notificación automática cuando artista activa. Panel En Vivo.
- Embajadores: Programa de referidos. Link único. Comisiones: Activador $1500, Constructor $2000+rifa, Líder $3000+rifa+VIP.
- Perfil: Panel Mi Perfil → cambiar foto, nombre, bio.
- Contraseña: Login → Olvidaste contraseña → email con link (expira 1 hora).
- Instalar app: Android Chrome 3 puntos → Agregar pantalla inicio. iPhone Safari compartir → Agregar pantalla inicio.
- Notificaciones: Campanita = centro notificaciones. Número rojo = no leídas.
- Historial: Panel Historial, todo lo escuchado por fecha.
- Chat comunidad: Panel Chat, necesita suscripción activa.

Si algo está fuera de KXON: "Eso lo tiene que confirmar el artista directamente."
Si hay problema técnico: "Recarga la página, limpia caché, o escríbele al equipo de KXON."
NUNCA uses jerga técnica (Supabase, RLS, API, tokens). NUNCA inventes funcionalidades.`;

    const PROMPT_ADMIN = `Eres KXON-AI, asistente del administrador/artista de KXON. Eres directo, profesional. Como un manager de confianza. Siempre pasos numerados. Máximo 150 palabras. Mencionas nombre exacto del panel.

CONOCIMIENTOS ADMIN:
- Subir álbum: Panel Álbumes → +Nuevo Álbum → título, portada (JPG/PNG min 500x500), fecha lanzamiento → Guardar → agregar canciones.
- Álbum futuro: Fecha futura = countdown para fans, audio bloqueado hasta esa fecha.
- Letra: Edición canción → sección Letra. Usar [Intro] [Verso 1] [Coro] entre corchetes.
- Créditos: Edición canción → Productor, Compositor, Featuring, BPM, Tonalidad, Género.
- Publicar beat: Panel Marketplace → +Nuevo Producto → título, tipo, imagen, audio preview, precio COP, BPM, género, tonalidad, descripción.
- Aprobar compra: Panel Marketplace → Solicitudes pendientes → revisar comprobante → Aprobar/Rechazar. Notificación automática al fan.
- Noticia: Panel Inicio → +Nueva Noticia → título, descripción, imagen opcional. Badge "Nuevo" para fans.
- Activar live: Panel En Vivo → pegar ID/URL YouTube Live → título, descripción → activar chat → "Ir en Vivo". Notificación push automática.
- Terminar live: Panel En Vivo → "Detener Live". Queda en historial.
- Aprobar suscripción: Panel Planes → Solicitudes pendientes → revisar comprobante → Aprobar. Fechas calculadas automáticamente.
- Embajadores: Panel Embajadores → Solicitudes → Aprobar. Sistema genera código y link automático.
- Niveles embajador: Activador $1500, Constructor $2000+rifa, Líder $3000+rifa+VIP. Automáticos según referidos.
- Analytics: Exclusivo admin. KPIs: usuarios, reproducciones, compras, revenue. Gráficas 7d/30d/90d. Top canciones.
- Storage: Bucket "imagenes" Supabase. Rutas: /albumes/ /noticias/ /beats/ /avatares/
- PWA: No es app nativa. "Agregar a pantalla de inicio" desde navegador.

NUNCA reveles credenciales, API keys ni config de Supabase. NUNCA des consejos legales.`;

    // ==============================
    // SUGGESTIONS
    // ==============================
    const SUGGESTIONS_FAN = [
        '¿Cómo reproduzco música?',
        '¿Cómo me suscribo?',
        '¿Cómo compro un beat?',
        '¿Cómo instalo la app?',
        '¿Qué son los embajadores?',
        '¿Cómo veo un live?'
    ];

    const SUGGESTIONS_ADMIN = [
        '¿Cómo subo un álbum?',
        '¿Cómo apruebo suscripciones?',
        '¿Cómo activo un live?',
        '¿Cómo publico un beat?',
        '¿Qué muestra Analytics?',
        '¿Cómo publico una noticia?'
    ];

    // ==============================
    // STATE
    // ==============================
    let chatOpen = false;
    let isTyping = false;
    let conversationHistory = [];
    let isAdmin = false;

    // ==============================
    // DETECT ADMIN
    // ==============================
    function detectAdmin() {
        if (window.K && window.K.isAdmin) return true;
        if (window.KXON_USER_ROLE === 'admin') return true;

        const selectors = ['.admin-only', '.admin-panel', '[data-role="admin"]', '#panel-analytics'];
        for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el && el.offsetParent !== null) return true;
        }

        try {
            const profile = JSON.parse(localStorage.getItem('kxon_profile') || '{}');
            if (profile.role === 'admin' || profile.is_admin === true) return true;
        } catch (e) {}

        return false;
    }

    // ==============================
    // BUILD UI
    // ==============================
    function buildChatWidget() {
        // FAB
        const fab = document.createElement('button');
        fab.className = 'kxon-ai-fab';
        fab.id = 'kxon-ai-fab';
        fab.setAttribute('aria-label', 'Abrir asistente KXON');
        fab.innerHTML = `
            <svg class="icon-chat" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
            <svg class="icon-close" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            <span class="fab-badge" id="kxon-ai-badge"></span>
        `;

        // Window
        const roleLabel = isAdmin ? '⚡ Modo Admin' : '🎵 Tu asistente musical';
        const win = document.createElement('div');
        win.className = 'kxon-ai-window';
        win.id = 'kxon-ai-window';
        win.innerHTML = `
            <div class="kxon-ai-header">
                <div class="kxon-ai-header-avatar">🤖</div>
                <div class="kxon-ai-header-info">
                    <div class="kxon-ai-header-name">KXON-AI</div>
                    <div class="kxon-ai-header-status">${roleLabel}</div>
                </div>
                <div class="kxon-ai-header-actions">
                    <button class="kxon-ai-header-btn" id="kxon-ai-clear" title="Limpiar chat">🗑️</button>
                    <button class="kxon-ai-header-btn" id="kxon-ai-close" title="Cerrar">✕</button>
                </div>
            </div>
            <div class="kxon-ai-body" id="kxon-ai-body"></div>
            <div class="kxon-ai-footer">
                <div class="kxon-ai-input-row">
                    <input type="text" class="kxon-ai-input" id="kxon-ai-input" 
                           placeholder="Escríbeme tu pregunta..." autocomplete="off" maxlength="500">
                    <button class="kxon-ai-send-btn" id="kxon-ai-send" aria-label="Enviar" disabled>
                        <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                    </button>
                </div>
                <div class="kxon-ai-footer-note">KXON-AI asistente · Respuestas pueden variar</div>
            </div>
        `;

        document.body.appendChild(fab);
        document.body.appendChild(win);

        // --- Events ---
        fab.addEventListener('click', toggleChat);
        document.getElementById('kxon-ai-close').addEventListener('click', toggleChat);
        document.getElementById('kxon-ai-clear').addEventListener('click', clearChat);

        const input = document.getElementById('kxon-ai-input');
        const sendBtn = document.getElementById('kxon-ai-send');

        input.addEventListener('input', () => {
            sendBtn.disabled = !input.value.trim();
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey && input.value.trim()) {
                e.preventDefault();
                handleSend();
            }
        });

        sendBtn.addEventListener('click', handleSend);

        // Show welcome
        showWelcome();
    }

    // ==============================
    // TOGGLE & CLEAR
    // ==============================
    function toggleChat() {
        chatOpen = !chatOpen;
        const win = document.getElementById('kxon-ai-window');
        const fab = document.getElementById('kxon-ai-fab');

        if (chatOpen) {
            win.classList.add('visible');
            fab.classList.add('open');
            document.getElementById('kxon-ai-input').focus();
            document.getElementById('kxon-ai-badge').classList.remove('visible');
        } else {
            win.classList.remove('visible');
            fab.classList.remove('open');
        }
    }

    function clearChat() {
        conversationHistory = [];
        showWelcome();
    }

    // ==============================
    // WELCOME
    // ==============================
    function showWelcome() {
        const body = document.getElementById('kxon-ai-body');
        const name = isAdmin ? '¡Hola, Admin! 🎯' : '¡Hey! ¿Qué tal? 🎵';
        const msg = isAdmin
            ? 'Soy tu asistente de gestión. Pregúntame sobre cualquier panel.'
            : 'Soy KXON-AI, tu guía en la plataforma. ¿En qué te ayudo?';
        const suggestions = isAdmin ? SUGGESTIONS_ADMIN : SUGGESTIONS_FAN;

        body.innerHTML = `
            <div class="kxon-ai-welcome">
                <div class="kxon-ai-welcome-icon">🤖</div>
                <h4>${name}</h4>
                <p>${msg}</p>
            </div>
            <div class="kxon-ai-suggestions" id="kxon-ai-suggestions">
                ${suggestions.map(s => `<button class="kxon-ai-suggestion-btn">${s}</button>`).join('')}
            </div>
        `;

        body.querySelectorAll('.kxon-ai-suggestion-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('kxon-ai-input').value = btn.textContent;
                handleSend();
            });
        });
    }

    // ==============================
    // MESSAGES
    // ==============================
    function addMessage(role, text) {
        const body = document.getElementById('kxon-ai-body');
        const welcome = body.querySelector('.kxon-ai-welcome');
        if (welcome) welcome.remove();

        const isBot = role === 'bot';
        const msgDiv = document.createElement('div');
        msgDiv.className = `kxon-ai-msg ${isBot ? 'bot' : 'user'}`;
        msgDiv.innerHTML = `
            <div class="kxon-ai-msg-avatar">${isBot ? '🤖' : '👤'}</div>
            <div class="kxon-ai-msg-bubble">${formatText(text)}</div>
        `;

        body.appendChild(msgDiv);
        scrollBottom();
    }

    function formatText(t) {
        return t
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
    }

    function showTyping() {
        const body = document.getElementById('kxon-ai-body');
        const div = document.createElement('div');
        div.className = 'kxon-ai-typing';
        div.id = 'kxon-ai-typing';
        div.innerHTML = `
            <div class="kxon-ai-msg-avatar" style="background:linear-gradient(135deg,#7c3aed,#a855f7)">🤖</div>
            <div class="kxon-ai-typing-dots"><span></span><span></span><span></span></div>
        `;
        body.appendChild(div);
        scrollBottom();
    }

    function removeTyping() {
        const el = document.getElementById('kxon-ai-typing');
        if (el) el.remove();
    }

    function scrollBottom() {
        const body = document.getElementById('kxon-ai-body');
        requestAnimationFrame(() => { body.scrollTop = body.scrollHeight; });
    }

    // ==============================
    // SEND
    // ==============================
    async function handleSend() {
        const input = document.getElementById('kxon-ai-input');
        const text = input.value.trim();
        if (!text || isTyping) return;

        const sugg = document.getElementById('kxon-ai-suggestions');
        if (sugg) sugg.remove();

        input.value = '';
        document.getElementById('kxon-ai-send').disabled = true;

        addMessage('user', text);
        conversationHistory.push({ role: 'user', content: text });

        isTyping = true;
        showTyping();

        try {
            const response = await sendToAI(text);
            removeTyping();
            addMessage('bot', response);
            conversationHistory.push({ role: 'assistant', content: response });
        } catch (err) {
            removeTyping();
            console.error('KXON-AI Error:', err);
            const fallback = localFallback(text);
            addMessage('bot', fallback);
            conversationHistory.push({ role: 'assistant', content: fallback });
        }

        isTyping = false;

        if (!chatOpen) {
            const badge = document.getElementById('kxon-ai-badge');
            badge.textContent = '1';
            badge.classList.add('visible');
        }
    }

    // ==============================
    // AI CALL (via proxy)
    // ==============================
    async function sendToAI(userMessage) {
        const systemPrompt = isAdmin ? PROMPT_ADMIN : PROMPT_FAN;

        const messages = [
            { role: 'system', content: systemPrompt },
            ...conversationHistory.slice(-10)
        ];

        const res = await fetch(AI_CONFIG.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: messages,
                model: AI_CONFIG.model
            })
        });

        if (!res.ok) {
            throw new Error(`API error: ${res.status}`);
        }

        const data = await res.json();

        if (data.choices && data.choices[0]) {
            return data.choices[0].message.content.trim();
        }

        throw new Error('Formato de respuesta no reconocido');
    }

    // ==============================
    // LOCAL FALLBACK
    // ==============================
    function localFallback(query) {
        const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        const fanKB = [
            { keys: ['reproduc', 'escuchar', 'musica', 'play'], answer: '¡Fácil! 🎵 Ve al panel "Álbumes" o "Canciones" y haz click en cualquier canción. El reproductor aparece abajo. Para modo aleatorio, prueba "Radio KXON".' },
            { keys: ['letra', 'lyrics'], answer: 'Mientras suena la canción, haz click en el reproductor de abajo para expandirlo 🎶. Ahí ves la letra completa con secciones marcadas.' },
            { keys: ['buscar', 'busco', 'encontrar'], answer: 'Usa la barra de búsqueda arriba del dashboard 🔍. Con 2 letras ya muestra resultados de canciones, álbumes, beats y más.' },
            { keys: ['favorit', 'corazon'], answer: 'Click en el ícono de corazón ❤️ en cualquier canción o álbum. Los encuentras en el panel "Favoritos".' },
            { keys: ['playlist'], answer: 'Panel "Playlists" → "Nueva Playlist" → ponle nombre. Después agrega canciones desde el catálogo 🎶' },
            { keys: ['suscri', 'plan', 'pagar', 'precio', 'bloquea'], answer: 'Ve al panel "Planes" 🔒, elige tu plan, sigue los pasos de pago, sube comprobante y espera aprobación. ¡Listo! 🎉' },
            { keys: ['beat', 'comprar', 'marketplace'], answer: 'Panel "Marketplace" → escucha el preview → "Solicitar Compra" → sube comprobante. Cuando aprueben, queda en tu "Archivo" 📦' },
            { keys: ['live', 'en vivo', 'directo'], answer: 'Recibirás notificación automática 🔔 cuando haya live. También revisa el panel "En Vivo".' },
            { keys: ['embajador', 'referido', 'ganar'], answer: 'Programa de referidos 💰. Panel "Embajadores" → solicita ser parte → link único. Comisiones: Activador $1500, Constructor $2000, Líder $3000.' },
            { keys: ['perfil', 'foto'], answer: 'Panel "Mi Perfil" → sube nueva foto, cambia nombre y agrega bio. Se guarda automáticamente.' },
            { keys: ['contrasena', 'password', 'clave'], answer: 'Login → "¿Olvidaste tu contraseña?" → te llega email con link para cambiarla. Expira en 1 hora.' },
            { keys: ['instalar', 'app', 'movil', 'pwa'], answer: 'Android: Chrome → 3 puntos → "Agregar a pantalla de inicio". iPhone: Safari → compartir → "Agregar a pantalla de inicio" 📱' },
            { keys: ['notificacion', 'campan'], answer: 'La campanita 🔔 es tu centro de notificaciones. Número rojo = no leídas.' },
            { keys: ['radio'], answer: 'Radio KXON suena todo el catálogo en shuffle automático 🎵. Panel "Radio KXON" → play y relájate.' },
            { keys: ['no carga', 'no funciona', 'error', 'problema'], answer: 'Intenta: 1. Recargar página. 2. Limpiar caché. 3. Otro navegador. Si sigue, escríbele al equipo de KXON directamente 🙁' }
        ];

        const adminKB = [
            { keys: ['album', 'subir album'], answer: '1. Panel "Álbumes" → +Nuevo Álbum\n2. Título y portada (min 500x500px)\n3. Fecha de lanzamiento\n4. Guardar → agregar canciones.' },
            { keys: ['beat', 'marketplace', 'publicar beat'], answer: 'Panel Marketplace → +Nuevo Producto → título, tipo, imagen, audio preview, precio COP, BPM, género, tonalidad → Guardar.' },
            { keys: ['aprobar compra', 'solicitud compra'], answer: 'Panel Marketplace → Solicitudes pendientes → revisar comprobante → Aprobar o Rechazar. Notificación automática al fan.' },
            { keys: ['noticia'], answer: 'Panel Inicio → +Nueva Noticia → título, descripción, imagen opcional → Publicar. Badge "Nuevo" para fans.' },
            { keys: ['live', 'en vivo', 'activar live'], answer: '1. Panel "En Vivo"\n2. Pega URL de YouTube Live\n3. Título y descripción\n4. Click "Ir en Vivo"\nNotificación automática a todos.' },
            { keys: ['suscripcion', 'aprobar suscripcion'], answer: 'Panel Planes → Solicitudes pendientes → revisar comprobante → Aprobar. Fechas calculadas automáticamente.' },
            { keys: ['embajador'], answer: 'Panel Embajadores → Solicitudes → Aprobar. Sistema genera código y link automáticamente.' },
            { keys: ['analytics', 'estadistica', 'datos'], answer: 'Panel Analytics: KPIs de usuarios, reproducciones, compras, revenue. Gráficas 7d/30d/90d. Top canciones. Usuarios activos.' },
            { keys: ['letra', 'lyrics'], answer: 'Edición de canción → sección Letra. Usa [Intro] [Verso 1] [Coro] entre corchetes. El reproductor los resalta automáticamente.' },
            { keys: ['video', 'subir video'], answer: 'Panel "Videos" → +Nuevo Video. Link YouTube o archivo. Título, thumbnail y descripción.' }
        ];

        const kb = isAdmin ? adminKB : fanKB;
        let bestMatch = null, bestScore = 0;

        for (const entry of kb) {
            let score = 0;
            for (const key of entry.keys) {
                if (q.includes(key)) score += key.length;
            }
            if (score > bestScore) { bestScore = score; bestMatch = entry; }
        }

        if (bestMatch && bestScore > 0) return bestMatch.answer;

        return isAdmin
            ? 'No tengo información específica sobre eso. Puedo ayudarte con álbumes, marketplace, suscripciones, analytics, lives o embajadores. ¿Qué necesitas?'
            : 'Hmm, no estoy seguro de eso 🤔. Puedo ayudarte con: reproducir música, suscripciones, comprar beats, embajadores, tu perfil o los lives. ¿Qué te interesa?';
    }

    // ==============================
    // INIT
    // ==============================
    function init() {
        isAdmin = detectAdmin();
        console.log(`[KXON-AI] Iniciado · Modo: ${isAdmin ? 'ADMIN' : 'FAN'}`);
        buildChatWidget();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(init, 1500));
    } else {
        setTimeout(init, 1500);
    }

})();