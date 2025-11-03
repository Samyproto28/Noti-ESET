import { body, param, query, validationResult } from 'express-validator';

// Tipos de reacciones válidos
const VALID_REACTION_TYPES = ['like', 'dislike', 'love', 'laugh', 'wow', 'angry', 'sad'];

// Validador para crear/actualizar reacción
const validateReaction = [
  body('reactionType')
    .optional()
    .isIn(VALID_REACTION_TYPES)
    .withMessage(`Tipo de reacción debe ser uno de: ${VALID_REACTION_TYPES.join(', ')}`)
];

// Validador para ID de post
const validatePostId = [
  param('postId')
    .isUUID()
    .withMessage('El ID del post debe ser un UUID válido')
];

// Validador para ID de comentario
const validateCommentId = [
  param('commentId')
    .isUUID()
    .withMessage('El ID del comentario debe ser un UUID válido')
];

// Validador para consultas de paginación
const validatePaginationQuery = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit debe ser un entero entre 1 y 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset debe ser un entero mayor o igual a 0')
];

// Validador para consultas de trending posts
const validateTrendingQuery = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit debe ser un entero entre 1 y 50'),
  query('timeframe')
    .optional()
    .isIn(['week', 'month', 'year', 'all'])
    .withMessage('Timeframe debe ser uno de: week, month, year, all')
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
  validateReaction,
  validatePostId,
  validateCommentId,
  validatePaginationQuery,
  validateTrendingQuery,
  handleValidationErrors,
  VALID_REACTION_TYPES
};