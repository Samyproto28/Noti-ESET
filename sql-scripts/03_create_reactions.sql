-- Tabla de reacciones (likes, dislikes, emojis) para posts y comentarios
CREATE TABLE IF NOT EXISTS forum_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES forum_comments(id) ON DELETE CASCADE,
    reaction_type VARCHAR(20) NOT NULL DEFAULT 'like', -- 'like', 'dislike', 'love', 'laugh', 'angry', 'wow', 'sad'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Constraint: debe reaccionar a un post O a un comentario, no ambos
    CONSTRAINT check_post_or_comment CHECK (
        (post_id IS NOT NULL AND comment_id IS NULL) OR 
        (post_id IS NULL AND comment_id IS NOT NULL)
    ),
    
    -- Constraint: un usuario solo puede tener una reacción por post/comentario
    CONSTRAINT unique_user_post_reaction UNIQUE (user_id, post_id),
    CONSTRAINT unique_user_comment_reaction UNIQUE (user_id, comment_id)
);

-- Crear índices para performance
CREATE INDEX idx_forum_reactions_post ON forum_reactions(post_id, reaction_type);
CREATE INDEX idx_forum_reactions_comment ON forum_reactions(comment_id, reaction_type);
CREATE INDEX idx_forum_reactions_user ON forum_reactions(user_id);

-- Crear vista para contar reacciones por tipo
CREATE OR REPLACE VIEW forum_reaction_counts AS
SELECT 
    'post' as content_type,
    post_id as content_id,
    reaction_type,
    COUNT(*) as count
FROM forum_reactions 
WHERE post_id IS NOT NULL
GROUP BY post_id, reaction_type

UNION ALL

SELECT 
    'comment' as content_type,
    comment_id as content_id,
    reaction_type,
    COUNT(*) as count
FROM forum_reactions 
WHERE comment_id IS NOT NULL
GROUP BY comment_id, reaction_type;