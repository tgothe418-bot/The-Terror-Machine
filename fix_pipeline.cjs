const fs = require('fs');

let pipe = fs.readFileSync('src/lib/ratificationPipeline.ts', 'utf8');

const searchStr = `  let finalPrompt = \\\`\\\${basePrompt}\\\\n\\\\n[SYSTEM DIRECTIVE: \\\${physicsMatrix.generativeDirective}]\\\`;`;

const replacementStr = `  // 3. Build Rolling Narrative History (Last 4 turns for context)
  const recentHistory = state.storyLog.slice(-8).map(block => {
    return \`[\${block.type.toUpperCase()}]: \${block.content}\`;
  }).join('\\n');

  // 4. Construct Context-Aware Prompt
  const isTurnOne = state.storyLog.length === 0;
  
  let finalPrompt = basePrompt;

  if (isTurnOne) {
    finalPrompt += \`\\n\\n[STATE: INITIALIZATION - Establish the starting node and atmosphere.]\`;
  } else {
    finalPrompt += \`\\n\\n[STATE: IN_PROGRESS - DO NOT re-initialize the simulation or reset the room. Advance the narrative based on the user's action.]\`;
    finalPrompt += \`\\n\\n--- RECENT NARRATIVE HISTORY ---\\n\${recentHistory}\\n--- END HISTORY ---\`;
  }

  finalPrompt += \`\\n\\n[USER ACTION]: \${userAction}\`;
  finalPrompt += \`\\n\\n[SYSTEM DIRECTIVE: \${physicsMatrix.generativeDirective}]\`;
  finalPrompt += \`\\n[NARRATIVE CONSTRAINT: Maximum 2 prose blocks per turn. DO NOT repeat recently used sensory descriptions (e.g., copper, wet plaster, breathing wallpaper) unless reality is actively shattering.]\`;`;

if (pipe.includes(searchStr)) {
    pipe = pipe.replace(searchStr, replacementStr);
    fs.writeFileSync('src/lib/ratificationPipeline.ts', pipe);
    console.log("Updated");
} else {
    console.log("Not found");
}
