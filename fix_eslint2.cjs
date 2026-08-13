const fs = require('fs');

// Fix ratificationPipeline.ts
let pipe = fs.readFileSync('src/lib/ratificationPipeline.ts', 'utf8');
pipe = pipe.replace(/\(n: \/\* eslint-disable-next-line @typescript-eslint\/no-explicit-any \*\/ any\)/g, '(n: any)');
pipe = pipe.replace(/\(currentNode as \/\* eslint-disable-next-line @typescript-eslint\/no-explicit-any \*\/ any\)/g, '(currentNode as any)');
pipe = pipe.replace(/\(exit: \/\* eslint-disable-next-line @typescript-eslint\/no-explicit-any \*\/ any\)/g, '(exit: any)');
fs.writeFileSync('src/lib/ratificationPipeline.ts', pipe);

// Fix useAppStore.ts
let store = fs.readFileSync('src/store/useAppStore.ts', 'utf8');
store = store.replace(/\(ev: \/\* eslint-disable-next-line @typescript-eslint\/no-explicit-any \*\/ any\)/g, '(ev: any)');
store = store.replace(/} as \/\* eslint-disable-next-line @typescript-eslint\/no-explicit-any \*\/ any;/g, '} as any;');
store = store.replace(/\(node as \/\* eslint-disable-next-line @typescript-eslint\/no-explicit-any \*\/ any\)/g, '(node as any)');
store = store.replace(/\(exit: \/\* eslint-disable-next-line @typescript-eslint\/no-explicit-any \*\/ any\)/g, '(exit: any)');
fs.writeFileSync('src/store/useAppStore.ts', store);
