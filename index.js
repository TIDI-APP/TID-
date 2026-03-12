const { onRequest } = require('firebase-functions/v2/https');
const app = require('./app');

exports.app = onRequest({ region: 'us-central1', memory: '512MiB' }, app);
