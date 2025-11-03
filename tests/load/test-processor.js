// Procesador de pruebas para Artillery
module.exports = {
  // Función para generar datos aleatorios
  randomString(length = 10) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  },

  // Función para generar un UUID válido
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },

  // Función para generar un título de post aleatorio
  generatePostTitle() {
    const prefixes = ['Cómo', 'Por qué', 'Qué es', 'Dónde encontrar', 'Cuándo usar'];
    const subjects = ['JavaScript', 'React', 'Node.js', 'Python', 'Docker', 'Kubernetes', 'AWS', 'Testing'];
    const suffixes = ['en 2023', 'para principiantes', 'avanzado', 'mejores prácticas', 'tutorial completo'];
    
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const subject = subjects[Math.floor(Math.random() * subjects.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    
    return `${prefix} ${subject} ${suffix}`;
  },

  // Función para generar contenido de post aleatorio
  generatePostContent() {
    const sentences = [
      'Este es un post de prueba para evaluar el rendimiento del sistema.',
      'El contenido generado automáticamente ayuda a simular cargas de trabajo realistas.',
      'Las pruebas de carga son fundamentales para garantizar la escalabilidad de la aplicación.',
      'Es importante medir los tiempos de respuesta bajo diferentes condiciones de carga.',
      'La optimización del rendimiento es un proceso continuo que requiere monitoreo constante.',
      'Las herramientas de pruebas de carga como Artillery permiten simular múltiples usuarios simultáneos.',
      'El análisis de los resultados de las pruebas de carga ayuda a identificar cuellos de botella.',
      'La implementación de caché puede mejorar significativamente el rendimiento de la aplicación.',
      'El balanceo de carga es una técnica importante para distribuir el tráfico de manera eficiente.',
      'La monitorización en tiempo real permite detectar problemas de rendimiento de forma proactiva.'
    ];
    
    const content = [];
    const numSentences = Math.floor(Math.random() * 5) + 5; // Entre 5 y 10 oraciones
    
    for (let i = 0; i < numSentences; i++) {
      const randomIndex = Math.floor(Math.random() * sentences.length);
      content.push(sentences[randomIndex]);
    }
    
    return content.join(' ');
  },

  // Función para generar contenido de comentario aleatorio
  generateCommentContent() {
    const comments = [
      'Excelente post, muy informativo.',
      'Gracias por compartir esta información.',
      'Tengo una pregunta sobre este tema.',
      'Estoy de acuerdo con lo que se menciona en el post.',
      '¿Podrías proporcionar más detalles sobre este punto?',
      'Esta información me fue muy útil.',
      'Interesante perspectiva, no había considerado este enfoque.',
      '¿Hay alguna documentación adicional sobre este tema?',
      'Me gustaría saber más sobre las mejores prácticas mencionadas.',
      'Gran explicación, todo quedó muy claro.'
    ];
    
    return comments[Math.floor(Math.random() * comments.length)];
  },

  // Función para generar un tipo de reacción aleatorio
  generateReactionType() {
    const reactions = ['like', 'dislike', 'love', 'laugh', 'wow', 'angry', 'sad'];
    return reactions[Math.floor(Math.random() * reactions.length)];
  },

  // Función para generar un término de búsqueda aleatorio
  generateSearchTerm() {
    const terms = [
      'JavaScript', 'React', 'Node.js', 'Python', 'Docker', 'Kubernetes', 
      'AWS', 'Testing', 'Performance', 'Security', 'Database', 'API',
      'Frontend', 'Backend', 'DevOps', 'CI/CD', 'Microservices', 'Architecture'
    ];
    
    return terms[Math.floor(Math.random() * terms.length)];
  },

  // Función para generar un ID de categoría aleatorio
  generateCategoryId() {
    const categories = [
      '123e4567-e89b-12d3-a456-426614174000', // General
      '123e4567-e89b-12d3-a456-426614174001', // Technical
      '123e4567-e89b-12d3-a456-426614174002', // News
      '123e4567-e89b-12d3-a456-426614174003', // Discussion
      '123e4567-e89b-12d3-a456-426614174004'  // Help
    ];
    
    return categories[Math.floor(Math.random() * categories.length)];
  }
};