# Pruebas del Frontend - Noti-ESET

## Estructura de Pruebas

```
tests/
├── setup.js                 # Configuración global de pruebas
├── forumValidation.test.js  # Pruebas de validación del foro
├── authManager.test.js      # Pruebas del gestor de autenticación
└── README.md               # Este archivo
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

### 1. Validación del Foro (forumValidation.test.js)

#### Pruebas de validatePostData
- ✅ Rechaza título nulo o vacío
- ✅ Rechaza título demasiado corto (< 5 caracteres)
- ✅ Rechaza título demasiado largo (> 200 caracteres)
- ✅ Rechaza contenido nulo o vacío
- ✅ Rechaza contenido demasiado corto (< 10 caracteres)
- ✅ Rechaza contenido demasiado largo (> 2000 caracteres)
- ✅ Acepta datos válidos
- ✅ Maneja espacios en blanco correctamente
- ⚠️ **FALLA**: Rechaza título con script (XSS)
- ⚠️ **FALLA**: Rechaza contenido con script (XSS)
- ⚠️ **FALLA**: Rechaza título con javascript:
- ⚠️ **FALLA**: Rechaza contenido con onclick

#### Pruebas de validateCommentData
- ✅ Rechaza comentario nulo o vacío
- ✅ Rechaza comentario con solo espacios
- ✅ Rechaza comentario demasiado largo (> 1000 caracteres)
- ✅ Acepta comentario válido
- ✅ Acepta comentario mínimo válido (1 carácter)
- ✅ Maneja espacios en blanco correctamente
- ⚠️ **FALLA**: Rechaza comentario con script (XSS)
- ⚠️ **FALLA**: Rechaza comentario con javascript:
- ⚠️ **FALLA**: Rechaza comentario con onclick

### 2. Gestor de Autenticación (authManager.test.js)

#### Pruebas de Inicialización
- ✅ Inicializa con valores por defecto
- ✅ Carga datos desde localStorage si existen
- ✅ Migra token antiguo si existe

#### Pruebas de saveToStorage
- ✅ Guarda token y usuario en localStorage
- ✅ Dispara evento authChange

#### Pruebas de clearStorage
- ✅ Limpia datos de autenticación
- ✅ Dispara evento authChange

#### Pruebas de Estado
- ✅ isAuthenticated retorna false si no hay token
- ✅ isAuthenticated retorna true si hay token
- ✅ isAnonymous retorna true si no está autenticado
- ✅ isAnonymous retorna true si el ID es de usuario anónimo
- ✅ isAnonymous retorna false si está autenticado y no es anónimo

#### Pruebas de Utilidades
- ✅ getUserId retorna ID de usuario anónimo si no está autenticado
- ✅ getUserId retorna ID de usuario si está autenticado
- ✅ getAuthHeaders retorna headers básicos si no hay token
- ✅ getAuthHeaders retorna headers con autorización si hay token

#### Pruebas de Token
- ✅ getTokenPayload retorna null si no hay token
- ✅ getTokenPayload retorna null si el token es inválido
- ✅ getTokenPayload decodifica token JWT válido

#### Pruebas de Login
- ✅ Maneja login exitoso
- ✅ Maneja login fallido
- ✅ Maneja error de conexión

#### Pruebas de Logout
- ✅ Limpia datos de autenticación

## Errores Detectados por las Pruebas

### 1. Vulnerabilidades de Seguridad (Alta Prioridad)
- **XSS**: Las funciones de validación no detectan scripts maliciosos
- **JavaScript Injection**: No hay validación contra javascript: o onclick=
- **Sanitización**: Falta sanitización de entrada de usuario

### 2. Mejoras Necesarias (Media Prioridad)
- **Validación HTML**: No hay validación de HTML5 en los formularios
- **Manejo de Errores**: Los errores no se muestran de forma consistente
- **Accesibilidad**: Faltan atributos ARIA en elementos interactivos

## Próximos Pasos

### 1. Corregir Errores de Seguridad
```javascript
// Ejemplo de mejora para validatePostData
function validatePostData(title, content) {
  const errors = [];
  
  // Validación de título
  if (!title || typeof title !== 'string') {
    errors.push('El título es requerido');
  } else {
    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 5) {
      errors.push('El título debe tener al menos 5 caracteres');
    }
    if (trimmedTitle.length > 200) {
      errors.push('El título no puede tener más de 200 caracteres');
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

### 2. Mejorar Validación en Formularios HTML
```html
<!-- Ejemplo de mejora en index.html -->
<input type="text" id="titulo-tema" required minlength="5" maxlength="200" pattern="^(?!.*<script).*$">
<textarea id="contenido-tema" required minlength="10" maxlength="2000" pattern="^(?!.*<script).*$"></textarea>
```

### 3. Implementar Sanitización de HTML
```javascript
// Ejemplo de función de sanitización
function sanitizeHtml(input) {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}
```

## Cobertura de Código

Para alcanzar una cobertura adecuada (>80%), se necesitan pruebas para:

1. **Funciones de forum.js**
   - renderTemas
   - crearTema
   - cargarTemasYComentarios
   - reaccionarPost
   - reaccionarComentario

2. **Funciones de main.js**
   - actualizarUIporSesion
   - fetchProtegido
   - mostrarMensajeError

3. **Funciones de auth.js**
   - refreshToken
   - fetchWithAuth
   - register

## Integración Continua

Las pruebas deben ejecutarse automáticamente en cada commit:

```yaml
# Ejemplo de configuración para GitHub Actions
name: Frontend Tests
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
```

## Reportes

Los reportes de cobertura se generan en `coverage/lcov-report/index.html`.

Para ver el reporte en el navegador:
```bash
npm run test:coverage
# Luego abrir coverage/lcov-report/index.html