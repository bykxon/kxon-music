/* ============================================
   👤 DASHBOARD-PERFIL.JS — KXON 2026 REBUILD
   Namespace: kx-prf-*
   Event delegation · escapeHtml · A11y
   CON EMAIL DE CUENTA ELIMINADA
   ============================================ */
(function () {

  var db = window.db;
  var K = window.KXON;

  /* ═══ EMAILJS CONFIG ═══ */
  var EMAILJS_PUBLIC_KEY = 'BJECVrT1UmA4CHVrK';
  var EMAILJS_SERVICE_ID = 'service_uv1v71r';
  var EMAILJS_TEMPLATE_DELETE = 'template_yfn2m2v';

  if (window.emailjs) {
    window.emailjs.init(EMAILJS_PUBLIC_KEY);
  }

  /* ══════════════════════════════════════════
     🛡️ UTILIDADES
     ══════════════════════════════════════════ */
  function esc(str) {
    if (!str) return '';
    if (typeof K.escapeHtml === 'function') return K.escapeHtml(str);
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(str));
    return d.innerHTML;
  }

  function $(id) { return document.getElementById(id); }

  function setText(id, text) {
    var el = $(id);
    if (el) el.textContent = text;
  }

  /* ══════════════════════════════════════════
     📧 EMAIL: CUENTA ELIMINADA
     ══════════════════════════════════════════ */
  function sendDeleteEmail(email, nombre) {
    if (!window.emailjs) {
      console.warn('EmailJS no disponible');
      return;
    }

    window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_DELETE, {
      to_email: email,
      nombre: nombre,
      register_link: window.location.origin + '/register.html'
    }).then(function () {
      console.log('✅ Email de cuenta eliminada enviado a', email);
    }).catch(function (err) {
      console.warn('⚠️ Error enviando email de eliminación:', err);
    });
  }

  /* ══════════════════════════════════════════
     👤 CARGAR DATOS PERFIL
     ══════════════════════════════════════════ */
  K.loadPerfilData = function () {
    if (!K.currentUser || !K.currentProfile) return;

    var profile = K.currentProfile;
    var user = K.currentUser;
    var name = profile.full_name || user.email.split('@')[0];
    var email = user.email;
    var role = profile.role || 'fan';
    var bio = profile.bio || '';
    var avatar = profile.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || '';
    var provider = user.app_metadata?.provider || 'email';

    setText('perfilNombreDisplay', name);
    setText('perfilEmailDisplay', email);

    var roleBadge = $('perfilRoleBadge');
    if (roleBadge) {
      roleBadge.textContent = role.toUpperCase();
      roleBadge.className = 'kx-prf-badge role-' + role;
    }

    setText('perfilProviderText', provider.charAt(0).toUpperCase() + provider.slice(1));

    var avatarImg = $('perfilAvatarImg');
    var avatarLetter = $('perfilAvatarLetter');
    if (avatar && avatarImg) {
      avatarImg.src = avatar;
      avatarImg.style.display = 'block';
      if (avatarLetter) avatarLetter.style.display = 'none';
    } else if (avatarImg) {
      avatarImg.style.display = 'none';
      if (avatarLetter) {
        avatarLetter.style.display = 'flex';
        avatarLetter.textContent = name.charAt(0).toUpperCase();
      }
    }

    var inputNombre = $('perfilNombre');
    var inputEmail = $('perfilEmail');
    var inputBio = $('perfilBio');
    if (inputNombre) inputNombre.value = name;
    if (inputEmail) inputEmail.value = email;
    if (inputBio) inputBio.value = bio;
    setText('perfilBioCount', String(bio.length));

    setText('perfilCuentaRol', role.charAt(0).toUpperCase() + role.slice(1));
    setText('perfilCuentaId', user.id);

    var createdAt = profile.created_at || user.created_at;
    if (createdAt) {
      var fecha = new Date(createdAt).toLocaleDateString('es-ES', {
        day: 'numeric', month: 'long', year: 'numeric'
      });
      setText('perfilCuentaFecha', fecha);

      var shortDate = new Date(createdAt).toLocaleDateString('es-ES', {
        month: 'short', year: 'numeric'
      });
      setText('prfKpiMember', shortDate);
    }

    setText('perfilCuentaProvider', provider.charAt(0).toUpperCase() + provider.slice(1));

    var oauthNotice = $('kxPrfOauthNotice');
    if (provider !== 'email' && oauthNotice) {
      oauthNotice.style.display = 'flex';
      setText('kxPrfOauthProvider', provider.charAt(0).toUpperCase() + provider.slice(1));
    }

    _loadProfileKPIs();
  };

  async function _loadProfileKPIs() {
    try {
      var planText = 'Free';
      if (K.currentProfile && K.currentProfile.plan_activo) {
        planText = K.currentProfile.plan_activo;
      }
      setText('prfKpiPlan', planText);

      if (K.currentUser) {
        var fav = await db.from('favoritos')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', K.currentUser.id);
        setText('prfKpiFavs', String(fav.count || 0));
      }
    } catch (e) {
      console.warn('KPIs perfil:', e);
    }
  }

  /* ══════════════════════════════════════════
     📑 TABS — EVENT DELEGATION
     ══════════════════════════════════════════ */
  var panelPerfil = $('panel-perfil');
  if (!panelPerfil) return;

  panelPerfil.addEventListener('click', function (e) {

    var tab = e.target.closest('.kx-prf-tab');
    if (tab) {
      e.preventDefault();
      var target = tab.getAttribute('data-prf-tab');
      if (!target) return;

      var allTabs = panelPerfil.querySelectorAll('.kx-prf-tab');
      for (var i = 0; i < allTabs.length; i++) {
        allTabs[i].classList.remove('active');
        allTabs[i].setAttribute('aria-selected', 'false');
      }
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      var allSections = panelPerfil.querySelectorAll('.kx-prf-section');
      for (var j = 0; j < allSections.length; j++) {
        allSections[j].classList.remove('active');
        allSections[j].style.display = 'none';
      }
      var mapping = { info: 'kxPrfTabInfo', security: 'kxPrfTabSecurity', account: 'kxPrfTabAccount' };
      var targetSection = $(mapping[target]);
      if (targetSection) {
        targetSection.classList.add('active');
        targetSection.style.display = 'block';
      }
      return;
    }

    var avatarWrap = e.target.closest('.kx-prf-avatar-wrap');
    if (avatarWrap) {
      e.preventDefault();
      var fileInput = $('perfilAvatarFile');
      if (fileInput) fileInput.click();
      return;
    }

    var passToggle = e.target.closest('.kx-prf-pass-toggle');
    if (passToggle) {
      e.preventDefault();
      var targetId = passToggle.getAttribute('data-target');
      var input = $(targetId);
      if (!input) return;
      var eyeOpen = passToggle.querySelector('.kx-prf-eye-open');
      var eyeClosed = passToggle.querySelector('.kx-prf-eye-closed');
      if (input.type === 'password') {
        input.type = 'text';
        if (eyeOpen) eyeOpen.style.display = 'none';
        if (eyeClosed) eyeClosed.style.display = 'block';
      } else {
        input.type = 'password';
        if (eyeOpen) eyeOpen.style.display = 'block';
        if (eyeClosed) eyeClosed.style.display = 'none';
      }
      return;
    }

    var copyBtn = e.target.closest('#kxPrfCopyId');
    if (copyBtn) {
      e.preventDefault();
      var idEl = $('perfilCuentaId');
      if (idEl && navigator.clipboard) {
        navigator.clipboard.writeText(idEl.textContent).then(function () {
          K.showToast('ID copiado al portapapeles', 'success');
        });
      }
      return;
    }

    var deleteBtn = e.target.closest('#btnEliminarCuenta');
    if (deleteBtn) {
      e.preventDefault();
      _openDeleteConfirm();
      return;
    }

    var confirmCancel = e.target.closest('#kxPrfConfirmCancel');
    if (confirmCancel) {
      e.preventDefault();
      _closeDeleteConfirm();
      return;
    }

    var confirmAccept = e.target.closest('#kxPrfConfirmAccept');
    if (confirmAccept && !confirmAccept.disabled) {
      e.preventDefault();
      _executeDelete();
      return;
    }

    var overlay = e.target.closest('.kx-prf-confirm-overlay');
    if (overlay && e.target === overlay) {
      _closeDeleteConfirm();
      return;
    }
  });

  panelPerfil.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      var avatarWrap = e.target.closest('.kx-prf-avatar-wrap');
      if (avatarWrap) {
        e.preventDefault();
        var fileInput = $('perfilAvatarFile');
        if (fileInput) fileInput.click();
      }
    }
  });

  /* ══════════════════════════════════════════
     📝 BIO COUNTER + PASSWORD
     ══════════════════════════════════════════ */
  panelPerfil.addEventListener('input', function (e) {
    if (e.target.id === 'perfilBio') {
      var count = e.target.value.length;
      if (count > 500) {
        e.target.value = e.target.value.substring(0, 500);
        count = 500;
      }
      setText('perfilBioCount', String(count));
      return;
    }

    if (e.target.id === 'perfilNewPass') {
      _updatePasswordStrength(e.target.value);
      _checkPasswordMatch();
      return;
    }

    if (e.target.id === 'perfilConfirmPass') {
      _checkPasswordMatch();
      return;
    }

    if (e.target.id === 'kxPrfDeleteConfirm') {
      var acceptBtn = $('kxPrfConfirmAccept');
      if (acceptBtn) {
        acceptBtn.disabled = e.target.value !== 'ELIMINAR';
      }
      return;
    }
  });

  /* ══════════════════════════════════════════
     🔑 PASSWORD STRENGTH
     ══════════════════════════════════════════ */
  function _updatePasswordStrength(pass) {
    var container = $('kxPrfPassStrength');
    var textEl = $('kxPrfPassText');
    if (!container) return;

    if (!pass || pass.length === 0) {
      container.style.display = 'none';
      return;
    }
    container.style.display = 'flex';

    var score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 10) score++;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    var levels = ['weak', 'weak', 'fair', 'good', 'strong', 'strong'];
    var labels = ['Muy débil', 'Débil', 'Regular', 'Buena', 'Fuerte', 'Muy fuerte'];
    var level = levels[score] || 'weak';
    var label = labels[score] || 'Débil';

    var bars = container.querySelectorAll('.kx-prf-pass-bar');
    var fillCount = score <= 1 ? 1 : score <= 2 ? 2 : score <= 3 ? 3 : 4;
    for (var i = 0; i < bars.length; i++) {
      bars[i].className = 'kx-prf-pass-bar' + (i < fillCount ? ' ' + level : '');
    }

    if (textEl) {
      textEl.textContent = label;
      textEl.className = 'kx-prf-pass-text ' + level;
    }
  }

  function _checkPasswordMatch() {
    var passEl = $('perfilNewPass');
    var confirmEl = $('perfilConfirmPass');
    var matchEl = $('kxPrfPassMatch');
    if (!passEl || !confirmEl || !matchEl) return;

    var pass = passEl.value;
    var confirm = confirmEl.value;

    if (!confirm || confirm.length === 0) {
      matchEl.style.display = 'none';
      return;
    }

    matchEl.style.display = 'flex';
    if (pass === confirm) {
      matchEl.className = 'kx-prf-pass-match';
      matchEl.querySelector('span').textContent = 'Las contraseñas coinciden';
    } else {
      matchEl.className = 'kx-prf-pass-match no-match';
      matchEl.querySelector('span').textContent = 'Las contraseñas no coinciden';
    }
  }

  /* ══════════════════════════════════════════
     📷 SUBIR AVATAR
     ══════════════════════════════════════════ */
  var avatarFile = $('perfilAvatarFile');
  if (avatarFile) {
    avatarFile.addEventListener('change', async function (e) {
      var file = e.target.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        K.showToast('La imagen debe ser menor a 5MB', 'error');
        return;
      }

      K.showToast('Subiendo foto...', 'success');

      try {
        var ext = file.name.split('.').pop();
        var fileName = K.currentUser.id + '_avatar_' + Date.now() + '.' + ext;

        var up = await db.storage.from('imagenes').upload('avatars/' + fileName, file, {
          contentType: file.type, upsert: true
        });
        if (up.error) throw up.error;

        var avatarUrl = db.storage.from('imagenes').getPublicUrl('avatars/' + fileName).data.publicUrl;

        var upd = await db.from('profiles').update({
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        }).eq('id', K.currentUser.id);
        if (upd.error) throw upd.error;

        K.currentProfile.avatar_url = avatarUrl;

        var img = $('perfilAvatarImg');
        var letter = $('perfilAvatarLetter');
        if (img) { img.src = avatarUrl; img.style.display = 'block'; }
        if (letter) letter.style.display = 'none';

        var sidebarAv = $('sidebarAvatar');
        if (sidebarAv) {
          sidebarAv.textContent = '';
          var sidebarImg = document.createElement('img');
          sidebarImg.src = avatarUrl;
          sidebarImg.alt = 'Avatar';
          sidebarAv.appendChild(sidebarImg);
        }

        K.showToast('¡Foto actualizada!', 'success');
      } catch (err) {
        console.error('Error subiendo avatar:', err);
        K.showToast('Error al subir foto: ' + esc(err.message), 'error');
      }

      avatarFile.value = '';
    });
  }

  /* ══════════════════════════════════════════
     💾 GUARDAR PERFIL
     ══════════════════════════════════════════ */
  var formPerfil = $('formPerfil');
  if (formPerfil) {
    formPerfil.addEventListener('submit', async function (e) {
      e.preventDefault();
      var nombre = ($('perfilNombre')?.value || '').trim();
      var bio = ($('perfilBio')?.value || '').trim();

      if (!nombre) {
        K.showToast('El nombre no puede estar vacío', 'error');
        return;
      }

      var btn = $('btnGuardarPerfil');
      var statusEl = $('perfilSaveStatus');
      if (btn) { btn.classList.add('loading'); btn.disabled = true; }
      if (statusEl) statusEl.textContent = '';

      try {
        var upd = await db.from('profiles').update({
          full_name: nombre,
          bio: bio,
          updated_at: new Date().toISOString()
        }).eq('id', K.currentUser.id);
        if (upd.error) throw upd.error;

        K.currentProfile.full_name = nombre;
        K.currentProfile.bio = bio;
        localStorage.setItem('kxon_name', nombre);

        setText('sidebarName', nombre);
        setText('perfilNombreDisplay', nombre);

        if (!K.currentProfile.avatar_url) {
          var letter = $('perfilAvatarLetter');
          if (letter) letter.textContent = nombre.charAt(0).toUpperCase();
        }

        if (statusEl) {
          statusEl.textContent = '✓ Guardado correctamente';
          statusEl.className = 'kx-prf-save-status success';
        }
        K.showToast('¡Perfil actualizado!', 'success');

        setTimeout(function () { if (statusEl) statusEl.textContent = ''; }, 4000);
      } catch (err) {
        console.error('Error guardando perfil:', err);
        if (statusEl) {
          statusEl.textContent = '✗ Error al guardar';
          statusEl.className = 'kx-prf-save-status error';
        }
        K.showToast('Error: ' + esc(err.message), 'error');
      }
      if (btn) { btn.classList.remove('loading'); btn.disabled = false; }
    });
  }

  /* ══════════════════════════════════════════
     🔑 CAMBIAR CONTRASEÑA
     ══════════════════════════════════════════ */
  var formPassword = $('formPassword');
  if (formPassword) {
    formPassword.addEventListener('submit', async function (e) {
      e.preventDefault();
      var newPass = ($('perfilNewPass')?.value) || '';
      var confirmPass = ($('perfilConfirmPass')?.value) || '';

      if (!newPass || newPass.length < 6) {
        K.showToast('La contraseña debe tener mínimo 6 caracteres', 'error');
        return;
      }
      if (newPass !== confirmPass) {
        K.showToast('Las contraseñas no coinciden', 'error');
        return;
      }

      var btn = $('btnCambiarPass');
      if (btn) { btn.classList.add('loading'); btn.disabled = true; }

      try {
        var r = await db.auth.updateUser({ password: newPass });
        if (r.error) throw r.error;

        K.showToast('¡Contraseña actualizada correctamente!', 'success');

        var p1 = $('perfilNewPass');
        var p2 = $('perfilConfirmPass');
        if (p1) p1.value = '';
        if (p2) p2.value = '';

        var strength = $('kxPrfPassStrength');
        var match = $('kxPrfPassMatch');
        if (strength) strength.style.display = 'none';
        if (match) match.style.display = 'none';

      } catch (err) {
        console.error('Error cambiando contraseña:', err);
        var msg = 'Error al cambiar contraseña';
        if (err.message && err.message.indexOf('same') >= 0) msg = 'La nueva contraseña debe ser diferente a la actual';
        else if (err.message && err.message.indexOf('weak') >= 0) msg = 'La contraseña es muy débil';
        K.showToast(msg, 'error');
      }
      if (btn) { btn.classList.remove('loading'); btn.disabled = false; }
    });
  }

  /* ══════════════════════════════════════════
     🗑️ ELIMINAR CUENTA — CON EMAIL
     ══════════════════════════════════════════ */
  function _openDeleteConfirm() {
    var overlay = $('kxPrfConfirmOverlay');
    var input = $('kxPrfDeleteConfirm');
    var accept = $('kxPrfConfirmAccept');
    if (overlay) overlay.classList.add('show');
    if (input) { input.value = ''; input.focus(); }
    if (accept) accept.disabled = true;
  }

  function _closeDeleteConfirm() {
    var overlay = $('kxPrfConfirmOverlay');
    if (overlay) overlay.classList.remove('show');
  }

  async function _executeDelete() {
    try {
      // Guardar datos antes de eliminar para el email
      var userEmail = K.currentUser.email;
      var userName = K.currentProfile.full_name || K.currentUser.email.split('@')[0];

      K.showToast('Eliminando cuenta...', 'error');

      await db.from('favoritos').delete().eq('user_id', K.currentUser.id);
      await db.from('compras').delete().eq('comprador_id', K.currentUser.id);
      await db.from('solicitudes_compra').delete().eq('comprador_id', K.currentUser.id);
      await db.from('profiles').delete().eq('id', K.currentUser.id);

      // Enviar email de despedida ANTES de cerrar sesión
      sendDeleteEmail(userEmail, userName);

      await db.auth.signOut();

      localStorage.removeItem('kxon_role');
      localStorage.removeItem('kxon_name');

      _closeDeleteConfirm();
      K.showToast('Cuenta eliminada correctamente', 'success');

      setTimeout(function () { window.location.href = 'index.html'; }, 2000);
    } catch (err) {
      console.error('Error eliminando cuenta:', err);
      K.showToast('Error al eliminar: ' + esc(err.message), 'error');
    }
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var overlay = $('kxPrfConfirmOverlay');
      if (overlay && overlay.classList.contains('show')) {
        _closeDeleteConfirm();
      }
    }
  });

})();