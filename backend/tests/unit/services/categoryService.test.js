import {
  getAllCategories,
  getCategoryById,
  getCategoryByName,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoriesWithStats,
  getPostsByCategory
} from '../../../src/services/categoryService.js';
import { jest } from '@jest/globals';

// Mock de Supabase
const mockSupabase = {
  from: jest.fn()
};

// Mock del módulo supabaseClient
jest.mock('../../../src/config/supabaseClient.js', () => ({
  supabase: mockSupabase
}));

describe('CategoryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllCategories', () => {
    it('should get all active categories', async () => {
      const mockCategories = [
        { id: '1', name: 'General', is_active: true },
        { id: '2', name: 'Technical', is_active: true }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: mockCategories, error: null })
          })
        })
      });

      const result = await getAllCategories();

      expect(mockSupabase.from).toHaveBeenCalledWith('forum_categories');
      expect(result.data).toEqual(mockCategories);
      expect(result.error).toBeNull();
    });

    it('should handle errors when getting categories', async () => {
      const mockError = new Error('Database error');

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: null, error: mockError })
          })
        })
      });

      const result = await getAllCategories();

      expect(result.error).toEqual(mockError);
    });
  });

  describe('getCategoryById', () => {
    it('should get category by ID', async () => {
      const categoryId = '123e4567-e89b-12d3-a456-426614174000';
      const mockCategory = { id: categoryId, name: 'General' };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockCategory, error: null })
          })
        })
      });

      const result = await getCategoryById(categoryId);

      expect(mockSupabase.from).toHaveBeenCalledWith('forum_categories');
      expect(result.data).toEqual(mockCategory);
    });

    it('should handle errors when getting category by ID', async () => {
      const categoryId = 'invalid-id';
      const mockError = new Error('Category not found');

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: mockError })
          })
        })
      });

      const result = await getCategoryById(categoryId);

      expect(result.error).toEqual(mockError);
    });
  });

  describe('getCategoryByName', () => {
    it('should get category by name', async () => {
      const categoryName = 'General';
      const mockCategory = { id: '1', name: categoryName };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          ilike: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockCategory, error: null })
          })
        })
      });

      const result = await getCategoryByName(categoryName);

      expect(mockSupabase.from).toHaveBeenCalledWith('forum_categories');
      expect(result.data).toEqual(mockCategory);
    });

    it('should handle errors when getting category by name', async () => {
      const categoryName = 'Non-existent';
      const mockError = new Error('Category not found');

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          ilike: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: mockError })
          })
        })
      });

      const result = await getCategoryByName(categoryName);

      expect(result.error).toEqual(mockError);
    });
  });

  describe('createCategory', () => {
    it('should create a new category', async () => {
      const categoryData = {
        name: 'New Category',
        description: 'Description for new category',
        color: '#FF5733',
        icon: 'new-icon'
      };

      const mockCreatedCategory = { id: '1', ...categoryData };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockCreatedCategory, error: null })
          })
        })
      });

      const result = await createCategory(categoryData);

      expect(result.data).toEqual(mockCreatedCategory);
      expect(result.error).toBeNull();
    });

    it('should create category with default values', async () => {
      const categoryData = {
        name: 'Minimal Category',
        description: 'Minimal description'
      };

      const mockCreatedCategory = { 
        id: '1', 
        ...categoryData,
        color: '#3B82F6', // Default color
        icon: 'chat' // Default icon
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockCreatedCategory, error: null })
          })
        })
      });

      const result = await createCategory(categoryData);

      expect(result.data).toEqual(mockCreatedCategory);
      expect(result.error).toBeNull();
    });

    it('should handle errors when creating category', async () => {
      const categoryData = {
        name: 'Invalid Category',
        description: 'This will fail'
      };

      const mockError = new Error('Database constraint violation');

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: mockError })
          })
        })
      });

      const result = await createCategory(categoryData);

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });
  });

  describe('updateCategory', () => {
    it('should update category with valid data', async () => {
      const categoryId = '123e4567-e89b-12d3-a456-426614174000';
      const updateData = {
        name: 'Updated Category',
        description: 'Updated description',
        color: '#FF0000',
        icon: 'updated-icon'
      };

      const mockUpdatedCategory = { id: categoryId, ...updateData };

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockUpdatedCategory, error: null })
            })
          })
        })
      });

      const result = await updateCategory(categoryId, updateData);

      expect(result.data).toEqual(mockUpdatedCategory);
      expect(result.error).toBeNull();
    });

    it('should update category with partial data', async () => {
      const categoryId = '123e4567-e89b-12d3-a456-426614174000';
      const updateData = {
        name: 'Partially Updated Category'
      };

      const mockUpdatedCategory = { id: categoryId, ...updateData };

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockUpdatedCategory, error: null })
            })
          })
        })
      });

      const result = await updateCategory(categoryId, updateData);

      expect(result.data).toEqual(mockUpdatedCategory);
      expect(result.error).toBeNull();
    });

    it('should handle errors when updating category', async () => {
      const categoryId = 'invalid-id';
      const updateData = {
        name: 'Updated Category'
      };

      const mockError = new Error('Category not found');

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: mockError })
            })
          })
        })
      });

      const result = await updateCategory(categoryId, updateData);

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });
  });

  describe('deleteCategory', () => {
    it('should delete category (soft delete)', async () => {
      const categoryId = '123e4567-e89b-12d3-a456-426614174000';

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null, error: null })
        })
      });

      const result = await deleteCategory(categoryId);

      expect(result.error).toBeNull();
      expect(mockSupabase.from).toHaveBeenCalledWith('forum_categories');
    });

    it('should handle errors when deleting category', async () => {
      const categoryId = 'invalid-id';
      const mockError = new Error('Category not found');

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: null, error: mockError })
        })
      });

      const result = await deleteCategory(categoryId);

      expect(result.error).toEqual(mockError);
    });
  });

  describe('getCategoriesWithStats', () => {
    it('should get categories with statistics', async () => {
      const mockCategoriesWithStats = [
        { id: '1', name: 'General', post_count: 10 },
        { id: '2', name: 'Technical', post_count: 5 }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: mockCategoriesWithStats, error: null })
          })
        })
      });

      const result = await getCategoriesWithStats();

      expect(result.data).toEqual(mockCategoriesWithStats);
      expect(result.error).toBeNull();
    });

    it('should handle errors when getting categories with stats', async () => {
      const mockError = new Error('Database error');

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: null, error: mockError })
          })
        })
      });

      const result = await getCategoriesWithStats();

      expect(result.error).toEqual(mockError);
    });
  });

  describe('getPostsByCategory', () => {
    it('should get posts by category with default parameters', async () => {
      const categoryId = '123e4567-e89b-12d3-a456-426614174000';
      const mockPosts = [
        { id: '1', title: 'Post 1', category_id: categoryId },
        { id: '2', title: 'Post 2', category_id: categoryId }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              range: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ data: mockPosts, error: null })
              })
            })
          })
        })
      });

      const result = await getPostsByCategory(categoryId);

      expect(mockSupabase.from).toHaveBeenCalledWith('forum_posts');
      expect(result.data).toEqual(mockPosts);
      expect(result.error).toBeNull();
    });

    it('should get posts by category with custom parameters', async () => {
      const categoryId = '123e4567-e89b-12d3-a456-426614174000';
      const options = {
        limit: 10,
        offset: 20,
        sortBy: 'views_count',
        sortOrder: 'asc'
      };
      const mockPosts = [
        { id: '1', title: 'Post 1', category_id: categoryId, views_count: 5 }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              range: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ data: mockPosts, error: null })
              })
            })
          })
        })
      });

      const result = await getPostsByCategory(categoryId, options);

      expect(result.data).toEqual(mockPosts);
      expect(result.error).toBeNull();
    });

    it('should handle invalid sort parameters', async () => {
      const categoryId = '123e4567-e89b-12d3-a456-426614174000';
      const options = {
        sortBy: 'invalid_field',
        sortOrder: 'invalid_order'
      };
      const mockPosts = [
        { id: '1', title: 'Post 1', category_id: categoryId }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              range: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ data: mockPosts, error: null })
              })
            })
          })
        })
      });

      const result = await getPostsByCategory(categoryId, options);

      // Should fall back to default sorting
      expect(result.data).toEqual(mockPosts);
      expect(result.error).toBeNull();
    });

    it('should handle errors when getting posts by category', async () => {
      const categoryId = 'invalid-id';
      const mockError = new Error('Category not found');

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              range: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ data: null, error: mockError })
              })
            })
          })
        })
      });

      const result = await getPostsByCategory(categoryId);

      expect(result.error).toEqual(mockError);
    });
  });
});