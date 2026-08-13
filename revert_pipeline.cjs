const fs = require('fs');
let content = fs.readFileSync('src/lib/ratificationPipeline.ts', 'utf8');

content = content.replace(
  `const recentHistory = state.storyLog.slice(-6).map(block => ({
    role: block.type === 'user_action' ? 'user' : (block.type === 'system_voice' ? 'system' : 'model'),
    content: block.content
  }));`,
  `const recentHistory = state.storyLog.slice(-6).map(block => \`[\${block.type.toUpperCase()}]: \${block.content.substring(0, 60)}...\`).join('\\n');`
);

content = content.replace(
  `const payload = {
    userAction,
    recentHistory,
    stateSnapshot: {
      currentNodeId: state.currentNodeId,
      nodeGeometry: currentNode?.description || "Unknown enclosure",
      availableExits: currentNode?.exits?.map((e: any) => e.description) || [],
      currentPhase: state.currentPhase,
      tensionLevel: currentTension,
      turnCount: 0,
      reconciliationRevision: state.reconciliationRevision
    }
  };`,
  `const payload = {
    userAction,
    recentHistory,
    systemDirective: physicsMatrix.generativeDirective,
    isExpansionExpected: !!matchingExitDirection,
    stateContext: {
      currentNodeId: state.currentNodeId,
      currentPhase: state.currentPhase,
      tensionLevel: currentTension,
      reconciliationRevision: state.reconciliationRevision
    }
  };`
);

fs.writeFileSync('src/lib/ratificationPipeline.ts', content);
