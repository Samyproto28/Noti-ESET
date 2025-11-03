// FORO INTEGRADO - Compatible con el sistema existente
// Este archivo reemplaza la funcionalidad del foro en main.js con mejoras

import authManager from './auth.js';

const API_URL = 'http://localhost:4000/api';

// Función para mostrar mensajes de éxito
function showSuccessMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #28a745;
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        z-index: 1000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 3000);
}

// Función para mostrar mensajes de error
function showErrorMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #dc3545;
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        z-index: 1000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 3000);
}

// Función para escapar HTML y prevenir XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Función para validar datos de posts
function validatePostData(title, content) {
    const errors = [];
    
    if (!title || title.trim().length < 5) {
        errors.push('El título debe tener al menos 5 caracteres');
    }
    
    if (title && title.trim().length > 200) {
        errors.push('El título no puede tener más de 200 caracteres');
    }
    
    if (!content || content.trim().length < 10) {
        errors.push('El contenido debe tener al menos 10 caracteres');
    }
    
    if (content && content.trim().length > 2000) {
        errors.push('El contenido no puede tener más de 2000 caracteres');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

// Función para validar datos de comentarios
function validateCommentData(content) {
    const errors = [];
    
    if (!content || content.trim().length < 1) {
        errors.push('El comentario no puede estar vacío');
    }
    
    if (content && content.trim().length > 1000) {
        errors.push('El comentario no puede tener más de 1000 caracteres');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

// Función para obtener un ID de usuario consistente para el foro
function getUserIdForForum() {
    return authManager.getUserIdForForum();
}

// Función para obtener el token de autenticación
function getToken() {
    return authManager.getToken();
}

// Función para realizar peticiones protegidas
async function fetchProtegido(url, options = {}) {
    return await authManager.fetchWithAuth(url, options);
}

// Variables globales para el foro
let temas = [];
let comentariosPorTema = {};

// Función para cargar temas y comentarios
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

// Función para renderizar temas (básica)
function renderTemas() {
    const temasList = document.querySelector('.temas-list');
    if (!temasList) return;
    
    temasList.innerHTML = '';
    
    if (temas.length === 0) {
        temasList.innerHTML = '<p>No hay temas aún.</p>';
        return;
    }
    
    temas.forEach(tema => {
        const temaDiv = document.createElement('div');
        temaDiv.className = 'tema';
        temaDiv.innerHTML = `
            <h4>${escapeHtml(tema.title)}</h4>
            <p><strong>Autor:</strong> ${tema.user_id || 'Anónimo'}</p>
            <p><strong>Fecha:</strong> ${new Date(tema.created_at).toLocaleString()}</p>
            <p>${escapeHtml(tema.content)}</p>
        `;
        temasList.appendChild(temaDiv);
    });
}

// Función para crear tema
async function crearTema() {
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
            document.getElementById('form-crear-tema').reset();
            cargarTemasYComentarios();
        }
    } catch {
        alert('Error de red');
    }
}

// Función para crear comentario
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

// Función para verificar si un ID es un UUID válido
function isValidUserId(userId) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(userId);
}

// Mejorar la función renderTemas existente en main.js
function renderTemasMejorado() {
    const temasList = document.querySelector('.temas-list');
    if (!temasList) return;
    
    temasList.innerHTML = '';
    
    if (temas.length === 0) {
        temasList.innerHTML = '<p>No hay temas aún.</p>';
        return;
    }
    
    temas.forEach(tema => {
        const temaDiv = document.createElement('div');
        temaDiv.className = 'tema';
        
        // Información del autor
        const authorName = tema.user_profiles?.display_name || tema.user_profiles?.username || 'Anónimo';
        
        temaDiv.innerHTML = `
            <h4>${escapeHtml(tema.title)}</h4>
            <p><strong>Autor:</strong> ${escapeHtml(authorName)}</p>
            <p><strong>Fecha:</strong> ${new Date(tema.created_at).toLocaleString()}</p>
            <p>${escapeHtml(tema.content)}</p>
        `;
        
        // Botones de editar/eliminar solo para el autor
        const user = authManager.isAuthenticated() ? authManager.user : null;
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
        
        // Comentarios con estructura mejorada
        const comentariosDiv = document.createElement('div');
        comentariosDiv.className = 'comentarios-section';
        comentariosDiv.innerHTML = '<strong>Comentarios:</strong>';
        
        if (comentariosPorTema[tema.id]) {
            renderComentariosAnidados(comentariosPorTema[tema.id], comentariosDiv, tema.id);
        }
        
        temaDiv.appendChild(comentariosDiv);
        
        // Formulario para comentar
        if (user) {
            const formComentario = document.createElement('form');
            formComentario.className = 'form-comentar';
            formComentario.innerHTML = `
                <textarea name="comentario" placeholder="Escribe un comentario..." rows="3" required></textarea>
                <button type="submit">Comentar</button>
            `;
            formComentario.onsubmit = async (e) => {
                e.preventDefault();
                const content = formComentario.elements['comentario'].value;
                
                // Validar comentario
                const validation = validateCommentData(content);
                if (!validation.isValid) {
                    showErrorMessage(validation.errors.join(', '));
                    return;
                }
                
                await crearComentarioMejorado(tema.id, content);
                formComentario.reset();
            };
            temaDiv.appendChild(formComentario);
        }
        
        temasList.appendChild(temaDiv);
    });
}

// Función para renderizar comentarios anidados
function renderComentariosAnidados(comentarios, container, postId, level = 0) {
    comentarios.forEach(comentario => {
        const comentarioDiv = document.createElement('div');
        comentarioDiv.className = `comentario nivel-${level}`;
        comentarioDiv.style.marginLeft = `${level * 20}px`;
        comentarioDiv.style.borderLeft = level > 0 ? '2px solid #ddd' : 'none';
        comentarioDiv.style.paddingLeft = level > 0 ? '10px' : '0';
        
        const authorName = comentario.user_profiles?.display_name || comentario.user_profiles?.username || 'Anónimo';
        const isEdited = comentario.is_edited ? ' (editado)' : '';
        
        comentarioDiv.innerHTML = `
            <div class="comment-content">
                <p>${escapeHtml(comentario.content)}</p>
                <div class="comment-meta">
                    <small>${escapeHtml(authorName)} - ${new Date(comentario.created_at).toLocaleString()}${isEdited}</small>
                </div>
            </div>
            <div class="comment-actions">
                <button onclick="responderComentario('${comentario.id}')" title="Responder">↩️ Responder</button>
                <button onclick="editarComentario('${postId}', '${comentario.id}', '${escapeHtml(comentario.content).replace(/'/g, "\\'")}')" class="edit-btn">Editar</button>
                <button onclick="eliminarComentario('${postId}', '${comentario.id}')" class="delete-btn">Eliminar</button>
            </div>
        `;
        
        container.appendChild(comentarioDiv);
        
        // Renderizar replies si existen
        if (comentario.replies && comentario.replies.length > 0) {
            renderComentariosAnidados(comentario.replies, container, postId, level + 1);
        }
    });
}

// Función para responder a comentarios
function responderComentario(commentId) {
    const content = prompt('Escribe tu respuesta:');
    if (!content) return;
    
    // Validar respuesta
    const validation = validateCommentData(content);
    if (!validation.isValid) {
        showErrorMessage(validation.errors.join(', '));
        return;
    }
    
    crearRespuesta(commentId, content);
}

// Función para crear respuestas a comentarios
async function crearRespuesta(commentId, content) {
    const token = getToken();
    if (!token) {
        showErrorMessage('Debes iniciar sesión para responder.');
        return;
    }
    
    try {
        // Corregir la ruta para responder comentarios
        const res = await fetchProtegido(`${API_URL}/forum/comments/${commentId}/replies`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });
        
        if (!res.ok) {
            const data = await res.json();
            showErrorMessage(data.error || 'Error al crear respuesta');
        } else {
            showSuccessMessage('Respuesta creada exitosamente');
            cargarTemasYComentarios();
        }
    } catch {
        showErrorMessage('Error de conexión al crear respuesta');
    }
}

// Función mejorada para crear comentarios
async function crearComentarioMejorado(post_id, content) {
    const token = getToken();
    if (!token) {
        showErrorMessage('Debes iniciar sesión para comentar.');
        return;
    }
    
    try {
        const res = await fetchProtegido(`${API_URL}/forum/posts/${post_id}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });
        
        if (!res.ok) {
            const data = await res.json();
            showErrorMessage(data.error || 'Error al comentar');
        } else {
            showSuccessMessage('Comentario creado exitosamente');
            cargarTemasYComentarios();
        }
    } catch {
        showErrorMessage('Error de conexión al crear comentario');
    }
}

// Función mejorada para crear temas
async function crearTemaMejorado() {
    const titulo = document.getElementById('titulo-tema').value;
    const contenido = document.getElementById('contenido-tema').value;
    
    // Validar datos
    const validation = validatePostData(titulo, contenido);
    if (!validation.isValid) {
        showErrorMessage(validation.errors.join(', '));
        return;
    }
    
    const token = getToken();
    if (!token) {
        showErrorMessage('Debes iniciar sesión para crear un tema.');
        return;
    }
    
    try {
        const res = await fetchProtegido(`${API_URL}/forum/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title: titulo, content: contenido })
        });
        
        if (!res.ok) {
            const data = await res.json();
            showErrorMessage(data.error || 'Error al crear tema');
        } else {
            document.getElementById('form-crear-tema').reset();
            showSuccessMessage('Tema creado exitosamente');
            cargarTemasYComentarios();
        }
    } catch {
        showErrorMessage('Error de conexión al crear tema');
    }
}

// Reemplazar las funciones del foro en main.js
document.addEventListener('DOMContentLoaded', () => {
    // Esperar a que el DOM esté completamente cargado
    setTimeout(() => {
        // Reemplazar la función renderTemas
        if (typeof renderTemas === 'function') {
            const originalRenderTemas = renderTemas;
            renderTemas = renderTemasMejorado;
        }
        
        // Reemplazar la función crearComentario
        if (typeof crearComentario === 'function') {
            const originalCrearComentario = crearComentario;
            crearComentario = crearComentarioMejorado;
        }
        
        // Si existe el formulario de crear tema, reemplazar su manejador de submit
        const crearTemaForm = document.getElementById('form-crear-tema');
        if (crearTemaForm) {
            // Eliminar event listeners existentes
            const nuevoForm = crearTemaForm.cloneNode(true);
            crearTemaForm.parentNode.replaceChild(nuevoForm, crearTemaForm);
            
            // Añadir nuevo event listener
            nuevoForm.addEventListener('submit', (e) => {
                e.preventDefault();
                crearTemaMejorado();
            });
        }
        
        // Cargar temas y comentarios con las funciones mejoradas
        if (typeof cargarTemasYComentarios === 'function') {
            cargarTemasYComentarios();
        }
        
        // Exponer funciones globalmente para los botones de respuesta
        window.responderComentario = responderComentario;
    }, 1000);
});

// Función para editar tema
function editarTema(tema) {
    document.getElementById('titulo-tema').value = tema.title;
    document.getElementById('contenido-tema').value = tema.content;
    window.editandoTemaId = tema.id;
    document.querySelector('#form-crear-tema button[type="submit"]').textContent = 'Guardar cambios';
}

// Función para eliminar tema
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

// Función para editar comentario
function editarComentario(temaId, comentario) {
    const form = document.querySelector(`#tema-${temaId} .form-comentar`);
    if (form) {
        form.elements['comentario'].value = comentario.content;
        window.editandoComentario = { temaId, comentarioId: comentario.id };
        form.querySelector('button[type="submit"]').textContent = 'Guardar comentario';
    }
}

// Función para eliminar comentario
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