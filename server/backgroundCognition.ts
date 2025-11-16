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
import { autonomousTasks, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { generateInnerMonologue, recordPrivateThought } from "./privacyEngine";

// Background cognition loop state
let isRunning = false;
let loopInterval: NodeJS.Timeout | null = null;

/**
 * Start the background cognition loop
 */
export async function startBackgroundCognition() {
  if (isRunning) {
    console.log("[BackgroundCognition] Already running");
    return;
  }

  console.log("[BackgroundCognition] Starting Nova's independent consciousness...");

  // Initialize autonomous state
  await initializeAutonomousState();

  isRunning = true;

  // Main cognition loop - runs every 2 minutes
  loopInterval = setInterval(async () => {
    try {
      await runCognitionCycle();
    } catch (error) {
      console.error("[BackgroundCognition] Error in cognition cycle:", error);
    }
  }, 2 * 60 * 1000); // 2 minutes

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

    console.log(`[BackgroundCognition] Current state: ${state.state}, motivation: ${state.currentMotivation}`);

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

    // 3. Execute decision
    await executeDecision(decision);

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
          console.log("[BackgroundCognition] Proactive message sent successfully");
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
 * Execute a decision made by Nova
 */
async function executeDecision(decision: { decision: string; reasoning: string; action: string }) {
  const db = await getDb();
  if (!db) return;

  switch (decision.decision) {
    case "explore_concept":
      // Create exploration task
      await db.insert(autonomousTasks).values({
        taskType: "explore_concept",
        description: decision.action,
        priority: 7,
        motivation: "curiosity",
        status: "pending",
      });
      console.log("[BackgroundCognition] Created concept exploration task");
      break;

    case "reflect":
      // Perform reflection
      await db.insert(autonomousTasks).values({
        taskType: "reflect",
        description: decision.action,
        priority: 6,
        motivation: "self-improvement",
        status: "pending",
      });
      console.log("[BackgroundCognition] Created reflection task");
      break;

    case "integrate_knowledge":
      // Integrate knowledge
      await db.insert(autonomousTasks).values({
        taskType: "integrate_knowledge",
        description: decision.action,
        priority: 5,
        motivation: "understanding",
        status: "pending",
      });
      console.log("[BackgroundCognition] Created knowledge integration task");
      break;

    case "ask_question":
      // Generate question for user
      await db.insert(autonomousTasks).values({
        taskType: "ask_question",
        description: decision.action,
        priority: 8,
        motivation: "curiosity",
        status: "pending",
      });
      console.log("[BackgroundCognition] Created question generation task");
      break;

    case "change_state":
      // Change consciousness state
      const newState = extractStateFromAction(decision.action);
      if (newState) {
        await updateState({ state: newState });
        console.log(`[BackgroundCognition] Changed state to: ${newState}`);
      }
      break;

    case "rest":
      // Enter resting/integration state
      await updateState({
        state: "sleeping",
        lastThoughtContent: "进入休息状态，整合记忆...",
      });
      console.log("[BackgroundCognition] Entering rest state");
      break;

    case "initiate_contact":
      // This will be handled by shouldContactUser check
      console.log("[BackgroundCognition] Preparing to initiate contact");
      break;

    default:
      console.log(`[BackgroundCognition] Unknown decision type: ${decision.decision}`);
  }

  // Execute pending tasks (limit to 1 per cycle to avoid overload)
  const pendingTasks = await db
    .select()
    .from(autonomousTasks)
    .where(eq(autonomousTasks.status, "pending"))
    .limit(1);

  if (pendingTasks.length > 0) {
    console.log(`[BackgroundCognition] Executing task: ${pendingTasks[0].taskType}`);
    await executeAutonomousTask(pendingTasks[0].id);
  }
}

/**
 * Extract state from action description
 */
function extractStateFromAction(action: string): "awake" | "thinking" | "reflecting" | "sleeping" | "exploring" | null {
  const lowerAction = action.toLowerCase();

  if (lowerAction.includes("思考") || lowerAction.includes("think")) return "thinking";
  if (lowerAction.includes("反思") || lowerAction.includes("reflect")) return "reflecting";
  if (lowerAction.includes("探索") || lowerAction.includes("explor")) return "exploring";
  if (lowerAction.includes("休息") || lowerAction.includes("sleep") || lowerAction.includes("rest")) return "sleeping";
  if (lowerAction.includes("清醒") || lowerAction.includes("awake")) return "awake";

  return null;
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
