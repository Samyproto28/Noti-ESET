import {
  REACTION_TYPES,
  toggleReaction,
  getPostReactions,
  getCommentReactions,
  getPostReactionCounts,
  getCommentReactionCounts,
  getUserReaction,
  getUserReactions,
  removeReaction,
  getMostReactedPosts
} from '../../../src/services/reactionService.js';
import { jest } from '@jest/globals';

// Mock de Supabase
const mockSupabase = {
  from: jest.fn()
};

// Mock del módulo supabaseClient
jest.mock('../../../src/config/supabaseClient.js', () => ({
  supabase: mockSupabase
}));

describe('ReactionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('REACTION_TYPES', () => {
    it('should have correct reaction types', () => {
      expect(REACTION_TYPES).toEqual({
        LIKE: 'like',
        DISLIKE: 'dislike',
        LOVE: 'love',
        LAUGH: 'laugh',
        WOW: 'wow',
        ANGRY: 'angry',
        SAD: 'sad'
      });
    });
  });

  describe('toggleReaction', () => {
    it('should create a new reaction for a post', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const postId = '456e7890-e89b-12d3-a456-426614174000';
      const reactionType = REACTION_TYPES.LIKE;
      
      const mockNewReaction = {
        id: '1',
        user_id: userId,
        post_id: postId,
        reaction_type: reactionType,
        action: 'created'
      };

      // Mock para buscar reacción existente (no encuentra)
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ 
                data: null, 
                error: { code: 'PGRST116' } // No rows found
              })
            })
          })
        })
      });

      // Mock para crear nueva reacción
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockNewReaction, error: null })
          })
        })
      });

      const result = await toggleReaction(userId, { postId, reactionType });

      expect(result.data).toEqual(mockNewReaction);
      expect(result.error).toBeNull();
    });

    it('should create a new reaction for a comment', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const commentId = '789e0123-e89b-12d3-a456-426614174000';
      const reactionType = REACTION_TYPES.LOVE;
      
      const mockNewReaction = {
        id: '1',
        user_id: userId,
        comment_id: commentId,
        reaction_type: reactionType,
        action: 'created'
      };

      // Mock para buscar reacción existente (no encuentra)
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ 
                data: null, 
                error: { code: 'PGRST116' } // No rows found
              })
            })
          })
        })
      });

      // Mock para crear nueva reacción
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockNewReaction, error: null })
          })
        })
      });

      const result = await toggleReaction(userId, { commentId, reactionType });

      expect(result.data).toEqual(mockNewReaction);
      expect(result.error).toBeNull();
    });

    it('should remove existing reaction if same type', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const postId = '456e7890-e89b-12d3-a456-426614174000';
      const reactionType = REACTION_TYPES.LIKE;
      
      const mockExistingReaction = {
        id: '1',
        user_id: userId,
        post_id: postId,
        reaction_type: reactionType
      };

      // Mock para buscar reacción existente (encuentra)
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockExistingReaction, error: null })
            })
          })
        })
      });

      // Mock para eliminar reacción
      mockSupabase.from.mockReturnValueOnce({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null, error: null })
        })
      });

      const result = await toggleReaction(userId, { postId, reactionType });

      expect(result.data).toEqual({ action: 'removed', reaction_type: reactionType });
      expect(result.error).toBeNull();
    });

    it('should update existing reaction if different type', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const postId = '456e7890-e89b-12d3-a456-426614174000';
      const existingReactionType = REACTION_TYPES.LIKE;
      const newReactionType = REACTION_TYPES.LOVE;
      
      const mockExistingReaction = {
        id: '1',
        user_id: userId,
        post_id: postId,
        reaction_type: existingReactionType
      };

      const mockUpdatedReaction = {
        ...mockExistingReaction,
        reaction_type: newReactionType,
        action: 'updated'
      };

      // Mock para buscar reacción existente (encuentra)
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockExistingReaction, error: null })
            })
          })
        })
      });

      // Mock para actualizar reacción
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockUpdatedReaction, error: null })
            })
          })
        })
      });

      const result = await toggleReaction(userId, { postId, reactionType: newReactionType });

      expect(result.data).toEqual(mockUpdatedReaction);
      expect(result.error).toBeNull();
    });

    it('should reject invalid reaction type', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const postId = '456e7890-e89b-12d3-a456-426614174000';
      const invalidReactionType = 'invalid';

      await expect(toggleReaction(userId, { postId, reactionType: invalidReactionType }))
        .rejects.toThrow('Tipo de reacción inválido');
    });

    it('should reject when both postId and commentId are provided', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const postId = '456e7890-e89b-12d3-a456-426614174000';
      const commentId = '789e0123-e89b-12d3-a456-426614174000';
      const reactionType = REACTION_TYPES.LIKE;

      await expect(toggleReaction(userId, { postId, commentId, reactionType }))
        .rejects.toThrow('Debe especificar postId O commentId, no ambos');
    });

    it('should reject when neither postId nor commentId are provided', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const reactionType = REACTION_TYPES.LIKE;

      await expect(toggleReaction(userId, { reactionType }))
        .rejects.toThrow('Debe especificar postId O commentId, no ambos');
    });
  });

  describe('getPostReactions', () => {
    it('should get reactions for a post', async () => {
      const postId = '456e7890-e89b-12d3-a456-426614174000';
      const mockReactions = [
        { id: '1', post_id: postId, reaction_type: REACTION_TYPES.LIKE },
        { id: '2', post_id: postId, reaction_type: REACTION_TYPES.LOVE }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: mockReactions, error: null })
          })
        })
      });

      const result = await getPostReactions(postId);

      expect(result.data).toEqual(mockReactions);
      expect(result.error).toBeNull();
    });

    it('should handle errors when getting post reactions', async () => {
      const postId = 'invalid-id';
      const mockError = new Error('Database error');

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: null, error: mockError })
          })
        })
      });

      const result = await getPostReactions(postId);

      expect(result.error).toEqual(mockError);
    });
  });

  describe('getCommentReactions', () => {
    it('should get reactions for a comment', async () => {
      const commentId = '789e0123-e89b-12d3-a456-426614174000';
      const mockReactions = [
        { id: '1', comment_id: commentId, reaction_type: REACTION_TYPES.LIKE },
        { id: '2', comment_id: commentId, reaction_type: REACTION_TYPES.LAUGH }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: mockReactions, error: null })
          })
        })
      });

      const result = await getCommentReactions(commentId);

      expect(result.data).toEqual(mockReactions);
      expect(result.error).toBeNull();
    });
  });

  describe('getPostReactionCounts', () => {
    it('should get reaction counts for a post', async () => {
      const postId = '456e7890-e89b-12d3-a456-426614174000';
      const mockCounts = [
        { reaction_type: REACTION_TYPES.LIKE, count: 5 },
        { reaction_type: REACTION_TYPES.LOVE, count: 3 }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: mockCounts, error: null })
          })
        })
      });

      const result = await getPostReactionCounts(postId);

      expect(result.data).toEqual({
        [REACTION_TYPES.LIKE]: 5,
        [REACTION_TYPES.LOVE]: 3
      });
      expect(result.error).toBeNull();
    });

    it('should handle errors when getting post reaction counts', async () => {
      const postId = 'invalid-id';
      const mockError = new Error('Database error');

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: null, error: mockError })
          })
        })
      });

      const result = await getPostReactionCounts(postId);

      expect(result.error).toEqual(mockError);
    });
  });

  describe('getCommentReactionCounts', () => {
    it('should get reaction counts for a comment', async () => {
      const commentId = '789e0123-e89b-12d3-a456-426614174000';
      const mockCounts = [
        { reaction_type: REACTION_TYPES.LIKE, count: 2 },
        { reaction_type: REACTION_TYPES.WOW, count: 1 }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: mockCounts, error: null })
          })
        })
      });

      const result = await getCommentReactionCounts(commentId);

      expect(result.data).toEqual({
        [REACTION_TYPES.LIKE]: 2,
        [REACTION_TYPES.WOW]: 1
      });
      expect(result.error).toBeNull();
    });
  });

  describe('getUserReaction', () => {
    it('should get user reaction for a post', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const postId = '456e7890-e89b-12d3-a456-426614174000';
      const mockReaction = { reaction_type: REACTION_TYPES.LIKE };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockReaction, error: null })
            })
          })
        })
      });

      const result = await getUserReaction(userId, { postId });

      expect(result.data).toEqual(mockReaction);
      expect(result.error).toBeNull();
    });

    it('should return null when user has no reaction', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const postId = '456e7890-e89b-12d3-a456-426614174000';

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ 
                data: null, 
                error: { code: 'PGRST116' } // No rows found
              })
            })
          })
        })
      });

      const result = await getUserReaction(userId, { postId });

      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
    });

    it('should reject when neither postId nor commentId are provided', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';

      const result = await getUserReaction(userId, {});

      expect(result.data).toBeNull();
      expect(result.error.message).toContain('Debe especificar postId o commentId');
    });
  });

  describe('getUserReactions', () => {
    it('should get all reactions for a user', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const mockReactions = [
        { id: '1', user_id: userId, reaction_type: REACTION_TYPES.LIKE },
        { id: '2', user_id: userId, reaction_type: REACTION_TYPES.LOVE }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({ data: mockReactions, error: null })
            })
          })
        })
      });

      const result = await getUserReactions(userId);

      expect(result.data).toEqual(mockReactions);
      expect(result.error).toBeNull();
    });

    it('should get reactions with custom parameters', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const options = { limit: 10, offset: 20 };
      const mockReactions = [{ id: '1', user_id: userId }];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({ data: mockReactions, error: null })
            })
          })
        })
      });

      const result = await getUserReactions(userId, options);

      expect(result.data).toEqual(mockReactions);
      expect(result.error).toBeNull();
    });
  });

  describe('removeReaction', () => {
    it('should remove reaction for a post', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const postId = '456e7890-e89b-12d3-a456-426614174000';

      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: null, error: null })
          })
        })
      });

      const result = await removeReaction(userId, { postId });

      expect(result.error).toBeNull();
    });

    it('should remove reaction for a comment', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const commentId = '789e0123-e89b-12d3-a456-426614174000';

      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: null, error: null })
          })
        })
      });

      const result = await removeReaction(userId, { commentId });

      expect(result.error).toBeNull();
    });

    it('should reject when neither postId nor commentId are provided', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';

      const result = await removeReaction(userId, {});

      expect(result.data).toBeNull();
      expect(result.error.message).toContain('Debe especificar postId o commentId');
    });
  });

  describe('getMostReactedPosts', () => {
    it('should get most reacted posts with default parameters', async () => {
      const mockPosts = [
        { id: '1', title: 'Post 1', upvotes_count: 10 },
        { id: '2', title: 'Post 2', upvotes_count: 8 }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: mockPosts, error: null })
            })
          })
        })
      });

      const result = await getMostReactedPosts();

      expect(result.data).toEqual(mockPosts);
      expect(result.error).toBeNull();
    });

    it('should get most reacted posts with custom parameters', async () => {
      const options = {
        limit: 5,
        reactionType: REACTION_TYPES.LOVE,
        timeframe: 'week'
      };
      const mockPosts = [{ id: '1', title: 'Post 1', upvotes_count: 10 }];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({ data: mockPosts, error: null })
              })
            })
          })
        })
      });

      const result = await getMostReactedPosts(options);

      expect(result.data).toEqual(mockPosts);
      expect(result.error).toBeNull();
    });

    it('should handle different timeframes', async () => {
      const weekTimeframe = 'week';
      const monthTimeframe = 'month';
      const yearTimeframe = 'year';

      // Test week timeframe
      await getMostReactedPosts({ timeframe: weekTimeframe });
      
      // Test month timeframe
      await getMostReactedPosts({ timeframe: monthTimeframe });
      
      // Test year timeframe
      await getMostReactedPosts({ timeframe: yearTimeframe });

      // Verify that the function was called with different timeframes
      expect(mockSupabase.from).toHaveBeenCalledTimes(3);
    });

    it('should handle errors when getting most reacted posts', async () => {
      const mockError = new Error('Database error');

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: null, error: mockError })
            })
          })
        })
      });

      const result = await getMostReactedPosts();

      expect(result.error).toEqual(mockError);
    });
  });
});