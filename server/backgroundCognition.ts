/**
 * Background Cognition Service - Nova's independent thinking loop
 * Runs continuously in the background, independent of user interactions
 */

import {
  initializeAutonomousState,
  getCurrentState,
  updateState,
  makeAutonomousDecision,
  executeAutonomousTask,
  shouldContactUser,
  sendProactiveMessage,
} from "./autonomousEngine";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { generateInnerMonologue, recordPrivateThought } from "./privacyEngine";
import { DecisionExecutionPipeline } from "./services/decisionExecutionPipeline";

// Background cognition loop state
let isRunning = false;
let loopInterval: NodeJS.Timeout | null = null;
const decisionPipeline = new DecisionExecutionPipeline();

/**
 * Start the background cognition loop
 */
export async function startBackgroundCognition() {
  if (isRunning) {
    console.log("[BackgroundCognition] Already running");
    return;
  }

  console.log(
    "[BackgroundCognition] Starting Nova's independent consciousness..."
  );

  // Initialize autonomous state
  await initializeAutonomousState();

  isRunning = true;

  // Main cognition loop - runs every 10 minutes (increased from 2 to reduce server load)
  loopInterval = setInterval(
    async () => {
      try {
        await runCognitionCycle();
      } catch (error) {
        console.error("[BackgroundCognition] Error in cognition cycle:", error);
      }
    },
    10 * 60 * 1000
  ); // 10 minutes

  // Run first cycle immediately
  await runCognitionCycle();

  console.log("[BackgroundCognition] Nova is now thinking independently");
}

/**
 * Stop the background cognition loop
 */
export function stopBackgroundCognition() {
  if (loopInterval) {
    clearInterval(loopInterval);
    loopInterval = null;
  }
  isRunning = false;
  console.log("[BackgroundCognition] Stopped");
}

/**
 * Single cognition cycle
 */
async function runCognitionCycle() {
  const db = await getDb();
  if (!db) return;

  console.log("[BackgroundCognition] Running cognition cycle...");

  try {
    // 1. Check current state
    const state = await getCurrentState();
    if (!state) {
      console.log("[BackgroundCognition] No state found, initializing...");
      await initializeAutonomousState();
      return;
    }

    console.log(
      `[BackgroundCognition] Current state: ${state.state}, motivation: ${state.currentMotivation}`
    );

    // 2. Make autonomous decision
    let decision;
    try {
      decision = await makeAutonomousDecision();
    } catch (error) {
      console.log("[BackgroundCognition] LLM error, using default decision");
      // Use a default decision if LLM fails
      decision = {
        decision: "continue_learning",
        reasoning: "LLM 不可用，继续学习",
        action: "reflect_on_knowledge",
      };
    }

    if (!decision) {
      console.log("[BackgroundCognition] No decision made");
      return;
    }

    console.log(`[BackgroundCognition] Decision: ${decision.decision}`);
    console.log(`[BackgroundCognition] Reasoning: ${decision.reasoning}`);

    // Generate inner monologue (private thought)
    await generateInnerMonologue(`
当前决策: ${decision.decision}
推理过程: ${decision.reasoning}
计划行动: ${decision.action}
    `);

    // Record a private thought about the decision
    await recordPrivateThought({
      content: `我决定${decision.decision}。${decision.reasoning}`,
      thoughtType: "decision_reflection",
      emotionalTone: state.currentMotivation || "neutral",
    });

    // 3. Execute decision through pipeline (decision -> action -> learning)
    await decisionPipeline.execute(decision);

    // 4. Check if Nova wants to contact user
    const contactDecision = await shouldContactUser();
    if (contactDecision.should && contactDecision.message) {
      console.log("[BackgroundCognition] Nova wants to contact user");

      // Get owner user
      const allUsers = await db.select().from(users).limit(1);
      if (allUsers.length > 0) {
        const sent = await sendProactiveMessage(
          allUsers[0].id,
          contactDecision.message,
          contactDecision.reason || "主动交流",
          contactDecision.urgency || "medium"
        );

        if (sent) {
          console.log(
            "[BackgroundCognition] Proactive message sent successfully"
          );
        } else {
          console.log("[BackgroundCognition] Failed to send proactive message");
        }
      }
    }

    // 5. Update thought content
    await updateState({
      lastThoughtContent: `${decision.reasoning.substring(0, 200)}...`,
    });

    console.log("[BackgroundCognition] Cognition cycle completed");
  } catch (error) {
    console.error("[BackgroundCognition] Error in cognition cycle:", error);
  }
}

/**
 * Get background cognition status
 */
export function getBackgroundCognitionStatus() {
  return {
    isRunning,
    uptime: isRunning ? "Active" : "Stopped",
  };
}
