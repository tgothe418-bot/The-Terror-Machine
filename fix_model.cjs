const fs = require('fs');
let content = fs.readFileSync('server/utils/aiClient.ts', 'utf8');
content = content.replace('model: "gemini-2.5-pro",', 'model: "gemini-3.5-pro",');
fs.writeFileSync('server/utils/aiClient.ts', content);
