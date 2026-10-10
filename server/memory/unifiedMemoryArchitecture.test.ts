import { beforeEach, describe, expect, it } from "vitest";
import { MemoryType, UnifiedMemoryManager, type MemoryItem } from "./unifiedMemoryArchitecture";

describe("UnifiedMemoryManager shared process-local cache", () => {
  const userId = 918273;
  const otherUserId = 918274;

  beforeEach(async () => {
    await new UnifiedMemoryManager(userId).clearMemories();
    await new UnifiedMemoryManager(otherUserId).clearMemories();
  });

  it("shares imported memories across manager instances for the same user", async () => {
    const now = new Date();
    const writer = new UnifiedMemoryManager(userId);
    const reader = new UnifiedMemoryManager(userId);
    const memory = await writer.addMemory({
      userId,
      type: MemoryType.CONCEPT,
      content: "The user prefers evidence-backed explanations.",
      title: "Communication preference",
      visibility: "private",
      confidence: 0.95,
      importance: 0.9,
    });

    const retrieved = await reader.getMemoriesByType(MemoryType.CONCEPT);
    expect(retrieved.map((item) => item.id)).toContain(memory.id);
  });

  it("does not expose one user's memory cache to another user", async () => {
    const now = new Date();
    const memory: MemoryItem = {
      id: "mem-private-isolation-test",
      userId,
      type: MemoryType.EPISODIC,
      content: "Private user-specific memory.",
      visibility: "private",
      confidence: 0.9,
      importance: 0.8,
      createdAt: now,
      updatedAt: now,
      accessCount: 0,
    };

    await new UnifiedMemoryManager(userId).importMemories([memory]);
    const otherUserMemories = await new UnifiedMemoryManager(otherUserId).getMemoriesByType(
      MemoryType.EPISODIC
    );
    expect(otherUserMemories).toEqual([]);
  });
});
