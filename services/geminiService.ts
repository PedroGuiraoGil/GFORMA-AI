import { GoogleGenAI, Type, Schema } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key not found in environment variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

// --- DEDUCE SECTOR ---
export const deduceSector = async (companyName: string): Promise<string | null> => {
  const client = getClient();
  if (!client) return null;

  const prompt = `
    Nombre de empresa: "${companyName}".
    Identifica el sector industrial o comercial más probable de esta empresa.
    Responde SOLAMENTE con el nombre del sector (ej: "Banca", "Automoción", "Retail").
    Si el nombre es inventado o ambiguo y no puedes deducirlo, responde "UNKNOWN".
  `;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    const text = response.text?.trim();
    if (!text || text === "UNKNOWN") return null;
    return text.replace(/\./g, '');
  } catch (error) {
    return null;
  }
};

// --- ANALYZE CHALLENGE & DEPARTMENT ---
export interface ExtractedInfo {
  department?: string;
  challenge?: string;
  isVague?: boolean;
}

export const analyzeChallenge = async (
  userMessage: string
): Promise<ExtractedInfo> => {
  const client = getClient();
  if (!client) return {};

  const prompt = `
    Analiza este input de un usuario que busca formación: "${userMessage}".
    
    Tareas:
    1. Extrae el DEPARTAMENTO o Colectivo (ej: Ventas, RRHH, Directivos, IT).
    2. Extrae el RETO o NECESIDAD específica (ej: mejorar cierres, aprender Python, gestión del tiempo).
    3. Determina si la respuesta es demasiado VAGA o CORTA para ser útil (ej: "sí", "formación", "no sé", "mejorar").

    Schema JSON de salida:
    {
      "department": string | null,
      "challenge": string | null,
      "isVague": boolean
    }
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      department: { type: Type.STRING, nullable: true },
      challenge: { type: Type.STRING, nullable: true },
      isVague: { type: Type.BOOLEAN },
    },
    required: ["isVague"],
  };

  try {
    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const text = response.text;
    if (!text) return { isVague: true };
    return JSON.parse(text);

  } catch (error) {
    console.error("Error analyzing challenge:", error);
    return { isVague: false, challenge: userMessage, department: "General" }; // Fallback
  }
};

export const generateSyllabus = async (
  company: string, 
  sector: string, 
  department: string,
  challenge: string
): Promise<string> => {
  const client = getClient();
  if (!client) return "Error: API Key faltante.";

  const prompt = `
    Actúa como consultor de formación senior para GForma.
    Crea un temario de 5 puntos para:
    - Empresa: ${company} (${sector})
    - Departamento: ${department}
    - Reto: ${challenge}

    Formato: Lista numerada 1-5. Tono corporativo, directo y orientado a resultados.
  `;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "No se pudo generar el temario.";
  } catch (error) {
    return "Error al generar temario.";
  }
};