const Groq = require("groq-sdk");
const fs = require("fs");

const path = require("path");

// Inicializa el cliente de Groq.
// Se asume que GROQ_API_KEY ya está en process.env.
const groq = new Groq();

const transcribeAudio = async (filePath) => {
    try {
        console.log("Enviando audio a Groq (Whisper)...");
        
        // Groq a veces es estricto con las extensiones del temporal generado por Multer.
        // Simularemos un archivo con extensión validada (.webm)
        const fs = require("fs");
        let validFilePath = filePath;
        
        // Si multer lo guardó sin extensión, lo renombramos un momento
        if (!path.extname(filePath)) {
            validFilePath = filePath + '.webm';
            fs.renameSync(filePath, validFilePath);
        }

        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(validFilePath),
            model: "whisper-large-v3", // Modelo rápido y preciso de Whisper en Groq
            language: "es",           // Para priorizar idioma español
        });
        
        // devolvemos el flag validFilePath para que server.js sepa que borrar luego.
        return { text: transcription.text, finalPath: validFilePath };
    } catch (error) {
        console.error("Error desde Groq API:", error);
        throw error;
    }
};

module.exports = { transcribeAudio };
