const API_URL = 'https://noti-eset.onrender.com/api';

let currentUser = null;

function saveToken(token) {
    localStorage.setItem('jwt', token);
}
function getToken() {
    return localStorage.getItem('jwt');
}
function removeToken() {
    localStorage.removeItem('jwt');
}

async function fetchProfile() {
    const token = getToken();
    if (!token) return null;
    try {
        const res = await fetch(`${API_URL}/auth/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.user;
    } catch {
        return null;
    }
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
    const token = getToken();
    if (!token) {
        mostrarMensajeSesionExpirada();
        await actualizarUIporSesion();
        throw new Error('No autenticado');
    }
    options.headers = options.headers || {};
    options.headers['Authorization'] = `Bearer ${token}`;
    try {
        const res = await fetch(url, options);
        if (res.status === 401) {
            removeToken();
            mostrarMensajeSesionExpirada();
            await actualizarUIporSesion();
            throw new Error('Sesión expirada');
        }
        return res;
    } catch (err) {
        mostrarMensajeSesionExpirada();
        await actualizarUIporSesion();
        throw err;
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
            try {
                const res = await fetch(`${API_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                if (!res.ok) {
                    registerError.textContent = data.error || 'Error en el registro';
                } else {
                    registerError.textContent = data.message || '¡Registro exitoso! Revisa tu correo para verificar tu cuenta.';
                }
            } catch (err) {
                registerError.textContent = 'Error de red';
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
            try {
                const res = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                if (!res.ok) {
                    loginError.textContent = data.error || 'Error en el login';
                } else {
                    saveToken(data.token);
                    showUser(email);
                }
            } catch (err) {
                loginError.textContent = 'Error de red';
            }
        });
    }

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            removeToken();
            showLogin();
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
            removeToken();
            showLogin();
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
                    <p><strong>Autor:</strong> ${noticia.user_id || 'Anónimo'}</p>
                    <p><strong>Fecha:</strong> ${new Date(noticia.created_at).toLocaleString()}</p>
                    <p>${noticia.content}</p>
                `;
                const user = getToken() ? JSON.parse(atob(getToken().split('.')[1])) : null;
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

    // --- FORO ---
    const foroSection = document.getElementById('foro');
    let temas = [];
    let comentariosPorTema = {};

    // Crear contenedor para temas y formulario
    let temasList = foroSection.querySelector('.temas-list');
    if (!temasList) {
        temasList = document.createElement('div');
        temasList.className = 'temas-list';
        foroSection.appendChild(temasList);
    }
    let crearTemaForm = foroSection.querySelector('#form-crear-tema');
    if (!crearTemaForm) {
        crearTemaForm = document.createElement('form');
        crearTemaForm.id = 'form-crear-tema';
        crearTemaForm.innerHTML = `
            <h3>Crear nuevo tema</h3>
            <label for="titulo-tema">Título:</label>
            <input type="text" id="titulo-tema" name="titulo" required>
            <label for="contenido-tema">Contenido:</label>
            <textarea id="contenido-tema" name="contenido" required></textarea>
            <button type="submit">Publicar tema</button>
        `;
        foroSection.insertBefore(crearTemaForm, temasList);
    }
    // Carrusel
    const galeriaSwiper = new Swiper('.galeria-swiper', {
        loop: true,
        spaceBetween: 20,
        slidesPerView: 1,
        pagination: {
            el: '.swiper-pagination',
            clickable: true
        },
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev'
        },
        breakpoints: {
            600: {
                slidesPerView: 2
            },
            900: {
                slidesPerView: 3
            }
        }
    });

    // Mostrar/ocultar formulario de crear tema según autenticación
    function mostrarFormularioTema(visible) {
        if (crearTemaForm) crearTemaForm.style.display = visible ? 'flex' : 'none';
    }

    // Renderizar temas
    function renderTemas() {
        temasList.innerHTML = '';
        if (temas.length === 0) {
            temasList.innerHTML = '<p>No hay temas aún.</p>';
        } else {
            temas.forEach(tema => {
                const temaDiv = document.createElement('div');
                temaDiv.className = 'tema';
                temaDiv.innerHTML = `
                    <h4>${tema.title}</h4>
                    <p><strong>Autor:</strong> ${tema.user_id || 'Anónimo'}</p>
                    <p><strong>Fecha:</strong> ${new Date(tema.created_at).toLocaleString()}</p>
                    <p>${tema.content}</p>
                `;
                // Botones de editar/eliminar solo para el autor
                const user = getToken() ? JSON.parse(atob(getToken().split('.')[1])) : null;
                if (user && tema.user_id === user.id) {
                    const editBtn = document.createElement('button');
                    editBtn.textContent = 'Editar';
                    editBtn.onclick = () => editarTema(tema);
                    const deleteBtn = document.createElement('button');
                    deleteBtn.textContent = 'Eliminar';
                    deleteBtn.onclick = () => eliminarTema(tema.id);
                    temaDiv.appendChild(editBtn);
                    temaDiv.appendChild(deleteBtn);
                }
                // Comentarios
                const comentariosDiv = document.createElement('div');
                comentariosDiv.className = 'comentarios-list';
                comentariosDiv.innerHTML = '<strong>Comentarios:</strong>';
                if (comentariosPorTema[tema.id]) {
                    comentariosPorTema[tema.id].forEach(comentario => {
                        const comentarioDiv = document.createElement('div');
                        comentarioDiv.className = 'comentario';
                        comentarioDiv.innerHTML = `
                            <p>${comentario.content}</p>
                            <small>${comentario.user_id || 'Anónimo'} - ${new Date(comentario.created_at).toLocaleString()}</small>
                        `;
                        // Botones de editar/eliminar solo para el autor
                        if (user && comentario.user_id === user.id) {
                            const editBtn = document.createElement('button');
                            editBtn.textContent = 'Editar';
                            editBtn.onclick = () => editarComentario(tema.id, comentario);
                            const deleteBtn = document.createElement('button');
                            deleteBtn.textContent = 'Eliminar';
                            deleteBtn.onclick = () => eliminarComentario(tema.id, comentario.id);
                            comentarioDiv.appendChild(editBtn);
                            comentarioDiv.appendChild(deleteBtn);
                        }
                        comentariosDiv.appendChild(comentarioDiv);
                    });
                }
                temaDiv.appendChild(comentariosDiv);
                // Formulario para comentar
                if (user) {
                    const formComentario = document.createElement('form');
                    formComentario.className = 'form-comentar';
                    formComentario.innerHTML = `
                        <input type="text" name="comentario" placeholder="Escribe un comentario" required>
                        <button type="submit">Comentar</button>
                    `;
                    formComentario.onsubmit = async (e) => {
                        e.preventDefault();
                        const content = formComentario.elements['comentario'].value;
                        await crearComentario(tema.id, content);
                        formComentario.reset();
                    };
                    temaDiv.appendChild(formComentario);
                }
                temasList.appendChild(temaDiv);
            });
        }
    }

    // Obtener temas y comentarios del backend
    async function cargarTemasYComentarios() {
        try {
            const res = await fetchProtegido(`${API_URL}/forum/posts`);
            temas = await res.json();
            comentariosPorTema = {};
            for (const tema of temas) {
                const resC = await fetchProtegido(`${API_URL}/forum/posts/${tema.id}/comments`);
                comentariosPorTema[tema.id] = await resC.json();
            }
            renderTemas();
        } catch {
            temas = [];
            comentariosPorTema = {};
            renderTemas();
        }
    }

    // Crear tema
    if (crearTemaForm) {
        crearTemaForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const titulo = document.getElementById('titulo-tema').value;
            const contenido = document.getElementById('contenido-tema').value;
            const token = getToken();
            if (!token) {
                alert('Debes iniciar sesión para crear un tema.');
                return;
            }
            try {
                const res = await fetchProtegido(`${API_URL}/forum/posts`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ title: titulo, content: contenido })
                });
                if (!res.ok) {
                    const data = await res.json();
                    alert(data.error || 'Error al crear tema');
                } else {
                    crearTemaForm.reset();
                    cargarTemasYComentarios();
                }
            } catch {
                alert('Error de red');
            }
        });
    }

    // Editar tema
    let editandoTemaId = null;
    function editarTema(tema) {
        document.getElementById('titulo-tema').value = tema.title;
        document.getElementById('contenido-tema').value = tema.content;
        editandoTemaId = tema.id;
        crearTemaForm.querySelector('button[type="submit"]').textContent = 'Guardar cambios';
    }
    crearTemaForm.addEventListener('submit', async (e) => {
        if (!editandoTemaId) return;
        e.preventDefault();
        const titulo = document.getElementById('titulo-tema').value;
        const contenido = document.getElementById('contenido-tema').value;
        const token = getToken();
        if (!token) {
            alert('Debes iniciar sesión para editar.');
            return;
        }
        try {
            const res = await fetchProtegido(`${API_URL}/forum/posts/${editandoTemaId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ title: titulo, content: contenido })
            });
            if (!res.ok) {
                const data = await res.json();
                alert(data.error || 'Error al editar tema');
            } else {
                crearTemaForm.reset();
                crearTemaForm.querySelector('button[type="submit"]').textContent = 'Publicar tema';
                editandoTemaId = null;
                cargarTemasYComentarios();
            }
        } catch {
            alert('Error de red');
        }
    }, true);

    // Eliminar tema
    async function eliminarTema(id) {
        const token = getToken();
        if (!token) {
            alert('Debes iniciar sesión para eliminar.');
            return;
        }
        if (!confirm('¿Seguro que quieres eliminar este tema?')) return;
        try {
            const res = await fetchProtegido(`${API_URL}/forum/posts/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!res.ok) {
                const data = await res.json();
                alert(data.error || 'Error al eliminar tema');
            } else {
                cargarTemasYComentarios();
            }
        } catch {
            alert('Error de red');
        }
    }

    // Crear comentario
    async function crearComentario(post_id, content) {
        const token = getToken();
        if (!token) {
            alert('Debes iniciar sesión para comentar.');
            return;
        }
        try {
            const res = await fetchProtegido(`${API_URL}/forum/posts/${post_id}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content })
            });
            if (!res.ok) {
                const data = await res.json();
                alert(data.error || 'Error al comentar');
            } else {
                cargarTemasYComentarios();
            }
        } catch {
            alert('Error de red');
        }
    }

    // Editar comentario
    let editandoComentario = { temaId: null, comentarioId: null };
    function editarComentario(temaId, comentario) {
        // Buscar el input del comentario y rellenarlo
        const temaDiv = temasList.querySelectorAll('.tema')[temas.findIndex(t => t.id === temaId)];
        const form = temaDiv.querySelector('.form-comentar');
        if (form) {
            form.elements['comentario'].value = comentario.content;
            editandoComentario = { temaId, comentarioId: comentario.id };
            form.querySelector('button[type="submit"]').textContent = 'Guardar comentario';
        }
    }
    temasList.addEventListener('submit', async (e) => {
        if (!editandoComentario.temaId || !editandoComentario.comentarioId) return;
        e.preventDefault();
        const form = e.target;
        const content = form.elements['comentario'].value;
        const token = getToken();
        if (!token) {
            alert('Debes iniciar sesión para editar comentario.');
            return;
        }
        try {
            const res = await fetchProtegido(`${API_URL}/forum/posts/${editandoComentario.temaId}/comments/${editandoComentario.comentarioId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content })
            });
            if (!res.ok) {
                const data = await res.json();
                alert(data.error || 'Error al editar comentario');
            } else {
                cargarTemasYComentarios();
                editandoComentario = { temaId: null, comentarioId: null };
                form.querySelector('button[type="submit"]').textContent = 'Comentar';
            }
        } catch {
            alert('Error de red');
        }
    }, true);

    // Eliminar comentario
    async function eliminarComentario(temaId, comentarioId) {
        const token = getToken();
        if (!token) {
            alert('Debes iniciar sesión para eliminar comentario.');
            return;
        }
        if (!confirm('¿Seguro que quieres eliminar este comentario?')) return;
        try {
            const res = await fetchProtegido(`${API_URL}/forum/posts/${temaId}/comments/${comentarioId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!res.ok) {
                const data = await res.json();
                alert(data.error || 'Error al eliminar comentario');
            } else {
                cargarTemasYComentarios();
            }
        } catch {
            alert('Error de red');
        }
    }

    // Mostrar/ocultar formularios según autenticación
    async function actualizarVisibilidadFormularios() {
        const user = await fetchProfile();
        mostrarFormularioNoticia(!!user);
        mostrarFormularioTema(!!user);
    }
    actualizarVisibilidadFormularios();
    window.addEventListener('storage', actualizarVisibilidadFormularios);

    // Cargar temas y comentarios al inicio
    cargarTemasYComentarios();
});
