import {
  getPosts,
  getPost,
  createNewPost,
  updateExistingPost,
  deleteExistingPost,
  getPostComments,
  createNewComment,
  updateExistingComment,
  deleteExistingComment,
  searchForumPosts,
  createReplyToComment,
  getCommentReplies,
  getPostsCount,
  getPostCommentsCount,
  getPopularPosts
} from '../../../src/controllers/forumController.js';
import { jest } from '@jest/globals';

// Mock de los servicios
jest.mock('../../../src/services/forumService.js', () => ({
  getAllPosts: jest.fn(),
  getPostById: jest.fn(),
  createPost: jest.fn(),
  updatePost: jest.fn(),
  deletePost: jest.fn(),
  getCommentsByPost: jest.fn(),
  getCommentById: jest.fn(),
  createComment: jest.fn(),
  updateComment: jest.fn(),
  deleteComment: jest.fn(),
  getRepliesByComment: jest.fn(),
  searchPosts: jest.fn(),
  countPosts: jest.fn(),
  countCommentsByPost: jest.fn(),
  getPopularPosts: jest.fn(),
  validatePostData: jest.fn(),
  validateCommentData: jest.fn()
}));

jest.mock('../../../src/services/userService.js', () => ({
  getUserIdForForum: jest.fn((userId) => userId || '00000000-0000-0000-0000-000000000000')
}));

jest.mock('../../../src/utils/responseHelper.js', () => ({
  success: jest.fn((data, message) => ({ success: true, data, message })),
  error: jest.fn((message) => ({ success: false, error: message })),
  created: jest.fn((data, message) => ({ success: true, data, message, created: true })),
  notFound: jest.fn((resource) => ({ success: false, error: `${resource} not found` }))
}));

jest.mock('../../../src/middleware/errorHandler.js', () => ({
  asyncHandler: jest.fn((fn) => fn)
}));

jest.mock('../../../src/utils/uuidValidator.js', () => ({
  isValidUserId: jest.fn((id) => {
    // Simular validación de UUID
    return typeof id === 'string' && id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  })
}));

// Importar los módulos mockeados
import * as forumService from '../../../src/services/forumService.js';
import * as userService from '../../../src/services/userService.js';
import ApiResponse from '../../../src/utils/responseHelper.js';
import { isValidUserId } from '../../../src/utils/uuidValidator.js';

describe('ForumController', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReq = {
      params: {},
      query: {},
      body: {},
      user: null
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      set: jest.fn().mockReturnThis()
    };
  });

  describe('getPosts', () => {
    it('should get posts with default parameters', async () => {
      const mockPosts = [
        { id: '1', title: 'Post 1' },
        { id: '2', title: 'Post 2' }
      ];
      const mockCount = 2;

      forumService.getAllPosts.mockResolvedValue({ 
        data: mockPosts, 
        error: null,
        cacheHeaders: {
          'Cache-Control': 'public, max-age=300',
          'ETag': '"test-etag"'
        }
      });
      forumService.countPosts.mockResolvedValue({ count: mockCount, error: null });

      await getPosts(mockReq, mockRes);

      expect(forumService.getAllPosts).toHaveBeenCalledWith({
        limit: 20,
        offset: 0,
        categoryId: undefined,
        sortBy: 'last_activity_at',
        sortOrder: 'desc'
      });
      expect(mockRes.set).toHaveBeenCalledWith('Cache-Control', 'public, max-age=300');
      expect(mockRes.set).toHaveBeenCalledWith('ETag', '"test-etag"');
      expect(mockRes.set).toHaveBeenCalledWith('X-Total-Count', '2');
      expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.success(mockPosts, 'Posts obtenidos exitosamente'));
    });

    it('should handle errors when getting posts', async () => {
      const mockError = new Error('Database error');
      forumService.getAllPosts.mockResolvedValue({ data: null, error: mockError });

      await getPosts(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.error(mockError.message));
    });
  });

  describe('getPost', () => {
    it('should get post by ID', async () => {
      const postId = '123e4567-e89b-12d3-a456-426614174000';
      const mockPost = { id: postId, title: 'Test Post' };

      mockReq.params.id = postId;
      forumService.getPostById.mockResolvedValue({ data: mockPost, error: null });

      await getPost(mockReq, mockRes);

      expect(forumService.getPostById).toHaveBeenCalledWith(postId);
      expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.success(mockPost, 'Post obtenido exitosamente'));
    });

    it('should handle post not found', async () => {
      const postId = '123e4567-e89b-12d3-a456-426614174000';

      mockReq.params.id = postId;
      forumService.getPostById.mockResolvedValue({ data: null, error: new Error('Post not found') });

      await getPost(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.notFound('Post'));
    });
  });

  describe('createNewPost', () => {
    it('should create a new post', async () => {
      const postData = {
        title: 'New Post',
        content: 'Content for new post',
        category_id: '123e4567-e89b-12d3-a456-426614174000'
      };
      const mockCreatedPost = { id: '1', ...postData };

      mockReq.body = postData;
      forumService.validatePostData.mockReturnValue({ isValid: true, errors: [] });
      forumService.createPost.mockResolvedValue({ data: mockCreatedPost, error: null });

      await createNewPost(mockReq, mockRes);

      expect(forumService.validatePostData).toHaveBeenCalledWith(postData);
      expect(forumService.createPost).toHaveBeenCalledWith({
        title: postData.title,
        content: postData.content,
        category_id: postData.category_id,
        user_id: '00000000-0000-0000-0000-000000000000'
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.created(mockCreatedPost, 'Post creado exitosamente'));
    });

    it('should reject invalid post data', async () => {
      const postData = {
        title: 'Bad', // Too short
        content: 'Content'
      };

      mockReq.body = postData;
      forumService.validatePostData.mockReturnValue({ 
        isValid: false, 
        errors: ['El título debe tener entre 5 y 200 caracteres'] 
      });

      await createNewPost(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.error('El título debe tener entre 5 y 200 caracteres'));
    });

    it('should handle errors when creating post', async () => {
      const postData = {
        title: 'Valid Title',
        content: 'Valid content'
      };
      const mockError = new Error('Database error');

      mockReq.body = postData;
      forumService.validatePostData.mockReturnValue({ isValid: true, errors: [] });
      forumService.createPost.mockResolvedValue({ data: null, error: mockError });

      await createNewPost(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.error(mockError.message));
    });
  });

  describe('updateExistingPost', () => {
    it('should update post with valid data', async () => {
      const postId = '123e4567-e89b-12d3-a456-426614174000';
      const updateData = {
        title: 'Updated Title',
        content: 'Updated content'
      };
      const mockPost = { id: postId, title: 'Original Title' };
      const mockUpdatedPost = { id: postId, ...updateData };

      mockReq.params.id = postId;
      mockReq.body = updateData;
      forumService.getPostById.mockResolvedValue({ data: mockPost, error: null });
      forumService.updatePost.mockResolvedValue({ data: mockUpdatedPost, error: null });

      await updateExistingPost(mockReq, mockRes);

      expect(forumService.updatePost).toHaveBeenCalledWith(postId, updateData);
      expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.success(mockUpdatedPost, 'Post actualizado exitosamente'));
    });

    it('should reject invalid post ID', async () => {
      const postId = 'invalid-id';
      const updateData = { title: 'Updated Title' };

      mockReq.params.id = postId;
      mockReq.body = updateData;

      await updateExistingPost(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.error('ID de post inválido'));
    });

    it('should handle post not found', async () => {
      const postId = '123e4567-e89b-12d3-a456-426614174000';
      const updateData = { title: 'Updated Title' };

      mockReq.params.id = postId;
      mockReq.body = updateData;
      forumService.getPostById.mockResolvedValue({ data: null, error: new Error('Post not found') });

      await updateExistingPost(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.notFound('Post'));
    });
  });

  describe('deleteExistingPost', () => {
    it('should delete post with valid ID', async () => {
      const postId = '123e4567-e89b-12d3-a456-426614174000';
      const mockPost = { id: postId, title: 'Test Post' };

      mockReq.params.id = postId;
      forumService.getPostById.mockResolvedValue({ data: mockPost, error: null });
      forumService.deletePost.mockResolvedValue({ data: null, error: null });

      await deleteExistingPost(mockReq, mockRes);

      expect(forumService.deletePost).toHaveBeenCalledWith(postId);
      expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.success(null, 'Post eliminado exitosamente'));
    });

    it('should reject invalid post ID', async () => {
      const postId = 'invalid-id';

      mockReq.params.id = postId;

      await deleteExistingPost(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.error('ID de post inválido'));
    });
  });

  describe('getPostComments', () => {
    it('should get comments for a post', async () => {
      const postId = '123e4567-e89b-12d3-a456-426614174000';
      const mockComments = [
        { id: '1', content: 'Comment 1', post_id: postId },
        { id: '2', content: 'Comment 2', post_id: postId }
      ];

      mockReq.params.post_id = postId;
      mockReq.query = { level: 0, limit: 50 };
      forumService.getCommentsByPost.mockResolvedValue({ data: mockComments, error: null });

      await getPostComments(mockReq, mockRes);

      expect(forumService.getCommentsByPost).toHaveBeenCalledWith(postId, {
        includeReplies: true,
        level: 0,
        limit: 50
      });
      expect(mockRes.set).toHaveBeenCalledWith('Cache-Control', 'public, max-age=60');
      expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.success(mockComments, 'Comentarios obtenidos exitosamente'));
    });

    it('should reject invalid post ID', async () => {
      const postId = 'invalid-id';

      mockReq.params.post_id = postId;

      await getPostComments(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.error('ID de post inválido'));
    });
  });

  describe('createNewComment', () => {
    it('should create a new comment', async () => {
      const postId = '123e4567-e89b-12d3-a456-426614174000';
      const commentData = { content: 'New comment' };
      const mockPost = { id: postId, title: 'Test Post' };
      const mockCreatedComment = { id: '1', ...commentData, post_id: postId };

      mockReq.params.post_id = postId;
      mockReq.body = commentData;
      forumService.validateCommentData.mockReturnValue({ isValid: true, errors: [] });
      forumService.getPostById.mockResolvedValue({ data: mockPost, error: null });
      forumService.createComment.mockResolvedValue({ data: mockCreatedComment, error: null });

      await createNewComment(mockReq, mockRes);

      expect(forumService.createComment).toHaveBeenCalledWith({
        post_id: postId,
        content: commentData.content,
        user_id: '00000000-0000-0000-0000-000000000000'
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.created(mockCreatedComment, 'Comentario creado exitosamente'));
    });

    it('should reject invalid comment data', async () => {
      const postId = '123e4567-e89b-12d3-a456-426614174000';
      const commentData = { content: '' }; // Empty content

      mockReq.params.post_id = postId;
      mockReq.body = commentData;
      forumService.validateCommentData.mockReturnValue({ 
        isValid: false, 
        errors: ['El contenido debe tener entre 1 y 1000 caracteres'] 
      });

      await createNewComment(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.error('El contenido debe tener entre 1 y 1000 caracteres'));
    });

    it('should handle post not found when creating comment', async () => {
      const postId = '123e4567-e89b-12d3-a456-426614174000';
      const commentData = { content: 'New comment' };

      mockReq.params.post_id = postId;
      mockReq.body = commentData;
      forumService.validateCommentData.mockReturnValue({ isValid: true, errors: [] });
      forumService.getPostById.mockResolvedValue({ data: null, error: new Error('Post not found') });

      await createNewComment(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.notFound('Post'));
    });
  });

  describe('updateExistingComment', () => {
    it('should update comment with valid data', async () => {
      const commentId = '123e4567-e89b-12d3-a456-426614174000';
      const updateData = { content: 'Updated comment' };
      const mockComment = { id: commentId, content: 'Original comment' };
      const mockUpdatedComment = { id: commentId, ...updateData };

      mockReq.params.comment_id = commentId;
      mockReq.body = updateData;
      forumService.getCommentById.mockResolvedValue({ data: mockComment, error: null });
      forumService.updateComment.mockResolvedValue({ data: mockUpdatedComment, error: null });

      await updateExistingComment(mockReq, mockRes);

      expect(forumService.updateComment).toHaveBeenCalledWith(commentId, updateData);
      expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.success(mockUpdatedComment, 'Comentario actualizado exitosamente'));
    });

    it('should reject invalid comment ID', async () => {
      const commentId = 'invalid-id';
      const updateData = { content: 'Updated comment' };

      mockReq.params.comment_id = commentId;
      mockReq.body = updateData;

      await updateExistingComment(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.error('ID de comentario inválido'));
    });
  });

  describe('deleteExistingComment', () => {
    it('should delete comment with valid ID', async () => {
      const commentId = '123e4567-e89b-12d3-a456-426614174000';
      const mockComment = { id: commentId, content: 'Test comment' };

      mockReq.params.comment_id = commentId;
      forumService.getCommentById.mockResolvedValue({ data: mockComment, error: null });
      forumService.deleteComment.mockResolvedValue({ data: null, error: null });

      await deleteExistingComment(mockReq, mockRes);

      expect(forumService.deleteComment).toHaveBeenCalledWith(commentId);
      expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.success(null, 'Comentario eliminado exitosamente'));
    });

    it('should reject invalid comment ID', async () => {
      const commentId = 'invalid-id';

      mockReq.params.comment_id = commentId;

      await deleteExistingComment(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.error('ID de comentario inválido'));
    });
  });

  describe('searchForumPosts', () => {
    it('should search posts with valid query', async () => {
      const searchQuery = 'test search';
      const mockResults = [
        { id: '1', title: 'Test Post 1' },
        { id: '2', title: 'Test Post 2' }
      ];

      mockReq.query.q = searchQuery;
      forumService.searchPosts.mockResolvedValue({ data: mockResults, error: null });

      await searchForumPosts(mockReq, mockRes);

      expect(forumService.searchPosts).toHaveBeenCalledWith(searchQuery, {
        categoryId: undefined,
        limit: 20,
        offset: 0
      });
      expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.success(mockResults, '2 posts encontrados'));
    });

    it('should reject search query too short', async () => {
      const searchQuery = 'a'; // Less than 2 characters

      mockReq.query.q = searchQuery;

      await searchForumPosts(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.error('El término de búsqueda debe tener al menos 2 caracteres'));
    });
  });

  describe('createReplyToComment', () => {
    it('should create a reply to comment', async () => {
      const commentId = '123e4567-e89b-12d3-a456-426614174000';
      const replyData = { content: 'Reply content' };
      const mockReply = { id: '1', ...replyData, parent_comment_id: commentId };

      mockReq.params.comment_id = commentId;
      mockReq.body = replyData;
      forumService.validateCommentData.mockReturnValue({ isValid: true, errors: [] });
      forumService.createReply.mockResolvedValue({ data: mockReply, error: null });

      await createReplyToComment(mockReq, mockRes);

      expect(forumService.createReply).toHaveBeenCalledWith({
        comment_id: commentId,
        content: replyData.content,
        user_id: '00000000-0000-0000-0000-000000000000'
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.created(mockReply, 'Respuesta creada exitosamente'));
    });

    it('should reject invalid comment ID', async () => {
      const commentId = 'invalid-id';
      const replyData = { content: 'Reply content' };

      mockReq.params.comment_id = commentId;
      mockReq.body = replyData;

      await createReplyToComment(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.error('ID de comentario inválido'));
    });
  });

  describe('getCommentReplies', () => {
    it('should get replies for a comment', async () => {
      const commentId = '123e4567-e89b-12d3-a456-426614174000';
      const mockReplies = [
        { id: '1', content: 'Reply 1', parent_comment_id: commentId },
        { id: '2', content: 'Reply 2', parent_comment_id: commentId }
      ];

      mockReq.params.comment_id = commentId;
      mockReq.query = { limit: 20, offset: 0 };
      forumService.getRepliesByComment.mockResolvedValue({ data: mockReplies, error: null });

      await getCommentReplies(mockReq, mockRes);

      expect(forumService.getRepliesByComment).toHaveBeenCalledWith(commentId, {
        limit: 20,
        offset: 0
      });
      expect(mockRes.set).toHaveBeenCalledWith('Cache-Control', 'public, max-age=120');
      expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.success(mockReplies, 'Respuestas obtenidas exitosamente'));
    });

    it('should reject invalid comment ID', async () => {
      const commentId = 'invalid-id';

      mockReq.params.comment_id = commentId;

      await getCommentReplies(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.error('ID de comentario inválido'));
    });
  });

  describe('getPostsCount', () => {
    it('should get posts count', async () => {
      const mockCount = 42;

      mockReq.query = {};
      forumService.countPosts.mockResolvedValue({ count: mockCount, error: null });

      await getPostsCount(mockReq, mockRes);

      expect(forumService.countPosts).toHaveBeenCalledWith({});
      expect(mockRes.set).toHaveBeenCalledWith('Cache-Control', 'public, max-age=180');
      expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.success({ count: mockCount }, 'Conteo de posts obtenido exitosamente'));
    });

    it('should get posts count with category filter', async () => {
      const categoryId = '123e4567-e89b-12d3-a456-426614174000';
      const mockCount = 10;

      mockReq.query = { categoryId };
      forumService.countPosts.mockResolvedValue({ count: mockCount, error: null });

      await getPostsCount(mockReq, mockRes);

      expect(forumService.countPosts).toHaveBeenCalledWith({ categoryId });
    });
  });

  describe('getPostCommentsCount', () => {
    it('should get comments count for a post', async () => {
      const postId = '123e4567-e89b-12d3-a456-426614174000';
      const mockCount = 5;

      mockReq.params.post_id = postId;
      forumService.countCommentsByPost.mockResolvedValue({ count: mockCount, error: null });

      await getPostCommentsCount(mockReq, mockRes);

      expect(forumService.countCommentsByPost).toHaveBeenCalledWith(postId);
      expect(mockRes.set).toHaveBeenCalledWith('Cache-Control', 'public, max-age=120');
      expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.success({ count: mockCount }, 'Conteo de comentarios obtenido exitosamente'));
    });

    it('should reject invalid post ID', async () => {
      const postId = 'invalid-id';

      mockReq.params.post_id = postId;

      await getPostCommentsCount(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.error('ID de post inválido'));
    });
  });

  describe('getPopularPosts', () => {
    it('should get popular posts with default parameters', async () => {
      const mockPosts = [
        { id: '1', title: 'Popular Post 1', upvotes_count: 10 },
        { id: '2', title: 'Popular Post 2', upvotes_count: 8 }
      ];

      mockReq.query = {};
      forumService.getPopularPosts.mockResolvedValue({ data: mockPosts, error: null });

      await getPopularPosts(mockReq, mockRes);

      expect(forumService.getPopularPosts).toHaveBeenCalledWith({
        limit: 10,
        timeRange: 'week'
      });
      expect(mockRes.set).toHaveBeenCalledWith('Cache-Control', 'public, max-age=600');
      expect(mockRes.json).toHaveBeenCalledWith(ApiResponse.success(mockPosts, 'Posts populares obtenidos exitosamente'));
    });

    it('should get popular posts with custom parameters', async () => {
      const mockPosts = [{ id: '1', title: 'Popular Post', upvotes_count: 10 }];

      mockReq.query = { limit: 5, timeRange: 'month' };
      forumService.getPopularPosts.mockResolvedValue({ data: mockPosts, error: null });

      await getPopularPosts(mockReq, mockRes);

      expect(forumService.getPopularPosts).toHaveBeenCalledWith({
        limit: 5,
        timeRange: 'month'
      });
    });
  });
});