import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "../server/_core/oauth";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
import {
  getAggressiveCacheCleaner,
  initializeAggressiveCacheCleaner,
} from "../server/optimization/aggressiveCacheCleaner";
import {
  getConcurrencyController,
  initializeConcurrencyController,
} from "../server/optimization/concurrencyController";
import { initializeOptimizedDb } from "../server/db/optimizedConnection";

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

let initialized = false;
let initializationPromise: Promise<void> | null = null;

async function initializeRuntime() {
  if (initialized) return;
  if (initializationPromise) return initializationPromise;

  initializationPromise = (async () => {
    // Serverless-safe initialization: do not start long-lived listeners or
    // autonomous background loops inside a request-scoped function.
    if (process.env.DATABASE_URL) {
      await initializeOptimizedDb();
    }
    initializeAggressiveCacheCleaner();
    initializeConcurrencyController(10);
    initialized = true;
  })();

  try {
    await initializationPromise;
  } finally {
    initializationPromise = null;
  }
}

app.get("/api/health", async (_req, res) => {
  await initializeRuntime();
  res.json({
    ok: true,
    service: "nova-mind-chat",
    runtime: "vercel-serverless",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health/memory", async (_req, res) => {
  await initializeRuntime();
  const memUsage = process.memoryUsage();
  res.json({
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    external: Math.round(memUsage.external / 1024 / 1024),
    rss: Math.round(memUsage.rss / 1024 / 1024),
  });
});

app.get("/api/health/optimization", async (_req, res) => {
  await initializeRuntime();
  try {
    const cacheCleaner = getAggressiveCacheCleaner();
    const concurrencyController = getConcurrencyController();
    res.json({
      cacheCleaner: cacheCleaner.getStats(),
      concurrency: concurrencyController.getStats(),
    });
  } catch {
    res.status(503).json({ error: "Optimization stats not available" });
  }
});

registerOAuthRoutes(app);

app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  }),
);

export default async function handler(req: express.Request, res: express.Response) {
  await initializeRuntime();
  return app(req, res);
}
