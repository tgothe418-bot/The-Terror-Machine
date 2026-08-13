const fs = require('fs');

let content = fs.readFileSync('src/components/engine/Runtime.tsx', 'utf8');

if (!content.includes('executeRatificationPipeline')) {
    content = content.replace("import { sendEngineTurn,", "import { executeRatificationPipeline } from '../../lib/ratificationPipeline';\nimport { sendEngineTurn,");
}

content = content.replace(/const response = await fetch\('\/api\/init', \{[\s\S]*?body: JSON.stringify\(\{[\s\S]*?action: "SYSTEM_INIT"[\s\S]*?\}\)[\s\S]*?\}\);[\s\S]*?if \(!response\.ok\) \{[\s\S]*?\}[\s\S]*?const data = await response\.json\(\);[\s\S]*?dispatch\(\{[\s\S]*?type: 'ADD_MESSAGE',[\s\S]*?message: \{ role: 'assistant', content: data.prose, timestamp: Date.now\(\) \}[\s\S]*?\}\);/m, 
`      const data = await executeRatificationPipeline("SYSTEM_INIT");
      
      const formattedText = formatBlocks(data.narrative_blocks);
      dispatch({ 
        type: 'ADD_MESSAGE', 
        message: { role: 'assistant', content: formattedText, timestamp: Date.now() }
      });`);

fs.writeFileSync('src/components/engine/Runtime.tsx', content);
