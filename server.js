require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const passport = require('./src/config/passport');

const authRoutes = require('./src/routes/auth');
const apiRoutes = require('./src/routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname));
app.use(express.json());
app.use(cors());

// Ensure sessions directory exists for file-based session storage
const sessionsDir = path.join(__dirname, 'sessions');
if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir);

// Session middleware — only applied to non-API routes (OAuth flow uses sessions, API uses JWT)
const sessionMiddleware = session({
    store: new FileStore({ path: sessionsDir, ttl: 86400, reapInterval: 3600, retries: 0 }),
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false,
});

// Scope session middleware to OAuth routes only; API routes use JWT and don't need sessions
app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    sessionMiddleware(req, res, next);
});

app.use(passport.initialize());
// Scope passport session to OAuth routes only
app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    passport.session()(req, res, next);
});

// Ensure data and uploads directories exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

app.use('/', authRoutes);
app.use('/', apiRoutes);

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
