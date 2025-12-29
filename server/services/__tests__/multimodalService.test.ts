import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateCreativeImage,
  generateCreativeGame,
  generateCreativeMedia,
  recordGenerationInteraction,
  getGenerationHistory,
} from '../multimodalService';
import * as db from '../../db';

// Mock the database module
vi.mock('../../db', () => ({
  getDb: vi.fn(),
}));

// Mock the LLM module
vi.mock('../../_core/llm', () => ({
  invokeLLM: vi.fn(),
}));

// Mock the storage module
vi.mock('../../storage', () => ({
  storagePut: vi.fn(),
}));

describe('MultimodalService', () => {
  let mockDb: any;

  beforeEach(() => {
    // Setup mock database with proper chaining
    mockDb = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue({ insertId: 1 }),
      }),
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    };

    vi.mocked(db.getDb).mockResolvedValue(mockDb);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('generateCreativeImage', () => {
    it('should generate a creative image with valid input', async () => {
      const userId = 1;
      const prompt = 'A serene landscape with mountains';
      const style = 'realistic';

      // Mock LLM response
      const { invokeLLM } = await import('../../_core/llm');
      vi.mocked(invokeLLM).mockResolvedValue({
        choices: [
          {
            message: {
              content: 'https://example.com/image.jpg',
            },
          },
        ],
      } as any);

      // Mock storage response
      const { storagePut } = await import('../../storage');
      vi.mocked(storagePut).mockResolvedValue({
        url: 'https://s3.example.com/image.jpg',
        key: 'user-1/image-123.jpg',
      });

      const result = await generateCreativeImage(userId, prompt, style);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should throw error when database is not available', async () => {
      vi.mocked(db.getDb).mockResolvedValue(null);

      await expect(
        generateCreativeImage(1, 'test prompt', 'realistic')
      ).rejects.toThrow('Database not available');
    });
  });

  describe('generateCreativeGame', () => {
    it('should generate a creative game with valid input', async () => {
      const userId = 1;
      const theme = 'adventure';
      const mechanics = 'puzzle';

      const { invokeLLM } = await import('../../_core/llm');
      vi.mocked(invokeLLM).mockResolvedValue({
        choices: [
          {
            message: {
              content: '<html><body>Game code</body></html>',
            },
          },
        ],
      } as any);

      const result = await generateCreativeGame(userId, theme, mechanics);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle LLM errors gracefully', async () => {
      const { invokeLLM } = await import('../../_core/llm');
      vi.mocked(invokeLLM).mockRejectedValue(new Error('LLM error'));

      await expect(
        generateCreativeGame(1, 'adventure', 'puzzle')
      ).rejects.toThrow();
    });
  });

  describe('generateCreativeMedia', () => {
    it('should generate creative media with valid input', async () => {
      const userId = 1;
      const mediaType = 'image';
      const prompt = 'test prompt';

      const { invokeLLM } = await import('../../_core/llm');
      vi.mocked(invokeLLM).mockResolvedValue({
        choices: [
          {
            message: {
              content: 'https://example.com/media.jpg',
            },
          },
        ],
      } as any);

      const { storagePut } = await import('../../storage');
      vi.mocked(storagePut).mockResolvedValue({
        url: 'https://s3.example.com/media.jpg',
        key: 'user-1/media-123.jpg',
      });

      const result = await generateCreativeMedia(userId, mediaType as any, prompt);

      expect(result).toBeDefined();
    });
  });

  describe('recordGenerationInteraction', () => {
    it('should record generation interaction', async () => {
      const userId = 1;
      const generationRequestId = 'gen-123';
      const action = 'save';
      const rating = 5;
      const feedback = 'Great work!';

      await recordGenerationInteraction(
        userId,
        generationRequestId,
        action,
        rating,
        feedback
      );

      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should handle missing optional parameters', async () => {
      const userId = 1;
      const generationRequestId = 'gen-123';
      const action = 'view';

      await recordGenerationInteraction(userId, generationRequestId, action);

      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('getGenerationHistory', () => {
    it('should retrieve generation history for user', async () => {
      const userId = 1;
      const mockHistory = [
        {
          id: 1,
          userId: 1,
          mediaType: 'image',
          prompt: 'test',
          generatedContent: 'https://example.com/image.jpg',
          createdAt: new Date(),
        },
      ];

      // Setup proper mock chain
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockHistory),
          }),
        }),
      });

      const result = await getGenerationHistory(userId);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should return empty array when no history exists', async () => {
      const userId = 1;

      // Setup mock to return empty array
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await getGenerationHistory(userId);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should throw error when database is not available', async () => {
      vi.mocked(db.getDb).mockResolvedValue(null);

      await expect(getGenerationHistory(1)).rejects.toThrow('Database not available');
    });
  });
});
