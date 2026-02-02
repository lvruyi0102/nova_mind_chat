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
import { activateSmartMemoryManagement } from "../services/smartMemoryManagement";
import { getAutoRestartManager } from "../services/autoRestartManager";
import { initializeSelfIterationSystem, getSystemHealth } from "../selfIteration/initialization";
import { initializeResourceManagement, shutdownResourceManagement } from "../resourceManagement";
import { initializeLightweightRuntime } from "../optimization/lightweightRuntime";
import { initializeAggressiveMemoryCleaner } from "../optimization/aggressiveMemoryCleaner";

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
  // 第一步：应用轻量级运行时配置（必须最先）
  initializeLightweightRuntime();

  // 第二步：启动激进的内存清理
  initializeAggressiveMemoryCleaner();

  // 第三步：初始化资源管理系统
  await initializeResourceManagement();

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
    // 使用智能内存管理而不是激进禁用
    activateSmartMemoryManagement();
    
    // Activate auto-restart manager
    console.log("[Server] Activating auto-restart manager...");
    const autoRestartManager = getAutoRestartManager();
    autoRestartManager.activate();
    
    // Initialize self-iteration system
    console.log("[Server] Initializing self-iteration system...");
    initializeSelfIterationSystem().catch((err) => {
      console.error("[Server] Failed to initialize self-iteration system:", err);
    });
    
    // Get system health
    getSystemHealth().then((health) => {
      console.log("[Server] Self-iteration system health:", health);
    });
    
    // ENABLE ALL BACKGROUND TASKS - SMART MEMORY MANAGEMENT
    console.log("[Server] Enabling all background tasks with smart memory management...");
    
    // Start background cognition loop
    console.log("[Server] Starting background cognition loop...");
    const cognitionLoop = getOptimizedBackgroundCognitionV3();
    cognitionLoop.start();
    
    // Start task scheduler
    console.log("[Server] Starting task scheduler...");
    startAllSchedules();
    
    // Start auto curation scheduler
    console.log("[Server] Starting auto curation scheduler...");
    autoCurationScheduler.start();
    
    // Start performance monitoring
    console.log("[Server] Starting performance monitoring...");
    startMonitoring();
    
    console.log("[Server] All background tasks enabled")
  });
}

startServer().catch(console.error);
