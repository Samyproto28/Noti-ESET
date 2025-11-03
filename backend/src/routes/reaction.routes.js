import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  validateReaction,
  validatePostId,
  validateCommentId,
  validatePaginationQuery,
  validateTrendingQuery,
  handleValidationErrors
} from '../validators/reactionValidators.js';
import {
  togglePostReaction,
  toggleCommentReaction,
  getPostReactionsList,
  getCommentReactionsList,
  getPostReactionCountsList,
  getCommentReactionCountsList,
  getUserPostReaction,
  getUserCommentReaction,
  getMyReactions,
  removePostReaction,
  removeCommentReaction,
  getTrendingPosts,
  getReactionTypes
} from '../controllers/reactionController.js';

const router = express.Router();

// ==================== RUTAS PÚBLICAS ====================

// Obtener tipos de reacciones disponibles
router.get('/types', getReactionTypes);

// Obtener posts trending por reacciones
router.get('/trending', validateTrendingQuery, handleValidationErrors, getTrendingPosts);

// Obtener reacciones de un post específico
router.get('/posts/:postId', validatePostId, handleValidationErrors, getPostReactionsList);

// Obtener conteos de reacciones de un post
router.get('/posts/:postId/counts', validatePostId, handleValidationErrors, getPostReactionCountsList);

// Obtener reacciones de un comentario específico
router.get('/comments/:commentId', validateCommentId, handleValidationErrors, getCommentReactionsList);

// Obtener conteos de reacciones de un comentario
router.get('/comments/:commentId/counts', validateCommentId, handleValidationErrors, getCommentReactionCountsList);

// ==================== RUTAS PÚBLICAS (REACCIONES) ====================

// Obtener todas las reacciones del usuario (público - opcional userId en query)
router.get('/me', validatePaginationQuery, handleValidationErrors, getMyReactions);

// Obtener reacción específica del usuario para un post (público)
router.get('/posts/:postId/me', 
  validatePostId, 
  handleValidationErrors, 
  getUserPostReaction
);

// Obtener reacción específica del usuario para un comentario (público)
router.get('/comments/:commentId/me', 
  validateCommentId, 
  handleValidationErrors, 
  getUserCommentReaction
);

// Toggle reacción en post (público)
router.post('/posts/:postId', 
  validatePostId, 
  validateReaction, 
  handleValidationErrors, 
  togglePostReaction
);

// Toggle reacción en comentario (público)
router.post('/comments/:commentId', 
  validateCommentId, 
  validateReaction, 
  handleValidationErrors, 
  toggleCommentReaction
);

// Eliminar reacción específica de post (público)
router.delete('/posts/:postId', 
  validatePostId, 
  handleValidationErrors, 
  removePostReaction
);

// Eliminar reacción específica de comentario (público)
router.delete('/comments/:commentId', 
  validateCommentId, 
  handleValidationErrors, 
  removeCommentReaction
);

export default router;