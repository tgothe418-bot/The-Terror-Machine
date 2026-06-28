import { GoogleGenAI, Type } from "@google/genai";

let aiClient: GoogleGenAI | null = null;
const STARTUP_API_KEY = process.env.GEMINI_API_KEY;

export function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY || STARTUP_API_KEY;
    if (!key) {
      throw new Error('Please configure your Gemini API Key in the AI Studio Secrets panel.');
    }
    const cleanKey = key.trim().replace(/^['"]|['"]$/g, '');
    aiClient = new GoogleGenAI({ 
      apiKey: cleanKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

const engineResponseSchema = {
  type: Type.OBJECT,
  properties: {
    engine_thoughts: { 
      type: Type.STRING, 
      description: "Step-by-step reasoning for the current simulation state." 
    },
    narrative_blocks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          type: { type: Type.STRING, description: "exposition, dialogue, sensory, or system_alert" },
          speaker: { type: Type.STRING, nullable: true },
          content: { type: Type.STRING },
          emotional_weight: { type: Type.NUMBER, nullable: true }
        },
        required: ["id", "type", "content"]
      }
    },
    logic_state: {
      type: Type.OBJECT,
      properties: {
        current_phase: { type: Type.STRING },
        requested_transition: { type: Type.STRING, nullable: true },
        suggested_tension: { type: Type.NUMBER },
        terminal_flags: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["current_phase", "suggested_tension", "terminal_flags"]
    }
  },
  required: ["engine_thoughts", "narrative_blocks", "logic_state"]
};

export const generateEngineTurn = async (prompt: string, history: unknown[] = []) => {
  const contents = [
    ...history,
    { role: "user", parts: [{ text: prompt }] }
  ];

  const response = await getAiClient().models.generateContent({
    model: "gemini-3.5-pro",
    contents,
    config: {
      temperature: 0.7,
      responseMimeType: "application/json",
      responseSchema: engineResponseSchema,
    }
  });

  return response.text;
};
