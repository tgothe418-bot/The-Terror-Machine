const fs = require('fs');

let content = fs.readFileSync('src/lib/ratificationPipeline.ts', 'utf8');

const searchStr = '  let finalPrompt = `${basePrompt}\\n\\n[SYSTEM DIRECTIVE: ${physicsMatrix.generativeDirective}]`;';
const replacement = `  // Phase 5: Reconcile perception against active user action
  const reconciliation = reconcilePerception(
    userAction,
    state.storyLog,
    (state as any).activeRole || 'PROTAGONIST',
    physicsMatrix.realityState
  );

  // If the user tries to interact with a hallucination, collapse the perception locally
  if (reconciliation.isHallucinationCollision && reconciliation.correctedProse) {
    useAppStore.setState((prev) => ({
      reconciliationRevision: prev.reconciliationRevision + reconciliation.revisionIncrement,
      storyLog: [
        ...prev.storyLog,
        { type: 'system_voice', content: reconciliation.correctedProse }
      ]
    }));

    return {
      stateDeltas: { frictionModifier: 1, threatScaleShift: 0, panicTrigger: false },
      topologyDelta: { isExpansion: false },
      narrativeMandate: {
        outcome: 'FAILURE',
        realityState: physicsMatrix.realityState,
        sensoryPriority: reconciliation.correctedProse,
        pacingRule: 'SUDDEN_STOP'
      }
    };
  }

  let finalPrompt = \`\${basePrompt}\\n\\n[SYSTEM DIRECTIVE: \${physicsMatrix.generativeDirective}]\`;
  if (state.reconciliationRevision > 0) {
    finalPrompt += \`\\n[MEMORY REVISION REVISION_ID: \${state.reconciliationRevision}. The user's perceptions have recently fractured.]\`;
  }`;

if (content.includes(searchStr)) {
  content = content.replace(searchStr, replacement);
  fs.writeFileSync('src/lib/ratificationPipeline.ts', content);
  console.log("Updated");
} else {
  console.log("Not found");
}
