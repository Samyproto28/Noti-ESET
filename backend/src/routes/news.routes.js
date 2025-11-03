import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { validateNews, validateId, handleValidationErrors } from '../validators/newsValidators.js';
import {
  getNews,
  getNewsItem,
  createNewsItem,
  updateNewsItem,
  deleteNewsItem
} from '../controllers/newsController.js';

const router = express.Router();

// Listar todas las noticias
router.get('/', getNews);

// Obtener noticia por id
router.get('/:id', validateId, handleValidationErrors, getNewsItem);

// Crear noticia (protegido)
router.post('/', authMiddleware, validateNews, handleValidationErrors, createNewsItem);

// Actualizar noticia (protegido, solo autor)
router.put('/:id', authMiddleware, validateId, validateNews, handleValidationErrors, updateNewsItem);

// Eliminar noticia (protegido, solo autor)
router.delete('/:id', authMiddleware, validateId, handleValidationErrors, deleteNewsItem);

export default router;