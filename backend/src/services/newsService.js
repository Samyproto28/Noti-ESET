import supabase from '../config/supabaseClient.js';

// Noticias
async function getAllNews() {
  return await supabase.from('news').select('*').order('created_at', { ascending: false });
}
async function getNewsById(id) {
  return await supabase.from('news').select('*').eq('id', id).single();
}
async function createNews({ title, content, image_url, user_id }) {
  return await supabase.from('news').insert([{ title, content, image_url, user_id }]).select().single();
}
async function updateNews(id, { title, content, image_url }) {
  return await supabase.from('news').update({ title, content, image_url }).eq('id', id).select().single();
}
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