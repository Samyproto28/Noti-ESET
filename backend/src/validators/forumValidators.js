import { body, param, validationResult } from 'express-validator';

// Validador para crear/actualizar post
const validatePost = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('El título debe tener entre 5 y 200 caracteres'),
  body('content')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('El contenido debe tener entre 10 y 2000 caracteres')
];

// Validador para crear/actualizar comentario
const validateComment = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('El contenido debe tener entre 1 y 1000 caracteres')
];

// Validador para parámetros ID
const validateId = [
  param('id')
    .isUUID()
    .withMessage('El ID debe ser un UUID válido')
];

// Validador para parámetros de post y comentario
const validatePostAndCommentId = [
  param('post_id')
    .isUUID()
    .withMessage('El ID del post debe ser un UUID válido'),
  param('comment_id')
    .isUUID()
    .withMessage('El ID del comentario debe ser un UUID válido')
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
  validatePost,
  validateComment,
  validateId,
  validatePostAndCommentId,
  handleValidationErrors
};