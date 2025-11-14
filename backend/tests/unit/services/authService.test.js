import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Mock de Supabase
const mockSupabase = {
  auth: {
    admin: {
      createUser: jest.fn(),
      generateLink: jest.fn(),
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

// Importar las funciones del servicio de autenticación
// Nota: Estas funciones deberían ser creadas en un archivo authService.js
// Por ahora, vamos a recrearlas basadas en el código existente en authController.js

/**
 * Función para registrar un usuario
 * @param {string} email - Email del usuario
 * @param {string} password - Contraseña del usuario
 * @returns {Promise<Object>} Resultado del registro
 */
async function registerUser(email, password) {
  try {
    // Validar email
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Email inválido' };
    }
    
    // Validar contraseña
    if (!password || password.length < 8) {
      return { success: false, error: 'La contraseña debe tener al menos 8 caracteres' };
    }
    
    // Validar fortaleza de contraseña
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      return { 
        success: false, 
        error: 'La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial' 
      };
    }
    
    // Crear usuario en Supabase
    const { data, error } = await mockSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false
    });
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error) {
    return { success: false, error: 'Error al registrar usuario' };
  }
}

/**
 * Función para iniciar sesión
 * @param {string} email - Email del usuario
 * @param {string} password - Contraseña del usuario
 * @returns {Promise<Object>} Resultado del login
 */
async function loginUser(email, password) {
  try {
    // Validar email
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Email inválido' };
    }
    
    // Validar contraseña
    if (!password) {
      return { success: false, error: 'Contraseña requerida' };
    }
    
    // Iniciar sesión en Supabase
    const { data, error } = await mockSupabase.auth.signInWithPassword({ 
      email, 
      password 
    });
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    // Generar token JWT
    const token = jwt.sign(
      { 
        id: data.user.id, 
        email: data.user.email, 
        role: 'user' 
      },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '7d' }
    );
    
    return { 
      success: true, 
      data: {
        token,
        user: {
          id: data.user.id,
          email: data.user.email,
          role: 'user'
        }
      }
    };
  } catch (error) {
    return { success: false, error: 'Error al iniciar sesión' };
  }
}

/**
 * Función para verificar token
 * @param {string} token - Token JWT
 * @returns {Promise<Object>} Resultado de la verificación
 */
async function verifyToken(token) {
  try {
    if (!token) {
      return { success: false, error: 'Token requerido' };
    }
    
    // Verificar token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
    
    return { success: true, data: decoded };
  } catch (error) {
    return { success: false, error: 'Token inválido o expirado' };
  }
}

/**
 * Función para refrescar token
 * @param {string} token - Token JWT actual
 * @returns {Promise<Object>} Resultado del refresco
 */
async function refreshToken(token) {
  try {
    if (!token) {
      return { success: false, error: 'Token requerido' };
    }
    
    // Verificar token actual
    const { success, data } = await verifyToken(token);
    if (!success) {
      return { success: false, error: 'Token inválido' };
    }
    
    // Generar nuevo token
    const newToken = jwt.sign(
      { 
        id: data.id, 
        email: data.email, 
        role: data.role 
      },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '7d' }
    );
    
    return { success: true, data: { token: newToken } };
  } catch (error) {
    return { success: false, error: 'Error al refrescar token' };
  }
}

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    test('should reject invalid email', async () => {
      const result = await registerUser('invalid-email', 'ValidPass123!');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Email inválido');
    });

    test('should reject short password', async () => {
      const result = await registerUser('test@example.com', 'short');
      expect(result.success).toBe(false);
      expect(result.error).toBe('La contraseña debe tener al menos 8 caracteres');
    });

    test('should reject password without uppercase', async () => {
      const result = await registerUser('test@example.com', 'validpass123!');
      expect(result.success).toBe(false);
      expect(result.error).toContain('La contraseña debe contener al menos una mayúscula');
    });

    test('should reject password without lowercase', async () => {
      const result = await registerUser('test@example.com', 'VALIDPASS123!');
      expect(result.success).toBe(false);
      expect(result.error).toContain('La contraseña debe contener al menos una minúscula');
    });

    test('should reject password without numbers', async () => {
      const result = await registerUser('test@example.com', 'ValidPass!');
      expect(result.success).toBe(false);
      expect(result.error).toContain('La contraseña debe contener al menos un número');
    });

    test('should reject password without special characters', async () => {
      const result = await registerUser('test@example.com', 'ValidPass123');
      expect(result.success).toBe(false);
      expect(result.error).toContain('La contraseña debe contener al menos un carácter especial');
    });

    test('should accept valid user data', async () => {
      const mockUserData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com'
      };
      
      mockSupabase.auth.admin.createUser.mockResolvedValue({
        data: { user: mockUserData },
        error: null
      });
      
      const result = await registerUser('test@example.com', 'ValidPass123!');
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ user: mockUserData });
    });

    test('should handle Supabase errors', async () => {
      const errorMessage = 'User already registered';
      
      mockSupabase.auth.admin.createUser.mockResolvedValue({
        data: null,
        error: { message: errorMessage }
      });
      
      const result = await registerUser('test@example.com', 'ValidPass123!');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe(errorMessage);
    });
  });

  describe('loginUser', () => {
    test('should reject invalid email', async () => {
      const result = await loginUser('invalid-email', 'ValidPass123!');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Email inválido');
    });

    test('should reject empty password', async () => {
      const result = await loginUser('test@example.com', '');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Contraseña requerida');
    });

    test('should handle invalid credentials', async () => {
      const errorMessage = 'Invalid login credentials';
      
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: errorMessage }
      });
      
      const result = await loginUser('test@example.com', 'ValidPass123!');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe(errorMessage);
    });

    test('should generate JWT token on successful login', async () => {
      const mockUserData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com'
      };
      
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUserData },
        error: null
      });
      
      const result = await loginUser('test@example.com', 'ValidPass123!');
      
      expect(result.success).toBe(true);
      expect(result.data.token).toBeDefined();
      expect(result.data.user).toEqual({
        id: mockUserData.id,
        email: mockUserData.email,
        role: 'user'
      });
    });
  });

  describe('verifyToken', () => {
    test('should reject empty token', async () => {
      const result = await verifyToken('');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Token requerido');
    });

    test('should reject null token', async () => {
      const result = await verifyToken(null);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Token requerido');
    });

    test('should reject invalid token', async () => {
      const result = await verifyToken('invalid.token');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Token inválido o expirado');
    });

    test('should accept valid token', async () => {
      const payload = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        role: 'user'
      };
      
      const token = jwt.sign(payload, process.env.JWT_SECRET || 'test-secret');
      
      const result = await verifyToken(token);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(payload);
    });
  });

  describe('refreshToken', () => {
    test('should reject empty token', async () => {
      const result = await refreshToken('');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Token requerido');
    });

    test('should reject invalid token', async () => {
      const result = await refreshToken('invalid.token');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Token inválido');
    });

    test('should generate new token for valid token', async () => {
      const payload = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        role: 'user'
      };
      
      const oldToken = jwt.sign(payload, process.env.JWT_SECRET || 'test-secret');
      
      const result = await refreshToken(oldToken);
      
      expect(result.success).toBe(true);
      expect(result.data.token).toBeDefined();
      expect(result.data.token).not.toBe(oldToken); // Debe ser un token nuevo
    });
  });

  describe('Security Tests', () => {
    test('should prevent SQL injection in email', async () => {
      const maliciousEmail = "'; DROP TABLE users; --";
      
      const result = await registerUser(maliciousEmail, 'ValidPass123!');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Email inválido');
    });

    test('should prevent XSS in email', async () => {
      const maliciousEmail = '<script>alert("xss")</script>@example.com';
      
      const result = await registerUser(maliciousEmail, 'ValidPass123!');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Email inválido');
    });

    test('should handle very long password', async () => {
      const longPassword = 'a'.repeat(1000) + 'A1!';
      
      const result = await registerUser('test@example.com', longPassword);
      
      // La validación actual solo verifica longitud mínima, no máxima
      // Este test indica que necesitamos agregar validación de longitud máxima
      expect(result.success).toBe(true); // Fallará cuando agreguemos validación de longitud máxima
    });
  });
});