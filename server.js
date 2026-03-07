require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { transcribeAudio } = require('./src/services/groqSpeech');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(__dirname)); // Host root to mirror http-server
app.use(express.json());
app.use(cors());

// Ensure data folder exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// Ensure uploads folder exists para audio de IA
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
const upload = multer({ dest: 'uploads/' });

// Endpoint to save voice transcriptions
app.post('/api/voice-record', (req, res) => {
    const { transcript, timestamp } = req.body;

    if (!transcript) {
        return res.status(400).json({ error: 'No transcript provided.' });
    }

    const dataPath = path.join(dataDir, 'voice_records.json');
    
    // Read existing file if it exists, or create new array
    let records = [];
    if (fs.existsSync(dataPath)) {
        try {
            const fileData = fs.readFileSync(dataPath, 'utf8');
            records = JSON.parse(fileData);
        } catch (e) {
            console.error('Error reading records file:', e);
        }
    }

    // Append new record
    const newRecord = {
        id: Date.now().toString(),
        timestamp: timestamp || new Date().toISOString(),
        text: transcript
    };
    
    records.push(newRecord);

    // Save back to file
    try {
        fs.writeFileSync(dataPath, JSON.stringify(records, null, 2));
        res.status(200).json({ message: 'Record saved successfully.', record: newRecord });
    } catch (e) {
        console.error('Error writing records file:', e);
        res.status(500).json({ error: 'Failed to save record.' });
    }
});

// Endpoint to transcribe audio using Groq Whisper and save automatically
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided.' });
    }

    try {
        const audioPath = req.file.path;
        // 1. Enviar el archivo a Groq para transcripción (renombrándolo de por medio)
        const transcriptionResult = await transcribeAudio(audioPath);
        const transcript = transcriptionResult.text;
        
        // 2. Eliminar el archivo temporal renombado (.webm)
        fs.unlinkSync(transcriptionResult.finalPath);
        
        // 3. Guardar en JSON (reutilizando la lógica de voice-record localmente)
        const dataPath = path.join(dataDir, 'voice_records.json');
        let records = [];
        if (fs.existsSync(dataPath)) {
            try { records = JSON.parse(fs.readFileSync(dataPath, 'utf8')); } catch (e) {}
        }
        
        const newRecord = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            text: transcript
        };
        records.push(newRecord);
        fs.writeFileSync(dataPath, JSON.stringify(records, null, 2));

        // 4. Devolver la respuesta al frontend
        res.status(200).json({ message: 'Audio transacted and saved successfully.', transcript: transcript, record: newRecord });

    } catch (error) {
        console.error('Error in /api/transcribe:', error);
        res.status(500).json({ error: 'Transcription failed.', details: error.message });
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    }
});

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
