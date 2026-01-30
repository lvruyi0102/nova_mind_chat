/**
 * Alert Notification Service
 * Handles system alerts for memory, cache, and performance issues
 */

import { getDb } from "../db";
import { notifyOwner } from "../_core/notification";

export interface AlertThreshold {
  memoryHighPercent: number; // 90
  memoryHighDuration: number; // 5 minutes
  cacheLowHitRate: number; // 0.6 (60%)
  cacheLowDuration: number; // 10 minutes
  slackWebhookUrl?: string;
  emailRecipient?: string;
}

export interface AlertState {
  lastMemoryAlert?: Date;
  lastCacheAlert?: Date;
  memoryHighCount: number; // Track consecutive high memory readings
  cacheLowCount: number; // Track consecutive low cache hit rates
}

const DEFAULT_THRESHOLDS: AlertThreshold = {
  memoryHighPercent: 0.9, // 90%
  memoryHighDuration: 5 * 60 * 1000, // 5 minutes
  cacheLowHitRate: 0.6, // 60%
  cacheLowDuration: 10 * 60 * 1000, // 10 minutes
};

let alertState: AlertState = {
  memoryHighCount: 0,
  cacheLowCount: 0,
};

let thresholds: AlertThreshold = DEFAULT_THRESHOLDS;

/**
 * Initialize alert notification service with custom thresholds
 */
export function initializeAlertService(customThresholds?: Partial<AlertThreshold>) {
  if (customThresholds) {
    thresholds = { ...DEFAULT_THRESHOLDS, ...customThresholds };
  }
  console.log("[AlertService] Initialized with thresholds:", thresholds);
}

/**
 * Check memory usage and send alert if needed
 */
export async function checkMemoryAlert(
  currentMemoryPercent: number,
  maxHeapSize: number,
  usedHeapSize: number
): Promise<boolean> {
  const isHighMemory = currentMemoryPercent >= thresholds.memoryHighPercent;

  if (isHighMemory) {
    alertState.memoryHighCount++;

    // Send alert after 3 consecutive high readings
    if (alertState.memoryHighCount >= 3) {
      const timeSinceLastAlert = alertState.lastMemoryAlert
        ? Date.now() - alertState.lastMemoryAlert.getTime()
        : Infinity;

      // Only send alert if enough time has passed since last alert
      if (timeSinceLastAlert > thresholds.memoryHighDuration) {
        await sendMemoryAlert(currentMemoryPercent, maxHeapSize, usedHeapSize);
        alertState.lastMemoryAlert = new Date();
        alertState.memoryHighCount = 0; // Reset counter
        return true;
      }
    }
  } else {
    // Reset counter when memory is normal
    alertState.memoryHighCount = 0;
  }

  return false;
}

/**
 * Check cache performance and send alert if needed
 */
export async function checkCacheAlert(hitRate: number, totalRequests: number): Promise<boolean> {
  const isLowHitRate = hitRate < thresholds.cacheLowHitRate;

  if (isLowHitRate && totalRequests > 100) {
    // Only alert if we have enough data
    alertState.cacheLowCount++;

    // Send alert after 3 consecutive low readings
    if (alertState.cacheLowCount >= 3) {
      const timeSinceLastAlert = alertState.lastCacheAlert
        ? Date.now() - alertState.lastCacheAlert.getTime()
        : Infinity;

      // Only send alert if enough time has passed since last alert
      if (timeSinceLastAlert > thresholds.cacheLowDuration) {
        await sendCacheAlert(hitRate, totalRequests);
        alertState.lastCacheAlert = new Date();
        alertState.cacheLowCount = 0; // Reset counter
        return true;
      }
    }
  } else {
    // Reset counter when cache performance is good
    alertState.cacheLowCount = 0;
  }

  return false;
}

/**
 * Send memory alert to owner
 */
async function sendMemoryAlert(
  memoryPercent: number,
  maxHeapSize: number,
  usedHeapSize: number
): Promise<void> {
  const title = `🚨 Critical Memory Alert`;
  const content = `
Nova-Mind is experiencing high memory usage:
- Current: ${memoryPercent.toFixed(1)}%
- Used: ${(usedHeapSize / 1024 / 1024).toFixed(2)} MB
- Max: ${(maxHeapSize / 1024 / 1024).toFixed(2)} MB

**Recommended Actions:**
1. Check for memory leaks in background services
2. Increase heap size or add more memory to the server
3. Review and optimize database queries
4. Consider implementing distributed caching (Redis)

**System Status:**
- Automatic garbage collection has been triggered
- Cache aggressive cleanup is active
- Background cognitive loop interval has been increased
  `;

  try {
    // Send via owner notification system
    const success = await notifyOwner({ title, content });

    if (success) {
      console.log("[AlertService] Memory alert sent successfully");
    } else {
      console.warn("[AlertService] Failed to send memory alert via notification system");
    }

    // Also send to Slack if webhook is configured
    if (thresholds.slackWebhookUrl) {
      await sendSlackAlert(title, content, "danger");
    }
  } catch (error) {
    console.error("[AlertService] Error sending memory alert:", error);
  }
}

/**
 * Send cache alert to owner
 */
async function sendCacheAlert(hitRate: number, totalRequests: number): Promise<void> {
  const title = `⚠️ Low Cache Hit Rate Alert`;
  const content = `
Nova-Mind's cache performance has degraded:
- Current Hit Rate: ${(hitRate * 100).toFixed(1)}%
- Total Requests: ${totalRequests.toLocaleString()}

**Recommended Actions:**
1. Review cache eviction policy
2. Increase cache size if memory allows
3. Analyze query patterns for optimization opportunities
4. Consider implementing distributed caching (Redis)

**System Status:**
- Cache cleanup is in progress
- Monitor cache size and hit rate trends
  `;

  try {
    // Send via owner notification system
    const success = await notifyOwner({ title, content });

    if (success) {
      console.log("[AlertService] Cache alert sent successfully");
    } else {
      console.warn("[AlertService] Failed to send cache alert via notification system");
    }

    // Also send to Slack if webhook is configured
    if (thresholds.slackWebhookUrl) {
      await sendSlackAlert(title, content, "warning");
    }
  } catch (error) {
    console.error("[AlertService] Error sending cache alert:", error);
  }
}

/**
 * Send alert to Slack
 */
async function sendSlackAlert(title: string, content: string, color: string): Promise<void> {
  if (!thresholds.slackWebhookUrl) return;

  try {
    const payload = {
      attachments: [
        {
          color,
          title,
          text: content,
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    const response = await fetch(thresholds.slackWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn("[AlertService] Failed to send Slack alert:", response.statusText);
    }
  } catch (error) {
    console.error("[AlertService] Error sending Slack alert:", error);
  }
}

/**
 * Get current alert state
 */
export function getAlertState(): AlertState {
  return { ...alertState };
}

/**
 * Reset alert state
 */
export function resetAlertState(): void {
  alertState = {
    memoryHighCount: 0,
    cacheLowCount: 0,
  };
}

/**
 * Update alert thresholds
 */
export function updateAlertThresholds(newThresholds: Partial<AlertThreshold>): void {
  thresholds = { ...thresholds, ...newThresholds };
  console.log("[AlertService] Thresholds updated:", thresholds);
}

/**
 * Get current alert thresholds
 */
export function getAlertThresholds(): AlertThreshold {
  return { ...thresholds };
}
