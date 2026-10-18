import { describe, expect, it } from "vitest";
import { evaluateForecast, validateObservation } from "./validation";

describe("Digital Earth validation", () => {
  it("rejects observations without provenance", () => {
    const result = validateObservation({
      metric: "temperature",
      value: 12,
      unit: "C",
      observedAt: "2026-01-01T00:00:00Z",
      sourceName: " ",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContain("sourceName is required");
  });

  it("normalizes valid observations without pretending they are verified", () => {
    const result = validateObservation({
      metric: "temperature",
      value: 12,
      unit: "C",
      observedAt: "2026-01-01T00:00:00Z",
      sourceName: "Example feed",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.normalized.qualityStatus).toBe("unverified");
  });

  it("scores only matching units, metrics, time windows, and valid observations", () => {
    const forecast = {
      forecastId: "f1",
      metric: "temperature",
      predictedValue: 10,
      unit: "C",
      targetAt: "2026-01-01T00:00:00Z",
    };
    const observation = {
      observationId: "o1",
      metric: "temperature",
      value: 12,
      unit: "C",
      observedAt: "2026-01-01T00:05:00Z",
      qualityStatus: "valid" as const,
    };
    expect(evaluateForecast(forecast, observation, 10 * 60 * 1000)).toMatchObject({
      status: "matched",
      absoluteError: 2,
      relativeError: 1 / 6,
    });
    expect(evaluateForecast(forecast, { ...observation, unit: "F" }, 10 * 60 * 1000).status).toBe("unit_mismatch");
    expect(evaluateForecast(forecast, { ...observation, qualityStatus: "suspect" }, 10 * 60 * 1000).status).toBe("quality_rejected");
    expect(evaluateForecast(forecast, observation, 60 * 1000).status).toBe("time_mismatch");
  });
});
