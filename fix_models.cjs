const fs = require('fs');

const files = ['server/utils/aiClient.ts', 'server/routes/ratification.ts'];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/gemini-3\.5-pro/g, 'gemini-3.1-pro-preview');
  fs.writeFileSync(file, content);
});

