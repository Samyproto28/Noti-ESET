import {
  getAllPosts,
  getPostById,
  getPostBySlug,
  createPost,
  updatePost,
  deletePost,
  incrementPostViews,
  getCommentsByPost,
  getCommentById,
  createComment,
  createReply,
  updateComment,
  deleteComment,
  getRepliesByComment,
  searchPosts,
  countPosts,
  countCommentsByPost,
  getPopularPosts,
  validatePostData,
  validateCommentData
} from '../../../src/services/forumService.js';
import { jest } from '@jest/globals';

// Mock de Supabase
const mockSupabase = {
  from: jest.fn(),
  rpc: jest.fn()
};

// Mock del módulo supabaseClient
jest.mock('../../../src/config/supabaseClient.js', () => ({
  supabase: mockSupabase
}));

// Mock del módulo userService
jest.mock('../../../src/services/userService.js', () => ({
  getUserIdForForum: jest.fn((userId) => userId || '00000000-0000-0000-0000-000000000000')
}));

// Mock del módulo uuidValidator
jest.mock('../../../src/utils/uuidValidator.js', () => ({
  isValidUserId: jest.fn((id) => {
    // Simular validación de UUID
    return typeof id === 'string' && id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  })
}));

describe('ForumService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllPosts', () => {
    it('should get all posts with default parameters', async () => {
      const mockData = [
        { id: '1', title: 'Test Post 1', created_at: '2023-01-01' },
        { id: '2', title: 'Test Post 2', created_at: '2023-01-02' }
      ];

      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockData, error: null })
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQuery)
      });

      const result = await getAllPosts();

      expect(mockSupabase.from).toHaveBeenCalledWith('forum_posts');
      expect(result.data).toEqual(mockData);
      expect(result.error).toBeNull();
    });

    it('should get posts with category filter', async () => {
      const categoryId = '123e4567-e89b-12d3-a456-426614174000';
      const mockData = [{ id: '1', title: 'Test Post', category_id: categoryId }];

      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockData, error: null })
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQuery)
      });

      const result = await getAllPosts({ categoryId });

      expect(mockQuery.eq).toHaveBeenCalledWith('category_id', categoryId);
      expect(result.data).toEqual(mockData);
    });

    it('should handle errors when getting posts', async () => {
      const mockError = new Error('Database error');

      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: mockError })
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQuery)
      });

      const result = await getAllPosts();

      expect(result.error).toEqual(mockError);
    });
  });

  describe('getPostById', () => {
    it('should get post by ID', async () => {
      const postId = '123e4567-e89b-12d3-a456-426614174000';
      const mockData = { id: postId, title: 'Test Post' };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockData, error: null })
          })
        })
      });

      const result = await getPostById(postId);

      expect(mockSupabase.from).toHaveBeenCalledWith('forum_posts');
      expect(result.data).toEqual(mockData);
    });

    it('should handle errors when getting post by ID', async () => {
      const postId = 'invalid-id';
      const mockError = new Error('Post not found');

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: mockError })
          })
        })
      });

      const result = await getPostById(postId);

      expect(result.error).toEqual(mockError);
    });
  });

  describe('getPostBySlug', () => {
    it('should get post by slug', async () => {
      const slug = 'test-post-slug';
      const mockData = { id: '1', title: 'Test Post', slug };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockData, error: null })
            })
          })
        })
      });

      const result = await getPostBySlug(slug);

      expect(mockSupabase.from).toHaveBeenCalledWith('forum_posts');
      expect(result.data).toEqual(mockData);
    });
  });

  describe('validatePostData', () => {
    it('should validate valid post data', () => {
      const postData = {
        title: 'Valid Title',
        content: 'Valid content with more than 10 characters',
        category_id: '123e4567-e89b-12d3-a456-426614174000'
      };

      const result = validatePostData(postData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject title too short', () => {
      const postData = {
        title: 'Bad',
        content: 'Valid content with more than 10 characters'
      };

      const result = validatePostData(postData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('El título debe tener entre 5 y 200 caracteres');
    });

    it('should reject title too long', () => {
      const postData = {
        title: 'a'.repeat(201),
        content: 'Valid content with more than 10 characters'
      };

      const result = validatePostData(postData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('El título debe tener entre 5 y 200 caracteres');
    });

    it('should reject content too short', () => {
      const postData = {
        title: 'Valid Title',
        content: 'Short'
      };

      const result = validatePostData(postData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('El contenido debe tener entre 10 y 2000 caracteres');
    });

    it('should reject content too long', () => {
      const postData = {
        title: 'Valid Title',
        content: 'a'.repeat(2001)
      };

      const result = validatePostData(postData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('El contenido debe tener entre 10 y 2000 caracteres');
    });

    it('should reject invalid category ID', () => {
      const postData = {
        title: 'Valid Title',
        content: 'Valid content with more than 10 characters',
        category_id: 'invalid-uuid'
      };

      const result = validatePostData(postData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('El ID de categoría debe ser un UUID válido');
    });
  });

  describe('createPost', () => {
    it('should create a valid post', async () => {
      const postData = {
        title: 'Test Post',
        content: 'Test content with more than 10 characters',
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        category_id: '123e4567-e89b-12d3-a456-426614174000'
      };

      const mockCreatedPost = { id: '1', ...postData };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockCreatedPost, error: null })
          })
        })
      });

      const result = await createPost(postData);

      expect(result.data).toEqual(mockCreatedPost);
      expect(result.error).toBeNull();
    });

    it('should reject invalid post data', async () => {
      const postData = {
        title: 'Bad', // Too short
        content: 'Test content',
        user_id: '123e4567-e89b-12d3-a456-426614174000'
      };

      const result = await createPost(postData);

      expect(result.data).toBeNull();
      expect(result.error.message).toContain('El título debe tener entre 5 y 200 caracteres');
    });
  });

  describe('updatePost', () => {
    it('should update post with valid data', async () => {
      const postId = '123e4567-e89b-12d3-a456-426614174000';
      const updateData = {
        title: 'Updated Title',
        content: 'Updated content with more than 10 characters'
      };

      const mockUpdatedPost = { id: postId, ...updateData };

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockUpdatedPost, error: null })
            })
          })
        })
      });

      const result = await updatePost(postId, updateData);

      expect(result.data).toEqual(mockUpdatedPost);
      expect(result.error).toBeNull();
    });

    it('should reject invalid title in update', async () => {
      const postId = '123e4567-e89b-12d3-a456-426614174000';
      const updateData = {
        title: 'Bad', // Too short
        content: 'Updated content with more than 10 characters'
      };

      const result = await updatePost(postId, updateData);

      expect(result.data).toBeNull();
      expect(result.error.message).toContain('El título debe tener entre 5 y 200 caracteres');
    });
  });

  describe('deletePost', () => {
    it('should delete post with valid ID', async () => {
      const postId = '123e4567-e89b-12d3-a456-426614174000';

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null, error: null })
        })
      });

      const result = await deletePost(postId);

      expect(result.error).toBeNull();
    });

    it('should reject invalid post ID', async () => {
      const postId = 'invalid-id';

      const result = await deletePost(postId);

      expect(result.data).toBeNull();
      expect(result.error.message).toContain('ID de post inválido');
    });
  });

  describe('incrementPostViews', () => {
    it('should increment views for valid post ID', async () => {
      const postId = '123e4567-e89b-12d3-a456-426614174000';

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null, error: null })
        })
      });

      mockSupabase.rpc.mockReturnValue({ data: null, error: null });

      const result = await incrementPostViews(postId);

      expect(result.error).toBeNull();
    });

    it('should reject invalid post ID', async () => {
      const postId = 'invalid-id';

      const result = await incrementPostViews(postId);

      expect(result.data).toBeNull();
      expect(result.error.message).toContain('ID de post inválido');
    });
  });

  describe('getCommentsByPost', () => {
    it('should get comments for a post', async () => {
      const postId = '123e4567-e89b-12d3-a456-426614174000';
      const mockComments = [
        { id: '1', content: 'Comment 1', post_id: postId },
        { id: '2', content: 'Comment 2', post_id: postId }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({ data: mockComments, error: null })
              })
            })
          })
        })
      });

      // Mock para contar respuestas
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          count: 'exact',
          head: true
        })
      });

      const result = await getCommentsByPost(postId);

      expect(result.data).toEqual(mockComments);
      expect(result.error).toBeNull();
    });

    it('should reject invalid post ID', async () => {
      const postId = 'invalid-id';

      const result = await getCommentsByPost(postId);

      expect(result.data).toBeNull();
      expect(result.error.message).toContain('ID de post inválido');
    });
  });

  describe('validateCommentData', () => {
    it('should validate valid comment data', () => {
      const commentData = {
        content: 'Valid comment content'
      };

      const result = validateCommentData(commentData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject empty content', () => {
      const commentData = {
        content: ''
      };

      const result = validateCommentData(commentData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('El contenido debe tener entre 1 y 1000 caracteres');
    });

    it('should reject content too long', () => {
      const commentData = {
        content: 'a'.repeat(1001)
      };

      const result = validateCommentData(commentData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('El contenido debe tener entre 1 y 1000 caracteres');
    });
  });

  describe('createComment', () => {
    it('should create a valid comment', async () => {
      const commentData = {
        post_id: '123e4567-e89b-12d3-a456-426614174000',
        content: 'Valid comment content',
        user_id: '123e4567-e89b-12d3-a456-426614174000'
      };

      const mockPost = { id: commentData.post_id, title: 'Test Post' };
      const mockCreatedComment = { id: '1', ...commentData };

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

      const result = await createComment(commentData);

      expect(result.data).toEqual(mockCreatedComment);
      expect(result.error).toBeNull();
    });

    it('should reject invalid comment data', async () => {
      const commentData = {
        post_id: '123e4567-e89b-12d3-a456-426614174000',
        content: '', // Empty content
        user_id: '123e4567-e89b-12d3-a456-426614174000'
      };

      const result = await createComment(commentData);

      expect(result.data).toBeNull();
      expect(result.error.message).toContain('El contenido debe tener entre 1 y 1000 caracteres');
    });
  });

  describe('updateComment', () => {
    it('should update comment with valid data', async () => {
      const commentId = '123e4567-e89b-12d3-a456-426614174000';
      const updateData = {
        content: 'Updated comment content'
      };

      const mockUpdatedComment = { id: commentId, ...updateData };

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockUpdatedComment, error: null })
            })
          })
        })
      });

      const result = await updateComment(commentId, updateData);

      expect(result.data).toEqual(mockUpdatedComment);
      expect(result.error).toBeNull();
    });

    it('should reject invalid comment ID', async () => {
      const commentId = 'invalid-id';
      const updateData = {
        content: 'Updated comment content'
      };

      const result = await updateComment(commentId, updateData);

      expect(result.data).toBeNull();
      expect(result.error.message).toContain('ID de comentario inválido');
    });
  });

  describe('deleteComment', () => {
    it('should delete comment with valid ID', async () => {
      const commentId = '123e4567-e89b-12d3-a456-426614174000';
      const mockComment = { id: commentId, content: 'Test comment' };

      // Mock para getCommentById
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockComment, error: null })
          })
        })
      });

      // Mock para verificar si hay respuestas
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: [], error: null })
        })
      });

      // Mock para deleteComment
      mockSupabase.from.mockReturnValueOnce({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null, error: null })
        })
      });

      const result = await deleteComment(commentId);

      expect(result.error).toBeNull();
    });

    it('should reject invalid comment ID', async () => {
      const commentId = 'invalid-id';

      const result = await deleteComment(commentId);

      expect(result.data).toBeNull();
      expect(result.error.message).toContain('ID de comentario inválido');
    });
  });

  describe('searchPosts', () => {
    it('should search posts with valid term', async () => {
      const searchTerm = 'test search';
      const mockResults = [
        { id: '1', title: 'Test Post 1', content: 'Content with test search term' },
        { id: '2', title: 'Test Post 2', content: 'Content with test search term' }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            or: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                range: jest.fn().mockResolvedValue({ data: mockResults, error: null })
              })
            })
          })
        })
      });

      const result = await searchPosts(searchTerm);

      expect(result.data).toEqual(mockResults);
      expect(result.error).toBeNull();
    });

    it('should reject search term too short', async () => {
      const searchTerm = 'a'; // Less than 2 characters

      const result = await searchPosts(searchTerm);

      expect(result.data).toEqual([]);
      expect(result.error.message).toContain('El término de búsqueda debe tener al menos 2 caracteres');
    });
  });

  describe('countPosts', () => {
    it('should count posts', async () => {
      const mockCount = 42;

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          count: 'exact',
          head: true
        })
      });

      const result = await countPosts();

      expect(result.count).toBe(mockCount);
      expect(result.error).toBeNull();
    });
  });

  describe('countCommentsByPost', () => {
    it('should count comments for a post', async () => {
      const postId = '123e4567-e89b-12d3-a456-426614174000';
      const mockCount = 5;

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          count: 'exact',
          head: true
        })
      });

      const result = await countCommentsByPost(postId);

      expect(result.count).toBe(mockCount);
      expect(result.error).toBeNull();
    });

    it('should reject invalid post ID', async () => {
      const postId = 'invalid-id';

      const result = await countCommentsByPost(postId);

      expect(result.count).toBe(0);
      expect(result.error.message).toContain('ID de post inválido');
    });
  });

  describe('getPopularPosts', () => {
    it('should get popular posts', async () => {
      const mockPosts = [
        { id: '1', title: 'Popular Post 1', upvotes_count: 10 },
        { id: '2', title: 'Popular Post 2', upvotes_count: 8 }
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

      const result = await getPopularPosts();

      expect(result.data).toEqual(mockPosts);
      expect(result.error).toBeNull();
    });
  });
});