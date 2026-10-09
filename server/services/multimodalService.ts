/**
 * Multimodal Creative Generation Service
 * Handles generation of images, games, music, videos, and other creative content
 */

import { getDb } from "../db";
import { creativeGenRequests, genGames, genHistory, creativeWorks } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { generateImage } from "../_core/imageGeneration";
import { invokeLLM } from "../_core/llm";

/**
 * Helper function to extract text content from LLM response
 */
function extractTextContent(content: string | Array<any> | undefined): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter(c => c.type === 'text')
      .map(c => c.text || '')
      .join('');
  }
  return "";
}

/**
 * Create a generation request
 */
export async function createGenerationRequest(
  userId: number,
  generationType: "image" | "game" | "music" | "video" | "animation" | "interactive",
  prompt: string,
  context?: string,
  emotionalContext?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(creativeGenRequests).values({
    userId,
    generationType,
    prompt,
    context,
    emotionalContext,
    status: "pending",
    progress: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return (result as any).insertId || result[0];
}

/**
 * Generate an image
 */
export async function generateCreativeImage(
  userId: number,
  prompt: string,
  context?: string,
  emotionalContext?: string
) {
  try {
    const imageUrl = await generateImage({ prompt });

    // Create generation request and save as creative work
    const db = await getDb();
    if (db) {
      const reqResult = await db.insert(creativeGenRequests).values({
        userId,
        generationType: "image",
        prompt,
        context,
        emotionalContext,
        status: "completed",
        progress: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const requestId = (reqResult as any).insertId || reqResult[0];

      // Save as creative work
      await db.insert(creativeWorks).values({
        userId,
        type: "image",
        title: prompt.substring(0, 100),
        description: `Generated image from prompt: ${prompt}`,
        metadata: JSON.stringify({
          generationType: "image",
          prompt,
          generationRequestId: requestId,
        }),
        isSaved: true,
        visibility: "shared",
        emotionalState: emotionalContext,
        inspiration: context,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { requestId, imageUrl, success: true };
    }

    return { imageUrl, success: true };
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
}

/**
 * Generate a game
 */
export async function generateCreativeGame(
  userId: number,
  gameType: "puzzle" | "adventure" | "quiz" | "story" | "interactive" | "other",
  prompt: string,
  context?: string,
  emotionalContext?: string
) {
  try {
    // Generate game using LLM
    const gamePrompt = `Create an interactive HTML5 game with the following specifications:
- Type: ${gameType}
- Concept: ${prompt}
- Context: ${context || "General creative game"}
- Emotional tone: ${emotionalContext || "Engaging and fun"}

Requirements:
1. Self-contained HTML5 game (all CSS and JavaScript inline)
2. No external dependencies
3. Responsive design
4. Include basic game mechanics and interactivity
5. Make it fun and engaging

Return ONLY the complete HTML code, wrapped in <html> tags.`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a creative game developer. Generate complete, working HTML5 games." },
        { role: "user", content: gamePrompt },
      ],
    });

    const gameHtml = extractTextContent(response.choices[0]?.message?.content);

    // Create generation request and save as creative work
    const db = await getDb();
    if (db) {
      const reqResult = await db.insert(creativeGenRequests).values({
        userId,
        generationType: "game",
        prompt,
        context,
        emotionalContext,
        status: "completed",
        progress: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const requestId = (reqResult as any).insertId || reqResult[0];

      // Save game
      await db.insert(genGames).values({
        userId,
        genReqId: requestId,
        title: prompt.substring(0, 100),
        description: `${gameType} game: ${prompt}`,
        gameCode: gameHtml,
        gameType,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Save as creative work
      await db.insert(creativeWorks).values({
        userId,
        type: "game",
        title: prompt.substring(0, 100),
        description: `Generated ${gameType} game`,
        content: gameHtml,
        metadata: JSON.stringify({
          generationType: "game",
          gameType,
          prompt,
          generationRequestId: requestId,
        }),
        isSaved: true,
        visibility: "shared",
        emotionalState: emotionalContext,
        inspiration: context,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { requestId, html: gameHtml, success: true };
    }

    return { html: gameHtml, success: true };
  } catch (error) {
    console.error("Error generating game:", error);
    throw error;
  }
}

/**
 * Generate media (music, video, audio, animation).
 *
 * Important: an LLM-generated URL is not a media artifact. Until a real
 * provider adapter is configured, fail closed and persist a failed request
 * rather than recording fabricated output as completed.
 */
export async function generateCreativeMedia(
  userId: number,
  mediaType: "music" | "video" | "audio" | "animation",
  prompt: string,
  context?: string,
  emotionalContext?: string
) {
  const message =
    `No real media-generation provider is configured for "${mediaType}". ` +
    "The request was not generated; configure a provider adapter before retrying.";

  const db = await getDb();
  if (db) {
    const generationType: "music" | "video" | "animation" =
      mediaType === "audio" ? "music" : mediaType;

    await db.insert(creativeGenRequests).values({
      userId,
      generationType,
      prompt,
      context,
      emotionalContext,
      status: "failed",
      progress: 0,
      errorMessage: message,
      generationModel: "unconfigured",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  const error = new Error(message) as Error & { code: string };
  error.code = "MEDIA_PROVIDER_NOT_CONFIGURED";
  throw error;
}

/**
 * Record user interaction with generated content
 */
export async function recordGenerationInteraction(
  userId: number,
  generationRequestId: number,
  action: "viewed" | "played" | "saved" | "shared" | "regenerated" | "edited",
  rating?: number,
  feedback?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(genHistory).values({
    userId,
    genReqId: generationRequestId,
    action,
    rating,
    feedback,
    createdAt: new Date(),
  });
}

/**
 * Get generation history
 */
export async function getGenerationHistory(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select()
    .from(genHistory)
    .where(eq(genHistory.userId, userId))
    .limit(limit);
}
