-- Función para actualizar contadores de reacciones
CREATE OR REPLACE FUNCTION update_reaction_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Actualizar contadores al insertar reacción
        IF NEW.post_id IS NOT NULL THEN
            IF NEW.reaction_type = 'like' THEN
                UPDATE forum_posts SET upvotes_count = upvotes_count + 1 WHERE id = NEW.post_id;
            ELSIF NEW.reaction_type = 'dislike' THEN
                UPDATE forum_posts SET downvotes_count = downvotes_count + 1 WHERE id = NEW.post_id;
            END IF;
        END IF;
        
        IF NEW.comment_id IS NOT NULL THEN
            IF NEW.reaction_type = 'like' THEN
                UPDATE forum_comments SET upvotes_count = upvotes_count + 1 WHERE id = NEW.comment_id;
            ELSIF NEW.reaction_type = 'dislike' THEN
                UPDATE forum_comments SET downvotes_count = downvotes_count + 1 WHERE id = NEW.comment_id;
            END IF;
        END IF;
        
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        -- Actualizar contadores al eliminar reacción
        IF OLD.post_id IS NOT NULL THEN
            IF OLD.reaction_type = 'like' THEN
                UPDATE forum_posts SET upvotes_count = GREATEST(upvotes_count - 1, 0) WHERE id = OLD.post_id;
            ELSIF OLD.reaction_type = 'dislike' THEN
                UPDATE forum_posts SET downvotes_count = GREATEST(downvotes_count - 1, 0) WHERE id = OLD.post_id;
            END IF;
        END IF;
        
        IF OLD.comment_id IS NOT NULL THEN
            IF OLD.reaction_type = 'like' THEN
                UPDATE forum_comments SET upvotes_count = GREATEST(upvotes_count - 1, 0) WHERE id = OLD.comment_id;
            ELSIF OLD.reaction_type = 'dislike' THEN
                UPDATE forum_comments SET downvotes_count = GREATEST(downvotes_count - 1, 0) WHERE id = OLD.comment_id;
            END IF;
        END IF;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar contadores de reacciones
DROP TRIGGER IF EXISTS trigger_update_reaction_counts ON forum_reactions;
CREATE TRIGGER trigger_update_reaction_counts
    AFTER INSERT OR DELETE ON forum_reactions
    FOR EACH ROW
    EXECUTE FUNCTION update_reaction_counts();

-- Función para actualizar contadores de categorías
CREATE OR REPLACE FUNCTION update_category_post_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE forum_categories 
        SET post_count = post_count + 1 
        WHERE id = NEW.category_id;
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        UPDATE forum_categories 
        SET post_count = GREATEST(post_count - 1, 0) 
        WHERE id = OLD.category_id;
        RETURN OLD;
    END IF;
    
    IF TG_OP = 'UPDATE' THEN
        -- Si cambió la categoría
        IF OLD.category_id IS DISTINCT FROM NEW.category_id THEN
            -- Decrementar contador de la categoría anterior
            IF OLD.category_id IS NOT NULL THEN
                UPDATE forum_categories 
                SET post_count = GREATEST(post_count - 1, 0) 
                WHERE id = OLD.category_id;
            END IF;
            -- Incrementar contador de la nueva categoría
            IF NEW.category_id IS NOT NULL THEN
                UPDATE forum_categories 
                SET post_count = post_count + 1 
                WHERE id = NEW.category_id;
            END IF;
        END IF;
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger para contadores de categorías
DROP TRIGGER IF EXISTS trigger_update_category_post_count ON forum_posts;
CREATE TRIGGER trigger_update_category_post_count
    AFTER INSERT OR UPDATE OR DELETE ON forum_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_category_post_count();

-- Función para actualizar last_activity_at en posts cuando hay nuevo comentario
CREATE OR REPLACE FUNCTION update_post_last_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE forum_posts 
        SET last_activity_at = NEW.created_at 
        WHERE id = NEW.post_id;
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar última actividad
DROP TRIGGER IF EXISTS trigger_update_post_last_activity ON forum_comments;
CREATE TRIGGER trigger_update_post_last_activity
    AFTER INSERT ON forum_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_post_last_activity();

-- Función para crear perfil de usuario automáticamente
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (user_id, username, display_name)
    VALUES (NEW.id, NULL, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para crear perfil automáticamente (si auth.users existe)
-- DROP TRIGGER IF EXISTS trigger_create_user_profile ON auth.users;
-- CREATE TRIGGER trigger_create_user_profile
--     AFTER INSERT ON auth.users
--     FOR EACH ROW
--     EXECUTE FUNCTION create_user_profile();