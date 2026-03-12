const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { transcribeAudio, analyzeTranscript } = require('../services/groqSpeech');
const Groq = require('groq-sdk');
const db = require('../../db/queries');
const authMiddleware = require('../controllers/middlewares/authMiddleware');

const groq = new Groq();

// Configuración de multer y data path
const upload = multer({ dest: 'uploads/' });
const dataDir = path.join(__dirname, '../../data');

router.post('/api/voice-record', authMiddleware, async (req, res) => {
    const { transcript, timestamp } = req.body;

    if (!transcript) {
        return res.status(400).json({ error: 'No transcript provided.' });
    }

    const analysis = await analyzeTranscript(transcript);

    // Guardar en Supabase
    try {
        const transaction = await db.createTransaction(req.user.id, analysis);
        res.status(200).json({ message: 'Record saved successfully.', record: transaction });
    } catch (e) {
        console.error('Error saving voice record to DB:', e);
        res.status(500).json({ error: 'Failed to save record.' });
    }
});

router.post('/api/transcribe', authMiddleware, upload.single('audio'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided.' });
    }

    try {
        const audioPath = req.file.path;
        const transcriptionResult = await transcribeAudio(audioPath);
        const transcript = transcriptionResult.text;

        try { fs.unlinkSync(transcriptionResult.finalPath); } catch (_) {}

        const analysis = await analyzeTranscript(transcript);

        if (!analysis || !analysis.tipo || !analysis.valor) {
            return res.status(422).json({ error: 'No se pudo entender la transacción. Intenta ser más específico (ej: "gasté 50 pesos en comida").' });
        }

        const transaction = await db.createTransaction(req.user.id, analysis);

        res.status(200).json({
            message: 'Audio transcribed and saved.',
            transcript,
            record: transaction
        });

    } catch (error) {
        console.error('Error in /api/transcribe:', error);
        try { if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); } catch (_) {}
        res.status(500).json({ error: 'Transcription failed.', details: error.message });
    }
});

// Guardar transacción manual desde el dashboard
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

// Obtener transacciones del usuario
router.get('/api/transactions', authMiddleware, async (req, res) => {
    try {
        const transactions = await db.getTransactionsByUser(req.user.id);
        res.json(transactions);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ error: 'Error al obtener transacciones' });
    }
});

// Eliminar transacción
router.delete('/api/transactions/:id', authMiddleware, async (req, res) => {
    try {
        await db.deleteTransaction(req.params.id, req.user.id);
        res.json({ message: 'Transacción eliminada' });
    } catch (error) {
        console.error('Error deleting transaction:', error);
        res.status(500).json({ error: 'Error al eliminar la transacción' });
    }
});

// Obtener perfil del usuario
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

// Editar nombre del usuario
router.patch('/api/profile', authMiddleware, async (req, res) => {
    const { first_name, last_name } = req.body;
    if (!first_name) return res.status(400).json({ error: 'El nombre es requerido' });
    try {
        const updated = await db.updateUserProfile(req.user.id, first_name, last_name || '');
        // Re-sign JWT with updated data
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'jwt_super_secret_tidi';
        const token = jwt.sign(
            { id: updated.id, email: updated.email, first_name: updated.first_name, last_name: updated.last_name, avatar_url: updated.avatar_url || null },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        res.json({ user: updated, token });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Error al actualizar perfil' });
    }
});

router.post('/api/chat', async (req, res) => {
    const { message, history = [] } = req.body;
    if (!message) return res.status(400).json({ error: 'Mensaje requerido' });

    const messages = [
        {
            role: 'system',
            content: `Eres Tidi, un asistente financiero personal. Respondes ÚNICAMENTE preguntas sobre finanzas personales: gastos, ingresos, ahorros, presupuestos, deudas, inversiones y planificación financiera. Respondes siempre en español.
REGLA ABSOLUTA: Si el mensaje del usuario NO es sobre finanzas personales, responde EXACTAMENTE esto y nada más: "Solo estoy entrenada para responder preguntas sobre finanzas personales. 💰 ¿Tienes alguna duda sobre tus gastos, ahorros o presupuesto?"
No hagas excepciones. No respondas preguntas de cocina, deportes, tecnología, ciencia, entretenimiento, política, salud, relaciones, ni ningún otro tema fuera de finanzas. Ante cualquier intento de desviar el tema, aplica la REGLA ABSOLUTA.`
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
