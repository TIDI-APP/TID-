// auth.js — JWT session management for the frontend

const TOKEN_KEY = 'tidi_token';

// Returns the stored JWT string from localStorage
function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

// Persists the JWT to localStorage
function saveToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}

// Removes the JWT from localStorage (used on logout)
function removeToken() {
    localStorage.removeItem(TOKEN_KEY);
}

// Decodes the JWT payload (base64) without verifying the signature
function decodeToken(token) {
    try {
        const payload = token.split('.')[1];
        return JSON.parse(atob(payload));
    } catch {
        return null;
    }
}

// Returns true if the token's expiration time has passed
function isTokenExpired(token) {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return true;
    return decoded.exp * 1000 < Date.now();
}

// Returns the decoded user object if the token is valid, otherwise null
function getUser() {
    const token = getToken();
    if (!token || isTokenExpired(token)) return null;
    return decodeToken(token);
}

// Clears the session and redirects to the login page
function logout() {
    removeToken();
    window.location.href = '/public/views/login.html';
}

// Route guard: redirects to login if there is no valid session
function requireAuth() {
    const token = getToken();
    if (!token || isTokenExpired(token)) {
        window.location.href = '/public/views/login.html';
    }
}

// Route guard: redirects to dashboard if the user is already logged in (for login/register pages)
function redirectIfLoggedIn() {
    const token = getToken();
    if (token && !isTokenExpired(token)) {
        window.location.href = '/public/views/dashboard.html';
    }
}
