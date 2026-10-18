import { describe, expect, it, vi } from "vitest";
import { fetchOpenMeteoHourlyTemperature } from "./openMeteo";

describe("Open-Meteo adapter", () => {
  it("maps hourly readings and preserves unverified status", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      hourly: {
        time: ["2026-01-01T00:00", "2026-01-01T01:00"],
        temperature_2m: [3.5, 4],
      },
    }), { status: 200, headers: { "content-type": "application/json" } }));
    const readings = await fetchOpenMeteoHourlyTemperature(31.2, 121.5, { fetchImpl });
    expect(readings).toHaveLength(2);
    expect(readings[0]).toMatchObject({
      metric: "air_temperature_2m",
      value: 3.5,
      unit: "°C",
      sourceName: "Open-Meteo",
      qualityStatus: "unverified",
    });
    expect(readings[0].observedAt.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("rejects invalid coordinates before requesting data", async () => {
    const fetchImpl = vi.fn();
    await expect(fetchOpenMeteoHourlyTemperature(100, 0, { fetchImpl })).rejects.toThrow("latitude");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("surfaces HTTP failures", async () => {
    const fetchImpl = vi.fn(async () => new Response("unavailable", { status: 503 }));
    await expect(fetchOpenMeteoHourlyTemperature(0, 0, { fetchImpl })).rejects.toThrow("503");
  });
});
