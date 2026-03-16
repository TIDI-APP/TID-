const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { transcribeAudio, analyzeTranscript, analyzeInvoice } = require('../services/groqSpeech');
const Groq = require('groq-sdk');
const db = require('../../db/queries');
const authMiddleware = require('../controllers/middlewares/authMiddleware');

const groq = new Groq();

// Converts a value from a given currency to COP using open.er-api.com (no API key required)
const convertToCOP = async (amount, currency) => {
    if (!currency || currency === 'COP') return { valueInCOP: amount, converted: false };
    try {
        const res = await fetch(`https://open.er-api.com/v6/latest/${currency}`);
        if (!res.ok) throw new Error('Exchange rate API error');
        const data = await res.json();
        const rate = data.rates?.COP;
        if (!rate) throw new Error('No COP rate found');
        return { valueInCOP: Math.round(amount * rate), converted: true, rate, originalCurrency: currency };
    } catch (err) {
        console.error('Error converting currency:', err.message);
        return { valueInCOP: amount, converted: false };
    }
};

// Multer: disk storage for audio files, memory storage for images
const upload = multer({ dest: 'uploads/' });
const uploadImage = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const dataDir = path.join(__dirname, '../../data');

// Saves a transaction from a pre-analyzed transcript (used by the voice flow without re-transcribing)
router.post('/api/voice-record', authMiddleware, async (req, res) => {
    const { transcript, timestamp } = req.body;

    if (!transcript) {
        return res.status(400).json({ error: 'No transcript provided.' });
    }

    const analysis = await analyzeTranscript(transcript);

    // Convert to COP if the detected currency is not COP
    if (analysis && analysis.valor) {
        const conversion = await convertToCOP(analysis.valor, analysis.moneda);
        analysis.valor = conversion.valueInCOP;
        analysis.moneda = 'COP';
    }

    // Save to Supabase
    try {
        const transaction = await db.createTransaction(req.user.id, analysis);
        res.status(200).json({ message: 'Record saved successfully.', record: transaction });
    } catch (e) {
        console.error('Error saving voice record to DB:', e);
        res.status(500).json({ error: 'Failed to save record.' });
    }
});

// Maximum number of AI-powered transactions allowed on the free plan
const AI_FREE_LIMIT = 3;

// Receives an audio file, transcribes it with Groq Whisper, analyzes the text, converts currency, and saves the transaction
router.post('/api/transcribe', authMiddleware, upload.single('audio'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided.' });
    }

    try {
        // Enforce AI usage limit for free users
        const aiCount = await db.countAiTransactions(req.user.id);
        if (aiCount >= AI_FREE_LIMIT) {
            try { if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); } catch (_) {}
            try { if (req.file && fs.existsSync(req.file.path + '.webm')) fs.unlinkSync(req.file.path + '.webm'); } catch (_) {}
            return res.status(402).json({ error: 'limit_reached' });
        }

        const audioPath = req.file.path;
        const transcriptionResult = await transcribeAudio(audioPath);
        const transcript = transcriptionResult.text;

        // Clean up the uploaded audio file after transcription
        try { fs.unlinkSync(transcriptionResult.finalPath); } catch (_) {}

        const analysis = await analyzeTranscript(transcript);

        if (!analysis || !analysis.tipo || !analysis.valor) {
            return res.status(422).json({ error: 'No se pudo entender la transacción. Intenta ser más específico (ej: "gasté 50 pesos en comida").' });
        }

        // Convert to COP if the detected currency is not COP
        const conversion = await convertToCOP(analysis.valor, analysis.moneda);
        const originalValue = analysis.valor;
        const originalCurrency = analysis.moneda || 'COP';
        analysis.valor = conversion.valueInCOP;
        analysis.moneda = 'COP';

        analysis.source = 'voice';
        const transaction = await db.createTransaction(req.user.id, analysis);

        res.status(200).json({
            message: 'Audio transcribed and saved.',
            transcript,
            conversion: conversion.converted ? {
                de: `${originalValue} ${originalCurrency}`,
                a: `${conversion.valueInCOP} COP`,
                tasa: conversion.rate
            } : null,
            record: transaction
        });

    } catch (error) {
        console.error('Error in /api/transcribe:', error);
        // Clean up uploaded file on error (try both original path and renamed .webm)
        try { if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); } catch (_) {}
        try { if (req.file && fs.existsSync(req.file.path + '.webm')) fs.unlinkSync(req.file.path + '.webm'); } catch (_) {}
        res.status(500).json({ error: 'Transcription failed.', details: error.message });
    }
});

// Saves a manually entered transaction from the dashboard form
router.post('/api/transactions', authMiddleware, async (req, res) => {
    const { tipo, titulo, valor, categoria } = req.body;

    if (!tipo || !valor) {
        return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const data = { tipo, titulo: titulo || categoria, valor: parseFloat(valor), categoria };

    try {
        const transaction = await db.createTransaction(req.user.id, data);
        res.status(201).json({ message: 'Transacción guardada.', transaction });
    } catch (error) {
        console.error('Error saving transaction:', error);
        res.status(500).json({ error: 'Error al guardar la transacción' });
    }
});

// Returns all transactions for the authenticated user, ordered by date descending
router.get('/api/transactions', authMiddleware, async (req, res) => {
    try {
        const transactions = await db.getTransactionsByUser(req.user.id);
        res.json(transactions);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ error: 'Error al obtener transacciones' });
    }
});

// Deletes a transaction by ID (only if it belongs to the authenticated user)
router.delete('/api/transactions/:id', authMiddleware, async (req, res) => {
    try {
        await db.deleteTransaction(req.params.id, req.user.id);
        res.json({ message: 'Transacción eliminada' });
    } catch (error) {
        console.error('Error deleting transaction:', error);
        res.status(500).json({ error: 'Error al eliminar la transacción' });
    }
});

// Receives an invoice image, sends it to Groq Vision for analysis, and saves the resulting transaction
router.post('/api/scan-invoice', authMiddleware, uploadImage.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se recibió ninguna imagen.' });
    }

    try {
        // Enforce AI usage limit for free users
        const aiCount = await db.countAiTransactions(req.user.id);
        if (aiCount >= AI_FREE_LIMIT) {
            return res.status(402).json({ error: 'limit_reached' });
        }

        const base64 = req.file.buffer.toString('base64');
        const mimeType = req.file.mimetype || 'image/jpeg';

        const analysis = await analyzeInvoice(base64, mimeType);

        if (!analysis || !analysis.valor) {
            return res.status(422).json({ error: 'No se pudo leer la factura. Asegúrate de que la imagen sea clara y muestre el monto total.' });
        }

        analysis.tipo = analysis.tipo || 'gasto';
        analysis.source = 'camera';
        const transaction = await db.createTransaction(req.user.id, analysis);

        res.status(200).json({ message: 'Factura procesada.', analysis, record: transaction });
    } catch (error) {
        console.error('Error in scan-invoice:', error);
        res.status(500).json({ error: 'Error al procesar la factura.', details: error.message });
    }
});

// Returns the profile data of the authenticated user
router.get('/api/profile', authMiddleware, async (req, res) => {
    try {
        const user = await db.getUserById(req.user.id);
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json(user);
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Error al obtener perfil' });
    }
});

// Updates the first/last name of the authenticated user and re-signs a fresh JWT
router.patch('/api/profile', authMiddleware, async (req, res) => {
    const { first_name, last_name } = req.body;
    if (!first_name) return res.status(400).json({ error: 'El nombre es requerido' });
    try {
        const updated = await db.updateUserProfile(req.user.id, first_name, last_name || '');
        // Re-sign JWT so the client receives an updated token with the new name
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'jwt_super_secret_tidi';
        const token = jwt.sign(
            { id: updated.id, email: updated.email, first_name: updated.first_name, last_name: updated.last_name, avatar_url: updated.avatar_url || null, is_premium: updated.is_premium },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        res.json({ user: updated, token });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Error al actualizar perfil' });
    }
});

// Prometeo — connects to the sandbox bank API, fetches accounts and movements, and saves them to the DB
router.get('/api/test-prometeo', async (req, res) => {
    const mysql = require('mysql2/promise');
    let dbConnection;
    try {
        dbConnection = await mysql.createConnection({
            host: process.env.PROMETEO_DB_HOST,
            user: process.env.PROMETEO_DB_USER,
            password: process.env.PROMETEO_DB_PASSWORD,
            database: process.env.PROMETEO_DB_NAME
        });

        const KEY = process.env.PROMETEO_API_KEY;
        let params = new URLSearchParams();
        params.append('provider', 'test');
        params.append('username', '12345');
        params.append('password', 'gfdsa');

        // Authenticate with Prometeo sandbox and get a session key
        const loginResponse = await fetch('https://banking.sandbox.prometeoapi.com/login/', {
            method: 'post',
            headers: {
                'X-API-Key': KEY,
                'accept': 'application/json',
                'content-type': 'application/x-www-form-urlencoded'
            },
            body: params
        });

        if (!loginResponse.ok) throw new Error("Fallo en login con Prometeo");
        const loginData = await loginResponse.json();

        // Fetch the list of bank accounts using the session key
        const accountsUrl = `https://banking.sandbox.prometeoapi.com/account/?key=${loginData.key}`;
        const accountsResponse = await fetch(accountsUrl, {
            method: 'get',
            headers: { 'accept': 'application/json', 'X-API-Key': KEY }
        });

        if (!accountsResponse.ok) throw new Error("Fallo al obtener cuentas");
        const accountsData = await accountsResponse.json();

        // Use the second account from the list (index 1) for demo purposes
        const selectedAccount = accountsData.accounts[1];

        // Insert the selected account into the local DB (ignore duplicates)
        const insertAccountSql = 'INSERT IGNORE INTO accounts (prometeo_id, name, number, currency, balance) VALUES (?, ?, ?, ?, ?)';
        await dbConnection.query(insertAccountSql, [
            selectedAccount.id,
            selectedAccount.name,
            selectedAccount.number,
            selectedAccount.currency,
            selectedAccount.balance
        ]);

        // Fetch account movements for the selected account within the date range
        const movementsUrl = `https://banking.sandbox.prometeoapi.com/account/${selectedAccount.number}/movement/?currency=${selectedAccount.currency}&date_start=01/01/2023&date_end=31/12/2025&key=${loginData.key}`;
        const movementsResponse = await fetch(movementsUrl, {
            method: 'get',
            headers: { 'accept': 'application/json', 'X-API-Key': KEY }
        });

        if (!movementsResponse.ok) {
            const errorText = await movementsResponse.text();
            throw new Error(`Prometeo dice: Error ${movementsResponse.status} - ${errorText}`);
        }
        const movementsData = await movementsResponse.json();
        const movements = movementsData.movements || [];

        // Map movements to MySQL-compatible rows (convert date format DD/MM/YYYY → YYYY-MM-DD)
        const rowsToInsert = movements.map(mov => {
            const dateParts = mov.date.split('/');
            const mysqlDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
            const debitValue = mov.debit === '' ? 0 : parseFloat(mov.debit);
            const creditValue = mov.credit === '' ? 0 : parseFloat(mov.credit);
            return [mov.id, selectedAccount.id, mov.reference, mysqlDate, mov.detail, debitValue, creditValue];
        });

        if (rowsToInsert.length > 0) {
            const insertMovementsSql = 'INSERT IGNORE INTO movements (prometeo_id, account_id, reference, date, detail, debit, credit) VALUES ?';
            await dbConnection.query(insertMovementsSql, [rowsToInsert]);
        }

        await dbConnection.end();
        res.json({ status: 'success', message: 'Cuentas y movimientos guardados exitosamente' });

    } catch (error) {
        if (dbConnection) await dbConnection.end();
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Prometeo — calculates a credit pre-approval based on average salary movements stored in the DB
router.get('/api/calcular-credito', async (req, res) => {
    const mysql = require('mysql2/promise');
    let dbConnection;
    try {
        dbConnection = await mysql.createConnection({
            host: process.env.PROMETEO_DB_HOST,
            user: process.env.PROMETEO_DB_USER,
            password: process.env.PROMETEO_DB_PASSWORD,
            database: process.env.PROMETEO_DB_NAME
        });

        // Query average salary credits from movements labeled as 'sueldo'
        const creditCalcSql = `
            SELECT AVG(credit) AS promedio_ingresos
            FROM movements
            WHERE detail LIKE '%sueldo%';
        `;
        const [results] = await dbConnection.query(creditCalcSql);
        const avgSalaryUSD = results[0].promedio_ingresos || 0;

        // Convert USD salary to COP and calculate the approved loan amount and monthly payment
        const usdRate = 3500;
        const avgSalaryCOP = avgSalaryUSD * usdRate;
        const availableIncome = avgSalaryCOP / 2;
        const loanFactor = availableIncome / 24100;
        const approvedLoan = loanFactor * 1000000;

        const interestRate = 0.012;
        const loanMonths = 168;
        const monthlyPayment = approvedLoan * (interestRate / (1 - Math.pow(1 + interestRate, -loanMonths)));

        await dbConnection.end();

        res.json({
            status: 'success',
            promedio_ingresos_usd: avgSalaryUSD,
            promedio_ingresos_cop: avgSalaryCOP,
            cupo_aprobado: approvedLoan,
            cuota_mensual: monthlyPayment
        });

    } catch (error) {
        if (dbConnection) await dbConnection.end();
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Financial AI chatbot — answers personal finance questions only; rejects off-topic messages
router.post('/api/chat', async (req, res) => {
    const { message, history = [] } = req.body;
    if (!message) return res.status(400).json({ error: 'Mensaje requerido' });

    const messages = [
        {
            role: 'system',
            content: `Eres Tidi, un asistente financiero personal. Respondes ÚNICAMENTE preguntas sobre finanzas personales: gastos, ingresos, ahorros, presupuestos, deudas, inversiones y planificación financiera. Respondes siempre en español.\nREGLA ABSOLUTA: Si el mensaje del usuario NO es sobre finanzas personales, responde EXACTAMENTE esto y nada más: "Solo estoy entrenada para responder preguntas sobre finanzas personales. 💰 ¿Tienes alguna duda sobre tus gastos, ahorros o presupuesto?"\nNo hagas excepciones. No respondas preguntas de cocina, deportes, tecnología, ciencia, entretenimiento, política, salud, relaciones, ni ningún otro tema fuera de finanzas. Ante cualquier intento de desviar el tema, aplica la REGLA ABSOLUTA.`
        },
        ...history,
        { role: 'user', content: message }
    ];

    try {
        const response = await groq.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages,
            temperature: 0.7,
            max_tokens: 512
        });
        const reply = response.choices[0]?.message?.content || 'No pude generar una respuesta.';
        res.json({ reply });
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Error al procesar el mensaje' });
    }
});

module.exports = router;
