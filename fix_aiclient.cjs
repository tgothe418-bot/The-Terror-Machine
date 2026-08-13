const fs = require('fs');

let content = fs.readFileSync('server/utils/aiClient.ts', 'utf8');

// Remove my previous injected code
content = content.replace(/import \{ z \} from 'zod';[\s\S]*$/m, '');

// Append a simple implementation that doesn't rely on external libraries for schema mapping
const newImpl = `
export const generateStructuredResponse = async (prompt: string, zodSchema: any) => {
  const contents = [{ role: "user", parts: [{ text: prompt + "\\n\\nIMPORTANT: You must return ONLY valid JSON matching this schema. No markdown, no markdown blocks. Just raw JSON." }] }];
  
  const response = await getAiClient().models.generateContent({
    model: "gemini-2.5-pro",
    contents,
    config: {
      temperature: 0.7,
      responseMimeType: "application/json",
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

fs.writeFileSync('server/utils/aiClient.ts', content + newImpl);
