import request from 'supertest';
import express from 'express';
import { jest } from '@jest/globals';

// Mock de Supabase
const mockSupabase = {
  from: jest.fn(),
  rpc: jest.fn()
};

// Mock del módulo supabaseClient
jest.mock('../../src/config/supabaseClient.js', () => ({
  supabase: mockSupabase
}));

// Mock del módulo userService
jest.mock('../../src/services/userService.js', () => ({
  getUserIdForForum: jest.fn((userId) => userId || '00000000-0000-0000-0000-000000000000')
}));

// Importar las rutas del foro
import forumRoutes from '../../src/routes/forum.routes.js';

// Crear una aplicación Express para las pruebas
const app = express();
app.use(express.json());
app.use('/api/forum', forumRoutes);

describe('Forum API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/forum/posts', () => {
    it('should get posts with default parameters', async () => {
      const mockPosts = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Test Post 1',
          content: 'Content for test post 1',
          created_at: '2023-01-01T00:00:00Z',
          forum_categories: { id: '1', name: 'General' },
          user_profiles: { username: 'testuser' }
        },
        {
          id: '456e7890-e89b-12d3-a456-426614174000',
          title: 'Test Post 2',
          content: 'Content for test post 2',
          created_at: '2023-01-02T00:00:00Z',
          forum_categories: { id: '2', name: 'Technical' },
          user_profiles: { username: 'testuser2' }
        }
      ];

      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockPosts, error: null })
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQuery)
      });

      // Mock para countPosts
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            count: 'exact',
            head: true
          })
        })
      });

      const response = await request(app)
        .get('/api/forum/posts')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPosts);
      expect(response.body.message).toBe('Posts obtenidos exitosamente');
    });

    it('should get posts with query parameters', async () => {
      const mockPosts = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Test Post',
          content: 'Content for test post',
          created_at: '2023-01-01T00:00:00Z'
        }
      ];

      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockPosts, error: null })
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQuery)
      });

      const response = await request(app)
        .get('/api/forum/posts?limit=10&offset=5&categoryId=123e4567-e89b-12d3-a456-426614174000&sortBy=title&sortOrder=asc')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPosts);
    });

    it('should handle database errors', async () => {
      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: new Error('Database error') })
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQuery)
      });

      const response = await request(app)
        .get('/api/forum/posts')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Database error');
    });
  });

  describe('GET /api/forum/posts/:id', () => {
    it('should get post by ID', async () => {
      const postId = '123e4567-e89b-12d3-a456-426614174000';
      const mockPost = {
        id: postId,
        title: 'Test Post',
        content: 'Content for test post',
        created_at: '2023-01-01T00:00:00Z',
        forum_categories: { id: '1', name: 'General' },
        user_profiles: { username: 'testuser' }
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockPost, error: null })
          })
        })
      });

      const response = await request(app)
        .get(`/api/forum/posts/${postId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPost);
      expect(response.body.message).toBe('Post obtenido exitosamente');
    });

    it('should return 404 for non-existent post', async () => {
      const postId = '123e4567-e89b-12d3-a456-426614174000';

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: new Error('Post not found') })
          })
        })
      });

      const response = await request(app)
        .get(`/api/forum/posts/${postId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Post not found');
    });

    it('should return 400 for invalid post ID', async () => {
      const response = await request(app)
        .get('/api/forum/posts/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/forum/posts', () => {
    it('should create a new post', async () => {
      const postData = {
        title: 'New Test Post',
        content: 'Content for new test post with more than 10 characters',
        category_id: '123e4567-e89b-12d3-a456-426614174000'
      };

      const mockCreatedPost = {
        id: '789e0123-e89b-12d3-a456-426614174000',
        ...postData,
        created_at: '2023-01-01T00:00:00Z',
        user_id: '00000000-0000-0000-0000-000000000000'
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockCreatedPost, error: null })
          })
        })
      });

      const response = await request(app)
        .post('/api/forum/posts')
        .send(postData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockCreatedPost);
      expect(response.body.message).toBe('Post creado exitosamente');
    });

    it('should reject post with title too short', async () => {
      const postData = {
        title: 'Bad', // Too short
        content: 'Content for test post with more than 10 characters'
      };

      const response = await request(app)
        .post('/api/forum/posts')
        .send(postData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should reject post with content too short', async () => {
      const postData = {
        title: 'Valid Title',
        content: 'Short' // Too short
      };

      const response = await request(app)
        .post('/api/forum/posts')
        .send(postData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should reject post with invalid category ID', async () => {
      const postData = {
        title: 'Valid Title',
        content: 'Content for test post with more than 10 characters',
        category_id: 'invalid-uuid'
      };

      const response = await request(app)
        .post('/api/forum/posts')
        .send(postData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('PUT /api/forum/posts/:id', () => {
    it('should update post with valid data', async () => {
      const postId = '123e4567-e89b-12d3-a456-426614174000';
      const updateData = {
        title: 'Updated Test Post',
        content: 'Updated content for test post with more than 10 characters'
      };

      const mockPost = {
        id: postId,
        title: 'Original Title',
        content: 'Original content'
      };

      const mockUpdatedPost = {
        ...mockPost,
        ...updateData,
        updated_at: '2023-01-01T00:00:00Z'
      };

      // Mock para getPostById
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockPost, error: null })
          })
        })
      });

      // Mock para updatePost
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockUpdatedPost, error: null })
            })
          })
        })
      });

      const response = await request(app)
        .put(`/api/forum/posts/${postId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockUpdatedPost);
      expect(response.body.message).toBe('Post actualizado exitosamente');
    });

    it('should reject update with invalid post ID', async () => {
      const updateData = {
        title: 'Updated Test Post',
        content: 'Updated content for test post with more than 10 characters'
      };

      const response = await request(app)
        .put('/api/forum/posts/invalid-id')
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('DELETE /api/forum/posts/:id', () => {
    it('should delete post with valid ID', async () => {
      const postId = '123e4567-e89b-12d3-a456-426614174000';
      const mockPost = {
        id: postId,
        title: 'Test Post',
        content: 'Content for test post'
      };

      // Mock para getPostById
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockPost, error: null })
          })
        })
      });

      // Mock para deletePost
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null, error: null })
        })
      });

      const response = await request(app)
        .delete(`/api/forum/posts/${postId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Post eliminado exitosamente');
    });

    it('should reject delete with invalid post ID', async () => {
      const response = await request(app)
        .delete('/api/forum/posts/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/forum/posts/:post_id/comments', () => {
    it('should get comments for a post', async () => {
      const postId = '123e4567-e89b-12d3-a456-426614174000';
      const mockComments = [
        {
          id: '1',
          content: 'Test comment 1',
          post_id: postId,
          created_at: '2023-01-01T00:00:00Z',
          user_profiles: { username: 'testuser' }
        },
        {
          id: '2',
          content: 'Test comment 2',
          post_id: postId,
          created_at: '2023-01-01T00:01:00Z',
          user_profiles: { username: 'testuser2' }
        }
      ];

      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ data: mockComments, error: null })
        })
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQuery)
      });

      // Mock para contar respuestas
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          count: 'exact',
          head: true
        })
      });

      const response = await request(app)
        .get(`/api/forum/posts/${postId}/comments`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockComments);
      expect(response.body.message).toBe('Comentarios obtenidos exitosamente');
    });

    it('should reject comments for invalid post ID', async () => {
      const response = await request(app)
        .get('/api/forum/posts/invalid-id/comments')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/forum/posts/:post_id/comments', () => {
    it('should create a new comment', async () => {
      const postId = '123e4567-e89b-12d3-a456-426614174000';
      const commentData = {
        content: 'New test comment'
      };

      const mockPost = {
        id: postId,
        title: 'Test Post',
        content: 'Content for test post'
      };

      const mockCreatedComment = {
        id: '1',
        ...commentData,
        post_id: postId,
        user_id: '00000000-0000-0000-0000-000000000000',
        created_at: '2023-01-01T00:00:00Z'
      };

      // Mock para getPostById
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockPost, error: null })
          })
        })
      });

      // Mock para createComment
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockCreatedComment, error: null })
          })
        })
      });

      const response = await request(app)
        .post(`/api/forum/posts/${postId}/comments`)
        .send(commentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockCreatedComment);
      expect(response.body.message).toBe('Comentario creado exitosamente');
    });

    it('should reject comment with empty content', async () => {
      const postId = '123e4567-e89b-12d3-a456-426614174000';
      const commentData = {
        content: '' // Empty content
      };

      const response = await request(app)
        .post(`/api/forum/posts/${postId}/comments`)
        .send(commentData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should reject comment for invalid post ID', async () => {
      const commentData = {
        content: 'New test comment'
      };

      const response = await request(app)
        .post('/api/forum/posts/invalid-id/comments')
        .send(commentData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/forum/search', () => {
    it('should search posts with valid query', async () => {
      const searchQuery = 'test search';
      const mockResults = [
        {
          id: '1',
          title: 'Test Post 1',
          content: 'Content with test search term',
          created_at: '2023-01-01T00:00:00Z'
        },
        {
          id: '2',
          title: 'Test Post 2',
          content: 'Content with test search term',
          created_at: '2023-01-02T00:00:00Z'
        }
      ];

      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            range: jest.fn().mockResolvedValue({ data: mockResults, error: null })
          })
        })
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQuery)
      });

      const response = await request(app)
        .get(`/api/forum/search?q=${encodeURIComponent(searchQuery)}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResults);
      expect(response.body.message).toBe('2 posts encontrados');
    });

    it('should reject search query too short', async () => {
      const response = await request(app)
        .get('/api/forum/search?q=a')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('El término de búsqueda debe tener al menos 2 caracteres');
    });
  });

  describe('GET /api/forum/posts/count', () => {
    it('should get posts count', async () => {
      const mockCount = 42;

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            count: 'exact',
            head: true
          })
        })
      });

      const response = await request(app)
        .get('/api/forum/posts/count')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.count).toBe(mockCount);
      expect(response.body.message).toBe('Conteo de posts obtenido exitosamente');
    });

    it('should get posts count with category filter', async () => {
      const categoryId = '123e4567-e89b-12d3-a456-426614174000';
      const mockCount = 10;

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              count: 'exact',
              head: true
            })
          })
        })
      });

      const response = await request(app)
        .get(`/api/forum/posts/count?categoryId=${categoryId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.count).toBe(mockCount);
    });
  });

  describe('GET /api/forum/posts/popular', () => {
    it('should get popular posts with default parameters', async () => {
      const mockPosts = [
        {
          id: '1',
          title: 'Popular Post 1',
          upvotes_count: 10,
          created_at: '2023-01-01T00:00:00Z'
        },
        {
          id: '2',
          title: 'Popular Post 2',
          upvotes_count: 8,
          created_at: '2023-01-02T00:00:00Z'
        }
      ];

      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: mockPosts, error: null })
          })
        })
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQuery)
      });

      const response = await request(app)
        .get('/api/forum/posts/popular')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPosts);
      expect(response.body.message).toBe('Posts populares obtenidos exitosamente');
    });

    it('should get popular posts with custom parameters', async () => {
      const mockPosts = [
        {
          id: '1',
          title: 'Popular Post',
          upvotes_count: 10,
          created_at: '2023-01-01T00:00:00Z'
        }
      ];

      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({ data: mockPosts, error: null })
          })
        })
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQuery)
      });

      const response = await request(app)
        .get('/api/forum/posts/popular?limit=5&timeRange=month')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPosts);
    });
  });
});