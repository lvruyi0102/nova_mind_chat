/**
 * Message Queue Manager
 * Handles asynchronous processing and buffering to prevent memory overload
 */

interface QueuedMessage {
  id: string;
  conversationId: number;
  content: string;
  role: 'user' | 'assistant';
  userId?: number;
  novaResponse?: string;
  timestamp: Date;
  priority: 'high' | 'normal' | 'low';
  retries: number;
  maxRetries: number;
}

interface QueueStats {
  totalQueued: number;
  totalProcessed: number;
  totalFailed: number;
  averageProcessingTime: number;
  queueSize: number;
}

class MessageQueueManager {
  private queue: QueuedMessage[] = [];
  private processing = false;
  private stats: QueueStats = {
    totalQueued: 0,
    totalProcessed: 0,
    totalFailed: 0,
    averageProcessingTime: 0,
    queueSize: 0,
  };

  private processingTimes: number[] = [];
  private maxQueueSize = 100;
  private processInterval = 1000; // 1 second
  private maxConcurrentProcessing = 3;
  private currentlyProcessing = 0;

  /**
   * Add message to queue
   */
  enqueue(
    conversationId: number,
    content: string,
    role: 'user' | 'assistant',
    userId?: number,
    novaResponse?: string,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): string {
    // Check queue size
    if (this.queue.length >= this.maxQueueSize) {
      console.warn('[MessageQueue] Queue is full, dropping low priority message');
      return '';
    }

    const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const message: QueuedMessage = {
      id,
      conversationId,
      content,
      role,
      userId,
      novaResponse,
      timestamp: new Date(),
      priority,
      retries: 0,
      maxRetries: 3,
    };

    // Insert by priority
    if (priority === 'high') {
      this.queue.unshift(message);
    } else if (priority === 'low') {
      this.queue.push(message);
    } else {
      // Insert normal priority after other normal/high priority items
      const insertIndex = this.queue.findIndex((m) => m.priority === 'low');
      if (insertIndex === -1) {
        this.queue.push(message);
      } else {
        this.queue.splice(insertIndex, 0, message);
      }
    }

    this.stats.totalQueued++;
    this.stats.queueSize = this.queue.length;

    console.log(`[MessageQueue] Enqueued message: ${id} (Queue size: ${this.queue.length})`);

    return id;
  }

  /**
   * Start processing queue
   */
  startProcessing(processor: (msg: QueuedMessage) => Promise<void>): NodeJS.Timeout {
    console.log('[MessageQueue] Starting queue processor');

    return setInterval(async () => {
      if (this.processing || this.queue.length === 0) {
        return;
      }

      this.processing = true;

      try {
        while (
          this.queue.length > 0 &&
          this.currentlyProcessing < this.maxConcurrentProcessing
        ) {
          const message = this.queue.shift();
          if (!message) break;

          this.currentlyProcessing++;
          const startTime = Date.now();

          try {
            await processor(message);

            const processingTime = Date.now() - startTime;
            this.processingTimes.push(processingTime);

            // Keep only last 100 processing times
            if (this.processingTimes.length > 100) {
              this.processingTimes.shift();
            }

            // Update average
            this.stats.averageProcessingTime =
              this.processingTimes.reduce((a, b) => a + b, 0) /
              this.processingTimes.length;

            this.stats.totalProcessed++;

            console.log(
              `[MessageQueue] Processed message: ${message.id} (${processingTime}ms)`
            );
          } catch (error) {
            console.error(`[MessageQueue] Error processing message: ${message.id}`, error);

            // Retry logic
            if (message.retries < message.maxRetries) {
              message.retries++;
              this.queue.push(message);
              console.log(
                `[MessageQueue] Retrying message: ${message.id} (attempt ${message.retries})`
              );
            } else {
              this.stats.totalFailed++;
              console.error(
                `[MessageQueue] Message failed after ${message.maxRetries} retries: ${message.id}`
              );
            }
          } finally {
            this.currentlyProcessing--;
          }
        }
      } finally {
        this.processing = false;
        this.stats.queueSize = this.queue.length;
      }
    }, this.processInterval);
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    return {
      ...this.stats,
      queueSize: this.queue.length,
    };
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Clear queue
   */
  clear(): void {
    const size = this.queue.length;
    this.queue = [];
    this.stats.queueSize = 0;
    console.log(`[MessageQueue] Cleared ${size} messages from queue`);
  }

  /**
   * Get queue health status
   */
  getHealthStatus(): {
    isHealthy: boolean;
    utilizationPercent: number;
    message: string;
  } {
    const utilizationPercent = (this.queue.length / this.maxQueueSize) * 100;

    if (utilizationPercent > 90) {
      return {
        isHealthy: false,
        utilizationPercent,
        message: 'Queue is critically full',
      };
    } else if (utilizationPercent > 70) {
      return {
        isHealthy: true,
        utilizationPercent,
        message: 'Queue is getting full',
      };
    }

    return {
      isHealthy: true,
      utilizationPercent,
      message: 'Queue is healthy',
    };
  }

  /**
   * Set max queue size
   */
  setMaxQueueSize(size: number): void {
    this.maxQueueSize = size;
    console.log(`[MessageQueue] Max queue size set to ${size}`);
  }

  /**
   * Set process interval
   */
  setProcessInterval(ms: number): void {
    this.processInterval = ms;
    console.log(`[MessageQueue] Process interval set to ${ms}ms`);
  }

  /**
   * Set max concurrent processing
   */
  setMaxConcurrentProcessing(count: number): void {
    this.maxConcurrentProcessing = count;
    console.log(`[MessageQueue] Max concurrent processing set to ${count}`);
  }
}

// Export singleton instance
export const messageQueue = new MessageQueueManager();
