import supabase from '../config/supabaseClient.js';

/**
 * Servicio de gestión de perfiles de usuario para la aplicación NotiEset
 * Proporciona funciones para manejar perfiles de usuarios y sus contadores
 */

/**
 * Obtiene el perfil de un usuario mediante su ID de usuario
 * @param {string} userId - ID del usuario autenticado
 * @returns {Promise<Object>} Respuesta de Supabase con el perfil del usuario
 * @throws {Error} Si hay un error en la consulta o si el perfil no existe
 */
async function getProfileByUserId(userId) {
  return await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
}

/**
 * Obtiene el perfil de un usuario mediante su nombre de usuario
 * @param {string} username - Nombre de usuario único
 * @returns {Promise<Object>} Respuesta de Supabase con el perfil del usuario
 * @throws {Error} Si hay un error en la consulta o si el perfil no existe
 */
async function getProfileByUsername(username) {
  return await supabase
    .from('user_profiles')
    .select('*')
    .eq('username', username)
    .single();
}

/**
 * Crea o actualiza el perfil de un usuario (operación upsert)
 * @param {string} userId - ID del usuario autenticado
 * @param {Object} profileData - Datos del perfil a crear/actualizar
 * @param {string} profileData.username - Nombre de usuario único
 * @param {string} profileData.display_name - Nombre para mostrar (opcional)
 * @param {string} profileData.bio - Biografía del usuario (opcional)
 * @param {string|null} profileData.avatar_url - URL del avatar (opcional)
 * @returns {Promise<Object>} Respuesta de Supabase con el perfil creado/actualizado
 * @throws {Error} Si hay un error al crear/actualizar el perfil
 */
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

/**
 * Incrementa en 1 el contador de publicaciones del usuario
 * @param {string} userId - ID del usuario cuyo contador se incrementará
 * @returns {Promise<Object>} Respuesta de Supabase confirmando la actualización
 * @throws {Error} Si hay un error al actualizar el contador
 */
async function incrementPostsCount(userId) {
  return await supabase
    .from('user_profiles')
    .update({
      posts_count: supabase.raw('posts_count + 1'),
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);
}

/**
 * Incrementa en 1 el contador de comentarios del usuario
 * @param {string} userId - ID del usuario cuyo contador se incrementará
 * @returns {Promise<Object>} Respuesta de Supabase confirmando la actualización
 * @throws {Error} Si hay un error al actualizar el contador
 */
async function incrementCommentsCount(userId) {
  return await supabase
    .from('user_profiles')
    .update({
      comments_count: supabase.raw('comments_count + 1'),
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);
}

export {
  getProfileByUserId,
  getProfileByUsername,
  upsertProfile,
  incrementPostsCount,
  incrementCommentsCount
};