import express from "express";
import path from "path";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { createServer as createViteServer } from "vite";
import chatRoutes from "./server/routes/chat";
import voiceRoutes from "./server/routes/voice";
import forgeRoutes from "./server/routes/forge";
import ratificationRoutes from "./server/routes/ratification";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.set("trust proxy", 1);
  
  app.use(cors({ 
    origin: process.env.CORS_ORIGIN || ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  }));
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ extended: true, limit: "5mb" }));

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Generous enough for intense gameplay, strict enough to block scripts
    message: { error: 'Cognitive bandwidth exceeded. The anomaly is resting. Try again shortly.' },
    validate: { xForwardedForHeader: false }
  });

  // API routes FIRST
  app.use("/api", apiLimiter, chatRoutes);
  app.use("/api", apiLimiter, voiceRoutes);
  app.use("/api", apiLimiter, forgeRoutes);
  app.use("/api", apiLimiter, ratificationRoutes);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
