const fs = require('fs');
let content = fs.readFileSync('server/utils/aiClient.ts', 'utf8');
content = content.replace('export const generateStructuredResponse = async (prompt: string, zodSchema: /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ any) => {',
'// eslint-disable-next-line @typescript-eslint/no-explicit-any\nexport const generateStructuredResponse = async (prompt: string, zodSchema: any) => {');
fs.writeFileSync('server/utils/aiClient.ts', content);
