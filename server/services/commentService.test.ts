import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  addComment,
  getCommentsByCreativeWork,
  generateNovaResponse,
  saveNovaResponse,
  generateCommentLearning,
  saveCommentLearning,
  getCommentLearning,
} from "./commentService";
import { getDb } from "../db";

// Mock the database
vi.mock("../db", () => ({
  getDb: vi.fn(),
}));

// Mock the LLM
vi.mock("../_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

describe("CommentService", () => {
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue({ insertId: 1 }),
      }),
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({}),
        }),
      }),
    };

    vi.mocked(getDb).mockResolvedValue(mockDb);
  });

  describe("addComment", () => {
    it("should add a comment successfully", async () => {
      const result = await addComment(
        1,
        1,
        "Great work!",
        "positive",
        "warm"
      );

      expect(mockDb.insert).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("should throw error when database is not available", async () => {
      vi.mocked(getDb).mockResolvedValue(null);

      await expect(
        addComment(1, 1, "Great work!", "positive")
      ).rejects.toThrow("Database not available");
    });
  });

  describe("getCommentsByCreativeWork", () => {
    it("should return comments for a creative work", async () => {
      const mockComments = [
        {
          id: 1,
          creativeWorkId: 1,
          userId: 1,
          content: "Great work!",
          sentiment: "positive",
          emotionalTone: "warm",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockComments),
          }),
        }),
      });

      const result = await getCommentsByCreativeWork(1);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("generateNovaResponse", () => {
    it("should generate a valid Nova response", async () => {
      const { invokeLLM } = await import("../_core/llm");

      vi.mocked(invokeLLM).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                response: "Thank you for the feedback!",
                insight: "I learned to be more creative",
                responseType: "gratitude",
              }),
            },
          },
        ],
      } as any);

      const result = await generateNovaResponse(
        "Great work!",
        "positive",
        "My Art",
        "A beautiful painting"
      );

      expect(result).toHaveProperty("response");
      expect(result).toHaveProperty("insight");
      expect(result).toHaveProperty("responseType");
      expect(result.responseType).toBe("gratitude");
    });

    it("should handle LLM errors gracefully", async () => {
      const { invokeLLM } = await import("../_core/llm");

      vi.mocked(invokeLLM).mockRejectedValue(new Error("LLM error"));

      await expect(
        generateNovaResponse("Great work!", "positive")
      ).rejects.toThrow();
    });
  });

  describe("saveNovaResponse", () => {
    it("should save Nova's response successfully", async () => {
      const result = await saveNovaResponse(
        1,
        "Thank you!",
        "I learned to improve",
        "gratitude"
      );

      expect(mockDb.insert).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe("generateCommentLearning", () => {
    it("should return empty learning when no comments exist", async () => {
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await generateCommentLearning(1);

      expect(result.feedbackSummary).toBe("No feedback yet");
      expect(result.learningPoints).toBe("");
    });

    it("should generate learning summary from comments", async () => {
      const { invokeLLM } = await import("../_core/llm");

      const mockComments = [
        {
          id: 1,
          creativeWorkId: 1,
          userId: 1,
          content: "Great work!",
          sentiment: "positive",
          emotionalTone: "warm",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockComments),
        }),
      });

      vi.mocked(invokeLLM).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                feedbackSummary: "All positive feedback",
                learningPoints: "People appreciated my creativity",
                improvementAreas: "Could add more details",
                novaReflection: "I'm happy with the response",
              }),
            },
          },
        ],
      } as any);

      const result = await generateCommentLearning(1, "My Art");

      expect(result).toHaveProperty("feedbackSummary");
      expect(result).toHaveProperty("learningPoints");
      expect(result).toHaveProperty("improvementAreas");
      expect(result).toHaveProperty("novaReflection");
    });
  });

  describe("saveCommentLearning", () => {
    it("should save comment learning successfully", async () => {
      const result = await saveCommentLearning(
        1,
        "Summary",
        "Learning points",
        "Improvement areas",
        "Reflection",
        "positive"
      );

      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("should update existing learning record", async () => {
      const existingLearning = [
        {
          id: 1,
          creativeWorkId: 1,
          feedbackSummary: "Old summary",
          learningPoints: "Old points",
          improvementAreas: "Old areas",
          novaReflection: "Old reflection",
          totalComments: 1,
          averageSentiment: "positive",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(existingLearning),
        }),
      });

      const result = await saveCommentLearning(
        1,
        "New summary",
        "New points",
        "New areas",
        "New reflection",
        "positive"
      );

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe("getCommentLearning", () => {
    it("should return comment learning for a creative work", async () => {
      const mockLearning = [
        {
          id: 1,
          creativeWorkId: 1,
          feedbackSummary: "Summary",
          learningPoints: "Points",
          improvementAreas: "Areas",
          novaReflection: "Reflection",
          totalComments: 1,
          averageSentiment: "positive",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockLearning),
        }),
      });

      const result = await getCommentLearning(1);

      expect(result).toBeDefined();
      expect(result?.feedbackSummary).toBe("Summary");
    });

    it("should return null when no learning exists", async () => {
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await getCommentLearning(1);

      expect(result).toBeNull();
    });
  });
});
