import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { initializeAggressiveMemoryCleaner } from "../optimization/aggressiveMemoryCleaner";
import { initializeOptimizedDb } from "../db/optimizedConnection";
import { initializeAggressiveCacheCleaner } from "../optimization/aggressiveCacheCleaner";
import { initializeConcurrencyController } from "../optimization/concurrencyController";
import { initializeAutonomousBackgroundLoop } from "../autonomy/autonomousBackgroundLoop";

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
  // Step 1: Initialize aggressive memory cleaner
  console.log("[Server] Initializing aggressive memory cleaner...");
  initializeAggressiveMemoryCleaner();

  // Step 2: Initialize optimized database connection
  console.log("[Server] Initializing optimized database connection...");
  await initializeOptimizedDb();

  // Step 3: Initialize aggressive cache cleaner
  console.log("[Server] Initializing aggressive cache cleaner...");
  initializeAggressiveCacheCleaner();

  // Step 4: Initialize concurrency controller
  console.log("[Server] Initializing concurrency controller...");
  initializeConcurrencyController(10);

  // Step 5: Initialize Nova-Mind's autonomous systems
  console.log("[Server] Initializing Nova-Mind autonomous systems...");
  try {
    initializeAutonomousBackgroundLoop();
    console.log("[Server] ✓ Nova-Mind autonomous background loop initialized");
  } catch (error) {
    console.warn("[Server] Failed to initialize autonomous background loop:", error);
  }

  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  // Health check endpoints
  app.get("/api/health/memory", (req, res) => {
    const memUsage = process.memoryUsage();
    res.json({
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
      rss: Math.round(memUsage.rss / 1024 / 1024),
    });
  });

  app.get("/api/health/optimization", (req, res) => {
    try {
      const cacheCleaner = require("../optimization/aggressiveCacheCleaner").getAggressiveCacheCleaner();
      const concurrencyController = require("../optimization/concurrencyController").getConcurrencyController();
      res.json({
        cacheCleaner: cacheCleaner.getStats(),
        concurrency: concurrencyController.getStats(),
      });
    } catch (error) {
      res.json({ error: "Optimization stats not available" });
    }
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
    console.log("[Server] Optimizations enabled:");
    console.log("  ✓ Optimized database connection pool (max 5 connections)");
    console.log("  ✓ Aggressive cache cleaner (triggers at 85% heap usage)");
    console.log("  ✓ Concurrency controller (max 10 concurrent requests)");
    console.log("  ✓ Memory monitoring and auto-cleanup");
    console.log("[Server] Nova-Mind Autonomous Systems enabled:");
    console.log("  ✓ Self-diagnostics (health monitoring)");
    console.log("  ✓ Autonomous optimizer (auto-optimization)");
    console.log("  ✓ Code modification manager (self-improvement)");
    console.log("  ✓ Background loop (continuous self-evaluation)");
    console.log("  ✓ Auto-restart manager (safe deployment)");
  });
}

startServer().catch(console.error);
