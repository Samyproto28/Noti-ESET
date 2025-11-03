import express from 'express';
import { param } from 'express-validator';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/authMiddleware.js';
import {
  validatePost,
  validateComment,
  validateId,
  validatePostAndCommentId,
  handleValidationErrors
} from '../validators/forumValidators.js';
import {
  getPosts,
  getPost,
  createNewPost,
  updateExistingPost,
  deleteExistingPost,
  getPostComments,
  createNewComment,
  updateExistingComment,
  deleteExistingComment,
  searchForumPosts,
  createReplyToComment,
  getCommentReplies,
  getPostsCount,
  getPostCommentsCount,
  getPopularPosts
} from '../controllers/forumController.js';

const router = express.Router();

// ==================== TEMAS (POSTS) ====================

// Listar todos los temas
router.get('/posts', getPosts);

// Obtener tema por id
router.get('/posts/:id', validateId, handleValidationErrors, getPost);

// Crear tema (público)
router.post('/posts', optionalAuthMiddleware, validatePost, handleValidationErrors, createNewPost);

// Editar tema (público)
router.put('/posts/:id', optionalAuthMiddleware, validateId, validatePost, handleValidationErrors, updateExistingPost);

// Eliminar tema (público)
router.delete('/posts/:id', optionalAuthMiddleware, validateId, handleValidationErrors, deleteExistingPost);

// ==================== COMENTARIOS ====================

// Listar comentarios de un tema
router.get('/posts/:post_id/comments', [param('post_id').isUUID().withMessage('El ID del post debe ser un UUID válido')], handleValidationErrors, getPostComments);

// Crear comentario (público)
router.post('/posts/:post_id/comments', optionalAuthMiddleware, [param('post_id').isUUID().withMessage('El ID del post debe ser un UUID válido')], validateComment, handleValidationErrors, createNewComment);

// Editar comentario (público)
router.put('/posts/:post_id/comments/:comment_id', optionalAuthMiddleware, validatePostAndCommentId, validateComment, handleValidationErrors, updateExistingComment);

// Eliminar comentario (público)
router.delete('/posts/:post_id/comments/:comment_id', optionalAuthMiddleware, validatePostAndCommentId, handleValidationErrors, deleteExistingComment);

// ==================== BÚSQUEDA ====================

// Buscar posts
router.get('/search', searchForumPosts);

// ==================== REPLIES ====================

// Crear respuesta a comentario (público)
router.post('/comments/:comment_id/replies', optionalAuthMiddleware, validateComment, handleValidationErrors, createReplyToComment);

// Obtener respuestas de un comentario específico
router.get('/comments/:comment_id/replies', [param('comment_id').isUUID().withMessage('El ID del comentario debe ser un UUID válido')], handleValidationErrors, getCommentReplies);

// Endpoints optimizados para conteos
router.get('/posts/count', getPostsCount);
router.get('/posts/:post_id/comments/count', [param('post_id').isUUID().withMessage('El ID del post debe ser un UUID válido')], handleValidationErrors, getPostCommentsCount);

// Endpoint para posts populares
router.get('/posts/popular', getPopularPosts);

export default router;