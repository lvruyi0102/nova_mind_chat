import { protectedProcedure, router } from "../_core/trpc";
import { capabilityRegistry, getCapabilityById } from "../metaReverse/registry";
import { z } from "zod";
import { fetchSam2Artifact, getVisionServiceHealth } from "../metaReverse/visionClient";

export const metaCapabilitiesRouter = router({
  visionHealth: protectedProcedure.query(() => getVisionServiceHealth()),
  getVisionArtifact: protectedProcedure
    .input(z.object({ objectId: z.string().uuid() }))
    .query(({ input }) => fetchSam2Artifact(input.objectId)),
  list: protectedProcedure.query(() => ({
    items: capabilityRegistry,
    total: capabilityRegistry.length,
    mode: "read_only" as const,
  })),

  get: protectedProcedure
    .input(z.object({ id: z.string().min(1).max(120) }))
    .query(({ input }) => {
      const capability = getCapabilityById(input.id);
      if (!capability) {
        return { found: false as const, capability: null };
      }
      return { found: true as const, capability };
    }),
});
