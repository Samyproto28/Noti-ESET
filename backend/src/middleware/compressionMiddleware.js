import compression from 'compression';

// Configuración de compresión optimizada para el foro
const compressionOptions = {
  // Nivel de compresión (1-9, donde 9 es máxima compresión pero más lento)
  level: 6,
  
  // Umbral en bytes para comprimir respuestas
  threshold: 1024, // Solo comprimir respuestas mayores a 1KB
  
  // Tipos de contenido que se deben comprimir
  filter: (req, res) => {
    if (res.getHeader('Content-Type')) {
      const contentType = res.getHeader('Content-Type');
      
      // No comprimir imágenes ya comprimidas
      if (contentType.includes('image/')) {
        return false;
      }
      
      // Comprimir respuestas JSON, HTML, CSS y JS
      return /json|text|javascript|css/.test(contentType);
    }
    
    // Por defecto, decidir según el tipo de contenido
    return compression.filter(req, res);
  },
  
  // Estrategia de compresión
  strategy: 1, // Estrategia por defecto, buen balance entre velocidad y compresión
};

// Middleware de compresión configurado
const compressMiddleware = compression(compressionOptions);

export default compressMiddleware;