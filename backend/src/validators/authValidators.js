import { body, validationResult } from 'express-validator';

// Validador para registro de usuario
const validateRegister = [
  body('email')
    .isEmail()
    .withMessage('Debe ser un email válido')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La contraseña debe contener al menos: una minúscula, una mayúscula y un número')
];

// Validador para login
const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Debe ser un email válido')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('La contraseña es requerida')
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
  validateRegister,
  validateLogin,
  handleValidationErrors
};