/**
 * Durable journal for NOVA's self-modification proposals and outcomes.
 *
 * Uses atomic rename to avoid half-written state. The storage path can be
 * overridden for deployments with a persistent mounted volume. Ephemeral
 * serverless filesystems do not provide durable persistence across instances.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { randomUUID } from "node:crypto";

export type SelfModificationStatus = "pending" | "executed" | "failed" | "rejected";

export interface SelfModificationEvent {
  proposalId: string;
  status: SelfModificationStatus;
  timestamp: string;
  filePath?: string;
  backupPath?: string;
  error?: string;
  metrics?: unknown;
}

interface JournalState {
  version: 1;
  proposals: Array<Record<string, any>>;
  events: SelfModificationEvent[];
}

const DEFAULT_STATE: JournalState = { version: 1, proposals: [], events: [] };
const MAX_EVENTS = 500;
const MAX_PROPOSALS = 200;

export class SelfModificationJournal {
  private readonly statePath: string;

  constructor(statePath = process.env.NOVA_SELF_MODIFICATION_STATE_PATH ||
    path.join(process.cwd(), "server", "evolution", "self-modification-state.json")) {
    this.statePath = path.resolve(statePath);
  }

  private readState(): JournalState {
    try {
      if (!fs.existsSync(this.statePath)) return { ...DEFAULT_STATE, proposals: [], events: [] };
      const parsed = JSON.parse(fs.readFileSync(this.statePath, "utf8"));
      if (parsed?.version !== 1 || !Array.isArray(parsed.proposals) || !Array.isArray(parsed.events)) {
        throw new Error("Unsupported self-modification journal format");
      }
      return parsed as JournalState;
    } catch (error) {
      // Fail closed: do not silently overwrite a corrupt journal.
      throw new Error(`Unable to read NOVA self-modification journal: ${String(error)}`);
    }
  }

  private writeState(state: JournalState): void {
    fs.mkdirSync(path.dirname(this.statePath), { recursive: true });
    const tempPath = `${this.statePath}.${process.pid}.${randomUUID()}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(state, null, 2) + "\n", { encoding: "utf8", mode: 0o600 });
    fs.renameSync(tempPath, this.statePath);
  }

  listPending<T = Record<string, any>>(): T[] {
    return this.readState().proposals.filter(p => p.status === "pending") as T[];
  }

  listProposals<T = Record<string, any>>(): T[] {
    return this.readState().proposals as T[];
  }

  upsertProposal(proposal: Record<string, any>): void {
    const state = this.readState();
    const index = state.proposals.findIndex(p => p.id === proposal.id);
    if (index >= 0) state.proposals[index] = { ...state.proposals[index], ...proposal };
    else state.proposals.push({ ...proposal });
    state.proposals = state.proposals.slice(-MAX_PROPOSALS);
    this.writeState(state);
  }

  recordEvent(event: SelfModificationEvent): void {
    const state = this.readState();
    state.events.push(event);
    state.events = state.events.slice(-MAX_EVENTS);
    const index = state.proposals.findIndex(p => p.id === event.proposalId);
    if (index >= 0) state.proposals[index] = { ...state.proposals[index], status: event.status, lastOutcome: event };
    this.writeState(state);
  }

  listEvents(limit = 50): SelfModificationEvent[] {
    return this.readState().events.slice(-Math.max(1, Math.min(limit, MAX_EVENTS))).reverse();
  }
}

let journalInstance: SelfModificationJournal | null = null;
export function getSelfModificationJournal(): SelfModificationJournal {
  if (!journalInstance) journalInstance = new SelfModificationJournal();
  return journalInstance;
}
