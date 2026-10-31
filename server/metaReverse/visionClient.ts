export type VisionServiceStatus = "connected" | "not_configured" | "unavailable";
export interface VisionServiceHealth { status: VisionServiceStatus; provider: "sam2"; model: string | null; device: string | null; }
export interface VisionPromptPoint { x: number; y: number; label: 0 | 1; }
export interface VisionSegmentRequest { mediaUrl: string; mediaType: "image" | "video"; points?: VisionPromptPoint[]; box?: [number, number, number, number]; frameIndex?: number; }
export interface VisionMaskArtifact { objectId: string; frameIndex: number; width: number; height: number; maskUrl: string; confidence?: number; }
export interface VisionSegmentResponse { provider: "sam2"; model: string; mediaType: "image" | "video"; artifacts: VisionMaskArtifact[]; processingMs: number; }
function baseUrl(): string | null { const value = process.env.NOVA_VISION_SERVICE_URL?.trim(); return value ? value.replace(/\/+$/, "") : null; }
export async function getVisionServiceHealth(fetcher: typeof fetch = fetch): Promise<VisionServiceHealth> {
  const url = baseUrl();
  if (!url) return { status: "not_configured", provider: "sam2", model: null, device: null };
  try {
    const response = await fetcher(url + "/health", { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return { status: "unavailable", provider: "sam2", model: null, device: null };
    const data = await response.json() as { status?: string; provider?: string; model?: string; device?: string };
    if (data.status !== "ok" || data.provider !== "sam2") return { status: "unavailable", provider: "sam2", model: null, device: null };
    return { status: "connected", provider: "sam2", model: data.model ?? null, device: data.device ?? null };
  } catch { return { status: "unavailable", provider: "sam2", model: null, device: null }; }
}
export async function segmentWithSam2(input: VisionSegmentRequest, fetcher: typeof fetch = fetch): Promise<VisionSegmentResponse> {
  const url = baseUrl();
  if (!url) throw new Error("Vision service is not configured. Set NOVA_VISION_SERVICE_URL.");
  if (!input.mediaUrl.trim()) throw new Error("mediaUrl is required.");
  if (!input.points?.length && !input.box) throw new Error("At least one point prompt or a bounding box is required.");
  const response = await fetcher(url + "/v1/segment", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input), signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error("Vision service request failed with status " + response.status + ".");
  const data = await response.json() as VisionSegmentResponse;
  if (data.provider !== "sam2" || !Array.isArray(data.artifacts)) throw new Error("Vision service returned an invalid response.");
  return data;
}