-- Tabla de suscripciones para notificaciones
CREATE TABLE IF NOT EXISTS forum_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
    notification_type VARCHAR(20) DEFAULT 'all', -- 'all', 'replies', 'mentions'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Un usuario solo puede tener una suscripción por post
    UNIQUE(user_id, post_id)
);

-- Crear índices
CREATE INDEX idx_forum_subscriptions_user ON forum_subscriptions(user_id);
CREATE INDEX idx_forum_subscriptions_post ON forum_subscriptions(post_id);
CREATE INDEX idx_forum_subscriptions_active ON forum_subscriptions(is_active) WHERE is_active = true;