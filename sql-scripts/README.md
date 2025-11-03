# Scripts SQL para Supabase Dashboard

## Orden de Ejecución

Ejecuta estos scripts **en orden** en tu Supabase Dashboard (SQL Editor):

### 1. **01_create_categories.sql**
- Crea la tabla `forum_categories` con categorías por defecto
- Colores e iconos para la UI

### 2. **02_create_user_profiles.sql**  
- Crea la tabla `user_profiles` para perfiles extendidos
- Sistema de reputación y estadísticas

### 3. **03_create_reactions.sql**
- Crea la tabla `forum_reactions` para likes/dislikes
- Vista para contar reacciones eficientemente

### 4. **04_create_subscriptions.sql**
- Crea la tabla `forum_subscriptions` para notificaciones
- Suscripciones a posts específicos

### 5. **05_modify_existing_tables.sql**
- Modifica `forum_posts` y `forum_comments` existentes
- Agrega nuevas columnas sin perder datos
- Crea función para generar slugs automáticamente

### 6. **06_create_functions_triggers.sql**
- Funciones para actualizar contadores automáticamente
- Triggers para mantener consistencia de datos

### 7. **07_create_rls_policies.sql**
- Políticas de seguridad Row Level Security
- Permisos apropiados para cada tabla

## Cómo Ejecutar

1. Ve a tu Supabase Dashboard
2. Navega a "SQL Editor" 
3. Copia y pega cada script **uno por uno**
4. Haz clic en "Run" para cada script
5. Verifica que no hay errores antes de continuar al siguiente

## Verificar Instalación

Después de ejecutar todos los scripts, verifica que se crearon estas tablas:

```sql
-- Verifica que las tablas existen
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'forum_%' 
OR table_name = 'user_profiles';
```

## Datos de Prueba (Opcional)

Si quieres agregar datos de prueba para desarrollo:

```sql
-- Insertar usuario de prueba en user_profiles
INSERT INTO user_profiles (user_id, username, display_name, bio)
SELECT id, 'admin', 'Administrador', 'Perfil de administrador de prueba'
FROM auth.users LIMIT 1;
```

## Troubleshooting

**Error: tabla ya existe**
- Normal si ejecutas el script múltiples veces
- Los scripts usan `IF NOT EXISTS` para evitar errores

**Error: función ya existe**  
- Los scripts usan `CREATE OR REPLACE` para actualizar funciones

**Error de permisos**
- Asegúrate de estar ejecutando como owner de la base de datos
- Algunos triggers pueden requerir permisos de superusuario