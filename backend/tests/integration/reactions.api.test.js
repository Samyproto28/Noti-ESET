import request from 'supertest';
import express from 'express';
import { jest } from '@jest/globals';

// Mock de Supabase
const mockSupabase = {
  from: jest.fn()
};

// Mock del módulo supabaseClient
jest.mock('../../src/config/supabaseClient.js', () => ({
  supabase: mockSupabase
}));

// Mock del módulo userService
jest.mock('../../src/services/userService.js', () => ({
  getUserIdForForum: jest.fn((userId) => userId || '00000000-0000-0000-0000-000000000000')
}));

// Importar las rutas de reacciones
import reactionRoutes from '../../src/routes/reaction.routes.js';

// Crear una aplicación Express para las pruebas
const app = express();
app.use(express.json());
app.use('/api/reactions', reactionRoutes);

describe('Reactions API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/reactions/toggle', () => {
    it('should create a new reaction for a post', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const postId = '456e7890-e89b-12d3-a456-426614174000';
      const reactionData = {
        post_id: postId,
        reaction_type: 'like'
      };
      
      const mockNewReaction = {
        id: '1',
        user_id: userId,
        post_id: postId,
        reaction_type: 'like',
        action: 'created',
        created_at: '2023-01-01T00:00:00Z'
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

      // Mock de autenticación
      const mockUser = { id: userId };
      
      const response = await request(app)
        .post('/api/reactions/toggle')
        .set('Authorization', `Bearer mock-token`)
        .send(reactionData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockNewReaction);
      expect(response.body.message).toBe('Reacción creada exitosamente');
    });

    it('should create a new reaction for a comment', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const commentId = '789e0123-e89b-12d3-a456-426614174000';
      const reactionData = {
        comment_id: commentId,
        reaction_type: 'love'
      };
      
      const mockNewReaction = {
        id: '1',
        user_id: userId,
        comment_id: commentId,
        reaction_type: 'love',
        action: 'created',
        created_at: '2023-01-01T00:00:00Z'
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

      const response = await request(app)
        .post('/api/reactions/toggle')
        .send(reactionData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockNewReaction);
      expect(response.body.message).toBe('Reacción creada exitosamente');
    });

    it('should remove existing reaction if same type', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const postId = '456e7890-e89b-12d3-a456-426614174000';
      const reactionData = {
        post_id: postId,
        reaction_type: 'like'
      };
      
      const mockExistingReaction = {
        id: '1',
        user_id: userId,
        post_id: postId,
        reaction_type: 'like'
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

      const response = await request(app)
        .post('/api/reactions/toggle')
        .send(reactionData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({ action: 'removed', reaction_type: 'like' });
      expect(response.body.message).toBe('Reacción eliminada exitosamente');
    });

    it('should update existing reaction if different type', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const postId = '456e7890-e89b-12d3-a456-426614174000';
      const reactionData = {
        post_id: postId,
        reaction_type: 'love'
      };
      
      const mockExistingReaction = {
        id: '1',
        user_id: userId,
        post_id: postId,
        reaction_type: 'like'
      };

      const mockUpdatedReaction = {
        ...mockExistingReaction,
        reaction_type: 'love',
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

      const response = await request(app)
        .post('/api/reactions/toggle')
        .send(reactionData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockUpdatedReaction);
      expect(response.body.message).toBe('Reacción actualizada exitosamente');
    });

    it('should reject invalid reaction type', async () => {
      const reactionData = {
        post_id: '456e7890-e89b-12d3-a456-426614174000',
        reaction_type: 'invalid'
      };

      const response = await request(app)
        .post('/api/reactions/toggle')
        .send(reactionData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Tipo de reacción inválido');
    });

    it('should reject when both post_id and comment_id are provided', async () => {
      const reactionData = {
        post_id: '456e7890-e89b-12d3-a456-426614174000',
        comment_id: '789e0123-e89b-12d3-a456-426614174000',
        reaction_type: 'like'
      };

      const response = await request(app)
        .post('/api/reactions/toggle')
        .send(reactionData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Debe especificar postId O commentId, no ambos');
    });

    it('should reject when neither post_id nor comment_id are provided', async () => {
      const reactionData = {
        reaction_type: 'like'
      };

      const response = await request(app)
        .post('/api/reactions/toggle')
        .send(reactionData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Debe especificar postId O commentId, no ambos');
    });
  });

  describe('GET /api/reactions/posts/:postId', () => {
    it('should get reactions for a post', async () => {
      const postId = '456e7890-e89b-12d3-a456-426614174000';
      const mockReactions = [
        {
          id: '1',
          post_id: postId,
          reaction_type: 'like',
          user_profiles: { username: 'testuser' },
          created_at: '2023-01-01T00:00:00Z'
        },
        {
          id: '2',
          post_id: postId,
          reaction_type: 'love',
          user_profiles: { username: 'testuser2' },
          created_at: '2023-01-01T00:01:00Z'
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: mockReactions, error: null })
          })
        })
      });

      const response = await request(app)
        .get(`/api/reactions/posts/${postId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockReactions);
      expect(response.body.message).toBe('Reacciones de post obtenidas exitosamente');
    });

    it('should handle errors when getting post reactions', async () => {
      const postId = '456e7890-e89b-12d3-a456-426614174000';

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: null, error: new Error('Database error') })
          })
        })
      });

      const response = await request(app)
        .get(`/api/reactions/posts/${postId}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Database error');
    });

    it('should reject invalid post ID', async () => {
      const response = await request(app)
        .get('/api/reactions/posts/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/reactions/comments/:commentId', () => {
    it('should get reactions for a comment', async () => {
      const commentId = '789e0123-e89b-12d3-a456-426614174000';
      const mockReactions = [
        {
          id: '1',
          comment_id: commentId,
          reaction_type: 'like',
          user_profiles: { username: 'testuser' },
          created_at: '2023-01-01T00:00:00Z'
        },
        {
          id: '2',
          comment_id: commentId,
          reaction_type: 'laugh',
          user_profiles: { username: 'testuser2' },
          created_at: '2023-01-01T00:01:00Z'
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: mockReactions, error: null })
          })
        })
      });

      const response = await request(app)
        .get(`/api/reactions/comments/${commentId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockReactions);
      expect(response.body.message).toBe('Reacciones de comentario obtenidas exitosamente');
    });

    it('should reject invalid comment ID', async () => {
      const response = await request(app)
        .get('/api/reactions/comments/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/reactions/posts/:postId/counts', () => {
    it('should get reaction counts for a post', async () => {
      const postId = '456e7890-e89b-12d3-a456-426614174000';
      const mockCounts = [
        { reaction_type: 'like', count: 5 },
        { reaction_type: 'love', count: 3 },
        { reaction_type: 'laugh', count: 2 }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: mockCounts, error: null })
          })
        })
      });

      const response = await request(app)
        .get(`/api/reactions/posts/${postId}/counts`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        like: 5,
        love: 3,
        laugh: 2
      });
      expect(response.body.message).toBe('Conteos de reacciones de post obtenidos exitosamente');
    });

    it('should handle errors when getting post reaction counts', async () => {
      const postId = '456e7890-e89b-12d3-a456-426614174000';

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: null, error: new Error('Database error') })
          })
        })
      });

      const response = await request(app)
        .get(`/api/reactions/posts/${postId}/counts`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Database error');
    });
  });

  describe('GET /api/reactions/comments/:commentId/counts', () => {
    it('should get reaction counts for a comment', async () => {
      const commentId = '789e0123-e89b-12d3-a456-426614174000';
      const mockCounts = [
        { reaction_type: 'like', count: 2 },
        { reaction_type: 'wow', count: 1 }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: mockCounts, error: null })
          })
        })
      });

      const response = await request(app)
        .get(`/api/reactions/comments/${commentId}/counts`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        like: 2,
        wow: 1
      });
      expect(response.body.message).toBe('Conteos de reacciones de comentario obtenidos exitosamente');
    });
  });

  describe('GET /api/reactions/user/:userId', () => {
    it('should get all reactions for a user', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const mockReactions = [
        {
          id: '1',
          user_id: userId,
          post_id: '456e7890-e89b-12d3-a456-426614174000',
          reaction_type: 'like',
          forum_posts: { id: '456e7890-e89b-12d3-a456-426614174000', title: 'Test Post' },
          created_at: '2023-01-01T00:00:00Z'
        },
        {
          id: '2',
          user_id: userId,
          comment_id: '789e0123-e89b-12d3-a456-426614174000',
          reaction_type: 'love',
          forum_comments: { id: '789e0123-e89b-12d3-a456-426614174000', content: 'Test comment' },
          created_at: '2023-01-01T00:01:00Z'
        }
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

      const response = await request(app)
        .get(`/api/reactions/user/${userId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockReactions);
      expect(response.body.message).toBe('Reacciones de usuario obtenidas exitosamente');
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

      const response = await request(app)
        .get(`/api/reactions/user/${userId}?limit=${options.limit}&offset=${options.offset}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockReactions);
    });

    it('should reject invalid user ID', async () => {
      const response = await request(app)
        .get('/api/reactions/user/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('DELETE /api/reactions/remove', () => {
    it('should remove reaction for a post', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const postId = '456e7890-e89b-12d3-a456-426614174000';
      const reactionData = {
        post_id: postId
      };

      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: null, error: null })
          })
        })
      });

      const response = await request(app)
        .delete('/api/reactions/remove')
        .send(reactionData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Reacción eliminada exitosamente');
    });

    it('should remove reaction for a comment', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const commentId = '789e0123-e89b-12d3-a456-426614174000';
      const reactionData = {
        comment_id: commentId
      };

      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: null, error: null })
          })
        })
      });

      const response = await request(app)
        .delete('/api/reactions/remove')
        .send(reactionData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Reacción eliminada exitosamente');
    });

    it('should reject when neither post_id nor comment_id are provided', async () => {
      const reactionData = {};

      const response = await request(app)
        .delete('/api/reactions/remove')
        .send(reactionData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Debe especificar postId o commentId');
    });
  });

  describe('GET /api/reactions/posts/popular', () => {
    it('should get most reacted posts with default parameters', async () => {
      const mockPosts = [
        {
          id: '1',
          title: 'Popular Post 1',
          upvotes_count: 10,
          downvotes_count: 2,
          forum_categories: { name: 'General', color: '#3B82F6' },
          user_profiles: { username: 'testuser' }
        },
        {
          id: '2',
          title: 'Popular Post 2',
          upvotes_count: 8,
          downvotes_count: 1,
          forum_categories: { name: 'Technical', color: '#10B981' },
          user_profiles: { username: 'testuser2' }
        }
      ];

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

      const response = await request(app)
        .get('/api/reactions/posts/popular')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPosts);
      expect(response.body.message).toBe('Posts más reaccionados obtenidos exitosamente');
    });

    it('should get most reacted posts with custom parameters', async () => {
      const options = {
        limit: 5,
        reaction_type: 'love',
        timeframe: 'month'
      };
      const mockPosts = [{ id: '1', title: 'Popular Post', upvotes_count: 10 }];

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

      const response = await request(app)
        .get(`/api/reactions/posts/popular?limit=${options.limit}&timeframe=${options.timeframe}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPosts);
    });

    it('should handle errors when getting most reacted posts', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({ data: null, error: new Error('Database error') })
              })
            })
          })
        })
      });

      const response = await request(app)
        .get('/api/reactions/posts/popular')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Database error');
    });
  });
});