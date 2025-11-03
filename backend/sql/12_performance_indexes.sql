-- Índices adicionales para optimizar el rendimiento del foro
-- Ejecutar este script en Supabase SQL Editor

-- Índices compuestos para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_forum_posts_status_category ON forum_posts(status, category_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_status_last_activity ON forum_posts(status, last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_posts_status_views ON forum_posts(status, views_count DESC);
CREATE INDEX IF NOT EXISTS idx_forum_posts_status_upvotes ON forum_posts(status, upvotes_count DESC);

-- Índices para búsqueda de texto completo (si se implementa)
CREATE INDEX IF NOT EXISTS idx_forum_posts_title_gin ON forum_posts USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_forum_posts_content_gin ON forum_posts USING gin(to_tsvector('english', content));

-- Índices para comentarios anidados
CREATE INDEX IF NOT EXISTS idx_forum_comments_post_level ON forum_comments(post_id, level);
CREATE INDEX IF NOT EXISTS idx_forum_comments_parent_created ON forum_comments(parent_comment_id, created_at);

-- Índices para reacciones
CREATE INDEX IF NOT EXISTS idx_forum_reactions_post_type ON forum_reactions(post_id, reaction_type);
CREATE INDEX IF NOT EXISTS idx_forum_reactions_comment_type ON forum_reactions(comment_id, reaction_type);

-- Índices para usuarios
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_display_name ON user_profiles(display_name);

-- Índices para categorías
CREATE INDEX IF NOT EXISTS idx_forum_categories_active_post_count ON forum_categories(is_active, post_count DESC);

-- Función para limpiar índices no utilizados (ejecutar periódicamente)
CREATE OR REPLACE FUNCTION cleanup_unused_indexes()
RETURNS TABLE(indexname TEXT, tablename TEXT) AS $$
BEGIN
    -- Esta función identificaría índices no utilizados
    -- Nota: Requiere permisos de administrador y acceso a pg_stat_user_indexes
    RETURN QUERY
    SELECT 
        schemaname || '.' || indexname AS indexname,
        schemaname || '.' || tablename AS tablename
    FROM pg_stat_user_indexes
    WHERE idx_scan = 0  -- Índices nunca utilizados
    AND schemaname = 'public'
    AND indexname NOT LIKE '%_pkey';  -- No eliminar claves primarias
END;
$$ LANGUAGE plpgsql;

-- Función para analizar el rendimiento de consultas
CREATE OR REPLACE FUNCTION analyze_query_performance()
RETURNS TABLE(query TEXT, calls INTEGER, total_time DOUBLE PRECISION, mean_time DOUBLE PRECISION) AS $$
BEGIN
    -- Esta función analizaría las consultas más lentas
    -- Nota: Requiere permisos de administrador y acceso a pg_stat_statements
    RETURN QUERY
    SELECT 
        query,
        calls,
        total_time,
        mean_time
    FROM pg_stat_statements
    WHERE calls > 10  -- Solo consultas ejecutadas al menos 10 veces
    ORDER BY mean_time DESC
    LIMIT 20;  -- Top 20 consultas más lentas
END;
$$ LANGUAGE plpgsql;

-- Vista para monitorear el tamaño de las tablas
CREATE OR REPLACE VIEW forum_table_sizes AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE 'forum_%'
ORDER BY size_bytes DESC;

-- Vista para monitorear el crecimiento de las tablas
CREATE OR REPLACE VIEW forum_table_growth AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS current_size,
    extract(epoch from now()) - extract(epoch from stats_reset) AS seconds_since_reset,
    (pg_total_relation_size(schemaname||'.'||tablename) / 
     NULLIF(extract(epoch from now()) - extract(epoch from stats_reset), 0)) AS bytes_per_second
FROM pg_stat_user_tables
WHERE schemaname = 'public'
AND tablename LIKE 'forum_%'
ORDER BY bytes_per_second DESC NULLS LAST;

-- Función para actualizar estadísticas de la base de datos
CREATE OR REPLACE FUNCTION update_forum_statistics()
RETURNS void AS $$
BEGIN
    -- Actualizar estadísticas de las tablas del foro
    ANALYZE forum_posts;
    ANALYZE forum_comments;
    ANALYZE forum_categories;
    ANALYZE forum_reactions;
    ANALYZE user_profiles;
    
    -- Registrar en log
    RAISE NOTICE 'Estadísticas del foro actualizadas: %', now();
END;
$$ LANGUAGE plpgsql;

-- Programar actualización de estadísticas (requiere pg_cron)
-- SELECT cron.schedule('update-forum-stats', '0 3 * * *', 'SELECT update_forum_statistics();');

-- Crear función para optimizar consultas de paginación
CREATE OR REPLACE FUNCTION get_posts_with_pagination(
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_category_id UUID DEFAULT NULL,
    p_sort_by TEXT DEFAULT 'last_activity_at',
    p_sort_order TEXT DEFAULT 'desc'
)
RETURNS TABLE(
    posts JSON,
    total_count INTEGER
) AS $$
DECLARE
    v_total_count INTEGER;
    v_posts JSON;
BEGIN
    -- Contar total de posts
    SELECT COUNT(*)
    INTO v_total_count
    FROM forum_posts
    WHERE status = 'active'
    AND (p_category_id IS NULL OR category_id = p_category_id);
    
    -- Obtener posts paginados
    SELECT json_agg(
        json_build_object(
            'id', id,
            'title', title,
            'content', content,
            'slug', slug,
            'user_id', user_id,
            'category_id', category_id,
            'status', status,
            'is_pinned', is_pinned,
            'is_locked', is_locked,
            'views_count', views_count,
            'upvotes_count', upvotes_count,
            'downvotes_count', downvotes_count,
            'created_at', created_at,
            'updated_at', updated_at,
            'last_activity_at', last_activity_at,
            'tags', tags,
            'image_url', image_url
        )
    )
    INTO v_posts
    FROM forum_posts
    WHERE status = 'active'
    AND (p_category_id IS NULL OR category_id = p_category_id)
    ORDER BY 
        CASE 
            WHEN p_sort_by = 'created_at' AND p_sort_order = 'asc' THEN created_at
            WHEN p_sort_by = 'created_at' AND p_sort_order = 'desc' THEN created_at
            WHEN p_sort_by = 'updated_at' AND p_sort_order = 'asc' THEN updated_at
            WHEN p_sort_by = 'updated_at' AND p_sort_order = 'desc' THEN updated_at
            WHEN p_sort_by = 'title' AND p_sort_order = 'asc' THEN title
            WHEN p_sort_by = 'title' AND p_sort_order = 'desc' THEN title
            WHEN p_sort_by = 'last_activity_at' AND p_sort_order = 'asc' THEN last_activity_at
            WHEN p_sort_by = 'last_activity_at' AND p_sort_order = 'desc' THEN last_activity_at
            WHEN p_sort_by = 'views_count' AND p_sort_order = 'asc' THEN views_count
            WHEN p_sort_by = 'views_count' AND p_sort_order = 'desc' THEN views_count
            WHEN p_sort_by = 'upvotes_count' AND p_sort_order = 'asc' THEN upvotes_count
            WHEN p_sort_by = 'upvotes_count' AND p_sort_order = 'desc' THEN upvotes_count
            ELSE last_activity_at
        END
    CASE 
            WHEN p_sort_order = 'asc' THEN ASC
            ELSE DESC
        END
    LIMIT p_limit
    OFFSET p_offset;
    
    RETURN QUERY SELECT v_posts, v_total_count;
END;
$$ LANGUAGE plpgsql;