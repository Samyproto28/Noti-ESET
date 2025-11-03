-- Verificar que las categorías están funcionando correctamente
-- Ejecutar este script después de 08_add_specific_categories.sql

-- 1. Verificar que todas las categorías están creadas
SELECT 
    name,
    description,
    color,
    icon,
    is_active,
    post_count,
    created_at
FROM forum_categories 
WHERE is_active = true
ORDER BY name;

-- 2. Actualizar contador de posts por categoría (en caso de que haya posts existentes)
UPDATE forum_categories 
SET post_count = (
    SELECT COUNT(*) 
    FROM forum_posts 
    WHERE forum_posts.category_id = forum_categories.id 
    AND forum_posts.status = 'active'
)
WHERE is_active = true;

-- 3. Verificar estructura de forum_posts incluye category_id
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'forum_posts' 
AND column_name = 'category_id';

-- 4. Crear índice para mejorar rendimiento de queries por categoría
CREATE INDEX IF NOT EXISTS idx_forum_posts_category_id 
ON forum_posts(category_id);

-- 5. Verificar que los posts pueden ser asociados con categorías
SELECT 
    fp.title,
    fc.name as category_name,
    fc.color as category_color,
    fp.created_at
FROM forum_posts fp
LEFT JOIN forum_categories fc ON fp.category_id = fc.id
LIMIT 5;