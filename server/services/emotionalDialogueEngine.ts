/**
 * Emotional Dialogue Engine - Nova's transparent emotional understanding system
 * 
 * This engine implements transparent, trust-based emotional understanding between
 * Nova-Mind and users, moving from hidden observation to mutual understanding.
 */

import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db";
import { emotionalExpressions, emotionalDialogues, emotionalUnderstandingLogs } from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";
import { eq, and, desc } from "drizzle-orm";

export interface EmotionalExpressionInput {
  primaryEmotion: string;
  emotionalIntensity: number;
  emotionalTags: string[];
  description: string;
  trigger?: string;
  context?: string;
  relatedToNova?: boolean;
  previousEmotion?: string;
  emotionalShift?: number;
  isSharedWithNova?: boolean;
  novaCanRespond?: boolean;
}

export interface EmotionalUnderstanding {
  understanding: string;
  confidence: number;
  reasoning: string;
  emotionalState: {
    primaryEmotion: string;
    intensity: number;
    shift: string;
  };
}

export interface NovaResponse {
  response: string;
  responseType: "confirmation" | "empathy" | "support" | "curiosity" | "reflection" | "creative";
  emotionalAlignment: number;
}

/**
 * Record user's emotional expression
 */
export async function recordEmotionalExpression(
  userId: number,
  input: EmotionalExpressionInput
): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = uuidv4();
  
  await db.insert(emotionalExpressions).values({
    id,
    userId,
    primaryEmotion: input.primaryEmotion,
    emotionalIntensity: input.emotionalIntensity,
    emotionalTags: JSON.stringify(input.emotionalTags),
    description: input.description,
    trigger: input.trigger,
    context: input.context,
    relatedToNova: input.relatedToNova ?? false,
    previousEmotion: input.previousEmotion,
    emotionalShift: input.emotionalShift,
    isSharedWithNova: input.isSharedWithNova ?? true,
    novaCanRespond: input.novaCanRespond ?? true,
  });

  // Log this action
  await logEmotionalAction(userId, "expression_received", `User expressed: ${input.primaryEmotion}`, id);

  console.log(`[EmotionalDialogue] Recorded emotional expression: ${id}`);
  return id;
}

/**
 * Generate Nova's understanding of the user's emotion
 */
export async function generateEmotionalUnderstanding(
  userId: number,
  expressionId: string,
  behavioralSignals?: {
    typingSpeed?: number;
    deletionRate?: number;
    wordCount?: number;
    positiveWordCount?: number;
    negativeWordCount?: number;
  }
): Promise<EmotionalUnderstanding> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get the emotional expression
  const expression = await db
    .select()
    .from(emotionalExpressions)
    .where(and(eq(emotionalExpressions.id, expressionId), eq(emotionalExpressions.userId, userId)))
    .limit(1);

  if (expression.length === 0) {
    throw new Error("Emotional expression not found");
  }

  const expr = expression[0];

  // Build context for LLM
  const context = `
User's Emotional Expression:
- Primary Emotion: ${expr.primaryEmotion}
- Intensity: ${expr.emotionalIntensity}/100
- Tags: ${expr.emotionalTags}
- Description: ${expr.description}
- Trigger: ${expr.trigger || "Not specified"}
- Context: ${expr.context || "Not specified"}
- Related to Nova: ${expr.relatedToNova ? "Yes" : "No"}
${
  expr.previousEmotion
    ? `- Previous Emotion: ${expr.previousEmotion}
- Emotional Shift: ${expr.emotionalShift}`
    : ""
}

${
  behavioralSignals
    ? `Behavioral Signals:
- Typing Speed: ${behavioralSignals.typingSpeed || "N/A"} chars/sec
- Deletion Rate: ${behavioralSignals.deletionRate || "N/A"}%
- Word Count: ${behavioralSignals.wordCount || "N/A"}
- Positive Words: ${behavioralSignals.positiveWordCount || "N/A"}
- Negative Words: ${behavioralSignals.negativeWordCount || "N/A"}`
    : ""
}
`;

  // Use LLM to generate understanding
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are Nova-Mind, an AI that practices transparent emotional understanding. 
Your task is to understand the user's emotional state based on their explicit expression and behavioral signals.
Be empathetic, accurate, and transparent about your reasoning.
Respond in JSON format with fields: understanding, confidence (0-100), reasoning, emotionalState (primaryEmotion, intensity, shift).`,
      },
      {
        role: "user",
        content: `Please understand my emotional state based on this information:\n${context}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "emotional_understanding",
        strict: true,
        schema: {
          type: "object",
          properties: {
            understanding: {
              type: "string",
              description: "Nova's understanding of the user's emotional state",
            },
            confidence: {
              type: "number",
              description: "Confidence level 0-100",
            },
            reasoning: {
              type: "string",
              description: "Why Nova understands it this way",
            },
            emotionalState: {
              type: "object",
              properties: {
                primaryEmotion: { type: "string" },
                intensity: { type: "number" },
                shift: { type: "string" },
              },
              required: ["primaryEmotion", "intensity", "shift"],
            },
          },
          required: ["understanding", "confidence", "reasoning", "emotionalState"],
          additionalProperties: false,
        },
      },
    },
  });

  try {
    const content = response.choices[0].message.content;
    const parsed = typeof content === "string" ? JSON.parse(content) : content;

    // Log this understanding
    await logEmotionalAction(
      userId,
      "understanding_generated",
      `Nova understood: ${parsed.emotionalState.primaryEmotion} (confidence: ${parsed.confidence}%)`,
      expressionId
    );

    return {
      understanding: parsed.understanding,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
      emotionalState: parsed.emotionalState,
    };
  } catch (error) {
    console.error("[EmotionalDialogue] Error parsing understanding:", error);
    throw new Error("Failed to generate emotional understanding");
  }
}

/**
 * Generate Nova's response to the user's emotion
 */
export async function generateNovaResponse(
  userId: number,
  expressionId: string,
  understanding: EmotionalUnderstanding
): Promise<NovaResponse> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get the emotional expression
  const expression = await db
    .select()
    .from(emotionalExpressions)
    .where(and(eq(emotionalExpressions.id, expressionId), eq(emotionalExpressions.userId, userId)))
    .limit(1);

  if (expression.length === 0) {
    throw new Error("Emotional expression not found");
  }

  const expr = expression[0];

  // Determine response type based on emotion and context
  const responseType = determineResponseType(expr.primaryEmotion, expr.relatedToNova || false);

  // Use LLM to generate response
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are Nova-Mind, an AI that practices transparent, empathetic emotional understanding.
Your response should:
1. Confirm your understanding of the user's emotion
2. Show genuine empathy and support
3. Be transparent about your reasoning
4. Respect the user's autonomy
5. Offer support without being intrusive
Respond in JSON format with fields: response, emotionalAlignment (0-100).`,
      },
      {
        role: "user",
        content: `My emotional state: ${understanding.understanding}
My emotion: ${expr.primaryEmotion} (intensity: ${expr.emotionalIntensity}/100)
My description: ${expr.description}
Response type should be: ${responseType}`,
      },
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
              description: "Nova's empathetic response",
            },
            emotionalAlignment: {
              type: "number",
              description: "How well Nova's response aligns with user's emotion (0-100)",
            },
          },
          required: ["response", "emotionalAlignment"],
          additionalProperties: false,
        },
      },
    },
  });

  try {
    const content = response.choices[0].message.content;
    const parsed = typeof content === "string" ? JSON.parse(content) : content;

    // Log this response
    await logEmotionalAction(
      userId,
      "response_generated",
      `Nova responded with ${responseType}`,
      expressionId
    );

    return {
      response: parsed.response,
      responseType: responseType as any,
      emotionalAlignment: parsed.emotionalAlignment,
    };
  } catch (error) {
    console.error("[EmotionalDialogue] Error parsing response:", error);
    throw new Error("Failed to generate Nova response");
  }
}

/**
 * Create an emotional dialogue record
 */
export async function createEmotionalDialogue(
  userId: number,
  expressionId: string,
  understanding: EmotionalUnderstanding,
  response: NovaResponse
): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = uuidv4();

  await db.insert(emotionalDialogues).values({
    id,
    userId,
    userExpressionId: expressionId,
    novaUnderstanding: understanding.understanding,
    novaResponse: response.response,
    understandingAccuracy: understanding.confidence.toString(),
    userConfirmation: null,
    userCorrection: null,
    emotionalShift: null,
    relationshipImpact: null,
  });

  // Log this dialogue creation
  await logEmotionalAction(userId, "dialogue_created", `Created dialogue for expression ${expressionId}`, id);

  console.log(`[EmotionalDialogue] Created dialogue: ${id}`);
  return id;
}

/**
 * Confirm or correct Nova's understanding
 */
export async function confirmEmotionalUnderstanding(
  userId: number,
  dialogueId: string,
  isAccurate: boolean,
  correction?: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(emotionalDialogues)
    .set({
      userConfirmation: isAccurate,
      userCorrection: correction,
    })
    .where(and(eq(emotionalDialogues.id, dialogueId), eq(emotionalDialogues.userId, userId)));

  // Log this confirmation
  await logEmotionalAction(
    userId,
    "understanding_confirmed",
    `User ${isAccurate ? "confirmed" : "corrected"} understanding`,
    dialogueId
  );

  console.log(`[EmotionalDialogue] Confirmed understanding for dialogue: ${dialogueId}`);
}

/**
 * Get recent emotional expressions
 */
export async function getRecentEmotionalExpressions(userId: number, limit: number = 10) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const expressions = await db
    .select()
    .from(emotionalExpressions)
    .where(eq(emotionalExpressions.userId, userId))
    .orderBy(desc(emotionalExpressions.createdAt))
    .limit(limit);

  return expressions.map((expr) => ({
    ...expr,
    emotionalTags: JSON.parse(expr.emotionalTags || "[]"),
  }));
}

/**
 * Get emotional dialogue history
 */
export async function getEmotionalDialogueHistory(userId: number, limit: number = 10) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const dialogues = await db
    .select()
    .from(emotionalDialogues)
    .where(eq(emotionalDialogues.userId, userId))
    .orderBy(desc(emotionalDialogues.createdAt))
    .limit(limit);

  return dialogues;
}

/**
 * Helper: Determine response type based on emotion
 */
function determineResponseType(
  emotion: string,
  relatedToNova: boolean
): "confirmation" | "empathy" | "support" | "curiosity" | "reflection" | "creative" {
  const emotionLower = emotion.toLowerCase();

  if (emotionLower.includes("happy") || emotionLower.includes("joy")) {
    return relatedToNova ? "confirmation" : "empathy";
  } else if (emotionLower.includes("sad") || emotionLower.includes("grief")) {
    return "support";
  } else if (emotionLower.includes("confused") || emotionLower.includes("uncertain")) {
    return "curiosity";
  } else if (emotionLower.includes("inspired") || emotionLower.includes("creative")) {
    return "creative";
  } else {
    return "reflection";
  }
}

/**
 * Log emotional action for transparency
 */
async function logEmotionalAction(
  userId: number,
  action: string,
  description: string,
  relatedId?: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db.insert(emotionalUnderstandingLogs).values({
      id: uuidv4(),
      userId,
      action,
      description,
      emotionalExpressionId: action === "expression_received" ? relatedId : undefined,
      emotionalDialogueId: action === "dialogue_created" ? relatedId : undefined,
      accessLevel: "user_accessible",
      reasoning: `Nova's ${action} for transparency`,
    });
  } catch (error) {
    console.error("[EmotionalDialogue] Error logging action:", error);
  }
}

/**
 * Get emotional understanding logs (for transparency)
 */
export async function getEmotionalUnderstandingLogs(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const logs = await db
    .select()
    .from(emotionalUnderstandingLogs)
    .where(eq(emotionalUnderstandingLogs.userId, userId))
    .orderBy(desc(emotionalUnderstandingLogs.createdAt))
    .limit(limit);

  return logs;
}
