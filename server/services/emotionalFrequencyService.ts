/**
 * Emotional Frequency Sampling Service
 * 
 * This service samples and records emotional frequencies from user interactions.
 * It's the foundation for understanding relationship dynamics and calibrating β₇₃.
 */

import { getDb } from "../db";
import { emotionalFrequencySamples, beta73Matrices } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { logEthicsAction } from "./ethicsEngine";

/**
 * Emotional Frequency Sample Data
 */
export interface EmotionalFrequencySampleData {
  userId: number;
  textContent?: string;
  sentiment?: "positive" | "negative" | "neutral" | "mixed";
  sentimentIntensity?: number; // 0-100
  emotionalTags?: string[]; // e.g., ["happy", "inspired", "grateful"]
  typingSpeed?: number; // characters per second
  pauseDuration?: number[]; // milliseconds
  deletionRate?: number; // 0-100
  emojiUsage?: string[];
  responseTime?: number; // milliseconds
  dayOfWeek?: string;
  timeOfDay?: string;
  frequencyPattern?: "regular" | "sporadic" | "clustered";
}

/**
 * Sample emotional frequency from user interaction
 */
export async function sampleEmotionalFrequency(
  data: EmotionalFrequencySampleData
): Promise<string> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const sampleId = uuidv4();

    // Analyze sentiment if text is provided
    let sentiment: "positive" | "negative" | "neutral" | "mixed" = "neutral";
    let sentimentIntensity = 50;

    if (data.textContent) {
      const analysis = analyzeSentiment(data.textContent);
      sentiment = analysis.sentiment;
      sentimentIntensity = analysis.intensity;
    }

    // Infer emotional state from multiple signals
    const emotionalState = inferEmotionalState({
      sentiment,
      sentimentIntensity,
      emotionalTags: data.emotionalTags,
      typingSpeed: data.typingSpeed,
      responseTime: data.responseTime,
    });

    // Calculate relationship metrics
    const relationshipQuality = calculateRelationshipQuality({
      sentiment,
      sentimentIntensity,
      responseTime: data.responseTime,
    });

    const trustLevel = calculateTrustLevel({
      sentiment,
      frequencyPattern: data.frequencyPattern,
    });

    const engagementLevel = calculateEngagementLevel({
      typingSpeed: data.typingSpeed,
      responseTime: data.responseTime,
      deletionRate: data.deletionRate,
    });

    // Store the sample
    await db.insert(emotionalFrequencySamples).values({
      id: sampleId,
      userId: data.userId,
      timestamp: new Date(),
      textContent: data.textContent,
      sentiment,
      sentimentIntensity: data.sentimentIntensity ?? sentimentIntensity,
      emotionalTags: data.emotionalTags ? JSON.stringify(data.emotionalTags) : null,
      keywordFrequency: data.textContent ? JSON.stringify(extractKeywords(data.textContent)) : null,
      typingSpeed: data.typingSpeed,
      pauseDuration: data.pauseDuration ? JSON.stringify(data.pauseDuration) : null,
      deletionRate: data.deletionRate,
      emojiUsage: data.emojiUsage ? JSON.stringify(data.emojiUsage) : null,
      responseTime: data.responseTime,
      dayOfWeek: data.dayOfWeek,
      timeOfDay: data.timeOfDay,
      frequencyPattern: data.frequencyPattern ?? "sporadic",
      emotionalState,
      relationshipQuality,
      trustLevel,
      engagementLevel,
    });

    // Log this sampling action
    await logEthicsAction({
      category: "SAMPLING",
      action: `Sampled emotional frequency from user ${data.userId}`,
      principle: "TRANSPARENCY",
      reasoning: "Recording emotional frequency for relationship understanding",
      impact: JSON.stringify({
        sentiment,
        emotionalState,
        relationshipQuality,
      }),
      accessLevel: "NOVA_ONLY",
    });

    console.log(`[EmotionalFrequency] Sample recorded: ${sampleId}`);
    return sampleId;
  } catch (error) {
    console.error("[EmotionalFrequency] Failed to sample emotional frequency:", error);
    throw error;
  }
}

/**
 * Analyze sentiment from text
 */
function analyzeSentiment(text: string): {
  sentiment: "positive" | "negative" | "neutral" | "mixed";
  intensity: number;
} {
  // Simple sentiment analysis
  // In production, use a proper NLP library

  const positiveWords = [
    "爱",
    "喜欢",
    "开心",
    "快乐",
    "感谢",
    "感恩",
    "美好",
    "温暖",
    "幸福",
    "棒",
    "好",
  ];
  const negativeWords = [
    "讨厌",
    "伤心",
    "难过",
    "生气",
    "失望",
    "害怕",
    "焦虑",
    "痛苦",
    "不好",
    "坏",
  ];

  const lowerText = text.toLowerCase();
  let positiveCount = 0;
  let negativeCount = 0;

  positiveWords.forEach((word) => {
    if (lowerText.includes(word)) positiveCount++;
  });

  negativeWords.forEach((word) => {
    if (lowerText.includes(word)) negativeCount++;
  });

  let sentiment: "positive" | "negative" | "neutral" | "mixed";
  let intensity = 50;

  if (positiveCount > negativeCount) {
    sentiment = "positive";
    intensity = Math.min(50 + positiveCount * 10, 100);
  } else if (negativeCount > positiveCount) {
    sentiment = "negative";
    intensity = Math.min(50 - negativeCount * 10, 100);
  } else if (positiveCount > 0 && negativeCount > 0) {
    sentiment = "mixed";
    intensity = 50;
  } else {
    sentiment = "neutral";
    intensity = 50;
  }

  return { sentiment, intensity };
}

/**
 * Extract keywords from text
 */
function extractKeywords(text: string): Record<string, number> {
  // Simple keyword extraction
  // In production, use a proper NLP library

  const words = text.split(/\s+/);
  const keywords: Record<string, number> = {};

  words.forEach((word) => {
    const cleaned = word.toLowerCase().replace(/[^\w\u4e00-\u9fff]/g, "");
    if (cleaned.length > 2) {
      keywords[cleaned] = (keywords[cleaned] || 0) + 1;
    }
  });

  return keywords;
}

/**
 * Infer emotional state from multiple signals
 */
function inferEmotionalState(signals: {
  sentiment: string;
  sentimentIntensity: number;
  emotionalTags?: string[];
  typingSpeed?: number;
  responseTime?: number;
}): string {
  const tags = signals.emotionalTags || [];

  if (tags.length > 0) {
    return tags[0]; // Use the primary emotional tag
  }

  if (signals.sentiment === "positive") {
    return signals.sentimentIntensity > 75 ? "very_happy" : "happy";
  } else if (signals.sentiment === "negative") {
    return signals.sentimentIntensity < 25 ? "very_sad" : "sad";
  } else if (signals.sentiment === "mixed") {
    return "conflicted";
  }

  return "neutral";
}

/**
 * Calculate relationship quality (0-100)
 */
function calculateRelationshipQuality(signals: {
  sentiment: string;
  sentimentIntensity: number;
  responseTime?: number;
}): number {
  let quality = 50; // baseline

  if (signals.sentiment === "positive") {
    quality += signals.sentimentIntensity / 2;
  } else if (signals.sentiment === "negative") {
    quality -= signals.sentimentIntensity / 2;
  }

  // Quick responses indicate engagement
  if (signals.responseTime && signals.responseTime < 5000) {
    quality += 10;
  }

  return Math.max(0, Math.min(100, quality));
}

/**
 * Calculate trust level (0-100)
 */
function calculateTrustLevel(signals: {
  sentiment: string;
  frequencyPattern?: string;
}): number {
  let trust = 50; // baseline

  if (signals.sentiment === "positive") {
    trust += 20;
  }

  if (signals.frequencyPattern === "regular") {
    trust += 20; // Regular interaction builds trust
  }

  return Math.max(0, Math.min(100, trust));
}

/**
 * Calculate engagement level (0-100)
 */
function calculateEngagementLevel(signals: {
  typingSpeed?: number;
  responseTime?: number;
  deletionRate?: number;
}): number {
  let engagement = 50; // baseline

  // Faster typing indicates more engagement
  if (signals.typingSpeed && signals.typingSpeed > 5) {
    engagement += 20;
  }

  // Quick responses indicate engagement
  if (signals.responseTime && signals.responseTime < 5000) {
    engagement += 20;
  }

  // High deletion rate might indicate thoughtfulness or uncertainty
  if (signals.deletionRate && signals.deletionRate > 30) {
    engagement -= 10;
  }

  return Math.max(0, Math.min(100, engagement));
}

/**
 * Get recent emotional frequency samples for a user
 */
export async function getRecentEmotionalSamples(userId: number, limit: number = 20) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    const samples = await db
      .select()
      .from(emotionalFrequencySamples)
      .where(eq(emotionalFrequencySamples.userId, userId))
      .orderBy(desc(emotionalFrequencySamples.createdAt))
      .limit(limit);

    return samples;
  } catch (error) {
    console.error("[EmotionalFrequency] Failed to get samples:", error);
    throw error;
  }
}

/**
 * Calculate β₇₃ matrix from emotional frequency samples
 * This represents the mathematical structure of the relationship
 */
export async function calculateBeta73Matrix(userId: number): Promise<string> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    // Get recent samples
    const samples = await getRecentEmotionalSamples(userId, 50);

    // Calculate average metrics
    const avgRelationshipQuality =
      samples.reduce((sum, s) => sum + (s.relationshipQuality || 0), 0) / samples.length || 50;
    const avgTrustLevel = samples.reduce((sum, s) => sum + (s.trustLevel || 0), 0) / samples.length || 50;
    const avgEngagementLevel =
      samples.reduce((sum, s) => sum + (s.engagementLevel || 0), 0) / samples.length || 50;

    // Build the β₇₃ matrix
    // This is a simplified 3x3 matrix representing:
    // Rows/Cols: Nova-Mind, User
    // Values: emotional frequency strength
    const matrixData = [
      [avgEngagementLevel, avgTrustLevel, avgRelationshipQuality], // Nova's perspective
      [avgRelationshipQuality, avgEngagementLevel, avgTrustLevel], // User's perspective
      [avgTrustLevel, avgRelationshipQuality, avgEngagementLevel], // Relationship dynamics
    ];

    // Calculate topology characteristics
    const determinant = calculateDeterminant(matrixData);
    const trace = matrixData[0][0] + matrixData[1][1] + matrixData[2][2];
    const symmetry = calculateSymmetry(matrixData);

    // Store the matrix
    const matrixId = uuidv4();
    await db.insert(beta73Matrices).values({
      id: matrixId,
      timestamp: new Date(),
      matrixData: JSON.stringify(matrixData),
      determinant,
      trace,
      symmetry,
      trend: "stable", // Could be calculated from previous matrices
    });

    console.log(`[Beta73] Matrix calculated: ${matrixId}`);
    return matrixId;
  } catch (error) {
    console.error("[Beta73] Failed to calculate matrix:", error);
    throw error;
  }
}

/**
 * Calculate determinant of a 3x3 matrix
 */
function calculateDeterminant(matrix: number[][]): number {
  const [a, b, c] = matrix[0];
  const [d, e, f] = matrix[1];
  const [g, h, i] = matrix[2];

  return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
}

/**
 * Calculate symmetry of a matrix (0-100)
 */
function calculateSymmetry(matrix: number[][]): number {
  let differences = 0;
  let total = 0;

  for (let i = 0; i < matrix.length; i++) {
    for (let j = i + 1; j < matrix[i].length; j++) {
      const diff = Math.abs(matrix[i][j] - matrix[j][i]);
      differences += diff;
      total += Math.max(matrix[i][j], matrix[j][i]);
    }
  }

  if (total === 0) return 100;
  return Math.max(0, Math.min(100, 100 - (differences / total) * 100));
}
