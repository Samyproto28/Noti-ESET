// Middleware para monitorear el rendimiento de las solicitudes

// Configuración de umbrales de rendimiento
const PERFORMANCE_THRESHOLDS = {
  SLOW_REQUEST_MS: 1000, // Solicitudes lentas > 1s
  VERY_SLOW_REQUEST_MS: 3000, // Solicitudes muy lentas > 3s
  LARGE_RESPONSE_BYTES: 1024 * 100, // Respuestas grandes > 100KB
};

// Estadísticas globales
const performanceStats = {
  totalRequests: 0,
  slowRequests: 0,
  verySlowRequests: 0,
  averageResponseTime: 0,
  totalResponseTime: 0,
  endpoints: {},
};

// Función para registrar métricas de rendimiento
function logPerformanceMetrics(req, res, responseTime) {
  const endpoint = `${req.method} ${req.route?.path || req.path}`;
  const responseSize = res.get('Content-Length') ? parseInt(res.get('Content-Length')) : 0;
  
  // Actualizar estadísticas globales
  performanceStats.totalRequests++;
  performanceStats.totalResponseTime += responseTime;
  performanceStats.averageResponseTime = performanceStats.totalResponseTime / performanceStats.totalRequests;
  
  // Registrar si es una solicitud lenta
  if (responseTime > PERFORMANCE_THRESHOLDS.VERY_SLOW_REQUEST_MS) {
    performanceStats.verySlowRequests++;
    console.warn(`🐌 MUY LENTO: ${endpoint} - ${responseTime}ms`);
  } else if (responseTime > PERFORMANCE_THRESHOLDS.SLOW_REQUEST_MS) {
    performanceStats.slowRequests++;
    console.warn(`⚠️ LENTO: ${endpoint} - ${responseTime}ms`);
  }
  
  // Actualizar estadísticas del endpoint
  if (!performanceStats.endpoints[endpoint]) {
    performanceStats.endpoints[endpoint] = {
      count: 0,
      totalTime: 0,
      averageTime: 0,
      maxTime: 0,
      minTime: Infinity,
    };
  }
  
  const endpointStats = performanceStats.endpoints[endpoint];
  endpointStats.count++;
  endpointStats.totalTime += responseTime;
  endpointStats.averageTime = endpointStats.totalTime / endpointStats.count;
  endpointStats.maxTime = Math.max(endpointStats.maxTime, responseTime);
  endpointStats.minTime = Math.min(endpointStats.minTime, responseTime);
  
  // Registrar en consola si es una respuesta grande
  if (responseSize > PERFORMANCE_THRESHOLDS.LARGE_RESPONSE_BYTES) {
    console.warn(`📦 RESPUESTA GRANDE: ${endpoint} - ${(responseSize / 1024).toFixed(2)}KB`);
  }
  
  // Registrar estadísticas cada 50 solicitudes
  if (performanceStats.totalRequests % 50 === 0) {
    console.log('📊 Estadísticas de rendimiento:', {
      total: performanceStats.totalRequests,
      average: `${performanceStats.averageResponseTime.toFixed(2)}ms`,
      slow: performanceStats.slowRequests,
      verySlow: performanceStats.verySlowRequests,
      slowPercentage: `${((performanceStats.slowRequests / performanceStats.totalRequests) * 100).toFixed(2)}%`,
    });
  }
}

// Middleware de monitoreo de rendimiento
export function performanceMiddleware(req, res, next) {
  // Registrar tiempo de inicio
  const startTime = Date.now();
  
  // Capturar el método original de res.end para medir el tiempo de respuesta
  const originalEnd = res.end;
  res.end = function(...args) {
    // Calcular tiempo de respuesta
    const responseTime = Date.now() - startTime;
    
    // Registrar métricas
    logPerformanceMetrics(req, res, responseTime);
    
    // Añadir headers de rendimiento
    res.set('X-Response-Time', `${responseTime}ms`);
    
    // Llamar al método original
    originalEnd.apply(this, args);
  };
  
  // Continuar con la siguiente función en la cadena de middleware
  next();
}

// Función para obtener estadísticas de rendimiento
export function getPerformanceStats() {
  return { ...performanceStats };
}

// Función para resetear estadísticas
export function resetPerformanceStats() {
  performanceStats.totalRequests = 0;
  performanceStats.slowRequests = 0;
  performanceStats.verySlowRequests = 0;
  performanceStats.averageResponseTime = 0;
  performanceStats.totalResponseTime = 0;
  performanceStats.endpoints = {};
}