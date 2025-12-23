/**
 * Multimodal Creative Generation Service
 * Handles generation of images, games, music, videos, and other creative content
 */

import { getDb } from "../db";
import { creativeGenRequests, genGames, genMedia, genHistory, creativeWorks } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { generateImage } from "../_core/imageGeneration";
import { invokeLLM } from "../_core/llm";

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
    status: "completed",
    progress: 100,
  });

  return result;
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
    // Generate image
    const { url: imageUrl } = await generateImage({ prompt });

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
        resultUrl: imageUrl,
      });

      const requestId = (reqResult as any).insertId || reqResult[0];

      // Save as creative work
      await db.insert(creativeWorks).values({
        userId,
        type: "image",
        title: prompt.substring(0, 100),
        description: `Generated image from prompt: ${prompt}`,
        content: imageUrl,
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
    console.error("[Multimodal] Error generating image:", error);
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

    const gameHtml = response.choices[0]?.message?.content || "";

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
      });

      const requestId = (reqResult as any).insertId || reqResult[0];

      // Save game
      await db.insert(genGames).values({
        userId,
        genReqId: requestId,
        title: prompt.substring(0, 100),
        description: `${gameType} game: ${prompt}`,
        html: gameHtml,
        gameType,
        difficulty: "medium",
        createdAt: new Date(),
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
    console.error("[Multimodal] Error generating game:", error);
    throw error;
  }
}

/**
 * Generate media (music, video, audio, animation)
 */
export async function generateCreativeMedia(
  userId: number,
  mediaType: "music" | "video" | "audio" | "animation",
  prompt: string,
  context?: string,
  emotionalContext?: string
) {
  try {
    // For now, use image generation as a placeholder for media
    // In production, you would integrate with actual music/video generation services
    const { url: mediaUrl } = await generateImage({
      prompt: `Create a ${mediaType} visualization for: ${prompt}`,
    });

    // Create generation request and save as creative work
    const db = await getDb();
    if (db) {
      const reqResult = await db.insert(creativeGenRequests).values({
        userId,
        generationType: mediaType === "video" ? "video" : "music",
        prompt,
        context,
        emotionalContext,
        status: "completed",
        progress: 100,
        resultUrl: mediaUrl,
      });

      const requestId = (reqResult as any).insertId || reqResult[0];

      // Save media
      await db.insert(genMedia).values({
        userId,
        genReqId: requestId,
        title: prompt.substring(0, 100),
        description: `Generated ${mediaType}: ${prompt}`,
        url: mediaUrl,
        mediaType,
        duration: 0,
        createdAt: new Date(),
      });

      // Save as creative work
      await db.insert(creativeWorks).values({
        userId,
        type: "media",
        title: prompt.substring(0, 100),
        description: `Generated ${mediaType}`,
        content: mediaUrl,
        metadata: JSON.stringify({
          generationType: mediaType,
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

      return { requestId, url: mediaUrl, mediaType, success: true };
    }

    return { url: mediaUrl, mediaType, success: true };
  } catch (error) {
    console.error("[Multimodal] Error generating media:", error);
    throw error;
  }
}

/**
 * Get generation history for a user
 */
export async function getGenerationHistory(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(creativeGenRequests)
    .where(eq(creativeGenRequests.userId, userId))
    .limit(limit);
}

/**
 * Get generation request details
 */
export async function getGenerationRequest(requestId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(creativeGenRequests)
    .where(eq(creativeGenRequests.id, requestId))
    .limit(1);

  return result[0] || null;
}
