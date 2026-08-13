const fs = require('fs');
let content = fs.readFileSync('src/components/engine/Runtime.tsx', 'utf8');

content = content.replace("import { sendEngineTurn,", "import {");

fs.writeFileSync('src/components/engine/Runtime.tsx', content);
