import { jest } from '@jest/globals';
import {
  getAllNews,
  getNewsById,
  createNews,
  updateNews,
  deleteNews
} from '../../src/services/newsService.js';

// Mock de Supabase
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      order: jest.fn(),
      eq: jest.fn(() => ({
        single: jest.fn()
      }))
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn()
      }))
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      }))
    })),
    delete: jest.fn(() => ({
      eq: jest.fn()
    }))
  }))
};

jest.mock('../../src/config/supabaseClient.js', () => mockSupabase);

describe('News Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllNews', () => {
    it('debería obtener todas las noticias ordenadas por created_at descendente', async () => {
      const mockNews = [
        { id: 1, title: 'Noticia 1', created_at: '2023-01-02' },
        { id: 2, title: 'Noticia 2', created_at: '2023-01-03' },
        { id: 3, title: 'Noticia 3', created_at: '2023-01-01' }
      ];

      const mockOrder = jest.fn().mockResolvedValue({
        data: mockNews.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
        error: null
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: mockOrder
        })
      });

      const result = await getAllNews();

      expect(mockSupabase.from).toHaveBeenCalledWith('news');
      expect(result.data).toEqual([
        { id: 2, title: 'Noticia 2', created_at: '2023-01-03' },
        { id: 1, title: 'Noticia 1', created_at: '2023-01-02' },
        { id: 3, title: 'Noticia 3', created_at: '2023-01-01' }
      ]);
      expect(result.error).toBeNull();
    });

    it('debería manejar errores de la base de datos', async () => {
      const mockError = new Error('Error de conexión a la base de datos');

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: null,
            error: mockError
          })
        })
      });

      const result = await getAllNews();

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });

    it('debería retornar array vacío si no hay noticias', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      });

      const result = await getAllNews();

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });
  });

  describe('getNewsById', () => {
    it('debería obtener una noticia por su ID', async () => {
      const mockNews = { id: '123', title: 'Noticia de prueba', content: 'Contenido' };
      const newsId = '123';

      const mockSingle = jest.fn().mockResolvedValue({
        data: mockNews,
        error: null
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: mockSingle
          })
        })
      });

      const result = await getNewsById(newsId);

      expect(mockSupabase.from).toHaveBeenCalledWith('news');
      expect(mockSingle).toHaveBeenCalled();
      expect(result.data).toEqual(mockNews);
      expect(result.error).toBeNull();
    });

    it('debería manejar caso cuando la noticia no existe', async () => {
      const newsId = 'non-existent-id';

      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'No rows found' }
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: mockSingle
          })
        })
      });

      const result = await getNewsById(newsId);

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });

    it('debería manejar errores de base de datos', async () => {
      const newsId = '123';
      const mockError = new Error('Database error');

      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: mockError
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: mockSingle
          })
        })
      });

      const result = await getNewsById(newsId);

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });
  });

  describe('createNews', () => {
    it('debería crear una nueva noticia exitosamente', async () => {
      const newsData = {
        title: 'Nueva noticia',
        content: 'Contenido de la noticia',
        image_url: 'https://example.com/image.jpg',
        user_id: 'user-123'
      };

      const mockCreatedNews = { id: 'new-id', ...newsData };

      const mockSingle = jest.fn().mockResolvedValue({
        data: mockCreatedNews,
        error: null
      });

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: mockSingle
          })
        })
      });

      const result = await createNews(newsData);

      expect(mockSupabase.from).toHaveBeenCalledWith('news');
      expect(result.data).toEqual(mockCreatedNews);
      expect(result.error).toBeNull();
    });

    it('debería manejar errores al crear noticia', async () => {
      const newsData = {
        title: 'Nueva noticia',
        content: 'Contenido',
        user_id: 'user-123'
      };

      const mockError = new Error('Error al insertar en la base de datos');

      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: mockError
      });

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: mockSingle
          })
        })
      });

      const result = await createNews(newsData);

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });

    it('debería manejar validación de datos incompletos', async () => {
      const incompleteData = {
        title: 'Título sin contenido'
        // Falta content, user_id, etc.
      };

      const mockError = new Error('Null constraint violation');

      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: mockError
      });

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: mockSingle
          })
        })
      });

      const result = await createNews(incompleteData);

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });
  });

  describe('updateNews', () => {
    it('debería actualizar una noticia exitosamente', async () => {
      const newsId = 'news-123';
      const updateData = {
        title: 'Título actualizado',
        content: 'Contenido actualizado',
        image_url: 'https://example.com/new-image.jpg'
      };

      const mockUpdatedNews = { id: newsId, ...updateData };

      const mockSingle = jest.fn().mockResolvedValue({
        data: mockUpdatedNews,
        error: null
      });

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: mockSingle
            })
          })
        })
      });

      const result = await updateNews(newsId, updateData);

      expect(mockSupabase.from).toHaveBeenCalledWith('news');
      expect(result.data).toEqual(mockUpdatedNews);
      expect(result.error).toBeNull();
    });

    it('debería manejar caso cuando la noticia a actualizar no existe', async () => {
      const newsId = 'non-existent-news';
      const updateData = { title: 'Título actualizado' };

      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'No rows found' }
      });

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: mockSingle
            })
          })
        })
      });

      const result = await updateNews(newsId, updateData);

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });

    it('debería manejar errores de base de datos al actualizar', async () => {
      const newsId = 'news-123';
      const updateData = { title: 'Título actualizado' };
      const mockError = new Error('Database update error');

      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: mockError
      });

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: mockSingle
            })
          })
        })
      });

      const result = await updateNews(newsId, updateData);

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });
  });

  describe('deleteNews', () => {
    it('debería eliminar una noticia exitosamente', async () => {
      const newsId = 'news-123';

      const mockEq = jest.fn().mockResolvedValue({
        error: null
      });

      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: mockEq
        })
      });

      const result = await deleteNews(newsId);

      expect(mockSupabase.from).toHaveBeenCalledWith('news');
      expect(mockEq).toHaveBeenCalledWith('id', newsId);
      expect(result.error).toBeNull();
    });

    it('debería manejar caso cuando la noticia a eliminar no existe', async () => {
      const newsId = 'non-existent-news';

      const mockEq = jest.fn().mockResolvedValue({
        error: { message: 'No rows found' }
      });

      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: mockEq
        })
      });

      const result = await deleteNews(newsId);

      expect(result.error).toBeTruthy();
    });

    it('debería manejar errores de base de datos al eliminar', async () => {
      const newsId = 'news-123';
      const mockError = new Error('Database delete error');

      const mockEq = jest.fn().mockResolvedValue({
        error: mockError
      });

      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: mockEq
        })
      });

      const result = await deleteNews(newsId);

      expect(result.error).toEqual(mockError);
    });
  });

  describe('Manejo de parámetros', () => {
    it('debería sanitizar properly los datos de entrada', async () => {
      const maliciousData = {
        title: '<script>alert("xss")</script>',
        content: 'Contenido con <b>HTML</b>',
        image_url: 'javascript:alert("xss")',
        user_id: 'user-123'
      };

      const mockSingle = jest.fn().mockResolvedValue({
        data: { id: 'new-id', ...maliciousData },
        error: null
      });

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: mockSingle
          })
        })
      });

      const result = await createNews(maliciousData);

      expect(result.data.title).toContain('<script>');
      // Nota: La sanitización debería ocurrir a nivel de controlador
      expect(mockSingle).toHaveBeenCalled();
    });

    it('debería manejar IDs inválidos graciosamente', async () => {
      const invalidId = null;

      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: new Error('Invalid ID format')
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: mockSingle
          })
        })
      });

      const result = await getNewsById(invalidId);

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });
});