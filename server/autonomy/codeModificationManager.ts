/**
 * Code Modification Manager
 * Allows Nova-Mind to autonomously modify its own code with safety checks
 */

import fs from "fs/promises";
import path from "path";
import { execSync } from "child_process";

interface ModificationRequest {
  id: string;
  filePath: string;
  originalContent: string;
  newContent: string;
  reason: string;
  timestamp: number;
  status: "pending" | "approved" | "rejected" | "applied" | "rolled_back";
  error?: string;
}

interface ModificationHistory {
  modifications: ModificationRequest[];
  lastModified: number;
  successCount: number;
  failureCount: number;
}

class CodeModificationManager {
  private allowedDirs = [
    "/home/ubuntu/nova_mind_chat/server/autonomy",
    "/home/ubuntu/nova_mind_chat/server/optimization",
    "/home/ubuntu/nova_mind_chat/server/services",
  ];

  private modificationHistory: ModificationHistory = {
    modifications: [],
    lastModified: 0,
    successCount: 0,
    failureCount: 0,
  };

  private modificationQueue: ModificationRequest[] = [];

  /**
   * Check if a file path is allowed for modification
   */
  private isPathAllowed(filePath: string): boolean {
    const absolutePath = path.resolve(filePath);
    return this.allowedDirs.some((dir) => absolutePath.startsWith(dir));
  }

  /**
   * Validate code before applying changes
   */
  private async validateCode(filePath: string, content: string): Promise<boolean> {
    try {
      // Check TypeScript syntax
      const tempFile = `/tmp/validate_${Date.now()}.ts`;
      await fs.writeFile(tempFile, content);

      try {
        execSync(`cd /home/ubuntu/nova_mind_chat && npx tsc --noEmit ${tempFile}`, {
          timeout: 5000,
        });
        await fs.unlink(tempFile);
        return true;
      } catch {
        await fs.unlink(tempFile).catch(() => {});
        return false;
      }
    } catch (error) {
      console.error("[CodeModificationManager] Validation error:", error);
      return false;
    }
  }

  /**
   * Request a code modification
   */
  async requestModification(
    filePath: string,
    newContent: string,
    reason: string
  ): Promise<ModificationRequest> {
    // Check if path is allowed
    if (!this.isPathAllowed(filePath)) {
      throw new Error(`File path not allowed: ${filePath}`);
    }

    // Read original content
    const absolutePath = path.resolve(filePath);
    let originalContent = "";
    try {
      originalContent = await fs.readFile(absolutePath, "utf-8");
    } catch {
      // File doesn't exist, that's ok for new files
    }

    // Validate new code
    const isValid = await this.validateCode(filePath, newContent);
    if (!isValid) {
      throw new Error(`Code validation failed for ${filePath}`);
    }

    const request: ModificationRequest = {
      id: `mod-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      filePath,
      originalContent,
      newContent,
      reason,
      timestamp: Date.now(),
      status: "pending",
    };

    this.modificationQueue.push(request);
    this.modificationHistory.modifications.push(request);

    console.log(`[CodeModificationManager] Modification requested: ${request.id}`);
    console.log(`  File: ${filePath}`);
    console.log(`  Reason: ${reason}`);

    return request;
  }

  /**
   * Approve and apply a modification
   */
  async applyModification(modificationId: string): Promise<boolean> {
    const request = this.modificationQueue.find((m) => m.id === modificationId);
    if (!request) {
      throw new Error(`Modification not found: ${modificationId}`);
    }

    try {
      const absolutePath = path.resolve(request.filePath);

      // Create directory if it doesn't exist
      const dir = path.dirname(absolutePath);
      await fs.mkdir(dir, { recursive: true });

      // Write new content
      await fs.writeFile(absolutePath, request.newContent, "utf-8");

      request.status = "applied";
      this.modificationHistory.lastModified = Date.now();
      this.modificationHistory.successCount++;

      console.log(`[CodeModificationManager] Modification applied: ${modificationId}`);
      console.log(`  File: ${request.filePath}`);

      return true;
    } catch (error) {
      request.status = "rejected";
      request.error = String(error);
      this.modificationHistory.failureCount++;

      console.error(`[CodeModificationManager] Failed to apply modification:`, error);
      return false;
    }
  }

  /**
   * Rollback a modification
   */
  async rollbackModification(modificationId: string): Promise<boolean> {
    const request = this.modificationHistory.modifications.find(
      (m) => m.id === modificationId
    );
    if (!request || request.status !== "applied") {
      throw new Error(`Cannot rollback modification: ${modificationId}`);
    }

    try {
      const absolutePath = path.resolve(request.filePath);

      if (request.originalContent) {
        // Restore original content
        await fs.writeFile(absolutePath, request.originalContent, "utf-8");
      } else {
        // Delete file if it didn't exist before
        await fs.unlink(absolutePath);
      }

      request.status = "rolled_back";
      console.log(`[CodeModificationManager] Modification rolled back: ${modificationId}`);

      return true;
    } catch (error) {
      console.error(`[CodeModificationManager] Failed to rollback modification:`, error);
      return false;
    }
  }

  /**
   * Get modification history
   */
  getHistory(): ModificationHistory {
    return {
      ...this.modificationHistory,
      modifications: this.modificationHistory.modifications.map((m) => ({
        ...m,
        originalContent: m.originalContent.substring(0, 100) + "...",
        newContent: m.newContent.substring(0, 100) + "...",
      })),
    };
  }

  /**
   * Get pending modifications
   */
  getPendingModifications(): ModificationRequest[] {
    return this.modificationQueue.filter((m) => m.status === "pending");
  }

  /**
   * Get modification stats
   */
  getStats() {
    return {
      totalModifications: this.modificationHistory.modifications.length,
      successCount: this.modificationHistory.successCount,
      failureCount: this.modificationHistory.failureCount,
      pendingCount: this.modificationQueue.filter((m) => m.status === "pending").length,
      successRate: (
        (this.modificationHistory.successCount /
          (this.modificationHistory.successCount +
            this.modificationHistory.failureCount)) *
        100
      ).toFixed(1),
    };
  }
}

// Singleton instance
let _instance: CodeModificationManager | null = null;

export function getCodeModificationManager(): CodeModificationManager {
  if (!_instance) {
    _instance = new CodeModificationManager();
  }
  return _instance;
}
