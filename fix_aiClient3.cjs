const fs = require('fs');
let content = fs.readFileSync('server/utils/aiClient.ts', 'utf8');

// replace generateStructuredResponse definition with the new hardcoded version using Type
const newFunc = `
const turnResponseSchema = {
  type: Type.OBJECT,
  properties: {
    narrative_blocks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, description: "prose, dialogue, system_voice, or environmental_description" },
          speaker: { type: Type.STRING, nullable: true },
          content: { type: Type.STRING }
        },
        required: ["type", "content"]
      }
    },
    logic_state: {
      type: Type.OBJECT,
      properties: {
        current_phase: { type: Type.STRING },
        suggested_tension: { type: Type.INTEGER },
        intent_classification: { type: Type.STRING },
        terminal_flags: { type: Type.ARRAY, items: { type: Type.STRING } },
        cast_deltas: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              character_id: { type: Type.STRING },
              skepticism_delta: { type: Type.NUMBER }
            },
            required: ["character_id", "skepticism_delta"]
          }
        }
      },
      required: ["current_phase", "suggested_tension", "intent_classification", "terminal_flags", "cast_deltas"]
    },
    topologyDelta: {
      type: Type.OBJECT,
      properties: {
        isExpansion: { type: Type.BOOLEAN },
        newNodeDef: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            geometry: { type: Type.STRING },
            hazards: { type: Type.ARRAY, items: { type: Type.STRING } },
            exitVectors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  direction: { type: Type.STRING },
                  targetNodeId: { type: Type.STRING }
                },
                required: ["direction", "targetNodeId"]
              }
            }
          },
          required: ["id", "geometry", "hazards", "exitVectors"],
          nullable: true
        }
      },
      required: ["isExpansion"],
      nullable: true
    }
  },
  required: ["narrative_blocks", "logic_state"]
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const generateStructuredResponse = async (prompt: string, zodSchema: any) => {
  const contents = [{ role: "user", parts: [{ text: prompt }] }];

  const response = await getAiClient().models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents,
    config: {
      temperature: 0.7,
      responseMimeType: "application/json",
      responseSchema: turnResponseSchema,
    }
  });

  try {
    const raw = JSON.parse(response.text);
    return zodSchema.parse(raw);
  } catch (err) {
    console.error("Failed to parse or validate schema:", err);
    throw err;
  }
};
`;

content = content.replace(/\/\/ eslint-disable-next-line @typescript-eslint\/no-explicit-any\nexport const generateStructuredResponse =[\s\S]*/, newFunc);

fs.writeFileSync('server/utils/aiClient.ts', content);
