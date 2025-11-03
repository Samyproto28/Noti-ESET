import authManager from './auth.js';
import forumAuth from './forum-auth.js';
import cacheService from './cacheService.js';
import performanceMonitor from './performanceMonitor.js';

// FUNCIONALIDAD COMPLETA DEL FORO
class ForoCompleto {
    constructor() {
        this.API_URL = 'http://localhost:4000/api';
        this.temas = [];
        this.categorias = [];
        this.comentariosPorTema = {};
        this.currentCategoryFilter = null;
        
        // Propiedades para paginación
        this.currentPage = 1;
        this.pageSize = 10;
        this.totalPages = 1;
        this.totalPosts = 0;
        
        // Propiedades para ordenamiento
        this.sortBy = 'last_activity_at';
        this.sortOrder = 'desc';
        
        // Cache para páginas visitadas
        this.pageCache = {};
        
        // Estado de carga
        this.isLoading = false;
        
        this.init();
    }

    /**
     * Función para validar datos de posts
     * @param {string} title - Título del post
     * @param {string} content - Contenido del post
     * @returns {Object} Resultado de la validación
     */
    validatePostData(title, content) {
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

    /**
     * Función para validar datos de comentarios
     * @param {string} content - Contenido del comentario
     * @returns {Object} Resultado de la validación
     */
    validateCommentData(content) {
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

    init() {
        // Inicializar monitor de rendimiento
        performanceMonitor.init();
        
        // Configurar callbacks de rendimiento
        this.setupPerformanceCallbacks();
        
        this.crearInterfaz();
        this.configurarEventListeners();
        this.loadUserPreferences();
        this.updateSortIndicators();
        this.setupKeyboardShortcuts();
        this.setupPrefetching();
        this.setupLazyLoading();
        this.improveAccessibility();
        this.setupConnectionStatus();
        this.cargarCategorias();
        this.cargarTemasYComentarios();
    }

    crearInterfaz() {
        const foroSection = document.getElementById('foro');
        
        // Limpiar contenido existente del foro (excepto el título)
        const titulo = foroSection.querySelector('h2');
        foroSection.innerHTML = '';
        if (titulo) foroSection.appendChild(titulo);

        // Crear controles del foro
        const controlesDiv = document.createElement('div');
        controlesDiv.className = 'foro-controls';
        controlesDiv.innerHTML = `
            <div class="foro-filters">
                <div class="filter-group">
                    <label for="categoria-filtro">Filtrar por categoría:</label>
                    <select id="categoria-filtro">
                        <option value="">Todas las categorías</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label for="search-input">Buscar posts:</label>
                    <input type="text" id="search-input" placeholder="Buscar en títulos y contenido...">
                </div>
                <div class="filter-group">
                    <label for="sort-by">Ordenar por:</label>
                    <select id="sort-by">
                        <option value="last_activity_at">Última actividad</option>
                        <option value="created_at">Fecha de creación</option>
                        <option value="updated_at">Fecha de actualización</option>
                        <option value="title">Título (alfabético)</option>
                        <option value="views_count">Más vistos</option>
                        <option value="upvotes_count">Más votados</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label for="sort-order">Orden:</label>
                    <select id="sort-order">
                        <option value="desc">Descendente</option>
                        <option value="asc">Ascendente</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label for="page-size">Temas por página:</label>
                    <select id="page-size">
                        <option value="5">5</option>
                        <option value="10" selected>10</option>
                        <option value="20">20</option>
                        <option value="50">50</option>
                    </select>
                </div>
            </div>
        `;
        foroSection.appendChild(controlesDiv);

        // Botón para crear tema
        const btnCrear = document.createElement('button');
        btnCrear.id = 'btn-crear-tema';
        btnCrear.textContent = '+ Crear Tema';
        btnCrear.className = 'btn-crear-tema';
        btnCrear.onclick = () => this.mostrarFormularioCrearTema();
        foroSection.appendChild(btnCrear);

        // Formulario para crear tema
        const formDiv = document.createElement('div');
        formDiv.innerHTML = `
            <form id="form-crear-tema" style="display: none;">
                <h3>Crear nuevo tema</h3>
                <div class="form-group">
                    <label for="categoria-tema">Categoría:</label>
                    <select id="categoria-tema" required>
                        <option value="">Selecciona una categoría</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="titulo-tema">Título:</label>
                    <input type="text" id="titulo-tema" required>
                </div>
                <div class="form-group">
                    <label for="contenido-tema">Contenido:</label>
                    <textarea id="contenido-tema" rows="4" required></textarea>
                </div>
                <button type="submit">Publicar tema</button>
                <button type="button" id="cancelar-tema">Cancelar</button>
            </form>
        `;
        foroSection.appendChild(formDiv);

        // Lista de temas
        const temasDiv = document.createElement('div');
        temasDiv.className = 'temas-list';
        foroSection.appendChild(temasDiv);
        
        // Controles de paginación
        const paginationDiv = document.createElement('div');
        paginationDiv.className = 'pagination-container';
        paginationDiv.innerHTML = `
            <div class="pagination-info">
                <span id="pagination-info-text">Cargando...</span>
            </div>
            <div class="pagination-controls">
                <button id="btn-first-page" class="pagination-btn" disabled>Primera</button>
                <button id="btn-prev-page" class="pagination-btn" disabled>Anterior</button>
                <div class="pagination-numbers" id="pagination-numbers"></div>
                <button id="btn-next-page" class="pagination-btn" disabled>Siguiente</button>
                <button id="btn-last-page" class="pagination-btn" disabled>Última</button>
            </div>
        `;
        foroSection.appendChild(paginationDiv);
        
        // Botón de "ir arriba"
        const scrollTopBtn = document.createElement('button');
        scrollTopBtn.id = 'scroll-top-btn';
        scrollTopBtn.className = 'scroll-top-btn';
        scrollTopBtn.innerHTML = '↑';
        scrollTopBtn.title = 'Ir arriba';
        scrollTopBtn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
        document.body.appendChild(scrollTopBtn);
        
        // Event listener para mostrar/ocultar botón de ir arriba
        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 300) {
                scrollTopBtn.style.display = 'block';
            } else {
                scrollTopBtn.style.display = 'none';
            }
        });
    }

    /**
     * Configura el indicador de estado de conexión
     */
    setupConnectionStatus() {
        // Crear indicador de estado de conexión
        const connectionStatus = document.createElement('div');
        connectionStatus.className = 'connection-status';
        connectionStatus.innerHTML = `
            <span class="status-indicator online"></span>
            <span class="status-text">Conectado</span>
        `;
        document.body.appendChild(connectionStatus);
        
        // Monitorear estado de conexión
        window.addEventListener('online', () => {
            this.updateConnectionStatus(true);
        });
        
        window.addEventListener('offline', () => {
            this.updateConnectionStatus(false);
        });
        
        // Verificar conexión periódicamente
        setInterval(() => {
            this.checkConnection();
        }, 30000); // Cada 30 segundos
    }

    /**
     * Actualiza el indicador de estado de conexión
     * @param {boolean} isOnline - Estado de conexión
     */
    updateConnectionStatus(isOnline) {
        const statusIndicator = document.querySelector('.connection-status .status-indicator');
        const statusText = document.querySelector('.connection-status .status-text');
        
        if (statusIndicator && statusText) {
            if (isOnline) {
                statusIndicator.className = 'status-indicator online';
                statusText.textContent = 'Conectado';
            } else {
                statusIndicator.className = 'status-indicator offline';
                statusText.textContent = 'Desconectado';
            }
        }
    }

    /**
     * Verifica la conexión con el servidor
     */
    async checkConnection() {
        try {
            const res = await fetch(`${this.API_URL}/health`, {
                method: 'GET',
                cache: 'no-cache'
            });
            
            this.updateConnectionStatus(res.ok);
        } catch (error) {
            this.updateConnectionStatus(false);
        }
    }

    configurarEventListeners() {
        // Filtro de categorías
        document.addEventListener('change', (e) => {
            if (e.target.id === 'categoria-filtro') {
                this.currentCategoryFilter = e.target.value || null;
                this.resetPagination();
                this.cargarTemasYComentarios();
            }
        });

        // Búsqueda
        let searchTimeout;
        document.addEventListener('input', (e) => {
            if (e.target.id === 'search-input') {
                clearTimeout(searchTimeout);
                const query = e.target.value.trim();
                
                searchTimeout = setTimeout(() => {
                    if (query.length >= 2) {
                        this.buscarTemas(query);
                    } else if (query.length === 0) {
                        this.resetPagination();
                        this.cargarTemasYComentarios();
                    }
                }, 500);
            }
        });

        // Controles de ordenamiento
        document.addEventListener('change', (e) => {
            if (e.target.id === 'sort-by') {
                this.sortBy = e.target.value;
                this.resetPagination();
                this.cargarTemasYComentarios();
                this.saveUserPreferences();
                this.updateSortIndicators();
            }
            
            if (e.target.id === 'sort-order') {
                this.sortOrder = e.target.value;
                this.resetPagination();
                this.cargarTemasYComentarios();
                this.saveUserPreferences();
                this.updateSortIndicators();
            }
            
            if (e.target.id === 'page-size') {
                this.pageSize = parseInt(e.target.value);
                this.resetPagination();
                this.cargarTemasYComentarios();
                this.saveUserPreferences();
            }
        });

        // Controles de paginación
        document.addEventListener('click', (e) => {
            if (e.target.id === 'btn-first-page') {
                this.goToPage(1);
            } else if (e.target.id === 'btn-prev-page') {
                this.goToPage(this.currentPage - 1);
            } else if (e.target.id === 'btn-next-page') {
                this.goToPage(this.currentPage + 1);
            } else if (e.target.id === 'btn-last-page') {
                this.goToPage(this.totalPages);
            } else if (e.target.classList.contains('page-number')) {
                const pageNum = parseInt(e.target.dataset.page);
                this.goToPage(pageNum);
            }
        });

        // Formulario crear tema
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'form-crear-tema') {
                e.preventDefault();
                this.crearTema();
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.id === 'cancelar-tema') {
                this.cancelarCrearTema();
            }
        });

        // Atajos de teclado
        document.addEventListener('keydown', (e) => {
            // Solo procesar atajos si no está en un campo de entrada
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                return;
            }
            
            // Ctrl/Cmd + K: Búsqueda
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const searchInput = document.getElementById('search-input');
                if (searchInput) {
                    searchInput.focus();
                }
            }
            
            // Ctrl/Cmd + N: Nuevo tema
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                this.mostrarFormularioCrearTema();
            }
            
            // Flechas izquierda/derecha: Navegación de páginas
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                const btnPrev = document.getElementById('btn-prev-page');
                if (btnPrev && !btnPrev.disabled) {
                    this.goToPage(this.currentPage - 1);
                }
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                const btnNext = document.getElementById('btn-next-page');
                if (btnNext && !btnNext.disabled) {
                    this.goToPage(this.currentPage + 1);
                }
            }
            
            // Números 1-9: Ir a página específica
            if (e.key >= '1' && e.key <= '9') {
                const pageNum = parseInt(e.key);
                if (pageNum <= this.totalPages) {
                    this.goToPage(pageNum);
                }
            }
            
            // H: Mostrar/Ocultar ayuda de atajos
            if (e.key === 'h' || e.key === 'H') {
                this.toggleKeyboardShortcuts();
            }
        });
    }

    /**
     * Realiza peticiones HTTP con manejo de autenticación y caché
     * @param {string} url - URL de la petición
     * @param {Object} options - Opciones de la petición
     * @param {boolean} useCache - Si se debe usar caché (default: true para GET)
     * @returns {Promise} Respuesta de la petición
     */
    async fetchWithAuth(url, options = {}, useCache = options.method === 'GET') {
        // Medir tiempo de respuesta de la API
        const startTime = performance.now();
        
        // Generar clave de caché
        const cacheKey = cacheService.generateCacheKey(url, options.params || {});
        
        // Si se debe usar caché y es una petición GET, intentar obtener de caché
        if (useCache && cacheService.has(cacheKey)) {
            const cachedData = cacheService.get(cacheKey);
            
            // Registrar tiempo de respuesta de caché
            const endTime = performance.now();
            const duration = endTime - startTime;
            performanceMonitor.recordApiCall(url, duration, 200); // 200 = OK
            
            // Crear respuesta simulada con datos de caché
            return {
                ok: true,
                json: async () => cachedData,
                headers: new Headers({ 'X-Cache': 'HIT' })
            };
        }
        
        // Realizar petición real
        const response = await forumAuth.fetchWithAuth(url, options);
        
        // Registrar tiempo de respuesta de la API
        const endTime = performance.now();
        const duration = endTime - startTime;
        performanceMonitor.recordApiCall(url, duration, response.status);
        
        // Si es una petición GET exitosa, almacenar en caché
        if (useCache && response.ok) {
            try {
                const data = await response.clone().json();
                
                // Determinar TTL según el tipo de contenido
                let ttl = 5 * 60 * 1000; // 5 minutos por defecto
                
                if (url.includes('/posts')) {
                    ttl = 3 * 60 * 1000; // 3 minutos para posts
                } else if (url.includes('/comments')) {
                    ttl = 2 * 60 * 1000; // 2 minutos para comentarios
                } else if (url.includes('/categories')) {
                    ttl = 10 * 60 * 1000; // 10 minutos para categorías
                }
                
                cacheService.set(cacheKey, data, ttl);
            } catch (e) {
                console.warn('Error al almacenar en caché:', e);
            }
        }
        
        return response;
    }

    // Foro público - puede funcionar sin autenticación
    async fetchPublico(url, options = {}, useCache = options.method === 'GET') {
        return this.fetchWithAuth(url, options, useCache);
    }

    async cargarCategorias() {
        try {
            const res = await this.fetchPublico(`${this.API_URL}/categories`);
            const result = await res.json();
            if (result.success) {
                this.categorias = result.data;
                console.log('Categorías cargadas:', this.categorias);
                this.actualizarSelectoresCategorias();
            } else {
                console.error('Error al cargar categorías:', result.error);
                this.showErrorMessage('Error al cargar categorías');
            }
        } catch (error) {
            console.error('Error cargando categorías:', error);
            this.showErrorMessage('Error de conexión al cargar categorías');
        }
    }

    actualizarSelectoresCategorias() {
        const categorySelect = document.getElementById('categoria-tema');
        const categoryFilter = document.getElementById('categoria-filtro');
        
        if (categorySelect) {
            categorySelect.innerHTML = '<option value="">Selecciona una categoría</option>';
            this.categorias.forEach(cat => {
                const categoryName = cat.name.charAt(0).toUpperCase() + cat.name.slice(1).replace('-', ' ');
                categorySelect.innerHTML += `<option value="${cat.id}">${categoryName} ${cat.icon || ''}</option>`;
            });
        }

        if (categoryFilter) {
            categoryFilter.innerHTML = '<option value="">Todas las categorías</option>';
            this.categorias.forEach(cat => {
                const categoryName = cat.name.charAt(0).toUpperCase() + cat.name.slice(1).replace('-', ' ');
                categoryFilter.innerHTML += `<option value="${cat.id}">${categoryName} ${cat.icon || ''}</option>`;
            });
        }
    }

    async cargarTemasYComentarios() {
        if (this.isLoading) return;
        
        this.setLoadingState(true);
        
        try {
            // Crear clave de cache para esta página
            const cacheKey = this.getCacheKey();
            
            // Verificar si tenemos esta página en cache
            if (this.pageCache[cacheKey]) {
                const cachedData = this.pageCache[cacheKey];
                this.temas = cachedData.temas;
                this.comentariosPorTema = cachedData.comentariosPorTema;
                this.totalPosts = cachedData.totalPosts;
                this.totalPages = Math.ceil(this.totalPosts / this.pageSize);
                this.renderTemas();
                this.updatePaginationControls();
                this.setLoadingState(false);
                return;
            }
            
            let url = `${this.API_URL}/forum/posts`;
            const params = new URLSearchParams();
            
            // Parámetros de paginación
            const offset = (this.currentPage - 1) * this.pageSize;
            params.append('limit', this.pageSize.toString());
            params.append('offset', offset.toString());
            
            // Parámetros de ordenamiento
            params.append('sortBy', this.sortBy);
            params.append('sortOrder', this.sortOrder);
            
            // Filtro de categoría
            if (this.currentCategoryFilter) {
                params.append('categoryId', this.currentCategoryFilter);
            }
            
            url += '?' + params.toString();

            const res = await this.fetchPublico(url);
            const result = await res.json();
            
            if (result.success) {
                this.temas = result.data;
                this.comentariosPorTema = {};
                
                // Obtener el total de posts usando el endpoint optimizado
                try {
                    const countRes = await this.fetchPublico(`${this.API_URL}/forum/posts/count${this.currentCategoryFilter ? `?categoryId=${this.currentCategoryFilter}` : ''}`);
                    const countResult = await countRes.json();
                    
                    if (countResult.success) {
                        this.totalPosts = countResult.data.count;
                    } else {
                        // Fallback a estimación si falla el endpoint de conteo
                        this.totalPosts = result.data.length < this.pageSize ?
                            (this.currentPage - 1) * this.pageSize + result.data.length :
                            (this.currentPage - 1) * this.pageSize + this.pageSize + 1;
                    }
                } catch (countError) {
                    console.error('Error obteniendo conteo de posts:', countError);
                    // Fallback a estimación
                    this.totalPosts = result.data.length < this.pageSize ?
                        (this.currentPage - 1) * this.pageSize + result.data.length :
                        (this.currentPage - 1) * this.pageSize + this.pageSize + 1;
                }
                
                this.totalPages = Math.ceil(this.totalPosts / this.pageSize);
                
                // Cargar comentarios para cada tema de forma optimizada
                // Primero renderizar los temas sin comentarios para mejorar la percepción de velocidad
                this.renderTemas();
                this.updatePaginationControls();
                
                // Configurar lazy loading para comentarios
                this.setupCommentsLazyLoading();
                
                // Guardar en cache (sin comentarios por ahora)
                this.pageCache[cacheKey] = {
                    temas: [...this.temas],
                    comentariosPorTema: { ...this.comentariosPorTema },
                    totalPosts: this.totalPosts
                };
            } else {
                this.showErrorMessage(result.error || 'Error al cargar temas');
            }
        } catch (error) {
            console.error('Error cargando temas:', error);
            this.showErrorMessage('Error de conexión al cargar temas');
            this.temas = [];
            this.comentariosPorTema = {};
            this.renderTemas();
        } finally {
            this.setLoadingState(false);
        }
    }

    /**
     * Configura lazy loading para comentarios de todos los temas visibles
     */
    setupCommentsLazyLoading() {
        // Configurar contenedores de comentarios para lazy loading
        const temasList = document.querySelector('.temas-list');
        if (temasList) {
            this.temas.forEach(tema => {
                const temaElement = document.querySelector(`.tema[data-id="${tema.id}"]`);
                if (temaElement) {
                    const comentariosSection = temaElement.querySelector('.comentarios-section');
                    if (comentariosSection) {
                        // Marcar como lazy load y añadir atributos necesarios
                        comentariosSection.classList.add('comments-lazy-load');
                        comentariosSection.setAttribute('data-post-id', tema.id);
                        
                        // Mostrar indicador de carga inicial
                        if (!this.comentariosPorTema[tema.id]) {
                            comentariosSection.innerHTML = '<h5>Comentarios:</h5><div class="comments-placeholder">Haz clic para cargar comentarios</div>';
                            
                            // Añadir evento para cargar comentarios al hacer clic
                            comentariosSection.addEventListener('click', () => {
                                if (!comentariosSection.classList.contains('loaded')) {
                                    this.loadCommentsOnDemand(tema.id, comentariosSection);
                                }
                            });
                        }
                    }
                }
            });
            
            // Observar contenedores de comentarios
            this.observeCommentContainers(temasList);
        }
    }

    renderTemas() {
        // Medir tiempo de renderizado
        return performanceMonitor.measureFunction('renderTemas', () => {
            const temasList = document.querySelector('.temas-list');
            if (!temasList) return;

            // Mostrar indicador de carga si está cargando
            if (this.isLoading) {
                temasList.innerHTML = `
                    <div class="loading-indicator">
                        <div class="loading-spinner"></div>
                        <p>Cargando temas...</p>
                    </div>
                `;
                return;
            }

            // Usar DocumentFragment para mejorar el rendimiento
            const fragment = document.createDocumentFragment();
            
            if (this.temas.length === 0) {
                temasList.innerHTML = '<p>No hay temas aún.</p>';
                return;
            }

            // Crear un template para reutilizar y mejorar el rendimiento
            const temaTemplate = document.createElement('template');
            
            this.temas.forEach((tema, index) => {
                const temaDiv = document.createElement('div');
                temaDiv.className = 'tema fade-in';
                temaDiv.setAttribute('data-id', tema.id);
                
                // Añadir animación escalonada para mejor percepción
                temaDiv.style.animationDelay = `${index * 50}ms`;
                
                // Información de categoría
                const categoryInfo = tema.forum_categories ?
                    `<span class="category-badge" style="background-color: ${tema.forum_categories.color}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 500; text-transform: capitalize;">
                        ${tema.forum_categories.icon || '📝'} ${tema.forum_categories.name.replace('-', ' ')}
                    </span>` : '';
                
                // Información del autor
                const authorName = tema.user_profiles?.display_name || tema.user_profiles?.username || 'Anónimo';
                const isCurrentUser = tema.user_id === forumAuth.getUserId();
                
                // Optimizar renderizado del contenido HTML
                temaDiv.innerHTML = `
                    <div class="tema-header">
                        ${categoryInfo}
                        <h4>${this.escapeHtml(tema.title)}</h4>
                        <div class="tema-meta">
                            <span><strong>Autor:</strong> ${this.escapeHtml(authorName)}</span>
                            <span><strong>Fecha:</strong> ${new Date(tema.created_at).toLocaleString()}</span>
                            <span><strong>Vistas:</strong> ${tema.views_count || 0}</span>
                            <span><strong>👍</strong> ${tema.upvotes_count || 0} <strong>👎</strong> ${tema.downvotes_count || 0}</span>
                        </div>
                    </div>
                    <div class="tema-content">
                        <p>${this.escapeHtml(tema.content)}</p>
                    </div>
                    <div class="tema-actions">
                        <button onclick="foro.reaccionarPost('${tema.id}', 'like')" title="Me gusta">👍</button>
                        <button onclick="foro.reaccionarPost('${tema.id}', 'dislike')" title="No me gusta">👎</button>
                        <button onclick="foro.reaccionarPost('${tema.id}', 'love')" title="Me encanta">❤️</button>
                        <button onclick="foro.reaccionarPost('${tema.id}', 'laugh')" title="Divertido">😂</button>
                        ${isCurrentUser ? `<button onclick="foro.editarTema('${tema.id}')" class="edit-btn">Editar</button>` : ''}
                        ${isCurrentUser ? `<button onclick="foro.eliminarTema('${tema.id}')" class="delete-btn">Eliminar</button>` : ''}
                    </div>
                `;

                // Comentarios - Optimizado para lazy loading
                const comentariosDiv = document.createElement('div');
                comentariosDiv.className = 'comentarios-section comments-lazy-load';
                comentariosDiv.setAttribute('data-post-id', tema.id);
                comentariosDiv.innerHTML = '<h5>Comentarios:</h5>';
                
                if (this.comentariosPorTema[tema.id]) {
                    this.renderComentariosAnidados(this.comentariosPorTema[tema.id], comentariosDiv, tema.id);
                } else {
                    // Mostrar placeholder para lazy loading
                    const placeholderDiv = document.createElement('div');
                    placeholderDiv.className = 'comments-placeholder';
                    placeholderDiv.textContent = 'Haz clic para cargar comentarios';
                    comentariosDiv.appendChild(placeholderDiv);
                    
                    // Añadir evento para cargar comentarios al hacer clic
                    comentariosDiv.addEventListener('click', () => {
                        if (!comentariosDiv.classList.contains('loaded')) {
                            this.loadCommentsOnDemand(tema.id, comentariosDiv);
                        }
                    });
                }

                temaDiv.appendChild(comentariosDiv);

                // Formulario para comentar (público)
                const formComentario = document.createElement('form');
                formComentario.className = 'form-comentar';
                formComentario.innerHTML = `
                    <div class="comment-form">
                        <textarea name="comentario" placeholder="Escribe un comentario..." rows="3" required></textarea>
                        <button type="submit">Comentar</button>
                    </div>
                `;
                formComentario.onsubmit = (e) => {
                    e.preventDefault();
                    const content = formComentario.elements['comentario'].value;
                    this.crearComentario(tema.id, content);
                    formComentario.reset();
                };
                temaDiv.appendChild(formComentario);

                fragment.appendChild(temaDiv);
            });
            
            // Limpiar y añadir todos los temas de una sola vez
            temasList.innerHTML = '';
            temasList.appendChild(fragment);
            
            // Configurar lazy loading para comentarios
            this.observeCommentContainers(temasList);
        });
    }

    renderComentariosAnidados(comentarios, container, postId, level = 0) {
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
                    <p>${this.escapeHtml(comentario.content)}</p>
                    <div class="comment-meta">
                        <small>${this.escapeHtml(authorName)} - ${new Date(comentario.created_at).toLocaleString()}${isEdited}</small>
                        <div class="comment-stats">
                            <span>👍 ${comentario.upvotes_count || 0}</span>
                            <span>👎 ${comentario.downvotes_count || 0}</span>
                        </div>
                    </div>
                </div>
                <div class="comment-actions">
                    <button onclick="foro.reaccionarComentario('${comentario.id}', 'like')" title="Me gusta">👍</button>
                    <button onclick="foro.reaccionarComentario('${comentario.id}', 'dislike')" title="No me gusta">👎</button>
                    <button onclick="foro.responderComentario('${comentario.id}')" title="Responder">↩️ Responder</button>
                    <button onclick="foro.editarComentario('${postId}', '${comentario.id}', '${this.escapeHtml(comentario.content).replace(/'/g, "\\'")}')" class="edit-btn">Editar</button>
                    <button onclick="foro.eliminarComentario('${postId}', '${comentario.id}')" class="delete-btn">Eliminar</button>
                </div>
            `;

            container.appendChild(comentarioDiv);

            // Renderizar replies si existen
            if (comentario.replies && comentario.replies.length > 0) {
                this.renderComentariosAnidados(comentario.replies, container, postId, level + 1);
            }
        });
    }

    mostrarFormularioCrearTema() {
        const form = document.getElementById('form-crear-tema');
        if (form) form.style.display = 'block';
    }

    cancelarCrearTema() {
        const form = document.getElementById('form-crear-tema');
        if (form) {
            form.reset();
            form.style.display = 'none';
        }
    }

    async crearTema() {
        const titulo = document.getElementById('titulo-tema').value;
        const contenido = document.getElementById('contenido-tema').value;
        const categoria = document.getElementById('categoria-tema').value;
        
        // Validar datos antes de enviar
        const validation = this.validatePostData(titulo, contenido);
        if (!validation.isValid) {
            this.showErrorMessage(validation.errors.join(', '));
            return;
        }
        
        try {
            const res = await this.fetchPublico(`${this.API_URL}/forum/posts`, {
                method: 'POST',
                body: JSON.stringify({
                    title: titulo,
                    content: contenido,
                    category_id: categoria || null
                })
            }, false); // No usar caché para peticiones POST
            
            const result = await res.json();
            
            if (!result.success) {
                // Mostrar error específico del servidor
                this.showErrorMessage(result.error || 'Error al crear tema');
            } else {
                this.cancelarCrearTema();
                
                // Invalidar caché relevante después de crear un tema
                this.invalidateRelevantCache();
                
                this.cargarTemasYComentarios();
                // Mostrar mensaje de éxito
                this.showSuccessMessage('Tema creado exitosamente');
            }
        } catch (error) {
            console.error('Error creando tema:', error);
            this.showErrorMessage('Error de conexión al crear tema');
        }
    }

    async crearComentario(post_id, content) {
        // Validar comentario antes de enviar
        const validation = this.validateCommentData(content);
        if (!validation.isValid) {
            this.showErrorMessage(validation.errors.join(', '));
            return;
        }
        
        try {
            const res = await this.fetchPublico(`${this.API_URL}/forum/posts/${post_id}/comments`, {
                method: 'POST',
                body: JSON.stringify({ content })
            });
            
            const result = await res.json();
            
            if (result.success) {
                this.cargarTemasYComentarios();
                this.showSuccessMessage('Comentario creado exitosamente');
            } else {
                this.showErrorMessage(result.error || 'Error al crear comentario');
            }
        } catch (error) {
            console.error('Error comentando:', error);
            this.showErrorMessage('Error de conexión al crear comentario');
        }
    }

    async reaccionarPost(postId, tipo) {
        try {
            const res = await this.fetchPublico(`${this.API_URL}/reactions/posts/${postId}`, {
                method: 'POST',
                body: JSON.stringify({ reactionType: tipo })
            });

            if (res.ok) {
                this.cargarTemasYComentarios();
            }
        } catch (error) {
            console.error('Error reaccionando:', error);
        }
    }

    async reaccionarComentario(commentId, tipo) {
        try {
            const res = await this.fetchPublico(`${this.API_URL}/reactions/comments/${commentId}`, {
                method: 'POST',
                body: JSON.stringify({ reactionType: tipo })
            });

            if (res.ok) {
                this.cargarTemasYComentarios();
            }
        } catch (error) {
            console.error('Error reaccionando:', error);
        }
    }

    async responderComentario(commentId) {
        const content = prompt('Escribe tu respuesta:');
        if (!content) return;

        // Validar respuesta antes de enviar
        const validation = this.validateCommentData(content);
        if (!validation.isValid) {
            this.showErrorMessage(validation.errors.join(', '));
            return;
        }

        try {
            // Corregir la ruta para responder comentarios
            const res = await this.fetchPublico(`${this.API_URL}/forum/comments/${commentId}/replies`, {
                method: 'POST',
                body: JSON.stringify({ content })
            });

            const result = await res.json();

            if (result.success) {
                this.cargarTemasYComentarios();
                this.showSuccessMessage('Respuesta creada exitosamente');
            } else {
                this.showErrorMessage(result.error || 'Error al crear respuesta');
            }
        } catch (error) {
            console.error('Error respondiendo:', error);
            this.showErrorMessage('Error de conexión al crear respuesta');
        }
    }

    editarComentario(postId, comentarioId, contenidoActual) {
        const nuevoContenido = prompt('Edita tu comentario:', contenidoActual);
        if (nuevoContenido && nuevoContenido !== contenidoActual) {
            this.actualizarComentario(postId, comentarioId, nuevoContenido);
        }
    }

    async actualizarComentario(temaId, comentarioId, content) {
        // Validar comentario antes de actualizar
        const validation = this.validateCommentData(content);
        if (!validation.isValid) {
            this.showErrorMessage(validation.errors.join(', '));
            return;
        }
        
        try {
            const res = await this.fetchPublico(`${this.API_URL}/forum/posts/${temaId}/comments/${comentarioId}`, {
                method: 'PUT',
                body: JSON.stringify({ content })
            });
            
            const result = await res.json();
            
            if (result.success) {
                this.cargarTemasYComentarios();
                this.showSuccessMessage('Comentario actualizado exitosamente');
            } else {
                this.showErrorMessage(result.error || 'Error al actualizar comentario');
            }
        } catch (error) {
            console.error('Error actualizando comentario:', error);
            this.showErrorMessage('Error de conexión al actualizar comentario');
        }
    }

    async eliminarTema(id) {
        if (!confirm('¿Seguro que quieres eliminar este tema?')) return;
        
        try {
            const res = await this.fetchPublico(`${this.API_URL}/forum/posts/${id}`, {
                method: 'DELETE'
            });
            
            const result = await res.json();
            
            if (result.success) {
                this.cargarTemasYComentarios();
                this.showSuccessMessage('Tema eliminado exitosamente');
            } else {
                this.showErrorMessage(result.error || 'Error al eliminar tema');
            }
        } catch (error) {
            console.error('Error eliminando:', error);
            this.showErrorMessage('Error de conexión al eliminar tema');
        }
    }

    async eliminarComentario(temaId, comentarioId) {
        if (!confirm('¿Seguro que quieres eliminar este comentario?')) return;
        
        try {
            const res = await this.fetchPublico(`${this.API_URL}/forum/posts/${temaId}/comments/${comentarioId}`, {
                method: 'DELETE'
            });
            
            const result = await res.json();
            
            if (result.success) {
                this.cargarTemasYComentarios();
                this.showSuccessMessage('Comentario eliminado exitosamente');
            } else {
                this.showErrorMessage(result.error || 'Error al eliminar comentario');
            }
        } catch (error) {
            console.error('Error eliminando comentario:', error);
            this.showErrorMessage('Error de conexión al eliminar comentario');
        }
    }

    async buscarTemas(query) {
        if (this.isLoading) return;
        
        this.setLoadingState(true);
        
        try {
            const params = new URLSearchParams({
                q: query,
                limit: this.pageSize.toString(),
                offset: ((this.currentPage - 1) * this.pageSize).toString(),
                sortBy: this.sortBy,
                sortOrder: this.sortOrder
            });
            
            if (this.currentCategoryFilter) {
                params.append('categoryId', this.currentCategoryFilter);
            }

            const res = await this.fetchPublico(`${this.API_URL}/forum/search?${params}`);
            const result = await res.json();
            
            if (result.success) {
                this.temas = result.data;
                this.comentariosPorTema = {};
                
                // Estimar total de posts para paginación
                this.totalPosts = result.data.length < this.pageSize ?
                    (this.currentPage - 1) * this.pageSize + result.data.length :
                    (this.currentPage - 1) * this.pageSize + this.pageSize + 1;
                
                if (result.data.length === this.pageSize) {
                    this.totalPosts = this.currentPage * this.pageSize + 1;
                }
                
                this.totalPages = Math.ceil(this.totalPosts / this.pageSize);
                
                // Cargar comentarios para resultados de búsqueda
                for (const tema of this.temas) {
                    const resC = await this.fetchPublico(`${this.API_URL}/forum/posts/${tema.id}/comments`);
                    const commentsResult = await resC.json();
                    if (commentsResult.success) {
                        this.comentariosPorTema[tema.id] = commentsResult.data;
                    }
                }
                
                this.renderTemas();
                this.updatePaginationControls();
            } else {
                this.showErrorMessage(result.error || 'Error en la búsqueda');
            }
        } catch (error) {
            console.error('Error buscando:', error);
            this.showErrorMessage('Error de conexión en la búsqueda');
            this.temas = [];
            this.comentariosPorTema = {};
            this.renderTemas();
        } finally {
            this.setLoadingState(false);
        }
    }

    /**
     * Muestra un mensaje de éxito temporal
     * @param {string} message - Mensaje a mostrar
     */
    showSuccessMessage(message) {
        // Crear elemento temporal para mostrar mensaje
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
        
        // Eliminar después de 3 segundos
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 3000);
    }

    /**
     * Muestra un mensaje de error temporal
     * @param {string} message - Mensaje a mostrar
     */
    showErrorMessage(message) {
        // Crear elemento temporal para mostrar mensaje
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
        
        // Eliminar después de 3 segundos
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 3000);
    }

    /**
     * Escapa caracteres HTML para prevenir XSS
     * @param {string} text - Texto a escapar
     * @returns {string} Texto escapado
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ==================== MÉTODOS DE PAGINACIÓN ====================

    /**
     * Genera una clave de cache para la página actual
     * @returns {string} Clave de cache
     */
    getCacheKey() {
        return `${this.currentPage}-${this.pageSize}-${this.sortBy}-${this.sortOrder}-${this.currentCategoryFilter || 'all'}`;
    }

    /**
     * Reinicia la paginación a la primera página
     */
    resetPagination() {
        this.currentPage = 1;
        this.pageCache = {}; // Limpiar cache al cambiar filtros
    }

    /**
     * Navega a una página específica
     * @param {number} pageNum - Número de página
     */
    goToPage(pageNum) {
        if (pageNum < 1 || pageNum > this.totalPages || pageNum === this.currentPage) {
            return;
        }
        
        this.currentPage = pageNum;
        this.animatePageTransition();
        this.cargarTemasYComentarios();
    }

    /**
     * Actualiza los controles de paginación en la interfaz
     */
    updatePaginationControls() {
        const infoText = document.getElementById('pagination-info-text');
        const btnFirst = document.getElementById('btn-first-page');
        const btnPrev = document.getElementById('btn-prev-page');
        const btnNext = document.getElementById('btn-next-page');
        const btnLast = document.getElementById('btn-last-page');
        const pageNumbers = document.getElementById('pagination-numbers');

        if (!infoText || !btnFirst || !btnPrev || !btnNext || !btnLast || !pageNumbers) {
            return;
        }

        // Actualizar información de paginación
        const startItem = this.totalPosts === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
        const endItem = Math.min(this.currentPage * this.pageSize, this.totalPosts);
        infoText.textContent = `Mostrando ${startItem}-${endItem} de ${this.totalPosts} temas`;

        // Actualizar estado de botones
        btnFirst.disabled = this.currentPage === 1;
        btnPrev.disabled = this.currentPage === 1;
        btnNext.disabled = this.currentPage === this.totalPages;
        btnLast.disabled = this.currentPage === this.totalPages;

        // Generar números de página
        pageNumbers.innerHTML = '';
        
        // Lógica para mostrar números de página
        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);
        
        // Ajustar si estamos cerca del final
        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        // Botón primera página si no está visible
        if (startPage > 1) {
            const firstPageBtn = this.createPageButton(1);
            pageNumbers.appendChild(firstPageBtn);
            
            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.className = 'pagination-ellipsis';
                pageNumbers.appendChild(ellipsis);
            }
        }

        // Botones de página
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = this.createPageButton(i);
            pageNumbers.appendChild(pageBtn);
        }

        // Botón última página si no está visible
        if (endPage < this.totalPages) {
            if (endPage < this.totalPages - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.className = 'pagination-ellipsis';
                pageNumbers.appendChild(ellipsis);
            }
            
            const lastPageBtn = this.createPageButton(this.totalPages);
            pageNumbers.appendChild(lastPageBtn);
        }
    }

    /**
     * Crea un botón de número de página
     * @param {number} pageNum - Número de página
     * @returns {HTMLElement} Botón de página
     */
    createPageButton(pageNum) {
        const button = document.createElement('button');
        button.textContent = pageNum;
        button.className = 'page-number';
        button.dataset.page = pageNum;
        
        if (pageNum === this.currentPage) {
            button.classList.add('active');
        }
        
        return button;
    }

    /**
     * Establece el estado de carga
     * @param {boolean} loading - Estado de carga
     */
    setLoadingState(loading) {
        this.isLoading = loading;
        
        // Mostrar/ocultar indicador de carga
        const temasList = document.querySelector('.temas-list');
        if (temasList) {
            if (loading) {
                temasList.style.opacity = '0.5';
                temasList.style.pointerEvents = 'none';
            } else {
                temasList.style.opacity = '1';
                temasList.style.pointerEvents = 'auto';
            }
        }
        
        // Deshabilitar controles de paginación durante carga
        const paginationBtns = document.querySelectorAll('.pagination-btn, .page-number');
        paginationBtns.forEach(btn => {
            btn.disabled = loading;
        });
    }

    /**
     * Guarda las preferencias de usuario en localStorage
     */
    saveUserPreferences() {
        const preferences = {
            pageSize: this.pageSize,
            sortBy: this.sortBy,
            sortOrder: this.sortOrder
        };
        localStorage.setItem('forumPreferences', JSON.stringify(preferences));
    }

    /**
     * Carga las preferencias de usuario desde localStorage
     */
    loadUserPreferences() {
        try {
            const saved = localStorage.getItem('forumPreferences');
            if (saved) {
                const preferences = JSON.parse(saved);
                this.pageSize = preferences.pageSize || 10;
                this.sortBy = preferences.sortBy || 'last_activity_at';
                this.sortOrder = preferences.sortOrder || 'desc';
                
                // Actualizar controles en la interfaz
                const pageSizeSelect = document.getElementById('page-size');
                const sortBySelect = document.getElementById('sort-by');
                const sortOrderSelect = document.getElementById('sort-order');
                
                if (pageSizeSelect) pageSizeSelect.value = this.pageSize.toString();
                if (sortBySelect) sortBySelect.value = this.sortBy;
                if (sortOrderSelect) sortOrderSelect.value = this.sortOrder;
            }
        } catch (error) {
            console.error('Error cargando preferencias:', error);
        }
    }

    /**
     * Actualiza los indicadores visuales de ordenamiento
     */
    updateSortIndicators() {
        const sortBySelect = document.getElementById('sort-by');
        const sortOrderSelect = document.getElementById('sort-order');
        
        if (sortBySelect) {
            // Añadir clase activa al select de ordenamiento
            sortBySelect.classList.add('active');
            
            // Actualizar etiqueta para mostrar orden actual
            const label = sortBySelect.previousElementSibling;
            if (label) {
                const sortLabels = {
                    'last_activity_at': 'Última actividad',
                    'created_at': 'Fecha de creación',
                    'updated_at': 'Fecha de actualización',
                    'title': 'Título (alfabético)',
                    'views_count': 'Más vistos',
                    'upvotes_count': 'Más votados'
                };
                
                const orderText = this.sortOrder === 'desc' ? ' ↓' : ' ↑';
                label.textContent = `Ordenar por: ${sortLabels[this.sortBy] || 'Ordenar por'}${orderText}`;
            }
        }
        
        if (sortOrderSelect) {
            sortOrderSelect.classList.add('active');
        }
    }

    /**
     * Añade animaciones suaves al cambiar de página
     */
    animatePageTransition() {
        const temasList = document.querySelector('.temas-list');
        if (temasList) {
            temasList.style.opacity = '0';
            temasList.style.transform = 'translateY(10px)';
            
            setTimeout(() => {
                temasList.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                temasList.style.opacity = '1';
                temasList.style.transform = 'translateY(0)';
            }, 100);
        }
    }

    /**
     * Configura los atajos de teclado
     */
    setupKeyboardShortcuts() {
        // Crear panel de atajos de teclado
        const shortcutsPanel = document.createElement('div');
        shortcutsPanel.className = 'keyboard-shortcuts';
        shortcutsPanel.innerHTML = `
            <h4>Atajos de teclado</h4>
            <ul>
                <li><kbd>Ctrl</kbd> + <kbd>K</kbd> - Búsqueda</li>
                <li><kbd>Ctrl</kbd> + <kbd>N</kbd> - Nuevo tema</li>
                <li><kbd>←</kbd> / <kbd>→</kbd> - Navegar páginas</li>
                <li><kbd>1-9</kbd> - Ir a página</li>
                <li><kbd>H</kbd> - Mostrar/Ocultar ayuda</li>
            </ul>
        `;
        document.body.appendChild(shortcutsPanel);
        
        // Ocultar panel inicialmente
        setTimeout(() => {
            shortcutsPanel.classList.remove('show');
        }, 3000);
    }

    /**
     * Muestra u oculta el panel de atajos de teclado
     */
    toggleKeyboardShortcuts() {
        const shortcutsPanel = document.querySelector('.keyboard-shortcuts');
        if (shortcutsPanel) {
            shortcutsPanel.classList.toggle('show');
        }
    }

    /**
     * Mejora la accesibilidad de la interfaz
     */
    improveAccessibility() {
        // Añadir atributos ARIA a los controles de paginación
        const paginationBtns = document.querySelectorAll('.pagination-btn');
        paginationBtns.forEach(btn => {
            btn.setAttribute('aria-label', btn.textContent);
        });
        
        // Añadir atributos ARIA a los números de página
        const pageNumbers = document.querySelectorAll('.page-number');
        pageNumbers.forEach(btn => {
            const pageNum = btn.textContent;
            btn.setAttribute('aria-label', `Ir a página ${pageNum}`);
            btn.setAttribute('aria-current', btn.classList.contains('active') ? 'page' : 'false');
        });
        
        // Añadir atributos ARIA a los controles de ordenamiento
        const sortBySelect = document.getElementById('sort-by');
        if (sortBySelect) {
            sortBySelect.setAttribute('aria-label', 'Ordenar temas por');
        }
        
        const sortOrderSelect = document.getElementById('sort-order');
        if (sortOrderSelect) {
            sortOrderSelect.setAttribute('aria-label', 'Dirección de ordenamiento');
        }
        
        // Añadir atributos ARIA al botón de ir arriba
        const scrollTopBtn = document.getElementById('scroll-top-btn');
        if (scrollTopBtn) {
            scrollTopBtn.setAttribute('aria-label', 'Ir arriba de la página');
        }
    }

    /**
     * Implementa prefetching de páginas para mejorar la navegación
     */
    setupPrefetching() {
        // Prefetchar la siguiente página cuando el usuario se acerca al final de la actual
        window.addEventListener('scroll', () => {
            if (this.isLoading) return;
            
            const scrollPosition = window.innerHeight + window.scrollY;
            const documentHeight = document.documentElement.offsetHeight;
            
            // Si está a menos del 20% del final de la página
            if (scrollPosition >= documentHeight * 0.8 && this.currentPage < this.totalPages) {
                this.prefetchPage(this.currentPage + 1);
            }
        });
    }

    /**
     * Prefetch una página específica
     * @param {number} pageNum - Número de página a prefetch
     */
    async prefetchPage(pageNum) {
        const cacheKey = `${pageNum}-${this.pageSize}-${this.sortBy}-${this.sortOrder}-${this.currentCategoryFilter || 'all'}`;
        
        // Si ya está en cache, no hacer nada
        if (this.pageCache[cacheKey]) return;
        
        try {
            const offset = (pageNum - 1) * this.pageSize;
            const params = new URLSearchParams({
                limit: this.pageSize.toString(),
                offset: offset.toString(),
                sortBy: this.sortBy,
                sortOrder: this.sortOrder
            });
            
            if (this.currentCategoryFilter) {
                params.append('categoryId', this.currentCategoryFilter);
            }
            
            const url = `${this.API_URL}/forum/posts?${params}`;
            const res = await this.fetchPublico(url);
            const result = await res.json();
            
            if (result.success) {
                // Guardar en cache sin cargar comentarios (se cargarán cuando se visite la página)
                this.pageCache[cacheKey] = {
                    temas: result.data,
                    comentariosPorTema: {},
                    totalPosts: this.totalPosts,
                    prefetched: true
                };
            }
        } catch (error) {
            console.error('Error prefetching page:', error);
        }
    }

    /**
     * Implementa lazy loading para imágenes y contenido
     */
    setupLazyLoading() {
        // Configurar Intersection Observer para lazy loading
        if ('IntersectionObserver' in window) {
            this.imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        const src = img.getAttribute('data-src');
                        
                        if (src) {
                            img.src = src;
                            img.removeAttribute('data-src');
                            img.classList.add('loaded');
                        }
                        
                        observer.unobserve(img);
                    }
                });
            }, {
                rootMargin: '50px 0px', // Cargar imágenes 50px antes de que sean visibles
                threshold: 0.01
            });

            // Observer para comentarios anidados
            this.commentObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const commentContainer = entry.target;
                        const postId = commentContainer.getAttribute('data-post-id');
                        const commentId = commentContainer.getAttribute('data-comment-id');
                        
                        // Cargar comentarios bajo demanda
                        if (postId && !commentContainer.classList.contains('loaded')) {
                            this.loadCommentsOnDemand(postId, commentContainer);
                            commentContainer.classList.add('loaded');
                        }
                        
                        observer.unobserve(commentContainer);
                    }
                });
            }, {
                rootMargin: '100px 0px', // Cargar comentarios 100px antes de que sean visibles
                threshold: 0.01
            });
        }
    }

    /**
     * Carga imágenes con lazy loading
     * @param {HTMLElement} container - Contenedor donde buscar imágenes
     */
    observeImages(container) {
        if (!this.imageObserver) return;
        
        const lazyImages = container.querySelectorAll('img[data-src]');
        lazyImages.forEach(img => {
            this.imageObserver.observe(img);
        });
    }

    /**
     * Observa contenedores de comentarios para lazy loading
     * @param {HTMLElement} container - Contenedor donde buscar comentarios
     */
    observeCommentContainers(container) {
        if (!this.commentObserver) return;
        
        const commentContainers = container.querySelectorAll('.comments-lazy-load');
        commentContainers.forEach(container => {
            this.commentObserver.observe(container);
        });
    }

    /**
     * Carga comentarios bajo demanda
     * @param {string} postId - ID del post
     * @param {HTMLElement} container - Contenedor donde cargar los comentarios
     */
    async loadCommentsOnDemand(postId, container) {
        try {
            // Mostrar indicador de carga
            container.innerHTML = '<div class="loading-indicator"><div class="loading-spinner"></div><p>Cargando comentarios...</p></div>';
            
            const res = await this.fetchPublico(`${this.API_URL}/forum/posts/${postId}/comments?level=0`);
            const result = await res.json();
            
            if (result.success) {
                // Renderizar comentarios
                container.innerHTML = '<h5>Comentarios:</h5>';
                this.renderComentariosAnidados(result.data, container, postId);
                
                // Observar imágenes en los comentarios cargados
                this.observeImages(container);
            } else {
                container.innerHTML = '<p>Error al cargar comentarios</p>';
            }
        } catch (error) {
            console.error('Error cargando comentarios bajo demanda:', error);
            container.innerHTML = '<p>Error de conexión al cargar comentarios</p>';
        }
    }

    /**
     * Carga comentarios en segundo plano para mejorar la percepción de rendimiento
     */
    async loadCommentsInBackground() {
        try {
            // Crear un array de promesas para cargar todos los comentarios en paralelo
            const commentPromises = this.temas.map(async (tema) => {
                const resC = await this.fetchPublico(`${this.API_URL}/forum/posts/${tema.id}/comments`);
                const commentsResult = await resC.json();
                if (commentsResult.success) {
                    this.comentariosPorTema[tema.id] = commentsResult.data;
                    return { temaId: tema.id, comments: commentsResult.data };
                }
                return null;
            });

            // Esperar a que todas las promesas se resuelvan
            const results = await Promise.all(commentPromises);
            
            // Actualizar la interfaz con los comentarios cargados
            results.forEach(result => {
                if (result) {
                    this.updateCommentsForTopic(result.temaId, result.comments);
                }
            });
            
            // Actualizar cache con comentarios
            const cacheKey = this.getCacheKey();
            if (this.pageCache[cacheKey]) {
                this.pageCache[cacheKey].comentariosPorTema = { ...this.comentariosPorTema };
            }
        } catch (error) {
            console.error('Error cargando comentarios en segundo plano:', error);
        }
    }

    /**
     * Actualiza los comentarios de un tema específico en la interfaz
     * @param {string} temaId - ID del tema
     * @param {Array} comments - Comentarios a mostrar
     */
    updateCommentsForTopic(temaId, comments) {
        // Buscar el elemento de comentarios para este tema
        const temaElement = document.querySelector(`.tema[data-id="${temaId}"]`);
        if (!temaElement) {
            // Si no encontramos el tema por data-id, buscamos por el contenido
            const allTemas = document.querySelectorAll('.tema');
            for (const tema of allTemas) {
                const titleElement = tema.querySelector('h4');
                if (titleElement) {
                    const temaData = this.temas.find(t => t.id === temaId);
                    if (temaData && titleElement.textContent === temaData.title) {
                        tema.setAttribute('data-id', temaId);
                        break;
                    }
                }
            }
        }
        
        const comentariosSection = document.querySelector(`.tema[data-id="${temaId}"] .comentarios-section`);
        if (comentariosSection) {
            // Limpiar sección de comentarios
            comentariosSection.innerHTML = '<h5>Comentarios:</h5>';
            
            // Renderizar comentarios
            this.renderComentariosAnidados(comments, comentariosSection, temaId);
        }
    }

    /**
     * Invalida caché relevante después de operaciones de escritura
     */
    invalidateRelevantCache() {
        // Invalidar caché de posts
        const postsUrl = `${this.API_URL}/forum/posts`;
        const postsCacheKey = cacheService.generateCacheKey(postsUrl, {});
        cacheService.delete(postsCacheKey);
        
        // Invalidar caché de conteo de posts
        const countUrl = `${this.API_URL}/forum/posts/count`;
        const countCacheKey = cacheService.generateCacheKey(countUrl, {});
        cacheService.delete(countCacheKey);
        
        // Invalidar caché de posts populares
        const popularUrl = `${this.API_URL}/forum/posts/popular`;
        const popularCacheKey = cacheService.generateCacheKey(popularUrl, {});
        cacheService.delete(popularCacheKey);
        
        // Invalidar caché de categorías (podría haber cambiado el conteo)
        const categoriesUrl = `${this.API_URL}/categories`;
        const categoriesCacheKey = cacheService.generateCacheKey(categoriesUrl, {});
        cacheService.delete(categoriesCacheKey);
        
        console.log('Caché invalidado después de operación de escritura');
    }

    /**
     * Configura los callbacks de rendimiento
     */
    setupPerformanceCallbacks() {
        // Callback para carga lenta
        performanceMonitor.on('slowLoad', (data) => {
            console.warn('Carga lenta detectada:', data);
            
            // Mostrar indicador de carga mejorado
            this.showEnhancedLoadingIndicator();
        });
        
        // Callback para respuesta lenta de la API
        performanceMonitor.on('slowResponse', (data) => {
            console.warn('Respuesta lenta de la API:', data);
            
            // Mostrar notificación al usuario
            this.showSlowResponseNotification(data);
        });
        
        // Callback para advertencia de memoria
        performanceMonitor.on('memoryWarning', (data) => {
            console.warn('Advertencia de memoria:', data);
            
            // Liberar caché si el uso de memoria es alto
            if (data.usage > 85) {
                this.optimizeMemoryUsage();
            }
        });
    }
    
    /**
     * Muestra un indicador de carga mejorado
     */
    showEnhancedLoadingIndicator() {
        const temasList = document.querySelector('.temas-list');
        if (!temasList) return;
        
        // Si ya hay un indicador mejorado, no hacer nada
        if (temasList.querySelector('.enhanced-loading')) return;
        
        const indicator = document.createElement('div');
        indicator.className = 'enhanced-loading';
        indicator.innerHTML = `
            <div class="loading-spinner"></div>
            <p>Cargando temas. Esto está tardando más de lo normal...</p>
            <div class="loading-tips">
                <p>Sugerencias:</p>
                <ul>
                    <li>Verifica tu conexión a internet</li>
                    <li>Intenta recargar la página</li>
                    <li>Reduce el número de temas por página</li>
                </ul>
            </div>
        `;
        
        // Añadir estilos
        indicator.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
            text-align: center;
            background-color: #f8f9fa;
            border-radius: 8px;
            margin: 20px 0;
        `;
        
        temasList.appendChild(indicator);
    }
    
    /**
     * Muestra una notificación de respuesta lenta
     * @param {Object} data - Datos de la respuesta lenta
     */
    showSlowResponseNotification(data) {
        const notification = document.createElement('div');
        notification.className = 'slow-response-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <p>La respuesta del servidor está tardando más de lo normal (${Math.round(data.duration)}ms).</p>
                <p>URL: ${data.url}</p>
            </div>
            <button class="notification-close">×</button>
        `;
        
        // Añadir estilos
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 5px;
            padding: 15px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 1000;
            max-width: 400px;
        `;
        
        // Añadir a la página
        document.body.appendChild(notification);
        
        // Configurar cierre
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(notification);
        });
        
        // Cerrar automáticamente después de 10 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 10000);
    }
    
    /**
     * Optimiza el uso de memoria
     */
    optimizeMemoryUsage() {
        console.log('Optimizando uso de memoria...');
        
        // Limpiar caché
        cacheService.clear();
        
        // Limpiar caché de páginas
        this.pageCache = {};
        
        // Limpiar comentarios que no están visibles
        this.comentariosPorTema = {};
        
        // Mostrar notificación al usuario
        this.showMemoryOptimizationNotification();
    }
    
    /**
     * Muestra una notificación de optimización de memoria
     */
    showMemoryOptimizationNotification() {
        const notification = document.createElement('div');
        notification.className = 'memory-optimization-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <p>Se ha optimizado el uso de memoria para mejorar el rendimiento.</p>
                <p>Es posible que algunas acciones sean un poco más lentas temporalmente.</p>
            </div>
            <button class="notification-close">×</button>
        `;
        
        // Añadir estilos
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #d1ecf1;
            border: 1px solid #bee5eb;
            border-radius: 5px;
            padding: 15px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 1000;
            max-width: 400px;
        `;
        
        // Añadir a la página
        document.body.appendChild(notification);
        
        // Configurar cierre
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(notification);
        });
        
        // Cerrar automáticamente después de 5 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 5000);
    }
    
    /**
     * Muestra estadísticas de caché para depuración
     */
    showCacheStats() {
        const stats = cacheService.getStats();
        console.log('Estadísticas de caché:', stats);
        
        // Mostrar en la interfaz si está en modo desarrollo
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            const statsDiv = document.createElement('div');
            statsDiv.style.cssText = `
                position: fixed;
                bottom: 70px;
                right: 20px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 10px;
                border-radius: 5px;
                font-size: 12px;
                z-index: 1000;
                max-width: 300px;
            `;
            statsDiv.innerHTML = `
                <div><strong>Estadísticas de caché:</strong></div>
                <div>Elementos en memoria: ${stats.memorySize}</div>
                <div>Válidos: ${stats.validItems}</div>
                <div>Expirados: ${stats.expiredItems}</div>
                <div>Tamaño: ${stats.totalSizeKB} KB</div>
            `;
            
            // Añadir a la página
            document.body.appendChild(statsDiv);
            
            // Eliminar después de 5 segundos
            setTimeout(() => {
                if (statsDiv.parentNode) {
                    statsDiv.parentNode.removeChild(statsDiv);
                }
            }, 5000);
        }
    }
    
    /**
     * Muestra estadísticas de rendimiento para depuración
     */
    showPerformanceStats() {
        const stats = performanceMonitor.getMetricsSummary();
        console.log('Estadísticas de rendimiento:', stats);
        
        // Mostrar en la interfaz si está en modo desarrollo
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            const statsDiv = document.createElement('div');
            statsDiv.style.cssText = `
                position: fixed;
                bottom: 70px;
                left: 20px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 10px;
                border-radius: 5px;
                font-size: 12px;
                z-index: 1000;
                max-width: 400px;
                max-height: 300px;
                overflow-y: auto;
            `;
            statsDiv.innerHTML = `
                <div><strong>Estadísticas de rendimiento:</strong></div>
                <div>Carga de página: ${Math.round(stats.pageLoad.duration)}ms</div>
                <div>Llamadas a la API: ${stats.apiCalls.count}</div>
                <div>Tiempo promedio de API: ${stats.apiCalls.avgDuration}ms</div>
                <div>Tasa de error de API: ${stats.apiCalls.errorRate}%</div>
                <div>Tiempo de renderizado: ${stats.renderTimes.avgDuration}ms</div>
                <div>Uso de memoria: ${stats.memoryUsage.current.percentage}%</div>
                <div>Interacciones de usuario: ${stats.userInteractions.count}</div>
            `;
            
            // Añadir a la página
            document.body.appendChild(statsDiv);
            
            // Eliminar después de 10 segundos
            setTimeout(() => {
                if (statsDiv.parentNode) {
                    statsDiv.parentNode.removeChild(statsDiv);
                }
            }, 10000);
        }
    }
    
    /**
     * Genera y muestra un informe de rendimiento completo
     */
    showPerformanceReport() {
        const reportHtml = performanceMonitor.generatePerformanceReport();
        
        // Crear modal para mostrar el informe
        const modal = document.createElement('div');
        modal.className = 'performance-report-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 2000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background-color: white;
            border-radius: 8px;
            padding: 20px;
            max-width: 800px;
            max-height: 80%;
            overflow-y: auto;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        `;
        
        modalContent.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h2>Informe de Rendimiento</h2>
                <button id="close-performance-report" style="background: none; border: none; font-size: 24px; cursor: pointer;">×</button>
            </div>
            ${reportHtml}
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Configurar cierre
        const closeBtn = modalContent.querySelector('#close-performance-report');
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        // Cerrar al hacer clic fuera del contenido
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }
}

// Instanciar el foro cuando se carga la página
let foro;
document.addEventListener('DOMContentLoaded', () => {
    foro = new ForoCompleto();
    
    // Añadir atajos de teclado para modo desarrollo
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        document.addEventListener('keydown', (e) => {
            // Ctrl + Shift + C: Mostrar estadísticas de caché
            if (e.ctrlKey && e.shiftKey && e.key === 'C') {
                e.preventDefault();
                foro.showCacheStats();
            }
            
            // Ctrl + Shift + P: Mostrar estadísticas de rendimiento
            if (e.ctrlKey && e.shiftKey && e.key === 'P') {
                e.preventDefault();
                foro.showPerformanceStats();
            }
            
            // Ctrl + Shift + R: Mostrar informe de rendimiento completo
            if (e.ctrlKey && e.shiftKey && e.key === 'R') {
                e.preventDefault();
                foro.showPerformanceReport();
            }
        });
    }
});