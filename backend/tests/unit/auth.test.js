import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../../src/middleware/authMiddleware.js';
import { loginUser, registerUser } from '../../src/controllers/authController.js';

// Mock de Supabase
jest.mock('../../src/config/supabaseClient.js', () => ({
  default: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      }))
    }))
  }
}));

describe('Autenticación JWT', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      headers: {},
      body: {},
      user: null
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();

    // Limpiar variables de entorno antes de cada prueba
    delete process.env.JWT_SECRET;
  });

  describe('Variable de entorno JWT_SECRET', () => {
    it('debería fallar si JWT_SECRET no está configurada', () => {
      // Simular el escenario donde JWT_SECRET no existe
      delete process.env.JWT_SECRET;

      // Intentar crear un token sin JWT_SECRET debería fallar
      expect(() => {
        jwt.sign({ userId: 'test' }, undefined);
      }).toThrow();
    });

    it('debería funcionar con JWT_SECRET configurada', () => {
      // Configurar JWT_SECRET para la prueba
      process.env.JWT_SECRET = 'test-secret-key-for-jwt-testing';

      const payload = { userId: 'test-user', email: 'test@example.com' };
      const token = jwt.sign(payload, process.env.JWT_SECRET);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      // Verificar que podemos decodificar el token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.userId).toBe('test-user');
      expect(decoded.email).toBe('test@example.com');
    });

    it('debería rechazar tokens con secret incorrecta', () => {
      process.env.JWT_SECRET = 'correct-secret';

      const payload = { userId: 'test-user' };
      const token = jwt.sign(payload, 'wrong-secret');

      expect(() => {
        jwt.verify(token, process.env.JWT_SECRET);
      }).toThrow(jwt.JsonWebTokenError);
    });

    it('debería rechazar tokens expirados', () => {
      process.env.JWT_SECRET = 'test-secret';

      const payload = { userId: 'test-user' };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1ms' });

      // Esperar a que expire el token
      setTimeout(() => {
        expect(() => {
          jwt.verify(token, process.env.JWT_SECRET);
        }).toThrow(jwt.TokenExpiredError);
      }, 10);
    });

    it('debería tener JWT_SECRET con longitud mínima segura', () => {
      process.env.JWT_SECRET = 'short'; // Demasiado corta

      // Esta prueba verifica que la secret tenga una longitud mínima
      expect(process.env.JWT_SECRET.length).toBeGreaterThan(32);
    });
  });

  describe('Middleware de autenticación', () => {
    it('debería extraer usuario del token válido', () => {
      process.env.JWT_SECRET = 'test-secret-for-middleware';

      const payload = { userId: 'user-123', email: 'user@example.com' };
      const token = jwt.sign(payload, process.env.JWT_SECRET);

      mockReq.headers.authorization = `Bearer ${token}`;

      authMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.user.userId).toBe('user-123');
      expect(mockReq.user.email).toBe('user@example.com');
    });

    it('debería rechazar requests sin token', () => {
      process.env.JWT_SECRET = 'test-secret';

      mockReq.headers.authorization = ''; // Sin token

      authMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Token no proporcionado'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('debería rechazar tokens con formato inválido', () => {
      process.env.JWT_SECRET = 'test-secret';

      mockReq.headers.authorization = 'InvalidFormat token123';

      authMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Formato de token inválido'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('debería rechazar tokens JWT inválidos', () => {
      process.env.JWT_SECRET = 'test-secret';

      mockReq.headers.authorization = 'Bearer invalid-jwt-token';

      authMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Token inválido'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('debería manejar errores de verificación de token', () => {
      process.env.JWT_SECRET = 'test-secret';

      const expiredToken = jwt.sign(
        { userId: 'user-123' },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // Expirado
      );

      mockReq.headers.authorization = `Bearer ${expiredToken}`;

      authMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Token expirado'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Generación de tokens en controladores', () => {
    it('debería generar token al hacer login exitoso', async () => {
      process.env.JWT_SECRET = 'test-secret-for-login';

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        created_at: new Date().toISOString()
      };

      mockReq.body = { email: 'test@example.com', password: 'password123' };

      // Mock de respuesta de Supabase
      const supabase = require('../../src/config/supabaseClient.js').default;
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockUser,
              error: null
            })
          })
        })
      });

      await loginUser(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            token: expect.any(String),
            user: mockUser
          })
        })
      );
    });

    it('debería generar token al registrar usuario nuevo', async () => {
      process.env.JWT_SECRET = 'test-secret-for-register';

      const mockNewUser = {
        id: 'new-user-456',
        email: 'newuser@example.com',
        created_at: new Date().toISOString()
      };

      mockReq.body = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User'
      };

      // Mock de respuesta de Supabase
      const supabase = require('../../src/config/supabaseClient.js').default;
      supabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockNewUser,
              error: null
            })
          })
        })
      });

      await registerUser(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            token: expect.any(String),
            user: mockNewUser
          })
        })
      );
    });

    it('debería fallar login si no se puede generar token', async () => {
      // Simular JWT_SECRET no configurada
      delete process.env.JWT_SECRET;

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com'
      };

      mockReq.body = { email: 'test@example.com', password: 'password123' };

      const supabase = require('../../src/config/supabaseClient.js').default;
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockUser,
              error: null
            })
          })
        })
      });

      await loginUser(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Error al generar token de autenticación'
      });
    });
  });

  describe('Validaciones de seguridad de tokens', () => {
    it('debería incluir información esencial en el payload', () => {
      process.env.JWT_SECRET = 'test-secret';

      const payload = {
        userId: 'user-123',
        email: 'user@example.com',
        iat: Math.floor(Date.now() / 1000)
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      expect(decoded.userId).toBe('user-123');
      expect(decoded.email).toBe('user@example.com');
      expect(decoded.iat).toBeDefined();
    });

    it('debería tener expiración razonable', () => {
      process.env.JWT_SECRET = 'test-secret';

      const token = jwt.sign(
        { userId: 'user-123' },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const expirationTime = decoded.exp;
      const currentTime = Math.floor(Date.now() / 1000);
      const timeDiff = expirationTime - currentTime;

      // Verificar que el token expire en aproximadamente 24 horas (con tolerancia)
      expect(timeDiff).toBeGreaterThan(23 * 60 * 60); // 23 horas
      expect(timeDiff).toBeLessThan(25 * 60 * 60); // 25 horas
    });

    it('no debería incluir información sensible en el token', () => {
      process.env.JWT_SECRET = 'test-secret';

      const payload = {
        userId: 'user-123',
        email: 'user@example.com'
        // No incluir passwords, datos financieros, etc.
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Verificar que no hay campos sensibles
      expect(decoded).not.toHaveProperty('password');
      expect(decoded).not.toHaveProperty('creditCard');
      expect(decoded).not.toHaveProperty('ssn');
    });
  });

  describe('Manejo de errores de JWT', () => {
    it('debería manejar JsonWebTokenError', () => {
      process.env.JWT_SECRET = 'test-secret';

      expect(() => {
        jwt.verify('malformed.token', process.env.JWT_SECRET);
      }).toThrow(jwt.JsonWebTokenError);
    });

    it('debería manejar NotBeforeError', () => {
      process.env.JWT_SECRET = 'test-secret';

      const token = jwt.sign(
        { userId: 'user-123' },
        process.env.JWT_SECRET,
        { notBefore: '1h' } // No válido hasta 1 hora en el futuro
      );

      expect(() => {
        jwt.verify(token, process.env.JWT_SECRET);
      }).toThrow(jwt.NotBeforeError);
    });

    it('debería manejar TokenExpiredError', () => {
      process.env.JWT_SECRET = 'test-secret';

      const token = jwt.sign(
        { userId: 'user-123' },
        process.env.JWT_SECRET,
        { expiresIn: '1ms' }
      );

      setTimeout(() => {
        expect(() => {
          jwt.verify(token, process.env.JWT_SECRET);
        }).toThrow(jwt.TokenExpiredError);
      }, 10);
    });
  });

  describe('Configuración del entorno', () => {
    it('debería requerir JWT_SECRET en producción', () => {
      // Simular entorno de producción
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;

      // En producción, JWT_SECRET debe estar configurada
      expect(process.env.JWT_SECRET).toBeDefined();

      // Restaurar entorno original
      process.env.NODE_ENV = originalEnv;
    });

    it('debería tener valores por defecto seguros para desarrollo', () => {
      // Simular entorno de desarrollo
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      if (!process.env.JWT_SECRET) {
        process.env.JWT_SECRET = 'dev-secret-key-not-for-production';
      }

      expect(process.env.JWT_SECRET).toBeDefined();
      expect(process.env.JWT_SECRET.length).toBeGreaterThan(10);

      // Restaurar entorno original
      process.env.NODE_ENV = originalEnv;
    });
  });
});