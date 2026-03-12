require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('./src/config/passport');
const authRoutes = require('./src/routes/auth');
const apiRoutes = require('./src/routes/api');

const app = express();

app.use(express.static(__dirname));
app.use(express.json());
app.use(cors());

app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: true,
}));

app.use(passport.initialize());
app.use(passport.session());

app.use('/', authRoutes);
app.use('/', apiRoutes);

module.exports = app;
