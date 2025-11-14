import {
  getAllPosts, getPostById, createPost, updatePost, deletePost,
  getCommentsByPost, getCommentById, createComment, createReply, updateComment, deleteComment, searchPosts,
  countPosts, countCommentsByPost, getPopularPosts,
  validatePostData, validateCommentData
} from '../services/forumService.js';
import { getUserIdForForum } from '../services/userService.js';
import ApiResponse from '../utils/responseHelper.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { isValidUserId } from '../utils/uuidValidator.js';

// ==================== POSTS ====================

// Listar todos los posts
const getPosts = asyncHandler(async (req, res) => {
  const { limit = 20, offset = 0, categoryId, sortBy = 'last_activity_at', sortOrder = 'desc' } = req.query;
  
  const { data, error, cacheHeaders } = await getAllPosts({
    limit: parseInt(limit),
    offset: parseInt(offset),
    categoryId,
    sortBy,
    sortOrder
  });
  
  if (error) {
    return res.status(500).json(ApiResponse.error(error.message));
  }

  // Establecer headers de caché si están disponibles
  if (cacheHeaders) {
    if (cacheHeaders['Cache-Control']) {
      res.set('Cache-Control', cacheHeaders['Cache-Control']);
    }
    if (cacheHeaders['ETag']) {
      res.set('ETag', cacheHeaders['ETag']);
    }
  }

  // Obtener conteo total para paginación precisa
  const { count: totalCount, error: countError } = await countPosts({ categoryId });
  
  if (!countError) {
    res.set('X-Total-Count', totalCount.toString());
  }

  res.json(ApiResponse.success(data, 'Posts obtenidos exitosamente'));
});

// Obtener post por ID
const getPost = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { data, error } = await getPostById(id);
  
  if (error || !data) {
    return res.status(404).json(ApiResponse.notFound('Post'));
  }

  res.json(ApiResponse.success(data, 'Post obtenido exitosamente'));
});

// Crear nuevo post (público)
const createNewPost = asyncHandler(async (req, res) => {
  const { title, content, category_id } = req.body;
  
  // Validar datos de entrada
  const validation = validatePostData({ title, content, category_id });
  if (!validation.isValid) {
    return res.status(400).json(ApiResponse.error(validation.errors.join(', ')));
  }
  
  // Obtener ID de usuario (anónimo para foro público)
  const user_id = getUserIdForForum(req.user?.id);

  const { data, error } = await createPost({ 
    title, 
    content, 
    category_id, 
    user_id 
  });
  
  if (error) {
    return res.status(400).json(ApiResponse.error(error.message));
  }

  res.status(201).json(ApiResponse.created(data, 'Post creado exitosamente'));
});

// Actualizar post
const updateExistingPost = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, content, category_id } = req.body;

  // Validar que el ID sea un UUID válido
  if (!isValidUserId(id)) {
    return res.status(400).json(ApiResponse.error('ID de post inválido'));
  }

  // Verificar que existe el post
  const { data: post, error: errorGet } = await getPostById(id);
  if (errorGet || !post) {
    return res.status(404).json(ApiResponse.notFound('Post'));
  }

  const { data, error } = await updatePost(id, { title, content, category_id });
  if (error) {
    return res.status(400).json(ApiResponse.error(error.message));
  }

  res.json(ApiResponse.success(data, 'Post actualizado exitosamente'));
});

// Eliminar post (público)
const deleteExistingPost = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validar que el ID sea un UUID válido
  if (!isValidUserId(id)) {
    return res.status(400).json(ApiResponse.error('ID de post inválido'));
  }

  // Verificar que existe el post
  const { data: post, error: errorGet } = await getPostById(id);
  if (errorGet || !post) {
    return res.status(404).json(ApiResponse.notFound('Post'));
  }

  const { error } = await deletePost(id);
  if (error) {
    return res.status(400).json(ApiResponse.error(error.message));
  }

  res.json(ApiResponse.success(null, 'Post eliminado exitosamente'));
});

// ==================== COMMENTS ====================

// Obtener comentarios de un post
const getPostComments = asyncHandler(async (req, res) => {
  const { post_id } = req.params;
  const { level = 0, limit = 50 } = req.query;
  
  // Validar que el ID sea un UUID válido
  if (!isValidUserId(post_id)) {
    return res.status(400).json(ApiResponse.error('ID de post inválido'));
  }
  
  const { data, error } = await getCommentsByPost(post_id, {
    includeReplies: true,
    level: parseInt(level),
    limit: parseInt(limit)
  });
  
  if (error) {
    return res.status(500).json(ApiResponse.error(error.message));
  }

  // Establecer headers de caché para comentarios (menos tiempo que posts)
  res.set('Cache-Control', 'public, max-age=60'); // 1 minuto

  res.json(ApiResponse.success(data, 'Comentarios obtenidos exitosamente'));
});

// Crear comentario (público)
const createNewComment = asyncHandler(async (req, res) => {
  const { post_id } = req.params;
  const { content } = req.body;
  
  // Validar que el ID sea un UUID válido
  if (!isValidUserId(post_id)) {
    return res.status(400).json(ApiResponse.error('ID de post inválido'));
  }
  
  // Validar datos de entrada
  const validation = validateCommentData({ content });
  if (!validation.isValid) {
    return res.status(400).json(ApiResponse.error(validation.errors.join(', ')));
  }
  
  // Obtener ID de usuario (anónimo para foro público)
  const user_id = getUserIdForForum(req.user?.id);

  // Verificar que el post existe
  const { data: post, error: errorPost } = await getPostById(post_id);
  if (errorPost || !post) {
    return res.status(404).json(ApiResponse.notFound('Post'));
  }

  const { data, error } = await createComment({ post_id, content, user_id });
  if (error) {
    return res.status(400).json(ApiResponse.error(error.message));
  }

  res.status(201).json(ApiResponse.created(data, 'Comentario creado exitosamente'));
});

// Actualizar comentario (público)
const updateExistingComment = asyncHandler(async (req, res) => {
  const { comment_id } = req.params;
  const { content } = req.body;

  // Validar que el ID sea un UUID válido
  if (!isValidUserId(comment_id)) {
    return res.status(400).json(ApiResponse.error('ID de comentario inválido'));
  }
  
  // Validar datos de entrada
  const validation = validateCommentData({ content });
  if (!validation.isValid) {
    return res.status(400).json(ApiResponse.error(validation.errors.join(', ')));
  }

  // Verificar que el comentario existe
  const { data: comment, error: errorGet } = await getCommentById(comment_id);
  if (errorGet || !comment) {
    return res.status(404).json(ApiResponse.notFound('Comentario'));
  }

  const { data, error } = await updateComment(comment_id, { content });
  if (error) {
    return res.status(400).json(ApiResponse.error(error.message));
  }

  res.json(ApiResponse.success(data, 'Comentario actualizado exitosamente'));
});

// Eliminar comentario (público)
const deleteExistingComment = asyncHandler(async (req, res) => {
  const { comment_id } = req.params;

  // Validar que el ID sea un UUID válido
  if (!isValidUserId(comment_id)) {
    return res.status(400).json(ApiResponse.error('ID de comentario inválido'));
  }

  // Verificar que el comentario existe
  const { data: comment, error: errorGet } = await getCommentById(comment_id);
  if (errorGet || !comment) {
    return res.status(404).json(ApiResponse.notFound('Comentario'));
  }

  const { error } = await deleteComment(comment_id);
  if (error) {
    return res.status(400).json(ApiResponse.error(error.message));
  }

  res.json(ApiResponse.success(null, 'Comentario eliminado exitosamente'));
});

// Buscar posts
const searchForumPosts = asyncHandler(async (req, res) => {
  const { q, categoryId, limit = 20, offset = 0 } = req.query;
  
  if (!q || q.trim().length < 2) {
    return res.status(400).json(ApiResponse.error('El término de búsqueda debe tener al menos 2 caracteres'));
  }

  const { data, error } = await searchPosts(q.trim(), {
    categoryId,
    limit: parseInt(limit),
    offset: parseInt(offset)
  });

  if (error) {
    return res.status(500).json(ApiResponse.error(error.message));
  }

  res.json(ApiResponse.success(data, `${data.length} posts encontrados`));
});

// Crear respuesta a comentario (público)
const createReplyToComment = asyncHandler(async (req, res) => {
  const { comment_id } = req.params;
  const { content } = req.body;
  
  // Validar que el ID sea un UUID válido
  if (!isValidUserId(comment_id)) {
    return res.status(400).json(ApiResponse.error('ID de comentario inválido'));
  }
  
  // Validar datos de entrada
  const validation = validateCommentData({ content });
  if (!validation.isValid) {
    return res.status(400).json(ApiResponse.error(validation.errors.join(', ')));
  }
  
  // Obtener ID de usuario (anónimo para foro público)
  const user_id = getUserIdForForum(req.user?.id);

  const { data, error } = await createReply({ comment_id, content, user_id });
  if (error) {
    return res.status(400).json(ApiResponse.error(error.message));
  }

  res.status(201).json(ApiResponse.created(data, 'Respuesta creada exitosamente'));
});

// Nuevo endpoint para obtener respuestas de un comentario específico
const getCommentReplies = asyncHandler(async (req, res) => {
  const { comment_id } = req.params;
  const { limit = 20, offset = 0 } = req.query;
  
  // Validar que el ID sea un UUID válido
  if (!isValidUserId(comment_id)) {
    return res.status(400).json(ApiResponse.error('ID de comentario inválido'));
  }
  
  const { data, error } = await getRepliesByComment(comment_id, {
    limit: parseInt(limit),
    offset: parseInt(offset)
  });
  
  if (error) {
    return res.status(500).json(ApiResponse.error(error.message));
  }

  // Establecer headers de caché para respuestas
  res.set('Cache-Control', 'public, max-age=120'); // 2 minutos

  res.json(ApiResponse.success(data, 'Respuestas obtenidas exitosamente'));
});

// Nuevo endpoint para contar posts
const getPostsCount = asyncHandler(async (req, res) => {
  const { categoryId } = req.query;
  
  const { count, error } = await countPosts({ categoryId });
  
  if (error) {
    return res.status(500).json(ApiResponse.error(error.message));
  }

  // Establecer headers de caché para conteos
  res.set('Cache-Control', 'public, max-age=180'); // 3 minutos

  res.json(ApiResponse.success({ count }, 'Conteo de posts obtenido exitosamente'));
});

// Nuevo endpoint para contar comentarios de un post
const getPostCommentsCount = asyncHandler(async (req, res) => {
  const { post_id } = req.params;
  
  // Validar que el ID sea un UUID válido
  if (!isValidUserId(post_id)) {
    return res.status(400).json(ApiResponse.error('ID de post inválido'));
  }
  
  const { count, error } = await countCommentsByPost(post_id);
  
  if (error) {
    return res.status(500).json(ApiResponse.error(error.message));
  }

  // Establecer headers de caché para conteos
  res.set('Cache-Control', 'public, max-age=120'); // 2 minutos

  res.json(ApiResponse.success({ count }, 'Conteo de comentarios obtenido exitosamente'));
});

// Nuevo endpoint para obtener posts populares
const getPopularPostsController = asyncHandler(async (req, res) => {
  const { limit = 10, timeRange = 'week' } = req.query;

  const { data, error } = await getPopularPosts({
    limit: parseInt(limit),
    timeRange
  });

  if (error) {
    return res.status(500).json(ApiResponse.error(error.message));
  }

  // Establecer headers de caché más largos para posts populares
  res.set('Cache-Control', 'public, max-age=600'); // 10 minutos

  res.json(ApiResponse.success(data, 'Posts populares obtenidos exitosamente'));
});

export {
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
  getPopularPostsController
};