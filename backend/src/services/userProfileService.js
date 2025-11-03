const supabase = require('../config/supabaseClient');

// Obtener perfil por user_id
async function getProfileByUserId(userId) {
  return await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
}

// Obtener perfil por username
async function getProfileByUsername(username) {
  return await supabase
    .from('user_profiles')
    .select('*')
    .eq('username', username)
    .single();
}

// Crear o actualizar perfil
async function upsertProfile(userId, profileData) {
  const { username, display_name, bio, avatar_url } = profileData;
  
  return await supabase
    .from('user_profiles')
    .upsert([{
      user_id: userId,
      username,
      display_name,
      bio,
      avatar_url,
      updated_at: new Date().toISOString()
    }])
    .select()
    .single();
}

// Incrementar contador de posts
async function incrementPostsCount(userId) {
  return await supabase
    .from('user_profiles')
    .update({ 
      posts_count: supabase.raw('posts_count + 1'),
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);
}

// Incrementar contador de comentarios
async function incrementCommentsCount(userId) {
  return await supabase
    .from('user_profiles')
    .update({ 
      comments_count: supabase.raw('comments_count + 1'),
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);
}

module.exports = {
  getProfileByUserId,
  getProfileByUsername,
  upsertProfile,
  incrementPostsCount,
  incrementCommentsCount
};