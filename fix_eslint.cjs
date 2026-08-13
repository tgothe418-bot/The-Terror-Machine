const fs = require('fs');

let pipe = fs.readFileSync('src/lib/ratificationPipeline.ts', 'utf8');
pipe = pipe.replace('(state as /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ any).activeRole ||', '(state as any).activeRole ||');
pipe = pipe.replace(
  '    (state as any).activeRole || \'PROTAGONIST\',',
  '    // eslint-disable-next-line @typescript-eslint/no-explicit-any\n    (state as any).activeRole || \'PROTAGONIST\','
);

fs.writeFileSync('src/lib/ratificationPipeline.ts', pipe);
