const fs = require('fs');
let content = fs.readFileSync('server/utils/aiClient.ts', 'utf8');

content = "import { zodToJsonSchema } from 'zod-to-json-schema';\n" + content;

content = content.replace(
  'const contents = [{ role: "user", parts: [{ text: prompt + "\\n\\nIMPORTANT: You must return ONLY valid JSON matching this schema. No markdown, no markdown blocks. Just raw JSON." }] }];',
  `const schemaString = JSON.stringify(zodToJsonSchema(zodSchema), null, 2);
  const contents = [{ role: "user", parts: [{ text: prompt + "\\n\\nIMPORTANT: You must return ONLY valid JSON matching this schema. No markdown, no markdown blocks. Just raw JSON.\\n\\nSCHEMA:\\n" + schemaString }] }];`
);

fs.writeFileSync('server/utils/aiClient.ts', content);
