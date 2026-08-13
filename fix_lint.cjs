const fs = require('fs');
let content = fs.readFileSync('src/components/engine/Runtime.tsx', 'utf8');

content = content.replace('}, [activeBlueprint, dispatch]);', '}, [dispatch]);');

fs.writeFileSync('src/components/engine/Runtime.tsx', content);
