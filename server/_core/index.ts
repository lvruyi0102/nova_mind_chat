import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { getOptimizedBackgroundCognitionV3 } from "../services/optimizedBackgroundCognitionV3";
import { startMonitoring } from "../performanceMonitor";
import { startAllSchedules } from "../services/taskScheduler";
import { autoCurationScheduler } from "../services/autoCurationScheduler";
import { getAggressiveMemoryOptimization } from "../services/aggressiveMemoryOptimization";
import { getAutoRestartManager } from "../services/autoRestartManager";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  // Memory monitoring endpoints
  app.get("/api/health/memory", (req, res) => {
    const cognitionLoop = getOptimizedBackgroundCognitionV3();
    res.json(cognitionLoop.getDiagnosticReport());
  });

  app.get("/api/health/cognition", (req, res) => {
    const cognitionLoop = getOptimizedBackgroundCognitionV3();
    res.json(cognitionLoop.getStatus());
  });

  // Adaptive interval monitoring endpoint
  app.get("/api/debug/adaptive-interval", (req, res) => {
    const cognitionLoop = getOptimizedBackgroundCognitionV3();
    res.json(cognitionLoop.getAdaptiveIntervalInfo());
  });

  // Full diagnostic report endpoint
  app.get("/api/debug/full-diagnostic", (req, res) => {
    const cognitionLoop = getOptimizedBackgroundCognitionV3();
    res.json(cognitionLoop.getDiagnosticReport());
  });
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    
    // Activate aggressive memory optimization FIRST
    console.log("[Server] Activating aggressive memory optimization...");
    const aggressiveOptimization = getAggressiveMemoryOptimization();
    aggressiveOptimization.activate();
    
    // Activate auto-restart manager
    console.log("[Server] Activating auto-restart manager...");
    const autoRestartManager = getAutoRestartManager();
    autoRestartManager.activate();
    
    // DISABLE ALL BACKGROUND TASKS - MEMORY OPTIMIZATION PRIORITY
    console.log("[Server] ⚠️  ALL BACKGROUND TASKS DISABLED FOR MEMORY OPTIMIZATION");
    console.log("[Server] Only HTTP service and memory monitoring are active");
    
    // NOTE: The following services are intentionally disabled:
    // - Background cognition loop
    // - Task scheduler
    // - Auto curation scheduler  
    // - Performance monitoring
    // Reason: Aggressive memory optimization to reduce heap usage from 96% to <80%
  });
}

startServer().catch(console.error);
