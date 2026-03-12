requireAuth();

// Theme toggle
document.getElementById('themeToggle').addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    localStorage.setItem('lightMode', document.body.classList.contains('light-mode'));
});
if (localStorage.getItem('lightMode') === 'true') {
    document.body.classList.add('light-mode');
}

// Mobile sidebar
const sidebar  = document.getElementById('mobileSidebar');
const overlay  = document.getElementById('menuOverlay');
const closeBtn = document.getElementById('closeSidebar');
document.getElementById('menuToggle').addEventListener('click', () => {
    sidebar.classList.add('active');
    overlay.classList.add('active');
});
function closeMenu() {
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
}
closeBtn.addEventListener('click', closeMenu);
overlay.addEventListener('click', closeMenu);

// Fade in
window.addEventListener('load', () => {
    document.querySelectorAll('.fade-in').forEach((el, i) => {
        setTimeout(() => el.classList.add('show'), i * 120);
    });
});

// Handle redirect after Google link
(function handleLinkReturn() {
    const params = new URLSearchParams(window.location.search);
    const newToken = params.get('token');
    const linked = params.get('linked');
    if (newToken) {
        localStorage.setItem('tidi_token', newToken);
        history.replaceState(null, '', window.location.pathname);
    }
    if (linked === '1') {
        const msg = document.getElementById('linkedMsg');
        if (msg) {
            msg.style.display = '';
            setTimeout(() => msg.style.display = 'none', 4000);
        }
    }
})();

// Load profile
const editModal = new bootstrap.Modal(document.getElementById('editProfileModal'));

async function loadProfile() {
    try {
        const res = await fetch('/api/profile', {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!res.ok) return;
        const user = await res.json();
        renderProfile(user);
    } catch (e) {
        console.error('Error loading profile:', e);
    }
}

function renderProfile(user) {
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email.split('@')[0];
    const initials = ((user.first_name || '')[0] || '') + ((user.last_name || '')[0] || '') || (user.email[0] || '?');

    document.getElementById('profileName').textContent = fullName;
    document.getElementById('profileEmail').textContent = user.email;
    document.getElementById('detailEmail').textContent = user.email;

    if (user.google_id) {
        document.getElementById('profileAuthType').textContent = 'Cuenta de Google';
        document.getElementById('detailAuthMethod').textContent = 'Google';
        document.getElementById('detailAuthIcon').className = 'bi bi-google opacity-25 fs-5';
        document.getElementById('btnLinkGoogle').style.display = 'none';
    } else {
        document.getElementById('profileAuthType').textContent = 'Cuenta con contraseña';
        document.getElementById('detailAuthMethod').textContent = 'Email y contraseña';
        document.getElementById('detailAuthIcon').className = 'bi bi-lock opacity-25 fs-5';
        document.getElementById('btnLinkGoogle').style.display = '';
    }

    if (user.avatar_url) {
        document.getElementById('avatarInitials').style.display = 'none';
        const img = document.getElementById('avatarImg');
        img.src = user.avatar_url;
        img.style.display = 'block';
    } else {
        document.getElementById('avatarInitials').textContent = initials.toUpperCase();
        document.getElementById('avatarImg').style.display = 'none';
    }

    document.getElementById('inputFirstName').value = user.first_name || '';
    document.getElementById('inputLastName').value = user.last_name || '';
}

document.getElementById('btnEditProfile').addEventListener('click', () => {
    document.getElementById('editProfileError').style.display = 'none';
    editModal.show();
});

document.getElementById('btnSaveProfile').addEventListener('click', async () => {
    const btn = document.getElementById('btnSaveProfile');
    const errEl = document.getElementById('editProfileError');
    const first_name = document.getElementById('inputFirstName').value.trim();
    const last_name = document.getElementById('inputLastName').value.trim();

    if (!first_name) {
        errEl.textContent = 'El nombre no puede estar vacío.';
        errEl.style.display = '';
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Guardando...';
    errEl.style.display = 'none';

    try {
        const res = await fetch('/api/profile', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({ first_name, last_name })
        });

        const result = await res.json();
        if (!res.ok) {
            errEl.textContent = result.error || 'Error al guardar.';
            errEl.style.display = '';
        } else {
            // Save new token with updated name
            localStorage.setItem('tidi_token', result.token);
            editModal.hide();
            renderProfile(result.user);
        }
    } catch (e) {
        errEl.textContent = 'Error de conexión.';
        errEl.style.display = '';
    }

    btn.disabled = false;
    btn.textContent = 'Guardar cambios';
});

loadProfile();
