const fs = require('fs');
let content = fs.readFileSync('server/utils/aiClient.ts', 'utf8');

content = content.replace(
  'const raw = JSON.parse(response.text);',
  'console.log("LLM RAW OUTPUT:", response.text);\n    const raw = JSON.parse(response.text);'
);

fs.writeFileSync('server/utils/aiClient.ts', content);
