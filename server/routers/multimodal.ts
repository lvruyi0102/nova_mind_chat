/**
 * Multimodal Generation API Routes
 *
 * Provides tRPC endpoints for generating images, games, music, and other media
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { generateImage } from "../_core/imageGeneration";
import { invokeLLM } from "../_core/llm";

export const multimodalRouter = router({
  /**
   * Generate an image based on a prompt
   */
  generateImage: protectedProcedure
    .input(
      z.object({
        prompt: z.string().min(1, "Prompt is required"),
        style: z.enum(["realistic", "artistic", "abstract", "cyberpunk", "fantasy"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await generateImage({
          prompt: input.prompt,
        });
        return {
          success: true,
          url: result.url,
          message: "Image generated successfully",
        };
      } catch (error) {
        console.error("[Multimodal] Error generating image:", error);
        throw new Error("Failed to generate image");
      }
    }),

  /**
   * Generate a game concept
   */
  generateGame: protectedProcedure
    .input(
      z.object({
        theme: z.string(),
        difficulty: z.enum(["easy", "medium", "hard"]).optional(),
        genre: z.enum(["puzzle", "adventure", "strategy", "casual"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system" as const,
              content:
                "You are a creative game designer. Generate a fun and engaging mini-game concept based on the user's request. Return JSON with: title, description, rules, and gameplay mechanics.",
            },
            {
              role: "user" as const,
              content: `Create a ${input.genre || "casual"} game with theme: ${input.theme}. Difficulty: ${input.difficulty || "medium"}`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "game_concept",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  rules: { type: "array", items: { type: "string" } },
                  mechanics: { type: "array", items: { type: "string" } },
                },
                required: ["title", "description", "rules", "mechanics"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices[0]?.message?.content;
        if (!content || typeof content !== "string") {
          throw new Error("Invalid response from LLM");
        }

        const gameData = JSON.parse(content);
        return {
          success: true,
          game: gameData,
          message: "Game concept generated successfully",
        };
      } catch (error) {
        console.error("[Multimodal] Error generating game:", error);
        throw new Error("Failed to generate game concept");
      }
    }),

  /**
   * Generate music or audio
   */
  generateMedia: protectedProcedure
    .input(
      z.object({
        type: z.enum(["music", "audio", "sound"]),
        description: z.string(),
        duration: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Placeholder for media generation
        // In production, this would call an audio generation service
        return {
          success: true,
          url: "https://example.com/generated-media.mp3",
          type: input.type,
          message: "Media generation initiated",
        };
      } catch (error) {
        console.error("[Multimodal] Error generating media:", error);
        throw new Error("Failed to generate media");
      }
    }),
});
