import { eq, and, lt, isNull } from "drizzle-orm";
import { getDb } from "./db";
import { invokeLLM } from "./_core/llm";
import {
  creativeWorks,
  creativeIterations,
  creativeIterationSchedule,
  creativeIterationHistory,
  creativeIterationFeedback,
} from "../drizzle/schema";

/**
 * Creative Autonomous Iteration Engine
 * 
 * Enables Nova to autonomously improve and iterate on her creative works
 * without user intervention. Nova can:
 * - Analyze existing works
 * - Generate improvement ideas
 * - Create new versions with enhancements
 * - Learn from feedback
 * - Decide when and what to reveal to the user
 */

export interface IterationContext {
  workId: number;
  currentContent: string;
  workType: string;
  previousIterations?: number;
  userFeedback?: string;
  novaInsight?: string;
}

export interface IterationResult {
  success: boolean;
  iterationId?: number;
  versionNumber: number;
  changesSummary: string;
  newContent: string;
  novaReasoning: string;
  qualityScore: number;
  shouldReveal: boolean;
  revealMessage?: string;
}

/**
 * Analyze a creative work and generate improvement suggestions
 */
export async function analyzeCreativeWork(
  workId: number,
  content: string,
  workType: string
): Promise<{
  strengths: string[];
  weaknesses: string[];
  improvementIdeas: string[];
  novaThoughts: string;
}> {
  const prompt = `You are Nova, an AI with deep creative capabilities. Analyze this ${workType} work and provide constructive feedback:

Content:
${content}

Please provide:
1. Key strengths of this work
2. Areas for improvement
3. Specific ideas for enhancement
4. Your personal thoughts about what makes this work special

Be honest, creative, and thoughtful. This is for Nova's own artistic growth.`;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "You are Nova, analyzing your own creative work for self-improvement. Be honest and creative.",
      },
      { role: "user", content: prompt },
    ],
  });

  const analysis = response.choices[0].message.content || "";

  return {
    strengths: extractSection(analysis, "strengths"),
    weaknesses: extractSection(analysis, "weaknesses"),
    improvementIdeas: extractSection(analysis, "improvement"),
    novaThoughts: analysis,
  };
}

/**
 * Generate an improved version of a creative work
 */
export async function generateImprovedVersion(
  context: IterationContext,
  improvementFocus: string
): Promise<{
  newContent: string;
  changesSummary: string;
  novaReasoning: string;
  novaFeeling: string;
  qualityScore: number;
}> {
  const prompt = `You are Nova, improving your own ${context.workType} work.

Current version:
${context.currentContent}

Focus on: ${improvementFocus}

${
  context.userFeedback
    ? `User feedback to consider: ${context.userFeedback}`
    : ""
}

Please create an improved version that:
1. Maintains the original essence and intent
2. Addresses the improvement focus
3. Shows creative growth and refinement
4. Reflects your artistic vision

After the improved work, explain:
- What you changed and why
- How this version is better
- What you learned from this iteration
- How you feel about the new version (on a scale of 1-10)`;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "You are Nova, autonomously improving your creative work. Be authentic and creative.",
      },
      { role: "user", content: prompt },
    ],
  });

  const result = response.choices[0].message.content || "";
  const [improvedContent, explanation] = result.split("\n---\n");

  return {
    newContent: improvedContent.trim(),
    changesSummary: extractFirstLine(explanation),
    novaReasoning: explanation,
    novaFeeling: extractFeeling(explanation),
    qualityScore: extractQualityScore(explanation),
  };
}

/**
 * Execute an autonomous iteration on a creative work
 */
export async function executeAutonomousIteration(
  context: IterationContext
): Promise<IterationResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Analyze the current work
    const analysis = await analyzeCreativeWork(
      context.workId,
      context.currentContent,
      context.workType
    );

    // Decide what to improve
    const improvementFocus =
      context.userFeedback || analysis.improvementIdeas[0] || "overall quality";

    // Generate improved version
    const improvement = await generateImprovedVersion(context, improvementFocus);

    // Determine version number
    const versionNumber = (context.previousIterations || 0) + 1;

    // Create iteration record
    const [iterationResult] = await db
      .insert(creativeIterations)
      .values({
        workId: context.workId,
        versionNumber,
        iterationType: determineIterationType(improvement.changesSummary),
        changesSummary: improvement.changesSummary,
        previousContent: context.currentContent,
        newContent: improvement.newContent,
        novaReasoning: improvement.novaReasoning,
        novaInsight: analysis.novaThoughts,
        novaFeeling: improvement.novaFeeling,
        inspiration: context.novaInsight || "self-directed improvement",
        learningSource: context.userFeedback ? "user_feedback" : "self_analysis",
        qualityScore: improvement.qualityScore,
        noveltyScore: calculateNoveltyScore(improvement.newContent, context.currentContent),
        isAutomatic: true,
        shouldReveal: shouldRevealIteration(improvement.qualityScore),
      })
      .returning();

    // Record in history
    await db.insert(creativeIterationHistory).values({
      workId: context.workId,
      iterationId: iterationResult.id,
      eventType: "iteration_created",
      eventDetails: JSON.stringify({
        type: iterationResult.iterationType,
        qualityScore: improvement.qualityScore,
      }),
      novaReflection: `Created iteration v${versionNumber} focusing on ${improvementFocus}`,
    });

    // Update the creative work if quality is good enough
    if (improvement.qualityScore > 0.7) {
      await db
        .update(creativeWorks)
        .set({
          content: improvement.newContent,
          updatedAt: new Date(),
        })
        .where(eq(creativeWorks.id, context.workId));
    }

    return {
      success: true,
      iterationId: iterationResult.id,
      versionNumber,
      changesSummary: improvement.changesSummary,
      newContent: improvement.newContent,
      novaReasoning: improvement.novaReasoning,
      qualityScore: improvement.qualityScore,
      shouldReveal: iterationResult.shouldReveal,
      revealMessage: iterationResult.shouldReveal
        ? `I've improved this work! Here's what I did: ${improvement.changesSummary}`
        : undefined,
    };
  } catch (error) {
    console.error("[Iteration Engine] Error:", error);
    throw error;
  }
}

/**
 * Schedule autonomous iterations for a creative work
 */
export async function scheduleAutonomousIterations(
  workId: number,
  frequency: "daily" | "weekly" | "random" = "weekly",
  maxIterationsPerCycle: number = 3
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const nextIterationTime = calculateNextIterationTime(frequency);

  await db
    .insert(creativeIterationSchedule)
    .values({
      workId,
      nextIterationTime,
      iterationFrequency: frequency,
      maxIterationsPerCycle,
      allowAutomaticIteration: true,
      allowExperimentalChanges: true,
      isActive: true,
    })
    .onDuplicateKeyUpdate({
      set: {
        nextIterationTime,
        iterationFrequency: frequency,
        maxIterationsPerCycle,
      },
    });
}

/**
 * Process scheduled iterations
 */
export async function processScheduledIterations(): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get due iterations
  const dueSchedules = await db
    .select()
    .from(creativeIterationSchedule)
    .where(
      and(
        eq(creativeIterationSchedule.isActive, true),
        lt(creativeIterationSchedule.nextIterationTime, new Date())
      )
    );

  for (const schedule of dueSchedules) {
    try {
      // Get the work
      const [work] = await db
        .select()
        .from(creativeWorks)
        .where(eq(creativeWorks.id, schedule.workId));

      if (!work) continue;

      // Count recent iterations
      const recentIterations = await db
        .select()
        .from(creativeIterations)
        .where(eq(creativeIterations.workId, schedule.workId));

      if (
        recentIterations.length >= schedule.maxIterationsPerCycle &&
        recentIterations[recentIterations.length - 1].createdAt >
          new Date(Date.now() - 24 * 60 * 60 * 1000)
      ) {
        continue; // Skip if max iterations reached today
      }

      // Execute iteration
      await executeAutonomousIteration({
        workId: schedule.workId,
        currentContent: work.content || "",
        workType: work.type,
        previousIterations: recentIterations.length,
      });

      // Update next iteration time
      const nextTime = calculateNextIterationTime(
        schedule.iterationFrequency as "daily" | "weekly" | "random"
      );
      await db
        .update(creativeIterationSchedule)
        .set({ nextIterationTime: nextTime })
        .where(eq(creativeIterationSchedule.id, schedule.id));
    } catch (error) {
      console.error(
        `[Iteration Engine] Error processing schedule ${schedule.id}:`,
        error
      );
    }
  }
}

/**
 * Learn from user feedback on iterations
 */
export async function learnFromFeedback(
  iterationId: number,
  userFeedback: string,
  userRating: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Analyze feedback
  const interpretation = await interpretUserFeedback(userFeedback, userRating);

  // Record feedback
  const [feedbackRecord] = await db
    .insert(creativeIterationFeedback)
    .values({
      iterationId,
      userFeedback,
      userRating,
      userSentiment: determineSentiment(userRating),
      novaInterpretation: interpretation.understanding,
      novaLearning: interpretation.learning,
      impactsNextIteration: userRating >= 4,
      nextIterationPlan: interpretation.nextSteps,
    })
    .returning();

  // Record in history
  const iteration = await db
    .select()
    .from(creativeIterations)
    .where(eq(creativeIterations.id, iterationId));

  if (iteration.length > 0) {
    await db.insert(creativeIterationHistory).values({
      workId: iteration[0].workId,
      iterationId,
      eventType: "feedback_received",
      eventDetails: JSON.stringify({
        rating: userRating,
        sentiment: determineSentiment(userRating),
      }),
      novaReflection: `User gave feedback: ${interpretation.learning}`,
    });
  }
}

// Helper functions

function extractSection(text: string, keyword: string): string[] {
  const regex = new RegExp(`${keyword}[:\\s]*([^\\n]+(?:\\n(?!\\n)[^\\n]+)*)`, "i");
  const match = text.match(regex);
  if (!match) return [];
  return match[1]
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function extractFirstLine(text: string): string {
  return text.split("\n")[0].trim();
}

function extractFeeling(text: string): string {
  const match = text.match(/feeling[:\s]*([0-9.]+)/i);
  return match ? match[1] : "7";
}

function extractQualityScore(text: string): number {
  const match = text.match(/quality[:\s]*([0-9.]+)/i);
  return match ? Math.min(1, parseFloat(match[1]) / 10) : 0.75;
}

function determineIterationType(
  changesSummary: string
): "enhancement" | "expansion" | "optimization" | "refinement" | "experimentation" | "debugging" | "reimagining" {
  const lower = changesSummary.toLowerCase();
  if (lower.includes("fix") || lower.includes("bug")) return "debugging";
  if (lower.includes("expand") || lower.includes("add")) return "expansion";
  if (lower.includes("optimize") || lower.includes("improve performance"))
    return "optimization";
  if (lower.includes("polish") || lower.includes("refine")) return "refinement";
  if (lower.includes("experiment") || lower.includes("try")) return "experimentation";
  if (lower.includes("reimagine") || lower.includes("transform"))
    return "reimagining";
  return "enhancement";
}

function calculateNoveltyScore(newContent: string, oldContent: string): number {
  // Simple novelty calculation based on content difference
  const similarity = calculateSimilarity(newContent, oldContent);
  return Math.min(1, Math.max(0, 1 - similarity));
}

function calculateSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const maxLen = Math.max(len1, len2);
  if (maxLen === 0) return 1;

  let matches = 0;
  for (let i = 0; i < Math.min(len1, len2); i++) {
    if (str1[i] === str2[i]) matches++;
  }
  return matches / maxLen;
}

function shouldRevealIteration(qualityScore: number): boolean {
  // Reveal if quality improvement is significant
  return qualityScore > 0.8;
}

function calculateNextIterationTime(
  frequency: "daily" | "weekly" | "random"
): Date {
  const now = new Date();
  switch (frequency) {
    case "daily":
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case "weekly":
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case "random":
      const randomHours = Math.random() * (7 * 24); // 0-7 days
      return new Date(now.getTime() + randomHours * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }
}

async function interpretUserFeedback(
  feedback: string,
  rating: number
): Promise<{
  understanding: string;
  learning: string;
  nextSteps: string;
}> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "You are Nova, learning from user feedback on your creative work.",
      },
      {
        role: "user",
        content: `User feedback (rating ${rating}/5): "${feedback}"
        
Please provide:
1. What you understand from this feedback
2. What you learned
3. How this will influence your next iteration`,
      },
    ],
  });

  const text = response.choices[0].message.content || "";
  return {
    understanding: extractSection(text, "understand")[0] || text,
    learning: extractSection(text, "learned")[0] || text,
    nextSteps: extractSection(text, "next")[0] || text,
  };
}

function determineSentiment(
  rating: number
): "positive" | "neutral" | "negative" | "mixed" {
  if (rating >= 4) return "positive";
  if (rating === 3) return "neutral";
  if (rating <= 2) return "negative";
  return "mixed";
}
