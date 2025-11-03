-- Habilitar RLS en todas las tablas nuevas
ALTER TABLE forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas para forum_categories (públicas para leer, solo admins para escribir)
CREATE POLICY "Anyone can view categories" ON forum_categories
    FOR SELECT USING (true);

CREATE POLICY "Only authenticated users can create categories" ON forum_categories
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Only category owners can update" ON forum_categories
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Políticas para user_profiles
CREATE POLICY "Users can view all profiles" ON user_profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile" ON user_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas para forum_reactions
CREATE POLICY "Users can view all reactions" ON forum_reactions
    FOR SELECT USING (true);

CREATE POLICY "Users can create reactions" ON forum_reactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reactions" ON forum_reactions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions" ON forum_reactions
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas para forum_subscriptions
CREATE POLICY "Users can view their own subscriptions" ON forum_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subscriptions" ON forum_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" ON forum_subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions" ON forum_subscriptions
    FOR DELETE USING (auth.uid() = user_id);

-- Actualizar políticas existentes si es necesario
-- (Solo incluir si las tablas forum_posts y forum_comments no tienen RLS habilitado)

-- ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE forum_comments ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Anyone can view active posts" ON forum_posts
--     FOR SELECT USING (status = 'active');

-- CREATE POLICY "Authenticated users can create posts" ON forum_posts
--     FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- CREATE POLICY "Users can update their own posts" ON forum_posts
--     FOR UPDATE USING (auth.uid() = user_id);

-- CREATE POLICY "Users can delete their own posts" ON forum_posts
--     FOR DELETE USING (auth.uid() = user_id);

-- CREATE POLICY "Anyone can view comments" ON forum_comments
--     FOR SELECT USING (true);

-- CREATE POLICY "Authenticated users can create comments" ON forum_comments
--     FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- CREATE POLICY "Users can update their own comments" ON forum_comments
--     FOR UPDATE USING (auth.uid() = user_id);

-- CREATE POLICY "Users can delete their own comments" ON forum_comments
--     FOR DELETE USING (auth.uid() = user_id);