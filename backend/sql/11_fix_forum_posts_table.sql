-- Arreglar tabla forum_posts para el foro público
-- Ejecutar este script en Supabase SQL Editor

-- Agregar campo updated_at si no existe
ALTER TABLE forum_posts 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Crear o actualizar función de trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear trigger para updated_at si no existe
DROP TRIGGER IF EXISTS update_forum_posts_updated_at ON forum_posts;
CREATE TRIGGER update_forum_posts_updated_at
    BEFORE UPDATE ON forum_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Verificar estructura de la tabla
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'forum_posts'
AND table_schema = 'public'
ORDER BY ordinal_position;