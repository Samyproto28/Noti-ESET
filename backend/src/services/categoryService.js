import supabase from '../config/supabaseClient.js';

// Obtener todas las categorías activas
async function getAllCategories() {
  return await supabase
    .from('forum_categories')
    .select('*')
    .eq('is_active', true)
    .order('name');
}

// Obtener categoría por ID
async function getCategoryById(id) {
  return await supabase
    .from('forum_categories')
    .select('*')
    .eq('id', id)
    .single();
}

// Obtener categoría por nombre (slug)
async function getCategoryByName(name) {
  return await supabase
    .from('forum_categories')
    .select('*')
    .ilike('name', name)
    .single();
}

// Crear nueva categoría
async function createCategory({ name, description, color = '#3B82F6', icon = 'chat' }) {
  return await supabase
    .from('forum_categories')
    .insert([{ name, description, color, icon }])
    .select()
    .single();
}

// Actualizar categoría
async function updateCategory(id, { name, description, color, icon, is_active }) {
  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (color !== undefined) updateData.color = color;
  if (icon !== undefined) updateData.icon = icon;
  if (is_active !== undefined) updateData.is_active = is_active;
  
  updateData.updated_at = new Date().toISOString();

  return await supabase
    .from('forum_categories')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
}

// Eliminar categoría (soft delete)
async function deleteCategory(id) {
  return await supabase
    .from('forum_categories')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);
}

// Obtener estadísticas de categorías
async function getCategoriesWithStats() {
  return await supabase
    .from('forum_categories')
    .select(`
      *,
      post_count
    `)
    .eq('is_active', true)
    .order('post_count', { ascending: false });
}

// Obtener posts por categoría con paginación
async function getPostsByCategory(categoryId, { limit = 20, offset = 0, sortBy = 'created_at', sortOrder = 'desc' } = {}) {
  let query = supabase
    .from('forum_posts')
    .select(`
      *,
      forum_categories!inner(name, color, icon),
      user_profiles(username, display_name, avatar_url)
    `)
    .eq('category_id', categoryId)
    .eq('status', 'active')
    .range(offset, offset + limit - 1);

  // Ordenamiento dinámico
  const validSortFields = ['created_at', 'last_activity_at', 'views_count', 'upvotes_count', 'title'];
  const validSortOrders = ['asc', 'desc'];
  
  if (validSortFields.includes(sortBy) && validSortOrders.includes(sortOrder)) {
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  return await query;
}

export {
  getAllCategories,
  getCategoryById,
  getCategoryByName,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoriesWithStats,
  getPostsByCategory
};