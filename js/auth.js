/* ============================================
   🔐 AUTH JS — KXON MUSIC PLATFORM
   Unified auth controller for Login, Register, Forgot Password
   Versión: 5.0 — Con soporte completo de Embajadores/Referidos
   Requires: supabase-config.js (window.db)
   ============================================ */

(function () {
    'use strict';

    /* ──────────────────────────────────
       🔌 DEPENDENCIES
       ────────────────────────────────── */
    const db = window.db;
    if (!db) {
        console.error('❌ KXON Auth: window.db not found.');
        return;
    }

    const page = document.body.dataset.page;
    if (!page) return;

    /* ──────────────────────────────────
       🛠️ UTILITIES
       ────────────────────────────────── */
    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => ctx.querySelectorAll(sel);

    const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function showMessage(text, type = 'error') {
        const el = $('#authMessage');
        if (!el) return;
        el.textContent = text;
        el.className = `kx-auth-message is-visible is-${type}`;
    }

    function clearMessage() {
        const el = $('#authMessage');
        if (!el) return;
        el.className = 'kx-auth-message';
        el.textContent = '';
    }

    function setFieldState(fieldEl, state) {
        if (!fieldEl) return;
        fieldEl.classList.remove('is-valid', 'is-error');
        if (state) fieldEl.classList.add(state);
    }

    function setFieldError(fieldEl, message = '') {
        if (!fieldEl) return;
        const errorEl = fieldEl.querySelector('.kx-auth-error');
        if (errorEl) errorEl.textContent = message;
        setFieldState(fieldEl, message ? 'is-error' : null);
    }

    function clearFieldErrors() {
        $$('.kx-auth-field').forEach(field => {
            setFieldError(field, '');
        });
    }

    function setLoading(btn, loading) {
        if (!btn) return;
        if (loading) {
            btn.classList.add('is-loading');
            btn.disabled = true;
        } else {
            btn.classList.remove('is-loading');
            btn.disabled = false;
        }
    }

    function debounce(fn, ms = 300) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), ms);
        };
    }

    /* ──────────────────────────────────
       🏆 REFERRAL CODE DETECTION
       Detecta ?ref=CODIGO en la URL
       ────────────────────────────────── */
    let detectedRefCode = '';
    let validatedEmbajador = null;

    function detectReferralCode() {
        if (page !== 'register') return;

        const params = new URLSearchParams(window.location.search);
        const refCode = (params.get('ref') || '').trim().toUpperCase();

        if (!refCode) {
            // Also check localStorage (from previous visit or Google redirect)
            const savedRef = localStorage.getItem('kxon_ref_code');
            if (savedRef) {
                detectedRefCode = savedRef;
                prefillReferralUI(savedRef);
                validateReferralCode(savedRef);
            }
            return;
        }

        detectedRefCode = refCode;

        // Save to localStorage (backup for Google OAuth redirect)
        localStorage.setItem('kxon_ref_code', refCode);

        prefillReferralUI(refCode);
        validateReferralCode(refCode);
    }

    function prefillReferralUI(code) {
        // Pre-fill the referral input
        const refInput = $('#referralCode');
        if (refInput) {
            refInput.value = code;
            refInput.readOnly = true;
            refInput.style.opacity = '0.8';
        }

        // Show the referral banner
        const banner = $('#referralBanner');
        const codeDisplay = $('#referralCodeDisplay');

        if (banner) banner.style.display = 'flex';
        if (codeDisplay) codeDisplay.textContent = code;
    }

    async function validateReferralCode(code) {
        if (!code) return false;

        try {
            const { data, error } = await db
                .from('embajadores')
                .select('id, usuario_nombre, codigo, estado, total_registrados')
                .eq('codigo', code)
                .eq('estado', 'activo')
                .single();

            const banner = $('#referralBanner');
            const codeDisplay = $('#referralCodeDisplay');
            const refField = $(`.kx-auth-field[data-field="referralCode"]`);

            if (error || !data) {
                // Invalid code
                validatedEmbajador = null;

                if (banner) {
                    banner.style.display = 'flex';
                    banner.classList.add('kx-auth-referral-banner--invalid');
                    const labelEl = banner.querySelector('.kx-auth-referral-label');
                    const checkEl = banner.querySelector('.kx-auth-referral-check');
                    if (labelEl) labelEl.textContent = 'Código de referido no válido';
                    if (checkEl) checkEl.textContent = '✗';
                }
                if (codeDisplay) codeDisplay.textContent = code;
                if (refField) setFieldError(refField, 'Este código no existe o está inactivo');

                // Clear localStorage if code is invalid
                localStorage.removeItem('kxon_ref_code');

                return false;
            }

            // Valid code — save ambassador data for later use
            validatedEmbajador = data;

            if (banner) {
                banner.style.display = 'flex';
                banner.classList.remove('kx-auth-referral-banner--invalid');
                const labelEl = banner.querySelector('.kx-auth-referral-label');
                if (labelEl) labelEl.textContent = 'Te invitó: ' + data.usuario_nombre;
            }
            if (codeDisplay) codeDisplay.textContent = code;
            if (refField) {
                setFieldError(refField, '');
                setFieldState(refField, 'is-valid');
            }

            return true;

        } catch (e) {
            console.warn('Error validating ref code:', e);
            return false;
        }
    }

    /* ──────────────────────────────────
       🏆 CREATE REFERRAL RECORD
       Se llama después de un registro exitoso
       ────────────────────────────────── */
    async function createReferralRecord(userId, userEmail, userName, refCode) {
        if (!refCode) return;

        try {
            // Use cached ambassador data if available, otherwise fetch
            let embajador = validatedEmbajador;

            if (!embajador || embajador.codigo !== refCode) {
                const { data, error } = await db
                    .from('embajadores')
                    .select('id, codigo, total_registrados')
                    .eq('codigo', refCode)
                    .eq('estado', 'activo')
                    .single();

                if (error || !data) {
                    console.warn('Ambassador not found for code:', refCode);
                    return;
                }
                embajador = data;
            }

            // Check if referral already exists (prevent duplicates)
            const { data: existing } = await db
                .from('referidos')
                .select('id')
                .eq('embajador_id', embajador.id)
                .eq('referido_email', userEmail)
                .limit(1);

            if (existing && existing.length > 0) {
                console.log('Referral already exists for', userEmail);
                cleanupRefStorage();
                return;
            }

            // Create referral record
            const { error: refError } = await db.from('referidos').insert({
                embajador_id: embajador.id,
                referido_user_id: userId,
                referido_email: userEmail,
                referido_nombre: userName,
                estado: 'registrado',
                comision_generada: 0,
                fecha_registro: new Date().toISOString()
            });

            if (refError) {
                console.error('Error creating referral:', refError);
                return;
            }

            // Safely increment ambassador's registered count
            const newCount = (embajador.total_registrados || 0) + 1;

            await db
                .from('embajadores')
                .update({
                    total_registrados: newCount,
                    updated_at: new Date().toISOString()
                })
                .eq('id', embajador.id);

            console.log('✅ Referral record created:', userEmail, '→', refCode);

            // Clean up localStorage
            cleanupRefStorage();

        } catch (e) {
            console.error('Error in createReferralRecord:', e);
        }
    }

    function cleanupRefStorage() {
        localStorage.removeItem('kxon_ref_code');
        localStorage.removeItem('kxon_pending_ref');
        localStorage.removeItem('kxon_pending_ref_name');
        localStorage.removeItem('kxon_pending_ref_email');
    }

    /* ──────────────────────────────────
       🏆 PROCESS PENDING REFERRALS
       Para Google OAuth y confirmación de email
       Se llama desde dashboard-init.js
       ────────────────────────────────── */
    window.KXON_processPendingReferral = async function (userId, userEmail, userName) {
        const pendingRef = localStorage.getItem('kxon_ref_code') ||
            localStorage.getItem('kxon_pending_ref');

        if (!pendingRef) return;

        console.log('🏆 Processing pending referral:', pendingRef);
        await createReferralRecord(userId, userEmail, userName, pendingRef);
    };

    /* ──────────────────────────────────
       🔐 SESSION CHECK
       ────────────────────────────────── */
    async function checkSession() {
        try {
            const { data } = await db.auth.getSession();
            if (data.session) {
                window.location.href = 'dashboard.html';
            }
        } catch (e) { }
    }

    if (page === 'login' || page === 'register') {
        checkSession();
    }

    // Detect referral code on register page
    if (page === 'register') {
        detectReferralCode();
    }

    /* ──────────────────────────────────
       🔑 PASSWORD TOGGLE
       ────────────────────────────────── */
    const passToggle = $('#passToggle');
    const passInput = $('#password');

    if (passToggle && passInput) {
        passToggle.addEventListener('click', () => {
            const showing = passToggle.getAttribute('aria-pressed') === 'true';
            passToggle.setAttribute('aria-pressed', String(!showing));
            passInput.type = showing ? 'password' : 'text';
            passToggle.setAttribute('aria-label', showing ? 'Mostrar contraseña' : 'Ocultar contraseña');
            passInput.focus();
        });
    }

    /* ──────────────────────────────────
       💪 PASSWORD STRENGTH
       ────────────────────────────────── */
    function getPasswordStrength(password) {
        if (!password) return { level: null, label: '', score: 0 };

        let score = 0;
        if (password.length >= 6) score++;
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (/[^a-zA-Z0-9]/.test(password)) score++;

        if (score <= 2) return { level: 'weak', label: 'Débil', score };
        if (score <= 3) return { level: 'fair', label: 'Regular', score };
        if (score <= 4) return { level: 'good', label: 'Buena', score };
        return { level: 'strong', label: 'Fuerte', score };
    }

    if (page === 'register' && passInput) {
        const strengthWrap = $('#passwordStrength');
        const strengthBar = $('#strengthBar');
        const strengthLabel = $('#strengthLabel');

        if (strengthWrap && strengthBar && strengthLabel) {
            passInput.addEventListener('input', debounce(() => {
                const val = passInput.value;
                if (!val) {
                    strengthWrap.classList.remove('is-visible');
                    return;
                }
                strengthWrap.classList.add('is-visible');
                const { level, label } = getPasswordStrength(val);
                strengthBar.setAttribute('data-level', level || '');
                strengthLabel.setAttribute('data-level', level || '');
                strengthLabel.textContent = label;
            }, 150));
        }
    }

    /* ──────────────────────────────────
       ✅ REAL-TIME FIELD VALIDATION
       ────────────────────────────────── */
    function validateField(fieldName, value) {
        const field = $(`.kx-auth-field[data-field="${fieldName}"]`);
        if (!field) return true;

        let error = '';

        switch (fieldName) {
            case 'fullName':
                if (!value.trim()) error = 'Ingresa tu nombre';
                else if (value.trim().length < 2) error = 'Mínimo 2 caracteres';
                break;
            case 'email':
                if (!value.trim()) error = 'Ingresa tu email';
                else if (!REGEX_EMAIL.test(value.trim())) error = 'Email inválido';
                break;
            case 'password':
                if (!value) error = 'Ingresa tu contraseña';
                else if (page === 'register' && value.length < 6) error = 'Mínimo 6 caracteres';
                break;
            case 'referralCode':
                // Optional field — no error if empty
                break;
        }

        if (error) {
            setFieldError(field, error);
            return false;
        }

        setFieldError(field, '');
        if (value.trim()) setFieldState(field, 'is-valid');
        return true;
    }

    $$('.kx-auth-input').forEach(input => {
        const fieldEl = input.closest('.kx-auth-field');
        const fieldName = fieldEl?.dataset.field;
        if (!fieldName) return;

        input.addEventListener('blur', () => {
            if (input.value) validateField(fieldName, input.value);
        });

        input.addEventListener('input', debounce(() => {
            if (fieldEl.classList.contains('is-error')) {
                validateField(fieldName, input.value);
            } else if (input.value) {
                validateField(fieldName, input.value);
            }
        }, 400));
    });

    // Validate referral code on blur (only if manually typed)
    const refCodeInput = $('#referralCode');
    if (refCodeInput) {
        refCodeInput.addEventListener('blur', debounce(async () => {
            if (refCodeInput.readOnly) return; // Skip if pre-filled from URL
            const val = refCodeInput.value.trim().toUpperCase();
            if (!val) {
                // Clear any previous validation
                const refField = $(`.kx-auth-field[data-field="referralCode"]`);
                if (refField) {
                    setFieldError(refField, '');
                    setFieldState(refField, null);
                }
                const banner = $('#referralBanner');
                if (banner) banner.style.display = 'none';
                return;
            }
            refCodeInput.value = val;
            await validateReferralCode(val);
        }, 500));
    }

    /* ──────────────────────────────────
       🌐 GOOGLE AUTH
       ────────────────────────────────── */
    const btnGoogle = $('#btnGoogle');

    if (btnGoogle) {
        btnGoogle.addEventListener('click', async () => {
            setLoading(btnGoogle, true);
            clearMessage();

            try {
                // Store referral code before redirect (Google will redirect away)
                const refCode = ($('#referralCode')?.value || '').trim().toUpperCase();
                if (refCode) {
                    localStorage.setItem('kxon_ref_code', refCode);
                }

                const { data, error } = await db.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: window.location.origin + '/dashboard.html'
                    }
                });

                if (error) throw error;
                if (data?.url) window.location.href = data.url;
            } catch (err) {
                showMessage('Error con Google: ' + err.message, 'error');
                setLoading(btnGoogle, false);
            }
        });
    }

    /* ──────────────────────────────────
       📧 LOGIN
       ────────────────────────────────── */
    if (page === 'login') {
        const form = $('#loginForm');
        const btnSubmit = $('#btnSubmit');

        if (form && btnSubmit) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                clearMessage();
                clearFieldErrors();

                const email = ($('#email')?.value || '').trim();
                const password = $('#password')?.value || '';

                const validEmail = validateField('email', email);
                const validPass = validateField('password', password);

                if (!validEmail || !validPass) return;

                setLoading(btnSubmit, true);

                try {
                    const { data, error } = await db.auth.signInWithPassword({
                        email,
                        password
                    });

                    if (error) throw error;

                    try {
                        const { data: profile } = await db
                            .from('profiles')
                            .select('role, full_name')
                            .eq('id', data.user.id)
                            .single();

                        if (profile) {
                            localStorage.setItem('kxon_role', profile.role || 'fan');
                            localStorage.setItem('kxon_name', profile.full_name || '');
                        }
                    } catch (profileErr) {
                        console.warn('Profile fetch failed:', profileErr.message);
                    }

                    showMessage('¡Bienvenido! Redirigiendo...', 'success');

                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1200);

                } catch (err) {
                    let msg = 'Error al iniciar sesión';

                    if (err.message?.includes('Invalid login')) {
                        msg = 'Email o contraseña incorrectos';
                    } else if (err.message?.includes('Email not confirmed')) {
                        msg = 'Confirma tu email primero. Revisa tu bandeja de entrada.';
                    } else if (err.message?.includes('rate')) {
                        msg = 'Demasiados intentos. Espera un momento.';
                    }

                    showMessage(msg, 'error');
                    setLoading(btnSubmit, false);
                }
            });
        }
    }

    /* ──────────────────────────────────
       📝 REGISTER — CON REFERIDOS
       ────────────────────────────────── */
    if (page === 'register') {
        const form = $('#registerForm');
        const btnSubmit = $('#btnSubmit');

        if (form && btnSubmit) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                clearMessage();
                clearFieldErrors();

                const fullName = ($('#fullName')?.value || '').trim();
                const email = ($('#email')?.value || '').trim();
                const password = $('#password')?.value || '';
                const roleEl = $('input[name="role"]:checked');
                const role = roleEl?.value || 'fan';
                const referralCode = ($('#referralCode')?.value || '').trim().toUpperCase();

                // Validate all fields
                const validName = validateField('fullName', fullName);
                const validEmail = validateField('email', email);
                const validPass = validateField('password', password);

                if (!validName || !validEmail || !validPass) return;

                // Validate referral code if provided
                if (referralCode) {
                    const isValidRef = await validateReferralCode(referralCode);
                    if (!isValidRef) {
                        showMessage('El código de referido no es válido', 'error');
                        return;
                    }
                }

                setLoading(btnSubmit, true);

                try {
                    const { data, error } = await db.auth.signUp({
                        email,
                        password,
                        options: {
                            data: {
                                full_name: fullName,
                                role: role,
                                referido_por: referralCode || null
                            }
                        }
                    });

                    if (error) throw error;

                    if (data.user && data.session) {
                        // ── AUTO-CONFIRMED ──
                        localStorage.setItem('kxon_role', role);
                        localStorage.setItem('kxon_name', fullName);

                        // Save referral code to profile
                        try {
                            await db.from('profiles').update({
                                referido_por: referralCode || null
                            }).eq('id', data.user.id);
                        } catch (profileErr) {
                            console.warn('Profile update for referral failed:', profileErr);
                        }

                        // Create referral record
                        if (referralCode) {
                            await createReferralRecord(
                                data.user.id,
                                email,
                                fullName,
                                referralCode
                            );
                        }

                        showMessage('¡Cuenta creada! Redirigiendo...', 'success');

                        setTimeout(() => {
                            window.location.href = 'bienvenida.html';
                        }, 1200);

                    } else if (data.user && !data.session) {
                        // ── NEEDS EMAIL CONFIRMATION ──
                        // Store referral info to process after confirmation
                        if (referralCode) {
                            localStorage.setItem('kxon_pending_ref', referralCode);
                            localStorage.setItem('kxon_pending_ref_name', fullName);
                            localStorage.setItem('kxon_pending_ref_email', email);
                        }

                        showMessage(
                            'Cuenta creada. Revisa tu email para confirmar tu cuenta.',
                            'info'
                        );
                        setLoading(btnSubmit, false);
                    }

                } catch (err) {
                    let msg = 'Error al crear cuenta';

                    if (err.message?.includes('already')) {
                        msg = 'Este email ya está registrado';
                    } else if (err.message?.includes('valid email')) {
                        msg = 'Ingresa un email válido';
                    } else if (err.message?.includes('rate')) {
                        msg = 'Demasiados intentos. Espera un momento.';
                    } else if (err.message?.includes('password')) {
                        msg = 'La contraseña no cumple los requisitos';
                    }

                    showMessage(msg, 'error');
                    setLoading(btnSubmit, false);
                }
            });
        }
    }

    /* ──────────────────────────────────
       🔑 FORGOT PASSWORD
       ────────────────────────────────── */
    if (page === 'forgot') {
        const form = $('#forgotForm');
        const btnSubmit = $('#btnSubmit');

        if (form && btnSubmit) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                clearMessage();
                clearFieldErrors();

                const email = ($('#email')?.value || '').trim();
                const validEmail = validateField('email', email);

                if (!validEmail) return;

                setLoading(btnSubmit, true);

                try {
                    const { error } = await db.auth.resetPasswordForEmail(email, {
                        redirectTo: window.location.origin + '/reset-password.html'
                    });

                    if (error) throw error;

                    const formView = $('#forgotFormView');
                    const successView = $('#forgotSuccessView');

                    if (formView) formView.hidden = true;
                    if (successView) successView.hidden = false;

                } catch (err) {
                    let msg = 'Error al enviar email';
                    if (err.message?.includes('rate')) {
                        msg = 'Demasiados intentos. Espera un momento.';
                    }
                    showMessage(msg, 'error');
                    setLoading(btnSubmit, false);
                }
            });
        }
    }

    /* ──────────────────────────────────
       ✨ ENTRANCE ANIMATIONS
       ────────────────────────────────── */
    function animateEntrance() {
        const allEls = $$('.kx-auth-referral-banner, .kx-auth-google, .kx-auth-note, .kx-auth-divider, .kx-auth-field, .kx-auth-submit, .kx-auth-footer, .kx-auth-back');

        allEls.forEach((el, i) => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(12px)';
            el.style.transition = `opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${0.15 + i * 0.06}s, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${0.15 + i * 0.06}s`;

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    el.style.opacity = '1';
                    el.style.transform = 'translateY(0)';
                });
            });
        });

        setTimeout(() => {
            allEls.forEach(el => {
                el.style.removeProperty('opacity');
                el.style.removeProperty('transform');
                el.style.removeProperty('transition');
            });
        }, 1500);
    }

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', animateEntrance);
        } else {
            animateEntrance();
        }
    }

})();