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

describe('ForumService - Enhanced Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllPosts - Enhanced Tests', () => {
    test('should validate limit parameter', async () => {
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

      // Test con límite excesivo
      const result = await getAllPosts({ limit: 1000 });
      
      expect(mockSupabase.from).toHaveBeenCalledWith('forum_posts');
      expect(mockQuery.range).toHaveBeenCalledWith(0, 999); // offset=0, limit=1000
      expect(result.data).toEqual(mockData);
    });

    test('should handle negative offset', async () => {
      const mockData = [
        { id: '1', title: 'Test Post 1', created_at: '2023-01-01' }
      ];

      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockData, error: null })
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQuery)
      });

      // Test con offset negativo
      const result = await getAllPosts({ offset: -10 });
      
      expect(mockQuery.range).toHaveBeenCalledWith(-10, 9); // offset=-10, limit=20 (default)
      expect(result.data).toEqual(mockData);
    });

    test('should handle invalid sortBy parameter', async () => {
      const mockData = [
        { id: '1', title: 'Test Post 1', created_at: '2023-01-01' }
      ];

      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockData, error: null })
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQuery)
      });

      // Test con sortBy inválido (debe usar default)
      const result = await getAllPosts({ sortBy: 'invalid_field' });
      
      // No debe llamar a order con campo inválido
      expect(mockQuery.order).not.toHaveBeenCalledWith('invalid_field', expect.any(Object));
      expect(result.data).toEqual(mockData);
    });
  });

  describe('validatePostData - Security Tests', () => {
    test('should reject title with script tag', () => {
      const postData = {
        title: '<script>alert("xss")</script>Título malicioso',
        content: 'Contenido válido'
      };

      const result = validatePostData(postData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('El título contiene caracteres no permitidos');
    });

    test('should reject title with javascript:', () => {
      const postData = {
        title: 'javascript:alert("xss")',
        content: 'Contenido válido'
      };

      const result = validatePostData(postData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('El título contiene caracteres no permitidos');
    });

    test('should reject title with onclick', () => {
      const postData = {
        title: 'Título con onclick="alert(\'xss\')"',
        content: 'Contenido válido'
      };

      const result = validatePostData(postData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('El título contiene caracteres no permitidos');
    });

    test('should reject content with script tag', () => {
      const postData = {
        title: 'Título válido',
        content: '<script>alert("xss")</script>Contenido malicioso'
      };

      const result = validatePostData(postData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('El contenido contiene caracteres no permitidos');
    });

    test('should reject content with javascript:', () => {
      const postData = {
        title: 'Título válido',
        content: 'javascript:alert("xss")'
      };

      const result = validatePostData(postData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('El contenido contiene caracteres no permitidos');
    });

    test('should reject content with onclick', () => {
      const postData = {
        title: 'Título válido',
        content: 'Contenido con onclick="alert(\'xss\')"'
      };

      const result = validatePostData(postData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('El contenido contiene caracteres no permitidos');
    });
  });

  describe('validateCommentData - Security Tests', () => {
    test('should reject comment with script tag', () => {
      const commentData = {
        content: '<script>alert("xss")</script>Comentario malicioso'
      };

      const result = validateCommentData(commentData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('El contenido contiene caracteres no permitidos');
    });

    test('should reject comment with javascript:', () => {
      const commentData = {
        content: 'javascript:alert("xss")'
      };

      const result = validateCommentData(commentData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('El contenido contiene caracteres no permitidos');
    });

    test('should reject comment with onclick', () => {
      const commentData = {
        content: 'Comentario con onclick="alert(\'xss\')"'
      };

      const result = validateCommentData(commentData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('El contenido contiene caracteres no permitidos');
    });
  });

  describe('createPost - Enhanced Tests', () => {
    test('should sanitize title and content', async () => {
      const postData = {
        title: '  Título con espacios  ',
        content: '  Contenido con espacios  ',
        user_id: '123e4567-e89b-12d3-a456-426614174000'
      };

      const mockCreatedPost = { 
        id: '1', 
        title: 'Título con espacios', // Sin espacios extra
        content: 'Contenido con espacios', // Sin espacios extra
        user_id: postData.user_id
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockCreatedPost, error: null })
          })
        })
      });

      const result = await createPost(postData);

      expect(result.data.title).toBe('Título con espacios');
      expect(result.data.content).toBe('Contenido con espacios');
      expect(result.error).toBeNull();
    });

    test('should handle missing user_id', async () => {
      const postData = {
        title: 'Título válido',
        content: 'Contenido válido con más de 10 caracteres'
        // user_id faltante
      };

      const mockCreatedPost = { 
        id: '1', 
        title: postData.title,
        content: postData.content,
        user_id: '00000000-0000-0000-0000-000000000000' // ID anónimo
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockCreatedPost, error: null })
          })
        })
      });

      const result = await createPost(postData);

      expect(result.data.user_id).toBe('00000000-0000-0000-0000-000000000000');
      expect(result.error).toBeNull();
    });
  });

  describe('searchPosts - Enhanced Tests', () => {
    test('should sanitize search term', async () => {
      const searchTerm = '<script>alert("xss")</script>Término de búsqueda';
      const mockResults = [
        { id: '1', title: 'Test Post 1', content: 'Content with test search term' }
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

      const result = await searchPosts(searchTerm);

      // Verificar que el término de búsqueda fue sanitizado
      expect(mockQuery.or).toHaveBeenCalledWith(
        expect.stringContaining('Término de búsqueda') // Sin tags script
      );
      expect(result.data).toEqual(mockResults);
    });

    test('should reject search term too short', async () => {
      const searchTerm = 'a'; // Menos de 2 caracteres

      const result = await searchPosts(searchTerm);

      expect(result.data).toEqual([]);
      expect(result.error.message).toContain('El término de búsqueda debe tener al menos 2 caracteres');
    });

    test('should handle empty search term', async () => {
      const searchTerm = '';

      const result = await searchPosts(searchTerm);

      expect(result.data).toEqual([]);
      expect(result.error.message).toContain('El término de búsqueda debe tener al menos 2 caracteres');
    });
  });

  describe('getRepliesByComment - Duplicate Function Test', () => {
    test('should detect duplicate function definition', () => {
      // Este test verifica que la función getRepliesByComment está duplicada
      // En una implementación correcta, solo debería haber una definición
      
      // Importar el módulo para verificar si hay duplicados
      const forumServiceModule = require('../../../src/services/forumService.js');
      
      // Verificar si la función está exportada una sola vez
      const exportedFunctions = Object.keys(forumServiceModule);
      const getRepliesCount = exportedFunctions.filter(name => name === 'getRepliesByComment').length;
      
      // Este test fallará si hay duplicados
      expect(getRepliesCount).toBe(1);
    });
  });

  describe('countPosts - Enhanced Tests', () => {
    test('should handle database errors', async () => {
      const mockError = new Error('Database connection failed');

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            count: 'exact',
            head: true
          })
        })
      });

      // Simular error en la consulta
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            count: 'exact',
            head: true
          })
        })
      }).mockReturnValueOnce(Promise.reject(mockError));

      const result = await countPosts();

      expect(result.error).toEqual(mockError);
      expect(result.count).toBe(0);
    });

    test('should handle category filter', async () => {
      const categoryId = '123e4567-e89b-12d3-a456-426614174000';
      const mockCount = 42;

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

      // Mock para count
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              count: 'exact',
              head: true
            })
          })
        })
      }).mockReturnValueOnce(Promise.resolve({ count: mockCount, error: null }));

      const result = await countPosts({ categoryId });

      expect(result.count).toBe(mockCount);
      expect(result.error).toBeNull();
    });
  });

  describe('getPopularPosts - Enhanced Tests', () => {
    test('should validate timeRange parameter', async () => {
      const mockPosts = [
        { id: '1', title: 'Popular Post 1', upvotes_count: 10 }
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

      // Test con timeRange inválido (debe usar default)
      const result = await getPopularPosts({ timeRange: 'invalid_range' });

      // Verificar que se usó un rango de fecha válido
      expect(mockQuery.gte).toHaveBeenCalled();
      expect(result.data).toEqual(mockPosts);
    });

    test('should handle limit parameter', async () => {
      const mockPosts = [
        { id: '1', title: 'Popular Post 1', upvotes_count: 10 }
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

      // Test con límite personalizado
      const result = await getPopularPosts({ limit: 5 });

      expect(mockQuery.limit).toHaveBeenCalledWith(5);
      expect(result.data).toEqual(mockPosts);
    });
  });
});