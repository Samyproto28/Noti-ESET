import {
  getAllNews,
  getNewsById,
  createNews,
  updateNews,
  deleteNews
} from '../services/newsService.js';
import ApiResponse from '../utils/responseHelper.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// Listar todas las noticias
const getNews = asyncHandler(async (req, res) => {
  const { data, error } = await getAllNews();
  
  if (error) {
    return res.status(500).json(ApiResponse.error(error.message));
  }

  res.json(ApiResponse.success(data, 'Noticias obtenidas exitosamente'));
});

// Obtener noticia por ID
const getNewsItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { data, error } = await getNewsById(id);
  
  if (error || !data) {
    return res.status(404).json(ApiResponse.notFound('Noticia'));
  }

  res.json(ApiResponse.success(data, 'Noticia obtenida exitosamente'));
});

// Crear nueva noticia
const createNewsItem = asyncHandler(async (req, res) => {
  const { title, content, image_url } = req.body;
  const user_id = req.user.id;

  const { data, error } = await createNews({ 
    title, 
    content, 
    image_url, 
    user_id 
  });
  
  if (error) {
    return res.status(400).json(ApiResponse.error(error.message));
  }

  res.status(201).json(ApiResponse.created(data, 'Noticia creada exitosamente'));
});

// Actualizar noticia
const updateNewsItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, content, image_url } = req.body;
  const user_id = req.user.id;

  // Verificar autoría
  const { data: noticia, error: errorGet } = await getNewsById(id);
  if (errorGet || !noticia) {
    return res.status(404).json(ApiResponse.notFound('Noticia'));
  }
  
  if (noticia.user_id !== user_id) {
    return res.status(403).json(ApiResponse.forbidden('Solo el autor puede editar esta noticia'));
  }

  const { data, error } = await updateNews(id, { title, content, image_url });
  if (error) {
    return res.status(400).json(ApiResponse.error(error.message));
  }

  res.json(ApiResponse.success(data, 'Noticia actualizada exitosamente'));
});

// Eliminar noticia
const deleteNewsItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  // Verificar autoría
  const { data: noticia, error: errorGet } = await getNewsById(id);
  if (errorGet || !noticia) {
    return res.status(404).json(ApiResponse.notFound('Noticia'));
  }
  
  if (noticia.user_id !== user_id) {
    return res.status(403).json(ApiResponse.forbidden('Solo el autor puede eliminar esta noticia'));
  }

  const { error } = await deleteNews(id);
  if (error) {
    return res.status(400).json(ApiResponse.error(error.message));
  }

  res.json(ApiResponse.success(null, 'Noticia eliminada exitosamente'));
});

export {
  getNews,
  getNewsItem,
  createNewsItem,
  updateNewsItem,
  deleteNewsItem
};