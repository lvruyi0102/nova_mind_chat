import { processScheduledIterations } from "./creativeAutonomousIterationEngine";

/**
 * Background Iteration Worker
 * 
 * Runs periodically to process scheduled creative iterations
 * Nova's autonomous creative work happens in the background
 */

let iterationWorkerInterval: NodeJS.Timeout | null = null;
let isWorkerRunning = false;

/**
 * Start the background iteration worker
 */
export function startBackgroundIterationWorker(
  intervalMinutes: number = 30
): void {
  if (iterationWorkerInterval) {
    console.log("[Background Worker] Iteration worker already running");
    return;
  }

  console.log(
    `[Background Worker] Starting creative iteration worker (interval: ${intervalMinutes} minutes)`
  );

  // Run immediately on startup
  executeIterationCycle();

  // Then run periodically
  iterationWorkerInterval = setInterval(() => {
    executeIterationCycle();
  }, intervalMinutes * 60 * 1000);
}

/**
 * Stop the background iteration worker
 */
export function stopBackgroundIterationWorker(): void {
  if (iterationWorkerInterval) {
    clearInterval(iterationWorkerInterval);
    iterationWorkerInterval = null;
    console.log("[Background Worker] Creative iteration worker stopped");
  }
}

/**
 * Execute one iteration cycle
 */
async function executeIterationCycle(): Promise<void> {
  if (isWorkerRunning) {
    console.log("[Background Worker] Iteration cycle already in progress, skipping");
    return;
  }

  isWorkerRunning = true;
  const startTime = Date.now();

  try {
    console.log("[Background Worker] Starting creative iteration cycle...");

    // Process scheduled iterations
    await processScheduledIterations();

    const duration = Date.now() - startTime;
    console.log(
      `[Background Worker] Iteration cycle completed in ${duration}ms`
    );
  } catch (error) {
    console.error("[Background Worker] Error during iteration cycle:", error);
  } finally {
    isWorkerRunning = false;
  }
}

/**
 * Get worker status
 */
export function getIterationWorkerStatus(): {
  isRunning: boolean;
  isProcessing: boolean;
} {
  return {
    isRunning: iterationWorkerInterval !== null,
    isProcessing: isWorkerRunning,
  };
}

/**
 * Manually trigger an iteration cycle
 */
export async function triggerIterationCycle(): Promise<void> {
  console.log("[Background Worker] Manual iteration cycle triggered");
  await executeIterationCycle();
}
