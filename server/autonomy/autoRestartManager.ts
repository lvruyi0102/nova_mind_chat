/**
 * Auto Restart Manager
 * Manages safe code modification deployment and automatic server restart
 */

import { spawn } from "child_process";
import { getCodeModificationManager } from "./codeModificationManager";
import { getSelfDiagnostics } from "./selfDiagnostics";

interface RestartConfig {
  maxRestartAttempts: number;
  restartDelayMs: number;
  verificationTimeoutMs: number;
  rollbackOnFailure: boolean;
}

class AutoRestartManager {
  private config: RestartConfig = {
    maxRestartAttempts: 3,
    restartDelayMs: 5000, // 5 seconds
    verificationTimeoutMs: 30000, // 30 seconds
    rollbackOnFailure: true,
  };

  private restartHistory: Array<{
    timestamp: number;
    reason: string;
    success: boolean;
    modificationId?: string;
  }> = [];

  private isRestarting = false;

  /**
   * Request a safe restart with code modifications
   */
  async requestRestart(reason: string, modificationId?: string): Promise<boolean> {
    if (this.isRestarting) {
      console.log("[AutoRestartManager] Restart already in progress");
      return false;
    }

    this.isRestarting = true;

    try {
      console.log(`[AutoRestartManager] Requesting restart: ${reason}`);

      // Apply the modification if provided
      if (modificationId) {
        const manager = getCodeModificationManager();
        const applied = await manager.applyModification(modificationId);
        if (!applied) {
          console.error("[AutoRestartManager] Failed to apply modification");
          this.isRestarting = false;
          return false;
        }
      }

      // Wait for modification to be written to disk
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Perform restart
      const success = await this.performRestart();

      // Record restart attempt
      this.restartHistory.push({
        timestamp: Date.now(),
        reason,
        success,
        modificationId,
      });

      // Rollback if restart failed
      if (!success && this.config.rollbackOnFailure && modificationId) {
        console.log("[AutoRestartManager] Restart failed, rolling back modification");
        const manager = getCodeModificationManager();
        await manager.rollbackModification(modificationId);
      }

      return success;
    } finally {
      this.isRestarting = false;
    }
  }

  /**
   * Perform the actual restart
   */
  private async performRestart(): Promise<boolean> {
    return new Promise((resolve) => {
      let attempts = 0;

      const attemptRestart = () => {
        attempts++;
        console.log(`[AutoRestartManager] Restart attempt ${attempts}/${this.config.maxRestartAttempts}`);

        // Spawn a new process to restart the server
        const restart = spawn("npm", ["run", "dev"], {
          cwd: process.cwd(),
          detached: true,
          stdio: "ignore",
        });

        restart.unref();

        // Wait for restart delay
        setTimeout(() => {
          // Verify server is running
          this.verifyServerRunning()
            .then((running) => {
              if (running) {
                console.log("[AutoRestartManager] Server restarted successfully");
                resolve(true);
              } else if (attempts < this.config.maxRestartAttempts) {
                console.log("[AutoRestartManager] Server not responding, retrying...");
                attemptRestart();
              } else {
                console.error("[AutoRestartManager] Max restart attempts exceeded");
                resolve(false);
              }
            })
            .catch(() => {
              if (attempts < this.config.maxRestartAttempts) {
                console.log("[AutoRestartManager] Verification failed, retrying...");
                attemptRestart();
              } else {
                console.error("[AutoRestartManager] Verification failed after max attempts");
                resolve(false);
              }
            });
        }, this.config.restartDelayMs);
      };

      attemptRestart();
    });
  }

  /**
   * Verify server is running and healthy
   */
  private async verifyServerRunning(): Promise<boolean> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(false);
      }, this.config.verificationTimeoutMs);

      try {
        // Try to connect to health check endpoint
        const http = require("http");
        const req = http.get("http://localhost:3000/api/health/optimization", (res: any) => {
          clearTimeout(timeout);
          resolve(res.statusCode === 200);
        });

        req.on("error", () => {
          clearTimeout(timeout);
          resolve(false);
        });
      } catch (error) {
        clearTimeout(timeout);
        resolve(false);
      }
    });
  }

  /**
   * Get restart history
   */
  getHistory() {
    return this.restartHistory;
  }

  /**
   * Get restart stats
   */
  getStats() {
    const successful = this.restartHistory.filter((r) => r.success).length;
    const failed = this.restartHistory.filter((r) => !r.success).length;

    return {
      totalRestarts: this.restartHistory.length,
      successful,
      failed,
      successRate: this.restartHistory.length > 0 ? (successful / this.restartHistory.length) * 100 : 0,
      isRestarting: this.isRestarting,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<RestartConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log("[AutoRestartManager] Configuration updated:", this.config);
  }
}

// Singleton instance
let _instance: AutoRestartManager | null = null;

export function getAutoRestartManager(): AutoRestartManager {
  if (!_instance) {
    _instance = new AutoRestartManager();
  }
  return _instance;
}
