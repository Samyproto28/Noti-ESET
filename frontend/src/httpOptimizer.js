// Servicio de optimización de peticiones HTTP

class HttpOptimizer {
    constructor() {
        // Configuración de optimización
        this.config = {
            // Tiempo de espera para agrupar peticiones (batching)
            batchTimeout: 50, // 50ms
            
            // Tamaño máximo de lote
            maxBatchSize: 10,
            
            // Tiempo de espera para reintentos automáticos
            retryDelay: 1000, // 1 segundo
            
            // Número máximo de reintentos
            maxRetries: 3,
            
            // Tiempo de espera para peticiones
            requestTimeout: 10000, // 10 segundos
            
            // Umbral de compresión (solo comprimir respuestas mayores a este tamaño en bytes)
            compressionThreshold: 1024 // 1KB
        };
        
        // Colas de peticiones para agrupar
        this.batchQueues = new Map();
        
        // Peticiones en curso para evitar duplicados
        this.pendingRequests = new Map();
        
        // Contador de peticiones para identificación
        this.requestCounter = 0;
        
        // Estadísticas de rendimiento
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            batchedRequests: 0,
            retriedRequests: 0,
            avgResponseTime: 0,
            totalResponseTime: 0
        };
    }
    
    /**
     * Realiza una petición HTTP optimizada
     * @param {string} url - URL de la petición
     * @param {Object} options - Opciones de la petición
     * @param {Object} optimizationOptions - Opciones de optimización
     * @returns {Promise} Respuesta de la petición
     */
    async fetch(url, options = {}, optimizationOptions = {}) {
        const requestId = ++this.requestCounter;
        const startTime = performance.now();
        
        // Actualizar estadísticas
        this.stats.totalRequests++;
        
        try {
            // Verificar si ya hay una petición idéntica en curso
            const requestKey = this.generateRequestKey(url, options);
            if (this.pendingRequests.has(requestKey) && optimizationOptions.preventDuplicates !== false) {
                console.log(`Petición duplicada detectada, reutilizando: ${requestKey}`);
                return this.pendingRequests.get(requestKey);
            }
            
            // Crear promesa para la petición
            const requestPromise = this.executeRequest(url, options, optimizationOptions, requestId);
            
            // Almacenar petición en curso
            this.pendingRequests.set(requestKey, requestPromise);
            
            // Limpiar después de completar
            requestPromise.finally(() => {
                this.pendingRequests.delete(requestKey);
            });
            
            // Ejecutar petición
            const response = await requestPromise;
            
            // Actualizar estadísticas
            this.stats.successfulRequests++;
            const responseTime = performance.now() - startTime;
            this.updateAvgResponseTime(responseTime);
            
            return response;
        } catch (error) {
            // Actualizar estadísticas
            this.stats.failedRequests++;
            console.error(`Error en petición ${requestId}:`, error);
            throw error;
        }
    }
    
    /**
     * Ejecuta una petición HTTP con reintentos y optimizaciones
     * @param {string} url - URL de la petición
     * @param {Object} options - Opciones de la petición
     * @param {Object} optimizationOptions - Opciones de optimización
     * @param {number} requestId - ID de la petición
     * @returns {Promise} Respuesta de la petición
     */
    async executeRequest(url, options, optimizationOptions, requestId) {
        const maxRetries = optimizationOptions.maxRetries || this.config.maxRetries;
        const retryDelay = optimizationOptions.retryDelay || this.config.retryDelay;
        const requestTimeout = optimizationOptions.timeout || this.config.requestTimeout;
        
        let lastError;
        
        // Intentar la petición con reintentos
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                // Configurar timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), requestTimeout);
                
                // Añadir ID de petición a las cabeceras para depuración
                const headers = new Headers(options.headers || {});
                headers.set('X-Request-ID', requestId.toString());
                
                // Optimizar cabeceras
                this.optimizeHeaders(headers, options.method || 'GET');
                
                // Realizar petición
                const response = await fetch(url, {
                    ...options,
                    headers,
                    signal: controller.signal
                });
                
                // Limpiar timeout
                clearTimeout(timeoutId);
                
                // Verificar si la respuesta es exitosa
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                // Optimizar respuesta
                return this.optimizeResponse(response, optimizationOptions);
            } catch (error) {
                lastError = error;
                
                // Si no es el último intento, esperar antes de reintentar
                if (attempt < maxRetries) {
                    this.stats.retriedRequests++;
                    console.warn(`Intento ${attempt + 1} fallido para petición ${requestId}, reintentando en ${retryDelay}ms:`, error.message);
                    
                    // Esperar con backoff exponencial
                    await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
                }
            }
        }
        
        // Si todos los intentos fallaron, lanzar el último error
        throw lastError;
    }
    
    /**
     * Optimiza las cabeceras de la petición
     * @param {Headers} headers - Cabeceras de la petición
     * @param {string} method - Método HTTP
     */
    optimizeHeaders(headers, method) {
        // Añadir cabeceras de caché apropiadas según el método
        if (method === 'GET') {
            // Permitir caché para peticiones GET
            if (!headers.has('Cache-Control')) {
                headers.set('Cache-Control', 'max-age=300'); // 5 minutos
            }
        } else {
            // No cachear peticiones de escritura
            headers.set('Cache-Control', 'no-cache');
        }
        
        // Añadir cabecera de compresión si no está presente
        if (!headers.has('Accept-Encoding')) {
            headers.set('Accept-Encoding', 'gzip, deflate, br');
        }
        
        // Optimizar para HTTP/2
        headers.set('Connection', 'keep-alive');
    }
    
    /**
     * Optimiza la respuesta del servidor
     * @param {Response} response - Respuesta original
     * @param {Object} optimizationOptions - Opciones de optimización
     * @returns {Promise} Respuesta optimizada
     */
    async optimizeResponse(response, optimizationOptions) {
        // Verificar si la respuesta está comprimida
        const contentEncoding = response.headers.get('Content-Encoding');
        const contentLength = response.headers.get('Content-Length');
        
        // Si la respuesta es grande y no está comprimida, registrar para análisis
        if (contentLength && parseInt(contentLength) > this.config.compressionThreshold && 
            !contentEncoding && optimizationOptions.logCompressionIssues) {
            console.warn(`Respuesta grande sin comprimir: ${contentLength} bytes para ${response.url}`);
        }
        
        // Clonar respuesta para no consumirla
        const optimizedResponse = response.clone();
        
        // Añadir cabecera personalizada para indicar optimización
        optimizedResponse.headers.set('X-Optimized', 'true');
        
        return optimizedResponse;
    }
    
    /**
     * Agrupa peticiones similares para procesarlas en lote
     * @param {string} batchKey - Clave para agrupar peticiones
     * @param {Function} requestFn - Función que ejecuta la petición
     * @param {Array} requests - Array de peticiones a agrupar
     * @returns {Promise} Resultados de las peticiones agrupadas
     */
    async batchRequests(batchKey, requestFn, requests) {
        // Si ya hay una cola para este tipo de petición, añadir a la cola
        if (this.batchQueues.has(batchKey)) {
            return new Promise((resolve, reject) => {
                this.batchQueues.get(batchKey).push({ requestFn, requests, resolve, reject });
            });
        }
        
        // Crear nueva cola
        this.batchQueues.set(batchKey, []);
        
        // Añadir petición actual a la cola
        const currentRequest = new Promise((resolve, reject) => {
            this.batchQueues.get(batchKey).push({ requestFn, requests, resolve, reject });
        });
        
        // Esperar a que se acumulen más peticiones o se alcance el timeout
        setTimeout(() => {
            this.processBatch(batchKey);
        }, this.config.batchTimeout);
        
        return currentRequest;
    }
    
    /**
     * Procesa un lote de peticiones
     * @param {string} batchKey - Clave del lote
     */
    async processBatch(batchKey) {
        const queue = this.batchQueues.get(batchKey);
        if (!queue || queue.length === 0) {
            this.batchQueues.delete(batchKey);
            return;
        }
        
        // Eliminar la cola para evitar procesamientos duplicados
        this.batchQueues.delete(batchKey);
        
        // Limitar el tamaño del lote
        const batch = queue.slice(0, this.config.maxBatchSize);
        
        // Si hay peticiones restantes, crear una nueva cola
        if (queue.length > this.config.maxBatchSize) {
            this.batchQueues.set(batchKey, queue.slice(this.config.maxBatchSize));
            setTimeout(() => {
                this.processBatch(batchKey);
            }, this.config.batchTimeout);
        }
        
        // Actualizar estadísticas
        this.stats.batchedRequests += batch.length;
        
        try {
            // Agrupar todas las peticiones
            const allRequests = [];
            batch.forEach(({ requests }) => {
                allRequests.push(...requests);
            });
            
            // Ejecutar la función de petición con todas las peticiones
            const results = await batch[0].requestFn(allRequests);
            
            // Distribuir resultados a las peticiones originales
            let resultIndex = 0;
            batch.forEach(({ requests, resolve }) => {
                const requestResults = results.slice(resultIndex, resultIndex + requests.length);
                resolve(requestResults);
                resultIndex += requests.length;
            });
        } catch (error) {
            // Rechazar todas las peticiones del lote
            batch.forEach(({ reject }) => {
                reject(error);
            });
        }
    }
    
    /**
     * Genera una clave única para una petición
     * @param {string} url - URL de la petición
     * @param {Object} options - Opciones de la petición
     * @returns {string} Clave única
     */
    generateRequestKey(url, options) {
        // Normalizar URL
        const normalizedUrl = new URL(url, window.location.origin).toString();
        
        // Extraer parámetros relevantes
        const method = options.method || 'GET';
        const body = options.body ? JSON.stringify(options.body) : '';
        
        // Generar hash de la petición
        return `${method}:${normalizedUrl}:${body}`;
    }
    
    /**
     * Actualiza el tiempo promedio de respuesta
     * @param {number} responseTime - Tiempo de respuesta en ms
     */
    updateAvgResponseTime(responseTime) {
        this.stats.totalResponseTime += responseTime;
        this.stats.avgResponseTime = this.stats.totalResponseTime / this.stats.successfulRequests;
    }
    
    /**
     * Obtiene estadísticas de rendimiento
     * @returns {Object} Estadísticas de rendimiento
     */
    getStats() {
        return {
            ...this.stats,
            successRate: this.stats.totalRequests > 0 
                ? (this.stats.successfulRequests / this.stats.totalRequests * 100).toFixed(2) + '%'
                : '0%',
            batchRate: this.stats.totalRequests > 0
                ? (this.stats.batchedRequests / this.stats.totalRequests * 100).toFixed(2) + '%'
                : '0%'
        };
    }
    
    /**
     * Reinicia las estadísticas
     */
    resetStats() {
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            batchedRequests: 0,
            retriedRequests: 0,
            avgResponseTime: 0,
            totalResponseTime: 0
        };
    }
}

// Crear instancia global del optimizador HTTP
const httpOptimizer = new HttpOptimizer();

export default httpOptimizer;