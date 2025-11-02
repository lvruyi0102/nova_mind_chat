import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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