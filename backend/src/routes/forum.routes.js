const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  getAllPosts, getPostById, createPost, updatePost, deletePost,
  getCommentsByPost, createComment, updateComment, deleteComment
} = require('../services/forumService');

const router = express.Router();

// ==================== TEMAS (POSTS) ====================

// Listar todos los temas
router.get('/posts', async (req, res) => {
  const { data, error } = await getAllPosts();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Obtener tema por id
router.get('/posts/:id', async (req, res) => {
  const { id } = req.params;
  const { data, error } = await getPostById(id);
  if (error || !data) return res.status(404).json({ error: 'Tema no encontrado' });
  res.json(data);
});

// Crear tema (protegido)
router.post('/posts', authMiddleware, async (req, res) => {
  const { title, content } = req.body;
  const user_id = req.user.id;
  if (!title || !content) return res.status(400).json({ error: 'Título y contenido requeridos' });
  const { data, error } = await createPost({ title, content, user_id });
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// Editar tema (solo autor)
router.put('/posts/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;
  const user_id = req.user.id;
  const { data: post, error: errorGet } = await getPostById(id);
  if (errorGet || !post) return res.status(404).json({ error: 'Tema no encontrado' });
  if (post.user_id !== user_id) return res.status(403).json({ error: 'No autorizado' });
  const { data, error } = await updatePost(id, { title, content });
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Eliminar tema (solo autor)
router.delete('/posts/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;
  const { data: post, error: errorGet } = await getPostById(id);
  if (errorGet || !post) return res.status(404).json({ error: 'Tema no encontrado' });
  if (post.user_id !== user_id) return res.status(403).json({ error: 'No autorizado' });
  const { error } = await deletePost(id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Tema eliminado' });
});

// ==================== COMENTARIOS ====================

// Listar comentarios de un tema
router.get('/posts/:post_id/comments', async (req, res) => {
  const { post_id } = req.params;
  const { data, error } = await getCommentsByPost(post_id);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Crear comentario (protegido)
router.post('/posts/:post_id/comments', authMiddleware, async (req, res) => {
  const { post_id } = req.params;
  const { content } = req.body;
  const user_id = req.user.id;
  if (!content) return res.status(400).json({ error: 'Contenido requerido' });
  // Verificar que el post existe
  const { data: post, error: errorPost } = await getPostById(post_id);
  if (errorPost || !post) return res.status(404).json({ error: 'Tema no encontrado' });
  const { data, error } = await createComment({ post_id, content, user_id });
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// Editar comentario (solo autor)
router.put('/posts/:post_id/comments/:comment_id', authMiddleware, async (req, res) => {
  const { comment_id } = req.params;
  const { content } = req.body;
  const user_id = req.user.id;
  const { data: comment, error: errorGet } = await getCommentsByPost(req.params.post_id);
  const commentObj = Array.isArray(comment) ? comment.find(c => c.id === comment_id) : comment;
  if (!commentObj || commentObj.user_id !== user_id) return res.status(403).json({ error: 'No autorizado o comentario no encontrado' });
  const { data, error } = await updateComment(comment_id, { content });
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Eliminar comentario (solo autor)
router.delete('/posts/:post_id/comments/:comment_id', authMiddleware, async (req, res) => {
  const { comment_id } = req.params;
  const user_id = req.user.id;
  const { data: comment, error: errorGet } = await getCommentsByPost(req.params.post_id);
  const commentObj = Array.isArray(comment) ? comment.find(c => c.id === comment_id) : comment;
  if (!commentObj || commentObj.user_id !== user_id) return res.status(403).json({ error: 'No autorizado o comentario no encontrado' });
  const { error } = await deleteComment(comment_id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Comentario eliminado' });
});

module.exports = router; 