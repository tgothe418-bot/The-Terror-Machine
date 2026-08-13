const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace('import { turnRouter } from "./server/routes/turn";',
'import { turnRouter } from "./server/routes/turn";\nimport chatRoutes from "./server/routes/chat";');

content = content.replace('app.use("/api/turn", apiLimiter, turnRouter);',
'app.use("/api/turn", apiLimiter, turnRouter);\n  app.use("/api", apiLimiter, chatRoutes);');

fs.writeFileSync('server.ts', content);
