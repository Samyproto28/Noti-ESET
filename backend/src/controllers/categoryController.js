import {
  getAllCategories,
  getCategoryById,
  getCategoryByName,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoriesWithStats,
  getPostsByCategory
} from '../services/categoryService.js';
import ApiResponse from '../utils/responseHelper.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import supabase from '../config/supabaseClient.js';

// Obtener todas las categorías
const getCategories = asyncHandler(async (req, res) => {
  const { stats } = req.query;
  
  let result;
  if (stats === 'true') {
    result = await getCategoriesWithStats();
  } else {
    result = await getAllCategories();
  }

  const { data, error } = result;
  if (error) {
    return res.status(500).json(ApiResponse.error(error.message));
  }

  res.json(ApiResponse.success(data, 'Categorías obtenidas exitosamente'));
});

// Obtener categoría por ID
const getCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { data, error } = await getCategoryById(id);
  
  if (error || !data) {
    return res.status(404).json(ApiResponse.notFound('Categoría'));
  }

  res.json(ApiResponse.success(data, 'Categoría obtenida exitosamente'));
});

// Crear nueva categoría (solo moderadores)
const createNewCategory = asyncHandler(async (req, res) => {
  const { name, description, color, icon } = req.body;
  
  const { data, error } = await createCategory({ name, description, color, icon });
  if (error) {
    return res.status(400).json(ApiResponse.error(error.message));
  }

  res.status(201).json(ApiResponse.created(data, 'Categoría creada exitosamente'));
});

// Actualizar categoría (solo moderadores)
const updateExistingCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, color, icon, is_active } = req.body;

  // Verificar que la categoría existe
  const { data: category, error: findError } = await getCategoryById(id);
  if (findError || !category) {
    return res.status(404).json(ApiResponse.notFound('Categoría'));
  }

  const { data, error } = await updateCategory(id, { name, description, color, icon, is_active });
  if (error) {
    return res.status(400).json(ApiResponse.error(error.message));
  }

  res.json(ApiResponse.success(data, 'Categoría actualizada exitosamente'));
});

// Eliminar categoría (solo moderadores)
const deleteExistingCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Verificar que la categoría existe
  const { data: category, error: findError } = await getCategoryById(id);
  if (findError || !category) {
    return res.status(404).json(ApiResponse.notFound('Categoría'));
  }

  const { error } = await deleteCategory(id);
  if (error) {
    return res.status(400).json(ApiResponse.error(error.message));
  }

  res.json(ApiResponse.success(null, 'Categoría eliminada exitosamente'));
});

// Obtener posts de una categoría
const getCategoryPosts = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { 
    limit = 20, 
    offset = 0, 
    sort = 'created_at', 
    order = 'desc' 
  } = req.query;

  // Verificar que la categoría existe
  const { data: category, error: categoryError } = await getCategoryById(id);
  if (categoryError || !category) {
    return res.status(404).json(ApiResponse.notFound('Categoría'));
  }

  const { data, error } = await getPostsByCategory(id, {
    limit: parseInt(limit),
    offset: parseInt(offset),
    sortBy: sort,
    sortOrder: order
  });

  if (error) {
    return res.status(500).json(ApiResponse.error(error.message));
  }

  res.json(ApiResponse.success({
    category: category,
    posts: data,
    pagination: {
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: data.length === parseInt(limit)
    }
  }, 'Posts de categoría obtenidos exitosamente'));
});

// Buscar categoría por nombre
const searchCategories = asyncHandler(async (req, res) => {
  const { q } = req.query;
  
  if (!q || q.trim().length < 2) {
    return res.status(400).json(ApiResponse.error('Query de búsqueda debe tener al menos 2 caracteres'));
  }

  const { data, error } = await supabase
    .from('forum_categories')
    .select('*')
    .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
    .eq('is_active', true)
    .limit(10);

  if (error) {
    return res.status(500).json(ApiResponse.error(error.message));
  }

  res.json(ApiResponse.success(data, 'Categorías encontradas'));
});

export {
  getCategories,
  getCategory,
  createNewCategory,
  updateExistingCategory,
  deleteExistingCategory,
  getCategoryPosts,
  searchCategories
};