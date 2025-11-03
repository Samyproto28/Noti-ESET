// Servicio de monitoreo de rendimiento

class PerformanceMonitor {
    constructor() {
        // Configuración del monitor
        this.config = {
            // Umbral de tiempo de carga lenta (ms)
            slowLoadThreshold: 1000,
            
            // Umbral de tiempo de respuesta lenta (ms)
            slowResponseThreshold: 500,
            
            // Intervalo de recolección de métricas (ms)
            metricsInterval: 5000,
            
            // Número máximo de métricas a almacenar
            maxMetricsCount: 100
        };
        
        // Métricas de rendimiento
        this.metrics = {
            pageLoad: {
                startTime: 0,
                endTime: 0,
                duration: 0
            },
            apiCalls: [],
            userInteractions: [],
            renderTimes: [],
            memoryUsage: [],
            networkInfo: {}
        };
        
        // Observadores de rendimiento
        this.observers = {
            performance: null,
            mutation: null,
            resize: null
        };
        
        // Bandera de inicialización
        this.isInitialized = false;
        
        // Callbacks para eventos de rendimiento
        this.callbacks = {
            slowLoad: [],
            slowResponse: [],
            memoryWarning: []
        };
    }
    
    /**
     * Inicializa el monitor de rendimiento
     */
    init() {
        if (this.isInitialized) return;
        
        // Marcar tiempo de inicio de carga de página
        this.metrics.pageLoad.startTime = performance.now();
        
        // Configurar observadores
        this.setupPerformanceObserver();
        this.setupMutationObserver();
        this.setupResizeObserver();
        
        // Recopilar información de red
        this.collectNetworkInfo();
        
        // Iniciar recolección periódica de métricas
        this.startMetricsCollection();
        
        // Marcar como inicializado
        this.isInitialized = true;
        
        // Registrar evento de carga completa
        window.addEventListener('load', () => {
            this.metrics.pageLoad.endTime = performance.now();
            this.metrics.pageLoad.duration = this.metrics.pageLoad.endTime - this.metrics.pageLoad.startTime;
            
            // Verificar si la carga fue lenta
            if (this.metrics.pageLoad.duration > this.config.slowLoadThreshold) {
                this.triggerCallback('slowLoad', {
                    duration: this.metrics.pageLoad.duration,
                    threshold: this.config.slowLoadThreshold
                });
            }
        });
    }
    
    /**
     * Configura el observador de rendimiento
     */
    setupPerformanceObserver() {
        if (!window.PerformanceObserver) return;
        
        try {
            this.observers.performance = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                
                entries.forEach(entry => {
                    // Procesar diferentes tipos de entradas
                    switch (entry.entryType) {
                        case 'navigation':
                            this.processNavigationEntry(entry);
                            break;
                        case 'resource':
                            this.processResourceEntry(entry);
                            break;
                        case 'measure':
                            this.processMeasureEntry(entry);
                            break;
                        case 'paint':
                            this.processPaintEntry(entry);
                            break;
                    }
                });
            });
            
            // Observar diferentes tipos de entradas
            this.observers.performance.observe({ entryTypes: ['navigation', 'resource', 'measure', 'paint'] });
        } catch (error) {
            console.warn('Error al configurar PerformanceObserver:', error);
        }
    }
    
    /**
     * Configura el observador de mutaciones
     */
    setupMutationObserver() {
        if (!window.MutationObserver) return;
        
        this.observers.mutation = new MutationObserver((mutations) => {
            const startTime = performance.now();
            
            // Procesar mutaciones
            mutations.forEach(mutation => {
                // Contar nodos añadidos/eliminados
                const addedNodes = mutation.addedNodes.length;
                const removedNodes = mutation.removedNodes.length;
                
                // Registrar si hay muchas mutaciones
                if (addedNodes > 10 || removedNodes > 10) {
                    this.recordUserInteraction('dom_mutation', {
                        addedNodes,
                        removedNodes,
                        target: mutation.target.tagName
                    });
                }
            });
            
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            // Registrar tiempo de procesamiento de mutaciones
            this.recordRenderTime('mutation_processing', duration);
        });
        
        // Observar todo el documento
        this.observers.mutation.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true
        });
    }
    
    /**
     * Configura el observador de redimensionamiento
     */
    setupResizeObserver() {
        if (!window.ResizeObserver) return;
        
        this.observers.resize = new ResizeObserver((entries) => {
            entries.forEach(entry => {
                const { width, height } = entry.contentRect;
                
                // Registrar evento de redimensionamiento
                this.recordUserInteraction('resize', {
                    width,
                    height,
                    target: entry.target.tagName
                });
            });
        });
        
        // Observar elementos principales
        const mainElements = document.querySelectorAll('body, main, .foro-section');
        mainElements.forEach(element => {
            this.observers.resize.observe(element);
        });
    }
    
    /**
     * Recopila información de red
     */
    collectNetworkInfo() {
        if (!navigator.connection) return;
        
        this.metrics.networkInfo = {
            effectiveType: navigator.connection.effectiveType,
            downlink: navigator.connection.downlink,
            rtt: navigator.connection.rtt,
            saveData: navigator.connection.saveData
        };
    }
    
    /**
     * Inicia la recolección periódica de métricas
     */
    startMetricsCollection() {
        setInterval(() => {
            // Recopilar uso de memoria
            this.collectMemoryUsage();
            
            // Limpiar métricas antiguas
            this.cleanupOldMetrics();
        }, this.config.metricsInterval);
    }
    
    /**
     * Recopila uso de memoria
     */
    collectMemoryUsage() {
        if (!performance.memory) return;
        
        const memoryInfo = {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
            limit: performance.memory.jsHeapSizeLimit,
            timestamp: performance.now()
        };
        
        this.metrics.memoryUsage.push(memoryInfo);
        
        // Verificar si hay advertencia de memoria
        const usagePercentage = (memoryInfo.used / memoryInfo.limit) * 100;
        if (usagePercentage > 80) {
            this.triggerCallback('memoryWarning', {
                usage: usagePercentage,
                used: memoryInfo.used,
                limit: memoryInfo.limit
            });
        }
    }
    
    /**
     * Registra una llamada a la API
     * @param {string} url - URL de la API
     * @param {number} duration - Duración de la llamada en ms
     * @param {number} status - Código de estado HTTP
     */
    recordApiCall(url, duration, status) {
        const apiCall = {
            url,
            duration,
            status,
            timestamp: performance.now()
        };
        
        this.metrics.apiCalls.push(apiCall);
        
        // Verificar si la respuesta fue lenta
        if (duration > this.config.slowResponseThreshold) {
            this.triggerCallback('slowResponse', {
                url,
                duration,
                status,
                threshold: this.config.slowResponseThreshold
            });
        }
    }
    
    /**
     * Registra una interacción del usuario
     * @param {string} type - Tipo de interacción
     * @param {Object} data - Datos adicionales
     */
    recordUserInteraction(type, data = {}) {
        const interaction = {
            type,
            data,
            timestamp: performance.now()
        };
        
        this.metrics.userInteractions.push(interaction);
    }
    
    /**
     * Registra un tiempo de renderizado
     * @param {string} component - Nombre del componente
     * @param {number} duration - Duración del renderizado en ms
     */
    recordRenderTime(component, duration) {
        const renderTime = {
            component,
            duration,
            timestamp: performance.now()
        };
        
        this.metrics.renderTimes.push(renderTime);
    }
    
    /**
     * Mide el tiempo de ejecución de una función
     * @param {string} name - Nombre de la medición
     * @param {Function} fn - Función a medir
     * @returns {*} Resultado de la función
     */
    measureFunction(name, fn) {
        const startTime = performance.now();
        const result = fn();
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        this.recordRenderTime(name, duration);
        return result;
    }
    
    /**
     * Mide el tiempo de ejecución de una función asíncrona
     * @param {string} name - Nombre de la medición
     * @param {Function} fn - Función asíncrona a medir
     * @returns {Promise} Resultado de la función
     */
    async measureAsyncFunction(name, fn) {
        const startTime = performance.now();
        const result = await fn();
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        this.recordRenderTime(name, duration);
        return result;
    }
    
    /**
     * Procesa una entrada de navegación
     * @param {PerformanceNavigationTiming} entry - Entrada de navegación
     */
    processNavigationEntry(entry) {
        // Extraer métricas de navegación
        const navigationMetrics = {
            domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
            loadComplete: entry.loadEventEnd - entry.loadEventStart,
            firstPaint: 0,
            firstContentfulPaint: 0
        };
        
        // Buscar métricas de pintura
        const paintEntries = performance.getEntriesByType('paint');
        paintEntries.forEach(paintEntry => {
            if (paintEntry.name === 'first-paint') {
                navigationMetrics.firstPaint = paintEntry.startTime;
            } else if (paintEntry.name === 'first-contentful-paint') {
                navigationMetrics.firstContentfulPaint = paintEntry.startTime;
            }
        });
        
        // Registrar métricas de navegación
        this.recordRenderTime('navigation', navigationMetrics.domContentLoaded);
        this.recordRenderTime('load_complete', navigationMetrics.loadComplete);
        this.recordRenderTime('first_paint', navigationMetrics.firstPaint);
        this.recordRenderTime('first_contentful_paint', navigationMetrics.firstContentfulPaint);
    }
    
    /**
     * Procesa una entrada de recurso
     * @param {PerformanceResourceTiming} entry - Entrada de recurso
     */
    processResourceEntry(entry) {
        // Ignorar recursos del navegador
        if (entry.initiatorType === 'beacon' || entry.initiatorType === 'xmlhttprequest') {
            return;
        }
        
        // Calcular duración de carga del recurso
        const duration = entry.responseEnd - entry.requestStart;
        
        // Registrar tiempo de carga del recurso
        this.recordRenderTime(`resource_${entry.initiatorType}`, duration);
    }
    
    /**
     * Procesa una entrada de medida
     * @param {PerformanceMeasure} entry - Entrada de medida
     */
    processMeasureEntry(entry) {
        // Registrar medida personalizada
        this.recordRenderTime(entry.name, entry.duration);
    }
    
    /**
     * Procesa una entrada de pintura
     * @param {PerformancePaintTiming} entry - Entrada de pintura
     */
    processPaintEntry(entry) {
        // Registrar tiempo de pintura
        this.recordRenderTime(entry.name, entry.startTime);
    }
    
    /**
     * Limpia métricas antiguas
     */
    cleanupOldMetrics() {
        // Limitar el número de métricas almacenadas
        const maxCount = this.config.maxMetricsCount;
        
        if (this.metrics.apiCalls.length > maxCount) {
            this.metrics.apiCalls = this.metrics.apiCalls.slice(-maxCount);
        }
        
        if (this.metrics.userInteractions.length > maxCount) {
            this.metrics.userInteractions = this.metrics.userInteractions.slice(-maxCount);
        }
        
        if (this.metrics.renderTimes.length > maxCount) {
            this.metrics.renderTimes = this.metrics.renderTimes.slice(-maxCount);
        }
        
        if (this.metrics.memoryUsage.length > maxCount) {
            this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-maxCount);
        }
    }
    
    /**
     * Registra un callback para un evento de rendimiento
     * @param {string} event - Tipo de evento
     * @param {Function} callback - Función de callback
     */
    on(event, callback) {
        if (!this.callbacks[event]) {
            this.callbacks[event] = [];
        }
        
        this.callbacks[event].push(callback);
    }
    
    /**
     * Ejecuta los callbacks para un evento
     * @param {string} event - Tipo de evento
     * @param {Object} data - Datos del evento
     */
    triggerCallback(event, data) {
        if (!this.callbacks[event]) return;
        
        this.callbacks[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error en callback de evento ${event}:`, error);
            }
        });
    }
    
    /**
     * Obtiene un resumen de las métricas de rendimiento
     * @returns {Object} Resumen de métricas
     */
    getMetricsSummary() {
        // Calcular estadísticas de llamadas a la API
        const apiCallStats = this.calculateApiCallStats();
        
        // Calcular estadísticas de renderizado
        const renderStats = this.calculateRenderStats();
        
        // Calcular estadísticas de memoria
        const memoryStats = this.calculateMemoryStats();
        
        // Calcular estadísticas de interacciones del usuario
        const interactionStats = this.calculateInteractionStats();
        
        return {
            pageLoad: this.metrics.pageLoad,
            networkInfo: this.metrics.networkInfo,
            apiCalls: apiCallStats,
            renderTimes: renderStats,
            memoryUsage: memoryStats,
            userInteractions: interactionStats
        };
    }
    
    /**
     * Calcula estadísticas de llamadas a la API
     * @returns {Object} Estadísticas de llamadas a la API
     */
    calculateApiCallStats() {
        if (this.metrics.apiCalls.length === 0) {
            return { count: 0, avgDuration: 0, slowCalls: 0, errorRate: 0 };
        }
        
        const totalDuration = this.metrics.apiCalls.reduce((sum, call) => sum + call.duration, 0);
        const avgDuration = totalDuration / this.metrics.apiCalls.length;
        
        const slowCalls = this.metrics.apiCalls.filter(call => 
            call.duration > this.config.slowResponseThreshold
        ).length;
        
        const errorCalls = this.metrics.apiCalls.filter(call => 
            call.status >= 400
        ).length;
        
        return {
            count: this.metrics.apiCalls.length,
            avgDuration: Math.round(avgDuration),
            slowCalls,
            slowCallRate: Math.round((slowCalls / this.metrics.apiCalls.length) * 100),
            errorCalls,
            errorRate: Math.round((errorCalls / this.metrics.apiCalls.length) * 100)
        };
    }
    
    /**
     * Calcula estadísticas de renderizado
     * @returns {Object} Estadísticas de renderizado
     */
    calculateRenderStats() {
        if (this.metrics.renderTimes.length === 0) {
            return { count: 0, avgDuration: 0, slowRenders: 0 };
        }
        
        const totalDuration = this.metrics.renderTimes.reduce((sum, render) => sum + render.duration, 0);
        const avgDuration = totalDuration / this.metrics.renderTimes.length;
        
        const slowRenders = this.metrics.renderTimes.filter(render => 
            render.duration > 16 // 60fps = 16.67ms por frame
        ).length;
        
        // Agrupar por componente
        const componentStats = {};
        this.metrics.renderTimes.forEach(render => {
            if (!componentStats[render.component]) {
                componentStats[render.component] = {
                    count: 0,
                    totalDuration: 0,
                    avgDuration: 0
                };
            }
            
            componentStats[render.component].count++;
            componentStats[render.component].totalDuration += render.duration;
        });
        
        // Calcular promedio por componente
        Object.keys(componentStats).forEach(component => {
            componentStats[component].avgDuration = Math.round(
                componentStats[component].totalDuration / componentStats[component].count
            );
        });
        
        return {
            count: this.metrics.renderTimes.length,
            avgDuration: Math.round(avgDuration),
            slowRenders,
            slowRenderRate: Math.round((slowRenders / this.metrics.renderTimes.length) * 100),
            components: componentStats
        };
    }
    
    /**
     * Calcula estadísticas de uso de memoria
     * @returns {Object} Estadísticas de memoria
     */
    calculateMemoryStats() {
        if (this.metrics.memoryUsage.length === 0) {
            return { current: 0, peak: 0, trend: 'stable' };
        }
        
        const current = this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1];
        const peak = this.metrics.memoryUsage.reduce((max, usage) => 
            usage.used > max.used ? usage : max
        , current);
        
        // Calcular tendencia
        let trend = 'stable';
        if (this.metrics.memoryUsage.length >= 5) {
            const recent = this.metrics.memoryUsage.slice(-5);
            const first = recent[0].used;
            const last = recent[recent.length - 1].used;
            const change = (last - first) / first;
            
            if (change > 0.1) {
                trend = 'increasing';
            } else if (change < -0.1) {
                trend = 'decreasing';
            }
        }
        
        return {
            current: {
                used: current.used,
                total: current.total,
                percentage: Math.round((current.used / current.total) * 100)
            },
            peak: {
                used: peak.used,
                total: peak.total,
                percentage: Math.round((peak.used / peak.total) * 100)
            },
            trend
        };
    }
    
    /**
     * Calcula estadísticas de interacciones del usuario
     * @returns {Object} Estadísticas de interacciones
     */
    calculateInteractionStats() {
        if (this.metrics.userInteractions.length === 0) {
            return { count: 0, types: {} };
        }
        
        // Contar tipos de interacciones
        const types = {};
        this.metrics.userInteractions.forEach(interaction => {
            if (!types[interaction.type]) {
                types[interaction.type] = 0;
            }
            types[interaction.type]++;
        });
        
        return {
            count: this.metrics.userInteractions.length,
            types
        };
    }
    
    /**
     * Genera un informe de rendimiento
     * @returns {string} Informe de rendimiento en formato HTML
     */
    generatePerformanceReport() {
        const summary = this.getMetricsSummary();
        
        return `
            <div class="performance-report">
                <h2>Informe de Rendimiento</h2>
                
                <h3>Carga de Página</h3>
                <p>Duración: ${Math.round(summary.pageLoad.duration)}ms</p>
                
                <h3>Información de Red</h3>
                <p>Tipo: ${summary.networkInfo.effectiveType || 'Desconocido'}</p>
                <p>Ancho de banda: ${summary.networkInfo.downlink || 'Desconocido'} Mbps</p>
                
                <h3>Llamadas a la API</h3>
                <p>Total: ${summary.apiCalls.count}</p>
                <p>Duración promedio: ${summary.apiCalls.avgDuration}ms</p>
                <p>Tasa de error: ${summary.apiCalls.errorRate}%</p>
                
                <h3>Renderizado</h3>
                <p>Total: ${summary.renderTimes.count}</p>
                <p>Duración promedio: ${summary.renderTimes.avgDuration}ms</p>
                <p>Tasa de renderizado lento: ${summary.renderTimes.slowRenderRate}%</p>
                
                <h3>Uso de Memoria</h3>
                <p>Actual: ${summary.memoryUsage.current.percentage}%</p>
                <p>Pico: ${summary.memoryUsage.peak.percentage}%</p>
                <p>Tendencia: ${summary.memoryUsage.trend}</p>
                
                <h3>Interacciones del Usuario</h3>
                <p>Total: ${summary.userInteractions.count}</p>
            </div>
        `;
    }
    
    /**
     * Reinicia todas las métricas
     */
    resetMetrics() {
        this.metrics = {
            pageLoad: {
                startTime: performance.now(),
                endTime: 0,
                duration: 0
            },
            apiCalls: [],
            userInteractions: [],
            renderTimes: [],
            memoryUsage: [],
            networkInfo: this.metrics.networkInfo
        };
    }
    
    /**
     * Detiene el monitor de rendimiento
     */
    stop() {
        // Desconectar observadores
        if (this.observers.performance) {
            this.observers.performance.disconnect();
        }
        
        if (this.observers.mutation) {
            this.observers.mutation.disconnect();
        }
        
        if (this.observers.resize) {
            this.observers.resize.disconnect();
        }
        
        this.isInitialized = false;
    }
}

// Crear instancia global del monitor de rendimiento
const performanceMonitor = new PerformanceMonitor();

export default performanceMonitor;