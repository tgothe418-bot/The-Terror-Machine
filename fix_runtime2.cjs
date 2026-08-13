const fs = require('fs');
let content = fs.readFileSync('src/components/engine/Runtime.tsx', 'utf8');

content = content.replace(/const response = await sendEngineTurn\([\s\S]*?\);/, 
`const response = await executeRatificationPipeline(commandText);
      const formattedText = formatBlocks(response.narrative_blocks);
      dispatch({ type: 'USER_ACTION', payload: commandText });
      dispatch({ type: 'ADD_MESSAGE', message: { role: 'user', content: commandText, timestamp: Date.now() } });
      dispatch({ type: 'ADD_MESSAGE', message: { role: 'assistant', content: formattedText, timestamp: Date.now() } });
`);

fs.writeFileSync('src/components/engine/Runtime.tsx', content);
