// Servicio de caché para optimizar el rendimiento del frontend

class CacheService {
    constructor() {
        // Configuración de caché
        this.config = {
            defaultTTL: 5 * 60 * 1000, // 5 minutos por defecto
            maxSize: 50, // Máximo 50 elementos en caché
            storagePrefix: 'forum_cache_'
        };
        
        // Almacenamiento en memoria para acceso rápido
        this.memoryCache = new Map();
        
        // Intentar usar localStorage si está disponible
        this.useLocalStorage = this.isLocalStorageAvailable();
        
        // Limpiar caché expirado al iniciar
        this.cleanExpiredCache();
    }
    
    /**
     * Verifica si localStorage está disponible
     * @returns {boolean} True si localStorage está disponible
     */
    isLocalStorageAvailable() {
        try {
            const test = '__test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            console.warn('localStorage no está disponible:', e);
            return false;
        }
    }
    
    /**
     * Genera una clave de caché para una URL y parámetros
     * @param {string} url - URL de la petición
     * @param {Object} params - Parámetros de la petición
     * @returns {string} Clave de caché
     */
    generateCacheKey(url, params = {}) {
        const paramString = Object.keys(params)
            .sort()
            .map(key => `${key}=${params[key]}`)
            .join('&');
        
        return `${url}${paramString ? '?' + paramString : ''}`;
    }
    
    /**
     * Almacena un elemento en caché
     * @param {string} key - Clave del elemento
     * @param {any} data - Datos a almacenar
     * @param {number} ttl - Tiempo de vida en milisegundos
     */
    set(key, data, ttl = this.config.defaultTTL) {
        const now = Date.now();
        const expiry = now + ttl;
        
        const cacheItem = {
            data,
            expiry,
            accessed: now
        };
        
        // Almacenar en memoria
        this.memoryCache.set(key, cacheItem);
        
        // Almacenar en localStorage si está disponible y los datos son serializables
        if (this.useLocalStorage && this.isSerializable(data)) {
            try {
                const storageKey = this.config.storagePrefix + btoa(key);
                localStorage.setItem(storageKey, JSON.stringify(cacheItem));
            } catch (e) {
                console.warn('Error al guardar en localStorage:', e);
            }
        }
        
        // Limpiar caché si excede el tamaño máximo
        this.evictOldestIfNeeded();
    }
    
    /**
     * Obtiene un elemento de caché
     * @param {string} key - Clave del elemento
     * @returns {any|null} Datos almacenados o null si no existe o está expirado
     */
    get(key) {
        const now = Date.now();
        
        // Intentar obtener de la memoria primero
        let cacheItem = this.memoryCache.get(key);
        
        // Si no está en memoria, intentar obtener de localStorage
        if (!cacheItem && this.useLocalStorage) {
            try {
                const storageKey = this.config.storagePrefix + btoa(key);
                const storedItem = localStorage.getItem(storageKey);
                
                if (storedItem) {
                    cacheItem = JSON.parse(storedItem);
                    // Restaurar en memoria para acceso rápido
                    this.memoryCache.set(key, cacheItem);
                }
            } catch (e) {
                console.warn('Error al leer de localStorage:', e);
            }
        }
        
        // Verificar si el elemento existe y no está expirado
        if (cacheItem && cacheItem.expiry > now) {
            // Actualizar tiempo de acceso
            cacheItem.accessed = now;
            return cacheItem.data;
        }
        
        // Si está expirado, eliminarlo
        if (cacheItem) {
            this.delete(key);
        }
        
        return null;
    }
    
    /**
     * Verifica si un elemento existe en caché y no está expirado
     * @param {string} key - Clave del elemento
     * @returns {boolean} True si el elemento existe y no está expirado
     */
    has(key) {
        return this.get(key) !== null;
    }
    
    /**
     * Elimina un elemento de caché
     * @param {string} key - Clave del elemento
     */
    delete(key) {
        // Eliminar de memoria
        this.memoryCache.delete(key);
        
        // Eliminar de localStorage si está disponible
        if (this.useLocalStorage) {
            try {
                const storageKey = this.config.storagePrefix + btoa(key);
                localStorage.removeItem(storageKey);
            } catch (e) {
                console.warn('Error al eliminar de localStorage:', e);
            }
        }
    }
    
    /**
     * Limpia toda la caché
     */
    clear() {
        // Limpiar memoria
        this.memoryCache.clear();
        
        // Limpiar localStorage si está disponible
        if (this.useLocalStorage) {
            try {
                const keys = Object.keys(localStorage);
                keys.forEach(key => {
                    if (key.startsWith(this.config.storagePrefix)) {
                        localStorage.removeItem(key);
                    }
                });
            } catch (e) {
                console.warn('Error al limpiar localStorage:', e);
            }
        }
    }
    
    /**
     * Limpia elementos expirados de la caché
     */
    cleanExpiredCache() {
        const now = Date.now();
        
        // Limpiar memoria
        for (const [key, item] of this.memoryCache.entries()) {
            if (item.expiry <= now) {
                this.memoryCache.delete(key);
            }
        }
        
        // Limpiar localStorage si está disponible
        if (this.useLocalStorage) {
            try {
                const keys = Object.keys(localStorage);
                keys.forEach(key => {
                    if (key.startsWith(this.config.storagePrefix)) {
                        try {
                            const item = JSON.parse(localStorage.getItem(key));
                            if (item.expiry <= now) {
                                localStorage.removeItem(key);
                            }
                        } catch (e) {
                            // Si hay error al parsear, eliminar el elemento
                            localStorage.removeItem(key);
                        }
                    }
                });
            } catch (e) {
                console.warn('Error al limpiar caché expirada:', e);
            }
        }
    }
    
    /**
     * Verifica si un dato es serializable para localStorage
     * @param {any} data - Datos a verificar
     * @returns {boolean} True si es serializable
     */
    isSerializable(data) {
        try {
            JSON.stringify(data);
            return true;
        } catch (e) {
            return false;
        }
    }
    
    /**
     * Elimina los elementos más antiguos si la caché excede el tamaño máximo
     */
    evictOldestIfNeeded() {
        if (this.memoryCache.size <= this.config.maxSize) {
            return;
        }
        
        // Convertir a array y ordenar por tiempo de acceso
        const entries = Array.from(this.memoryCache.entries())
            .sort((a, b) => a[1].accessed - b[1].accessed);
        
        // Eliminar los más antiguos hasta que el tamaño sea adecuado
        const toDelete = entries.slice(0, this.memoryCache.size - this.config.maxSize);
        toDelete.forEach(([key]) => {
            this.memoryCache.delete(key);
            
            // También eliminar de localStorage si existe
            if (this.useLocalStorage) {
                try {
                    const storageKey = this.config.storagePrefix + btoa(key);
                    localStorage.removeItem(storageKey);
                } catch (e) {
                    console.warn('Error al eliminar de localStorage:', e);
                }
            }
        });
    }
    
    /**
     * Obtiene estadísticas de la caché
     * @returns {Object} Estadísticas de uso
     */
    getStats() {
        const now = Date.now();
        let validItems = 0;
        let expiredItems = 0;
        let totalSize = 0;
        
        for (const [key, item] of this.memoryCache.entries()) {
            totalSize += JSON.stringify(item.data).length;
            
            if (item.expiry > now) {
                validItems++;
            } else {
                expiredItems++;
            }
        }
        
        return {
            memorySize: this.memoryCache.size,
            validItems,
            expiredItems,
            totalSizeBytes: totalSize,
            totalSizeKB: (totalSize / 1024).toFixed(2),
            localStorageAvailable: this.useLocalStorage
        };
    }
}

// Crear instancia global del servicio de caché
const cacheService = new CacheService();

export default cacheService;