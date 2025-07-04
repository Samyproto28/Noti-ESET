const express = require('express');
const { getAllNews, getNewsById, createNews, updateNews, deleteNews } = require('../services/newsService');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Listar todas las noticias
router.get('/', async (req, res) => {
  const { data, error } = await getAllNews();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Obtener noticia por id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const { data, error } = await getNewsById(id);
  if (error || !data) return res.status(404).json({ error: 'Noticia no encontrada' });
  res.json(data);
});

// Crear noticia (protegido)
router.post('/', authMiddleware, async (req, res) => {
  const { title, content, image_url } = req.body;
  const user_id = req.user.id;
  if (!title || !content) return res.status(400).json({ error: 'Título y contenido requeridos' });
  const { data, error } = await createNews({ title, content, image_url, user_id });
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// Actualizar noticia (protegido, solo autor)
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { title, content, image_url } = req.body;
  const user_id = req.user.id;
  // Verificar autoría
  const { data: noticia, error: errorGet } = await getNewsById(id);
  if (errorGet || !noticia) return res.status(404).json({ error: 'Noticia no encontrada' });
  if (noticia.user_id !== user_id) return res.status(403).json({ error: 'No autorizado' });
  const { data, error } = await updateNews(id, { title, content, image_url });
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Eliminar noticia (protegido, solo autor)
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;
  // Verificar autoría
  const { data: noticia, error: errorGet } = await getNewsById(id);
  if (errorGet || !noticia) return res.status(404).json({ error: 'Noticia no encontrada' });
  if (noticia.user_id !== user_id) return res.status(403).json({ error: 'No autorizado' });
  const { error } = await deleteNews(id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Noticia eliminada' });
});

module.exports = router; 