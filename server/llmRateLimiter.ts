/**
 * LLM Rate Limiter and Timeout Handler
 * Prevents rate limit errors and manages LLM call timeouts
 */

interface LLMCallConfig {
  timeout?: number; // milliseconds
  maxRetries?: number;
  retryDelay?: number; // milliseconds
}

interface RateLimitState {
  lastCallTime: number;
  callCount: number;
  resetTime: number;
}

// Rate limit state tracking
const rateLimitState: RateLimitState = {
  lastCallTime: 0,
  callCount: 0,
  resetTime: Date.now() + 60 * 1000, // Reset every minute
};

// Minimum delay between LLM calls (in milliseconds)
const MIN_CALL_INTERVAL = 2000; // 2 seconds between calls

/**
 * Check if we should throttle LLM calls
 */
function shouldThrottle(): boolean {
  const now = Date.now();

  // Reset counter if time window has passed
  if (now > rateLimitState.resetTime) {
    rateLimitState.callCount = 0;
    rateLimitState.resetTime = now + 60 * 1000;
  }

  // Allow max 20 calls per minute
  if (rateLimitState.callCount >= 20) {
    console.warn("[LLMRateLimiter] Rate limit threshold reached, throttling");
    return true;
  }

  // Check minimum interval between calls
  if (now - rateLimitState.lastCallTime < MIN_CALL_INTERVAL) {
    return true;
  }

  return false;
}

/**
 * Wrap LLM call with timeout and retry logic
 */
export async function callLLMWithTimeout<T>(
  llmFn: () => Promise<T>,
  config: LLMCallConfig = {}
): Promise<T | null> {
  const timeout = config.timeout || 30000; // 30 seconds default
  const maxRetries = config.maxRetries || 2;
  const retryDelay = config.retryDelay || 5000;

  // Check rate limit
  if (shouldThrottle()) {
    console.warn("[LLMRateLimiter] Throttling LLM call due to rate limit");
    return null;
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`LLM call timeout after ${timeout}ms`)), timeout)
      );

      // Race between LLM call and timeout
      const result = await Promise.race([llmFn(), timeoutPromise]);

      // Update rate limit state
      rateLimitState.lastCallTime = Date.now();
      rateLimitState.callCount++;

      return result;
    } catch (error) {
      lastError = error as Error;

      // Check if it's a rate limit error
      if (lastError.message?.includes("rate limit")) {
        console.warn("[LLMRateLimiter] Hit rate limit, backing off");
        // Increase reset time to give API time to recover
        rateLimitState.resetTime = Date.now() + 120 * 1000; // 2 minutes
        return null;
      }

      // Check if it's a timeout error
      if (lastError.message?.includes("timeout")) {
        console.warn(`[LLMRateLimiter] LLM call timeout (attempt ${attempt + 1}/${maxRetries + 1})`);

        if (attempt < maxRetries) {
          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          continue;
        }

        return null;
      }

      // For other errors, retry once more
      if (attempt < maxRetries) {
        console.warn(`[LLMRateLimiter] LLM call failed, retrying (attempt ${attempt + 1}/${maxRetries + 1})`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        continue;
      }

      return null;
    }
  }

  console.error("[LLMRateLimiter] LLM call failed after all retries:", lastError);
  return null;
}

/**
 * Get current rate limit status
 */
export function getRateLimitStatus() {
  const now = Date.now();
  const timeUntilReset = Math.max(0, rateLimitState.resetTime - now);

  return {
    callCount: rateLimitState.callCount,
    timeUntilReset,
    isThrottled: shouldThrottle(),
    callsRemaining: Math.max(0, 20 - rateLimitState.callCount),
  };
}

/**
 * Reset rate limit state (for testing or manual reset)
 */
export function resetRateLimit() {
  rateLimitState.callCount = 0;
  rateLimitState.resetTime = Date.now() + 60 * 1000;
  console.log("[LLMRateLimiter] Rate limit state reset");
}
