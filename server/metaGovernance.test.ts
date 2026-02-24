import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { MetaGovernance } from "./metaGovernance";

describe("MetaGovernance", () => {
  it("denies protected files and large diff", async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "mg-test-"));
    const tracePath = path.join(tempDir, "trace.log");
    writeFileSync(tracePath, "", "utf-8");

    const mg = new MetaGovernance(tempDir, tracePath);

    expect(mg.checkDiffSize(41)).toBe(false);
    expect(mg.checkProtectedFiles(["server/metaGovernance.ts"])).toBe(false);
    expect(mg.checkProtectedFiles(["server/utils/safe.ts"])).toBe(true);

    rmSync(tempDir, { recursive: true, force: true });
  });

  it("enters escalation after 3 consecutive failures", async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "mg-test-"));
    const tracePath = path.join(tempDir, "trace.log");
    const now = new Date();
    const lines = [0, 1, 2]
      .map((i) =>
        JSON.stringify({
          timestamp: new Date(now.getTime() - i * 60_000).toISOString(),
          proposalId: `p-${i}`,
          status: "failure",
        }),
      )
      .join("\n");

    writeFileSync(tracePath, `${lines}\n`, "utf-8");

    const mg = new MetaGovernance(tempDir, tracePath);
    await expect(mg.isEscalated(now)).resolves.toBe(true);

    rmSync(tempDir, { recursive: true, force: true });
  });
});
