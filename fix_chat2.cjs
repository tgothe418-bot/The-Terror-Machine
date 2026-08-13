const fs = require('fs');
let content = fs.readFileSync('server/routes/chat.ts', 'utf8');
content = content.replace(/\/\/ Removed \/generate route in favor of \/turn[\s\S]*/, '// Removed /generate route in favor of /turn\n\nexport default router;');
fs.writeFileSync('server/routes/chat.ts', content);
