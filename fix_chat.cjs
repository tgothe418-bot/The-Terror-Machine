const fs = require('fs');
let content = fs.readFileSync('server/routes/chat.ts', 'utf8');

// I am going to comment out or replace the /generate route, as it's the one using RatifiedEngineFrameSchema
content = content.replace(/import \{ RatifiedEngineFrameSchema \} from '\.\.\/schemas\/engine';/g, '');
content = content.replace(/import \{ generateEngineTurn \} from '\.\.\/utils\/aiClient';/g, '');
content = content.replace(/router\.post\('\/generate'[\s\S]*?\}\);/m, '// Removed /generate route in favor of /turn');

fs.writeFileSync('server/routes/chat.ts', content);
