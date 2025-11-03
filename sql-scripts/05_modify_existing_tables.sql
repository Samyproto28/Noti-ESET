-- Modificar tabla forum_posts para agregar nuevas columnas
ALTER TABLE forum_posts 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES forum_categories(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active', -- 'active', 'hidden', 'deleted', 'pending'
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false, -- Post fijado
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false, -- Post cerrado a comentarios
ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0, -- Contador de vistas
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
ADD COLUMN IF NOT EXISTS slug VARCHAR(200), -- URL amigable
ADD COLUMN IF NOT EXISTS tags TEXT[], -- Array de tags
ADD COLUMN IF NOT EXISTS image_url TEXT, -- Imagen del post
ADD COLUMN IF NOT EXISTS upvotes_count INTEGER DEFAULT 0, -- Cache de upvotes
ADD COLUMN IF NOT EXISTS downvotes_count INTEGER DEFAULT 0; -- Cache de downvotes

-- Modificar tabla forum_comments para soportar replies anidadas
ALTER TABLE forum_comments 
ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES forum_comments(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 0, -- Nivel de anidamiento (0=comentario principal)
ADD COLUMN IF NOT EXISTS path TEXT, -- Path para jerarquía (ej: "1.3.7")
ADD COLUMN IF NOT EXISTS upvotes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS downvotes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE;

-- Crear índices para las nuevas columnas
CREATE INDEX IF NOT EXISTS idx_forum_posts_category ON forum_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_status ON forum_posts(status);
CREATE INDEX IF NOT EXISTS idx_forum_posts_pinned ON forum_posts(is_pinned) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_forum_posts_last_activity ON forum_posts(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_posts_views ON forum_posts(views_count DESC);
CREATE INDEX IF NOT EXISTS idx_forum_posts_slug ON forum_posts(slug) WHERE slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_forum_comments_parent ON forum_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_forum_comments_level ON forum_comments(level);
CREATE INDEX IF NOT EXISTS idx_forum_comments_path ON forum_comments(path);

-- Actualizar posts existentes con categoría por defecto "General"
UPDATE forum_posts 
SET category_id = (SELECT id FROM forum_categories WHERE name = 'General' LIMIT 1)
WHERE category_id IS NULL;

-- Función para generar slug automáticamente
CREATE OR REPLACE FUNCTION generate_slug(title TEXT) 
RETURNS TEXT AS $$
BEGIN
    RETURN lower(
        regexp_replace(
            regexp_replace(title, '[^a-zA-Z0-9\s]', '', 'g'), 
            '\s+', '-', 'g'
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar slug automáticamente
CREATE OR REPLACE FUNCTION update_post_slug()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slug IS NULL THEN
        NEW.slug := generate_slug(NEW.title);
    END IF;
    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_post_slug ON forum_posts;
CREATE TRIGGER trigger_update_post_slug
    BEFORE INSERT OR UPDATE ON forum_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_post_slug();