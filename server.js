require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const passport = require('./src/config/passport');

// Importar rutas modularizadas 
const authRoutes = require('./src/routes/auth');
const apiRoutes = require('./src/routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de Middlewares base
app.use(express.static(__dirname)); // Host root to mirror http-server
app.use(express.json());
app.use(cors());

// Configuración de Sesiones 
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: true,
}));

// Inicializar Passport
app.use(passport.initialize());
app.use(passport.session());

// Asegurar que existan directorios requeridos 
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Configuración de Rutas base (conservan los strings como "api/auth" intactos hacia el front)
app.use('/', authRoutes);
app.use('/', apiRoutes);

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend server running on http://localhost:${PORT} (Modularized Version)`);
});
