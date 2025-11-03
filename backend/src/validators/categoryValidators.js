import { body, param, query, validationResult } from 'express-validator';

// Validador para crear/actualizar categoría
const validateCategory = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\-\_]+$/)
    .withMessage('El nombre solo puede contener letras, números, espacios, guiones y guiones bajos'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('La descripción no puede exceder 500 caracteres'),
  body('color')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('El color debe ser un código hex válido (ej: #FF0000)'),
  body('icon')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('El icono debe tener entre 2 y 50 caracteres')
    .matches(/^[a-z\-]+$/)
    .withMessage('El icono solo puede contener letras minúsculas y guiones'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active debe ser un booleano')
];

// Validador para parámetros de consulta de posts por categoría
const validateCategoryPostsQuery = [
  param('id')
    .isUUID()
    .withMessage('El ID de la categoría debe ser un UUID válido'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit debe ser un entero entre 1 y 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset debe ser un entero mayor o igual a 0'),
  query('sort')
    .optional()
    .isIn(['created_at', 'last_activity_at', 'views_count', 'upvotes_count', 'title'])
    .withMessage('Sort debe ser uno de: created_at, last_activity_at, views_count, upvotes_count, title'),
  query('order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Order debe ser asc o desc')
];

// Validador para búsqueda de categorías
const validateCategorySearch = [
  query('q')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('La consulta de búsqueda debe tener entre 2 y 100 caracteres')
];

// Validador para parámetros ID
const validateCategoryId = [
  param('id')
    .isUUID()
    .withMessage('El ID de la categoría debe ser un UUID válido')
];

// Middleware para verificar errores de validación
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Error de validación');
    error.type = 'validation';
    error.errors = errors.array();
    return next(error);
  }
  next();
};

export {
  validateCategory,
  validateCategoryPostsQuery,
  validateCategorySearch,
  validateCategoryId,
  handleValidationErrors
};