import { describe, it, expect, afterEach } from "vitest";
import {
  getAutonomousBackgroundLoop,
  initializeAutonomousBackgroundLoop,
  stopAutonomousBackgroundLoop,
} from "../autonomousBackgroundLoop";

describe("AutonomousBackgroundLoop runtime behavior", () => {
  afterEach(() => {
    stopAutonomousBackgroundLoop();
  });

  it("should start from disabled state and become running after initialization", () => {
    const loop = getAutonomousBackgroundLoop();
    loop.stop();

    const before = loop.getStatus();
    expect(before.enabled).toBe(false);

    initializeAutonomousBackgroundLoop();
    const after = loop.getStatus();
    expect(after.enabled).toBe(true);
  });

  it("should remain running when start is called repeatedly", () => {
    const loop = getAutonomousBackgroundLoop();
    loop.stop();

    loop.start();
    const first = loop.getStatus();
    loop.start();
    const second = loop.getStatus();

    expect(first.enabled).toBe(true);
    expect(second.enabled).toBe(true);
  });
});
