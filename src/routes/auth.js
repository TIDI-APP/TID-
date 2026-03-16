const express = require('express');
const router = express.Router();
const passport = require('passport');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../../db/queries');

const JWT_SECRET = process.env.JWT_SECRET || 'jwt_super_secret_tidi';

// Manual registration — hashes the password and creates a new user, then returns a signed JWT
router.post('/api/auth/register', async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' });
        }

        // Reject registration if the email is already in use
        const existingUser = await db.getUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const newUser = await db.createUserManual(email, passwordHash, firstName, lastName);

        // Issue a JWT so the user is immediately logged in after registering
        const token = jwt.sign(
            { id: newUser.id, email: newUser.email, first_name: newUser.first_name, last_name: newUser.last_name, is_premium: newUser.is_premium },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({ user: newUser, token });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ error: 'Error del servidor al registrarse' });
    }
});

router.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Faltan credenciales' });
        }

        const user = await db.getUserByEmail(email);
        // Reject if user doesn't exist or was created via Google (no password_hash set)
        if (!user || !user.password_hash) {
            return res.status(401).json({ error: 'Credenciales inválidas o debe usar Google Sign-In' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, avatar_url: user.avatar_url || null, is_premium: user.is_premium },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login exitoso',
            user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name },
            token
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: 'Error del servidor al iniciar sesión' });
    }
});

// Google OAuth — initiates the Google sign-in flow
router.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google OAuth — link an existing account to Google
router.get('/auth/google/link',
    passport.authenticate('google', { scope: ['profile', 'email'], state: 'link' }));

// Google OAuth callback — issues a JWT and redirects to the appropriate page
router.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/public/views/login.html' }),
    function (req, res) {
        const user = req.user;
        const token = jwt.sign(
            { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, avatar_url: user.avatar_url || null, is_premium: user.is_premium },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        // If the user came from the "link account" flow, redirect to config page instead of dashboard
        if (req.query.state === 'link') {
            return res.redirect(`/public/views/config.html?token=${token}&linked=1`);
        }
        res.redirect(`/public/views/dashboard.html?token=${token}`);
    });

// Returns the current session user (if any) — used by the passport session flow
router.get('/api/current-user', (req, res) => {
    res.send(req.user || null);
});

router.get('/api/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        res.redirect('/public/views/login.html');
    });
});

module.exports = router;
