const Groq = require("groq-sdk");
const { toFile } = require("groq-sdk");
const fs = require("fs");
const path = require("path");

// Inicializa el cliente de Groq.
// Se asume que GROQ_API_KEY ya está en process.env.
const groq = new Groq();

const transcribeAudio = async (filePath) => {
    try {
        let validFilePath = filePath;
        if (!path.extname(filePath)) {
            validFilePath = filePath + '.webm';
            fs.renameSync(filePath, validFilePath);
        }

        // El SDK nuevo usa fetch nativo y no maneja ReadStream; leer a Buffer es la forma segura.
        const fileBuffer = fs.readFileSync(validFilePath);
        const transcription = await groq.audio.transcriptions.create({
            file: await toFile(fileBuffer, path.basename(validFilePath), { type: 'audio/webm' }),
            model: "whisper-large-v3",
            language: "es",
        });

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
  "categoria": "Categoría general del movimiento",
  "moneda": "Código ISO de la moneda detectada (ej: 'COP', 'USD', 'EUR', 'MXN', 'BRL'). Si el usuario dice 'pesos' sin especificar, usa 'COP'. Si dice 'dólares' o '$' ambiguo en contexto latinoamericano, usa 'USD'. Por defecto usa 'COP'."
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
