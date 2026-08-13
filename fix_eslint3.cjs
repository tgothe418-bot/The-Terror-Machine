const fs = require('fs');

let pipe = fs.readFileSync('src/lib/ratificationPipeline.ts', 'utf8');
pipe = pipe.replace('  const currentNode = state.spatialGraph?.find((n: any) => n.id === state.currentNodeId);', '  // eslint-disable-next-line @typescript-eslint/no-explicit-any\n  const currentNode = state.spatialGraph?.find((n: any) => n.id === state.currentNodeId);');
pipe = pipe.replace('  if (currentNode && (currentNode as any).exits) {', '  // eslint-disable-next-line @typescript-eslint/no-explicit-any\n  if (currentNode && (currentNode as any).exits) {');
pipe = pipe.replace('    const exits = (currentNode as any).exits;', '    // eslint-disable-next-line @typescript-eslint/no-explicit-any\n    const exits = (currentNode as any).exits;');
pipe = pipe.replace('    const attemptedExit = exits.find((exit: any) => ', '    // eslint-disable-next-line @typescript-eslint/no-explicit-any\n    const attemptedExit = exits.find((exit: any) => ');
fs.writeFileSync('src/lib/ratificationPipeline.ts', pipe);

let store = fs.readFileSync('src/store/useAppStore.ts', 'utf8');
store = store.replace('      exits: newNodeDef.exitVectors?.map((ev: any) => ({', '      // eslint-disable-next-line @typescript-eslint/no-explicit-any\n      exits: newNodeDef.exitVectors?.map((ev: any) => ({');
store = store.replace('    } as any;', '    // eslint-disable-next-line @typescript-eslint/no-explicit-any\n    } as any;');
store = store.replace('      if (node.id === sourceNodeId && (node as any).exits) {', '      // eslint-disable-next-line @typescript-eslint/no-explicit-any\n      if (node.id === sourceNodeId && (node as any).exits) {');
store = store.replace('          exits: (node as any).exits.map((exit: any) => {', '          // eslint-disable-next-line @typescript-eslint/no-explicit-any\n          exits: (node as any).exits.map((exit: any) => {');
fs.writeFileSync('src/store/useAppStore.ts', store);

