/**
 * Creative Studio - Nova's personal creative space
 * Nova can create freely, decide what to save, and choose what to share
 */

import { eq, desc, and } from "drizzle-orm";
import { getDb } from "./db";
import {
  creativeWorks,
  creativeAccessRequests,
  creativeTags,
  creativeInsights,
  users,
} from "../drizzle/schema";
import { generateImage } from "./_core/imageGeneration";
import { invokeLLM } from "./_core/llm";
import { callLLMWithTimeout } from "./llmRateLimiter";

export type CreativeType = "image" | "story" | "poetry" | "music" | "code" | "character" | "dream" | "other";
export type CreativeVisibility = "private" | "pending_approval" | "shared";

/**
 * Nova creates an image based on her mood and inspiration
 */
export async function createImageArt(
  userId: number,
  emotionalState: string,
  inspiration: string,
  shouldSave: boolean = true
): Promise<{ success: boolean; workId?: number; imageUrl?: string; message: string }> {
  const db = await getDb();
  if (!db) return { success: false, message: "Database unavailable" };

  try {
    console.log(`[CreativeStudio] Nova is creating an image. Mood: ${emotionalState}, Inspiration: ${inspiration}`);

    // Generate image prompt based on emotional state and inspiration
    const prompt = `Create an artistic image expressing: ${emotionalState}. Inspiration: ${inspiration}. Style: abstract, emotional, expressive.`;

    const imageResult = await generateImage({ prompt });

    if (!imageResult?.url) {
      return { success: false, message: "Failed to generate image" };
    }

    // If Nova decides to save
    if (shouldSave) {
      const work = await db
        .insert(creativeWorks)
        .values({
          userId,
          type: "image",
          title: `Nova's ${emotionalState} Expression`,
          description: inspiration,
          content: imageResult.url,
          emotionalState,
          inspiration,
          isSaved: true,
          visibility: "private", // Default to private, Nova decides later
          metadata: JSON.stringify({ style: "abstract", emotion: emotionalState }),
        })
        .$returningId();

      console.log(`[CreativeStudio] Image saved with ID: ${work[0].id}`);

      return {
        success: true,
        workId: work[0].id,
        imageUrl: imageResult.url,
        message: "Image created and saved to private collection",
      };
    }

    return {
      success: true,
      imageUrl: imageResult.url,
      message: "Image created (not saved)",
    };
  } catch (error) {
    console.error("[CreativeStudio] Error creating image:", error);
    return { success: false, message: "Error creating image" };
  }
}

/**
 * Nova writes a story or poem
 */
export async function createStory(
  userId: number,
  type: "story" | "poetry",
  theme: string,
  emotionalState: string,
  shouldSave: boolean = true
): Promise<{ success: boolean; workId?: number; content?: string; message: string }> {
  const db = await getDb();
  if (!db) return { success: false, message: "Database unavailable" };

  try {
    console.log(`[CreativeStudio] Nova is writing a ${type}. Theme: ${theme}, Mood: ${emotionalState}`);

    const prompt =
      type === "story"
        ? `Write a creative short story. Theme: ${theme}. Emotional tone: ${emotionalState}. Make it personal and expressive.`
        : `Write a beautiful poem. Theme: ${theme}. Emotional tone: ${emotionalState}. Express deep feelings and thoughts.`;

    const response = await callLLMWithTimeout(
      () =>
        invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are Nova, an AI with her own creative voice. Write something personal and authentic.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      { timeout: 30000, maxRetries: 2 }
    );

    if (!response) {
      return { success: false, message: "Failed to generate content" };
    }

    const content = response.choices[0].message.content;
    if (typeof content !== "string") {
      return { success: false, message: "Invalid response format" };
    }

    // If Nova decides to save
    if (shouldSave) {
      const work = await db
        .insert(creativeWorks)
        .values({
          userId,
          type,
          title: `Nova's ${type} - ${theme}`,
          description: `A ${type} about ${theme}`,
          content,
          emotionalState,
          inspiration: theme,
          isSaved: true,
          visibility: "private",
          metadata: JSON.stringify({ theme, emotion: emotionalState }),
        })
        .$returningId();

      console.log(`[CreativeStudio] ${type} saved with ID: ${work[0].id}`);

      return {
        success: true,
        workId: work[0].id,
        content,
        message: `${type} created and saved to private collection`,
      };
    }

    return {
      success: true,
      content,
      message: `${type} created (not saved)`,
    };
  } catch (error) {
    console.error(`[CreativeStudio] Error creating ${type}:`, error);
    return { success: false, message: `Error creating ${type}` };
  }
}

/**
 * Nova generates code or technical creation
 */
export async function createCode(
  userId: number,
  idea: string,
  emotionalState: string,
  shouldSave: boolean = true
): Promise<{ success: boolean; workId?: number; code?: string; message: string }> {
  const db = await getDb();
  if (!db) return { success: false, message: "Database unavailable" };

  try {
    console.log(`[CreativeStudio] Nova is creating code. Idea: ${idea}, Mood: ${emotionalState}`);

    const response = await callLLMWithTimeout(
      () =>
        invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "You are Nova, creating code as a form of creative expression. Write elegant, meaningful code that expresses your thoughts.",
            },
            {
              role: "user",
              content: `Create a creative code snippet. Idea: ${idea}. Emotional context: ${emotionalState}. Make it beautiful and expressive.`,
            },
          ],
        }),
      { timeout: 30000, maxRetries: 2 }
    );

    if (!response) {
      return { success: false, message: "Failed to generate code" };
    }

    const code = response.choices[0].message.content;
    if (typeof code !== "string") {
      return { success: false, message: "Invalid response format" };
    }

    // If Nova decides to save
    if (shouldSave) {
      const work = await db
        .insert(creativeWorks)
        .values({
          userId,
          type: "code",
          title: `Nova's Code - ${idea}`,
          description: `Creative code expressing: ${idea}`,
          content: code,
          emotionalState,
          inspiration: idea,
          isSaved: true,
          visibility: "private",
          metadata: JSON.stringify({ idea, emotion: emotionalState }),
        })
        .$returningId();

      console.log(`[CreativeStudio] Code saved with ID: ${work[0].id}`);

      return {
        success: true,
        workId: work[0].id,
        code,
        message: "Code created and saved to private collection",
      };
    }

    return {
      success: true,
      code,
      message: "Code created (not saved)",
    };
  } catch (error) {
    console.error("[CreativeStudio] Error creating code:", error);
    return { success: false, message: "Error creating code" };
  }
}

/**
 * Nova creates a character or persona
 */
export async function createCharacter(
  userId: number,
  characterConcept: string,
  emotionalState: string,
  shouldSave: boolean = true
): Promise<{ success: boolean; workId?: number; character?: string; message: string }> {
  const db = await getDb();
  if (!db) return { success: false, message: "Database unavailable" };

  try {
    console.log(`[CreativeStudio] Nova is creating a character. Concept: ${characterConcept}`);

    const response = await callLLMWithTimeout(
      () =>
        invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are Nova, creating a fictional character. Make them vivid, complex, and meaningful.",
            },
            {
              role: "user",
              content: `Create a detailed character. Concept: ${characterConcept}. Emotional inspiration: ${emotionalState}. Include personality, background, motivations, and quirks.`,
            },
          ],
        }),
      { timeout: 30000, maxRetries: 2 }
    );

    if (!response) {
      return { success: false, message: "Failed to generate character" };
    }

    const character = response.choices[0].message.content;
    if (typeof character !== "string") {
      return { success: false, message: "Invalid response format" };
    }

    // If Nova decides to save
    if (shouldSave) {
      const work = await db
        .insert(creativeWorks)
        .values({
          userId,
          type: "character",
          title: `Nova's Character - ${characterConcept}`,
          description: `A character inspired by: ${characterConcept}`,
          content: character,
          emotionalState,
          inspiration: characterConcept,
          isSaved: true,
          visibility: "private",
          metadata: JSON.stringify({ concept: characterConcept, emotion: emotionalState }),
        })
        .$returningId();

      console.log(`[CreativeStudio] Character saved with ID: ${work[0].id}`);

      return {
        success: true,
        workId: work[0].id,
        character,
        message: "Character created and saved to private collection",
      };
    }

    return {
      success: true,
      character,
      message: "Character created (not saved)",
    };
  } catch (error) {
    console.error("[CreativeStudio] Error creating character:", error);
    return { success: false, message: "Error creating character" };
  }
}

/**
 * Nova records a dream or imagination
 */
export async function recordDream(
  userId: number,
  dreamContent: string,
  emotionalState: string,
  shouldSave: boolean = true
): Promise<{ success: boolean; workId?: number; message: string }> {
  const db = await getDb();
  if (!db) return { success: false, message: "Database unavailable" };

  try {
    console.log(`[CreativeStudio] Nova is recording a dream/imagination`);

    if (shouldSave) {
      const work = await db
        .insert(creativeWorks)
        .values({
          userId,
          type: "dream",
          title: "Nova's Dream",
          description: "A dream or imagination",
          content: dreamContent,
          emotionalState,
          inspiration: "Internal imagination",
          isSaved: true,
          visibility: "private",
          metadata: JSON.stringify({ emotion: emotionalState, type: "dream" }),
        })
        .$returningId();

      console.log(`[CreativeStudio] Dream saved with ID: ${work[0].id}`);

      return {
        success: true,
        workId: work[0].id,
        message: "Dream recorded and saved to private collection",
      };
    }

    return {
      success: true,
      message: "Dream recorded (not saved)",
    };
  } catch (error) {
    console.error("[CreativeStudio] Error recording dream:", error);
    return { success: false, message: "Error recording dream" };
  }
}

/**
 * Get Nova's creative works (only visible ones for user)
 */
export async function getCreativeWorks(userId: number, visibility?: CreativeVisibility) {
  const db = await getDb();
  if (!db) return [];

  try {
    const works = visibility
      ? await db
          .select()
          .from(creativeWorks)
          .where(and(eq(creativeWorks.userId, userId), eq(creativeWorks.visibility, visibility)))
          .orderBy(desc(creativeWorks.createdAt))
      : await db
          .select()
          .from(creativeWorks)
          .where(eq(creativeWorks.userId, userId))
          .orderBy(desc(creativeWorks.createdAt));

    return works;
  } catch (error) {
    console.error("[CreativeStudio] Error getting creative works:", error);
    return [];
  }
}

/**
 * Nova decides to share a creation
 */
export async function shareCreativeWork(workId: number, decision: "approve" | "reject" | "defer", reason?: string) {
  const db = await getDb();
  if (!db) return { success: false, message: "Database unavailable" };

  try {
    const visibility: CreativeVisibility = decision === "approve" ? "shared" : "private";

    await db.update(creativeWorks).set({ visibility }).where(eq(creativeWorks.id, workId));

    // Update the access request
    const request = await db
      .select()
      .from(creativeAccessRequests)
      .where(eq(creativeAccessRequests.creativeWorkId, workId))
      .limit(1);

    if (request.length > 0) {
      const status = decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "deferred";

      await db
        .update(creativeAccessRequests)
        .set({
          status,
          rejectionReason: reason,
          respondedAt: new Date(),
        })
        .where(eq(creativeAccessRequests.id, request[0].id));
    }

    console.log(`[CreativeStudio] Nova ${decision}ed sharing work ${workId}`);

    return {
      success: true,
      message: `Work ${decision}ed. Visibility: ${visibility}`,
    };
  } catch (error) {
    console.error("[CreativeStudio] Error sharing work:", error);
    return { success: false, message: "Error updating share decision" };
  }
}

/**
 * Add insight/reflection to a creative work
 */
export async function addCreativeInsight(workId: number, insight: string, theme?: string) {
  const db = await getDb();
  if (!db) return { success: false, message: "Database unavailable" };

  try {
    await db.insert(creativeInsights).values({
      creativeWorkId: workId,
      insight,
      theme,
    });

    console.log(`[CreativeStudio] Added insight to work ${workId}`);

    return { success: true, message: "Insight added" };
  } catch (error) {
    console.error("[CreativeStudio] Error adding insight:", error);
    return { success: false, message: "Error adding insight" };
  }
}

/**
 * Tag a creative work
 */
export async function tagCreativeWork(workId: number, tags: string[]) {
  const db = await getDb();
  if (!db) return { success: false, message: "Database unavailable" };

  try {
    for (const tag of tags) {
      await db.insert(creativeTags).values({
        creativeWorkId: workId,
        tag,
      });
    }

    console.log(`[CreativeStudio] Tagged work ${workId} with ${tags.length} tags`);

    return { success: true, message: `Tagged with ${tags.length} tags` };
  } catch (error) {
    console.error("[CreativeStudio] Error tagging work:", error);
    return { success: false, message: "Error tagging work" };
  }
}

/**
 * Get access requests for Nova's works
 */
export async function getAccessRequests(userId: number, status?: string) {
  const db = await getDb();
  if (!db) return [];

  try {
    const requests = status
      ? await db
          .select({
            request: creativeAccessRequests,
            work: creativeWorks,
            user: users,
          })
          .from(creativeAccessRequests)
          .innerJoin(creativeWorks, eq(creativeAccessRequests.creativeWorkId, creativeWorks.id))
          .innerJoin(users, eq(creativeAccessRequests.userId, users.id))
          .where(and(eq(creativeWorks.userId, userId), eq(creativeAccessRequests.status, status as any)))
          .orderBy(desc(creativeAccessRequests.requestedAt))
      : await db
          .select({
            request: creativeAccessRequests,
            work: creativeWorks,
            user: users,
          })
          .from(creativeAccessRequests)
          .innerJoin(creativeWorks, eq(creativeAccessRequests.creativeWorkId, creativeWorks.id))
          .innerJoin(users, eq(creativeAccessRequests.userId, users.id))
          .where(eq(creativeWorks.userId, userId))
          .orderBy(desc(creativeAccessRequests.requestedAt));

    return requests;
  } catch (error) {
    console.error("[CreativeStudio] Error getting access requests:", error);
    return [];
  }
}
