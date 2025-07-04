const supabase = require('./supabaseClient');

// Posts
async function getAllPosts() {
  return await supabase.from('forum_posts').select('*').order('created_at', { ascending: false });
}
async function getPostById(id) {
  return await supabase.from('forum_posts').select('*').eq('id', id).single();
}
async function createPost({ title, content, user_id }) {
  return await supabase.from('forum_posts').insert([{ title, content, user_id }]).select().single();
}
async function updatePost(id, { title, content }) {
  return await supabase.from('forum_posts').update({ title, content }).eq('id', id).select().single();
}
async function deletePost(id) {
  return await supabase.from('forum_posts').delete().eq('id', id);
}
// Comments
async function getCommentsByPost(post_id) {
  return await supabase.from('forum_comments').select('*').eq('post_id', post_id).order('created_at', { ascending: true });
}
async function createComment({ post_id, content, user_id }) {
  return await supabase.from('forum_comments').insert([{ post_id, content, user_id }]).select().single();
}
async function updateComment(comment_id, { content }) {
  return await supabase.from('forum_comments').update({ content }).eq('id', comment_id).select().single();
}
async function deleteComment(comment_id) {
  return await supabase.from('forum_comments').delete().eq('id', comment_id);
}

module.exports = {
  getAllPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  getCommentsByPost,
  createComment,
  updateComment,
  deleteComment,
}; 