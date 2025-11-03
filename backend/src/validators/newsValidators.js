import { body, param, validationResult } from 'express-validator';

// Validador para crear/actualizar noticia
const validateNews = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('El título debe tener entre 5 y 200 caracteres'),
  body('content')
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('El contenido debe tener entre 10 y 5000 caracteres'),
  body('image_url')
    .optional()
    .isURL()
    .withMessage('La URL de la imagen debe ser válida')
];

// Validador para parámetros ID
const validateId = [
  param('id')
    .isUUID()
    .withMessage('El ID debe ser un UUID válido')
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
  validateNews,
  validateId,
  handleValidationErrors
};