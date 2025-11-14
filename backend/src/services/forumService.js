// Importación ES6 para consistencia con el resto del proyecto
import supabase from '../config/supabaseClient.js';
import { getUserIdForForum } from './userService.js';
import { isValidUserId } from '../utils/uuidValidator.js';

// Posts - Funciones extendidas
async function getAllPosts({ limit = 20, offset = 0, categoryId = null, sortBy = 'created_at', sortOrder = 'desc' } = {}) {
  let query = supabase
    .from('forum_posts')
    .select(`
      id,
      title,
      content,
      slug,
      user_id,
      category_id,
      status,
      is_pinned,
      is_locked,
      views_count,
      upvotes_count,
      downvotes_count,
      created_at,
      updated_at,
      last_activity_at,
      tags,
      image_url,
      forum_categories(id, name, color, icon),
      user_profiles(username, display_name, avatar_url)
    `)
    .eq('status', 'active')
    .range(offset, offset + limit - 1);

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  // Ordenamiento optimizado con índices
  const validSortFields = ['created_at', 'updated_at', 'title', 'last_activity_at', 'views_count', 'upvotes_count'];
  if (validSortFields.includes(sortBy)) {
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
  }

  // Agregar headers de caché para respuestas que no cambian frecuentemente
  const { data, error } = await query;
  
  if (!error) {
    // Agregar metadatos para caché en el controlador
    return {
      data,
      error,
      cacheHeaders: {
        'Cache-Control': 'public, max-age=300', // 5 minutos
        'ETag': generateETag(data)
      }
    };
  }
  
  return { data, error };
}

// Función auxiliar para generar ETags
function generateETag(data) {
  if (!data || !Array.isArray(data)) return '"empty"';
  
  const contentHash = data.map(post => `${post.id}-${post.updated_at}`).join('|');
  return `"${Buffer.from(contentHash).toString('base64').slice(0, 32)}"`;
}

async function getPostById(id) {
  return await supabase
    .from('forum_posts')
    .select(`
      *,
      forum_categories(id, name, color, icon),
      user_profiles(username, display_name, avatar_url)
    `)
    .eq('id', id)
    .single();
}

async function getPostBySlug(slug) {
  return await supabase
    .from('forum_posts')
    .select(`
      *,
      forum_categories(id, name, color, icon),
      user_profiles(username, display_name, avatar_url)
    `)
    .eq('slug', slug)
    .eq('status', 'active')
    .single();
}

/**
 * Valida los datos para crear un post
 * @param {Object} postData - Datos del post
 * @returns {Object} Resultado de la validación
 */
function validatePostData({ title, content, category_id }) {
  const errors = [];
  
  if (!title || typeof title !== 'string') {
    errors.push('El título es requerido y debe ser una cadena de texto');
  } else {
    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 5 || trimmedTitle.length > 200) {
      errors.push('El título debe tener entre 5 y 200 caracteres');
    }
  }
  
  if (!content || typeof content !== 'string') {
    errors.push('El contenido es requerido y debe ser una cadena de texto');
  } else {
    const trimmedContent = content.trim();
    if (trimmedContent.length < 10 || trimmedContent.length > 2000) {
      errors.push('El contenido debe tener entre 10 y 2000 caracteres');
    }
  }
  
  if (category_id && !isValidUserId(category_id)) {
    errors.push('El ID de categoría debe ser un UUID válido');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}


async function createPost({ title, content, user_id, category_id = null }) {
  // Validar datos de entrada
  const validation = validatePostData({ title, content, category_id });
  if (!validation.isValid) {
    return { data: null, error: new Error(validation.errors.join(', ')) };
  }
  
  // Validar y normalizar el ID de usuario
  const normalizedUserId = getUserIdForForum(user_id);
  
  const postData = {
    title: title.trim(),
    content: content.trim(),
    user_id: normalizedUserId,
    status: 'active',
    views_count: 0,
    upvotes_count: 0,
    downvotes_count: 0,
    last_activity_at: new Date().toISOString()
  };

  // Solo agregar category_id si se proporciona
  if (category_id) {
    postData.category_id = category_id;
  }

  return await supabase
    .from('forum_posts')
    .insert([postData])
    .select(`
      *,
      forum_categories(id, name, color, icon)
    `)
    .single();
}

async function updatePost(id, { title, content, category_id, tags, image_url, is_pinned, is_locked }) {
  const updateData = {};
  if (title !== undefined) {
    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 5 || trimmedTitle.length > 200) {
      return { data: null, error: new Error('El título debe tener entre 5 y 200 caracteres') };
    }
    updateData.title = trimmedTitle;
  }
  
  if (content !== undefined) {
    const trimmedContent = content.trim();
    if (trimmedContent.length < 10 || trimmedContent.length > 2000) {
      return { data: null, error: new Error('El contenido debe tener entre 10 y 2000 caracteres') };
    }
    updateData.content = trimmedContent;
  }
  
  if (category_id !== undefined) {
    if (category_id && !isValidUserId(category_id)) {
      return { data: null, error: new Error('El ID de categoría debe ser un UUID válido') };
    }
    updateData.category_id = category_id;
  }
  
  if (tags !== undefined) updateData.tags = tags;
  if (image_url !== undefined) updateData.image_url = image_url;
  if (is_pinned !== undefined) updateData.is_pinned = is_pinned;
  if (is_locked !== undefined) updateData.is_locked = is_locked;
  
  updateData.updated_at = new Date().toISOString();

  return await supabase
    .from('forum_posts')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      forum_categories(id, name, color, icon),
      user_profiles(username, display_name, avatar_url)
    `)
    .single();
}

async function deletePost(id) {
  // Validar que el ID sea un UUID válido
  if (!isValidUserId(id)) {
    return { data: null, error: new Error('ID de post inválido') };
  }
  
  return await supabase
    .from('forum_posts')
    .update({ status: 'deleted' })
    .eq('id', id);
}

// Incrementar contador de vistas
async function incrementPostViews(id) {
  // Validar que el ID sea un UUID válido
  if (!isValidUserId(id)) {
    return { data: null, error: new Error('ID de post inválido') };
  }
  
  return await supabase
    .from('forum_posts')
    .update({ views_count: supabase.rpc('increment_views', { post_id: id }) })
    .eq('id', id);
}

// Comments - Funciones extendidas con soporte para replies anidadas
async function getCommentsByPost(post_id, { includeReplies = true, level = 0, limit = 50 } = {}) {
  // Validar que el ID sea un UUID válido
  if (!isValidUserId(post_id)) {
    return { data: null, error: new Error('ID de post inválido') };
  }
  
  // Optimización: Cargar solo el primer nivel de comentarios inicialmente
  let query = supabase
    .from('forum_comments')
    .select(`
      id,
      content,
      user_id,
      post_id,
      parent_comment_id,
      level,
      path,
      upvotes_count,
      downvotes_count,
      is_edited,
      edited_at,
      created_at,
      updated_at,
      user_profiles(username, display_name, avatar_url)
    `)
    .eq('post_id', post_id)
    .eq('level', level) // Cargar solo por nivel
    .order('created_at', { ascending: true })
    .limit(limit);

  const { data, error } = await query;
  
  if (error) {
    return { data, error };
  }

  // Si no se incluyen respuestas, devolver comentarios planos
  if (!includeReplies) {
    return { data, error: null };
  }

  // Para mejor rendimiento, contar las respuestas sin cargarlas
  const commentsWithReplyCount = await Promise.all(
    data.map(async (comment) => {
      // Contar respuestas directas
      const { count } = await supabase
        .from('forum_comments')
        .select('*', { count: 'exact', head: true })
        .eq('parent_comment_id', comment.id);
      
      return {
        ...comment,
        replies: [], // Inicialmente vacío, se cargarán bajo demanda
        replyCount: count || 0,
        hasReplies: count > 0
      };
    })
  );

  return { data: commentsWithReplyCount, error: null };
}

// Nueva función para cargar respuestas de un comentario específico
async function getRepliesByComment(comment_id, { limit = 20, offset = 0 } = {}) {
  // Validar que el ID sea un UUID válido
  if (!isValidUserId(comment_id)) {
    return { data: null, error: new Error('ID de comentario inválido') };
  }
  
  // Obtener el comentario padre para conocer su nivel
  const { data: parentComment } = await supabase
    .from('forum_comments')
    .select('level')
    .eq('id', comment_id)
    .single();
  
  if (!parentComment) {
    return { data: [], error: new Error('Comentario no encontrado') };
  }
  
  // Cargar respuestas del siguiente nivel
  const nextLevel = parentComment.level + 1;
  
  return await supabase
    .from('forum_comments')
    .select(`
      id,
      content,
      user_id,
      post_id,
      parent_comment_id,
      level,
      path,
      upvotes_count,
      downvotes_count,
      is_edited,
      edited_at,
      created_at,
      updated_at,
      user_profiles(username, display_name, avatar_url)
    `)
    .eq('parent_comment_id', comment_id)
    .eq('level', nextLevel)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);
}

async function getCommentById(comment_id) {
  // Validar que el ID sea un UUID válido
  if (!isValidUserId(comment_id)) {
    return { data: null, error: new Error('ID de comentario inválido') };
  }
  
  return await supabase
    .from('forum_comments')
    .select(`
      *,
      user_profiles(username, display_name, avatar_url),
      forum_posts(id, title, slug)
    `)
    .eq('id', comment_id)
    .single();
}

// Función auxiliar para generar path jerárquico
function generateCommentPath(parentPath, commentId) {
  if (!parentPath) {
    return commentId;
  }
  return `${parentPath}.${commentId}`;
}

/**
 * Valida los datos para crear un comentario
 * @param {Object} commentData - Datos del comentario
 * @returns {Object} Resultado de la validación
 */
function validateCommentData({ content }) {
  const errors = [];
  
  if (!content || typeof content !== 'string') {
    errors.push('El contenido es requerido y debe ser una cadena de texto');
  } else {
    const trimmedContent = content.trim();
    if (trimmedContent.length < 1 || trimmedContent.length > 1000) {
      errors.push('El contenido debe tener entre 1 y 1000 caracteres');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

async function createComment({ post_id, content, user_id, parent_comment_id = null }) {
  // Validar datos de entrada
  const validation = validateCommentData({ content });
  if (!validation.isValid) {
    return { data: null, error: new Error(validation.errors.join(', ')) };
  }
  
  // Validar que el post exista
  const { data: post, error: postError } = await getPostById(post_id);
  if (postError || !post) {
    return { data: null, error: new Error('Post no encontrado') };
  }
  
  // Validar y normalizar el ID de usuario
  const normalizedUserId = getUserIdForForum(user_id);
  
  let level = 0;
  let path = '';
  
  // Si es una respuesta, calcular level y path
  if (parent_comment_id) {
    const { data: parentComment, error: parentError } = await getCommentById(parent_comment_id);
    if (parentError || !parentComment) {
      return { data: null, error: new Error('Comentario padre no encontrado') };
    }
    
    level = (parentComment.level || 0) + 1;
    // Limitar nivel máximo de anidamiento
    if (level > 5) {
      return { data: null, error: new Error('Máximo nivel de anidamiento alcanzado') };
    }
  }

  const commentData = {
    post_id,
    content: content.trim(),
    user_id: normalizedUserId,
    parent_comment_id,
    level
  };

  // Insertar comentario
  const { data: newComment, error } = await supabase
    .from('forum_comments')
    .insert([commentData])
    .select(`
      *,
      user_profiles(username, display_name, avatar_url)
    `)
    .single();

  if (error) {
    return { data: null, error };
  }

  // Actualizar path después de insertar (necesitamos el ID)
  try {
    let updatedPath = newComment.id;
    
    if (parent_comment_id) {
      const { data: parentComment } = await getCommentById(parent_comment_id);
      if (parentComment && parentComment.path) {
        updatedPath = generateCommentPath(parentComment.path, newComment.id);
      }
    }

    await supabase
      .from('forum_comments')
      .update({ path: updatedPath })
      .eq('id', newComment.id);

    return { 
      data: { ...newComment, path: updatedPath }, 
      error: null 
    };
  } catch (pathError) {
    // Si hay error actualizando el path, aún así retornar el comentario
    console.error('Error actualizando path del comentario:', pathError);
    return { 
      data: newComment, 
      error: null 
    };
  }
}

async function createReply({ comment_id, content, user_id }) {
  // Validar datos de entrada
  const validation = validateCommentData({ content });
  if (!validation.isValid) {
    return { data: null, error: new Error(validation.errors.join(', ')) };
  }
  
  // Obtener comentario padre
  const { data: parentComment, error: parentError } = await getCommentById(comment_id);
  if (parentError || !parentComment) {
    return { data: null, error: new Error('Comentario padre no encontrado') };
  }

  return await createComment({
    post_id: parentComment.post_id,
    content,
    user_id,
    parent_comment_id: comment_id
  });
}

async function updateComment(comment_id, { content }) {
  // Validar que el ID sea un UUID válido
  if (!isValidUserId(comment_id)) {
    return { data: null, error: new Error('ID de comentario inválido') };
  }
  
  // Validar datos de entrada
  const validation = validateCommentData({ content });
  if (!validation.isValid) {
    return { data: null, error: new Error(validation.errors.join(', ')) };
  }
  
  const updateData = {
    content: content.trim(),
    is_edited: true,
    edited_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  return await supabase
    .from('forum_comments')
    .update(updateData)
    .eq('id', comment_id)
    .select(`
      *,
      user_profiles(username, display_name, avatar_url)
    `)
    .single();
}

async function deleteComment(comment_id) {
  // Validar que el ID sea un UUID válido
  if (!isValidUserId(comment_id)) {
    return { data: null, error: new Error('ID de comentario inválido') };
  }
  
  // Obtener información del comentario
  const { data: comment, error: getError } = await getCommentById(comment_id);
  if (getError || !comment) {
    return { data: null, error: new Error('Comentario no encontrado') };
  }

  // Si tiene replies, marcar como eliminado pero mantener estructura
  const { data: replies } = await supabase
    .from('forum_comments')
    .select('id')
    .eq('parent_comment_id', comment_id);

  if (replies && replies.length > 0) {
    // Soft delete - mantener para preservar estructura de replies
    return await supabase
      .from('forum_comments')
      .update({ 
        content: '[Comentario eliminado]',
        is_edited: true,
        edited_at: new Date().toISOString()
      })
      .eq('id', comment_id);
  } else {
    // Hard delete si no tiene replies
    return await supabase
      .from('forum_comments')
      .delete()
      .eq('id', comment_id);
  }
}


// Buscar posts
async function searchPosts(searchTerm, { categoryId = null, limit = 20, offset = 0 } = {}) {
  // Validar término de búsqueda
  if (!searchTerm || searchTerm.trim().length < 2) {
    return { data: [], error: new Error('El término de búsqueda debe tener al menos 2 caracteres') };
  }
  
  // Optimización: Usar búsqueda de texto completo si está disponible
  const trimmedSearch = searchTerm.trim();
  
  let query = supabase
    .from('forum_posts')
    .select(`
      id,
      title,
      content,
      slug,
      user_id,
      category_id,
      status,
      views_count,
      upvotes_count,
      downvotes_count,
      created_at,
      updated_at,
      last_activity_at,
      forum_categories(id, name, color, icon),
      user_profiles(username, display_name, avatar_url)
    `)
    .eq('status', 'active')
    .or(`title.ilike.%${trimmedSearch}%,content.ilike.%${trimmedSearch}%`)
    .order('last_activity_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  return await query;
}

// Nueva función para contar posts (optimizar paginación)
async function countPosts({ categoryId = null } = {}) {
  let query = supabase
    .from('forum_posts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  const { count, error } = await query;
  return { count: count || 0, error };
}

// Nueva función para contar comentarios de un post
async function countCommentsByPost(post_id) {
  // Validar que el ID sea un UUID válido
  if (!isValidUserId(post_id)) {
    return { count: 0, error: new Error('ID de post inválido') };
  }
  
  const { count, error } = await supabase
    .from('forum_comments')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', post_id);

  return { count: count || 0, error };
}

// Nueva función para obtener posts populares (con caché)
async function getPopularPosts({ limit = 10, timeRange = 'week' } = {}) {
  // Calcular fecha límite según el rango
  let dateLimit = new Date();
  switch (timeRange) {
    case 'day':
      dateLimit.setDate(dateLimit.getDate() - 1);
      break;
    case 'week':
      dateLimit.setDate(dateLimit.getDate() - 7);
      break;
    case 'month':
      dateLimit.setMonth(dateLimit.getMonth() - 1);
      break;
    default:
      dateLimit.setDate(dateLimit.getDate() - 7);
  }
  
  return await supabase
    .from('forum_posts')
    .select(`
      id,
      title,
      slug,
      views_count,
      upvotes_count,
      downvotes_count,
      created_at,
      last_activity_at,
      forum_categories(id, name, color, icon),
      user_profiles(username, display_name, avatar_url)
    `)
    .eq('status', 'active')
    .gte('last_activity_at', dateLimit.toISOString())
    .order('upvotes_count', { ascending: false })
    .order('views_count', { ascending: false })
    .limit(limit);
}

export {
  getAllPosts,
  getPostById,
  getPostBySlug,
  createPost,
  updatePost,
  deletePost,
  incrementPostViews,
  getCommentsByPost,
  getCommentById,
  createComment,
  createReply,
  updateComment,
  deleteComment,
  getRepliesByComment,
  searchPosts,
  countPosts,
  countCommentsByPost,
  getPopularPosts,
  validatePostData,
  validateCommentData
};
