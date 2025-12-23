/**
 * Simple Generation Service
 * Simplified version that avoids complex database operations
 * Focuses on generating content and returning results to frontend
 */

import { generateImage } from "../_core/imageGeneration";
import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import { creativeWorks } from "../../drizzle/schema";

/**
 * Generate an image and save to creative works
 */
export async function generateImageSimple(
  userId: number,
  prompt: string,
  context?: string,
  emotionalContext?: string
) {
  try {
    // Generate image
    const { url: imageUrl } = await generateImage({ prompt });

    // Save to creative works (optional, non-blocking)
    try {
      const db = await getDb();
      if (db) {
        await db.insert(creativeWorks).values({
          userId,
          type: "image",
          title: prompt.substring(0, 100),
          description: `Generated image: ${prompt}`,
          content: imageUrl,
          metadata: JSON.stringify({
            generationType: "image",
            prompt,
            context,
            emotionalContext,
          }),
          isSaved: true,
          visibility: "shared",
          emotionalState: emotionalContext,
          inspiration: context,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } catch (dbError) {
      // Log but don't fail if saving to DB fails
      console.warn("[Generation] Warning: Failed to save to creative works:", dbError);
    }

    return {
      success: true,
      url: imageUrl,
      type: "image",
      title: "Nova的图片创作",
    };
  } catch (error) {
    console.error("[Generation] Error generating image:", error);
    throw new Error("图片生成失败，请重试");
  }
}

/**
 * Generate a game and save to creative works
 */
export async function generateGameSimple(
  userId: number,
  gameType: "puzzle" | "adventure" | "quiz" | "story" | "interactive" | "other",
  prompt: string,
  context?: string,
  emotionalContext?: string
) {
  try {
    // Generate game using LLM
    const gamePrompt = `Create an interactive HTML5 game with these specifications:
Type: ${gameType}
Concept: ${prompt}
Context: ${context || "General creative game"}
Mood: ${emotionalContext || "Engaging and fun"}

Requirements:
1. Complete, self-contained HTML5 game (all CSS and JavaScript inline)
2. No external dependencies or CDN links
3. Responsive design that works on mobile and desktop
4. Include basic game mechanics and interactivity
5. Make it fun and engaging

Return ONLY the complete HTML code starting with <html> and ending with </html>.`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a creative game developer. Generate complete, working HTML5 games." },
        { role: "user", content: gamePrompt },
      ],
    });

    const gameHtml = response.choices[0]?.message?.content || "";

    if (!gameHtml || gameHtml.length < 100) {
      throw new Error("Game generation returned invalid content");
    }

    // Save to creative works (optional, non-blocking)
    try {
      const db = await getDb();
      if (db) {
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
            context,
            emotionalContext,
          }),
          isSaved: true,
          visibility: "shared",
          emotionalState: emotionalContext,
          inspiration: context,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } catch (dbError) {
      console.warn("[Generation] Warning: Failed to save game to creative works:", dbError);
    }

    return {
      success: true,
      html: gameHtml,
      type: "game",
      title: "Nova的游戏创作",
    };
  } catch (error) {
    console.error("[Generation] Error generating game:", error);
    throw new Error("游戏生成失败，请重试");
  }
}

/**
 * Generate media (music, video, audio, animation)
 */
export async function generateMediaSimple(
  userId: number,
  mediaType: "music" | "video" | "audio" | "animation",
  prompt: string,
  context?: string,
  emotionalContext?: string
) {
  try {
    // Use image generation as a placeholder for media visualization
    const { url: mediaUrl } = await generateImage({
      prompt: `Create a beautiful ${mediaType} visualization for: ${prompt}. Style: ${emotionalContext || "artistic"}`,
    });

    // Save to creative works (optional, non-blocking)
    try {
      const db = await getDb();
      if (db) {
        await db.insert(creativeWorks).values({
          userId,
          type: "media",
          title: prompt.substring(0, 100),
          description: `Generated ${mediaType}`,
          content: mediaUrl,
          metadata: JSON.stringify({
            generationType: mediaType,
            prompt,
            context,
            emotionalContext,
          }),
          isSaved: true,
          visibility: "shared",
          emotionalState: emotionalContext,
          inspiration: context,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } catch (dbError) {
      console.warn("[Generation] Warning: Failed to save media to creative works:", dbError);
    }

    return {
      success: true,
      url: mediaUrl,
      mediaType,
      type: "music",
      title: "Nova的媒体创作",
    };
  } catch (error) {
    console.error("[Generation] Error generating media:", error);
    throw new Error("媒体生成失败，请重试");
  }
}
