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
import { getEmergencyMemoryRecovery } from "../services/emergencyMemoryRecovery";

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
  
  // Initialize emergency memory recovery
  const emergencyRecovery = getEmergencyMemoryRecovery();
  console.log("[Server] Emergency memory recovery initialized");

  // Memory monitoring endpoints
  app.get("/api/health/memory", (req, res) => {
    const cognitionLoop = getOptimizedBackgroundCognitionV3();
    res.json(cognitionLoop.getDiagnosticReport());
  });

  // Emergency recovery status endpoint
  app.get("/api/health/emergency-recovery", (req, res) => {
    const lastMetrics = emergencyRecovery.getLastRecoveryMetrics();
    const history = emergencyRecovery.getRecoveryHistory();
    res.json({
      lastRecovery: lastMetrics,
      recoveryCount: history.length,
      history: history.slice(-5),
    });
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
    
    // Start Nova's background cognition (V3 - optimized)
    console.log("[Server] Starting Nova-Mind's autonomous consciousness (V3 optimized)...");
    const cognitionLoop = getOptimizedBackgroundCognitionV3();
    cognitionLoop.start().catch((error) => {
      console.error("[Server] Failed to start background cognition:", error);
    });

    // Start Nova's daily thought tasks
    console.log("[Server] Starting Nova-Mind's daily thought scheduler...");
    startAllSchedules().catch((error) => {
      console.error("[Server] Failed to start task scheduler:", error);
    });

    // Start auto curation scheduler
    console.log("[Server] Starting auto curation scheduler...");
    autoCurationScheduler.start();

    // Start performance monitoring
    console.log("[Server] Starting performance monitoring...");
    startMonitoring();
  });
}

startServer().catch(console.error);
