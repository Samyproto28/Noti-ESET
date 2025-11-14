import authStatus from './auth-status.js';
export const API_URL = 'http://localhost:4000/api';

class AuthManager {
  constructor() {
    this.token = null;
    this.user = null;
    this.API_URL = API_URL;
    this.TOKEN_KEY = 'auth_token';
    this.USER_KEY = 'auth_user';
    this.ANONYMOUS_USER_ID = '00000000-0000-0000-0000-000000000000';
    this.TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutos antes de expirar
    this.loadFromStorage();
  }

  /**
   * Carga datos de autenticación desde localStorage
   */
  loadFromStorage() {
    try {
      // Intentar cargar con la nueva clave primero
      let storedToken = localStorage.getItem(this.TOKEN_KEY);
      let storedUser = localStorage.getItem(this.USER_KEY);
      
      // Si no existe, intentar con la clave antigua para compatibilidad
      if (!storedToken) {
        storedToken = localStorage.getItem('jwt');
        if (storedToken) {
          // Migrar a la nueva clave
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
        // Verificar si el token está por expirar y renovarlo si es necesario
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

  /**
   * Guarda datos de autenticación en localStorage
   * @param {string} token - Token de autenticación
   * @param {Object} user - Datos del usuario
   */
  saveToStorage(token, user) {
    try {
      this.token = token;
      this.user = user;
      
      localStorage.setItem(this.TOKEN_KEY, token);
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      
      // Disparar evento de cambio de autenticación
      this.dispatchAuthEvent();
      
      // Mostrar notificación de éxito
      authStatus.showNotification('Sesión iniciada correctamente', 'success');
    } catch (error) {
      console.error('Error guardando datos de autenticación:', error);
    }
  }

  /**
   * Limpia los datos de autenticación
   */
  clearStorage() {
    this.token = null;
    this.user = null;
    
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem('jwt'); // Limpiar también la clave antigua
    
    // Disparar evento de cambio de autenticación
    this.dispatchAuthEvent();
  }

  /**
   * Dispara un evento personalizado cuando cambia el estado de autenticación
   */
  dispatchAuthEvent() {
    const event = new CustomEvent('authChange', {
      detail: {
        isAuthenticated: this.isAuthenticated(),
        user: this.user
      }
    });
    window.dispatchEvent(event);
  }

  /**
   * Verifica si el token está por expirar y lo renueva si es necesario
   */
  async checkTokenExpiry() {
    if (!this.token) return;
    
    try {
      const payload = this.getTokenPayload();
      if (!payload || !payload.exp) return;
      
      const now = Date.now() / 1000;
      const timeUntilExpiry = payload.exp - now;
      
      // Si el token expira en menos de 5 minutos, renovarlo
      if (timeUntilExpiry < this.TOKEN_REFRESH_THRESHOLD / 1000) {
        await this.refreshToken();
      }
    } catch (error) {
      console.error('Error verificando expiración del token:', error);
    }
  }

  /**
   * Obtiene el payload del token JWT
   * @returns {Object|null} Payload del token o null si hay error
   */
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

  /**
   * Renueva el token de autenticación
   * @returns {Promise<boolean>} True si se renovó exitosamente
   */
  async refreshToken() {
    try {
      const response = await fetch(`${this.API_URL}/auth/refresh`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data.token) {
          this.token = result.data.token;
          localStorage.setItem(this.TOKEN_KEY, result.data.token);
          return true;
        }
      }
    } catch (error) {
      console.error('Error renovando token:', error);
    }
    
    // Si no se puede renovar, cerrar sesión
    this.logout();
    return false;
  }

  /**
   * Obtiene los headers de autorización para peticiones HTTP
   * @returns {Object} Headers con autorización si está autenticado
   */
  getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  /**
   * Realiza peticiones HTTP con manejo de autenticación
   * @param {string} url - URL de la petición
   * @param {Object} options - Opciones de la petición
   * @returns {Promise} Respuesta de la petición
   */
  async fetchWithAuth(url, options = {}) {
    // Verificar si el token está por expirar antes de hacer la petición
    await this.checkTokenExpiry();
    
    const headers = this.getAuthHeaders();
    
    const fetchOptions = {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      }
    };
    
    try {
      const response = await fetch(url, fetchOptions);
      
      // Si el token expiró, intentar renovarlo y reintentar una vez
      if (response.status === 401 && this.token) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Reintentar la petición con el nuevo token
          fetchOptions.headers['Authorization'] = `Bearer ${this.token}`;
          return fetch(url, fetchOptions);
        }
      }
      
      return response;
    } catch (error) {
      console.error('Error en petición autenticada:', error);
      throw error;
    }
  }

  /**
   * Verifica si el usuario está autenticado
   * @returns {boolean} True si está autenticado
   */
  isAuthenticated() {
    return !!this.token;
  }

  /**
   * Verifica si el usuario es anónimo
   * @returns {boolean} True si es usuario anónimo
   */
  isAnonymous() {
    return !this.isAuthenticated() || this.getUserId() === this.ANONYMOUS_USER_ID;
  }

  /**
   * Obtiene el ID del usuario actual
   * @returns {string} ID del usuario (ID anónimo si no está autenticado)
   */
  getUserId() {
    if (this.isAuthenticated() && this.user?.id) {
      return this.user.id;
    }
    return this.ANONYMOUS_USER_ID;
  }

  /**
   * Obtiene el ID de usuario apropiado para operaciones del foro
   * @param {string|null} userId - ID de usuario proporcionado (opcional)
   * @returns {string} ID de usuario a usar
   */
  getUserIdForForum(userId = null) {
    // Si se proporciona un ID válido, usarlo
    if (userId && this.isValidUserId(userId)) {
      return userId;
    }
    
    // Si no, usar el ID del usuario actual o el anónimo
    return this.getUserId();
  }

  /**
   * Verifica si un ID es un UUID válido
   * @param {string} userId - ID a verificar
   * @returns {boolean} True si es un UUID válido
   */
  isValidUserId(userId) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(userId);
  }

  /**
   * Obtiene el ID de usuario anónimo
   * @returns {string} ID de usuario anónimo
   */
  getAnonymousUserId() {
    return this.ANONYMOUS_USER_ID;
  }

  /**
   * Inicia sesión con las credenciales proporcionadas
   * @param {string} email - Email del usuario
   * @param {string} password - Contraseña del usuario
   * @returns {Promise<Object>} Resultado de la autenticación
   */
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
        // Mostrar notificación de error
        authStatus.showNotification(result.error || 'Error en el inicio de sesión', 'error');
        return { success: false, error: result.error };
      }
    } catch (error) {
      // Mejorar manejo de errores con logging específico
      console.error(`Error en login para ${email}:`, error);
      return { success: false, error: 'Error de conexión' };
    }
  }

  /**
   * Registra un nuevo usuario
   * @param {string} email - Email del usuario
   * @param {string} password - Contraseña del usuario
   * @returns {Promise<Object>} Resultado del registro
   */
  async register(email, password) {
    try {
      const response = await fetch(`${this.API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const result = await response.json();

      if (result.success) {
        // Mostrar notificación de éxito
        authStatus.showNotification(result.message || '¡Registro exitoso!', 'success');
        return { success: true, message: result.message };
      } else {
        // Mostrar notificación de error
        authStatus.showNotification(result.error || 'Error en el registro', 'error');
        return { success: false, error: result.error };
      }
    } catch (error) {
      // Mejorar manejo de errores con logging específico
      console.error(`Error en register para ${email}:`, error);
      return { success: false, error: 'Error de conexión' };
    }
  }

  /**
   * Obtiene el perfil del usuario autenticado
   * @returns {Promise<Object|null>} Datos del perfil o null si hay error
   */
  async getProfile() {
    try {
      const response = await this.fetchWithAuth(`${this.API_URL}/auth/profile`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          this.user = result.data;
          localStorage.setItem(this.USER_KEY, JSON.stringify(this.user));
          return this.user;
        }
      }
    } catch (error) {
      console.error('Error obteniendo perfil:', error);
    }
    
    return null;
  }

  /**
   * Cierra la sesión del usuario
   */
  logout() {
    // Mostrar notificación antes de cerrar sesión
    authStatus.showNotification('Cerrando sesión...', 'info');
    
    this.clearStorage();
    
    // Mostrar notificación de cierre de sesión
    setTimeout(() => {
      authStatus.showNotification('Sesión cerrada correctamente', 'info');
    }, 500);
    
    // Redirigir a la página principal después de un breve retraso
    setTimeout(() => {
      window.location.href = '/index.html';
    }, 1500);
  }

  /**
   * Función de compatibilidad para obtener el token (usada por código antiguo)
   * @returns {string|null} Token de autenticación
   */
  getToken() {
    return this.token;
  }

  /**
   * Función de compatibilidad para guardar el token (usada por código antiguo)
   * @param {string} token - Token a guardar
   */
  saveToken(token) {
    if (!this.user) {
      // Si no tenemos datos del usuario, intentar extraerlos del token
      const payload = this.getTokenPayload();
      if (payload) {
        this.user = {
          id: payload.id,
          email: payload.email,
          role: payload.role
        };
      }
    }
    this.saveToStorage(token, this.user);
  }

  /**
   * Función de compatibilidad para eliminar el token (usada por código antiguo)
   */
  removeToken() {
    this.clearStorage();
  }
}

// Exportar una instancia única
const authManager = new AuthManager();
export default authManager;

// Exportar funciones de compatibilidad para código antiguo
export const getToken = () => authManager.getToken();
export const saveToken = (token) => authManager.saveToken(token);
export const removeToken = () => authManager.removeToken();
export const getUserIdForForum = () => authManager.getUserIdForForum();
export const getAnonymousUserId = () => authManager.getAnonymousUserId();
export const isValidUserId = (userId) => authManager.isValidUserId(userId);