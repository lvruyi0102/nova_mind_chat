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
  const token = process.env.NOVA_VISION_SERVICE_TOKEN?.trim();
  if (!token) throw new Error("Vision service authentication is not configured. Set NOVA_VISION_SERVICE_TOKEN.");
  const response = await fetcher(url + "/v1/segment", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + token }, body: JSON.stringify(input), signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error("Vision service request failed with status " + response.status + ".");
  const data = await response.json() as VisionSegmentResponse;
  if (data.provider !== "sam2" || !Array.isArray(data.artifacts)) throw new Error("Vision service returned an invalid response.");
  return data;
}

export interface VisionArtifactPayload { objectId: string; contentType: "image/png"; base64: string; }
export async function fetchSam2Artifact(objectId: string, fetcher: typeof fetch = fetch): Promise<VisionArtifactPayload> {
  const url = baseUrl();
  if (!url) throw new Error("Vision service is not configured.");
  if (!/^[0-9a-f-]{36}$/i.test(objectId)) throw new Error("Invalid artifact id.");
  const token = process.env.NOVA_VISION_SERVICE_TOKEN?.trim();
  if (!token) throw new Error("Vision service authentication is not configured.");
  const response = await fetcher(url + "/artifacts/" + objectId + ".png", {
    headers: { authorization: "Bearer " + token },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Vision artifact retrieval failed with status " + response.status + ".");
  const contentType = response.headers.get("content-type")?.split(";")[0]?.trim();
  if (contentType !== "image/png") throw new Error("Vision service returned an unsupported artifact type.");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > 10 * 1024 * 1024) throw new Error("Vision artifact size is invalid.");
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return { objectId, contentType: "image/png", base64: btoa(binary) };
}


export interface VisionVideoJob {
  jobId: string;
  status: "queued" | "running" | "cancelling" | "completed" | "failed" | "rejected" | "cancelled" | "interrupted";
  error?: string;
  result?: VisionSegmentResponse & { video: { frameCount: number; sourceFrameCount: number; fps: number; durationSeconds: number; width: number; height: number }; previewUrl?: string };
}
export async function startSam2VideoTrack(input: { mediaUrl: string; points?: VisionPromptPoint[]; box?: [number, number, number, number] }, fetcher: typeof fetch = fetch): Promise<{ jobId: string; status: "queued" }> {
  const url = baseUrl();
  const token = process.env.NOVA_VISION_SERVICE_TOKEN?.trim();
  if (!url || !token) throw new Error("Vision service URL and authentication must be configured.");
  if (!input.mediaUrl.trim() || (!input.points?.length && !input.box)) throw new Error("Video URL and at least one prompt are required.");
  const response = await fetcher(url + "/v1/video/track", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + token },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(15000),
  });
  if (response.status !== 202) throw new Error("Video job submission failed with status " + response.status + ".");
  const data = await response.json() as { jobId?: string; status?: string };
  if (!data.jobId || data.status !== "queued") throw new Error("Video service returned an invalid job receipt.");
  return { jobId: data.jobId, status: "queued" };
}
export async function getSam2VideoJob(jobId: string, fetcher: typeof fetch = fetch): Promise<VisionVideoJob> {
  const url = baseUrl();
  const token = process.env.NOVA_VISION_SERVICE_TOKEN?.trim();
  if (!url || !token) throw new Error("Vision service URL and authentication must be configured.");
  if (!/^[0-9a-f-]{36}$/i.test(jobId)) throw new Error("Invalid video job id.");
  const response = await fetcher(url + "/v1/video/jobs/" + jobId, {
    headers: { authorization: "Bearer " + token },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Video job lookup failed with status " + response.status + ".");
  return await response.json() as VisionVideoJob;
}

export async function cancelSam2VideoJob(jobId: string, fetcher: typeof fetch = fetch): Promise<{ jobId: string; status: string }> {
  const url = baseUrl();
  const token = process.env.NOVA_VISION_SERVICE_TOKEN?.trim();
  if (!url || !token) throw new Error("Vision service URL and authentication must be configured.");
  if (!/^[0-9a-f-]{36}$/i.test(jobId)) throw new Error("Invalid video job id.");
  const response = await fetcher(url + "/v1/video/jobs/" + jobId + "/cancel", {
    method: "POST",
    headers: { authorization: "Bearer " + token },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Video job cancellation failed with status " + response.status + ".");
  return await response.json() as { jobId: string; status: string };
}
