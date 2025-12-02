# Noti-ESET: Plataforma de Comunicación e Integración Comunitaria
## Product Requirements Document (PRD) v2.0

---

## 1. Executive Summary

**Objetivo:** Desarrollar Noti-ESET, una plataforma web centralizada de comunicación responsive y escalable que integre noticias, foros y galerías multimedia para la comunidad de ESET UNQ, mejorando significativamente el engagement estudiantil y la eficiencia de la comunicación institucional.

**Problema Crítico:** Actualmente, la información se dispersa entre múltiples canales descoordinados, resultando en baja retención de información importante y participación limitada de estudiantes en actividades institucionales.

**Solución Propuesta:** Una plataforma única, intuitiva, mobile-first y fully responsive que centralice todas las comunicaciones con herramientas interactivas (foros, comentarios, reacciones) y un panel administrativo robusto para gestión de contenidos, construida con Next.js y Supabase.

**Impacto de Negocio Esperado:**
- Incremento de 60% en engagement estudiantil (participación en foros y comentarios)
- Reducción de 50% en tiempo de distribución de información crítica
- Mejora de 40% en retención de estudiantes respecto a información institucional
- Consolidación de ESET UNQ como institución digitalmente moderna

**Timeline:** MVP en 12 semanas, Fase 2 en semanas 13-24

---

## 2. Problem Statement

### Situación Actual
ESET UNQ enfrenta fragmentación comunicacional: información dispersa entre WhatsApp, email, tableros físicos y redes sociales informales. Los estudiantes no tienen un punto centralizado confiable, generando:

- **Pérdida de información:** 35% de estudiantes reporta no enterarse de eventos importantes
- **Ineficiencia administrativa:** Personal dedica 8+ horas semanales coordinando comunicados en múltiples canales
- **Baja participación:** Solo 15% de estudiantes participa en actividades comunitarias

### Puntos Críticos de Dolor
1. **Para estudiantes:** No saben dónde buscar información, sienten desconexión con la institución
2. **Para administradores:** Gestión manual repetitiva, sin visibilidad de engagement
3. **Para institución:** Imagen de desorganización, oportunidades perdidas de community building

### Oportunidad de Mercado
La educación técnica argentina está digitalizándose. ESET UNQ puede posicionarse como líder institucional con herramientas modernas que mejoren la experiencia estudiantil y atraigan nuevos inscriptos.

### Alineamiento Estratégico
Este proyecto refuerza la visión de ESET UNQ como institución innovadora y accesible, mejorando la retención estudiantil y la marca institucional en el ecosistema educativo argentino.

---

## 3. User Personas

### Persona 1: Santiago - Estudiante Activo (Primario)
- **Edad:** 18-20 años
- **Comportamiento:** Nativo digital, activo en redes sociales, busca comunidad
- **Objetivos:** Estar informado de eventos, participar en discusiones, conectar con compañeros
- **Dolor:** No sabe dónde buscar información importante, se pierde en múltiples grupos de WhatsApp
- **Frecuencia de uso:** Diario (5-10 minutos)
- **Dispositivos:** Principalmente mobile (80%), alguna vez desktop

### Persona 2: Marcela - Administradora de Contenido (Secundario)
- **Edad:** 35-50 años
- **Rol:** Docente/Personal administrativo
- **Objetivos:** Publicar información de forma eficiente, moderar interacciones, medir engagement
- **Dolor:** Procesos manuales complejos, falta de visibility sobre qué contenido tiene impacto
- **Frecuencia de uso:** 2-3 veces por semana (15-30 minutos)
- **Dispositivos:** Desktop principalmente

### Persona 3: Carolina - Futura Estudiante (Usuario Anónimo)
- **Edad:** 16-18 años
- **Comportamiento:** Investiga instituciones antes de inscribirse
- **Objetivos:** Comprender la vida en ESET, ver actividades, conocer experiencias de estudiantes
- **Dolor:** Información institucional dispersa, difícil evaluar dinámicas reales
- **Frecuencia de uso:** Ocasional (búsquedas esporádicas)

### Persona 4: Carlos - Superadministrador (Técnico)
- **Edad:** 28-40 años
- **Rol:** Equipo de TI
- **Objetivos:** Mantener sistema estable, gestionar usuarios, monitorear performance
- **Dolor:** Falta de herramientas modernas, dificultad escalando infraestructura
- **Frecuencia de uso:** Diario (monitoreo), semanal (mantenimiento)

---

## 4. Funcionalidades Principales

### 4.1 Sistema de Noticias

**REQ-N001: Editor de Noticias Rich-Text** [MUST HAVE]
- **Descripción:** Los administradores SHALL ser capaces de crear noticias con editor HTML5 que soporte texto enriquecido, imágenes embebidas, y formato profesional
- **Aceptación:**
  - Editor funciona sin problemas en navegadores modernos (Chrome, Firefox, Safari, Edge)
  - Soporte para imágenes (JPG, PNG, WebP, máx 5MB)
  - Caracteres especiales se renderizan correctamente
  - Tiempo de carga < 2 segundos
  - Responsive en tablet y mobile
- **Prioridad:** MUST HAVE (MVP)

**REQ-N002: Categorización Automática** [MUST HAVE]
- **Descripción:** Todas las noticias SHALL asignarse automáticamente a una de cuatro categorías: Trámites, Eventos, Inscripciones, General
- **Aceptación:**
  - Las cuatro categorías están implementadas y seleccionables
  - Estudiantes pueden filtrar por categoría en < 1 segundo
  - Cada categoría tiene ícono distintivo y color
  - Filtros funcionan en mobile y desktop
- **Prioridad:** MUST HAVE (MVP)

**REQ-N003: Publicación Programada** [SHOULD HAVE]
- **Descripción:** Los administradores SHOULD poder agendar publicaciones para fechas/horas futuras (máximo 90 días)
- **Aceptación:**
  - Calendar picker intuitivo para seleccionar fecha/hora
  - Zona horaria ART configurada correctamente
  - Notificación 24h antes de publicación programada
  - Máximo error de 5 minutos en ejecución
- **Prioridad:** SHOULD HAVE (Semana 5-6)

**REQ-N004: Buscador Avanzado** [MUST HAVE]
- **Descripción:** Sistema de búsqueda SHALL permitir encontrar noticias por título, contenido y categoría en < 500ms
- **Aceptación:**
  - Búsqueda full-text en título y contenido usando PostgreSQL
  - Filtros por categoría, rango de fechas, autor
  - Resultados mostrados en < 500ms para base de 500+ artículos
  - Resaltado de términos búsqueda en resultados
  - Responsive en todos los dispositivos
- **Prioridad:** MUST HAVE (MVP)

**REQ-N005: Destacados de Portada** [MUST HAVE]
- **Descripción:** Los administradores SHALL poder seleccionar hasta 5 noticias para carrusel principal
- **Aceptación:**
  - Carrusel se carga en < 1 segundo
  - Cada destacado muestra thumbnail, título, descripción corta
  - Orden configurable mediante drag-and-drop
  - Mobile: carrusel responsivo y swipeable
  - Auto-rotación cada 5 segundos pausable
- **Prioridad:** MUST HAVE (MVP)

### 4.2 Sistema de Usuarios y Autenticación

**REQ-A001: Registro Institucional Validado** [MUST HAVE]
- **Descripción:** El sistema SHALL validar que registros de estudiantes sean de email institucional @eset.edu.ar usando Supabase Auth
- **Aceptación:**
  - Solo emails @eset.edu.ar son aceptados
  - Contraseña mínimo 8 caracteres con mayúscula, número, carácter especial
  - Validación de email con link de confirmación
  - Formulario responsive con <3 campos visibles por vez (progresivo)
- **Prioridad:** MUST HAVE (MVP)

**REQ-A002: Autenticación JWT Segura** [MUST HAVE]
- **Descripción:** El sistema SHALL implementar Supabase Auth con JWT para autenticación segura sin sesiones del servidor
- **Aceptación:**
  - Access tokens válidos 1 hora
  - Refresh tokens válidos 30 días
  - Rate limiting: máximo 5 intentos fallidos/IP en 15 minutos
  - Logout limpia cookies y tokens
  - Protección CSRF en formularios
- **Prioridad:** MUST HAVE (MVP)

**REQ-A003: Gestión de Roles y Permisos** [MUST HAVE]
- **Descripción:** El sistema SHALL soportar 4 roles con permisos diferenciados: Estudiante, Moderador, Admin, Superadmin usando Row Level Security en Supabase
- **Aceptación:**
  - Cada rol tiene permisos específicos (ver matriz RACI)
  - Estudiantes no pueden cambiar propios permisos
  - Audit log registra cambios de rol
  - Verificación de permisos < 50ms en cada request
- **Prioridad:** MUST HAVE (MVP)

**REQ-A004: Perfil de Usuario** [SHOULD HAVE]
- **Descripción:** Estudiantes SHOULD poder ver/editar nombre, foto de perfil, configurar notificaciones
- **Aceptación:**
  - Foto de perfil soporta JPG, PNG almacenado en Supabase Storage (máx 2MB, 200x200px)
  - Configuración de notificaciones guardada en < 500ms
  - Historial de cambios visible para usuario
  - Responsive en mobile y desktop
- **Prioridad:** SHOULD HAVE (Semana 3-4)

### 4.3 Foro de Discusión

**REQ-F001: Tópicos y Comentarios Jerárquicos** [MUST HAVE]
- **Descripción:** El sistema SHALL soportar creación de tópicos con respuestas anidadas hasta 3 niveles almacenadas en Supabase PostgreSQL
- **Aceptación:**
  - Estudiantes pueden crear tópicos en < 30 segundos
  - Cada respuesta anidada muestra claramente relación con padre
  - Máximo 3 niveles de profundidad
  - UI clara sobre quién es el autor original vs respuestas
  - Layout responsive para mostrar anidamiento en mobile
- **Prioridad:** MUST HAVE (MVP)

**REQ-F002: Sistema de Reacciones** [MUST HAVE]
- **Descripción:** Estudiantes SHALL poder reaccionar con emoji (👍, ❤️, 😂, 🤔, 😢) a cualquier comentario
- **Aceptación:**
  - Máximo 1 reacción por usuario por comentario (UNIQUE constraint en DB)
  - Contador de reacciones actualiza en tiempo real
  - Hover muestra lista de usuarios que reaccionaron
  - Mobile: tap para seleccionar reacción
  - Queries optimizadas a base de datos
- **Prioridad:** MUST HAVE (MVP)

**REQ-F003: Notificaciones de Respuestas** [MUST HAVE]
- **Descripción:** Estudiantes SHALL recibir notificación cuando alguien responda a su comentario
- **Aceptación:**
  - Notificación en-app dentro de 5 segundos
  - Opción de deshabilitar por tópico
  - Link en notificación lleva directamente al comentario
  - Máximo 1 notificación consolidada por tópico/hora
- **Prioridad:** MUST HAVE (MVP)

**REQ-F004: Moderación Básica** [MUST HAVE]
- **Descripción:** Moderadores SHALL poder editar/eliminar comentarios inapropiados con registro de auditoría en Supabase
- **Aceptación:**
  - Edición/eliminación toma < 1 segundo
  - Historial de cambios visible para moderadores (audit log)
  - Notificación automática al usuario deletado explicando razón
  - Comentarios eliminados muestran "[Comentario eliminado por moderar contenido]"
- **Prioridad:** MUST HAVE (MVP)

**REQ-F005: Reportes de Contenido** [SHOULD HAVE]
- **Descripción:** Estudiantes SHOULD poder reportar comentarios inapropiados con categoría
- **Aceptación:**
  - Categorías: Spam, Acoso, Contenido Inapropiado, Otro
  - Máximo 1 reporte por usuario por comentario
  - Dashboard para moderadores mostrando reportes pendientes
- **Prioridad:** SHOULD HAVE (Semana 5-6)

### 4.4 Galería Multimedia

**REQ-G001: Carrusel Interactivo** [MUST HAVE]
- **Descripción:** Página principal SHALL incluir carrusel responsivo mostrando imágenes de eventos recientes desde Supabase Storage
- **Aceptación:**
  - Auto-rotación cada 5 segundos (pausable)
  - Botones prev/next funcionales
  - Mobile: swipe para navegar
  - Lazy loading de imágenes > 3
  - Tiempo de carga < 2 segundos
  - Fully responsive en todas las resolutions
- **Prioridad:** MUST HAVE (MVP)

**REQ-G002: Gestión de Imágenes** [MUST HAVE]
- **Descripción:** Administradores SHALL poder subir/organizar imágenes con descripciones a Supabase Storage
- **Aceptación:**
  - Soporta JPG, PNG, WebP
  - Compresión automática (máx 1MB)
  - Drag-and-drop para organización
  - Búsqueda por descripción
  - Máximo 500 imágenes por galería
  - Interfaz responsive
- **Prioridad:** MUST HAVE (MVP)

**REQ-G003: Optimización de Imágenes** [SHOULD HAVE]
- **Descripción:** El sistema SHOULD generar automáticamente thumbnails y versiones responsive usando Supabase image resizing
- **Aceptación:**
  - Thumbnail 200x200px (< 50KB)
  - Versión mobile 480px ancho (< 200KB)
  - Versión desktop 1200px ancho (< 400KB)
  - Formato WebP cuando navegador lo soporta
  - Transformaciones en URL de Supabase CDN
- **Prioridad:** SHOULD HAVE (Semana 7-8)

### 4.5 Panel de Administración

**REQ-P001: Dashboard Principal** [MUST HAVE]
- **Descripción:** Panel SHALL mostrar resumen con estadísticas principales y acciones rápidas con queries optimizadas a Supabase
- **Aceptación:**
  - Carga en < 2 segundos
  - Muestra: total noticias, comentarios pendientes, usuarios activos (hoy/mes)
  - Gráfico de tendencia de engagement (últimas 4 semanas)
  - Botones rápidos: Nueva noticia, Ver reportes, Moderar comentarios
  - Responsive en tablet y desktop
- **Prioridad:** MUST HAVE (MVP)

**REQ-P002: Gestor de Contenido** [MUST HAVE]
- **Descripción:** Interfaz SHALL permitir crear, editar, eliminar noticias con preview en tiempo real conectado a Supabase
- **Aceptación:**
  - Tabla listando noticias con búsqueda/filtros full-text
  - Botón crear abre formulario completo con vista previa lado-a-lado
  - Edición en-place de cambios menores
  - Confirmación antes de eliminar
  - Historial de versiones para últimas 3 versiones
  - Responsive design
- **Prioridad:** MUST HAVE (MVP)

**REQ-P003: Gestor de Usuarios** [MUST HAVE]
- **Descripción:** Administradores SHALL gestionar usuarios, roles y permisos desde Supabase
- **Aceptación:**
  - Tabla con búsqueda/filtros por rol, estado, fecha registro
  - Cambio de rol mediante dropdown (actualiza RLS policies)
  - Deshabilitar usuario sin eliminar datos
  - Auditoría: quién cambió qué y cuándo
  - Bulk actions para asignar rol a múltiples
  - Responsive
- **Prioridad:** MUST HAVE (MVP)

**REQ-P004: Moderación de Contenido** [MUST HAVE]
- **Descripción:** Moderadores SHALL revisar y aprobar/rechazar contenido generado por usuarios desde Supabase
- **Aceptación:**
  - Cola de comentarios pendientes (is_approved = FALSE)
  - Preview del contexto (noticia/tópico original)
  - Botones: Aprobar, Rechazar (con razón)
  - Notificación automática al usuario
  - Query eficiente para obtener pendientes
- **Prioridad:** MUST HAVE (MVP)

**REQ-P005: Analytics y Reportes** [SHOULD HAVE]
- **Descripción:** Panel SHALL generar reportes de engagement con KPIs principales consultando Supabase
- **Aceptación:**
  - Usuarios activos (diarios/mensuales) desde tabla users
  - Noticias más leídas (ORDER BY view_count DESC)
  - Comentarios por tópico
  - Tasa de participación por categoría
  - Exportar a CSV
  - Responsive
- **Prioridad:** SHOULD HAVE (Semana 9-10)

---

## 5. Requerimientos No-Funcionales

### Performance
**REQ-NF001:** Tiempo de carga página principal SHALL ser < 2.5 segundos en conexión 4G
**REQ-NF002:** Búsqueda SHALL retornar resultados en < 500ms incluso con 10,000+ noticias (índices PostgreSQL)
**REQ-NF003:** Sistema SHALL soportar mínimo 500 usuarios concurrentes sin degradación (Vercel serverless)
**REQ-NF004:** Lighthouse Performance score ≥ 90 en mobile y desktop

### Seguridad
**REQ-NF005:** Todas las contraseñas SHALL ser hasheadas con bcrypt via Supabase Auth
**REQ-NF006:** API SHALL estar protegida contra XSS, CSRF, SQL Injection mediante validación Zod y Row Level Security
**REQ-NF007:** Rate limiting: máximo 100 requests/minuto por IP para endpoints públicos
**REQ-NF008:** Backup diario automático (Supabase lo hace automáticamente) con retención de 30 días

### Responsive Design
**REQ-NF009:** Interfaz SHALL ser totalmente responsive con breakpoints Tailwind:
- Mobile (< 640px): Full ancho, botones 48px+, single-column
- Tablet (640-1024px): 2-column, touch-optimized
- Desktop (> 1024px): Multi-column, sidebar, 3+ column grids
**REQ-NF010:** Todas las funcionalidades accesibles en mobile, tablet y desktop
**REQ-NF011:** Touch targets mínimo 44x44px en mobile

### Accesibilidad
**REQ-NF012:** Interfaz SHALL cumplir WCAG 2.1 nivel AA (colores, contraste, navegación por teclado)
**REQ-NF013:** Todas las imágenes SHALL tener alt text descriptivo
**REQ-NF014:** Formularios con labels asociados y mensajes de error claros

### Compatibilidad
**REQ-NF015:** Interfaz SHALL funcionar en móviles (iOS 12+, Android 8+) y desktops (Chrome, Firefox, Safari, Edge versiones últimas 2)

---

## 6. Success Metrics

| Métrica | Baseline | Target (Mes 6) | Target (Año 1) | Método de Medición |
|---------|----------|---|---|---|
| **Engagement** |  |  |  |  |
| Tasa de participación en comentarios | 5% | 30% | 50% | Google Analytics custom event |
| Promedio comentarios por noticia | 0.2 | 3 | 5 | Supabase query: COUNT(comments) / COUNT(news) |
| Tópicos activos en foro | 0 | 20 | 50+ | Supabase query: COUNT(forum_topics) |
| **Adopción** |  |  |  |  |
| Estudiantes registrados activos | 0% | 60% | 85% | Monthly Active Users (MAU) desde users table |
| Sesiones diarias promedio | 0 | 200 | 500+ | Google Analytics |
| Tiempo promedio en sitio | 0 | 3 min | 5 min | Google Analytics |
| **Operacional** |  |  |  |  |
| Tiempo para publicar noticia | 45 min (manual) | 5 min | 2 min | User testing |
| Tasa de contenido moderado < 1h | N/A | 90% | 95% | Dashboard report desde comments is_approved |
| Disponibilidad del sistema | N/A | 99.5% | 99.9% | Vercel uptime monitoring |
| Carga página principal | N/A | < 2.5s | < 1.8s | Lighthouse en CI/CD |
| **Negocio** |  |  |  |  |
| Retención de estudiantes (mes 1) | 85% | 88% | 90% | Inscripciones vs activos |
| Respuesta a eventos importantes < 2h | N/A | 100% | 100% | Manual log |

---

## 7. Pila Técnica

### Frontend (Responsive Mobile-First)
- **Framework:** Next.js 14+ con React Server Components
- **Styling:** Tailwind CSS con custom components reutilizables
- **Responsive Design:** Mobile-first con breakpoints:
  - Mobile: < 640px (full ancho, botones 48px+, single-column)
  - Tablet: 640-1024px (2-column, optimizado touch)
  - Desktop: > 1024px (multi-column, sidebar, grids 3+)
- **State Management:** React Context API + useReducer para estado global
- **Componentes:** Custom UI library basada en Tailwind (Button, Card, Modal, Form, etc.)
- **Routing:** Next.js App Router con layouts anidados
- **Optimización:** Next.js Image para lazy loading automático

### Backend API (Next.js + Supabase)
- **Runtime:** Node.js con Next.js serverless functions en Vercel
- **Database Client:** @supabase/supabase-js para queries type-safe
- **Autenticación:** Supabase Auth (JWT con refresh tokens)
- **Validación:** Zod para validación de entrada con esquemas reutilizables
- **Rate Limiting:** Implementado en Vercel edge middleware (100 req/min por IP)

### Base de Datos (Supabase PostgreSQL)

**Tablas y Schema:**
```sql
-- Usuarios
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  full_name VARCHAR NOT NULL,
  role VARCHAR DEFAULT 'student' 
    CHECK (role IN ('student', 'moderator', 'admin', 'superadmin')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Noticias
CREATE TABLE news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR NOT NULL 
    CHECK (category IN ('Trámites', 'Eventos', 'Inscripciones', 'General')),
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  published_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_featured BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0
);

-- Comentarios (con soporte para anidamiento)
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  news_id UUID REFERENCES news(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_approved BOOLEAN DEFAULT FALSE
);

-- Reacciones
CREATE TABLE reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  emoji VARCHAR NOT NULL CHECK (emoji IN ('👍', '❤️', '😂', '🤔', '😢')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- Tópicos del Foro
CREATE TABLE forum_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  view_count INTEGER DEFAULT 0
);

-- Imágenes (almacenadas en Supabase Storage)
CREATE TABLE images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url VARCHAR NOT NULL,
  description VARCHAR,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  is_featured BOOLEAN DEFAULT FALSE,
  storage_path VARCHAR NOT NULL
);
```

**Índices Optimizados:**
```sql
-- Búsqueda y filtrado rápido
CREATE INDEX idx_news_category ON news(category);
CREATE INDEX idx_news_published_at ON news(published_at DESC) 
  WHERE is_published = TRUE;
CREATE INDEX idx_news_featured ON news(is_featured) 
  WHERE is_featured = TRUE;
CREATE INDEX idx_comments_news_id ON comments(news_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_comment_id);
CREATE INDEX idx_comments_approved ON comments(is_approved);
CREATE INDEX idx_reactions_comment_id ON reactions(comment_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_forum_topics_created_at ON forum_topics(created_at DESC);
CREATE INDEX idx_images_featured ON images(is_featured) 
  WHERE is_featured = TRUE;

-- Full-text search
CREATE INDEX idx_news_search ON news 
  USING GIN(to_tsvector('spanish', title || ' ' || content));
```

**Row Level Security (Seguridad a nivel BD):**
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Estudiantes solo ven sus propios perfiles
CREATE POLICY student_view_own_profile ON users 
  FOR SELECT USING (auth.uid() = id OR role != 'student');

-- Comentarios no aprobados solo visibles por autor y moderadores
CREATE POLICY comments_visibility ON comments 
  FOR SELECT USING (
    is_approved = TRUE 
    OR user_id = auth.uid() 
    OR auth.jwt()->>'role' IN ('moderator', 'admin', 'superadmin')
  );
```

### Consultas Backend Optimizadas

**1. GET /api/news - Listar noticias paginadas**
```typescript
const { data, error } = await supabase
  .from('news')
  .select(`
    id, title, category, published_at, view_count,
    author:users(full_name),
    comment_count:comments(count)
  `)
  .eq('is_published', true)
  .order('published_at', { ascending: false })
  .range(page * 20, (page + 1) * 20 - 1);
```

**2. GET /api/news/:id - Detalle con comentarios jerárquicos**
```typescript
const { data: news } = await supabase
  .from('news')
  .select(`
    id, title, content, category, view_count, created_at,
    author:users(id, full_name),
    comments(
      id, content, created_at, is_approved,
      user:users(full_name),
      reactions(emoji),
      replies:comments!parent_comment_id(
        id, content, created_at,
        user:users(full_name),
        reactions(emoji)
      )
    )
  `)
  .eq('id', newsId)
  .eq('comments.is_approved', true)
  .single();
```

**3. POST /api/comments - Crear comentario**
```typescript
const { data } = await supabase
  .from('comments')
  .insert([{
    news_id: newsId,
    user_id: userId,
    content: sanitizeHtml(content),
    parent_comment_id: parentId || null,
    is_approved: userRole === 'student' ? false : true
  }])
  .select()
  .single();
```

**4. GET /api/search - Full-text search con PostgreSQL**
```typescript
const { data } = await supabase
  .from('news')
  .select('id, title, category, published_at')
  .textSearch('search_column', `'${query}'`, {
    type: 'websearch',
    config: 'spanish'
  })
  .eq('is_published', true)
  .order('published_at', { ascending: false })
  .limit(20);
```

**5. GET /api/forum/topics - Con contador de respuestas**
```typescript
const { data } = await supabase
  .from('forum_topics')
  .select(`
    id, title, created_at, view_count,
    author:users(full_name),
    reply_count:comments(count)
  `)
  .order('created_at', { ascending: false })
  .range(page * 20, (page + 1) * 20 - 1);
```

**6. GET /api/comments - Reacciones agrupadas**
```typescript
const { data } = await supabase
  .from('comments')
  .select(`
    id, content, created_at,
    user:users(full_name),
    reactions(emoji)
  `)
  .eq('news_id', newsId)
  .eq('is_approved', true)
  .order('created_at', { ascending: false });
```

### Almacenamiento de Archivos (Supabase Storage)

**Estructura de buckets:**
```
/noti-eset-images/
  ├── /news-featured/          # Imágenes destacadas (1200x400px)
  ├── /gallery/                # Galería de eventos (variadas)
  ├── /user-avatars/           # Fotos de perfil (200x200px)
  └── /thumbnails/             # Auto-generados
```

**Implementación de CDN y transformaciones:**
```typescript
// URL con transformaciones automáticas de Supabase
const getThumbnail = (path: string) => {
  const { data } = supabase.storage
    .from('noti-eset-images')
    .getPublicUrl(`${path}?width=200&height=200&quality=80`);
  return data.publicUrl;
};

// Versión mobile optimizada
const getMobileVersion = (path: string) => {
  const { data } = supabase.storage
    .from('noti-eset-images')
    .getPublicUrl(`${path}?width=480&quality=80`);
  return data.publicUrl;
};
```

### Infraestructura

- **Frontend Hosting:** Vercel
  - Auto-deploy en cada push a main (GitHub integration)
  - Preview deployments para PRs
  - Automatic edge caching
  - Analytics integrado
  
- **Backend:** Next.js API Routes en Vercel (serverless)
  - Auto-scaling según demanda
  - Cold start < 500ms
  - Edge functions para rate limiting
  
- **Database:** Supabase PostgreSQL
  - Connection pooling (50-100 connections)
  - Backups automáticos diarios (retención 30 días)
  - Monitoring dashboard integrado
  
- **Auth:** Supabase Auth
  - JWT tokens con refresh capability
  - Magic links y OAuth ready
  - Row Level Security integrado
  
- **Storage:** Supabase Storage + CloudFlare CDN
  - Caching 24h automático
  - Image resizing en URL
  - Optimización automática
  
- **Monitoreo:**
  - Vercel Analytics
  - Supabase dashboard
  - Sentry para error tracking
  - Google Analytics GA4 para user behavior

### Herramientas de Desarrollo

- **Control de versiones:** GitHub con Conventional Commits
- **Package Manager:** pnpm (más rápido que npm/yarn)
- **Entorno local:** `supabase start` para PostgreSQL + Auth local
- **Testing:** 
  - Jest + React Testing Library (unit tests)
  - Playwright (E2E tests)
  - Lighthouse CI en cada PR
- **Documentación:** OpenAPI 3.0 + Swagger UI para API

---

## 8. Timeline y Milestones

### Phase 1: MVP (12 semanas)

**Sprint 1-2 (Semana 1-2): Infraestructura y Base**
- Setup Next.js 14 project con Tailwind
- Configurar Supabase (DB, Auth, Storage)
- Setup GitHub Actions para CI/CD a Vercel
- Database schema y RLS policies
- UI kit y componentes base responsive
- **Deliverable:** Ambiente dev funcional, primeros componentes

**Sprint 3-4 (Semana 3-4): Sistema de Usuarios**
- Registro y login con Supabase Auth (@eset.edu.ar)
- Gestión de perfiles responsiva
- Dashboard usuario mobile-friendly
- Control de roles con RLS
- **Deliverable:** Autenticación completa y funcional

**Sprint 5-6 (Semana 5-6): Sistema de Noticias**
- Editor de noticias rich-text responsivo
- Categorización automática
- Full-text search con PostgreSQL
- Listado y detalle de noticias responsive
- **Deliverable:** CRUD noticias completo

**Sprint 7-8 (Semana 7-8): Foros**
- Tópicos y comentarios jerárquicos en Supabase
- Sistema de reacciones
- Notificaciones básicas
- Moderación
- **Deliverable:** Foro completamente funcional

**Sprint 9-10 (Semana 9-10): Galerías y Panel Admin**
- Galería con carrusel responsive
- Gestión de imágenes en Supabase Storage
- Dashboard administrativo
- Gestor de contenido
- **Deliverable:** Panel admin funcional

**Sprint 11-12 (Semana 11-12): Pulido y Lanzamiento**
- Testing exhaustivo (unit, integration, E2E con Playwright)
- Optimización performance (Lighthouse 90+)
- Security audit (OWASP, SQLi, XSS)
- Deployment a producción
- Documentación
- **Deliverable:** MVP en producción

### Phase 2: Mejoras Post-Lanzamiento (Semana 13-24)

**Semana 13-16:** Publicación programada, reportes avanzados, optimización imágenes WebP
**Semana 17-20:** Notificaciones push, analytics avanzados, dashboard metricas
**Semana 21-24:** Mobile app (Flutter), integraciones sociales, caché Redis

---

## 9. Riesgos y Mitigación

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|---|---|---|
| **Baja adopción inicial** | Alta | Alto | - Campaña sensibilización con docentes semana 1<br>- Incentivos: estudiantes destacados en portada<br>- Gamification (Phase 2) |
| **Resistencia cambio en admin** | Media | Medio | - Capacitación hands-on para admins 2 semanas antes<br>- Documentación video-tutorial<br>- Support directo primer mes |
| **Escalabilidad DB** | Media | Alto | - Supabase auto-scales<br>- Índices optimizados desde inicio<br>- Monitoring proactivo desde semana 1 |
| **Contenido inapropiado en foros** | Alta | Medio | - Moderación pre-publicación primeras 4 semanas<br>- AI-assisted filtering (Phase 2)<br>- Reportes de usuarios activos |
| **Performance en móvil** | Media | Medio | - Mobile-first dev desde sprint 1<br>- Lighthouse testing en cada sprint<br>- Progressive image loading con Supabase |
| **Datos comprometidos** | Baja | Crítica | - Encriptación en Supabase<br>- Penetration testing regular<br>- GDPR-compliant handling |

---

## 10. Estructura Organizativa y RACI

| Componente | Product | Engineering | Design | Admin/QA |
|-----------|---------|---|---|---|
| **Definición requerimientos** | R | C | C | A |
| **Arquitectura Supabase** | C | R | - | A |
| **Diseño Responsive** | C | C | R | A |
| **Desarrollo frontend** | - | R | C | - |
| **Desarrollo backend** | - | R | - | - |
| **Testing QA** | - | C | - | R |
| **Deployment/Infra Vercel** | - | R | - | A |
| **Capacitación usuarios** | A | - | - | R |
| **Moderación contenido** | C | - | - | R |
| **Analytics y reportes** | R | C | - | A |

**Nota:** Asignar propietario específico a cada persona según disponibilidad

---

## 11. Consideraciones de Implementación

### Dependencias Externas
- Email service: Supabase Auth (built-in)
- Image storage: Supabase Storage
- Image CDN: CloudFlare (integrado en Supabase)
- Analytics: Google Analytics 4
- Error tracking: Sentry

### Supuestos
- Estudiantes tienen acceso a email institucional @eset.edu.ar
- Infraestructura TI de ESET puede soportar Supabase
- Disponibilidad de 2 moderadores para contenido

### Out of Scope (Phase 1)
- Mobile apps nativas
- Integración LMS (Moodle/Classroom)
- Notificaciones push
- Video hosting
- Sincronización calendario académico

### Decisiones de Diseño Clave
- **Next.js + React:** Full-stack JavaScript, máxima velocity
- **Supabase:** PostgreSQL managed + Auth + Storage todo-en-uno
- **Tailwind CSS:** Responsive design consistente, mobile-first
- **Vercel:** Deploy serverless, máxima performance
- **Mobile-first:** 70% del tráfico será mobile
- **Fully responsive:** No separate mobile app, web-based única fuente

---

## 12. Definiciones y Terminología

- **Noticia:** Artículo de contenido creado por administradores
- **Tópico:** Thread en foro iniciado por estudiante
- **Comentario:** Respuesta a noticia o a otro comentario
- **Moderador:** Rol con permisos de editar/eliminar contenido de usuarios
- **Engagement:** Suma de comentarios, reacciones y participación en foros
- **MAU:** Monthly Active Users - usuarios que sesionaron al menos 1 vez en el mes
- **RLS:** Row Level Security - seguridad a nivel base de datos en Supabase

---

## 13. Aprobaciones y Revisiones

| Rol | Nombre | Firma | Fecha |
|-----|--------|-------|-------|
| Product Owner | [A Definir] | _______ | __/__/__ |
| Tech Lead | [A Definir] | _______ | __/__/__ |
| Director ESET UNQ | [A Definir] | _______ | __/__/__ |

**Historial de Revisiones:**
| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | 2025-01-XX | PRD inicial |
| 2.0 | 2025-01-XX | Actualización: Supabase, Responsive Design, SQL Queries |

---

## Anexos

### A. Wireframes y Mockups
*A incluir: Figma links o mockups*
- Homepage / Feed de noticias (mobile + desktop)
- Detalle de noticia + comentarios (responsive)
- Foro de discusión (responsive)
- Panel administrativo (desktop-focused)

### B. User Journey Maps
*A incluir para cada persona principal*

### C. Architecture Diagram
- Frontend (Next.js) ↔ Vercel API ↔ Supabase PostgreSQL + Storage

### D. API Endpoints Principales
```
News
GET    /api/news                      # Listar noticias
POST   /api/news                      # Crear (admin)
GET    /api/news/:id                  # Detalle
GET    /api/news/:id/comments         # Comentarios
POST   /api/news/:id/comments         # Crear comentario
POST   /api/comments/:id/reactions    # Reacción

Forum
GET    /api/forum/topics              # Listar tópicos
POST   /api/forum/topics              # Crear tópico
GET    /api/forum/topics/:id          # Detalle

Auth
POST   /api/auth/register             # Registro
POST   /api/auth/login                # Login
POST   /api/auth/logout               # Logout

Users
GET    /api/users/me                  # Perfil actual
PUT    /api/users/me                  # Actualizar perfil
GET    /api/users/:id                 # Perfil público

Search
GET    /api/search?q=query            # Full-text search
```

### E. Database Schema Visual
```
users ←─── news (author_id)
           ├── comments (news_id, parent_id, user_id)
           │   └── reactions (comment_id, user_id)

forum_topics (author_id) ←─── users
              └── comments (forum_topic_id, parent_id, user_id)

images (uploaded_by) ←─── users
```

---
