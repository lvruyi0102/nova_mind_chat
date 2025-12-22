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
    status: "pending",
    progress: 0,
  });

  return result;
}

/**
 * Update generation request status
 */
export async function updateGenerationStatus(
  requestId: number,
  status: "pending" | "generating" | "completed" | "failed",
  progress?: number,
  resultUrl?: string,
  errorMessage?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = {
    status,
    updatedAt: new Date(),
  };

  if (progress !== undefined) updateData.progress = progress;
  if (resultUrl) updateData.resultUrl = resultUrl;
  if (errorMessage) updateData.errorMessage = errorMessage;
  if (status === "completed") updateData.completedAt = new Date();

  await db.update(creativeGenRequests).set(updateData).where(eq(creativeGenRequests.id, requestId));
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
    // Create generation request
    const reqResult = await createGenerationRequest(userId, "image", prompt, context, emotionalContext);
    const requestId = (reqResult as any).insertId || reqResult[0];

    // Update status to generating
    await updateGenerationStatus(requestId, "generating", 25);

    // Generate image
    const { url: imageUrl } = await generateImage({ prompt });

    // Update status to completed
    await updateGenerationStatus(requestId, "completed", 100, imageUrl);

    // Save as creative work
    const db = await getDb();
    if (db) {
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
    }

    return { requestId, imageUrl, success: true };
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
    // Create generation request
    const reqResult = await createGenerationRequest(userId, "game", prompt, context, emotionalContext);
    const requestId = (reqResult as any).insertId || reqResult[0];

    // Update status to generating
    await updateGenerationStatus(requestId, "generating", 25);

    // Generate game using LLM
    const gamePrompt = `Create an interactive ${gameType} game based on this prompt: "${prompt}"
    
    Return a JSON object with:
    {
      "title": "Game Title",
      "description": "Brief description",
      "gameCode": "HTML/JavaScript code for the game",
      "gameData": { game rules and state }
    }
    
    The game should be playable in a browser and self-contained.`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a creative game designer. Generate interactive games in JSON format.",
        },
        {
          role: "user",
          content: gamePrompt,
        },
      ],
    });

    let gameContent;
    try {
      gameContent = JSON.parse(response.choices[0].message.content);
    } catch {
      gameContent = {
        title: prompt.substring(0, 100),
        description: "Generated game",
        gameCode: "<div>Game generation in progress...</div>",
        gameData: {},
      };
    }

    // Update status to completed
    await updateGenerationStatus(requestId, "completed", 100);

    // Save game to database
    const db = await getDb();
    if (db) {
      const gameResult = await db.insert(genGames).values({
        userId,
        genReqId: requestId,
        title: gameContent.title || prompt.substring(0, 100),
        description: gameContent.description || `Generated ${gameType} game`,
        gameType,
        gameCode: gameContent.gameCode,
        gameData: JSON.stringify(gameContent.gameData || {}),
        playCount: 0,
      });

      const gameId = (gameResult as any).insertId || gameResult[0];

      // Also save as creative work
      await db.insert(creativeWorks).values({
        userId,
        type: "other",
        title: gameContent.title || prompt.substring(0, 100),
        description: `Generated ${gameType} game: ${gameContent.description}`,
        content: gameContent.gameCode,
        metadata: JSON.stringify({
          generationType: "game",
          gameType,
          gameId,
          prompt,
          generationRequestId: requestId,
        }),
        isSaved: true,
        visibility: "shared",
        emotionalState: emotionalContext,
        inspiration: context,
      });

      return { requestId, gameId, game: gameContent, success: true };
    }

    return { requestId, game: gameContent, success: true };
  } catch (error) {
    console.error("[Multimodal] Error generating game:", error);
    throw error;
  }
}

/**
 * Generate music or video
 */
export async function generateCreativeMedia(
  userId: number,
  mediaType: "music" | "video" | "audio" | "animation",
  prompt: string,
  context?: string,
  emotionalContext?: string
) {
  try {
    // Create generation request
    const reqResult = await createGenerationRequest(userId, mediaType, prompt, context, emotionalContext);
    const requestId = (reqResult as any).insertId || reqResult[0];

    // Update status to generating
    await updateGenerationStatus(requestId, "generating", 25);

    // For now, we'll use a placeholder approach
    // In production, you would integrate with actual music/video generation services
    const mediaPrompt = `Create a description for a ${mediaType} based on: "${prompt}"
    
    Include: title, description, genre, mood, style, and estimated duration.`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a creative ${mediaType} producer. Generate ${mediaType} descriptions.`,
        },
        {
          role: "user",
          content: mediaPrompt,
        },
      ],
    });

    const mediaDescription = response.choices[0].message.content;

    // Update status to completed
    await updateGenerationStatus(requestId, "completed", 100);

    // Save media to database
    const db = await getDb();
    if (db) {
      const mediaResult = await db.insert(genMedia).values({
        userId,
        genReqId: requestId,
        title: prompt.substring(0, 100),
        description: mediaDescription,
        mediaType,
        mediaUrl: `placeholder:${mediaType}:${requestId}`, // Placeholder URL
        duration: 180, // Default 3 minutes
      });

      const mediaId = (mediaResult as any).insertId || mediaResult[0];

      // Also save as creative work
      await db.insert(creativeWorks).values({
        userId,
        type: "other",
        title: `${mediaType.toUpperCase()}: ${prompt.substring(0, 50)}`,
        description: mediaDescription,
        content: `Generated ${mediaType} - ${mediaDescription}`,
        metadata: JSON.stringify({
          generationType: mediaType,
          mediaId,
          prompt,
          generationRequestId: requestId,
        }),
        isSaved: true,
        visibility: "shared",
        emotionalState: emotionalContext,
        inspiration: context,
      });

      return { requestId, mediaId, mediaDescription, success: true };
    }

    return { requestId, mediaDescription, success: true };
  } catch (error) {
    console.error("[Multimodal] Error generating media:", error);
    throw error;
  }
}

/**
 * Get generation history for user
 */
export async function getGenerationHistory(userId: number, limit: number = 20) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const requests = await db
    .select()
    .from(creativeGenRequests)
    .where(eq(creativeGenRequests.userId, userId))
    .orderBy(creativeGenRequests.createdAt)
    .limit(limit);

  return requests;
}

/**
 * Record generation interaction
 */
export async function recordGenerationInteraction(
  userId: number,
  generationRequestId: number,
  action: "viewed" | "played" | "saved" | "shared" | "regenerated" | "edited",
  actionDetails?: any,
  rating?: number,
  feedback?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(genHistory).values({
    userId,
    genReqId: generationRequestId,
    action,
    actionDetails: actionDetails ? JSON.stringify(actionDetails) : undefined,
    rating,
    feedback,
  });
}

/**
 * Get game by ID
 */
export async function getGameById(gameId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const game = await db.select().from(genGames).where(eq(genGames.id, gameId)).limit(1);

  return game.length > 0 ? game[0] : null;
}

/**
 * Get media by ID
 */
export async function getMediaById(mediaId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const media = await db.select().from(genMedia).where(eq(genMedia.id, mediaId)).limit(1);

  return media.length > 0 ? media[0] : null;
}
