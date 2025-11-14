import request from 'supertest';
import express from 'express';
import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';

// Mock de Supabase
const mockSupabase = {
  from: jest.fn(),
  auth: {
    admin: {
      createUser: jest.fn(),
      updateUserById: jest.fn()
    },
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    getUser: jest.fn()
  }
};

// Mock del módulo supabaseClient
jest.mock('../../src/config/supabaseClient.js', () => ({
  supabase: mockSupabase
}));

// Importar las rutas del API
import authRoutes from '../../src/routes/auth.routes.js';
import forumRoutes from '../../src/routes/forum.routes.js';

// Crear una aplicación Express para las pruebas
const app = express();
app.use(express.json());

// Configurar variables de entorno para pruebas
process.env.JWT_SECRET = 'test-secret';

// Montar las rutas
app.use('/api/auth', authRoutes);
app.use('/api/forum', forumRoutes);

describe('API Integration Tests - Enhanced', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication API', () => {
    describe('POST /api/auth/register', () => {
      test('should reject registration with weak password', async () => {
        const userData = {
          email: 'test@example.com',
          password: 'weak' // Contraseña débil
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('La contraseña debe tener al menos 8 caracteres');
      });

      test('should reject registration with invalid email', async () => {
        const userData = {
          email: 'invalid-email', // Email inválido
          password: 'ValidPass123!'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Email inválido');
      });

      test('should reject registration with XSS in email', async () => {
        const userData = {
          email: '<script>alert("xss")</script>@example.com', // XSS en email
          password: 'ValidPass123!'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Email inválido');
      });

      test('should accept valid registration', async () => {
        const userData = {
          email: 'test@example.com',
          password: 'ValidPass123!'
        };

        const mockUserData = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: userData.email
        };

        mockSupabase.auth.admin.createUser.mockResolvedValue({
          data: { user: mockUserData },
          error: null
        });

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('Registro exitoso');
      });
    });

    describe('POST /api/auth/login', () => {
      test('should reject login with invalid credentials', async () => {
        const loginData = {
          email: 'test@example.com',
          password: 'wrongpassword'
        };

        mockSupabase.auth.signInWithPassword.mockResolvedValue({
          data: null,
          error: { message: 'Invalid login credentials' }
        });

        const response = await request(app)
          .post('/api/auth/login')
          .send(loginData)
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Invalid login credentials');
      });

      test('should reject login with XSS in email', async () => {
        const loginData = {
          email: '<script>alert("xss")</script>@example.com', // XSS en email
          password: 'ValidPass123!'
        };

        const response = await request(app)
          .post('/api/auth/login')
          .send(loginData)
          .expect(401);

        expect(response.body.success).toBe(false);
      });

      test('should accept valid login', async () => {
        const loginData = {
          email: 'test@example.com',
          password: 'ValidPass123!'
        };

        const mockUserData = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: loginData.email
        };

        mockSupabase.auth.signInWithPassword.mockResolvedValue({
          data: { user: mockUserData },
          error: null
        });

        const response = await request(app)
          .post('/api/auth/login')
          .send(loginData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.token).toBeDefined();
        expect(response.body.data.user.email).toBe(loginData.email);
      });
    });

    describe('POST /api/auth/refresh', () => {
      test('should reject refresh with invalid token', async () => {
        const response = await request(app)
          .post('/api/auth/refresh')
          .set('Authorization', 'Bearer invalid.token')
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Token inválido');
      });

      test('should accept refresh with valid token', async () => {
        const payload = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'test@example.com',
          role: 'user'
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET);

        const response = await request(app)
          .post('/api/auth/refresh')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.token).toBeDefined();
      });
    });
  });

  describe('Forum API', () => {
    describe('POST /api/forum/posts', () => {
      test('should reject post with XSS in title', async () => {
        const postData = {
          title: '<script>alert("xss")</script>Título malicioso', // XSS en título
          content: 'Contenido válido'
        };

        const response = await request(app)
          .post('/api/forum/posts')
          .send(postData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.errors).toContain('El título contiene caracteres no permitidos');
      });

      test('should reject post with XSS in content', async () => {
        const postData = {
          title: 'Título válido',
          content: '<script>alert("xss")</script>Contenido malicioso' // XSS en contenido
        };

        const response = await request(app)
          .post('/api/forum/posts')
          .send(postData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.errors).toContain('El contenido contiene caracteres no permitidos');
      });

      test('should reject post with title too short', async () => {
        const postData = {
          title: 'Corto', // Título muy corto
          content: 'Contenido válido con más de 10 caracteres'
        };

        const response = await request(app)
          .post('/api/forum/posts')
          .send(postData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.errors).toContain('El título debe tener entre 5 y 200 caracteres');
      });

      test('should reject post with content too short', async () => {
        const postData = {
          title: 'Título válido',
          content: 'Corto' // Contenido muy corto
        };

        const response = await request(app)
          .post('/api/forum/posts')
          .send(postData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.errors).toContain('El contenido debe tener entre 10 y 2000 caracteres');
      });

      test('should accept valid post', async () => {
        const postData = {
          title: 'Título válido',
          content: 'Contenido válido con más de 10 caracteres'
        };

        const mockPostData = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          ...postData,
          user_id: '00000000-0000-0000-0000-000000000000', // Usuario anónimo
          created_at: new Date().toISOString()
        };

        mockSupabase.from.mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockPostData, error: null })
            })
          })
        });

        const response = await request(app)
          .post('/api/forum/posts')
          .send(postData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.title).toBe(postData.title);
        expect(response.body.data.content).toBe(postData.content);
      });
    });

    describe('POST /api/forum/posts/:post_id/comments', () => {
      test('should reject comment with XSS', async () => {
        const commentData = {
          content: '<script>alert("xss")</script>Comentario malicioso' // XSS en contenido
        };

        const response = await request(app)
          .post('/api/forum/posts/123e4567-e89b-12d3-a456-426614174000/comments')
          .send(commentData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.errors).toContain('El contenido contiene caracteres no permitidos');
      });

      test('should reject comment with empty content', async () => {
        const commentData = {
          content: '' // Contenido vacío
        };

        const response = await request(app)
          .post('/api/forum/posts/123e4567-e89b-12d3-a456-426614174000/comments')
          .send(commentData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.errors).toContain('El comentario no puede estar vacío');
      });

      test('should accept valid comment', async () => {
        const commentData = {
          content: 'Comentario válido'
        };

        const mockCommentData = {
          id: '123e4567-e89b-12d3-a456-426614174001',
          ...commentData,
          post_id: '123e4567-e89b-12d3-a456-426614174000',
          user_id: '00000000-0000-0000-0000-000000000000', // Usuario anónimo
          created_at: new Date().toISOString()
        };

        mockSupabase.from.mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockCommentData, error: null })
            })
          })
        });

        const response = await request(app)
          .post('/api/forum/posts/123e4567-e89b-12d3-a456-426614174000/comments')
          .send(commentData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.content).toBe(commentData.content);
      });
    });

    describe('GET /api/forum/search', () => {
      test('should reject search with XSS', async () => {
        const searchTerm = '<script>alert("xss")</script>'; // XSS en término de búsqueda

        const response = await request(app)
          .get(`/api/forum/search?q=${encodeURIComponent(searchTerm)}`)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('El término de búsqueda contiene caracteres no permitidos');
      });

      test('should reject search with term too short', async () => {
        const searchTerm = 'a'; // Término muy corto

        const response = await request(app)
          .get(`/api/forum/search?q=${encodeURIComponent(searchTerm)}`)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('El término de búsqueda debe tener al menos 2 caracteres');
      });

      test('should accept valid search', async () => {
        const searchTerm = 'término válido';

        const mockResults = [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            title: 'Post con término válido',
            content: 'Contenido con término válido'
          }
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

        const response = await request(app)
          .get(`/api/forum/search?q=${encodeURIComponent(searchTerm)}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockResults);
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors consistently', async () => {
      const errorMessage = 'Database connection failed';

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockRejectedValue(new Error(errorMessage))
          })
        })
      });

      const response = await request(app)
        .get('/api/forum/posts/invalid-id')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    test('should handle malformed requests', async () => {
      // Enviar JSON malformado
      const response = await request(app)
        .post('/api/forum/posts')
        .set('Content-Type', 'application/json')
        .send('{"title": "Título sin cerrar comillas}')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    test('should implement rate limiting for sensitive endpoints', async () => {
      // Este test verifica que se implemente rate limiting
      // En una implementación correcta, después de varias peticiones rápidas
      // se debería recibir un código 429 Too Many Requests
      
      const loginData = {
        email: 'test@example.com',
        password: 'ValidPass123!'
      };

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: 'Invalid login credentials' }
      });

      // Realizar múltiples peticiones rápidas
      const promises = Array(10).fill().map(() => 
        request(app)
          .post('/api/auth/login')
          .send(loginData)
      );

      const responses = await Promise.all(promises);
      
      // Al menos una de las peticiones debería ser limitada
      const rateLimitedResponse = responses.find(res => res.status === 429);
      
      // Este test fallará inicialmente, indicando que necesitamos implementar rate limiting
      expect(rateLimitedResponse).toBeDefined();
    });
  });

  describe('CORS Configuration', () => {
    test('should implement proper CORS headers', async () => {
      const response = await request(app)
        .options('/api/forum/posts')
        .expect(200);

      // Verificar headers CORS
      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
      expect(response.headers['access-control-allow-headers']).toBeDefined();
    });

    test('should reject requests from unauthorized origins', async () => {
      // Este test verifica que se rechacen peticiones de orígenes no autorizados
      // En una implementación correcta, se debería configurar CORS adecuadamente
      
      const response = await request(app)
        .post('/api/forum/posts')
        .set('Origin', 'https://malicious-site.com')
        .send({
          title: 'Título válido',
          content: 'Contenido válido'
        });

      // Este test fallará inicialmente, indicando que necesitamos configurar CORS adecuadamente
      expect(response.status).toBe(403); // Forbidden
    });
  });
});