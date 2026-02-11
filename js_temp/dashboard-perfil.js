/* ============================================
   👤 DASHBOARD-PERFIL.JS — KXON
   Perfil: info personal, avatar, contraseña,
   cuenta, eliminar cuenta
   ============================================ */
(function () {

    var db = window.db;
    var K = window.KXON;

    /* ══════════════════════════════════════════
       👤 CARGAR DATOS PERFIL
       ══════════════════════════════════════════ */
    K.loadPerfilData = function () {
        if (!K.currentUser || !K.currentProfile) return;

        var name = K.currentProfile.full_name || K.currentUser.email.split('@')[0];
        var email = K.currentUser.email;
        var role = K.currentProfile.role || 'fan';
        var bio = K.currentProfile.bio || '';
        var avatar = K.currentProfile.avatar_url || K.currentUser.user_metadata?.avatar_url || K.currentUser.user_metadata?.picture || '';

        /* Display */
        document.getElementById('perfilNombreDisplay').textContent = name;
        document.getElementById('perfilEmailDisplay').textContent = email;

        /* Role badge */
        var roleBadge = document.getElementById('perfilRoleBadge');
        roleBadge.textContent = role.toUpperCase();
        roleBadge.className = 'perfil-role-badge role-' + role;

        /* Avatar */
        var avatarImg = document.getElementById('perfilAvatarImg');
        var avatarLetter = document.getElementById('perfilAvatarLetter');
        if (avatar) {
            avatarImg.src = avatar;
            avatarImg.style.display = 'block';
            avatarLetter.style.display = 'none';
        } else {
            avatarImg.style.display = 'none';
            avatarLetter.style.display = 'flex';
            avatarLetter.textContent = name.charAt(0).toUpperCase();
        }

        /* Form fields */
        document.getElementById('perfilNombre').value = name;
        document.getElementById('perfilEmail').value = email;
        document.getElementById('perfilBio').value = bio;
        document.getElementById('perfilBioCount').textContent = bio.length;

        /* Cuenta info */
        document.getElementById('perfilCuentaRol').textContent = role.charAt(0).toUpperCase() + role.slice(1);
        document.getElementById('perfilCuentaId').textContent = K.currentUser.id;

        var createdAt = K.currentProfile.created_at || K.currentUser.created_at;
        if (createdAt) {
            var fecha = new Date(createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
            document.getElementById('perfilCuentaFecha').textContent = fecha;
        }

        var provider = K.currentUser.app_metadata?.provider || 'email';
        document.getElementById('perfilCuentaProvider').textContent = provider.charAt(0).toUpperCase() + provider.slice(1);
    };

    /* ══════════════════════════════════════════
       📝 BIO COUNTER
       ══════════════════════════════════════════ */
    document.getElementById('perfilBio').addEventListener('input', function () {
        var count = this.value.length;
        document.getElementById('perfilBioCount').textContent = count;
        if (count > 500) {
            this.value = this.value.substring(0, 500);
            document.getElementById('perfilBioCount').textContent = 500;
        }
    });

    /* ══════════════════════════════════════════
       📷 SUBIR AVATAR
       ══════════════════════════════════════════ */
    document.getElementById('perfilAvatarOverlay').addEventListener('click', function () {
        document.getElementById('perfilAvatarFile').click();
    });

    document.getElementById('perfilAvatarFile').addEventListener('change', async function (e) {
        var file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { K.showToast('La imagen debe ser menor a 5MB', 'error'); return; }

        K.showToast('Subiendo foto...', 'success');

        try {
            var ext = file.name.split('.').pop();
            var fileName = K.currentUser.id + '_avatar_' + Date.now() + '.' + ext;

            var up = await db.storage.from('imagenes').upload('avatars/' + fileName, file, { contentType: file.type, upsert: true });
            if (up.error) throw up.error;

            var avatarUrl = db.storage.from('imagenes').getPublicUrl('avatars/' + fileName).data.publicUrl;

            var upd = await db.from('profiles').update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() }).eq('id', K.currentUser.id);
            if (upd.error) throw upd.error;

            K.currentProfile.avatar_url = avatarUrl;
            document.getElementById('perfilAvatarImg').src = avatarUrl;
            document.getElementById('perfilAvatarImg').style.display = 'block';
            document.getElementById('perfilAvatarLetter').style.display = 'none';

            var sidebarAv = document.getElementById('sidebarAvatar');
            sidebarAv.innerHTML = '<img src="' + avatarUrl + '" alt="">';

            K.showToast('¡Foto actualizada!', 'success');
        } catch (err) {
            console.error('Error subiendo avatar:', err);
            K.showToast('Error al subir foto: ' + err.message, 'error');
        }
    });

    /* ══════════════════════════════════════════
       💾 GUARDAR PERFIL
       ══════════════════════════════════════════ */
    document.getElementById('formPerfil').addEventListener('submit', async function (e) {
        e.preventDefault();
        var nombre = document.getElementById('perfilNombre').value.trim();
        var bio = document.getElementById('perfilBio').value.trim();
        if (!nombre) { K.showToast('El nombre no puede estar vacío', 'error'); return; }

        var btn = document.getElementById('btnGuardarPerfil');
        var statusEl = document.getElementById('perfilSaveStatus');
        btn.classList.add('loading'); btn.disabled = true;
        statusEl.textContent = '';

        try {
            var upd = await db.from('profiles').update({
                full_name: nombre, bio: bio, updated_at: new Date().toISOString()
            }).eq('id', K.currentUser.id);
            if (upd.error) throw upd.error;

            K.currentProfile.full_name = nombre;
            K.currentProfile.bio = bio;
            localStorage.setItem('kxon_name', nombre);

            document.getElementById('sidebarName').textContent = nombre;
            document.getElementById('perfilNombreDisplay').textContent = nombre;

            if (!K.currentProfile.avatar_url) {
                document.getElementById('perfilAvatarLetter').textContent = nombre.charAt(0).toUpperCase();
            }

            statusEl.textContent = '✓ Guardado';
            statusEl.className = 'perfil-save-status success';
            K.showToast('¡Perfil actualizado!', 'success');

            setTimeout(function () { statusEl.textContent = ''; }, 3000);
        } catch (err) {
            console.error('Error guardando perfil:', err);
            statusEl.textContent = '✗ Error';
            statusEl.className = 'perfil-save-status error';
            K.showToast('Error: ' + err.message, 'error');
        }
        btn.classList.remove('loading'); btn.disabled = false;
    });

    /* ══════════════════════════════════════════
       🔑 CAMBIAR CONTRASEÑA
       ══════════════════════════════════════════ */
    document.getElementById('formPassword').addEventListener('submit', async function (e) {
        e.preventDefault();
        var newPass = document.getElementById('perfilNewPass').value;
        var confirmPass = document.getElementById('perfilConfirmPass').value;
        if (!newPass || newPass.length < 6) { K.showToast('La contraseña debe tener mínimo 6 caracteres', 'error'); return; }
        if (newPass !== confirmPass) { K.showToast('Las contraseñas no coinciden', 'error'); return; }

        var btn = document.getElementById('btnCambiarPass');
        btn.classList.add('loading'); btn.disabled = true;

        try {
            var r = await db.auth.updateUser({ password: newPass });
            if (r.error) throw r.error;
            K.showToast('¡Contraseña actualizada correctamente!', 'success');
            document.getElementById('perfilNewPass').value = '';
            document.getElementById('perfilConfirmPass').value = '';
        } catch (err) {
            console.error('Error cambiando contraseña:', err);
            var msg = 'Error al cambiar contraseña';
            if (err.message.indexOf('same') >= 0) msg = 'La nueva contraseña debe ser diferente';
            else if (err.message.indexOf('weak') >= 0) msg = 'Contraseña muy débil';
            K.showToast(msg, 'error');
        }
        btn.classList.remove('loading'); btn.disabled = false;
    });

    /* ── Toggle password visibility ── */
    window._togglePerfilPass = function (inputId, btn) {
        var input = document.getElementById(inputId);
        if (input.type === 'password') { input.type = 'text'; btn.textContent = '🙈'; }
        else { input.type = 'password'; btn.textContent = '👁️'; }
    };

    /* ══════════════════════════════════════════
       🗑️ ELIMINAR CUENTA
       ══════════════════════════════════════════ */
    document.getElementById('btnEliminarCuenta').addEventListener('click', async function () {
        var confirmText = prompt(
            '⚠️ ADVERTENCIA: Esta acción eliminará tu cuenta permanentemente.\n\n' +
            'Se perderán todos tus datos, compras y archivos.\n\n' +
            'Escribe "ELIMINAR" para confirmar:'
        );

        if (confirmText !== 'ELIMINAR') {
            if (confirmText !== null) K.showToast('Debes escribir ELIMINAR para confirmar', 'error');
            return;
        }

        try {
            K.showToast('Eliminando cuenta...', 'error');
            await db.from('compras').delete().eq('comprador_id', K.currentUser.id);
            await db.from('solicitudes_compra').delete().eq('comprador_id', K.currentUser.id);
            await db.from('profiles').delete().eq('id', K.currentUser.id);
            await db.auth.signOut();
            localStorage.removeItem('kxon_role');
            localStorage.removeItem('kxon_name');
            K.showToast('Cuenta eliminada', 'success');
            setTimeout(function () { window.location.href = 'index.html'; }, 1500);
        } catch (err) {
            console.error('Error eliminando cuenta:', err);
            K.showToast('Error al eliminar: ' + err.message, 'error');
        }
    });

})();