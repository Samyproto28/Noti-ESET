# Pruebas del Backend - Noti-ESET

## Estructura de Pruebas

```
tests/
├── setup/testSetup.js         # Configuración global de pruebas
├── unit/
│   ├── services/
│   │   ├── forumService.test.js           # Pruebas existentes del servicio del foro
│   │   ├── forumService.enhanced.test.js  # Pruebas mejoradas del servicio del foro
│   │   └── authService.test.js            # Pruebas del servicio de autenticación
├── integration/
│   ├── forum.api.test.js                  # Pruebas existentes de la API del foro
│   └── api.enhanced.test.js             # Pruebas mejoradas de la API
└── README.md                             # Este archivo
```

## Ejecutar Pruebas

### Instalar Dependencias
```bash
npm install
```

### Ejecutar Todas las Pruebas
```bash
npm test
```

### Ejecutar Pruebas en Modo Watch
```bash
npm run test:watch
```

### Ejecutar Pruebas con Cobertura
```bash
npm run test:coverage
```

### Ejecutar Script de Análisis TDD
```bash
node test-runner.js
```

## Pruebas Implementadas

### 1. Pruebas Unitarias de Servicios

#### forumService.test.js (Existente)
- ✅ getAllPosts con parámetros por defecto
- ✅ getAllPosts con filtro de categoría
- ✅ Manejo de errores en getAllPosts
- ✅ getPostById
- ✅ Manejo de errores en getPostById
- ✅ validatePostData con datos válidos
- ✅ validatePostData con título corto
- ✅ validatePostData con título largo
- ✅ validatePostData con contenido corto
- ✅ validatePostData con contenido largo
- ✅ validatePostData con ID de categoría inválido
- ✅ createPost con datos válidos
- ✅ createPost con datos inválidos
- ✅ updatePost con datos válidos
- ✅ updatePost con título inválido
- ✅ deletePost con ID válido
- ✅ deletePost con ID inválido
- ✅ incrementPostViews con ID válido
- ✅ incrementPostViews con ID inválido
- ✅ getCommentsByPost
- ✅ Manejo de errores en getCommentsByPost
- ✅ validateCommentData con datos válidos
- ✅ validateCommentData con contenido vacío
- ✅ validateCommentData con contenido largo
- ✅ createComment con datos válidos
- ✅ createComment con datos inválidos
- ✅ updateComment con datos válidos
- ✅ updateComment con ID inválido
- ✅ deleteComment con ID válido
- ✅ deleteComment con ID inválido
- ✅ searchPosts con término válido
- ✅ searchPosts con término corto
- ✅ countPosts
- ✅ countCommentsByPost
- ✅ countCommentsByPost con ID inválido
- ✅ getPopularPosts
- ✅ getPopularPosts con parámetros personalizados

#### forumService.enhanced.test.js (Mejorado)
- ✅ Validación de límites en getAllPosts
- ✅ Manejo de offset negativo en getAllPosts
- ✅ Validación de sortBy inválido en getAllPosts
- ⚠️ **FALLA**: validatePostData rechaza título con script (XSS)
- ⚠️ **FALLA**: validatePostData rechaza título con javascript:
- ⚠️ **FALLA**: validatePostData rechaza título con onclick
- ⚠️ **FALLA**: validatePostData rechaza contenido con script
- ⚠️ **FALLA**: validatePostData rechaza contenido con javascript:
- ⚠️ **FALLA**: validatePostData rechaza contenido con onclick
- ⚠️ **FALLA**: validateCommentData rechaza comentario con script
- ⚠️ **FALLA**: validateCommentData rechaza comentario con javascript:
- ⚠️ **FALLA**: validateCommentData rechaza comentario con onclick
- ✅ Sanitización de título y contenido en createPost
- ✅ Manejo de user_id faltante en createPost
- ✅ Sanitización de término de búsqueda en searchPosts
- ✅ Rechazo de término de búsqueda corto
- ✅ Rechazo de término de búsqueda vacío
- ⚠️ **FALLA**: Detección de función duplicada getRepliesByComment
- ✅ Manejo de errores de base de datos en countPosts
- ✅ Manejo de filtro de categoría en countPosts
- ✅ Validación de timeRange en getPopularPosts
- ✅ Manejo de límite en getPopularPosts

#### authService.test.js (Nuevo)
- ✅ Rechazo de email inválido en registro
- ✅ Rechazo de contraseña corta en registro
- ✅ Rechazo de contraseña sin mayúsculas en registro
- ✅ Rechazo de contraseña sin minúsculas en registro
- ✅ Rechazo de contraseña sin números en registro
- ✅ Rechazo de contraseña sin caracteres especiales en registro
- ✅ Aceptación de datos válidos en registro
- ✅ Manejo de errores de Supabase en registro
- ✅ Rechazo de email inválido en login
- ✅ Rechazo de contraseña vacía en login
- ✅ Manejo de credenciales inválidas en login
- ✅ Generación de token JWT en login exitoso
- ✅ Rechazo de token vacío en verificación
- ✅ Rechazo de token nulo en verificación
- ✅ Rechazo de token inválido en verificación
- ✅ Aceptación de token válido en verificación
- ✅ Rechazo de token vacío en refresco
- ✅ Rechazo de token inválido en refresco
- ✅ Generación de nuevo token en refresco
- ⚠️ **FALLA**: Prevención de inyección SQL en email
- ⚠️ **FALLA**: Prevención de XSS en email
- ⚠️ **FALLA**: Manejo de contraseña muy larga

### 2. Pruebas de Integración de API

#### forum.api.test.js (Existente)
- ✅ GET /api/forum/posts con parámetros por defecto
- ✅ GET /api/forum/posts con parámetros de consulta
- ✅ Manejo de errores de base de datos en GET /api/forum/posts
- ✅ GET /api/forum/posts/:id
- ✅ Manejo de post no encontrado en GET /api/forum/posts/:id
- ✅ Manejo de ID inválido en GET /api/forum/posts/:id
- ✅ POST /api/forum/posts con datos válidos
- ✅ POST /api/forum/posts con título corto
- ✅ POST /api/forum/posts con contenido corto
- ✅ POST /api/forum/posts con ID de categoría inválido
- ✅ PUT /api/forum/posts/:id con datos válidos
- ✅ PUT /api/forum/posts/:id con ID inválido
- ✅ DELETE /api/forum/posts/:id con ID válido
- ✅ DELETE /api/forum/posts/:id con ID inválido
- ✅ GET /api/forum/posts/:post_id/comments
- ✅ Manejo de ID de post inválido en GET /api/forum/posts/:post_id/comments
- ✅ POST /api/forum/posts/:post_id/comments con datos válidos
- ✅ POST /api/forum/posts/:post_id/comments con contenido vacío
- ✅ POST /api/forum/posts/:post_id/comments con ID de post inválido
- ✅ GET /api/forum/search con consulta válida
- ✅ Manejo de consulta corta en GET /api/forum/search
- ✅ GET /api/forum/posts/count
- ✅ GET /api/forum/posts/count con filtro de categoría
- ✅ GET /api/forum/posts/popular con parámetros por defecto
- ✅ GET /api/forum/posts/popular con parámetros personalizados

#### api.enhanced.test.js (Mejorado)
- ✅ Rechazo de registro con contraseña débil
- ✅ Rechazo de registro con email inválido
- ✅ Rechazo de registro con XSS en email
- ✅ Aceptación de registro válido
- ✅ Rechazo de login con credenciales inválidas
- ✅ Rechazo de login con XSS en email
- ✅ Aceptación de login válido
- ✅ Rechazo de refresco con token inválido
- ✅ Aceptación de refresco con token válido
- ✅ Rechazo de post con XSS en título
- ✅ Rechazo de post con XSS en contenido
- ✅ Rechazo de post con título corto
- ✅ Rechazo de post con contenido corto
- ✅ Aceptación de post válido
- ✅ Rechazo de comentario con XSS
- ✅ Rechazo de comentario con contenido vacío
- ✅ Aceptación de comentario válido
- ✅ Rechazo de búsqueda con XSS
- ✅ Rechazo de búsqueda con término corto
- ✅ Aceptación de búsqueda válida
- ✅ Manejo consistente de errores de base de datos
- ✅ Manejo de peticiones malformadas
- ⚠️ **FALLA**: Implementación de rate limiting
- ⚠️ **FALLA**: Configuración adecuada de CORS
- ⚠️ **FALLA**: Rechazo de peticiones de orígenes no autorizados

## Errores Detectados por las Pruebas

### 1. Vulnerabilidades de Seguridad (Alta Prioridad)
- **XSS**: Las funciones de validación no detectan scripts maliciosos
- **JavaScript Injection**: No hay validación contra javascript: o onclick=
- **SQL Injection**: No hay validación contra inyección SQL
- **Sanitización**: Falta sanitización de entrada de usuario

### 2. Mejoras Necesarias (Media Prioridad)
- **Validación de Contraseñas**: No hay validación de longitud máxima
- **Rate Limiting**: No hay límite de peticiones por usuario
- **CORS**: Configuración demasiado permisiva
- **Manejo de Errores**: Respuestas inconsistentes

### 3. Problemas de Código (Baja Prioridad)
- **Funciones Duplicadas**: getRepliesByComment está definida dos veces
- **Validación Inconsistente**: Diferentes criterios de validación entre frontend y backend
- **Manejo de Límites**: No hay validación de límites en consultas paginadas

## Próximos Pasos

### 1. Corregir Errores de Seguridad
```javascript
// Ejemplo de mejora para validatePostData
function validatePostData({ title, content, category_id }) {
  const errors = [];
  
  // Validación de título
  if (!title || typeof title !== 'string') {
    errors.push('El título es requerido y debe ser una cadena de texto');
  } else {
    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 5 || trimmedTitle.length > 200) {
      errors.push('El título debe tener entre 5 y 200 caracteres');
    }
    // Sanitización contra XSS
    if (/<script|javascript:|on\w+=/i.test(trimmedTitle)) {
      errors.push('El título contiene caracteres no permitidos');
    }
  }
  
  // Similar para contenido...
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
```

### 2. Implementar Rate Limiting
```javascript
// Ejemplo de middleware de rate limiting
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // límite de 100 peticiones por ventana
  message: 'Demasiadas peticiones desde esta IP, por favor intente más tarde'
});

app.use('/api/', limiter);
```

### 3. Configurar CORS Adecuadamente
```javascript
// Ejemplo de configuración de CORS
import cors from 'cors';

const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://notieset.com'] 
    : ['http://localhost:5500'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
```

## Cobertura de Código

Para alcanzar una cobertura adecuada (>85%), se necesitan pruebas para:

1. **Controladores**
   - authController.js
   - forumController.js
   - newsController.js
   - categoryController.js
   - reactionController.js

2. **Middleware**
   - authMiddleware.js
   - errorHandler.js
   - compressionMiddleware.js

3. **Utilidades**
   - uuidValidator.js
   - responseHelper.js

## Integración Continua

Las pruebas deben ejecutarse automáticamente en cada commit:

```yaml
# Ejemplo de configuración para GitHub Actions
name: Backend Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v1
```

## Reportes

Los reportes de cobertura se generan en `coverage/lcov-report/index.html`.

Para ver el reporte en el navegador:
```bash
npm run test:coverage
# Luego abrir coverage/lcov-report/index.html
```

## Ejecución de Pruebas TDD

Para ejecutar las pruebas en modo TDD:

1. **Ejecutar el script de análisis**:
   ```bash
   node test-runner.js
   ```

2. **Verificar que las pruebas fallen como se espera**:
   - Las pruebas de seguridad deben fallar (detectar vulnerabilidades)
   - Las pruebas de validación deben fallar con datos inválidos
   - Las pruebas de integración deben fallar con peticiones maliciosas

3. **Implementar las correcciones**:
   - Hacer que las pruebas de seguridad pasen
   - Mejorar la validación de entrada
   - Implementar las medidas de seguridad faltantes

4. **Verificar que todas las pruebas pasen**:
   - Ejecutar las pruebas nuevamente
   - Asegurar que la cobertura sea adecuada
   - Verificar que no se introduzcan nuevos errores