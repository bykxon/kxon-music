/* ============================================
   🔐 AUTH LOGIN JS - KXON
   Lógica de inicio de sesión
   Usa window.db de supabase-config.js
   ============================================ */

(function(){
    var db = window.db;

    var form = document.getElementById('loginForm');
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

    /* LOGIN EMAIL */
    form.addEventListener('submit', async function(e){
        e.preventDefault();
        var email = document.getElementById('email').value.trim();
        var password = document.getElementById('password').value;
        if (!email || !password) { showMsg('Completa todos los campos', 'error'); return; }

        btnSubmit.classList.add('loading');
        btnSubmit.disabled = true;

        try {
            var r = await db.auth.signInWithPassword({ email: email, password: password });
            if (r.error) throw r.error;

            var p = await db.from('profiles').select('role,full_name').eq('id', r.data.user.id).single();
            var role = p.data ? p.data.role : 'fan';
            var name = p.data ? p.data.full_name : '';
            localStorage.setItem('kxon_role', role);
            localStorage.setItem('kxon_name', name);

            showMsg('¡Bienvenido! Redirigiendo...', 'success');
            setTimeout(function(){ window.location.href = 'dashboard.html'; }, 1500);
        } catch(e) {
            var msg = 'Error al iniciar sesión';
            if (e.message.indexOf('Invalid login') >= 0) msg = 'Email o contraseña incorrectos';
            else if (e.message.indexOf('Email not confirmed') >= 0) msg = 'Confirma tu email primero';
            showMsg(msg, 'error');
            btnSubmit.classList.remove('loading');
            btnSubmit.disabled = false;
        }
    });
})();