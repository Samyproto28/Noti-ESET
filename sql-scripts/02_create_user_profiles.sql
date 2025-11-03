-- Tabla de perfiles de usuario extendidos
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(30) UNIQUE, -- Nombre de usuario único
    display_name VARCHAR(100), -- Nombre para mostrar
    avatar_url TEXT, -- URL del avatar
    bio TEXT, -- Biografía del usuario
    location VARCHAR(100), -- Ubicación
    website_url TEXT, -- Sitio web personal
    social_twitter VARCHAR(50), -- Twitter handle
    social_instagram VARCHAR(50), -- Instagram handle
    
    -- Estadísticas del usuario
    posts_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    reactions_received_count INTEGER DEFAULT 0,
    reputation_score INTEGER DEFAULT 0, -- Sistema de reputación
    
    -- Estado del usuario
    is_verified BOOLEAN DEFAULT false, -- Usuario verificado
    is_moderator BOOLEAN DEFAULT false, -- Es moderador
    is_banned BOOLEAN DEFAULT false, -- Usuario baneado
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    
    -- Configuraciones de privacidad
    show_email BOOLEAN DEFAULT false,
    show_location BOOLEAN DEFAULT true,
    allow_messages BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Crear índices
CREATE INDEX idx_user_profiles_username ON user_profiles(username);
CREATE INDEX idx_user_profiles_reputation ON user_profiles(reputation_score DESC);
CREATE INDEX idx_user_profiles_last_seen ON user_profiles(last_seen_at DESC);
CREATE INDEX idx_user_profiles_moderator ON user_profiles(is_moderator) WHERE is_moderator = true;