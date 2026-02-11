/* ============================================
   🔐 AUTH REGISTER JS - KXON
   Lógica de registro de cuenta
   Usa window.db de supabase-config.js
   ============================================ */

(function(){
    var db = window.db;

    var form = document.getElementById('registerForm');
    var btnSubmit = document.getElementById('btnSubmit');
    var btnGoogle = document.getElementById('btnGoogle');
    var authMsg = document.getElementById('authMessage');
    var passToggle = document.getElementById('passToggle');

    function showMsg(t, type) {
        authMsg.textContent = t;
        authMsg.className = 'auth-message show ' + type;
    }

    /* CHECK SESSION */
    (async function(){
        var r = await db.auth.getSession();
        if (r.data.session) window.location.href = 'dashboard.html';
    })();

    /* TOGGLE PASS */
    passToggle.addEventListener('click', function(){
        var p = document.getElementById('password');
        if (p.type === 'password') { p.type = 'text'; this.textContent = '🙈'; }
        else { p.type = 'password'; this.textContent = '👁️'; }
    });

    /* GOOGLE */
    btnGoogle.addEventListener('click', async function(){
        this.classList.add('loading');
        try {
            var r = await db.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: window.location.origin + '/dashboard.html' }
            });
            if (r.error) throw r.error;
            if (r.data && r.data.url) window.location.href = r.data.url;
        } catch(e) {
            showMsg('Error Google: ' + e.message, 'error');
            this.classList.remove('loading');
        }
    });

    /* REGISTER EMAIL */
    form.addEventListener('submit', async function(e){
        e.preventDefault();
        var fullName = document.getElementById('fullName').value.trim();
        var email = document.getElementById('email').value.trim();
        var password = document.getElementById('password').value;
        var roleEl = document.querySelector('input[name="role"]:checked');
        var role = roleEl ? roleEl.value : 'fan';

        if (!fullName) { showMsg('Ingresa tu nombre', 'error'); return; }
        if (!email) { showMsg('Ingresa tu email', 'error'); return; }
        if (!password || password.length < 6) { showMsg('Contraseña mínimo 6 caracteres', 'error'); return; }

        btnSubmit.classList.add('loading');
        btnSubmit.disabled = true;

        try {
            var r = await db.auth.signUp({
                email: email,
                password: password,
                options: { data: { full_name: fullName, role: role } }
            });

            if (r.error) throw r.error;

            if (r.data.user && r.data.session) {
                localStorage.setItem('kxon_role', role);
                localStorage.setItem('kxon_name', fullName);
                showMsg('¡Cuenta creada! Redirigiendo...', 'success');
                setTimeout(function(){ window.location.href = 'dashboard.html'; }, 1500);
            } else if (r.data.user && !r.data.session) {
                showMsg('Cuenta creada. Confirma tu email o desactiva "email confirmations" en Supabase Auth Settings.', 'info');
                btnSubmit.classList.remove('loading');
                btnSubmit.disabled = false;
            }
        } catch(e) {
            var msg = 'Error: ' + e.message;
            if (e.message.indexOf('already') >= 0) msg = 'Este email ya está registrado';
            else if (e.message.indexOf('valid email') >= 0) msg = 'Email inválido';
            else if (e.message.indexOf('rate') >= 0) msg = 'Muchos intentos, espera';
            showMsg(msg, 'error');
            btnSubmit.classList.remove('loading');
            btnSubmit.disabled = false;
        }
    });
})();