import authManager from './auth.js';

/**
 * Componente para gestionar la UI de autenticación
 */
class AuthUI {
  constructor() {
    this.elements = {
      // Formularios
      loginForm: document.getElementById('login-form'),
      registerForm: document.getElementById('register-form'),
      userInfo: document.getElementById('user-info'),
      
      // Header
      headerAuthBtn: document.getElementById('header-auth-btn'),
      headerUserInfo: document.getElementById('header-user-info'),
      headerLogoutBtn: document.getElementById('header-logout-btn'),
      authContainer: document.getElementById('auth-container'),
      
      // Botones
      showLoginBtn: document.getElementById('show-login'),
      showRegisterBtn: document.getElementById('show-register'),
      logoutBtn: document.getElementById('logout-btn'),
      
      // Formularios de login/registro
      formLogin: document.getElementById('form-login'),
      formRegister: document.getElementById('form-register'),
      
      // Mensajes de error
      loginError: document.getElementById('login-error'),
      registerError: document.getElementById('register-error'),
      
      // Información de usuario
      userEmail: document.getElementById('user-email')
    };
    
    this.init();
  }

  /**
   * Inicializa el componente de UI de autenticación
   */
  init() {
    // Configurar event listeners
    this.setupEventListeners();
    
    // Escuchar cambios en el estado de autenticación
    window.addEventListener('authChange', (event) => {
      this.handleAuthChange(event.detail);
    });
    
    // Actualizar UI inicial
    this.updateUI();
  }

  /**
   * Configura los event listeners
   */
  setupEventListeners() {
    // Botones para mostrar formularios
    if (this.elements.showLoginBtn) {
      this.elements.showLoginBtn.addEventListener('click', () => this.showLogin());
    }
    
    if (this.elements.showRegisterBtn) {
      this.elements.showRegisterBtn.addEventListener('click', () => this.showRegister());
    }
    
    // Botones de logout
    if (this.elements.logoutBtn) {
      this.elements.logoutBtn.addEventListener('click', () => authManager.logout());
    }
    
    if (this.elements.headerLogoutBtn) {
      this.elements.headerLogoutBtn.addEventListener('click', () => authManager.logout());
    }
    
    // Botón de autenticación del header
    if (this.elements.headerAuthBtn) {
      this.elements.headerAuthBtn.addEventListener('click', () => {
        if (this.elements.authContainer) {
          this.elements.authContainer.style.display = 'block';
          this.elements.authContainer.scrollIntoView({ behavior: 'smooth' });
          this.showLogin();
        }
      });
    }
    
    // Formulario de login
    if (this.elements.formLogin) {
      this.elements.formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleLogin();
      });
    }
    
    // Formulario de registro
    if (this.elements.formRegister) {
      this.elements.formRegister.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleRegister();
      });
    }
  }

  /**
   * Maneja el cambio en el estado de autenticación
   * @param {Object} detail - Detalles del evento de cambio
   */
  handleAuthChange(detail) {
    this.updateUI();
    
    // Mostrar notificación si el usuario ha iniciado sesión
    if (detail.isAuthenticated) {
      this.showNotification('Sesión iniciada correctamente', 'success');
    }
  }

  /**
   * Actualiza la UI según el estado de autenticación
   */
  updateUI() {
    if (authManager.isAuthenticated()) {
      this.showUser(authManager.user?.email || 'Usuario');
    } else {
      this.showLogin();
    }
  }

  /**
   * Muestra el formulario de login
   */
  showLogin() {
    if (this.elements.loginForm) this.elements.loginForm.style.display = 'block';
    if (this.elements.registerForm) this.elements.registerForm.style.display = 'none';
    if (this.elements.userInfo) this.elements.userInfo.style.display = 'none';
    
    if (this.elements.loginError) this.elements.loginError.textContent = '';
    if (this.elements.registerError) this.elements.registerError.textContent = '';
    
    if (this.elements.authContainer) this.elements.authContainer.style.display = 'block';
    
    // Header
    if (this.elements.headerAuthBtn) this.elements.headerAuthBtn.style.display = 'inline';
    if (this.elements.headerUserInfo) this.elements.headerUserInfo.style.display = 'none';
    if (this.elements.headerLogoutBtn) this.elements.headerLogoutBtn.style.display = 'none';
  }

  /**
   * Muestra el formulario de registro
   */
  showRegister() {
    if (this.elements.loginForm) this.elements.loginForm.style.display = 'none';
    if (this.elements.registerForm) this.elements.registerForm.style.display = 'block';
    if (this.elements.userInfo) this.elements.userInfo.style.display = 'none';
    
    if (this.elements.loginError) this.elements.loginError.textContent = '';
    if (this.elements.registerError) this.elements.registerError.textContent = '';
  }

  /**
   * Muestra la información del usuario autenticado
   * @param {string} email - Email del usuario
   */
  showUser(email) {
    if (this.elements.loginForm) this.elements.loginForm.style.display = 'none';
    if (this.elements.registerForm) this.elements.registerForm.style.display = 'none';
    if (this.elements.userInfo) this.elements.userInfo.style.display = 'block';
    
    if (this.elements.userEmail) {
      this.elements.userEmail.textContent = `Sesión iniciada como: ${email}`;
    }
    
    // Header
    if (this.elements.headerAuthBtn) this.elements.headerAuthBtn.style.display = 'none';
    if (this.elements.headerUserInfo) {
      this.elements.headerUserInfo.textContent = email;
      this.elements.headerUserInfo.style.display = 'inline';
    }
    if (this.elements.headerLogoutBtn) this.elements.headerLogoutBtn.style.display = 'inline';
    
    this.hideAuthContainer();
  }

  /**
   * Oculta el contenedor de autenticación
   */
  hideAuthContainer() {
    if (this.elements.authContainer) this.elements.authContainer.style.display = 'none';
  }

  /**
   * Maneja el proceso de login
   */
  async handleLogin() {
    if (!this.elements.formLogin) return;
    
    if (this.elements.loginError) this.elements.loginError.textContent = '';
    
    const email = document.getElementById('login-email')?.value;
    const password = document.getElementById('login-password')?.value;
    
    if (!email || !password) {
      if (this.elements.loginError) {
        this.elements.loginError.textContent = 'Por favor, completa todos los campos';
      }
      return;
    }
    
    const result = await authManager.login(email, password);
    
    if (!result.success) {
      if (this.elements.loginError) {
        this.elements.loginError.textContent = result.error || 'Error en el login';
      }
    }
  }

  /**
   * Maneja el proceso de registro
   */
  async handleRegister() {
    if (!this.elements.formRegister) return;
    
    if (this.elements.registerError) this.elements.registerError.textContent = '';
    
    const email = document.getElementById('register-email')?.value;
    const password = document.getElementById('register-password')?.value;
    
    if (!email || !password) {
      if (this.elements.registerError) {
        this.elements.registerError.textContent = 'Por favor, completa todos los campos';
      }
      return;
    }
    
    const result = await authManager.register(email, password);
    
    if (!result.success) {
      if (this.elements.registerError) {
        this.elements.registerError.textContent = result.error || 'Error en el registro';
      }
    } else {
      if (this.elements.registerError) {
        this.elements.registerError.textContent = result.message || '¡Registro exitoso! Revisa tu correo para verificar tu cuenta.';
      }
      // Cambiar al formulario de login después del registro exitoso
      setTimeout(() => this.showLogin(), 2000);
    }
  }

  /**
   * Muestra una notificación temporal
   * @param {string} message - Mensaje a mostrar
   * @param {string} type - Tipo de notificación (success, error, info)
   */
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.textContent = message;
    
    // Estilos según el tipo
    let bgColor = '#17a2b8'; // info por defecto
    if (type === 'success') bgColor = '#28a745';
    if (type === 'error') bgColor = '#dc3545';
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: ${bgColor};
      color: white;
      padding: 10px 20px;
      border-radius: 5px;
      z-index: 1000;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      font-weight: 500;
    `;
    
    document.body.appendChild(notification);
    
    // Eliminar después de 3 segundos
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }
}

// Crear una instancia única del componente de UI
const authUI = new AuthUI();
export default authUI;