const fs = require('fs');
let content = fs.readFileSync('server/schemas/engine.ts', 'utf8');

content = content.replace(
  'speaker: z.string().optional(),',
  'speaker: z.string().nullable().optional(),'
);

fs.writeFileSync('server/schemas/engine.ts', content);
