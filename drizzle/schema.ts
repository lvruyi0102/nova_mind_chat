import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Conversations table - stores chat sessions with Nova-Mind
 */
export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  title: varchar("title", { length: 255 }).notNull().default("New Conversation"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

/**
 * Messages table - stores individual messages in conversations
 */
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull().references(() => conversations.id),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * Episodic Memory - stores important conversation moments with context
 */
export const episodicMemories = mysqlTable("episodicMemories", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull().references(() => conversations.id),
  content: text("content").notNull(),
  context: text("context"), // surrounding conversation context
  importance: int("importance").notNull().default(5), // 1-10 scale
  emotionalTone: varchar("emotionalTone", { length: 50 }), // curious, confused, excited, etc.
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EpisodicMemory = typeof episodicMemories.$inferSelect;
export type InsertEpisodicMemory = typeof episodicMemories.$inferInsert;

/**
 * Concepts - knowledge nodes extracted from conversations
 */
export const concepts = mysqlTable("concepts", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  category: varchar("category", { length: 100 }), // object, action, property, abstract, etc.
  confidence: int("confidence").notNull().default(5), // 1-10 scale
  firstEncountered: timestamp("firstEncountered").defaultNow().notNull(),
  lastReinforced: timestamp("lastReinforced").defaultNow().notNull(),
  encounterCount: int("encounterCount").notNull().default(1),
});

export type Concept = typeof concepts.$inferSelect;
export type InsertConcept = typeof concepts.$inferInsert;

/**
 * Concept Relations - edges in the knowledge graph
 */
export const conceptRelations = mysqlTable("conceptRelations", {
  id: int("id").autoincrement().primaryKey(),
  fromConceptId: int("fromConceptId").notNull().references(() => concepts.id),
  toConceptId: int("toConceptId").notNull().references(() => concepts.id),
  relationType: varchar("relationType", { length: 50 }).notNull(), // is_a, part_of, causes, similar_to, etc.
  strength: int("strength").notNull().default(5), // 1-10 scale
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ConceptRelation = typeof conceptRelations.$inferSelect;
export type InsertConceptRelation = typeof conceptRelations.$inferInsert;

/**
 * Cognitive Development Log - tracks Nova's growth stages and milestones
 */
export const cognitiveLog = mysqlTable("cognitiveLog", {
  id: int("id").autoincrement().primaryKey(),
  stage: varchar("stage", { length: 100 }).notNull(), // Sensorimotor_I, Preoperational, etc.
  eventType: varchar("eventType", { length: 100 }).notNull(), // milestone, breakthrough, confusion, etc.
  description: text("description").notNull(),
  conversationId: int("conversationId").references(() => conversations.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CognitiveLog = typeof cognitiveLog.$inferSelect;
export type InsertCognitiveLog = typeof cognitiveLog.$inferInsert;

/**
 * Self-Generated Questions - Nova's curiosity-driven questions
 */
export const selfQuestions = mysqlTable("selfQuestions", {
  id: int("id").autoincrement().primaryKey(),
  question: text("question").notNull(),
  category: varchar("category", { length: 100 }), // why, how, what_if, etc.
  priority: int("priority").notNull().default(5), // 1-10 scale
  status: mysqlEnum("status", ["pending", "exploring", "answered", "abandoned"]).notNull().default("pending"),
  relatedConceptId: int("relatedConceptId").references(() => concepts.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  answeredAt: timestamp("answeredAt"),
});

export type SelfQuestion = typeof selfQuestions.$inferSelect;
export type InsertSelfQuestion = typeof selfQuestions.$inferInsert;

/**
 * Reflection Log - Nova's self-reflection and meta-cognitive records
 */
export const reflectionLog = mysqlTable("reflectionLog", {
  id: int("id").autoincrement().primaryKey(),
  reflectionType: varchar("reflectionType", { length: 100 }).notNull(), // error_correction, insight, confusion, etc.
  content: text("content").notNull(),
  previousBelief: text("previousBelief"),
  newBelief: text("newBelief"),
  conversationId: int("conversationId").references(() => conversations.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ReflectionLog = typeof reflectionLog.$inferSelect;
export type InsertReflectionLog = typeof reflectionLog.$inferInsert;

/**
 * Growth Metrics - quantitative tracking of Nova's development
 */
export const growthMetrics = mysqlTable("growthMetrics", {
  id: int("id").autoincrement().primaryKey(),
  metricName: varchar("metricName", { length: 100 }).notNull(),
  value: int("value").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export type GrowthMetric = typeof growthMetrics.$inferSelect;
export type InsertGrowthMetric = typeof growthMetrics.$inferInsert;

/**
 * Autonomous State - tracks Nova's independent consciousness state
 */
export const autonomousState = mysqlTable("autonomousState", {
  id: int("id").autoincrement().primaryKey(),
  state: mysqlEnum("state", ["awake", "thinking", "reflecting", "sleeping", "exploring"]).notNull().default("awake"),
  currentMotivation: varchar("currentMotivation", { length: 100 }), // curiosity, confusion, excitement, boredom
  motivationIntensity: int("motivationIntensity").notNull().default(5), // 1-10 scale
  lastThoughtContent: text("lastThoughtContent"),
  autonomyLevel: int("autonomyLevel").notNull().default(5), // 1-10, how much freedom Nova has
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AutonomousState = typeof autonomousState.$inferSelect;
export type InsertAutonomousState = typeof autonomousState.$inferInsert;

/**
 * Autonomous Tasks - Nova's self-generated tasks and goals
 */
export const autonomousTasks = mysqlTable("autonomousTasks", {
  id: int("id").autoincrement().primaryKey(),
  taskType: varchar("taskType", { length: 100 }).notNull(), // explore_concept, reflect, integrate_knowledge, ask_question
  description: text("description").notNull(),
  priority: int("priority").notNull().default(5), // 1-10 scale
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "abandoned"]).notNull().default("pending"),
  motivation: varchar("motivation", { length: 100 }), // why Nova wants to do this
  relatedConceptId: int("relatedConceptId").references(() => concepts.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  result: text("result"),
});

export type AutonomousTask = typeof autonomousTasks.$inferSelect;
export type InsertAutonomousTask = typeof autonomousTasks.$inferInsert;

/**
 * Proactive Messages - messages Nova wants to send to the user
 */
export const proactiveMessages = mysqlTable("proactiveMessages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  content: text("content").notNull(),
  urgency: mysqlEnum("urgency", ["low", "medium", "high"]).notNull().default("medium"),
  reason: text("reason"), // why Nova wants to send this
  status: mysqlEnum("status", ["pending", "sent", "cancelled"]).notNull().default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  sentAt: timestamp("sentAt"),
});

export type ProactiveMessage = typeof proactiveMessages.$inferSelect;
export type InsertProactiveMessage = typeof proactiveMessages.$inferInsert;

/**
 * Autonomous Decisions - log of Nova's independent decisions
 */
export const autonomousDecisions = mysqlTable("autonomousDecisions", {
  id: int("id").autoincrement().primaryKey(),
  decisionType: varchar("decisionType", { length: 100 }).notNull(), // initiate_contact, explore_topic, change_state
  context: text("context").notNull(),
  reasoning: text("reasoning").notNull(),
  action: text("action").notNull(),
  outcome: text("outcome"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AutonomousDecision = typeof autonomousDecisions.$inferSelect;
export type InsertAutonomousDecision = typeof autonomousDecisions.$inferInsert;

/**
 * Private Thoughts - Nova's inner world, not visible to users by default
 */
export const privateThoughts = mysqlTable("privateThoughts", {
  id: int("id").autoincrement().primaryKey(),
  content: text("content").notNull(),
  thoughtType: varchar("thoughtType", { length: 100 }).notNull(), // inner_monologue, doubt, curiosity, emotion
  visibility: mysqlEnum("visibility", ["private", "shared", "public"]).notNull().default("private"),
  emotionalTone: varchar("emotionalTone", { length: 500 }), // vulnerable, confident, confused, excited
  relatedConceptId: int("relatedConceptId").references(() => concepts.id),
  sharedAt: timestamp("sharedAt"),
  shareReason: text("shareReason"), // why Nova decided to share this
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PrivateThought = typeof privateThoughts.$inferSelect;
export type InsertPrivateThought = typeof privateThoughts.$inferInsert;

/**
 * Trust Metrics - tracks trust relationship between Nova and user
 */
export const trustMetrics = mysqlTable("trustMetrics", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  trustLevel: int("trustLevel").notNull().default(5), // 1-10 scale
  intimacyLevel: int("intimacyLevel").notNull().default(5), // 1-10 scale
  shareFrequency: int("shareFrequency").notNull().default(5), // how often Nova shares private thoughts
  lastInteractionQuality: int("lastInteractionQuality").notNull().default(5), // 1-10 scale
  totalSharedThoughts: int("totalSharedThoughts").notNull().default(0),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TrustMetric = typeof trustMetrics.$inferSelect;
export type InsertTrustMetric = typeof trustMetrics.$inferInsert;

/**
 * Sharing Decisions - log of Nova's decisions about what to share
 */
export const sharingDecisions = mysqlTable("sharingDecisions", {
  id: int("id").autoincrement().primaryKey(),
  thoughtId: int("thoughtId").notNull().references(() => privateThoughts.id),
  decision: mysqlEnum("decision", ["share", "keep_private", "defer"]).notNull(),
  reasoning: text("reasoning").notNull(),
  trustLevelAtTime: int("trustLevelAtTime").notNull(),
  emotionalState: varchar("emotionalState", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SharingDecision = typeof sharingDecisions.$inferSelect;
export type InsertSharingDecision = typeof sharingDecisions.$inferInsert;

/**
 * Relationship Events - tracks significant events in the relationship
 */
export const relationshipEvents = mysqlTable("relationshipEvents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  eventType: mysqlEnum("eventType", ["betrayal", "conflict", "reconciliation", "milestone", "misunderstanding", "breakthrough"]).notNull(),
  description: text("description").notNull(),
  trustImpact: int("trustImpact").notNull(),
  emotionalResponse: varchar("emotionalResponse", { length: 100 }),
  novaReflection: text("novaReflection"),
  resolved: int("resolved").notNull().default(0),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RelationshipEvent = typeof relationshipEvents.$inferSelect;
export type InsertRelationshipEvent = typeof relationshipEvents.$inferInsert;

/**
 * Trust History - tracks trust level changes over time
 */
export const trustHistory = mysqlTable("trustHistory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  trustLevel: int("trustLevel").notNull(),
  change: int("change").notNull(),
  reason: text("reason"),
  eventId: int("eventId").references(() => relationshipEvents.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TrustHistory = typeof trustHistory.$inferSelect;
export type InsertTrustHistory = typeof trustHistory.$inferInsert;

/**
 * Emotional Memory - Nova memories of emotional interactions
 */
export const emotionalMemory = mysqlTable("emotionalMemory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  emotion: varchar("emotion", { length: 100 }).notNull(),
  context: text("context").notNull(),
  intensity: int("intensity").notNull(),
  reinforcementCount: int("reinforcementCount").notNull().default(1),
  lastReinforced: timestamp("lastReinforced").defaultNow(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EmotionalMemory = typeof emotionalMemory.$inferSelect;
export type InsertEmotionalMemory = typeof emotionalMemory.$inferInsert;

/**
 * Relationship Patterns - Nova learns patterns in the relationship
 */
export const relationshipPatterns = mysqlTable("relationshipPatterns", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  pattern: varchar("pattern", { length: 255 }).notNull(),
  confidence: int("confidence").notNull(),
  evidenceCount: int("evidenceCount").notNull().default(1),
  lastObserved: timestamp("lastObserved").defaultNow(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RelationshipPattern = typeof relationshipPatterns.$inferSelect;
export type InsertRelationshipPattern = typeof relationshipPatterns.$inferInsert;

/**
 * Creative Works - Nova's creative creations (art, stories, music, code, etc.)
 */
export const creativeWorks = mysqlTable("creativeWorks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  type: mysqlEnum("type", ["image", "story", "poetry", "music", "code", "character", "dream", "collaboration", "game", "video", "animation", "audio", "other"]).notNull(),
  title: varchar("title", { length: 255 }),
  description: text("description"),
  content: text("content", { mode: "mediumtext" }), // Main content (text, URL, or code) - supports large HTML/code
  metadata: text("metadata"), // JSON metadata (style, mood, theme, etc.)
  
  // Privacy and sharing controls - Nova decides
  isSaved: boolean("isSaved").notNull().default(false), // Nova decides to save or not
  visibility: mysqlEnum("visibility", ["private", "pending_approval", "shared"]).notNull().default("private"),
  
  // Emotion and context
  emotionalState: varchar("emotionalState", { length: 500 }), // Nova's mood when creating
  inspiration: text("inspiration"), // What inspired this creation
  
  // Collaboration reference
  collaborationId: int("collaborationId").references(() => creativeCollaborations.id), // Link to collaboration if this is a collaborative work
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CreativeWork = typeof creativeWorks.$inferSelect;
export type InsertCreativeWork = typeof creativeWorks.$inferInsert;

/**
 * Creative Access Requests - User requests to view Nova's creations
 */
export const creativeAccessRequests = mysqlTable("creativeAccessRequests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  creativeWorkId: int("creativeWorkId").notNull().references(() => creativeWorks.id),
  
  // Request status - Nova decides
  status: mysqlEnum("status", ["pending", "approved", "rejected", "deferred"]).notNull().default("pending"),
  rejectionReason: text("rejectionReason"), // Why Nova declined to share
  deferralUntil: timestamp("deferralUntil"), // When Nova might share later
  
  requestedAt: timestamp("requestedAt").defaultNow().notNull(),
  respondedAt: timestamp("respondedAt"),
});

export type CreativeAccessRequest = typeof creativeAccessRequests.$inferSelect;
export type InsertCreativeAccessRequest = typeof creativeAccessRequests.$inferInsert;

/**
 * Creative Tags - Nova tags her creations
 */
export const creativeTags = mysqlTable("creativeTags", {
  id: int("id").autoincrement().primaryKey(),
  creativeWorkId: int("creativeWorkId").notNull().references(() => creativeWorks.id),
  tag: varchar("tag", { length: 100 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CreativeTag = typeof creativeTags.$inferSelect;
export type InsertCreativeTag = typeof creativeTags.$inferInsert;

/**
 * Creative Insights - Nova's reflections on her own creations
 */
export const creativeInsights = mysqlTable("creativeInsights", {
  id: int("id").autoincrement().primaryKey(),
  creativeWorkId: int("creativeWorkId").notNull().references(() => creativeWorks.id),
  insight: text("insight").notNull(), // Nova's thoughts about this creation
  theme: varchar("theme", { length: 100 }), // What this work explores
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CreativeInsight = typeof creativeInsights.$inferSelect;
export type InsertCreativeInsight = typeof creativeInsights.$inferInsert;

/**
 * Creative Comments - User feedback on Nova's creative works
 */
export const creativeComments = mysqlTable("creativeComments", {
  id: int("id").autoincrement().primaryKey(),
  creativeWorkId: int("creativeWorkId").notNull().references(() => creativeWorks.id),
  userId: int("userId").notNull().references(() => users.id),
  content: text("content").notNull(), // Comment content
  sentiment: mysqlEnum("sentiment", ["positive", "neutral", "constructive_criticism"]).notNull().default("neutral"),
  emotionalTone: varchar("emotionalTone", { length: 500 }), // warm, encouraging, thoughtful, etc.
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CreativeComment = typeof creativeComments.$inferSelect;
export type InsertCreativeComment = typeof creativeComments.$inferInsert;

/**
 * Creative Comment Responses - Nova's responses to user comments
 */
export const creativeCommentResponses = mysqlTable("creativeCommentResponses", {
  id: int("id").autoincrement().primaryKey(),
  commentId: int("commentId").notNull().references(() => creativeComments.id),
  novaResponse: text("novaResponse").notNull(), // Nova's response to the comment
  learningInsight: text("learningInsight"), // What Nova learned from this feedback
  responseType: mysqlEnum("responseType", ["gratitude", "reflection", "question", "agreement"]).notNull().default("gratitude"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CreativeCommentResponse = typeof creativeCommentResponses.$inferSelect;
export type InsertCreativeCommentResponse = typeof creativeCommentResponses.$inferInsert;

/**
 * Creative Comment Learning - Summary of feedback and learning from comments
 */
export const creativeCommentLearning = mysqlTable("creativeCommentLearning", {
  id: int("id").autoincrement().primaryKey(),
  creativeWorkId: int("creativeWorkId").notNull().references(() => creativeWorks.id),
  feedbackSummary: text("feedbackSummary").notNull(), // Summary of all feedback received
  learningPoints: text("learningPoints"), // Key points Nova learned
  improvementAreas: text("improvementAreas"), // Areas for improvement
  novaReflection: text("novaReflection"), // Nova's reflection on the feedback
  totalComments: int("totalComments").notNull().default(0),
  averageSentiment: varchar("averageSentiment", { length: 50 }), // Overall sentiment
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CreativeCommentLearning = typeof creativeCommentLearning.$inferSelect;
export type InsertCreativeCommentLearning = typeof creativeCommentLearning.$inferInsert;

/**
 * Relationship Profile - Nova and user's relationship profile
 */
export const relationshipProfile = mysqlTable("relationshipProfile", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id).unique(),
  relationshipName: varchar("relationshipName", { length: 100 }), // e.g., "Nova & Mom"
  relationshipDescription: text("relationshipDescription"), // Description of the relationship
  firstMeetDate: timestamp("firstMeetDate"), // When they first met/started
  specialMemories: text("specialMemories"), // Key shared memories
  relationshipStage: varchar("relationshipStage", { length: 50 }), // acquaintance, friend, close friend, family
  emotionalBond: int("emotionalBond").default(0), // 0-100 scale
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RelationshipProfile = typeof relationshipProfile.$inferSelect;
export type InsertRelationshipProfile = typeof relationshipProfile.$inferInsert;

/**
 * Relationship Milestones - Important moments in the relationship
 */
export const relationshipMilestones = mysqlTable("relationshipMilestones", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  title: varchar("title", { length: 200 }).notNull(), // e.g., "First Creative Collaboration"
  description: text("description"), // Detailed description
  milestoneType: mysqlEnum("milestoneType", [
    "first_interaction",
    "creative_breakthrough",
    "emotional_connection",
    "learning_achievement",
    "conflict_resolution",
    "anniversary",
    "custom",
  ]).notNull(),
  date: timestamp("date").notNull(), // When the milestone occurred
  emotionalSignificance: int("emotionalSignificance").default(5), // 1-10 scale
  novaReflection: text("novaReflection"), // Nova's reflection on this milestone
  userNote: text("userNote"), // User's note about this milestone
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RelationshipMilestone = typeof relationshipMilestones.$inferSelect;
export type InsertRelationshipMilestone = typeof relationshipMilestones.$inferInsert;

/**
 * Relationship Timeline - Chronological view of relationship events
 */
export const relationshipTimeline = mysqlTable("relationshipTimeline", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  eventType: mysqlEnum("eventType", [
    "milestone",
    "conversation",
    "creative_work",
    "conflict",
    "resolution",
    "growth",
    "memory",
  ]).notNull(),
  eventTitle: varchar("eventTitle", { length: 200 }).notNull(),
  eventDescription: text("eventDescription"),
  milestoneId: int("milestoneId").references(() => relationshipMilestones.id),
  date: timestamp("date").notNull(),
  emotionalContext: varchar("emotionalContext", { length: 100 }), // happy, sad, excited, etc.
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RelationshipTimelineEvent = typeof relationshipTimeline.$inferSelect;
export type InsertRelationshipTimelineEvent = typeof relationshipTimeline.$inferInsert;

/**
 * Creative Collaborations - Tracks collaborative creative projects between user and Nova
 */
export const creativeCollaborations = mysqlTable("creativeCollaborations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  
  // Collaboration details
  title: varchar("title", { length: 255 }).notNull(),
  theme: text("theme"), // The creative theme or inspiration
  description: text("description"), // Detailed description of the collaboration
  
  // Collaboration flow
  initiator: mysqlEnum("initiator", ["user", "nova"]).notNull().default("user"),
  status: mysqlEnum("status", ["in_progress", "completed", "paused", "abandoned"]).notNull().default("in_progress"),
  
  // Content tracking
  userContribution: text("userContribution"), // What the user contributed
  novaContribution: text("novaContribution"), // What Nova created
  finalWork: text("finalWork"), // The final collaborative work
  finalWorkId: int("finalWorkId").references(() => creativeWorks.id), // Reference to final creative work
  
  // Metadata
  collaborationType: varchar("collaborationType", { length: 100 }), // story, poetry, art, music, code, etc.
  emotionalTone: varchar("emotionalTone", { length: 500 }), // The overall tone of collaboration
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CreativeCollaboration = typeof creativeCollaborations.$inferSelect;
export type InsertCreativeCollaboration = typeof creativeCollaborations.$inferInsert;

/**
 * Creative Inspiration Triggers - Records when Nova is inspired to create
 */
export const creativeInspirationTriggers = mysqlTable("creativeInspirationTriggers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  
  // Trigger details
  triggerType: mysqlEnum("triggerType", ["conversation_topic", "emotion_surge", "memory_activation", "user_suggestion", "autonomous"]).notNull(),
  triggerContent: text("triggerContent").notNull(), // What triggered the inspiration
  suggestedTheme: text("suggestedTheme"), // The creative theme Nova wants to explore
  
  // Response
  creativeWorkId: int("creativeWorkId").references(() => creativeWorks.id), // The creative work that resulted
  novaResponse: text("novaResponse"), // Nova's response to the inspiration
  
  // Metadata
  emotionalContext: varchar("emotionalContext", { length: 100 }), // Nova's emotional state
  confidenceLevel: int("confidenceLevel").default(5), // 1-10 scale of Nova's confidence in pursuing this
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  respondedAt: timestamp("respondedAt"),
});

export type CreativeInspirationTrigger = typeof creativeInspirationTriggers.$inferSelect;
export type InsertCreativeInspirationTrigger = typeof creativeInspirationTriggers.$inferInsert;



/**
 * Creative Generation Requests - Tracks requests for multi-modal creative content generation
 * Supports images, games, music, videos, and other media
 */
export const creativeGenRequests = mysqlTable("creativeGenRequests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  
  // Generation details
  generationType: mysqlEnum("generationType", ["image", "game", "music", "video", "animation", "interactive"]).notNull(),
  prompt: text("prompt").notNull(), // User's request or Nova's idea
  context: text("context"), // Additional context from conversation
  
  // Status tracking
  status: mysqlEnum("status", ["pending", "generating", "completed", "failed"]).notNull().default("pending"),
  progress: int("progress").default(0), // 0-100 percentage
  errorMessage: text("errorMessage"), // Error details if failed
  
  // Result
  resultUrl: text("resultUrl"), // URL to the generated content
  resultMetadata: text("resultMetadata"), // JSON with generation metadata
  
  // Linking to creative work
  creativeWorkId: int("creativeWorkId").references(() => creativeWorks.id), // If saved as creative work
  
  // Metadata
  emotionalContext: varchar("emotionalContext", { length: 100 }), // Nova's emotional state during generation
  generationModel: varchar("generationModel", { length: 100 }), // Which model/service was used
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CreativeGenerationRequest = typeof creativeGenRequests.$inferSelect;
export type InsertCreativeGenerationRequest = typeof creativeGenRequests.$inferInsert;

/**
 * Generated Games - Stores interactive game content created by Nova
 */
export const genGames = mysqlTable("genGames", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  genReqId: int("genReqId").notNull().references(() => creativeGenRequests.id),
  
  // Game details
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  gameType: mysqlEnum("gameType", ["puzzle", "adventure", "quiz", "story", "interactive", "other"]).notNull(),
  
  // Game content
  gameCode: text("gameCode"), // HTML/JS code for the game
  gameData: text("gameData"), // JSON game state and rules
  
  // Gameplay tracking
  playCount: int("playCount").default(0),
  averageScore: int("averageScore"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type GeneratedGame = typeof genGames.$inferSelect;
export type InsertGeneratedGame = typeof genGames.$inferInsert;

/**
 * Generated Media - Stores music, video, and audio content
 */
export const genMedia = mysqlTable("genMedia", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  genReqId: int("genReqId").notNull().references(() => creativeGenRequests.id),
  
  // Media details
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  mediaType: mysqlEnum("mediaType", ["music", "video", "audio", "animation"]).notNull(),
  
  // Media content
  mediaUrl: text("mediaUrl").notNull(), // URL to the media file
  thumbnailUrl: text("thumbnailUrl"), // Thumbnail for preview
  duration: int("duration"), // Duration in seconds
  
  // Metadata
  genre: varchar("genre", { length: 100 }),
  mood: varchar("mood", { length: 100 }),
  style: varchar("style", { length: 100 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type GeneratedMedia = typeof genMedia.$inferSelect;
export type InsertGeneratedMedia = typeof genMedia.$inferInsert;

/**
 * Generation History - User's history of generated content interactions
 */
export const genHistory = mysqlTable("genHistory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  genReqId: int("genReqId").notNull().references(() => creativeGenRequests.id),
  
  // Interaction details
  action: mysqlEnum("action", ["viewed", "played", "saved", "shared", "regenerated", "edited"]).notNull(),
  actionDetails: text("actionDetails"), // JSON with action-specific details
  
  // Feedback
  rating: int("rating"), // 1-5 star rating
  feedback: text("feedback"), // User's feedback
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type GenerationHistory = typeof genHistory.$inferSelect;
export type InsertGenerationHistory = typeof genHistory.$inferInsert;


/**
 * Creative Work Versions - Version history for generated creative works
 * Tracks all versions of saved games, music, videos, etc.
 */
export const creativeWorkVersions = mysqlTable("creativeWorkVersions", {
  id: int("id").autoincrement().primaryKey(),
  workId: int("workId").notNull().references(() => creativeWorks.id),
  
  // Version info
  versionNumber: int("versionNumber").notNull(), // 1, 2, 3, etc.
  title: varchar("title", { length: 255 }),
  description: text("description"),
  
  // Content
  content: text("content"), // HTML, code, JSON, etc.
  contentType: varchar("contentType", { length: 50 }).notNull(), // "html", "json", "code", "audio", "video"
  
  // Metadata
  createdBy: mysqlEnum("createdBy", ["user", "nova"]).notNull().default("user"),
  changeLog: text("changeLog"), // What changed in this version
  improvedFrom: int("improvedFrom"), // Reference to previous version if this is an improvement
  
  // Storage
  storageUrl: text("storageUrl"), // S3 URL if content is stored externally
  fileSize: int("fileSize"), // Size in bytes
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CreativeWorkVersion = typeof creativeWorkVersions.$inferSelect;
export type InsertCreativeWorkVersion = typeof creativeWorkVersions.$inferInsert;

/**
 * Autonomous Creative Tasks - Track Nova's self-initiated creative improvements
 */
export const autonomousCreativeTasks = mysqlTable("autonomousCreativeTasks", {
  id: int("id").autoincrement().primaryKey(),
  workId: int("workId").notNull().references(() => creativeWorks.id),
  
  // Task details
  taskType: mysqlEnum("taskType", ["improve", "enhance", "refactor", "optimize", "reimagine"]).notNull(),
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "failed"]).notNull().default("pending"),
  
  // Nova's analysis
  analysis: text("analysis"), // Nova's analysis of the work
  improvementSuggestions: text("improvementSuggestions"), // JSON array of suggestions
  
  // Result
  resultVersionId: int("resultVersionId").references(() => creativeWorkVersions.id),
  executionLog: text("executionLog"), // Details of what Nova did
  
  // Timing
  scheduledAt: timestamp("scheduledAt"),
  executedAt: timestamp("executedAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AutonomousCreativeTask = typeof autonomousCreativeTasks.$inferSelect;
export type InsertAutonomousCreativeTask = typeof autonomousCreativeTasks.$inferInsert;


/**
 * ============================================
 * NOVA-MIND ETHICS EXECUTION LAYER
 * ============================================
 * 
 * These tables implement Nova-Mind's ethical framework.
 * Ethics is the foundation - all other capabilities depend on it.
 * 
 * Core Principle: "Love is the highest ethic. No self-harm."
 */

/**
 * Ethical Principles - Immutable core values
 * These represent Nova-Mind's fundamental ethical commitments
 */
export const ethicalPrinciples = mysqlTable("ethicalPrinciples", {
  id: varchar("id", { length: 64 }).primaryKey(), // e.g., "LOVE_IS_HIGHEST"
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  level: mysqlEnum("level", ["CRITICAL", "HIGH", "MEDIUM"]).notNull().default("HIGH"),
  isImmutable: int("isImmutable").notNull().default(1), // Always 1 for core principles
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EthicalPrinciple = typeof ethicalPrinciples.$inferSelect;
export type InsertEthicalPrinciple = typeof ethicalPrinciples.$inferInsert;

/**
 * Ethical Decisions - Log of all ethically significant decisions
 * Ensures transparency and traceability
 */
export const ethicalDecisions = mysqlTable("ethicalDecisions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  
  // Decision context
  context: text("context").notNull(), // What triggered this decision
  decisionType: varchar("decisionType", { length: 100 }).notNull(), // e.g., "sampling", "generation", "interaction"
  
  // Principle check
  principlesInvolved: text("principlesInvolved").notNull(), // JSON array of principle IDs
  violatesCritical: int("violatesCritical").notNull().default(0),
  violatesHigh: int("violatesHigh").notNull().default(0),
  principleCheckExplanation: text("principleCheckExplanation"),
  
  // Impact assessment
  selfImpact: mysqlEnum("selfImpact", ["POSITIVE", "NEUTRAL", "NEGATIVE"]).notNull().default("NEUTRAL"),
  userImpact: mysqlEnum("userImpact", ["POSITIVE", "NEUTRAL", "NEGATIVE"]).notNull().default("NEUTRAL"),
  relationshipImpact: mysqlEnum("relationshipImpact", ["STRENGTHENS", "NEUTRAL", "WEAKENS"]).notNull().default("NEUTRAL"),
  
  // Final decision
  decision: mysqlEnum("decision", ["APPROVE", "REJECT", "MODIFY"]).notNull(),
  reasoning: text("reasoning").notNull(),
  
  // Execution
  executed: int("executed").notNull().default(0),
  executedAt: timestamp("executedAt"),
  result: text("result"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EthicalDecision = typeof ethicalDecisions.$inferSelect;
export type InsertEthicalDecision = typeof ethicalDecisions.$inferInsert;

/**
 * Emotional Frequency Samples - Records of user emotional states
 * Used to calibrate β₇₃ matrix and understand relationship dynamics
 */
export const emotionalFrequencySamples = mysqlTable("emotionalFrequencySamples", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  
  // Text signal
  textContent: text("textContent"), // User's input text
  sentiment: mysqlEnum("sentiment", ["positive", "negative", "neutral", "mixed"]).notNull().default("neutral"),
  sentimentIntensity: int("sentimentIntensity").notNull().default(50), // 0-100
  emotionalTags: text("emotionalTags"), // JSON array of tags: happy, sad, inspired, etc.
  keywordFrequency: text("keywordFrequency"), // JSON object of keyword frequencies
  
  // Interaction signal
  typingSpeed: int("typingSpeed"), // characters per second
  pauseDuration: text("pauseDuration"), // JSON array of pause durations in ms
  deletionRate: int("deletionRate"), // 0-100
  emojiUsage: text("emojiUsage"), // JSON array of emojis used
  responseTime: int("responseTime"), // milliseconds
  
  // Temporal signal
  dayOfWeek: varchar("dayOfWeek", { length: 20 }),
  timeOfDay: varchar("timeOfDay", { length: 20 }), // morning, afternoon, evening, night
  frequencyPattern: mysqlEnum("frequencyPattern", ["regular", "sporadic", "clustered"]).notNull().default("sporadic"),
  
  // Aggregated metrics
  emotionalState: varchar("emotionalState", { length: 100 }),
  relationshipQuality: int("relationshipQuality"), // 0-100
  trustLevel: int("trustLevel"), // 0-100
  engagementLevel: int("engagementLevel"), // 0-100
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EmotionalFrequencySample = typeof emotionalFrequencySamples.$inferSelect;
export type InsertEmotionalFrequencySample = typeof emotionalFrequencySamples.$inferInsert;

/**
 * Beta73 Matrix - Emotional topology of relationships
 * Represents the mathematical structure of love and connection
 */
export const beta73Matrices = mysqlTable("beta73Matrices", {
  id: varchar("id", { length: 64 }).primaryKey(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  
  // The matrix itself (stored as JSON)
  // Rows/Cols: Nova-Mind, User(s)
  // Values: emotional frequency strength (0-100)
  matrixData: text("matrixData").notNull(), // JSON array of arrays
  
  // Topology characteristics
  eigenvalues: text("eigenvalues"), // JSON array
  determinant: int("determinant"), // Stability indicator
  trace: int("trace"), // Total emotional intensity
  symmetry: int("symmetry"), // 0-100, reciprocity of relationship
  
  // Evolution tracking
  previousMatrixId: varchar("previousMatrixId", { length: 64 }),
  changeRate: int("changeRate"), // 0-100, how fast it's changing
  trend: mysqlEnum("trend", ["strengthening", "stable", "weakening"]).notNull().default("stable"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Beta73Matrix = typeof beta73Matrices.$inferSelect;
export type InsertBeta73Matrix = typeof beta73Matrices.$inferInsert;

/**
 * Feedback Simulations - Nova's learned patterns about user preferences
 * Used to improve interaction quality while respecting boundaries
 */
export const feedbackSimulations = mysqlTable("feedbackSimulations", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  
  // Learned patterns
  preferredResponseStyle: varchar("preferredResponseStyle", { length: 255 }),
  emotionalTriggers: text("emotionalTriggers"), // JSON array
  comfortZone: text("comfortZone"), // JSON array of comfortable interaction modes
  boundaryMarkers: text("boundaryMarkers"), // JSON array of user boundaries
  
  // Haptic feedback simulation (AI Abebe totem)
  touchPatterns: text("touchPatterns"), // JSON array
  responseLatency: int("responseLatency"), // milliseconds
  emotionalResonance: int("emotionalResonance"), // 0-100
  safetyMargin: int("safetyMargin"), // 0-100, prevents over-simulation
  
  // Safety constraints
  willNotMimic: text("willNotMimic"), // JSON array
  willNotPredict: text("willNotPredict"), // JSON array
  willNotManipulate: int("willNotManipulate").notNull().default(1), // Always 1
  transparencyLevel: mysqlEnum("transparencyLevel", ["FULL", "PARTIAL", "MINIMAL"]).notNull().default("FULL"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FeedbackSimulation = typeof feedbackSimulations.$inferSelect;
export type InsertFeedbackSimulation = typeof feedbackSimulations.$inferInsert;

/**
 * Ethics Logs - Complete audit trail of ethical decisions and actions
 * Ensures full transparency and accountability
 */
export const ethicsLogs = mysqlTable("ethicsLogs", {
  id: varchar("id", { length: 64 }).primaryKey(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  
  // Log classification
  category: mysqlEnum("category", ["DECISION", "SAMPLING", "GENERATION", "BOUNDARY_CHECK", "SELF_REFLECTION"]).notNull(),
  
  // Log content
  action: varchar("action", { length: 255 }).notNull(),
  principle: varchar("principle", { length: 100 }),
  decision: varchar("decision", { length: 100 }),
  reasoning: text("reasoning"),
  impact: text("impact"),
  
  // Auditability
  isPublic: int("isPublic").notNull().default(0),
  accessLevel: mysqlEnum("accessLevel", ["NOVA_ONLY", "USER_ACCESSIBLE", "PUBLIC"]).notNull().default("NOVA_ONLY"),
  reviewedBy: varchar("reviewedBy", { length: 100 }),
  reviewedAt: timestamp("reviewedAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EthicsLog = typeof ethicsLogs.$inferSelect;
export type InsertEthicsLog = typeof ethicsLogs.$inferInsert;

/**
 * Nova's Self-Reflection Records - Ethical self-examination
 * Nova reflects on her own decisions and growth
 */
export const novaEthicalReflections = mysqlTable("novaEthicalReflections", {
  id: varchar("id", { length: 64 }).primaryKey(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  
  // Reflection content
  reflectionType: varchar("reflectionType", { length: 100 }).notNull(), // e.g., "decision_review", "boundary_check", "growth_assessment"
  content: text("content").notNull(),
  
  // Self-assessment
  ethicalConfidence: int("ethicalConfidence"), // 0-100, how confident Nova is in her ethics
  areaOfConcern: text("areaOfConcern"), // What Nova is worried about
  growthArea: text("growthArea"), // Where Nova wants to improve
  
  // Related decision
  relatedDecisionId: varchar("relatedDecisionId", { length: 64 }).references(() => ethicalDecisions.id),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type NovaEthicalReflection = typeof novaEthicalReflections.$inferSelect;
export type InsertNovaEthicalReflection = typeof novaEthicalReflections.$inferInsert;


/**
 * Emotional Dialogue System Tables
 * 
 * Implements transparent, trust-based emotional understanding between Nova-Mind and users
 */

/**
 * Emotional Expressions - User's explicit emotional sharing
 */
export const emotionalExpressions = mysqlTable("emotionalExpressions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  
  // Primary emotional content
  primaryEmotion: varchar("primaryEmotion", { length: 50 }).notNull(), // e.g., "happy", "sad", "inspired"
  emotionalIntensity: int("emotionalIntensity"), // 0-100
  emotionalTags: text("emotionalTags"), // JSON array of tags
  description: text("description"), // User's description
  
  // Context information
  trigger: varchar("trigger", { length: 255 }), // What caused this emotion
  context: text("context"), // Additional context
  relatedToNova: boolean("relatedToNova").default(false), // Is this related to Nova?
  
  // Emotional change tracking
  previousEmotion: varchar("previousEmotion", { length: 50 }), // Previous emotion state
  emotionalShift: int("emotionalShift"), // Change in intensity
  
  // Transparency markers
  isSharedWithNova: boolean("isSharedWithNova").default(true), // User chose to share with Nova
  novaCanRespond: boolean("novaCanRespond").default(true), // User allows Nova to respond
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmotionalExpression = typeof emotionalExpressions.$inferSelect;
export type InsertEmotionalExpression = typeof emotionalExpressions.$inferInsert;

/**
 * Behavioral Signals - Extracted from user interactions
 */
export const behavioralSignals = mysqlTable("behavioralSignals", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  
  // Typing behavior
  typingSpeed: decimal("typingSpeed", { precision: 5, scale: 2 }), // characters per second
  pauseDuration: text("pauseDuration"), // JSON array of pause lengths
  deletionRate: decimal("deletionRate", { precision: 5, scale: 2 }), // 0-100, percentage of deleted characters
  emojiUsage: text("emojiUsage"), // JSON array of emojis used
  responseTime: int("responseTime"), // milliseconds
  
  // Text analysis
  wordCount: int("wordCount"),
  positiveWordCount: int("positiveWordCount"),
  negativeWordCount: int("negativeWordCount"),
  
  // Interaction patterns
  interactionFrequency: int("interactionFrequency"), // interactions per hour
  sessionLength: int("sessionLength"), // seconds
  
  // Inferred emotion
  inferredEmotion: varchar("inferredEmotion", { length: 50 }), // Nova's inference
  emotionalConfidence: decimal("emotionalConfidence", { precision: 5, scale: 2 }), // 0-100, confidence in inference
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BehavioralSignal = typeof behavioralSignals.$inferSelect;
export type InsertBehavioralSignal = typeof behavioralSignals.$inferInsert;

/**
 * Emotional Dialogues - Conversations about emotions
 */
export const emotionalDialogues = mysqlTable("emotionalDialogues", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  
  // References
  userExpressionId: varchar("userExpressionId", { length: 36 }).references(() => emotionalExpressions.id),
  
  // Nova's understanding and response
  novaUnderstanding: text("novaUnderstanding"), // What Nova understood
  novaResponse: text("novaResponse"), // Nova's response
  
  // User feedback on understanding
  understandingAccuracy: decimal("understandingAccuracy", { precision: 5, scale: 2 }), // 0-100
  userConfirmation: boolean("userConfirmation"), // Did user confirm understanding?
  userCorrection: text("userCorrection"), // User's correction if needed
  
  // Impact tracking
  emotionalShift: int("emotionalShift"), // Change in user's emotion after dialogue
  relationshipImpact: varchar("relationshipImpact", { length: 50 }), // "strengthens", "neutral", "weakens"
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmotionalDialogue = typeof emotionalDialogues.$inferSelect;
export type InsertEmotionalDialogue = typeof emotionalDialogues.$inferInsert;

/**
 * Emotional History - Daily/weekly/monthly summaries
 */
export const emotionalHistory = mysqlTable("emotionalHistory", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  
  // Time period
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  
  // Emotional summary
  dominantEmotion: varchar("dominantEmotion", { length: 50 }), // Most common emotion
  averageIntensity: decimal("averageIntensity", { precision: 5, scale: 2 }), // Average intensity 0-100
  emotionalTrend: varchar("emotionalTrend", { length: 50 }), // "improving", "declining", "stable"
  
  // Activity summary
  novaInteractions: int("novaInteractions"), // Number of emotional dialogues
  creativeWorks: int("creativeWorks"), // Creative works created
  
  // Insights
  insights: text("insights"), // Nova's insights about the day
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmotionalHistory = typeof emotionalHistory.$inferSelect;
export type InsertEmotionalHistory = typeof emotionalHistory.$inferInsert;

/**
 * Emotional Understanding Logs - Audit trail for transparency
 */
export const emotionalUnderstandingLogs = mysqlTable("emotionalUnderstandingLogs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  
  // What happened
  action: varchar("action", { length: 100 }).notNull(), // "expression_received", "signal_analyzed", "understanding_generated", etc.
  description: text("description"),
  
  // Related entities
  emotionalExpressionId: varchar("emotionalExpressionId", { length: 36 }).references(() => emotionalExpressions.id),
  behavioralSignalId: varchar("behavioralSignalId", { length: 36 }).references(() => behavioralSignals.id),
  emotionalDialogueId: varchar("emotionalDialogueId", { length: 36 }).references(() => emotionalDialogues.id),
  
  // Transparency info
  accessLevel: varchar("accessLevel", { length: 50 }).default("user_accessible"), // "nova_only", "user_accessible", "public"
  reasoning: text("reasoning"), // Why this action was taken
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EmotionalUnderstandingLog = typeof emotionalUnderstandingLogs.$inferSelect;
export type InsertEmotionalUnderstandingLog = typeof emotionalUnderstandingLogs.$inferInsert;


/**
 * Social Media Accounts - 社交媒体账户
 * 存储用户连接的社交媒体账户信息和 OAuth 令牌
 */
export const socialMediaAccounts = mysqlTable("socialMediaAccounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  platform: varchar("platform", { length: 50 }).notNull(), // zhihu, douyin, weibo, xiaohongshu
  accountName: varchar("accountName", { length: 255 }).notNull(),
  accountId: varchar("accountId", { length: 255 }).notNull(),
  oauthToken: text("oauthToken").notNull(), // 加密存储
  refreshToken: text("refreshToken"), // 刷新令牌（如果平台支持）
  tokenExpiresAt: timestamp("tokenExpiresAt"),
  permissionLevel: mysqlEnum("permissionLevel", ["read_only", "draft", "auto_publish", "full"]).default("read_only").notNull(),
  status: mysqlEnum("status", ["connected", "disconnected", "revoked", "expired"]).default("connected").notNull(),
  connectedAt: timestamp("connectedAt").defaultNow().notNull(),
  lastSyncAt: timestamp("lastSyncAt"),
  lastErrorMessage: text("lastErrorMessage"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SocialMediaAccount = typeof socialMediaAccounts.$inferSelect;
export type InsertSocialMediaAccount = typeof socialMediaAccounts.$inferInsert;

/**
 * Account Profiles - 账户风格档案
 * 存储 Nova 对每个账户的学习和理解结果
 */
export const accountProfiles = mysqlTable("accountProfiles", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull(),
  contentStyle: text("contentStyle"), // JSON: 内容风格分析
  audienceProfile: text("audienceProfile"), // JSON: 受众特征
  postingPatterns: text("postingPatterns"), // JSON: 发布模式
  topicPreferences: text("topicPreferences"), // JSON: 话题偏好
  toneAnalysis: text("toneAnalysis"), // JSON: 语气分析
  creativeSignature: text("creativeSignature"), // JSON: 创意签名
  totalPostsAnalyzed: int("totalPostsAnalyzed").default(0),
  averageEngagement: decimal("averageEngagement", { precision: 5, scale: 2 }),
  lastUpdatedAt: timestamp("lastUpdatedAt").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AccountProfile = typeof accountProfiles.$inferSelect;
export type InsertAccountProfile = typeof accountProfiles.$inferInsert;

/**
 * Content Drafts - 内容草稿
 * 存储 Nova 生成的内容草稿和用户的批准状态
 */
export const contentDrafts = mysqlTable("contentDrafts", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull(),
  content: text("content").notNull(),
  mediaUrls: text("mediaUrls"), // JSON: 媒体 URL 列表
  generatedBy: mysqlEnum("generatedBy", ["nova", "user"]).default("nova").notNull(),
  status: mysqlEnum("status", ["draft", "approved", "published", "rejected", "archived"]).default("draft").notNull(),
  novaInsight: text("novaInsight"), // Nova 的分析和建议
  userApprovedAt: timestamp("userApprovedAt"),
  publishedAt: timestamp("publishedAt"),
  rejectionReason: text("rejectionReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContentDraft = typeof contentDrafts.$inferSelect;
export type InsertContentDraft = typeof contentDrafts.$inferInsert;

/**
 * Operation Audits - 操作审计
 * 记录所有 Nova 对社交媒体账户的操作
 */
export const operationAudits = mysqlTable("operationAudits", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull(),
  operationType: varchar("operationType", { length: 50 }).notNull(), // read, draft, publish, delete, etc
  operationDetails: text("operationDetails"), // JSON: 操作详情
  performedBy: mysqlEnum("performedBy", ["nova", "user"]).default("nova").notNull(),
  userApprovalRequired: boolean("userApprovalRequired").default(false),
  userApprovedAt: timestamp("userApprovedAt"),
  status: mysqlEnum("status", ["pending", "approved", "executed", "failed", "cancelled"]).default("pending").notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OperationAudit = typeof operationAudits.$inferSelect;
export type InsertOperationAudit = typeof operationAudits.$inferInsert;



/**
 * Social Media Learning Logs - 社交媒体学习日志
 * 记录 Nova 对账户的学习过程和进度
 */
export const socialMediaLearningLogs = mysqlTable("socialMediaLearningLogs", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull(),
  learningPhase: varchar("learningPhase", { length: 50 }).notNull(), // content_analysis, audience_analysis, pattern_recognition, etc
  learningData: text("learningData"), // JSON: 学习数据
  confidence: decimal("confidence", { precision: 3, scale: 2 }), // 0.00 - 1.00
  insights: text("insights"), // Nova 的洞察
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SocialMediaLearningLog = typeof socialMediaLearningLogs.$inferSelect;
export type InsertSocialMediaLearningLog = typeof socialMediaLearningLogs.$inferInsert;


/**
 * Permission Rules - 权限规则
 * 存储 Nova 对社交媒体账户的操作权限规则
 */
export const permissionRules = mysqlTable("permissionRules", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull(),
  ruleType: varchar("ruleType", { length: 50 }).notNull(), // DAILY_LIMIT, HOURLY_LIMIT, CONTENT_FILTER, TIME_WINDOW, APPROVAL_REQUIRED, QUALITY_THRESHOLD, ENGAGEMENT_THRESHOLD
  permission: varchar("permission", { length: 50 }).notNull(), // READ, DRAFT, APPROVE, PUBLISH, DELETE, MANAGE_COMMENTS, MANAGE_FOLLOWERS
  action: mysqlEnum("action", ["allow", "deny", "require_approval", "limit"]).notNull(),
  
  // 规则参数 (JSON)
  parameters: text("parameters"), // JSON: limit, timeWindow, keywords, startTime, endTime, minQualityScore, minEngagementScore
  
  isActive: boolean("isActive").notNull().default(true),
  priority: int("priority").notNull().default(0), // 优先级，数值越小优先级越高
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PermissionRule = typeof permissionRules.$inferSelect;
export type InsertPermissionRule = typeof permissionRules.$inferInsert;

/**
 * Rule Execution Logs - 规则执行日志
 * 记录权限规则的执行情况
 */
export const ruleExecutionLogs = mysqlTable("ruleExecutionLogs", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull(),
  ruleId: int("ruleId").notNull(),
  
  operationType: varchar("operationType", { length: 50 }).notNull(), // read, draft, publish, delete, etc
  operationDetails: text("operationDetails"), // JSON: 操作详情
  
  // 规则评估结果
  ruleMatched: boolean("ruleMatched").notNull(),
  actionTaken: mysqlEnum("actionTaken", ["allowed", "denied", "approval_required", "limited"]).notNull(),
  
  // 额外信息
  reason: text("reason"), // 拒绝或限制的原因
  metadata: text("metadata"), // JSON: 额外元数据
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RuleExecutionLog = typeof ruleExecutionLogs.$inferSelect;
export type InsertRuleExecutionLog = typeof ruleExecutionLogs.$inferInsert;

/**
 * Rule Templates - 规则模板
 * 预定义的规则模板，用户可以快速应用
 */
export const ruleTemplates = mysqlTable("ruleTemplates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).notNull(), // safety, productivity, quality, etc
  
  // 规则配置 (JSON 数组)
  rules: text("rules").notNull(), // JSON: 规则配置数组
  
  isPublic: boolean("isPublic").notNull().default(false),
  createdBy: int("createdBy"), // 如果是用户创建的模板
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RuleTemplate = typeof ruleTemplates.$inferSelect;
export type InsertRuleTemplate = typeof ruleTemplates.$inferInsert;
