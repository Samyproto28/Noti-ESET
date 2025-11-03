# Sistema de Pruebas - Foro ESET

Este documento describe el sistema de pruebas implementado para el Foro ESET, incluyendo los diferentes tipos de pruebas, cómo ejecutarlas y cómo interpretar los resultados.

## Tabla de Contenidos

1. [Tipos de Pruebas](#tipos-de-pruebas)
2. [Estructura de Pruebas](#estructura-de-pruebas)
3. [Ejecución de Pruebas](#ejecución-de-pruebas)
4. [Pruebas Unitarias](#pruebas-unitarias)
5. [Pruebas de Integración](#pruebas-de-integración)
6. [Pruebas End-to-End](#pruebas-end-to-end)
7. [Pruebas de Rendimiento](#pruebas-de-rendimiento)
8. [Pruebas de Carga](#pruebas-de-carga)
9. [Pruebas de Accesibilidad](#pruebas-de-accesibilidad)
10. [Reportes](#reportes)
11. [Integración Continua](#integración-continua)
12. [Buenas Prácticas](#buenas-prácticas)

## Tipos de Pruebas

El sistema de pruebas del Foro ESET incluye los siguientes tipos de pruebas:

- **Pruebas Unitarias**: Verifican el funcionamiento de componentes individuales de forma aislada.
- **Pruebas de Integración**: Verifican la interacción entre diferentes componentes y servicios.
- **Pruebas End-to-End (E2E)**: Verifican el flujo completo de la aplicación desde la perspectiva del usuario.
- **Pruebas de Rendimiento**: Verifican que la aplicación responde dentro de los tiempos esperados.
- **Pruebas de Carga**: Verifican el comportamiento de la aplicación bajo alta demanda.
- **Pruebas de Accesibilidad**: Verifican que la aplicación es accesible para personas con discapacidades.

## Estructura de Pruebas

```
Noti-ESET-main/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── validators/
│   │   └── ...
│   └── tests/
│       ├── unit/
│       │   ├── controllers/
│       │   ├── services/
│       │   └── validators/
│       └── integration/
├── frontend/
│   └── cypress/
│       ├── e2e/
│       ├── support/
│       └── ...
├── tests/
│   └── load/
├── scripts/
│   ├── run-tests.js
│   └── generate-test-report.js
└── .github/
    └── workflows/
```

## Ejecución de Pruebas

### Ejecutar Todas las Pruebas

```bash
npm test
```

### Ejecutar Tipos Específicos de Pruebas

```bash
# Pruebas unitarias
npm run test:unit

# Pruebas de integración
npm run test:integration

# Pruebas end-to-end
npm run test:e2e

# Pruebas de rendimiento
npm run test:performance

# Pruebas de carga
npm run test:load

# Pruebas de accesibilidad
npm run test:accessibility

# Pruebas con cobertura
npm run test:coverage
```

### Ejecutar Pruebas del Backend

```bash
# Todas las pruebas del backend
npm run test:backend

# Pruebas unitarias del backend
npm run test:backend:unit

# Pruebas de integración del backend
npm run test:backend:integration

# Pruebas con cobertura del backend
npm run test:backend:coverage
```

### Ejecutar Pruebas de Cypress

```bash
# Abrir Cypress en modo interactivo
npm run test:cypress:open

# Ejecutar Cypress en modo headless
npm run test:cypress:headless

# Ejecutar pruebas de rendimiento con Cypress
npm run test:cypress:performance

# Ejecutar pruebas de accesibilidad con Cypress
npm run test:cypress:accessibility
```

### Ejecutar Pruebas de Carga con Artillery

```bash
# Ejecutar pruebas de carga
npm run test:artillery

# Ejecutar pruebas de carga con reporte
npm run test:artillery:report
```

## Pruebas Unitarias

Las pruebas unitarias verifican el funcionamiento de componentes individuales de forma aislada. Para el backend, utilizamos Jest y para el frontend, utilizamos Cypress Component Testing.

### Ejemplo de Prueba Unitaria del Backend

```javascript
// backend/tests/unit/services/forumService.test.js
import { getAllPosts } from '../../../src/services/forumService.js';
import { jest } from '@jest/globals';

describe('ForumService', () => {
  it('should get all posts', async () => {
    const mockPosts = [
      { id: '1', title: 'Test Post 1' },
      { id: '2', title: 'Test Post 2' }
    ];

    // Mock de la base de datos
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          range: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: mockPosts, error: null })
          })
        })
      })
    });

    const result = await getAllPosts();

    expect(result.data).toEqual(mockPosts);
    expect(result.error).toBeNull();
  });
});
```

## Pruebas de Integración

Las pruebas de integración verifican la interacción entre diferentes componentes y servicios. Para el backend, utilizamos Jest y Supertest.

### Ejemplo de Prueba de Integración del Backend

```javascript
// backend/tests/integration/forum.api.test.js
import request from 'supertest';
import express from 'express';

describe('Forum API Integration Tests', () => {
  it('should get posts with default parameters', async () => {
    const mockPosts = [
      { id: '1', title: 'Test Post 1' },
      { id: '2', title: 'Test Post 2' }
    ];

    // Mock de la base de datos
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          range: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: mockPosts, error: null })
          })
        })
      })
    });

    const response = await request(app)
      .get('/api/forum/posts')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(mockPosts);
  });
});
```

## Pruebas End-to-End

Las pruebas end-to-end verifican el flujo completo de la aplicación desde la perspectiva del usuario. Utilizamos Cypress para estas pruebas.

### Ejemplo de Prueba End-to-End

```javascript
// cypress/e2e/foro-crear-tema.cy.js
describe('Creación de Temas en el Foro', () => {
  beforeEach(() => {
    cy.visit('/#foro');
    cy.get('#foro h2').should('contain', 'Foro de Noticias');
  });

  it('debería crear un nuevo tema', () => {
    cy.get('#btn-crear-tema').click();
    cy.get('#form-crear-tema').should('be.visible');
    
    cy.get('#titulo-tema').type('Tema de prueba');
    cy.get('#contenido-tema').type('Contenido del tema de prueba');
    cy.get('#categoria-tema').select('General');
    
    cy.get('#form-crear-tema button[type="submit"]').click();
    cy.verificarMensajeExito('Tema creado exitosamente');
    
    cy.get('.tema').should('contain', 'Tema de prueba');
  });
});
```

## Pruebas de Rendimiento

Las pruebas de rendimiento verifican que la aplicación responde dentro de los tiempos esperados. Utilizamos Cypress para estas pruebas.

### Ejemplo de Prueba de Rendimiento

```javascript
// cypress/e2e/foro-rendimiento.cy.js
describe('Pruebas de Rendimiento del Foro', () => {
  it('debería cargar la página del foro en un tiempo aceptable', () => {
    cy.visit('/#foro');
    
    // Medir el tiempo de carga de la página
    cy.window().then((win) => {
      const performance = win.performance;
      const timing = performance.timing;
      const loadTime = timing.loadEventEnd - timing.navigationStart;
      
      // Verificar que la página carga en menos de 3 segundos
      expect(loadTime).to.be.lessThan(3000);
    });
  });
});
```

## Pruebas de Carga

Las pruebas de carga verifican el comportamiento de la aplicación bajo alta demanda. Utilizamos Artillery para estas pruebas.

### Ejemplo de Prueba de Carga

```yaml
# tests/load/foro-load-test.yml
config:
  target: 'http://localhost:4000'
  phases:
    - duration: 60
      arrivalRate: 5
      name: "Warm up"
    - duration: 120
      arrivalRate: 10
      name: "Ramp up load"

scenarios:
  - name: "Cargar posts del foro"
    weight: 40
    flow:
      - get:
          url: "/api/forum/posts"
      - think: 2
```

## Pruebas de Accesibilidad

Las pruebas de accesibilidad verifican que la aplicación es accesible para personas con discapacidades. Utilizamos Cypress para estas pruebas.

### Ejemplo de Prueba de Accesibilidad

```javascript
// cypress/e2e/foro-accesibilidad-responsivo.cy.js
describe('Accesibilidad del Foro', () => {
  it('debería tener atributos ARIA en los elementos interactivos', () => {
    cy.visit('/#foro');
    
    // Verificar que los botones tienen atributos aria-label
    cy.get('button[aria-label]').should('have.length.greaterThan', 0);
    
    // Verificar que los campos de formulario tienen atributos aria-label
    cy.get('input[aria-label], textarea[aria-label], select[aria-label]').should('have.length.greaterThan', 0);
  });
});
```

## Reportes

El sistema de pruebas genera reportes en diferentes formatos:

- **Reportes HTML**: Reportes interactivos con gráficos y estadísticas.
- **Reportes JSON**: Reportes en formato JSON para procesamiento automático.
- **Reportes de Cobertura**: Reportes que muestran el porcentaje de código cubierto por las pruebas.

### Generar Reportes

```bash
# Generar reporte de todas las pruebas
npm run report

# Generar reporte de pruebas de carga
npm run test:artillery:report
```

## Integración Continua

El sistema de pruebas está integrado con GitHub Actions para ejecutar automáticamente las pruebas en cada push y pull request.

### Flujo de Integración Continua

1. **Pruebas Unitarias**: Se ejecutan en múltiples versiones de Node.js.
2. **Pruebas de Integración**: Se ejecutan con una base de datos de prueba.
3. **Pruebas End-to-End**: Se ejecutan en un entorno de prueba completo.
4. **Pruebas de Rendimiento**: Se ejecutan para verificar el rendimiento de la aplicación.
5. **Pruebas de Carga**: Se ejecutan para verificar el comportamiento bajo alta demanda.
6. **Pruebas de Accesibilidad**: Se ejecutan para verificar la accesibilidad de la aplicación.
7. **Generación de Reportes**: Se generan reportes y se publican como artefactos.

## Buenas Prácticas

### Pruebas Unitarias

- Las pruebas unitarias deben ser rápidas y independientes.
- Cada prueba debe verificar un solo comportamiento.
- Utilizar mocks para aislar el componente bajo prueba.
- Las pruebas deben tener un nombre descriptivo.

### Pruebas de Integración

- Las pruebas de integración deben verificar la interacción entre componentes.
- Utilizar una base de datos de prueba para evitar afectar los datos de producción.
- Limpiar los datos de prueba después de cada prueba.

### Pruebas End-to-End

- Las pruebas end-to-end deben verificar flujos completos de usuario.
- Utilizar selectores CSS estables que no cambien con frecuencia.
- Esperar a que los elementos estén visibles antes de interactuar con ellos.

### Pruebas de Rendimiento

- Definir umbrales de rendimiento aceptables.
- Ejecutar pruebas en diferentes dispositivos y condiciones de red.
- Monitorizar el rendimiento de la aplicación en producción.

### Pruebas de Carga

- Simular condiciones de carga realistas.
- Gradualmente aumentar la carga para identificar puntos de ruptura.
- Analizar los resultados para identificar cuellos de botella.

### Pruebas de Accesibilidad

- Verificar el cumplimiento de las pautas WCAG.
- Utilizar herramientas de automatización para detectar problemas comunes.
- Realizar pruebas manuales con usuarios reales si es posible.

## Conclusión

El sistema de pruebas del Foro ESET está diseñado para garantizar la calidad y fiabilidad de la aplicación. Al ejecutar regularmente las pruebas y analizar los resultados, podemos identificar y corregir problemas antes de que afecten a los usuarios.

Para más información sobre cómo ejecutar o contribuir a las pruebas, consulte la documentación específica de cada tipo de prueba o contacte al equipo de desarrollo.