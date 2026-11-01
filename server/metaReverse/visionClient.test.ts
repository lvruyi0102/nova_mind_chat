import { afterEach, describe, expect, it, vi } from "vitest";
import { getVisionServiceHealth, segmentWithSam2 } from "./visionClient";
describe("SAM 2 vision service client", () => {
 afterEach(() => vi.unstubAllEnvs());
 it("reports not configured when no service URL is set", async () => {
  vi.stubEnv("NOVA_VISION_SERVICE_URL", "");
  await expect(getVisionServiceHealth()).resolves.toMatchObject({ status: "not_configured", provider: "sam2" });
 });
 it("validates prompts before making a request", async () => {
  vi.stubEnv("NOVA_VISION_SERVICE_URL", "http://localhost:8100");
  const fetcher = vi.fn();
  await expect(segmentWithSam2({ mediaUrl: "https://example.com/frame.jpg", mediaType: "image" }, fetcher as typeof fetch)).rejects.toThrow("At least one point prompt or a bounding box is required.");
  expect(fetcher).not.toHaveBeenCalled();
 });
 it("sends a prompted request and returns mask artifacts", async () => {
  vi.stubEnv("NOVA_VISION_SERVICE_URL", "http://localhost:8100/");
  const payload = { provider: "sam2", model: "sam2.1_hiera_small", mediaType: "image", artifacts: [{ objectId: "obj-1", frameIndex: 0, width: 10, height: 10, maskUrl: "https://example.com/mask.png" }], processingMs: 12 };
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => payload });
  const result = await segmentWithSam2({ mediaUrl: "https://example.com/frame.jpg", mediaType: "image", points: [{ x: 0.5, y: 0.5, label: 1 }] }, fetcher as unknown as typeof fetch);
  expect(fetcher).toHaveBeenCalledWith("http://localhost:8100/v1/segment", expect.objectContaining({ method: "POST" }));
  expect(result).toEqual(payload);
 });

 it("retrieves mask artifacts through the authenticated server client", async () => {
 vi.stubEnv("NOVA_VISION_SERVICE_URL", "http://localhost:8100");
 vi.stubEnv("NOVA_VISION_SERVICE_TOKEN", "test-token");
 const fetcher = vi.fn().mockResolvedValue({
  ok: true,
  headers: { get: () => "image/png" },
  arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
 });
 const { fetchSam2Artifact } = await import("./visionClient");
 const result = await fetchSam2Artifact("123e4567-e89b-12d3-a456-426614174000", fetcher as typeof fetch);
 expect(result).toEqual({ objectId: "123e4567-e89b-12d3-a456-426614174000", contentType: "image/png", base64: "AQID" });
 expect(fetcher).toHaveBeenCalledWith("http://localhost:8100/artifacts/123e4567-e89b-12d3-a456-426614174000.png", expect.objectContaining({ headers: { authorization: "Bearer test-token" } }));
});

});
