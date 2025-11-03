-- Crear tabla de perfiles de usuario si no existe y usuario anónimo
-- Ejecutar este script en Supabase SQL Editor

-- Verificar si la tabla user_profiles existe
DO $$ 
BEGIN
    -- Crear tabla si no existe
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
        CREATE TABLE user_profiles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            username TEXT UNIQUE NOT NULL,
            display_name TEXT,
            avatar_url TEXT,
            bio TEXT,
            reputation_points INTEGER DEFAULT 0,
            posts_count INTEGER DEFAULT 0,
            comments_count INTEGER DEFAULT 0,
            reactions_given_count INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- RLS para seguridad
        ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
        
        -- Política para permitir lectura pública
        CREATE POLICY "Public profiles are viewable by everyone" ON user_profiles
            FOR SELECT USING (true);
            
        -- Política para permitir inserts públicos (para el usuario anónimo)
        CREATE POLICY "Anyone can insert user profiles" ON user_profiles
            FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- Insertar usuario anónimo
INSERT INTO user_profiles (
    id,
    username,
    display_name,
    avatar_url,
    bio,
    reputation_points,
    posts_count,
    comments_count,
    reactions_given_count,
    is_active
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'anonimo',
    'Usuario Anónimo',
    NULL,
    'Usuario anónimo del foro público',
    0,
    0,
    0,
    0,
    true
)
ON CONFLICT (id) DO NOTHING;

-- Verificar que se creó correctamente
SELECT 
    id,
    username,
    display_name,
    bio,
    is_active
FROM user_profiles 
WHERE id = '00000000-0000-0000-0000-000000000000';