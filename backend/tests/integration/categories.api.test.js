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

// Importar las rutas de categorías
import categoryRoutes from '../../src/routes/category.routes.js';

// Crear una aplicación Express para las pruebas
const app = express();
app.use(express.json());
app.use('/api/categories', categoryRoutes);

describe('Categories API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/categories', () => {
    it('should get all active categories', async () => {
      const mockCategories = [
        {
          id: '1',
          name: 'General',
          description: 'General discussion',
          color: '#3B82F6',
          icon: 'chat',
          is_active: true
        },
        {
          id: '2',
          name: 'Technical',
          description: 'Technical discussions',
          color: '#10B981',
          icon: 'code',
          is_active: true
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: mockCategories, error: null })
          })
        })
      });

      const response = await request(app)
        .get('/api/categories')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockCategories);
      expect(response.body.message).toBe('Categorías obtenidas exitosamente');
    });

    it('should handle database errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: null, error: new Error('Database error') })
          })
        })
      });

      const response = await request(app)
        .get('/api/categories')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Database error');
    });
  });

  describe('GET /api/categories/:id', () => {
    it('should get category by ID', async () => {
      const categoryId = '123e4567-e89b-12d3-a456-426614174000';
      const mockCategory = {
        id: categoryId,
        name: 'General',
        description: 'General discussion',
        color: '#3B82F6',
        icon: 'chat',
        is_active: true
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockCategory, error: null })
          })
        })
      });

      const response = await request(app)
        .get(`/api/categories/${categoryId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockCategory);
      expect(response.body.message).toBe('Categoría obtenida exitosamente');
    });

    it('should return 404 for non-existent category', async () => {
      const categoryId = '123e4567-e89b-12d3-a456-426614174000';

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: new Error('Category not found') })
          })
        })
      });

      const response = await request(app)
        .get(`/api/categories/${categoryId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Category not found');
    });

    it('should return 400 for invalid category ID', async () => {
      const response = await request(app)
        .get('/api/categories/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/categories', () => {
    it('should create a new category', async () => {
      const categoryData = {
        name: 'New Category',
        description: 'Description for new category',
        color: '#FF5733',
        icon: 'new-icon'
      };

      const mockCreatedCategory = {
        id: '789e0123-e89b-12d3-a456-426614174000',
        ...categoryData,
        is_active: true,
        created_at: '2023-01-01T00:00:00Z'
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockCreatedCategory, error: null })
          })
        })
      });

      const response = await request(app)
        .post('/api/categories')
        .send(categoryData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockCreatedCategory);
      expect(response.body.message).toBe('Categoría creada exitosamente');
    });

    it('should create category with default values', async () => {
      const categoryData = {
        name: 'Minimal Category',
        description: 'Minimal description'
      };

      const mockCreatedCategory = {
        id: '789e0123-e89b-12d3-a456-426614174000',
        ...categoryData,
        color: '#3B82F6', // Default color
        icon: 'chat', // Default icon
        is_active: true,
        created_at: '2023-01-01T00:00:00Z'
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockCreatedCategory, error: null })
          })
        })
      });

      const response = await request(app)
        .post('/api/categories')
        .send(categoryData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.color).toBe('#3B82F6');
      expect(response.body.data.icon).toBe('chat');
    });

    it('should reject category with missing name', async () => {
      const categoryData = {
        description: 'Description without name'
      };

      const response = await request(app)
        .post('/api/categories')
        .send(categoryData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should reject category with name too short', async () => {
      const categoryData = {
        name: 'Bad', // Too short
        description: 'Description for category'
      };

      const response = await request(app)
        .post('/api/categories')
        .send(categoryData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should reject category with invalid color format', async () => {
      const categoryData = {
        name: 'Valid Category Name',
        description: 'Description for category',
        color: 'invalid-color'
      };

      const response = await request(app)
        .post('/api/categories')
        .send(categoryData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('PUT /api/categories/:id', () => {
    it('should update category with valid data', async () => {
      const categoryId = '123e4567-e89b-12d3-a456-426614174000';
      const updateData = {
        name: 'Updated Category',
        description: 'Updated description',
        color: '#FF0000',
        icon: 'updated-icon'
      };

      const mockUpdatedCategory = {
        id: categoryId,
        ...updateData,
        is_active: true,
        updated_at: '2023-01-01T00:00:00Z'
      };

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockUpdatedCategory, error: null })
            })
          })
        })
      });

      const response = await request(app)
        .put(`/api/categories/${categoryId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockUpdatedCategory);
      expect(response.body.message).toBe('Categoría actualizada exitosamente');
    });

    it('should update category with partial data', async () => {
      const categoryId = '123e4567-e89b-12d3-a456-426614174000';
      const updateData = {
        name: 'Partially Updated Category'
      };

      const mockUpdatedCategory = {
        id: categoryId,
        ...updateData,
        description: 'Original description',
        color: '#3B82F6',
        icon: 'chat',
        is_active: true,
        updated_at: '2023-01-01T00:00:00Z'
      };

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockUpdatedCategory, error: null })
            })
          })
        })
      });

      const response = await request(app)
        .put(`/api/categories/${categoryId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
    });

    it('should reject update with invalid category ID', async () => {
      const updateData = {
        name: 'Updated Category'
      };

      const response = await request(app)
        .put('/api/categories/invalid-id')
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should reject update with name too short', async () => {
      const categoryId = '123e4567-e89b-12d3-a456-426614174000';
      const updateData = {
        name: 'Bad' // Too short
      };

      const response = await request(app)
        .put(`/api/categories/${categoryId}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('DELETE /api/categories/:id', () => {
    it('should delete category (soft delete)', async () => {
      const categoryId = '123e4567-e89b-12d3-a456-426614174000';

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null, error: null })
        })
      });

      const response = await request(app)
        .delete(`/api/categories/${categoryId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Categoría eliminada exitosamente');
    });

    it('should reject delete with invalid category ID', async () => {
      const response = await request(app)
        .delete('/api/categories/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should handle category not found', async () => {
      const categoryId = '123e4567-e89b-12d3-a456-426614174000';

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null, error: new Error('Category not found') })
        })
      });

      const response = await request(app)
        .delete(`/api/categories/${categoryId}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Category not found');
    });
  });

  describe('GET /api/categories/with-stats', () => {
    it('should get categories with statistics', async () => {
      const mockCategoriesWithStats = [
        {
          id: '1',
          name: 'General',
          description: 'General discussion',
          post_count: 10,
          is_active: true
        },
        {
          id: '2',
          name: 'Technical',
          description: 'Technical discussions',
          post_count: 5,
          is_active: true
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: mockCategoriesWithStats, error: null })
          })
        })
      });

      const response = await request(app)
        .get('/api/categories/with-stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockCategoriesWithStats);
      expect(response.body.message).toBe('Categorías con estadísticas obtenidas exitosamente');
    });

    it('should handle errors when getting categories with stats', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: null, error: new Error('Database error') })
          })
        })
      });

      const response = await request(app)
        .get('/api/categories/with-stats')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Database error');
    });
  });

  describe('GET /api/categories/:id/posts', () => {
    it('should get posts by category with default parameters', async () => {
      const categoryId = '123e4567-e89b-12d3-a456-426614174000';
      const mockPosts = [
        {
          id: '1',
          title: 'Post 1',
          content: 'Content for post 1',
          category_id: categoryId,
          created_at: '2023-01-01T00:00:00Z',
          forum_categories: { id: categoryId, name: 'General' },
          user_profiles: { username: 'testuser' }
        },
        {
          id: '2',
          title: 'Post 2',
          content: 'Content for post 2',
          category_id: categoryId,
          created_at: '2023-01-02T00:00:00Z',
          forum_categories: { id: categoryId, name: 'General' },
          user_profiles: { username: 'testuser2' }
        }
      ];

      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          range: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: mockPosts, error: null })
          })
        })
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQuery)
      });

      const response = await request(app)
        .get(`/api/categories/${categoryId}/posts`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPosts);
      expect(response.body.message).toBe('Posts de categoría obtenidos exitosamente');
    });

    it('should get posts by category with custom parameters', async () => {
      const categoryId = '123e4567-e89b-12d3-a456-426614174000';
      const mockPosts = [
        {
          id: '1',
          title: 'Post 1',
          content: 'Content for post 1',
          category_id: categoryId,
          views_count: 100,
          created_at: '2023-01-01T00:00:00Z'
        }
      ];

      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          range: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: mockPosts, error: null })
          })
        })
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQuery)
      });

      const response = await request(app)
        .get(`/api/categories/${categoryId}/posts?limit=10&offset=20&sortBy=views_count&sortOrder=asc`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPosts);
    });

    it('should reject posts for invalid category ID', async () => {
      const response = await request(app)
        .get('/api/categories/invalid-id/posts')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should handle errors when getting posts by category', async () => {
      const categoryId = '123e4567-e89b-12d3-a456-426614174000';

      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnValue({
          range: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: null, error: new Error('Database error') })
          })
        })
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQuery)
      });

      const response = await request(app)
        .get(`/api/categories/${categoryId}/posts`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Database error');
    });
  });
});