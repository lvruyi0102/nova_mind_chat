/**
 * Concurrency Controller
 * Manages concurrent connections and request queuing to prevent resource exhaustion
 */

interface QueuedRequest {
  id: string;
  fn: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

class ConcurrencyController {
  private maxConcurrent = 10; // Maximum concurrent requests
  private currentConcurrent = 0;
  private requestQueue: QueuedRequest[] = [];
  private requestMap: Map<string, QueuedRequest> = new Map();
  private requestTimeout = 30000; // 30 seconds timeout
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(maxConcurrent: number = 10) {
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * Execute a function with concurrency control
   */
  async execute<T>(fn: () => Promise<T>, requestId?: string): Promise<T> {
    const id = requestId || `req-${Date.now()}-${Math.random()}`;

    return new Promise((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        id,
        fn: fn as () => Promise<unknown>,
        resolve,
        reject,
        timestamp: Date.now(),
      };

      this.requestMap.set(id, queuedRequest);

      if (this.currentConcurrent < this.maxConcurrent) {
        this.executeRequest(queuedRequest);
      } else {
        this.requestQueue.push(queuedRequest);
        console.log(
          `[ConcurrencyController] Request queued: ${id}, queue size: ${this.requestQueue.length}`
        );
      }
    });
  }

  /**
   * Execute a queued request
   */
  private async executeRequest(queuedRequest: QueuedRequest) {
    this.currentConcurrent++;

    try {
      const result = await Promise.race([
        queuedRequest.fn(),
        this.createTimeout(this.requestTimeout),
      ]);
      queuedRequest.resolve(result);
    } catch (error) {
      queuedRequest.reject(
        error instanceof Error ? error : new Error(String(error))
      );
    } finally {
      this.currentConcurrent--;
      this.requestMap.delete(queuedRequest.id);

      // Process next queued request
      if (this.requestQueue.length > 0) {
        const next = this.requestQueue.shift();
        if (next) {
          this.executeRequest(next);
        }
      }
    }
  }

  /**
   * Create a timeout promise
   */
  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`Request timeout after ${ms}ms`)),
        ms
      )
    );
  }

  /**
   * Start cleanup monitor for stale requests
   */
  startCleanup() {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      let cleaned = 0;

      for (const [id, request] of this.requestMap.entries()) {
        if (now - request.timestamp > this.requestTimeout) {
          request.reject(new Error("Request timeout"));
          this.requestMap.delete(id);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        console.log(
          `[ConcurrencyController] Cleaned ${cleaned} stale requests`
        );
      }
    }, 10000); // Check every 10 seconds

    console.log("[ConcurrencyController] Cleanup monitor started");
  }

  /**
   * Stop cleanup monitor
   */
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log("[ConcurrencyController] Cleanup monitor stopped");
    }
  }

  /**
   * Get controller statistics
   */
  getStats() {
    return {
      maxConcurrent: this.maxConcurrent,
      currentConcurrent: this.currentConcurrent,
      queueSize: this.requestQueue.length,
      totalPendingRequests: this.requestMap.size,
      utilizationPercent: (
        (this.currentConcurrent / this.maxConcurrent) *
        100
      ).toFixed(1),
    };
  }

  /**
   * Set maximum concurrent requests
   */
  setMaxConcurrent(max: number) {
    this.maxConcurrent = Math.max(1, max);
    console.log(
      `[ConcurrencyController] Max concurrent set to ${this.maxConcurrent}`
    );
  }
}

// Singleton instance
let _instance: ConcurrencyController | null = null;

export function getConcurrencyController(): ConcurrencyController {
  if (!_instance) {
    _instance = new ConcurrencyController(10);
  }
  return _instance;
}

export function initializeConcurrencyController(maxConcurrent: number = 10) {
  _instance = new ConcurrencyController(maxConcurrent);
  _instance.startCleanup();
  console.log(
    `[ConcurrencyController] Initialized with max ${maxConcurrent} concurrent requests`
  );
  return _instance;
}
