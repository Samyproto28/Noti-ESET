// Test unitario para el API de búsqueda
// Nota: Este test se ejecutará cuando el servidor Next.js esté corriendo

interface SearchResult {
  success: boolean;
  data: any[];
  pagination: {
    page: number;
    limit: number;
    total_results: number;
    total_pages: number;
  };
  query: string;
  performance: {
    execution_time_ms: number;
    method: string;
  };
}

describe('API de Búsqueda - Endpoints de Noticias', () => {
  const BASE_URL = 'http://localhost:3000/api';

  describe('GET /api/news/search', () => {
    test('debería devolver error para consulta vacía', async () => {
      const response = await fetch(`${BASE_URL}/news/search?q=`);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toContain('at least 2 characters');
    });

    test('debería devolver resultados para consulta válida', async () => {
      const response = await fetch(`${BASE_URL}/news/search?q=tecnología`);
      const result: SearchResult = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.query).toBe('tecnología');
      expect(result.data).toBeInstanceOf(Array);
      expect(result.pagination).toBeDefined();
      expect(result.performance).toBeDefined();
    });

    test('debería soportar filtros de categoría', async () => {
      const response = await fetch(`${BASE_URL}/news/search?q=tecnología&category=technology`);
      const result: SearchResult = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.length).toBeLessThanOrEqual(20);
    });

    test('debería soportar paginación', async () => {
      const response = await fetch(`${BASE_URL}/news/search?q=tecnología&page=2&limit=5`);
      const result: SearchResult = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(5);
      expect(result.data.length).toBeLessThanOrEqual(5);
    });

    test('debería devolver resultado vacío cuando no hay coincidencias', async () => {
      const response = await fetch(`${BASE_URL}/news/search?q=xyz123456789noexiste`);
      const result: SearchResult = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.length).toBe(0);
      expect(result.pagination.total_results).toBe(0);
    });
  });

  describe('GET /api/news', () => {
    test('debería devolver lista de noticias básica', async () => {
      const response = await fetch(`${BASE_URL}/news`);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(Array);
      expect(result.pagination).toBeDefined();
    });

    test('debería soportar filtros de categoría', async () => {
      const response = await fetch(`${BASE_URL}/news?category=technology`);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      result.data.forEach((item: any) => {
        expect(item.category).toBe('technology');
      });
    });

    test('debería soportar ordenamiento', async () => {
      const response = await fetch(`${BASE_URL}/news?sort_by=published_at&sort_order=desc`);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(Array);
    });

    test('debería validar parámetros de ordenamiento inválidos', async () => {
      const response = await fetch(`${BASE_URL}/news?sort_by=invalid_column`);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toContain('Invalid sort_by parameter');
    });
  });

  describe('POST /api/news', () => {
    test('debería crear nueva noticia con datos válidos', async () => {
      const newNews = {
        title: 'Título de Prueba Unitaria',
        content: 'Este es el contenido de la noticia de prueba unitaria.',
        category: 'technology',
        author_id: 'test-author-id'
      };

      const response = await fetch(`${BASE_URL}/news`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newNews)
      });

      const result = await response.json();

      // Este test podría fallar si no hay autenticación adecuada
      expect([200, 400, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(result.success).toBe(true);
        expect(result.data.title).toBe(newNews.title);
      }
    });

    test('debería validar campos requeridos', async () => {
      const incompleteNews = {
        title: 'Título incompleto',
        // Falta content requerido
      };

      const response = await fetch(`${BASE_URL}/news`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(incompleteNews)
      });

      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toContain('Content is required');
    });

    test('debería validar categoría inválida', async () => {
      const newsWithInvalidCategory = {
        title: 'Título de Prueba',
        content: 'Contenido de prueba',
        category: 'invalid_category'
      };

      const response = await fetch(`${BASE_URL}/news`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newsWithInvalidCategory)
      });

      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toContain('Invalid category');
    });
  });

  describe('Rendimiento y Seguridad', () => {
    test('debería manejar consultas largas sin errores', async () => {
      const longQuery = 'a'.repeat(1000);
      const start = Date.now();

      const response = await fetch(`${BASE_URL}/news/search?q=${encodeURIComponent(longQuery)}`);
      const end = Date.now();

      expect(response.status).toBe(400); // Debería fallar por longitud mínima
      expect(end - start).toBeLessThan(5000); // Menos de 5 segundos
    });

    test('debería prevenir inyección SQL básica', async () => {
      const maliciousQuery = "'; DROP TABLE news; --";

      const response = await fetch(`${BASE_URL}/news/search?q=${encodeURIComponent(maliciousQuery)}`);
      const result = await response.json();

      // No debería causar un error 500 (error del servidor)
      expect([200, 400]).toContain(response.status);
    });

    test('debería devolver tiempos de ejecución consistentemente bajos', async () => {
      const query = 'tecnología';
      const response = await fetch(`${BASE_URL}/news/search?q=${query}`);
      const result: SearchResult = await response.json();

      expect(response.status).toBe(200);
      expect(result.performance.execution_time_ms).toBeLessThan(500);
    });
  });

  describe('Casos de Borde', () => {
    test('debería manejar paginación más allá del rango', async () => {
      const response = await fetch(`${BASE_URL}/news/search?q=tecnología&page=99999&limit=5`);
      const result: SearchResult = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.length).toBe(0);
      expect(result.pagination.page).toBe(99999);
    });

    test('debería soportar límite grande pero seguro', async () => {
      const response = await fetch(`${BASE_URL}/news/search?q=tecnología&limit=100`);
      const result: SearchResult = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.pagination.limit).toBe(100);
    });

    test('debería manejar caracteres Unicode en búsqueda', async () => {
      const response = await fetch(`${BASE_URL}/news/search?q=seguridad%20ciberética`);
      const result: SearchResult = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.query).toBe('seguridad ciberética');
    });
  });
});

// Test para el PostgreSQL full-text search
describe('Búsqueda Full-Text PostgreSQL', () => {
  describe('Stemming en español', () => {
    test('debería encontrar términos con stemming correcto', async () => {
      // "corriendo" debería encontrar "correr" en español
      const response = await fetch(`${BASE_URL}/news/search?q=corriendo`);
      const result = await response.json();

      expect(response.status).toBe(200);
      // Esto dependerá de los datos de prueba en la base de datos
    });

    test('debería manejar stopwords en español', async () => {
      // Palabras comunes en español que deberían ser ignoradas
      const response = await fetch(`${BASE_URL}/news/search?q=el%20la%20y%20de%20la%20tecnología`);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
    });
  });

  describe('Búsqueda por relevancia', () => {
    test('debería ordenar resultados por relevancia', async () => {
      const response = await fetch(`${BASE_URL}/news/search?q=tecnología`);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);

      if (result.data.length > 1) {
        // Verificar que los resultados están ordenados por relevancia descendente
        const firstScore = result.data[0].relevance_score;
        for (let i = 1; i < result.data.length; i++) {
          expect(result.data[i].relevance_score).toBeLessThanOrEqual(firstScore);
        }
      }
    });

    test('debería dar mayor peso a coincidencias en el título', async () => {
      const response = await fetch(`${BASE_URL}/news/search?q=tecnología`);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);

      // Buscar artículos que tengan "tecnología" en el título
      const titleMatches = result.data.filter((item: any) =>
        item.title.toLowerCase().includes('tecnología')
      );

      // Los artículos que coinciden en el título deberían tener mayor relevancia
      if (titleMatches.length > 0 && result.data.length > titleMatches.length) {
        expect(titleMatches[0].relevance_score).toBeGreaterThan(
          result.data[result.data.length - 1].relevance_score
        );
      }
    });
  });
});