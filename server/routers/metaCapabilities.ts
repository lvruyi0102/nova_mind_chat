import { protectedProcedure, router } from "../_core/trpc";
import { capabilityRegistry, getCapabilityById } from "../metaReverse/registry";
import { z } from "zod";
import { cancelSam2VideoJob, fetchSam2Artifact, getSam2VideoJob, getVisionServiceHealth, startSam2VideoTrack } from "../metaReverse/visionClient";

export const metaCapabilitiesRouter = router({
  visionHealth: protectedProcedure.query(() => getVisionServiceHealth()),
  startVisionVideoTrack: protectedProcedure
    .input(z.object({ mediaUrl: z.string().url().max(2048), points: z.array(z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1), label: z.union([z.literal(0), z.literal(1)]) })).max(16).optional(), box: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1), z.number().min(0).max(1), z.number().min(0).max(1)]).optional() }).refine((v) => !!v.points?.length || !!v.box, "At least one point or box prompt is required."))
    .mutation(({ input }) => startSam2VideoTrack(input)),
  getVisionVideoJob: protectedProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .query(({ input }) => getSam2VideoJob(input.jobId)),
  cancelVisionVideoJob: protectedProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .mutation(({ input }) => cancelSam2VideoJob(input.jobId)),
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
