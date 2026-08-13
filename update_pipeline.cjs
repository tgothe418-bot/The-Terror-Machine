const fs = require('fs');
let content = fs.readFileSync('src/lib/ratificationPipeline.ts', 'utf8');

// Replace function signature
content = content.replace(
  /export const executeRatificationPipeline = async \(prompt: string\) => {/,
  `export const executeRatificationPipeline = async (userAction: string, basePrompt: string) => {`
);

// Add the pre-flight check logic
const insertionPoint1 = `  const stateSnapshot = {\n    spatialGraph: state.spatialGraph ? [...state.spatialGraph] : [],\n    currentNodeId: state.currentNodeId,\n    escalation_state: state.escalation_state,\n    decayMetrics: state.decayMetrics ? { ...state.decayMetrics } : undefined,\n  };`;

const logic1 = `\n\n  let finalPrompt = basePrompt;\n  const currentNode = state.spatialGraph?.find((n: any) => n.id === state.currentNodeId);\n  let matchingExitDirection: string | null = null;\n\n  if (currentNode && (currentNode as any).exits) {\n    const exits = (currentNode as any).exits;\n    const attemptedExit = exits.find((exit: any) => \n      userAction.toLowerCase().includes(exit.description.toLowerCase())\n    );\n    \n    if (attemptedExit && (attemptedExit.targetNodeId === 'NODE_UNMAPPED' || attemptedExit.targetNodeId.startsWith('unmaterialized_'))) {\n      matchingExitDirection = attemptedExit.description;\n      finalPrompt += \`\\n\\nSYSTEM OVERRIDE: The user is entering an unmapped threshold. You MUST set \\\`isExpansion: true\\\` in your JSON response and fully populate the \\\`newNodeDef\\\` object with a unique \\\`id\\\`, \\\`geometry\\\`, \\\`hazards\\\`, and new \\\`exitVectors\\\` (all pointing to 'NODE_UNMAPPED').\`;\n    }\n  }`;

content = content.replace(insertionPoint1, insertionPoint1 + logic1);

// Update fetch call
content = content.replace(
  /body: JSON.stringify\(\{ prompt \}\)/,
  `body: JSON.stringify({ prompt: finalPrompt })`
);

// Update post-flight interception
const returnPattern = `  return await response.json();`;
const interceptLogic = `  const validatedEvent = await response.json();\n\n  // Intercept the topologyDelta for JIT expansion\n  if (validatedEvent.topologyDelta?.isExpansion && validatedEvent.topologyDelta.newNodeDef && matchingExitDirection && state.currentNodeId) {\n    // Patch the graph before returning\n    useAppStore.getState().injectGeneratedNode(state.currentNodeId, matchingExitDirection, validatedEvent.topologyDelta.newNodeDef);\n  }\n\n  return validatedEvent;`;

content = content.replace(returnPattern, interceptLogic);

fs.writeFileSync('src/lib/ratificationPipeline.ts', content);
