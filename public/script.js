document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const toRegister = document.getElementById('to-register');
    const toLogin = document.getElementById('to-login');
    const authCard = document.getElementById('auth-card');

    const loginElement = document.getElementById('login-form-element');
    const registerElement = document.getElementById('register-form-element');
    const toast = document.getElementById('toast');

    // Use relative path since frontend is served by the same backend
    // If not served by the same backend, default to localhost:5001
    const API_URL = (window.location.protocol === 'file:')
        ? 'http://localhost:5001'
        : '';

    // Toggle logic
    toRegister.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        authCard.style.transform = 'scale(1.02)';
        setTimeout(() => authCard.style.transform = 'scale(1)', 300);
    });

    toLogin.addEventListener('click', (e) => {
        e.preventDefault();
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        authCard.style.transform = 'scale(1.02)';
        setTimeout(() => authCard.style.transform = 'scale(1)', 300);
    });

    // Helper: Show Toast
    function showToast(message, type = 'success') {
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.remove('hidden');

        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }

    // Register Form Handler
    registerElement.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fullname = document.getElementById('reg-fullname').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const confirmPassword = document.getElementById('reg-confirm').value;

        if (password !== confirmPassword) {
            return showToast('Passwords do not match', 'error');
        }

        try {
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullname, email, password, confirmPassword })
            });

            const data = await response.json();

            if (response.ok) {
                showToast('Registration successful! Please login.', 'success');
                registerElement.reset();
                setTimeout(() => toLogin.click(), 1500);
            } else {
                showToast(data.error || 'Registration failed', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Connection error. Is server running?', 'error');
        }
    });

    // Login Form Handler
    loginElement.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                showToast(`Welcome, ${data.user.fullname}!`, 'success');
                loginElement.reset();
                // Redirect to Netflix after a short delay
                setTimeout(() => {
                    window.location.href = data.redirect || '/netflix';
                }, 1500);
            } else {
                showToast(data.error || 'Login failed', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Connection error. Is server running?', 'error');
        }
    });
});
