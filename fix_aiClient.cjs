const fs = require('fs');
let content = fs.readFileSync('server/utils/aiClient.ts', 'utf8');

content = content.replace(
  `  const schemaString = JSON.stringify(zodToJsonSchema(zodSchema), null, 2);
  const contents = [{ role: "user", parts: [{ text: prompt + "\\n\\nIMPORTANT: You must return ONLY valid JSON matching this schema. No markdown, no markdown blocks. Just raw JSON.\\n\\nSCHEMA:\\n" + schemaString }] }];

  const response = await getAiClient().models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents,
    config: {
      temperature: 0.7,
      responseMimeType: "application/json",
    }
  });`,
  `  const jsonSchema = zodToJsonSchema(zodSchema);
  delete jsonSchema.$schema;
  
  const contents = [{ role: "user", parts: [{ text: prompt }] }];

  const response = await getAiClient().models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents,
    config: {
      temperature: 0.7,
      responseMimeType: "application/json",
      responseSchema: jsonSchema as any,
    }
  });`
);

fs.writeFileSync('server/utils/aiClient.ts', content);
