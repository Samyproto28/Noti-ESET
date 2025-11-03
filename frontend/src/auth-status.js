import authManager from './auth.js';

/**
 * Componente para mostrar indicadores visuales del estado de autenticación
 */
class AuthStatus {
  constructor() {
    this.statusIndicator = null;
    this.userInfo = null;
    this.init();
  }

  /**
   * Inicializa el componente de estado de autenticación
   */
  init() {
    this.createStatusIndicator();
    this.createUserInfo();
    
    // Escuchar cambios en el estado de autenticación
    window.addEventListener('authChange', (event) => {
      this.updateStatus(event.detail);
    });
    
    // Actualizar estado inicial
    this.updateStatus({
      isAuthenticated: authManager.isAuthenticated(),
      user: authManager.user
    });
  }

  /**
   * Crea el indicador de estado de autenticación
   */
  createStatusIndicator() {
    // Crear contenedor para el indicador de estado
    this.statusIndicator = document.createElement('div');
    this.statusIndicator.id = 'auth-status-indicator';
    this.statusIndicator.className = 'auth-status-indicator';
    
    // Estilos iniciales
    this.statusIndicator.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      padding: 8px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      z-index: 1000;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 6px;
    `;
    
    // Añadir al DOM
    document.body.appendChild(this.statusIndicator);
  }

  /**
   * Crea el componente de información del usuario
   */
  createUserInfo() {
    // Crear contenedor para la información del usuario
    this.userInfo = document.createElement('div');
    this.userInfo.id = 'auth-user-info';
    this.userInfo.className = 'auth-user-info';
    
    // Estilos iniciales
    this.userInfo.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background-color: white;
      border-radius: 8px;
      padding: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      z-index: 1000;
      max-width: 250px;
      transform: translateY(150%);
      transition: transform 0.3s ease;
    `;
    
    // Añadir al DOM
    document.body.appendChild(this.userInfo);
    
    // Añadir botón para mostrar/ocultar
    const toggleButton = document.createElement('button');
    toggleButton.id = 'auth-user-info-toggle';
    toggleButton.textContent = '👤';
    toggleButton.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background-color: #007bff;
      color: white;
      border: none;
      font-size: 16px;
      cursor: pointer;
      z-index: 1001;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      transition: all 0.3s ease;
    `;
    
    toggleButton.addEventListener('click', () => {
      const isVisible = this.userInfo.style.transform === 'translateY(0)';
      this.userInfo.style.transform = isVisible ? 'translateY(150%)' : 'translateY(0)';
    });
    
    document.body.appendChild(toggleButton);
  }

  /**
   * Actualiza el estado de autenticación
   * @param {Object} detail - Detalles del estado de autenticación
   */
  updateStatus(detail) {
    const { isAuthenticated, user } = detail;
    
    // Actualizar indicador de estado
    if (isAuthenticated) {
      this.statusIndicator.style.backgroundColor = '#28a745';
      this.statusIndicator.style.color = 'white';
      this.statusIndicator.innerHTML = `
        <span class="status-dot" style="width: 8px; height: 8px; background-color: white; border-radius: 50%;"></span>
        <span>Conectado</span>
      `;
    } else {
      this.statusIndicator.style.backgroundColor = '#6c757d';
      this.statusIndicator.style.color = 'white';
      this.statusIndicator.innerHTML = `
        <span class="status-dot" style="width: 8px; height: 8px; background-color: white; border-radius: 50%;"></span>
        <span>No conectado</span>
      `;
    }
    
    // Actualizar información del usuario
    this.updateUserInfo(isAuthenticated, user);
  }

  /**
   * Actualiza la información del usuario
   * @param {boolean} isAuthenticated - Estado de autenticación
   * @param {Object} user - Datos del usuario
   */
  updateUserInfo(isAuthenticated, user) {
    if (isAuthenticated && user) {
      const isAnonymous = authManager.isAnonymous();
      
      this.userInfo.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
          <div style="width: 40px; height: 40px; border-radius: 50%; background-color: #007bff; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
            ${isAnonymous ? 'A' : (user.email ? user.email.charAt(0).toUpperCase() : 'U')}
          </div>
          <div>
            <div style="font-weight: 600;">${isAnonymous ? 'Usuario Anónimo' : 'Usuario Autenticado'}</div>
            <div style="font-size: 12px; color: #6c757d;">${isAnonymous ? 'Puedes participar en el foro de forma anónima' : user.email || 'Email no disponible'}</div>
          </div>
        </div>
        <div style="border-top: 1px solid #e9ecef; padding-top: 10px;">
          <div style="font-size: 12px; color: #6c757d; margin-bottom: 8px;">
            ${isAnonymous ? 'Para acceder a todas las funciones, inicia sesión.' : 'Tienes acceso a todas las funciones del sitio.'}
          </div>
          <div style="display: flex; gap: 8px;">
            ${isAnonymous ? 
              `<button id="auth-login-btn" style="flex: 1; padding: 6px 12px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Iniciar sesión</button>` :
              `<button id="auth-logout-btn" style="flex: 1; padding: 6px 12px; background-color: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Cerrar sesión</button>`
            }
            <button id="auth-close-btn" style="padding: 6px 12px; background-color: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Cerrar</button>
          </div>
        </div>
      `;
      
      // Añadir event listeners
      const loginBtn = this.userInfo.querySelector('#auth-login-btn');
      if (loginBtn) {
        loginBtn.addEventListener('click', () => {
          const authContainer = document.getElementById('auth-container');
          if (authContainer) {
            authContainer.style.display = 'block';
            authContainer.scrollIntoView({ behavior: 'smooth' });
          }
          this.userInfo.style.transform = 'translateY(150%)';
        });
      }
      
      const logoutBtn = this.userInfo.querySelector('#auth-logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          authManager.logout();
        });
      }
      
      const closeBtn = this.userInfo.querySelector('#auth-close-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          this.userInfo.style.transform = 'translateY(150%)';
        });
      }
    } else {
      this.userInfo.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
          <div style="width: 40px; height: 40px; border-radius: 50%; background-color: #6c757d; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
            ?
          </div>
          <div>
            <div style="font-weight: 600;">No has iniciado sesión</div>
            <div style="font-size: 12px; color: #6c757d;">Inicia sesión para acceder a todas las funciones</div>
          </div>
        </div>
        <div style="border-top: 1px solid #e9ecef; padding-top: 10px;">
          <div style="font-size: 12px; color: #6c757d; margin-bottom: 8px;">
            Puedes navegar por el sitio, pero algunas funciones estarán limitadas.
          </div>
          <div style="display: flex; gap: 8px;">
            <button id="auth-login-btn" style="flex: 1; padding: 6px 12px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Iniciar sesión</button>
            <button id="auth-close-btn" style="padding: 6px 12px; background-color: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">Cerrar</button>
          </div>
        </div>
      `;
      
      // Añadir event listeners
      const loginBtn = this.userInfo.querySelector('#auth-login-btn');
      if (loginBtn) {
        loginBtn.addEventListener('click', () => {
          const authContainer = document.getElementById('auth-container');
          if (authContainer) {
            authContainer.style.display = 'block';
            authContainer.scrollIntoView({ behavior: 'smooth' });
          }
          this.userInfo.style.transform = 'translateY(150%)';
        });
      }
      
      const closeBtn = this.userInfo.querySelector('#auth-close-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          this.userInfo.style.transform = 'translateY(150%)';
        });
      }
    }
  }

  /**
   * Muestra una notificación sobre el estado de autenticación
   * @param {string} message - Mensaje a mostrar
   * @param {string} type - Tipo de notificación (success, error, info, warning)
   */
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `auth-notification auth-notification-${type}`;
    notification.textContent = message;
    
    // Estilos según el tipo
    let bgColor = '#17a2b8'; // info por defecto
    if (type === 'success') bgColor = '#28a745';
    if (type === 'error') bgColor = '#dc3545';
    if (type === 'warning') bgColor = '#ffc107';
    
    notification.style.cssText = `
      position: fixed;
      top: 60px;
      right: 20px;
      background-color: ${bgColor};
      color: ${type === 'warning' ? '#212529' : 'white'};
      padding: 12px 20px;
      border-radius: 6px;
      z-index: 1002;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-weight: 500;
      max-width: 300px;
      transform: translateX(400px);
      transition: transform 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Eliminar después de 5 segundos
    setTimeout(() => {
      notification.style.transform = 'translateX(400px)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 5000);
  }
}

// Crear una instancia única del componente de estado de autenticación
const authStatus = new AuthStatus();
export default authStatus;