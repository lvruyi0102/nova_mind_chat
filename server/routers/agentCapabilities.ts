import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  analyzeAgentRequest,
  buildExecutionPlan,
  suggestAgentCapabilities,
} from "../services/agentCapabilityService";

const requestInput = z.object({
  request: z.string().min(1),
  context: z.array(z.string()).optional(),
});

export const agentCapabilitiesRouter = router({
  analyzeRequest: protectedProcedure.input(requestInput).query(({ input }) => {
    return analyzeAgentRequest(input.request, input.context ?? []);
  }),

  draftExecutionPlan: protectedProcedure.input(requestInput).query(({ input }) => {
    const analysis = analyzeAgentRequest(input.request, input.context ?? []);
    return buildExecutionPlan(analysis);
  }),

  suggest: protectedProcedure.input(requestInput).query(({ input }) => {
    return suggestAgentCapabilities(input.request, input.context ?? []);
  }),
});
