import authManager from './auth.js';

const API_URL = 'http://localhost:4000/api';

let currentUser = null;

// Funciones de compatibilidad que ahora usan authManager
function saveToken(token) {
    authManager.saveToken(token);
}

function getToken() {
    return authManager.getToken();
}

function removeToken() {
    authManager.removeToken();
}

async function fetchProfile() {
    return await authManager.getProfile();
}

function mostrarMensajeSesionExpirada() {
    let msg = document.getElementById('sesion-expirada-msg');
    if (!msg) {
        msg = document.createElement('div');
        msg.id = 'sesion-expirada-msg';
        msg.style.background = '#b60000';
        msg.style.color = 'white';
        msg.style.padding = '1em';
        msg.style.textAlign = 'center';
        msg.style.position = 'fixed';
        msg.style.top = '0';
        msg.style.left = '0';
        msg.style.width = '100vw';
        msg.style.zIndex = '9999';
        document.body.appendChild(msg);
    }
    msg.textContent = 'Sesión expirada o inválida. Por favor, inicia sesión de nuevo.';
    setTimeout(() => { if (msg) msg.remove(); }, 4000);
}

async function actualizarUIporSesion() {
    currentUser = await fetchProfile();
    mostrarFormularioNoticia(!!currentUser);
    mostrarFormularioTema && mostrarFormularioTema(!!currentUser);
    if (currentUser && currentUser.email) {
        showUser(currentUser.email);
    } else {
        showLogin();
    }
}

async function checkSession() {
    await actualizarUIporSesion();
}

async function fetchProtegido(url, options = {}) {
    try {
        return await authManager.fetchWithAuth(url, options);
    } catch (error) {
        if (error.message === 'Sesión expirada' || error.message === 'No autenticado') {
            mostrarMensajeSesionExpirada();
            await actualizarUIporSesion();
        }
        throw error;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const userInfo = document.getElementById('user-info');
    const showLoginBtn = document.getElementById('show-login');
    const showRegisterBtn = document.getElementById('show-register');
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');
    const loginError = document.getElementById('login-error');
    const registerError = document.getElementById('register-error');
    const userEmail = document.getElementById('user-email');
    const logoutBtn = document.getElementById('logout-btn');
    const publicarNoticiaForm = document.getElementById('publicar-noticia');


    const headerAuthBtn = document.getElementById('header-auth-btn');
    const headerUserInfo = document.getElementById('header-user-info');
    const headerLogoutBtn = document.getElementById('header-logout-btn');
    const authContainer = document.getElementById('auth-container');


    function showLogin() {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        userInfo.style.display = 'none';
        loginError.textContent = '';
        registerError.textContent = '';
        mostrarFormularioNoticia(false);
        if (authContainer) authContainer.style.display = 'block';
        // Header
        if (headerAuthBtn) headerAuthBtn.style.display = 'inline';
        if (headerUserInfo) headerUserInfo.style.display = 'none';
        if (headerLogoutBtn) headerLogoutBtn.style.display = 'none';
    }
    function showRegister() {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        userInfo.style.display = 'none';
        loginError.textContent = '';
        registerError.textContent = '';
        mostrarFormularioNoticia(false);
    }
    function showUser(email) {
        loginForm.style.display = 'none';
        registerForm.style.display = 'none';
        userInfo.style.display = 'block';
        userEmail.textContent = `Sesión iniciada como: ${email}`;
        mostrarFormularioNoticia(true);
        // Header
        if (headerAuthBtn) headerAuthBtn.style.display = 'none';
        if (headerUserInfo) {
            headerUserInfo.textContent = email;
            headerUserInfo.style.display = 'inline';
        }
        if (headerLogoutBtn) headerLogoutBtn.style.display = 'inline';
        hideAuthContainer();
    }

    function mostrarFormularioNoticia(visible) {
        if (publicarNoticiaForm) {
            publicarNoticiaForm.style.display = visible ? 'flex' : 'none';
        }
    }

    if (showLoginBtn) showLoginBtn.addEventListener('click', showLogin);
    if (showRegisterBtn) showRegisterBtn.addEventListener('click', showRegister);

    if (formRegister) {
        formRegister.addEventListener('submit', async (e) => {
            e.preventDefault();
            registerError.textContent = '';
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            
            const result = await authManager.register(email, password);
            if (!result.success) {
                registerError.textContent = result.error || 'Error en el registro';
            } else {
                registerError.textContent = result.message || '¡Registro exitoso! Revisa tu correo para verificar tu cuenta.';
                // Cambiar al formulario de login después del registro exitoso
                showLogin();
            }
        });
    }

    // Login
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            loginError.textContent = '';
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            const result = await authManager.login(email, password);
            if (!result.success) {
                loginError.textContent = result.error || 'Error en el login';
            } else {
                showUser(email);
                await actualizarUIporSesion(); // Actualizar UI después del login
            }
        });
    }

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            authManager.logout();
        });
    }
    checkSession();
    window.addEventListener('storage', checkSession);
    if (headerAuthBtn) {
        headerAuthBtn.addEventListener('click', () => {
            authContainer.style.display = 'block';
            authContainer.scrollIntoView({ behavior: 'smooth' });
            showLogin();
        });
    }
    if (headerLogoutBtn) {
        headerLogoutBtn.addEventListener('click', async () => {
            authManager.logout();
        });
    }
    function hideAuthContainer() {
        if (authContainer) authContainer.style.display = 'none';
    }
    const noticiasSection = document.getElementById('noticias');
    let noticias = [];
    function renderNoticias() {
        const noticiasList = noticiasSection.querySelector('.noticias-list') || document.createElement('div');
        noticiasList.className = 'noticias-list';
        noticiasList.innerHTML = '';
        if (noticias.length === 0) {
            noticiasList.innerHTML = '<p>No hay noticias aún.</p>';
        } else {
            noticias.forEach(noticia => {
                const article = document.createElement('article');
                article.className = 'noticia';
                article.innerHTML = `
                    <h3>${noticia.title}</h3>
                    ${noticia.image_url ? `<img src="${noticia.image_url}" alt="Imagen de la noticia">` : ''}
                    <p><strong>Autor:</strong> ${noticia.user_id === authManager.getAnonymousUserId() ? 'Anónimo' : noticia.user_id || 'Anónimo'}</p>
                    <p><strong>Fecha:</strong> ${new Date(noticia.created_at).toLocaleString()}</p>
                    <p>${noticia.content}</p>
                `;
                const user = authManager.isAuthenticated() ? authManager.user : null;
                if (user && noticia.user_id === user.id) {
                    const editBtn = document.createElement('button');
                    editBtn.textContent = 'Editar';
                    editBtn.onclick = () => editarNoticia(noticia);
                    const deleteBtn = document.createElement('button');
                    deleteBtn.textContent = 'Eliminar';
                    deleteBtn.onclick = () => eliminarNoticia(noticia.id);
                    article.appendChild(editBtn);
                    article.appendChild(deleteBtn);
                }
                noticiasList.appendChild(article);
            });
        }
        if (!noticiasSection.querySelector('.noticias-list')) {
            noticiasSection.appendChild(noticiasList);
        }
    }
    async function cargarNoticias() {
        try {
            const res = await fetchProtegido(`${API_URL}/news`);
            noticias = await res.json();
            renderNoticias();
        } catch {
            noticias = [];
            renderNoticias();
        }
    }

    if (publicarNoticiaForm) {
        publicarNoticiaForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const titulo = document.getElementById('titulo-noticia').value;
            const cuerpo = document.getElementById('cuerpo-noticia').value;
            // const categoria = document.getElementById('categoria-noticia').value; // No se usa en backend
            // const imagen = document.getElementById('imagen-noticia').files[0]; // No se usa en backend
            const token = getToken();
            if (!token) {
                alert('Debes iniciar sesión para publicar.');
                return;
            }
            try {
                const res = await fetchProtegido(`${API_URL}/news`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ title: titulo, content: cuerpo })
                });
                if (!res.ok) {
                    const data = await res.json();
                    alert(data.error || 'Error al publicar noticia');
                } else {
                    publicarNoticiaForm.reset();
                    cargarNoticias();
                }
            } catch {
                alert('Error de red');
            }
        });
    }
    let editandoNoticiaId = null;
    function editarNoticia(noticia) {
        document.getElementById('titulo-noticia').value = noticia.title;
        document.getElementById('cuerpo-noticia').value = noticia.content;
        editandoNoticiaId = noticia.id;
        publicarNoticiaForm.querySelector('button[type="submit"]').textContent = 'Guardar cambios';
    }

    publicarNoticiaForm.addEventListener('submit', async (e) => {
        if (!editandoNoticiaId) return;
        e.preventDefault();
        const titulo = document.getElementById('titulo-noticia').value;
        const cuerpo = document.getElementById('cuerpo-noticia').value;
        const token = getToken();
        if (!token) {
            alert('Debes iniciar sesión para editar.');
            return;
        }
        try {
            const res = await fetchProtegido(`${API_URL}/news/${editandoNoticiaId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ title: titulo, content: cuerpo })
            });
            if (!res.ok) {
                const data = await res.json();
                alert(data.error || 'Error al editar noticia');
            } else {
                publicarNoticiaForm.reset();
                publicarNoticiaForm.querySelector('button[type="submit"]').textContent = 'Publicar';
                editandoNoticiaId = null;
                cargarNoticias();
            }
        } catch {
            alert('Error de red');
        }
    }, true);

    async function eliminarNoticia(id) {
        const token = getToken();
        if (!token) {
            alert('Debes iniciar sesión para eliminar.');
            return;
        }
        if (!confirm('¿Seguro que quieres eliminar esta noticia?')) return;
        try {
            const res = await fetchProtegido(`${API_URL}/news/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!res.ok) {
                const data = await res.json();
                alert(data.error || 'Error al eliminar noticia');
            } else {
                cargarNoticias();
            }
        } catch {
            alert('Error de red');
        }
    }
    cargarNoticias();

    // Inicialización del Swiper
    const swiper = new Swiper('.galeria-swiper', {
        // Opciones de Swiper
        loop: true,
        slidesPerView: 1,
        spaceBetween: 20,
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },
        pagination: {
            el: '.swiper-pagination',
            clickable: true,
        },
        breakpoints: {
            // when window width is >= 640px
            640: {
                slidesPerView: 2,
                spaceBetween: 20
            },
            // when window width is >= 1024px
            1024: {
                slidesPerView: 3,
                spaceBetween: 30
            }
        }
    });

    // La funcionalidad del foro ahora está en forum.js
});
