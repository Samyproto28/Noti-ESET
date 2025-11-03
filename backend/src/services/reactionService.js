import supabase from '../config/supabaseClient.js';

// Tipos de reacciones válidos
const REACTION_TYPES = {
  LIKE: 'like',
  DISLIKE: 'dislike',
  LOVE: 'love',
  LAUGH: 'laugh',
  WOW: 'wow',
  ANGRY: 'angry',
  SAD: 'sad'
};

// Crear o actualizar reacción
async function toggleReaction(userId, { postId, commentId, reactionType = 'like' }) {
  // Validar que solo se especifique post O comentario, no ambos
  if ((postId && commentId) || (!postId && !commentId)) {
    throw new Error('Debe especificar postId O commentId, no ambos');
  }

  // Validar tipo de reacción
  if (!Object.values(REACTION_TYPES).includes(reactionType)) {
    throw new Error(`Tipo de reacción inválido. Válidos: ${Object.values(REACTION_TYPES).join(', ')}`);
  }

  // Buscar reacción existente
  let query = supabase
    .from('forum_reactions')
    .select('*')
    .eq('user_id', userId);

  if (postId) {
    query = query.eq('post_id', postId);
  } else {
    query = query.eq('comment_id', commentId);
  }

  const { data: existingReaction, error: findError } = await query.single();

  if (findError && findError.code !== 'PGRST116') { // PGRST116 = no rows found
    return { data: null, error: findError };
  }

  // Si existe la reacción
  if (existingReaction) {
    // Si es la misma reacción, eliminarla (toggle off)
    if (existingReaction.reaction_type === reactionType) {
      const { error } = await supabase
        .from('forum_reactions')
        .delete()
        .eq('id', existingReaction.id);
      
      return { 
        data: { action: 'removed', reaction_type: reactionType }, 
        error 
      };
    } else {
      // Si es diferente, actualizarla
      const { data, error } = await supabase
        .from('forum_reactions')
        .update({ reaction_type: reactionType })
        .eq('id', existingReaction.id)
        .select()
        .single();
      
      return { 
        data: { ...data, action: 'updated' }, 
        error 
      };
    }
  } else {
    // Crear nueva reacción
    const reactionData = {
      user_id: userId,
      reaction_type: reactionType
    };

    if (postId) {
      reactionData.post_id = postId;
    } else {
      reactionData.comment_id = commentId;
    }

    const { data, error } = await supabase
      .from('forum_reactions')
      .insert([reactionData])
      .select()
      .single();
    
    return { 
      data: { ...data, action: 'created' }, 
      error 
    };
  }
}

// Obtener reacciones de un post
async function getPostReactions(postId) {
  return await supabase
    .from('forum_reactions')
    .select(`
      *,
      user_profiles(username, display_name, avatar_url)
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: false });
}

// Obtener reacciones de un comentario
async function getCommentReactions(commentId) {
  return await supabase
    .from('forum_reactions')
    .select(`
      *,
      user_profiles(username, display_name, avatar_url)
    `)
    .eq('comment_id', commentId)
    .order('created_at', { ascending: false });
}

// Obtener conteo de reacciones por tipo para un post
async function getPostReactionCounts(postId) {
  const { data, error } = await supabase
    .from('forum_reaction_counts')
    .select('reaction_type, count')
    .eq('content_type', 'post')
    .eq('content_id', postId);

  if (error) return { data: null, error };

  // Convertir a objeto para fácil acceso
  const counts = {};
  data.forEach(item => {
    counts[item.reaction_type] = parseInt(item.count);
  });

  return { data: counts, error: null };
}

// Obtener conteo de reacciones por tipo para un comentario
async function getCommentReactionCounts(commentId) {
  const { data, error } = await supabase
    .from('forum_reaction_counts')
    .select('reaction_type, count')
    .eq('content_type', 'comment')
    .eq('content_id', commentId);

  if (error) return { data: null, error };

  // Convertir a objeto para fácil acceso
  const counts = {};
  data.forEach(item => {
    counts[item.reaction_type] = parseInt(item.count);
  });

  return { data: counts, error: null };
}

// Obtener reacción específica de un usuario
async function getUserReaction(userId, { postId, commentId }) {
  let query = supabase
    .from('forum_reactions')
    .select('reaction_type')
    .eq('user_id', userId);

  if (postId) {
    query = query.eq('post_id', postId);
  } else if (commentId) {
    query = query.eq('comment_id', commentId);
  } else {
    return { data: null, error: new Error('Debe especificar postId o commentId') };
  }

  const { data, error } = await query.single();

  if (error && error.code === 'PGRST116') {
    return { data: null, error: null }; // No hay reacción del usuario
  }

  return { data, error };
}

// Obtener todas las reacciones de un usuario
async function getUserReactions(userId, { limit = 50, offset = 0 } = {}) {
  return await supabase
    .from('forum_reactions')
    .select(`
      *,
      forum_posts(id, title, slug),
      forum_comments(id, content)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
}

// Eliminar reacción específica
async function removeReaction(userId, { postId, commentId }) {
  let query = supabase
    .from('forum_reactions')
    .delete()
    .eq('user_id', userId);

  if (postId) {
    query = query.eq('post_id', postId);
  } else if (commentId) {
    query = query.eq('comment_id', commentId);
  } else {
    return { data: null, error: new Error('Debe especificar postId o commentId') };
  }

  return await query;
}

// Obtener posts más reaccionados
async function getMostReactedPosts({ limit = 10, reactionType = null, timeframe = null } = {}) {
  let query = supabase
    .from('forum_posts')
    .select(`
      *,
      upvotes_count,
      downvotes_count,
      forum_categories(name, color),
      user_profiles(username, display_name, avatar_url)
    `)
    .eq('status', 'active')
    .order('upvotes_count', { ascending: false })
    .limit(limit);

  // Filtrar por tiempo si se especifica
  if (timeframe) {
    const now = new Date();
    let timeLimit;
    
    switch (timeframe) {
      case 'week':
        timeLimit = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        timeLimit = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        timeLimit = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        timeLimit = null;
    }
    
    if (timeLimit) {
      query = query.gte('created_at', timeLimit.toISOString());
    }
  }

  return await query;
}

export {
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
};