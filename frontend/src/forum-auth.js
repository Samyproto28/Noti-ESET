import authManager from './auth.js';
import httpOptimizer from './httpOptimizer.js';

/**
 * Componente para gestionar la autenticación en el foro
 */
class ForumAuth {
  constructor() {
    this.init();
  }

  /**
   * Inicializa el componente de autenticación del foro
   */
  init() {
    // Escuchar cambios en el estado de autenticación
    window.addEventListener('authChange', (event) => {
      this.handleAuthChange(event.detail);
    });
  }

  /**
   * Maneja el cambio en el estado de autenticación
   * @param {Object} detail - Detalles del evento de cambio
   */
  handleAuthChange(detail) {
    // Actualizar la UI del foro cuando cambia el estado de autenticación
    this.updateForumUI();
  }

  /**
   * Actualiza la UI del foro según el estado de autenticación
   */
  updateForumUI() {
    // Mostrar/ocultar elementos según el estado de autenticación
    this.toggleAuthElements();
    
    // Actualizar información del usuario en los posts y comentarios
    this.updateUserDisplay();
  }

  /**
   * Muestra u oculta elementos según el estado de autenticación
   */
  toggleAuthElements() {
    const isAuthenticated = authManager.isAuthenticated();
    const isAnonymous = authManager.isAnonymous();
    
    // Elementos que solo se muestran a usuarios autenticados
    const authOnlyElements = document.querySelectorAll('.auth-only');
    authOnlyElements.forEach(element => {
      element.style.display = isAuthenticated ? 'block' : 'none';
    });
    
    // Elementos que se muestran a usuarios anónimos o no autenticados
    const anonymousElements = document.querySelectorAll('.anonymous-only');
    anonymousElements.forEach(element => {
      element.style.display = isAnonymous ? 'block' : 'none';
    });
    
    // Actualizar botones de crear tema
    const createThemeButtons = document.querySelectorAll('.btn-crear-tema');
    createThemeButtons.forEach(button => {
      if (isAuthenticated) {
        button.textContent = '+ Crear Tema';
        button.style.display = 'block';
      } else {
        button.textContent = '+ Crear Tema (Anónimo)';
        button.style.display = 'block';
      }
    });
  }

  /**
   * Actualiza la visualización del usuario en posts y comentarios
   */
  updateUserDisplay() {
    const userId = authManager.getUserId();
    const isAnonymous = authManager.isAnonymous();
    
    // Actualizar información del autor en posts
    const posts = document.querySelectorAll('.tema');
    posts.forEach(post => {
      const authorElement = post.querySelector('.tema-author');
      if (authorElement) {
        const postUserId = authorElement.getAttribute('data-user-id');
        if (postUserId === userId) {
          // Es el autor del post
          if (isAnonymous) {
            authorElement.textContent = 'Tú (Anónimo)';
          } else {
            authorElement.textContent = 'Tú';
          }
        }
      }
      
      // Mostrar/ocultar botones de edición/eliminación
      const editButtons = post.querySelectorAll('.edit-btn');
      const deleteButtons = post.querySelectorAll('.delete-btn');
      
      if (post.getAttribute('data-user-id') === userId) {
        editButtons.forEach(btn => btn.style.display = 'inline-block');
        deleteButtons.forEach(btn => btn.style.display = 'inline-block');
      } else {
        editButtons.forEach(btn => btn.style.display = 'none');
        deleteButtons.forEach(btn => btn.style.display = 'none');
      }
    });
    
    // Actualizar información del autor en comentarios
    const comments = document.querySelectorAll('.comentario');
    comments.forEach(comment => {
      const authorElement = comment.querySelector('.comment-author');
      if (authorElement) {
        const commentUserId = authorElement.getAttribute('data-user-id');
        if (commentUserId === userId) {
          // Es el autor del comentario
          if (isAnonymous) {
            authorElement.textContent = 'Tú (Anónimo)';
          } else {
            authorElement.textContent = 'Tú';
          }
        }
      }
      
      // Mostrar/ocultar botones de edición/eliminación
      const editButtons = comment.querySelectorAll('.edit-btn');
      const deleteButtons = comment.querySelectorAll('.delete-btn');
      
      if (comment.getAttribute('data-user-id') === userId) {
        editButtons.forEach(btn => btn.style.display = 'inline-block');
        deleteButtons.forEach(btn => btn.style.display = 'inline-block');
      } else {
        editButtons.forEach(btn => btn.style.display = 'none');
        deleteButtons.forEach(btn => btn.style.display = 'none');
      }
    });
  }

  /**
   * Obtiene los headers de autenticación para peticiones del foro
   * @returns {Object} Headers con autorización si está autenticado
   */
  getAuthHeaders() {
    return authManager.getAuthHeaders();
  }

  /**
   * Realiza peticiones HTTP con manejo de autenticación para el foro
   * @param {string} url - URL de la petición
   * @param {Object} options - Opciones de la petición
   * @returns {Promise} Respuesta de la petición
   */
  async fetchWithAuth(url, options = {}) {
    try {
      // Obtener headers de autenticación
      const authHeaders = authManager.getAuthHeaders();
      
      // Combinar headers
      const headers = {
        ...options.headers,
        ...authHeaders
      };
      
      // Usar el optimizador HTTP para la petición
      const response = await httpOptimizer.fetch(url, {
        ...options,
        headers
      }, {
        // Evitar duplicados para peticiones GET
        preventDuplicates: options.method === 'GET',
        
        // Tiempo de espera extendido para peticiones del foro
        timeout: 15000,
        
        // Mayor número de reintentos para peticiones críticas
        maxRetries: options.method === 'GET' ? 3 : 1
      });
      
      return response;
    } catch (error) {
      console.error('Error en fetchWithAuth del foro:', error);
      throw error;
    }
  }

  /**
   * Obtiene el ID de usuario para operaciones del foro
   * @returns {string} ID de usuario a usar
   */
  getUserIdForForum() {
    return authManager.getUserIdForForum();
  }

  /**
   * Verifica si el usuario está autenticado
   * @returns {boolean} True si está autenticado
   */
  isAuthenticated() {
    return authManager.isAuthenticated();
  }

  /**
   * Verifica si el usuario es anónimo
   * @returns {boolean} True si es usuario anónimo
   */
  isAnonymous() {
    return authManager.isAnonymous();
  }

  /**
   * Obtiene el ID del usuario actual
   * @returns {string} ID del usuario
   */
  getUserId() {
    return authManager.getUserId();
  }

  /**
   * Muestra un mensaje de autenticación requerida
   * @param {string} action - Acción que requiere autenticación
   */
  showAuthRequiredMessage(action = 'realizar esta acción') {
    const message = document.createElement('div');
    message.textContent = `Debes iniciar sesión para ${action}.`;
    message.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: #ffc107;
      color: #212529;
      padding: 10px 20px;
      border-radius: 5px;
      z-index: 1000;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      font-weight: 500;
    `;
    
    document.body.appendChild(message);
    
    // Eliminar después de 3 segundos
    setTimeout(() => {
      if (message.parentNode) {
        message.parentNode.removeChild(message);
      }
    }, 3000);
    
    // Mostrar el formulario de login
    const authContainer = document.getElementById('auth-container');
    if (authContainer) {
      authContainer.style.display = 'block';
      authContainer.scrollIntoView({ behavior: 'smooth' });
    }
  }

  /**
   * Muestra información del usuario en el foro
   * @param {HTMLElement} container - Contenedor donde mostrar la información
   */
  showUserInfo(container) {
    if (!container) return;
    
    container.innerHTML = '';
    
    if (authManager.isAuthenticated()) {
      const userInfo = document.createElement('div');
      userInfo.className = 'forum-user-info';
      
      if (authManager.isAnonymous()) {
        userInfo.innerHTML = `
          <span class="user-status">Usuario: Anónimo</span>
          <button class="btn-login">Iniciar sesión</button>
        `;
      } else {
        userInfo.innerHTML = `
          <span class="user-status">Usuario: ${authManager.user?.email || 'Desconocido'}</span>
          <button class="btn-logout">Cerrar sesión</button>
        `;
      }
      
      container.appendChild(userInfo);
      
      // Añadir event listeners
      const loginBtn = userInfo.querySelector('.btn-login');
      if (loginBtn) {
        loginBtn.addEventListener('click', () => {
          const authContainer = document.getElementById('auth-container');
          if (authContainer) {
            authContainer.style.display = 'block';
            authContainer.scrollIntoView({ behavior: 'smooth' });
          }
        });
      }
      
      const logoutBtn = userInfo.querySelector('.btn-logout');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          authManager.logout();
        });
      }
    } else {
      const userInfo = document.createElement('div');
      userInfo.className = 'forum-user-info';
      userInfo.innerHTML = `
        <span class="user-status">No has iniciado sesión</span>
        <button class="btn-login">Iniciar sesión</button>
      `;
      
      container.appendChild(userInfo);
      
      // Añadir event listener
      const loginBtn = userInfo.querySelector('.btn-login');
      if (loginBtn) {
        loginBtn.addEventListener('click', () => {
          const authContainer = document.getElementById('auth-container');
          if (authContainer) {
            authContainer.style.display = 'block';
            authContainer.scrollIntoView({ behavior: 'smooth' });
          }
        });
      }
    }
  }
  /**
   * Obtiene estadísticas del optimizador HTTP
   * @returns {Object} Estadísticas de rendimiento
   */
  getHttpStats() {
    return httpOptimizer.getStats();
  }
}

// Crear una instancia única del componente de autenticación del foro
const forumAuth = new ForumAuth();
export default forumAuth;