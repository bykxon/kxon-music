/* ============================================
   🔐 AUTH JS — KXON MUSIC PLATFORM
   Unified auth controller for Login, Register, Forgot Password
   Versión: 3.0 — Rediseño Total 2026
   Requires: supabase-config.js (window.db)
   ============================================ */

(function () {
    'use strict';

    /* ──────────────────────────────────
       🔌 DEPENDENCIES
       ────────────────────────────────── */
    const db = window.db;
    if (!db) {
        console.error('❌ KXON Auth: window.db not found. Ensure supabase-config.js loads first.');
        return;
    }

    const page = document.body.dataset.page; // 'login' | 'register' | 'forgot'
    if (!page) return;

    /* ──────────────────────────────────
       🛠️ UTILITIES
       ────────────────────────────────── */
    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => ctx.querySelectorAll(sel);

    const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    /** Show global auth message */
    function showMessage(text, type = 'error') {
        const el = $('#authMessage');
        if (!el) return;
        el.textContent = text;
        el.className = `kx-auth-message is-visible is-${type}`;
    }

    /** Clear global auth message */
    function clearMessage() {
        const el = $('#authMessage');
        if (!el) return;
        el.className = 'kx-auth-message';
        el.textContent = '';
    }

    /** Set field validation state */
    function setFieldState(fieldEl, state) {
        if (!fieldEl) return;
        fieldEl.classList.remove('is-valid', 'is-error');
        if (state) fieldEl.classList.add(state);
    }

    /** Set field error message */
    function setFieldError(fieldEl, message = '') {
        if (!fieldEl) return;
        const errorEl = fieldEl.querySelector('.kx-auth-error');
        if (errorEl) errorEl.textContent = message;
        setFieldState(fieldEl, message ? 'is-error' : null);
    }

    /** Clear all field errors */
    function clearFieldErrors() {
        $$('.kx-auth-field').forEach(field => {
            setFieldError(field, '');
        });
    }

    /** Set loading state on a button */
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

    /** Debounce */
    function debounce(fn, ms = 300) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), ms);
        };
    }

    /* ──────────────────────────────────
       🔐 SESSION CHECK
       Redirect if already logged in
       ────────────────────────────────── */
    async function checkSession() {
        try {
            const { data } = await db.auth.getSession();
            if (data.session) {
                window.location.href = 'dashboard.html';
            }
        } catch (e) {
            // Silent fail — user just needs to login
        }
    }

    if (page === 'login' || page === 'register') {
        checkSession();
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
       💪 PASSWORD STRENGTH (register)
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
        }

        if (error) {
            setFieldError(field, error);
            return false;
        }

        setFieldError(field, '');
        if (value.trim()) setFieldState(field, 'is-valid');
        return true;
    }

    // Attach real-time validation to all inputs
    $$('.kx-auth-input').forEach(input => {
        const fieldEl = input.closest('.kx-auth-field');
        const fieldName = fieldEl?.dataset.field;
        if (!fieldName) return;

        // Validate on blur
        input.addEventListener('blur', () => {
            if (input.value) validateField(fieldName, input.value);
        });

        // Clear error on input (with debounce for re-validation)
        input.addEventListener('input', debounce(() => {
            if (fieldEl.classList.contains('is-error')) {
                validateField(fieldName, input.value);
            } else if (input.value) {
                validateField(fieldName, input.value);
            }
        }, 400));
    });

    /* ──────────────────────────────────
       🌐 GOOGLE AUTH
       ────────────────────────────────── */
    const btnGoogle = $('#btnGoogle');

    if (btnGoogle) {
        btnGoogle.addEventListener('click', async () => {
            setLoading(btnGoogle, true);
            clearMessage();

            try {
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

                // Validate
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

                    // Fetch profile
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
                        // Non-critical: continue login
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
       📝 REGISTER
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

                // Validate all fields
                const validName = validateField('fullName', fullName);
                const validEmail = validateField('email', email);
                const validPass = validateField('password', password);

                if (!validName || !validEmail || !validPass) return;

                setLoading(btnSubmit, true);

                try {
                    const { data, error } = await db.auth.signUp({
                        email,
                        password,
                        options: {
                            data: {
                                full_name: fullName,
                                role: role
                            }
                        }
                    });

                    if (error) throw error;

                    if (data.user && data.session) {
                        // Auto-confirmed: redirect
                        localStorage.setItem('kxon_role', role);
                        localStorage.setItem('kxon_name', fullName);

                        showMessage('¡Cuenta creada! Redirigiendo...', 'success');

                        setTimeout(() => {
                            window.location.href = 'dashboard.html';
                        }, 1200);
                    } else if (data.user && !data.session) {
                        // Needs email confirmation
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

                    // Show success view
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
       Stagger form fields on load
       ────────────────────────────────── */
    function animateEntrance() {
        const elements = [
            '.kx-auth-google',
            '.kx-auth-note',
            '.kx-auth-divider',
            ...Array.from($$('.kx-auth-field')).map((_, i) => `.kx-auth-field:nth-child(${i + 1})`),
            '.kx-auth-submit',
            '.kx-auth-footer'
        ];

        const allEls = $$('.kx-auth-google, .kx-auth-note, .kx-auth-divider, .kx-auth-field, .kx-auth-submit, .kx-auth-footer, .kx-auth-back');

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

        // Clean inline styles after animation
        setTimeout(() => {
            allEls.forEach(el => {
                el.style.removeProperty('opacity');
                el.style.removeProperty('transform');
                el.style.removeProperty('transition');
            });
        }, 1500);
    }

    // Respect prefers-reduced-motion
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', animateEntrance);
        } else {
            animateEntrance();
        }
    }

})();