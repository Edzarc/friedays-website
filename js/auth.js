// ============================================================================
// FRIEDAYS AUTHENTICATION MODULE
// Frontend authentication handling
// ============================================================================

const API_BASE_URL = 'http://localhost:5000';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validate email format
 */
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate Philippine phone number (+63XXXXXXXXXX)
 */
function isValidPhone(phone) {
    const normalized = phone.replace(/\s/g, '');
    return /^\+63\d{10}$/.test(normalized);
}

/**
 * Validate password strength
 */
function validatePasswordStrength(password) {
    const errors = [];
    if (password.length < 8) errors.push('At least 8 characters required');
    if (!/[A-Z]/.test(password)) errors.push('Must contain uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('Must contain lowercase letter');
    if (!/\d/.test(password)) errors.push('Must contain number');
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) errors.push('Must contain special character');
    return { valid: errors.length === 0, errors };
}

/**
 * Show error message
 */
function showError(fieldId, message) {
    const errorElement = document.getElementById(`error-${fieldId}`);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.add('show');
    }
}

/**
 * Clear error message
 */
function clearError(fieldId) {
    const errorElement = document.getElementById(`error-${fieldId}`);
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.classList.remove('show');
    }
}

/**
 * Clear all errors
 */
function clearAllErrors() {
    document.querySelectorAll('.error-message').forEach(el => {
        el.textContent = '';
        el.classList.remove('show');
    });
}

/**
 * Show loading state
 */
function setLoading(button, isLoading) {
    if (button) {
        button.disabled = isLoading;
        button.textContent = isLoading ? '⏳ Processing...' : 'Submit';
    }
}

/**
 * Update password strength indicator
 */
function updatePasswordStrength(passwordInput, strengthDiv) {
    if (!passwordInput || !strengthDiv) return;

    const password = passwordInput.value;
    let strength = 'weak';

    if (password.length >= 8) {
        let hasUpper = /[A-Z]/.test(password);
        let hasLower = /[a-z]/.test(password);
        let hasNumber = /\d/.test(password);
        let hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

        let count = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;

        if (count === 4) strength = 'strong';
        else if (count === 3) strength = 'good';
        else if (count === 2) strength = 'fair';
    }

    strengthDiv.className = `password-strength ${strength}`;
    strengthDiv.textContent = `Strength: ${strength.toUpperCase()}`;
}

// ============================================================================
// LOGIN HANDLER
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Check for OAuth redirects first
    handleOAuthRedirect();

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        if (Storage.get('friedays_token') && Storage.get('friedays_user')) {
            window.location.href = 'menu.html';
            return;
        }
        setupLoginForm();
        setupDevQuickLogin();
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        setupRegisterForm();
    }

    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    if (forgotPasswordForm) {
        setupForgotPasswordForm();
    }

    const resetPasswordForm = document.getElementById('resetPasswordForm');
    if (resetPasswordForm) {
        setupResetPasswordForm();
    }

    // Check if we're on verify-email page
    if (window.location.pathname.includes('verify-email')) {
        verifyEmail();
    }

    // Setup password toggles
    setupPasswordToggles();
});

/**
 * Handle OAuth redirect after provider callback
 */
function handleOAuthRedirect() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const user = params.get('user');
    const provider = params.get('provider');

    if (token && user) {
        try {
            // Store auth token and user info
            Storage.set('friedays_token', token);
            const userObject = JSON.parse(user);
            Storage.set('friedays_user', userObject);
            Storage.set('friedays_session', userObject.email);

            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);

            // Show success message
            const successMsg = document.createElement('div');
            successMsg.className = 'success-message show';
            successMsg.innerHTML = `
                <div class="success-box">
                    <p>✅ Welcome! You've been logged in with ${provider || 'OAuth'}.</p>
                    <p><small>Redirecting to menu...</small></p>
                </div>
            `;
            document.body.insertBefore(successMsg, document.body.firstChild);

            // Redirect to menu
            setTimeout(() => {
                window.location.href = 'menu.html';
            }, 1500);
        } catch (error) {
            console.error('OAuth redirect handling error:', error);
        }
    }

    // Check for errors
    const error = params.get('error');
    if (error) {
        const errorMap = {
            'oauth_state_mismatch': 'OAuth session was tampered with. Please try again.',
            'oauth_email_not_found': 'Could not retrieve email from provider. Please use email/password login.',
            'oauth_failed': 'OAuth authentication failed. Please try again.'
        };
        const errorMsg = document.createElement('div');
        errorMsg.className = 'error-box';
        errorMsg.innerHTML = `<p>❌ ${errorMap[error] || 'Authentication error: ' + error}</p>`;
        document.body.insertBefore(errorMsg, document.body.firstChild);
    }
}

function setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const submitBtn = document.getElementById('submitBtn');
    const rememberMeCheck = document.getElementById('rememberMe');

    // Load saved email
    const savedEmail = Storage.get('friedays_email');
    if (savedEmail) {
        emailInput.value = savedEmail;
        rememberMeCheck.checked = true;
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearAllErrors();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        // Validation
        if (!email || !isValidEmail(email)) {
            showError('email', 'Please enter a valid email');
            return;
        }
        if (!password) {
            showError('password', 'Password is required');
            return;
        }

        setLoading(submitBtn, true);

        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.error) {
                    const errorEl = document.getElementById('errorMessage');
                    if (errorEl) {
                        errorEl.textContent = data.error;
                        errorEl.style.display = 'block';
                    } else {
                        showError('email', data.error);
                    }
                } else {
                    showError('email', 'Login failed. Please try again.');
                }
                return;
            }

            // Success
            if (rememberMeCheck.checked) {
                Storage.set('friedays_email', email);
            } else {
                Storage.remove('friedays_email');
            }

            // Store auth token and user info
            Storage.set('friedays_token', data.token);
            Storage.set('friedays_user', data.user);
            Storage.set('friedays_session', data.user.email);

            // Redirect to menu/dashboard
            setTimeout(() => {
                window.location.href = 'menu.html';
            }, 500);
        } catch (error) {
            console.error('Login error:', error);
            showError('email', 'Network error. Please try again.');
        } finally {
            setLoading(submitBtn, false);
        }
    });
}
function setupDevQuickLogin() {
    const quickButton = document.getElementById('quickLoginBtn');
    if (!quickButton) return;

    const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    if (!isLocal) {
        quickButton.style.display = 'none';
        return;
    }

    quickButton.style.display = 'block';
    quickButton.addEventListener('click', () => {
        const devUser = {
            id: 'local-dev-user',
            email: 'dev@friedays.local',
            first_name: 'Dev',
            last_name: 'Tester',
            tier: 'BRONZE',
        };

        Storage.set('friedays_token', 'dev-local-token');
        Storage.set('friedays_user', devUser);
        Storage.set('friedays_session', devUser.email);
        Storage.set('friedays_email', devUser.email);

        window.location.href = 'menu.html';
    });
}
// ============================================================================
// REGISTER HANDLER
// ============================================================================

function setupRegisterForm() {
    const registerForm = document.getElementById('registerForm');
    const passwordInput = document.getElementById('password');
    const passwordStrengthDiv = document.getElementById('password-strength');
    const submitBtn = document.getElementById('submitBtn');

    // Update password strength as user types
    if (passwordInput && passwordStrengthDiv) {
        passwordInput.addEventListener('input', () => {
            updatePasswordStrength(passwordInput, passwordStrengthDiv);
        });
    }

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearAllErrors();

        const formData = {
            email: document.getElementById('email').value.trim(),
            password: document.getElementById('password').value,
            password_confirm: document.getElementById('password_confirm').value,
            first_name: document.getElementById('first_name').value.trim(),
            last_name: document.getElementById('last_name').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            address_line1: document.getElementById('address_line1').value.trim(),
            address_line2: document.getElementById('address_line2').value.trim() || null,
            city: document.getElementById('city').value.trim(),
            postal_code: document.getElementById('postal_code').value.trim(),
            country: 'PH',
            marketing_opt_in: document.getElementById('marketing_opt_in').checked,
            terms_accepted: document.getElementById('terms_accepted').checked,
            privacy_accepted: document.getElementById('privacy_accepted').checked,
        };

        // Validation
        if (!formData.first_name) {
            showError('first_name', 'First name required');
            return;
        }
        if (!formData.last_name) {
            showError('last_name', 'Last name required');
            return;
        }
        if (!isValidEmail(formData.email)) {
            showError('email', 'Please enter a valid email');
            return;
        }
        if (!isValidPhone(formData.phone)) {
            showError('phone', 'Invalid phone format. Use: +63XXXXXXXXXX');
            return;
        }
        if (formData.password.length < 8) {
            showError('password', 'Password must be at least 8 characters');
            return;
        }
        const { valid: passwordValid, errors: passwordErrors } = validatePasswordStrength(formData.password);
        if (!passwordValid) {
            showError('password', passwordErrors[0] || 'Password too weak');
            return;
        }
        if (formData.password !== formData.password_confirm) {
            showError('password_confirm', 'Passwords do not match');
            return;
        }
        if (!formData.address_line1) {
            showError('address_line1', 'Address required');
            return;
        }
        if (!formData.city) {
            showError('city', 'City required');
            return;
        }
        if (!formData.postal_code) {
            showError('postal_code', 'Postal code required');
            return;
        }
        if (!formData.terms_accepted) {
            showError('terms_accepted', 'You must accept Terms & Conditions');
            return;
        }
        if (!formData.privacy_accepted) {
            showError('privacy_accepted', 'You must accept Privacy Policy');
            return;
        }

        setLoading(submitBtn, true);

        try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.error) {
                    showError('email', data.error);
                } else if (data.errors && Array.isArray(data.errors)) {
                    showError('password', data.errors[0]);
                } else {
                    showError('email', 'Registration failed. Please try again.');
                }
                return;
            }

            // Success
            alert('✅ Account created! Check your email to verify your account.');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 500);
        } catch (error) {
            console.error('Registration error:', error);
            showError('email', 'Network error. Please try again.');
        } finally {
            setLoading(submitBtn, false);
        }
    });
}

// ============================================================================
// FORGOT PASSWORD HANDLER
// ============================================================================

function setupForgotPasswordForm() {
    const form = document.getElementById('forgotPasswordForm');
    const emailInput = document.getElementById('email');
    const successMessage = document.getElementById('successMessage');
    const submitBtn = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearAllErrors();
        successMessage.style.display = 'none';

        const email = emailInput.value.trim();

        if (!email || !isValidEmail(email)) {
            showError('email', 'Please enter a valid email');
            return;
        }

        setLoading(submitBtn, true);

        try {
            const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                showError('email', data.message || 'Request failed');
                return;
            }

            // Show success message
            successMessage.style.display = 'block';
            emailInput.value = '';
        } catch (error) {
            console.error('Forgot password error:', error);
            showError('email', 'Network error. Please try again.');
        } finally {
            setLoading(submitBtn, false);
        }
    });
}

// ============================================================================
// RESET PASSWORD HANDLER
// ============================================================================

function setupResetPasswordForm() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        document.getElementById('tokenInvalid').style.display = 'block';
        document.getElementById('resetPasswordForm').style.display = 'none';
        return;
    }

    const form = document.getElementById('resetPasswordForm');
    const passwordInput = document.getElementById('password');
    const passwordStrengthDiv = document.getElementById('password-strength');
    const successDiv = document.getElementById('successMessage');
    const submitBtn = form.querySelector('button[type="submit"]');

    form.style.display = 'block';

    // Password strength indicator
    if (passwordInput && passwordStrengthDiv) {
        passwordInput.addEventListener('input', () => {
            updatePasswordStrength(passwordInput, passwordStrengthDiv);
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearAllErrors();

        const password = passwordInput.value;
        const passwordConfirm = document.getElementById('password_confirm').value;

        if (password.length < 8) {
            showError('password', 'Password must be at least 8 characters');
            return;
        }
        const { valid, errors } = validatePasswordStrength(password);
        if (!valid) {
            showError('password', errors[0]);
            return;
        }
        if (password !== passwordConfirm) {
            showError('password_confirm', 'Passwords do not match');
            return;
        }

        setLoading(submitBtn, true);

        try {
            const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password, password_confirm: passwordConfirm }),
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.error === 'Reset token expired' || data.error === 'Invalid or already-used reset token') {
                    document.getElementById('resetPasswordForm').style.display = 'none';
                    document.getElementById('tokenInvalid').style.display = 'block';
                } else {
                    showError('password', data.error || 'Password reset failed');
                }
                return;
            }

            // Success
            form.style.display = 'none';
            successDiv.style.display = 'block';
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 3000);
        } catch (error) {
            console.error('Reset password error:', error);
            showError('password', 'Network error. Please try again.');
        } finally {
            setLoading(submitBtn, false);
        }
    });
}

// ============================================================================
// EMAIL VERIFICATION
// ============================================================================

async function verifyEmail() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        showVerificationError('No verification token provided');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/verify-email?token=${token}`);
        const data = await response.json();

        if (!response.ok) {
            showVerificationError(data.error || 'Verification failed');
            return;
        }

        // Success
        document.getElementById('verifying').style.display = 'none';
        document.getElementById('success').style.display = 'block';
        document.getElementById('backLink').style.display = 'block';
    } catch (error) {
        console.error('Verification error:', error);
        showVerificationError('Network error during verification');
    }
}

function showVerificationError(message) {
    document.getElementById('verifying').style.display = 'none';
    document.getElementById('error').style.display = 'block';
    document.getElementById('errorMessage').textContent = `❌ ${message}`;
}

// ============================================================================
// PASSWORD TOGGLE
// ============================================================================

function setupPasswordToggles() {
    document.querySelectorAll('.toggle-password').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const passwordInput = btn.parentElement.querySelector('input[type="password"], input[type="text"]');
            if (passwordInput) {
                const newType = passwordInput.type === 'password' ? 'text' : 'password';
                passwordInput.type = newType;
                btn.innerHTML = newType === 'password' 
                    ? '<span class="material-symbols-outlined">visibility</span>' 
                    : '<span class="material-symbols-outlined">visibility_off</span>';
            }
        });
    });
}

// ============================================================================
// LOGOUT
// ============================================================================

function logout() {
    Storage.remove('friedays_token');
    Storage.remove('friedays_user');
    Storage.remove('friedays_session');
    window.location.href = 'index.html';
}
