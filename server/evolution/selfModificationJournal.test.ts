import { afterEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { SelfModificationJournal } from "./selfModificationJournal";

const tempDirs: string[] = [];
function makeJournal() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nova-self-modification-"));
  tempDirs.push(dir);
  const statePath = path.join(dir, "state.json");
  return { journal: new SelfModificationJournal(statePath), statePath };
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe("SelfModificationJournal", () => {
  it("persists pending proposals across journal instances", () => {
    const { journal: first, statePath } = makeJournal();
    first.upsertProposal({ id: "proposal-1", filePath: "server/evolution/example.ts", status: "pending" });

    const second = new SelfModificationJournal(statePath);
    expect(second.listPending().map((item: any) => item.id)).toEqual(["proposal-1"]);
  });

  it("records execution outcomes and updates proposal status", () => {
    const { journal } = makeJournal();
    journal.upsertProposal({ id: "proposal-2", filePath: "server/evolution/example.ts", status: "pending" });
    journal.recordEvent({
      proposalId: "proposal-2",
      status: "failed",
      timestamp: "2026-10-10T00:00:00.000Z",
      error: "validation failed",
    });

    expect(journal.listPending()).toHaveLength(0);
    expect(journal.listProposals()[0].status).toBe("failed");
    expect(journal.listEvents()[0].error).toBe("validation failed");
  });
});
