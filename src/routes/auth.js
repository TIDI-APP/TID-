const express = require('express');
const router = express.Router();
const passport = require('passport');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../../db/queries');

const JWT_SECRET = process.env.JWT_SECRET || 'jwt_super_secret_tidi';

// Auth Routes (REST Manual JWT)
router.post('/api/auth/register', async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' });
        }

        const existing = await db.getUserByEmail(email);
        if (existing) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const newUser = await db.createUserManual(email, passwordHash, firstName, lastName);

        const token = jwt.sign(
            { id: newUser.id, email: newUser.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({ user: newUser, token });
    } catch (error) {
        console.error("Registro error:", error);
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
        if (!user || !user.password_hash) {
            return res.status(401).json({ error: 'Credenciales inválidas o debe usar Google Sign-In' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email },
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

// Google OAuth
router.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/public/views/login.html' }),
    function (req, res) {
        const user = req.user;
        const token = jwt.sign(
            { id: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        res.redirect(`/public/views/dashboard.html?token=${token}`);
    });

// API Misc Auth State
router.get('/api/current-user', (req, res) => {
    // Para simplificar, obtenemos lo que quedó en la sesión via passport si lo hay
    res.send(req.user || null);
});

router.get('/api/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        res.redirect('/public/views/login.html');
    });
});

module.exports = router;
