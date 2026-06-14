import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import geminiRoutes from "./server/geminiRoutes";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // API routes FIRST
  console.log("Key before Vite:", process.env.GEMINI_API_KEY?.substring(0, 15));
  app.use("/api", geminiRoutes);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    console.log("Key after Vite:", process.env.GEMINI_API_KEY?.substring(0, 15));
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
