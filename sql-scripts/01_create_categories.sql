-- Tabla de categorías para organizar los posts del foro
CREATE TABLE IF NOT EXISTS forum_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Color hex para la UI
    icon VARCHAR(50) DEFAULT 'chat', -- Nombre del icono
    post_count INTEGER DEFAULT 0, -- Contador de posts
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insertar categorías por defecto
INSERT INTO forum_categories (name, description, color, icon) VALUES 
('General', 'Discusiones generales sobre ESET UNQ', '#3B82F6', 'chat'),
('Trámites', 'Consultas sobre trámites administrativos', '#F59E0B', 'document'),
('Eventos', 'Anuncios y discusiones sobre eventos', '#10B981', 'calendar'),
('Inscripciones', 'Información sobre inscripciones', '#8B5CF6', 'user-plus'),
('Ayuda', 'Ayuda técnica y soporte', '#EF4444', 'help-circle'),
('Anuncios', 'Anuncios oficiales importantes', '#F97316', 'megaphone');

-- Crear índices para mejorar performance
CREATE INDEX idx_forum_categories_active ON forum_categories(is_active);
CREATE INDEX idx_forum_categories_name ON forum_categories(name);