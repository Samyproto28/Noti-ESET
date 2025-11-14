import supabase from '../config/supabaseClient.js';

/**
 * Servicio de gestión de noticias para la aplicación NotiEset
 * Proporciona funciones CRUD para interactuar con la tabla 'news' de Supabase
 */

/**
 * Obtiene todas las noticias de la base de datos
 * @returns {Promise<Object>} Respuesta de Supabase con array de noticias ordenadas por fecha descendente
 * @throws {Error} Si hay un error en la consulta a la base de datos
 */
async function getAllNews() {
  return await supabase.from('news').select('*').order('created_at', { ascending: false });
}

/**
 * Obtiene una noticia específica por su ID
 * @param {string|number} id - ID de la noticia a buscar
 * @returns {Promise<Object>} Respuesta de Supabase con la noticia encontrada
 * @throws {Error} Si hay un error en la consulta o si la noticia no existe
 */
async function getNewsById(id) {
  return await supabase.from('news').select('*').eq('id', id).single();
}

/**
 * Crea una nueva noticia en la base de datos
 * @param {Object} newsData - Datos de la noticia a crear
 * @param {string} newsData.title - Título de la noticia
 * @param {string} newsData.content - Contenido/descripción de la noticia
 * @param {string|null} newsData.image_url - URL de la imagen (opcional)
 * @param {string} newsData.user_id - ID del usuario que crea la noticia
 * @returns {Promise<Object>} Respuesta de Supabase con la noticia creada
 * @throws {Error} Si hay un error al crear la noticia o datos inválidos
 */
async function createNews({ title, content, image_url, user_id }) {
  return await supabase.from('news').insert([{ title, content, image_url, user_id }]).select().single();
}

/**
 * Actualiza una noticia existente
 * @param {string|number} id - ID de la noticia a actualizar
 * @param {Object} updateData - Datos a actualizar de la noticia
 * @param {string} updateData.title - Nuevo título de la noticia
 * @param {string} updateData.content - Nuevo contenido de la noticia
 * @param {string|null} updateData.image_url - Nueva URL de la imagen (opcional)
 * @returns {Promise<Object>} Respuesta de Supabase con la noticia actualizada
 * @throws {Error} Si hay un error al actualizar o si la noticia no existe
 */
async function updateNews(id, { title, content, image_url }) {
  return await supabase.from('news').update({ title, content, image_url }).eq('id', id).select().single();
}

/**
 * Elimina una noticia de la base de datos
 * @param {string|number} id - ID de la noticia a eliminar
 * @returns {Promise<Object>} Respuesta de Supabase confirmando la eliminación
 * @throws {Error} Si hay un error al eliminar o si la noticia no existe
 */
async function deleteNews(id) {
  return await supabase.from('news').delete().eq('id', id);
}

export {
  getAllNews,
  getNewsById,
  createNews,
  updateNews,
  deleteNews,
};
