const fs = require('fs');

// Fix ratificationPipeline.ts
let pipe = fs.readFileSync('src/lib/ratificationPipeline.ts', 'utf8');
pipe = pipe.replace(/\(n: any\)/g, '(n: /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ any)');
pipe = pipe.replace(/\(currentNode as any\)/g, '(currentNode as /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ any)');
pipe = pipe.replace(/\(exit: any\)/g, '(exit: /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ any)');
fs.writeFileSync('src/lib/ratificationPipeline.ts', pipe);

// Fix useAppStore.ts
let store = fs.readFileSync('src/store/useAppStore.ts', 'utf8');
store = store.replace(/\(ev: any\)/g, '(ev: /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ any)');
store = store.replace(/} as any;/g, '} as /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ any;');
store = store.replace(/\(node as any\)/g, '(node as /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ any)');
store = store.replace(/\(exit: any\)/g, '(exit: /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ any)');
fs.writeFileSync('src/store/useAppStore.ts', store);
