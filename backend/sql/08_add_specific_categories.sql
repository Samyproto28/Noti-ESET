-- Agregar categorías específicas para el foro ESET
-- Ejecutar este script en Supabase SQL Editor

INSERT INTO forum_categories (name, description, color, icon, is_active) VALUES
('comida', 'Discusiones sobre comida, buffet, kiosco y opciones gastronómicas en ESET', '#FF6B35', '🍔', true),
('clases', 'Información sobre horarios, aulas, cambios de clases y materias', '#4ECDC4', '📚', true),
('profesores', 'Comentarios y consultas sobre profesores y su metodología', '#45B7D1', '👨‍🏫', true),
('novedades', 'Noticias importantes, anuncios oficiales y novedades de ESET', '#96CEB4', '📢', true),
('mesas-de-examen', 'Información sobre fechas, inscripciones y consultas de mesas de examen', '#FFEAA7', '📝', true),
('actividades', 'Eventos, talleres, actividades extracurriculares y propuestas estudiantiles', '#DDA0DD', '🎯', true);

-- Verificar que se crearon correctamente
SELECT * FROM forum_categories WHERE name IN ('comida', 'clases', 'profesores', 'novedades', 'mesas-de-examen', 'actividades');