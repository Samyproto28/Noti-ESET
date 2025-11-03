import express from 'express';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware.js';
import {
  validateCategory,
  validateCategoryPostsQuery,
  validateCategorySearch,
  validateCategoryId,
  handleValidationErrors
} from '../validators/categoryValidators.js';
import {
  getCategories,
  getCategory,
  createNewCategory,
  updateExistingCategory,
  deleteExistingCategory,
  getCategoryPosts,
  searchCategories
} from '../controllers/categoryController.js';

const router = express.Router();

// ==================== RUTAS PÚBLICAS ====================

// Obtener todas las categorías (con opcional stats)
router.get('/', getCategories);

// Buscar categorías
router.get('/search', validateCategorySearch, handleValidationErrors, searchCategories);

// Obtener categoría específica
router.get('/:id', validateCategoryId, handleValidationErrors, getCategory);

// Obtener posts de una categoría con paginación
router.get('/:id/posts', validateCategoryPostsQuery, handleValidationErrors, getCategoryPosts);

// ==================== RUTAS PROTEGIDAS ====================

// Crear nueva categoría (solo usuarios autenticados, en el futuro solo moderadores)
router.post('/', 
  authMiddleware, 
  validateCategory, 
  handleValidationErrors, 
  createNewCategory
);

// Actualizar categoría (solo usuarios autenticados, en el futuro solo moderadores)
router.put('/:id', 
  authMiddleware, 
  validateCategoryId,
  validateCategory, 
  handleValidationErrors, 
  updateExistingCategory
);

// Eliminar categoría (solo usuarios autenticados, en el futuro solo moderadores)
router.delete('/:id', 
  authMiddleware, 
  validateCategoryId, 
  handleValidationErrors, 
  deleteExistingCategory
);

export default router;