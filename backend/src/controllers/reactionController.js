import {
  REACTION_TYPES,
  toggleReaction,
  getPostReactions,
  getCommentReactions,
  getPostReactionCounts,
  getCommentReactionCounts,
  getUserReaction,
  getUserReactions,
  removeReaction,
  getMostReactedPosts
} from '../services/reactionService.js';
import ApiResponse from '../utils/responseHelper.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// Toggle reacción en post (público)
const togglePostReaction = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { reactionType = 'like' } = req.body;
  
  // Usuario anónimo para reacciones públicas
  const userId = '00000000-0000-0000-0000-000000000000';

  try {
    const { data, error } = await toggleReaction(userId, { 
      postId, 
      reactionType 
    });

    if (error) {
      return res.status(400).json(ApiResponse.error(error.message));
    }

    let message = 'Reacción procesada exitosamente';
    if (data.action === 'created') message = 'Reacción agregada';
    if (data.action === 'updated') message = 'Reacción actualizada';
    if (data.action === 'removed') message = 'Reacción eliminada';

    res.json(ApiResponse.success(data, message));
  } catch (error) {
    return res.status(400).json(ApiResponse.error(error.message));
  }
});

// Toggle reacción en comentario (público)
const toggleCommentReaction = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { reactionType = 'like' } = req.body;
  
  // Usuario anónimo para reacciones públicas
  const userId = '00000000-0000-0000-0000-000000000000';

  try {
    const { data, error } = await toggleReaction(userId, { 
      commentId, 
      reactionType 
    });

    if (error) {
      return res.status(400).json(ApiResponse.error(error.message));
    }

    let message = 'Reacción procesada exitosamente';
    if (data.action === 'created') message = 'Reacción agregada';
    if (data.action === 'updated') message = 'Reacción actualizada';
    if (data.action === 'removed') message = 'Reacción eliminada';

    res.json(ApiResponse.success(data, message));
  } catch (error) {
    return res.status(400).json(ApiResponse.error(error.message));
  }
});

// Obtener reacciones de un post
const getPostReactionsList = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { data, error } = await getPostReactions(postId);

  if (error) {
    return res.status(500).json(ApiResponse.error(error.message));
  }

  res.json(ApiResponse.success(data, 'Reacciones de post obtenidas exitosamente'));
});

// Obtener reacciones de un comentario
const getCommentReactionsList = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { data, error } = await getCommentReactions(commentId);

  if (error) {
    return res.status(500).json(ApiResponse.error(error.message));
  }

  res.json(ApiResponse.success(data, 'Reacciones de comentario obtenidas exitosamente'));
});

// Obtener conteo de reacciones de un post
const getPostReactionCountsList = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { data, error } = await getPostReactionCounts(postId);

  if (error) {
    return res.status(500).json(ApiResponse.error(error.message));
  }

  res.json(ApiResponse.success(data, 'Conteos de reacciones obtenidos exitosamente'));
});

// Obtener conteo de reacciones de un comentario
const getCommentReactionCountsList = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { data, error } = await getCommentReactionCounts(commentId);

  if (error) {
    return res.status(500).json(ApiResponse.error(error.message));
  }

  res.json(ApiResponse.success(data, 'Conteos de reacciones obtenidos exitosamente'));
});

// Obtener reacción específica del usuario autenticado
const getUserPostReaction = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.id;

  const { data, error } = await getUserReaction(userId, { postId });

  if (error) {
    return res.status(500).json(ApiResponse.error(error.message));
  }

  res.json(ApiResponse.success(data, 'Reacción del usuario obtenida'));
});

// Obtener reacción específica del usuario en comentario
const getUserCommentReaction = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user.id;

  const { data, error } = await getUserReaction(userId, { commentId });

  if (error) {
    return res.status(500).json(ApiResponse.error(error.message));
  }

  res.json(ApiResponse.success(data, 'Reacción del usuario obtenida'));
});

// Obtener todas las reacciones del usuario autenticado
const getMyReactions = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { limit = 50, offset = 0 } = req.query;

  const { data, error } = await getUserReactions(userId, {
    limit: parseInt(limit),
    offset: parseInt(offset)
  });

  if (error) {
    return res.status(500).json(ApiResponse.error(error.message));
  }

  res.json(ApiResponse.success({
    reactions: data,
    pagination: {
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: data.length === parseInt(limit)
    }
  }, 'Reacciones del usuario obtenidas'));
});

// Eliminar reacción específica
const removePostReaction = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.id;

  const { error } = await removeReaction(userId, { postId });

  if (error) {
    return res.status(400).json(ApiResponse.error(error.message));
  }

  res.json(ApiResponse.success(null, 'Reacción eliminada exitosamente'));
});

// Eliminar reacción de comentario
const removeCommentReaction = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user.id;

  const { error } = await removeReaction(userId, { commentId });

  if (error) {
    return res.status(400).json(ApiResponse.error(error.message));
  }

  res.json(ApiResponse.success(null, 'Reacción eliminada exitosamente'));
});

// Obtener posts más reaccionados
const getTrendingPosts = asyncHandler(async (req, res) => {
  const { limit = 10, timeframe = 'week' } = req.query;

  const { data, error } = await getMostReactedPosts({
    limit: parseInt(limit),
    timeframe
  });

  if (error) {
    return res.status(500).json(ApiResponse.error(error.message));
  }

  res.json(ApiResponse.success(data, 'Posts trending obtenidos exitosamente'));
});

// Obtener tipos de reacciones disponibles
const getReactionTypes = asyncHandler(async (req, res) => {
  res.json(ApiResponse.success(REACTION_TYPES, 'Tipos de reacciones disponibles'));
});

export {
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
};