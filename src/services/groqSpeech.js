const Groq = require("groq-sdk");
const fs = require("fs");

const path = require("path");

// Inicializa el cliente de Groq.
// Se asume que GROQ_API_KEY ya está en process.env.
const groq = new Groq();

const transcribeAudio = async (filePath) => {
    try {
        console.log("Enviando audio a Groq (Whisper)...");

        // Groq requiere extensión válida. Multer guarda sin extensión,
        // así que detectamos el formato real leyendo los primeros bytes del archivo.
        const fs = require("fs");
        let validFilePath = filePath;

        if (!path.extname(filePath)) {
            const buf = Buffer.alloc(12);
            const fd = fs.openSync(filePath, 'r');
            fs.readSync(fd, buf, 0, 12, 0);
            fs.closeSync(fd);

            let ext = '.webm';
            // MP4/M4A: magic bytes "ftyp" en posición 4
            if (buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) ext = '.mp4';
            // OGG: magic bytes "OggS"
            else if (buf[0] === 0x4F && buf[1] === 0x67 && buf[2] === 0x67 && buf[3] === 0x53) ext = '.ogg';
            // WebM/EBML: magic bytes 0x1A 0x45 0xDF 0xA3
            else if (buf[0] === 0x1A && buf[1] === 0x45 && buf[2] === 0xDF && buf[3] === 0xA3) ext = '.webm';

            validFilePath = filePath + ext;
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

const analyzeInvoice = async (base64Image, mimeType = 'image/jpeg') => {
    try {
        console.log("Analizando factura con Groq Vision...");
        const response = await groq.chat.completions.create({
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "image_url",
                            image_url: { url: `data:${mimeType};base64,${base64Image}` }
                        },
                        {
                            type: "text",
                            text: `Analiza esta factura o recibo y extrae la información. Responde ÚNICAMENTE con un JSON válido con esta estructura exacta:
{
  "tipo": "gasto",
  "titulo": "Nombre del establecimiento o descripción breve",
  "valor": <monto total como número sin símbolos>,
  "categoria": "Categoría (Comida, Transporte, Supermercado, Farmacia, Entretenimiento, Servicios, Otros)"
}
Si no puedes leer el monto total, usa null. Solo el JSON, nada más.`
                        }
                    ]
                }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
            max_tokens: 256
        });

        const content = response.choices[0]?.message?.content;
        return JSON.parse(content || "{}");
    } catch (error) {
        console.error("Error analizando factura con Groq Vision:", error);
        return null;
    }
};

module.exports = { transcribeAudio, analyzeTranscript, analyzeInvoice };
