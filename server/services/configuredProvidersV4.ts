/**
 * Registers real providers whose credentials are present at server startup.
 * A capability is never advertised unless its backing provider is configured.
 */
import { ENV } from "../_core/env";
import { generateImage } from "../_core/imageGeneration";
import { toolAdapterRegistryV4 } from "./toolAdapterRegistryV4";

let registered = false;

export function registerConfiguredProvidersV4(): { registered: string[]; skipped: string[] } {
  if (registered) return { registered: [], skipped: [] };
  const registeredNames: string[] = [];
  const skipped: string[] = [];

  if (ENV.forgeApiUrl && ENV.forgeApiKey) {
    toolAdapterRegistryV4.register({
      name: "built-in-image-generation",
      capabilities: [{
        id: "image.generate",
        modality: "image",
        description: "Generate and durably store a real image using the configured image service.",
        inputFormats: ["text/plain"],
        outputMediaTypes: ["image/png", "image/jpeg", "image/webp"],
        supportsAsync: false,
        enabled: true,
      }],
      async execute(request) {
        const suppliedPrompt = request.input.prompt;
        const goal = typeof request.input.goal === "string" ? request.input.goal : "";
        const description = typeof request.input.description === "string" ? request.input.description : "";
        const prompt = typeof suppliedPrompt === "string" && suppliedPrompt.trim()
          ? suppliedPrompt.trim()
          : [goal.trim(), description.trim()].filter(Boolean).join("\n\n");
        if (!prompt) {
          return {
            status: "FAILED",
            artifacts: [],
            error: { code: "INVALID_INPUT", message: "Image generation requires a non-empty prompt." },
          };
        }

        const generated = await generateImage({ prompt });
        if (!generated.url?.trim()) {
          return {
            status: "FAILED",
            artifacts: [],
            error: { code: "PROVIDER_EMPTY_OUTPUT", message: "Image provider returned no durable artifact URL." },
          };
        }
        const mediaType = generated.mimeType?.trim();
        if (!mediaType || !["image/png", "image/jpeg", "image/webp"].includes(mediaType)) {
          return {
            status: "FAILED",
            artifacts: [],
            error: { code: "PROVIDER_INVALID_MEDIA_TYPE", message: "Image provider returned an unsupported or missing image MIME type." },
          };
        }
        return {
          status: "SUCCEEDED",
          artifacts: [{ uri: generated.url, mediaType }],
          metadata: { provider: "built-in-image-generation", mediaType },
        };
      },
    });
    registeredNames.push("built-in-image-generation");
  } else {
    skipped.push("built-in-image-generation (BUILT_IN_FORGE_API_URL / BUILT_IN_FORGE_API_KEY missing)");
  }

  registered = true;
  console.log("[AgentProvidersV4] Registered:", registeredNames, "Skipped:", skipped);
  return { registered: registeredNames, skipped };
}
