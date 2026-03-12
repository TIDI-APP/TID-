// auth.js — Manejo de sesión JWT para el frontend

const TOKEN_KEY = 'tidi_token';

function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function saveToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}

function removeToken() {
    localStorage.removeItem(TOKEN_KEY);
}

function decodeToken(token) {
    try {
        const payload = token.split('.')[1];
        return JSON.parse(atob(payload));
    } catch {
        return null;
    }
}

function isTokenExpired(token) {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return true;
    return decoded.exp * 1000 < Date.now();
}

function getUser() {
    const token = getToken();
    if (!token || isTokenExpired(token)) return null;
    return decodeToken(token);
}

function logout() {
    removeToken();
    window.location.href = '/public/views/login.html';
}

// Guard: si no hay sesión válida, redirige al login
function requireAuth() {
    const token = getToken();
    if (!token || isTokenExpired(token)) {
        window.location.href = '/public/views/login.html';
    }
}

// Guard: si ya está logueado, redirige al dashboard (para login/register)
function redirectIfLoggedIn() {
    const token = getToken();
    if (token && !isTokenExpired(token)) {
        window.location.href = '/public/views/dashboard.html';
    }
}
