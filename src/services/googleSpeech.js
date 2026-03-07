const speech = require('@google-cloud/speech');
const fs = require('fs');
const path = require('path');

// Iniciar cliente de Speech-to-Text
// NOTA: Para corregir el error 503 (UNAVAILABLE) que suele ocurrir 
// en redes locales o proxies por la conexión gRPC de Google, a veces
// es útil forzar el uso de la API REST activando: fallback: 'rest'.
const client = new speech.SpeechClient({
    keyFilename: path.join(__dirname, '../../google-key.json'),
    // fallback: 'rest' // <-- Descomenta esto si el error 503 persiste
});

const transcribeAudio = async (audioFilePath) => {
    try {
        const file = fs.readFileSync(audioFilePath);
        const audioBytes = file.toString('base64');

        const audio = { content: audioBytes };
        
        // Ajustar esta configuración dependiendo de cómo grabes el micro (WEBM, LINEAR16, etc.)
        const config = {
            encoding: 'WEBM_OPUS', 
            sampleRateHertz: 48000, 
            languageCode: 'es-ES',
        };
        
        const request = { audio, config };

        console.log("Enviando audio a Google Speech API...");
        const [response] = await client.recognize(request);
        
        const transcription = response.results
            .map(result => result.alternatives[0].transcript)
            .join('\n');
            
        return transcription;
    } catch (error) {
        console.error('Error desde Google Speech API (p.ej. 503):', error.message);
        throw error;
    }
};

module.exports = { transcribeAudio };
