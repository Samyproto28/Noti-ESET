# NotiEset - Sistema de Noticias ESET UNQ

Aplicación web de noticias para estudiantes de la Escuela de Educación Secundaria Técnica (ESET) de la Universidad Nacional de Quilmes (UNQ).

## Descripción

NotiEset es un sistema integral de noticias que permite a los estudiantes mantenerse informados sobre:
- Paros y suspensiones de actividades
- Eventos académicos y extracurriculares
- Inscripciones y trámites importantes
- Noticias generales de la institución

Características principales:
- 📰 Sistema de publicaciones de noticias
- 🎠 Galería de imágenes con carrusel interactivo
- 🔐 Sistema de autenticación de usuarios
- 💬 Foro de discusión
- 📱 Diseño responsive y accesible
- ⚡ Optimización de rendimiento y caché

## Estructura del Proyecto

```
Noti-ESET-main/
├── backend/                    # Servidor Node.js con Express
│   ├── src/
│   │   ├── controllers/        # Controladores de lógica de negocio
│   │   │   ├── authController.js
│   │   │   ├── newsController.js
│   │   │   └── userProfileController.js
│   │   ├── services/           # Servicios de datos
│   │   │   ├── newsService.js
│   │   │   └── userProfileService.js
│   │   ├── middleware/         # Middleware de Express
│   │   │   ├── authMiddleware.js
│   │   │   └── errorHandler.js
│   │   ├── routes/             # Rutas de la API
│   │   │   ├── auth.routes.js
│   │   │   ├── news.routes.js
│   │   │   └── userProfile.routes.js
│   │   ├── validators/         # Validación de datos
│   │   │   ├── authValidators.js
│   │   │   └── newsValidators.js
│   │   ├── utils/              # Utilidades
│   │   │   └── responseHelper.js
│   │   └── app.js              # Configuración principal
│   ├── tests/                  # Pruebas unitarias
│   ├── .env                    # Variables de entorno
│   └── package.json
├── frontend/                   # Cliente web
│   ├── src/
│   │   ├── assets/             # Imágenes y recursos
│   │   ├── style.css           # Estilos
│   │   ├── index.html          # Página principal
│   │   └── *.js                # Módulos JavaScript
│   └── package.json
└── README.md                   # Este archivo
```

## Instalación

### Prerrequisitos

- Node.js (versión 18 o superior)
- npm (versión 9 o superior)
- Cuenta de Supabase para base de datos

### Backend

1. Navegar al directorio del backend:
   ```bash
   cd backend
   ```

2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Configurar variables de entorno:
   ```bash
   cp .env.example .env
   ```
   Editar el archivo `.env` con tus configuraciones de Supabase y JWT.

4. Iniciar el servidor:
   ```bash
   npm start
   ```

### Frontend

1. Navegar al directorio del frontend:
   ```bash
   cd frontend
   ```

2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Iniciar el servidor de desarrollo:
   ```bash
   npm start
   ```

## Uso

### Acceso a la Aplicación

1. Abre tu navegador web
2. Navega a `http://localhost:3000` (frontend)
3. El servidor backend corre en `http://localhost:5000`

### Funcionalidades

#### Autenticación
- Registro de nuevos usuarios
- Inicio de sesión con email y contraseña
- Gestión de perfiles de usuario

#### Noticias
- Visualización de noticias principales
- Publicación de nuevas noticias (requiere autenticación)
- Categorización de noticias (Trámites, Eventos, Inscripciones, General)

#### Foro
- Participación en discusiones
- Publicación de comentarios

#### Galería
- Navegación interactiva de imágenes del centro
- Carrusel con controles de navegación

## Testing

### Ejecutar Pruebas

1. Para ejecutar todas las pruebas:
   ```bash
   npm test
   ```

2. Para ejecutar pruebas específicas:
   ```bash
   npm test tests/unit/auth.test.js
   ```

3. Para generar reporte de cobertura:
   ```bash
   npm run test:coverage
   ```

### Categorías de Pruebas

- **Pruebas unitarias**: Pruebas de componentes individuales
- **Pruebas de integración**: Pruebas de flujo entre módulos
- **Pruebas de API**: Pruebas de endpoints del backend
- **Pruebas de frontend**: Pruebas de componentes del cliente

## API Documentation

### Endpoints Principales

#### Autenticación
- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/login` - Inicio de sesión
- `POST /api/auth/logout` - Cierre de sesión

#### Noticias
- `GET /api/news` - Obtener todas las noticias
- `GET /api/news/:id` - Obtener noticia específica
- `POST /api/news` - Crear nueva noticia
- `PUT /api/news/:id` - Actualizar noticia
- `DELETE /api/news/:id` - Eliminar noticia

### Códigos de Estado HTTP

- `200` - Solicitud exitosa
- `201` - Recurso creado
- `400` - Solicitud inválida
- `401` - No autorizado
- `404` - Recurso no encontrado
- `500` - Error del servidor

## Tecnologías

### Backend
- **Node.js** - Runtime de JavaScript
- **Express.js** - Framework web
- **Supabase** - Base de datos y autenticación
- **JWT** - Tokens de autenticación
- **express-validator** - Validación de datos
- **Helmet.js** - Seguridad de headers

### Frontend
- **JavaScript ES6+** - Lenguaje principal
- **HTML5** - Estructura semántica
- **CSS3** - Estilos y diseño responsive
- **Swiper.js** - Carrusel de imágenes

### Desarrollo y Testing
- **Jest** - Framework de testing
- **Babel** - Transpilador JavaScript
- **ESLint** - Linting de código
- **JSDoc** - Documentación de código

## Contribuir

1. Fork el repositorio
2. Crear una rama de feature: `git checkout -b feature/nueva-funcionalidad`
3. Realizar commits descriptivos: `git commit -m 'Agregar nueva funcionalidad'`
4. Push a la rama: `git push origin feature/nueva-funcionalidad`
5. Abrir un Pull Request

## Estándares de Código

- Usar ES6+ para todo el código JavaScript
- Seguir estilo de guía ESLint
- Escribir pruebas para nuevas funcionalidades
- Documentar funciones con JSDoc
- Mantener cobertura de pruebas > 90%

## Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## Contacto

- **Autores**: Alejo Cruz, Samuel Angarita, Candela Ybañez, Ignacio González, Alejandro Soria, Abigail Durán
- **Institución**: ESET UNQ
- **Año**: 2023

## Acknowledgments

- Gracias a la comunidad de ESET UNQ por su apoyo
- Recursos educativos de UNQ
- Documentación de tecnologías utilizadas

## Deploy

La aplicación está desplegada en: https://samyproto28.github.io/Noti-ESET/

## Repository

https://github.com/Samyproto28/Noti-ESET.git
