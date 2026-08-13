const fs = require('fs');
let content = fs.readFileSync('server/schemas/engine.ts', 'utf8');

content = content.replace(
  '}).optional()\\n  }).optional()',
  '}).nullable().optional()\n  }).nullable().optional()'
);

fs.writeFileSync('server/schemas/engine.ts', content);
