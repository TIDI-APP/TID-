const Groq = require("groq-sdk");
const { toFile } = require("groq-sdk");
const fs = require("fs");
const path = require("path");

// Initialize the Groq client (uses GROQ_API_KEY from process.env automatically)
const groq = new Groq();

// Transcribes an audio file using Groq Whisper and returns the text + final file path
const transcribeAudio = async (filePath) => {
    try {
        let validFilePath = filePath;
        // Ensure the file has a .webm extension so the API recognizes it
        if (!path.extname(filePath)) {
            validFilePath = filePath + '.webm';
            fs.renameSync(filePath, validFilePath);
        }

        // Groq SDK v1.x uses native fetch — ReadStream is not supported, so we read to Buffer
        const fileBuffer = fs.readFileSync(validFilePath);
        const transcription = await groq.audio.transcriptions.create({
            file: await toFile(fileBuffer, path.basename(validFilePath), { type: 'audio/webm' }),
            model: "whisper-large-v3",
            language: "es",
        });

        return { text: transcription.text, finalPath: validFilePath };
    } catch (error) {
        console.error("Error from Groq API:", error);
        throw error;
    }
};

// Sends a transcript to Groq LLM and extracts structured financial data (type, title, amount, category, currency)
const analyzeTranscript = async (transcriptText) => {
    try {
        console.log("Analyzing transcript with Groq...");
        const response = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [
                {
                    role: "system",
                    content: `Eres un experto asistente financiero. Tu tarea es extraer la información del texto dictado por el usuario y responder ÚNICAMENTE con un objeto JSON. El JSON debe tener la siguiente estructura exacta:\n{\n  "tipo": "gasto" | "ingreso" | "modificacion de balance",\n  "titulo": "Resumen breve o nombre de la entidad (ej: 'Compra supermercado' o 'Sueldo')",\n  "valor": <número, ej: 15.5 o 1000>,\n  "categoria": "Categoría general del movimiento",\n  "moneda": "Código ISO de la moneda detectada (ej: 'COP', 'USD', 'EUR', 'MXN', 'BRL'). Si el usuario dice 'pesos' sin especificar, usa 'COP'. Si dice 'dólares' o '$' ambiguo en contexto latinoamericano, usa 'USD'. Por defecto usa 'COP'."\n}\nSi algún valor no es claro, usa null, pero debes devolver la estructura JSON válida.`
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
        console.error("Error extracting data with Groq API:", error);
        return null;
    }
};

// Sends a base64-encoded invoice image to Groq Vision and extracts structured financial data
const analyzeInvoice = async (base64Image, mimeType = 'image/jpeg') => {
    try {
        console.log("Analyzing invoice with Groq Vision...");
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
                            text: `Analiza esta factura o recibo y extrae la información. Responde ÚNICAMENTE con un JSON válido con esta estructura exacta:\n{\n  "tipo": "gasto",\n  "titulo": "Nombre del establecimiento o descripción breve",\n  "valor": <monto total como número sin símbolos>,\n  "categoria": "Categoría (Comida, Transporte, Supermercado, Farmacia, Entretenimiento, Servicios, Otros)"\n}\nSi no puedes leer el monto total, usa null. Solo el JSON, nada más.`
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
        console.error("Error analyzing invoice with Groq Vision:", error);
        return null;
    }
};

module.exports = { transcribeAudio, analyzeTranscript, analyzeInvoice };
