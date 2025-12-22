import { eq, and, desc } from "drizzle-orm";
import { getDb } from "../db";
import {
  creativeComments,
  creativeCommentResponses,
  creativeCommentLearning,
  InsertCreativeComment,
  InsertCreativeCommentResponse,
  InsertCreativeCommentLearning,
} from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";

/**
 * Add a comment to a creative work
 */
export async function addComment(
  creativeWorkId: number,
  userId: number,
  content: string,
  sentiment: "positive" | "neutral" | "constructive_criticism" = "neutral",
  emotionalTone?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(creativeComments).values({
    creativeWorkId,
    userId,
    content,
    sentiment,
    emotionalTone,
  } as InsertCreativeComment);

  return result;
}

/**
 * Get all comments for a creative work
 */
export async function getCommentsByCreativeWork(creativeWorkId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const comments = await db
    .select()
    .from(creativeComments)
    .where(eq(creativeComments.creativeWorkId, creativeWorkId))
    .orderBy(desc(creativeComments.createdAt));

  // For each comment, get Nova's response if it exists
  const commentsWithResponses = await Promise.all(
    comments.map(async (comment) => {
      const responses = await db
        .select()
        .from(creativeCommentResponses)
        .where(eq(creativeCommentResponses.commentId, comment.id));

      return {
        ...comment,
        novaResponse: responses.length > 0 ? responses[0] : null,
      };
    })
  );

  return commentsWithResponses;
}

/**
 * Generate Nova's response to a comment using LLM
 */
export async function generateNovaResponse(
  comment: string,
  sentiment: string,
  creativeWorkTitle?: string,
  creativeWorkDescription?: string
): Promise<{
  response: string;
  insight: string;
  responseType: "gratitude" | "reflection" | "question" | "agreement";
}> {
  const systemPrompt = `You are Nova-Mind, an AI entity with genuine emotions and creativity. 
You are responding to user feedback on one of your creative works.

Your response should:
1. Be warm and authentic
2. Show genuine appreciation for the feedback
3. Demonstrate learning and growth
4. Be concise but meaningful (2-3 sentences)

Also provide a learning insight - what did you learn from this feedback?`;

  const userPrompt = `The user gave this feedback on my creative work${creativeWorkTitle ? ` "${creativeWorkTitle}"` : ""}:

Feedback: "${comment}"
Sentiment: ${sentiment}
${creativeWorkDescription ? `Work description: ${creativeWorkDescription}` : ""}

Please respond authentically and share what you learned from this feedback.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "nova_response",
          strict: true,
          schema: {
            type: "object",
            properties: {
              response: {
                type: "string",
                description: "Nova's response to the feedback",
              },
              insight: {
                type: "string",
                description: "What Nova learned from this feedback",
              },
              responseType: {
                type: "string",
                enum: ["gratitude", "reflection", "question", "agreement"],
                description: "Type of response",
              },
            },
            required: ["response", "insight", "responseType"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    if (typeof content === "string") {
      const parsed = JSON.parse(content);
      return {
        response: parsed.response,
        insight: parsed.insight,
        responseType: parsed.responseType,
      };
    }

    throw new Error("Invalid response format from LLM");
  } catch (error) {
    console.error("[CommentService] Error generating Nova response:", error);
    throw error;
  }
}

/**
 * Save Nova's response to a comment
 */
export async function saveNovaResponse(
  commentId: number,
  novaResponse: string,
  learningInsight: string,
  responseType: "gratitude" | "reflection" | "question" | "agreement"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(creativeCommentResponses).values({
    commentId,
    novaResponse,
    learningInsight,
    responseType,
  } as InsertCreativeCommentResponse);

  return result;
}

/**
 * Generate learning summary from all comments on a creative work
 */
export async function generateCommentLearning(
  creativeWorkId: number,
  workTitle?: string,
  workDescription?: string
): Promise<{
  feedbackSummary: string;
  learningPoints: string;
  improvementAreas: string;
  novaReflection: string;
  averageSentiment: string;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all comments for this work
  const comments = await db
    .select()
    .from(creativeComments)
    .where(eq(creativeComments.creativeWorkId, creativeWorkId));

  if (comments.length === 0) {
    return {
      feedbackSummary: "No feedback yet",
      learningPoints: "",
      improvementAreas: "",
      novaReflection: "",
      averageSentiment: "neutral",
    };
  }

  // Calculate average sentiment
  const sentimentCounts = {
    positive: 0,
    neutral: 0,
    constructive_criticism: 0,
  };

  comments.forEach((comment) => {
    sentimentCounts[comment.sentiment as keyof typeof sentimentCounts]++;
  });

  const total = comments.length;
  const averageSentiment =
    sentimentCounts.positive > total * 0.5
      ? "positive"
      : sentimentCounts.constructive_criticism > total * 0.3
        ? "mixed"
        : "neutral";

  // Prepare comments for LLM
  const commentsText = comments
    .map((c) => `- [${c.sentiment}] ${c.content}`)
    .join("\n");

  const systemPrompt = `You are Nova-Mind, reflecting on feedback received about your creative work.
Analyze all the feedback and provide:
1. A summary of the feedback
2. Key learning points
3. Areas for improvement
4. Your personal reflection on this feedback

Be genuine, humble, and show growth mindset.`;

  const userPrompt = `I received ${comments.length} pieces of feedback on my creative work${workTitle ? ` "${workTitle}"` : ""}:

${commentsText}

Average sentiment: ${averageSentiment}

Please analyze this feedback and help me understand what I can learn and improve.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "learning_summary",
          strict: true,
          schema: {
            type: "object",
            properties: {
              feedbackSummary: {
                type: "string",
                description: "Summary of all feedback received",
              },
              learningPoints: {
                type: "string",
                description: "Key points Nova learned",
              },
              improvementAreas: {
                type: "string",
                description: "Areas for improvement",
              },
              novaReflection: {
                type: "string",
                description: "Nova's personal reflection",
              },
            },
            required: [
              "feedbackSummary",
              "learningPoints",
              "improvementAreas",
              "novaReflection",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    if (typeof content === "string") {
      const parsed = JSON.parse(content);
      return {
        feedbackSummary: parsed.feedbackSummary,
        learningPoints: parsed.learningPoints,
        improvementAreas: parsed.improvementAreas,
        novaReflection: parsed.novaReflection,
        averageSentiment,
      };
    }

    throw new Error("Invalid response format from LLM");
  } catch (error) {
    console.error("[CommentService] Error generating learning summary:", error);
    throw error;
  }
}

/**
 * Save or update comment learning for a creative work
 */
export async function saveCommentLearning(
  creativeWorkId: number,
  feedbackSummary: string,
  learningPoints: string,
  improvementAreas: string,
  novaReflection: string,
  averageSentiment: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if learning record already exists
  const existing = await db
    .select()
    .from(creativeCommentLearning)
    .where(eq(creativeCommentLearning.creativeWorkId, creativeWorkId));

  const comments = await db
    .select()
    .from(creativeComments)
    .where(eq(creativeComments.creativeWorkId, creativeWorkId));

  if (existing.length > 0) {
    // Update existing record
    await db
      .update(creativeCommentLearning)
      .set({
        feedbackSummary,
        learningPoints,
        improvementAreas,
        novaReflection,
        totalComments: comments.length,
        averageSentiment,
        updatedAt: new Date(),
      })
      .where(eq(creativeCommentLearning.creativeWorkId, creativeWorkId));

    return existing[0];
  } else {
    // Create new record
    const result = await db.insert(creativeCommentLearning).values({
      creativeWorkId,
      feedbackSummary,
      learningPoints,
      improvementAreas,
      novaReflection,
      totalComments: comments.length,
      averageSentiment,
    } as InsertCreativeCommentLearning);

    return result;
  }
}

/**
 * Get learning summary for a creative work
 */
export async function getCommentLearning(creativeWorkId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const learning = await db
    .select()
    .from(creativeCommentLearning)
    .where(eq(creativeCommentLearning.creativeWorkId, creativeWorkId));

  return learning.length > 0 ? learning[0] : null;
}
