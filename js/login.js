document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const rememberMeCheck = document.getElementById('rememberMe');

    // Load saved username if exists
    const savedUser = Storage.get('friedays_user');
    if (savedUser) {
        usernameInput.value = savedUser;
        rememberMeCheck.checked = true;
    }

    // Toggle Password Visibility
    togglePasswordBtn.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        togglePasswordBtn.textContent = type === 'password' ? '👁️' : '🙈';
    });

    // Handle Login Submit
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const username = usernameInput.value.trim();
        
        if (rememberMeCheck.checked) {
            Storage.set('friedays_user', username);
        } else {
            Storage.remove('friedays_user');
        }

        // Save current session name for menu greeting
        Storage.set('friedays_session', username);

        // Redirect to menu
        window.location.href = 'menu.html';
    });
});