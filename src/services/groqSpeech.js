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

const analyzeTranscript = async (transcriptText) => {
    try {
        console.log("Analizando transcripción con Groq...");
        const response = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [
                {
                    role: "system",
                    content: `Eres un experto asistente financiero. Tu tarea es extraer la información del texto dictado por el usuario y responder ÚNICAMENTE con un objeto JSON. El JSON debe tener la siguiente estructura exacta:
{
  "tipo": "gasto" | "ingreso" | "modificacion de balance",
  "titulo": "Resumen breve o nombre de la entidad (ej: 'Compra supermercado' o 'Sueldo')",
  "valor": <número, ej: 15.5 o 1000>,
  "categoria": "Categoría general del movimiento"
}
Si algún valor no es claro, usa null, pero debes devolver la estructura JSON válida.`
                },
                {
                    role: "user",
                    content: transcriptText
                }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1
        });

        const content = response.choices[0]?.message?.content;
        return JSON.parse(content || "{}");
    } catch (error) {
        console.error("Error extrayendo datos con Groq API:", error);
        return null;
    }
};

module.exports = { transcribeAudio, analyzeTranscript };
