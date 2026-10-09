/**
 * Image generation helper using internal ImageService
 *
 * Example usage:
 *   const { url: imageUrl } = await generateImage({
 *     prompt: "A serene landscape with mountains"
 *   });
 *
 * For editing:
 *   const { url: imageUrl } = await generateImage({
 *     prompt: "Add a rainbow to this landscape",
 *     originalImages: [{
 *       url: "https://example.com/original.jpg",
 *       mimeType: "image/jpeg"
 *     }]
 *   });
 */
import { randomUUID } from "node:crypto";
import { storagePut } from "server/storage";
import { ENV } from "./env";

export type GenerateImageOptions = {
  prompt: string;
  timeoutMs?: number;
  originalImages?: Array<{
    url?: string;
    b64Json?: string;
    mimeType?: string;
  }>;
};

export type GenerateImageResponse = {
  url?: string;
  mimeType?: string;
};

export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  if (!ENV.forgeApiUrl) {
    throw new Error("BUILT_IN_FORGE_API_URL is not configured");
  }
  if (!ENV.forgeApiKey) {
    throw new Error("BUILT_IN_FORGE_API_KEY is not configured");
  }

  // Build the full URL by appending the service path to the base URL
  const baseUrl = ENV.forgeApiUrl.endsWith("/")
    ? ENV.forgeApiUrl
    : `${ENV.forgeApiUrl}/`;
  const fullUrl = new URL(
    "images.v1.ImageService/GenerateImage",
    baseUrl
  ).toString();

  const response = await fetch(fullUrl, {
    method: "POST",
    signal: AbortSignal.timeout(Math.max(1, options.timeoutMs ?? 120_000)),
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "connect-protocol-version": "1",
      authorization: `Bearer ${ENV.forgeApiKey}`,
    },
    body: JSON.stringify({
      prompt: options.prompt,
      original_images: options.originalImages || [],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Image generation request failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
    );
  }

  const result = (await response.json()) as {
    image: {
      b64Json: string;
      mimeType: string;
    };
  };
  if (!result?.image || typeof result.image.b64Json !== "string" || !result.image.b64Json.trim()) {
    throw new Error("Image provider returned an empty image payload");
  }
  const mimeType = result.image.mimeType;
  if (!["image/png", "image/jpeg", "image/webp"].includes(mimeType)) {
    throw new Error(`Image provider returned unsupported MIME type: ${String(mimeType)}`);
  }
  const base64Data = result.image.b64Json;
  const buffer = Buffer.from(base64Data, "base64");
  if (buffer.length === 0) {
    throw new Error("Image provider returned an empty decoded image payload");
  }

  // Save to S3 only after validating that the provider returned a supported image.
  const extension = mimeType === "image/jpeg" ? "jpg"
    : mimeType === "image/webp" ? "webp"
    : "png";
  const { url } = await storagePut(
    `generated/${randomUUID()}.${extension}`,
    buffer,
    mimeType
  );
  return {
    url,
    mimeType,
  };
}
