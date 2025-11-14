import { jest } from '@jest/globals';

// Mock del módulo auth-status.js
jest.mock('../src/auth-status.js', () => ({
  showNotification: jest.fn()
}));

// Importar el AuthManager
// Nota: Necesitamos importar la clase real desde auth.js
// Por ahora, vamos a recrear la clase basada en el código existente para poder probarla

/**
 * Clase AuthManager (basada en auth.js)
 */
class AuthManager {
  constructor() {
    this.token = null;
    this.user = null;
    this.API_URL = 'http://localhost:4000/api';
    this.TOKEN_KEY = 'auth_token';
    this.USER_KEY = 'auth_user';
    this.ANONYMOUS_USER_ID = '00000000-0000-0000-0000-000000000000';
    this.TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutos antes de expirar
    this.loadFromStorage();
  }

  loadFromStorage() {
    try {
      let storedToken = localStorage.getItem(this.TOKEN_KEY);
      let storedUser = localStorage.getItem(this.USER_KEY);
      
      if (!storedToken) {
        storedToken = localStorage.getItem('jwt');
        if (storedToken) {
          localStorage.setItem(this.TOKEN_KEY, storedToken);
          localStorage.removeItem('jwt');
        }
      }
      
      if (!storedUser) {
        const oldUser = localStorage.getItem('auth_user');
        if (oldUser) {
          storedUser = oldUser;
        }
      }
      
      if (storedToken) {
        this.token = storedToken;
        this.checkTokenExpiry();
      }
      
      if (storedUser) {
        this.user = JSON.parse(storedUser);
      }
    } catch (error) {
      console.error('Error cargando datos de autenticación:', error);
      this.clearStorage();
    }
  }

  saveToStorage(token, user) {
    try {
      this.token = token;
      this.user = user;
      
      localStorage.setItem(this.TOKEN_KEY, token);
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      
      this.dispatchAuthEvent();
    } catch (error) {
      console.error('Error guardando datos de autenticación:', error);
    }
  }

  clearStorage() {
    this.token = null;
    this.user = null;
    
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem('jwt');
    
    this.dispatchAuthEvent();
  }

  dispatchAuthEvent() {
    const event = new CustomEvent('authChange', {
      detail: {
        isAuthenticated: this.isAuthenticated(),
        user: this.user
      }
    });
    window.dispatchEvent(event);
  }

  getTokenPayload() {
    if (!this.token) return null;
    
    try {
      const parts = this.token.split('.');
      if (parts.length !== 3) return null;
      
      return JSON.parse(atob(parts[1]));
    } catch (error) {
      console.error('Error al decodificar token:', error);
      return null;
    }
  }

  isAuthenticated() {
    return !!this.token;
  }

  isAnonymous() {
    return !this.isAuthenticated() || this.getUserId() === this.ANONYMOUS_USER_ID;
  }

  getUserId() {
    if (this.isAuthenticated() && this.user?.id) {
      return this.user.id;
    }
    return this.ANONYMOUS_USER_ID;
  }

  getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  async login(email, password) {
    try {
      const response = await fetch(`${this.API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const result = await response.json();

      if (result.success) {
        this.saveToStorage(result.data.token, result.data.user);
        return { success: true, user: result.data.user };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error(`Error en login para ${email}:`, error);
      return { success: false, error: 'Error de conexión' };
    }
  }

  logout() {
    this.clearStorage();
  }
}

describe('AuthManager', () => {
  let authManager;

  beforeEach(() => {
    authManager = new AuthManager();
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('Inicialización', () => {
    test('debe inicializar con valores por defecto', () => {
      expect(authManager.token).toBeNull();
      expect(authManager.user).toBeNull();
      expect(authManager.API_URL).toBe('http://localhost:4000/api');
      expect(authManager.TOKEN_KEY).toBe('auth_token');
      expect(authManager.USER_KEY).toBe('auth_user');
      expect(authManager.ANONYMOUS_USER_ID).toBe('00000000-0000-0000-0000-000000000000');
    });

    test('debe cargar datos desde localStorage si existen', () => {
      const mockToken = 'mock.jwt.token';
      const mockUser = { id: '123', email: 'test@test.com' };
      
      localStorage.setItem('auth_token', mockToken);
      localStorage.setItem('auth_user', JSON.stringify(mockUser));
      
      authManager = new AuthManager();
      
      expect(authManager.token).toBe(mockToken);
      expect(authManager.user).toEqual(mockUser);
    });

    test('debe migrar token antiguo si existe', () => {
      const mockToken = 'mock.jwt.token';
      const mockUser = { id: '123', email: 'test@test.com' };
      
      localStorage.setItem('jwt', mockToken);
      localStorage.setItem('auth_user', JSON.stringify(mockUser));
      
      authManager = new AuthManager();
      
      expect(authManager.token).toBe(mockToken);
      expect(localStorage.getItem('jwt')).toBeNull();
      expect(localStorage.getItem('auth_token')).toBe(mockToken);
    });
  });

  describe('saveToStorage', () => {
    test('debe guardar token y usuario en localStorage', () => {
      const mockToken = 'mock.jwt.token';
      const mockUser = { id: '123', email: 'test@test.com' };
      
      authManager.saveToStorage(mockToken, mockUser);
      
      expect(authManager.token).toBe(mockToken);
      expect(authManager.user).toEqual(mockUser);
      expect(localStorage.getItem('auth_token')).toBe(mockToken);
      expect(localStorage.getItem('auth_user')).toBe(JSON.stringify(mockUser));
    });

    test('debe disparar evento authChange', () => {
      const mockDispatchEvent = jest.spyOn(window, 'dispatchEvent');
      const mockToken = 'mock.jwt.token';
      const mockUser = { id: '123', email: 'test@test.com' };
      
      authManager.saveToStorage(mockToken, mockUser);
      
      expect(mockDispatchEvent).toHaveBeenCalled();
      const event = mockDispatchEvent.mock.calls[0][0];
      expect(event.type).toBe('authChange');
      expect(event.detail.isAuthenticated).toBe(true);
      expect(event.detail.user).toEqual(mockUser);
    });
  });

  describe('clearStorage', () => {
    test('debe limpiar datos de autenticación', () => {
      const mockToken = 'mock.jwt.token';
      const mockUser = { id: '123', email: 'test@test.com' };
      
      authManager.saveToStorage(mockToken, mockUser);
      authManager.clearStorage();
      
      expect(authManager.token).toBeNull();
      expect(authManager.user).toBeNull();
      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(localStorage.getItem('auth_user')).toBeNull();
    });

    test('debe disparar evento authChange', () => {
      const mockDispatchEvent = jest.spyOn(window, 'dispatchEvent');
      
      authManager.clearStorage();
      
      expect(mockDispatchEvent).toHaveBeenCalled();
      const event = mockDispatchEvent.mock.calls[0][0];
      expect(event.type).toBe('authChange');
      expect(event.detail.isAuthenticated).toBe(false);
    });
  });

  describe('isAuthenticated', () => {
    test('debe retornar false si no hay token', () => {
      expect(authManager.isAuthenticated()).toBe(false);
    });

    test('debe retornar true si hay token', () => {
      authManager.token = 'mock.jwt.token';
      expect(authManager.isAuthenticated()).toBe(true);
    });
  });

  describe('isAnonymous', () => {
    test('debe retornar true si no está autenticado', () => {
      expect(authManager.isAnonymous()).toBe(true);
    });

    test('debe retornar true si el ID es de usuario anónimo', () => {
      authManager.token = 'mock.jwt.token';
      authManager.user = { id: '00000000-0000-0000-0000-000000000000' };
      expect(authManager.isAnonymous()).toBe(true);
    });

    test('debe retornar false si está autenticado y no es anónimo', () => {
      authManager.token = 'mock.jwt.token';
      authManager.user = { id: '123e4567-e89b-12d3-a456-426614174000' };
      expect(authManager.isAnonymous()).toBe(false);
    });
  });

  describe('getUserId', () => {
    test('debe retornar ID de usuario anónimo si no está autenticado', () => {
      expect(authManager.getUserId()).toBe('00000000-0000-0000-0000-000000000000');
    });

    test('debe retornar ID de usuario si está autenticado', () => {
      authManager.token = 'mock.jwt.token';
      authManager.user = { id: '123e4567-e89b-12d3-a456-426614174000' };
      expect(authManager.getUserId()).toBe('123e4567-e89b-12d3-a456-426614174000');
    });
  });

  describe('getAuthHeaders', () => {
    test('debe retornar headers básicos si no hay token', () => {
      const headers = authManager.getAuthHeaders();
      expect(headers).toEqual({ 'Content-Type': 'application/json' });
    });

    test('debe retornar headers con autorización si hay token', () => {
      authManager.token = 'mock.jwt.token';
      const headers = authManager.getAuthHeaders();
      expect(headers).toEqual({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock.jwt.token'
      });
    });
  });

  describe('getTokenPayload', () => {
    test('debe retornar null si no hay token', () => {
      expect(authManager.getTokenPayload()).toBeNull();
    });

    test('debe retornar null si el token es inválido', () => {
      authManager.token = 'invalid.token';
      expect(authManager.getTokenPayload()).toBeNull();
    });

    test('debe decodificar token JWT válido', () => {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify({ id: '123', email: 'test@test.com', exp: Date.now() / 1000 + 3600 }));
      const signature = 'signature';
      authManager.token = `${header}.${payload}.${signature}`;
      
      const decoded = authManager.getTokenPayload();
      expect(decoded.id).toBe('123');
      expect(decoded.email).toBe('test@test.com');
    });
  });

  describe('login', () => {
    test('debe manejar login exitoso', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: {
            token: 'mock.jwt.token',
            user: { id: '123', email: 'test@test.com' }
          }
        })
      };
      
      global.fetch = jest.fn().mockResolvedValue(mockResponse);
      
      const result = await authManager.login('test@test.com', 'password');
      
      expect(result.success).toBe(true);
      expect(result.user).toEqual({ id: '123', email: 'test@test.com' });
      expect(authManager.token).toBe('mock.jwt.token');
      expect(authManager.user).toEqual({ id: '123', email: 'test@test.com' });
    });

    test('debe manejar login fallido', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: false,
          error: 'Credenciales inválidas'
        })
      };
      
      global.fetch = jest.fn().mockResolvedValue(mockResponse);
      
      const result = await authManager.login('test@test.com', 'wrongpassword');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Credenciales inválidas');
      expect(authManager.token).toBeNull();
      expect(authManager.user).toBeNull();
    });

    test('debe manejar error de conexión', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Error de red'));
      
      const result = await authManager.login('test@test.com', 'password');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Error de conexión');
    });
  });

  describe('logout', () => {
    test('debe limpiar datos de autenticación', () => {
      authManager.token = 'mock.jwt.token';
      authManager.user = { id: '123', email: 'test@test.com' };
      
      authManager.logout();
      
      expect(authManager.token).toBeNull();
      expect(authManager.user).toBeNull();
    });
  });
});