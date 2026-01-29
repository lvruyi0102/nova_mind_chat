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
    // Generate media URL using LLM (in real implementation, would call media generation API)
    const mediaPrompt = `Generate a ${mediaType} based on:
- Concept: ${prompt}
- Context: ${context || "General creative work"}
- Emotional tone: ${emotionalContext || "Creative and engaging"}

Return ONLY a valid URL or file path for the generated ${mediaType}.`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: `You are a creative ${mediaType} generator. Generate high-quality ${mediaType} content.` },
        { role: "user", content: mediaPrompt },
      ],
    });

    const mediaUrl = extractTextContent(response.choices[0]?.message?.content);

    // Create generation request and save as creative work
    const db = await getDb();
    if (db) {
      // Map media type to valid generationType
      const generationType: "image" | "game" | "music" | "video" | "animation" | "interactive" = 
        mediaType === "audio" ? "music" : mediaType;
      
      const reqResult = await db.insert(creativeGenRequests).values({
        userId,
        generationType,
        prompt,
        context,
        emotionalContext,
        status: "completed",
        progress: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const requestId = (reqResult as any).insertId || reqResult[0];

      // Save media
      const genMediaType: "music" | "video" | "audio" | "animation" = mediaType;
      await db.insert(genMedia).values({
        userId,
        genReqId: requestId,
        title: prompt.substring(0, 100),
        description: `Generated ${mediaType}: ${prompt}`,
        mediaUrl: mediaUrl,
        mediaType: genMediaType,
        duration: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
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
    console.error("Error generating media:", error);
    throw error;
  }
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
