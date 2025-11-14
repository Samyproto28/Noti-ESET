import { body, validationResult } from 'express-validator';

/**
 * Middleware para manejar errores de validación de forma consistente
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Error de validación',
      details: errors.array().map(error => ({
        field: error.path || error.param,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

/**
 * Validación para el registro de usuarios
 * Incluye validaciones robustas para prevenir XSS, inyección SQL y otros ataques
 */
const validateRegister = [
  // Validación del email
  body('email')
    .trim()
    .isEmail()
    .withMessage('Debe proporcionar un email válido')
    .normalizeEmail({
      gmail_remove_dots: false,
      gmail_remove_subaddress: false,
      outlookdotcom_remove_subaddress: false,
      yahoo_remove_subaddress: false,
      icloud_remove_subaddress: false
    })
    .isLength({ min: 5, max: 255 })
    .withMessage('El email debe tener entre 5 y 255 caracteres')
    .matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
    .withMessage('El formato del email no es válido')
    .not()
    .matches(/@.*\.\./)
    .withMessage('El email no puede tener puntos consecutivos después del @'),

  // Validación de la contraseña
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('La contraseña debe tener entre 8 y 128 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('La contraseña debe contener al menos una letra mayúscula, una letra minúscula, un número y un carácter especial (@$!%*?&)')
    .not()
    .matches(/^(.)\1{2,}$/)
    .withMessage('La contraseña no puede tener 3 o más caracteres idénticos consecutivos')
    .not()
    .matches(/password|123456|qwerty|admin|usuario|guest/i)
    .withMessage('La contraseña no puede ser una contraseña común o débil'),

  // Validación del nombre
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre debe tener entre 2 y 50 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]+$/)
    .withMessage('El nombre solo puede contener letras, espacios, apóstrofes y guiones')
    .escape()
    .withMessage('El nombre ha sido sanitizado para prevenir XSS'),

  // Validación de campos opcionales
  body('role')
    .optional()
    .trim()
    .isIn(['user', 'admin'])
    .withMessage('El rol debe ser "user" o "admin"')
    .default('user'),

  handleValidationErrors
];

/**
 * Validación para el inicio de sesión
 * Validación más específica para el login
 */
const validateLogin = [
  // Validación del email para login
  body('email')
    .trim()
    .isEmail()
    .withMessage('Debe proporcionar un email válido')
    .normalizeEmail()
    .isLength({ min: 5, max: 255 })
    .withMessage('El email debe tener entre 5 y 255 caracteres')
    .notEmpty()
    .withMessage('El email es obligatorio'),

  // Validación de la contraseña para login
  body('password')
    .trim()
    .notEmpty()
    .withMessage('La contraseña es obligatoria')
    .isLength({ min: 1, max: 128 })
    .withMessage('La contraseña debe tener entre 1 y 128 caracteres'),

  handleValidationErrors
];

/**
 * Validación para el cambio de contraseña
 */
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('La contraseña actual es obligatoria')
    .isLength({ min: 1, max: 128 })
    .withMessage('La contraseña actual debe tener entre 1 y 128 caracteres'),

  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('La nueva contraseña debe tener entre 8 y 128 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('La nueva contraseña debe contener al menos una letra mayúscula, una letra minúscula, un número y un carácter especial (@$!%*?&)')
    .not()
    .matches(/^(.)\1{2,}$/)
    .withMessage('La nueva contraseña no puede tener 3 o más caracteres idénticos consecutivos')
    .not()
    .matches(/password|123456|qwerty|admin|usuario|guest/i)
    .withMessage('La nueva contraseña no puede ser una contraseña común o débil'),

  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Las contraseñas no coinciden');
      }
      return true;
    }),

  handleValidationErrors
];

/**
 * Validación para la actualización del perfil de usuario
 */
const validateProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre debe tener entre 2 y 50 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]+$/)
    .withMessage('El nombre solo puede contener letras, espacios, apóstrofes y guiones')
    .escape(),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Debe proporcionar un email válido')
    .normalizeEmail()
    .isLength({ min: 5, max: 255 })
    .withMessage('El email debe tener entre 5 y 255 caracteres'),

  body('avatar')
    .optional()
    .trim()
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('El avatar debe ser una URL válida')
    .isLength({ max: 500 })
    .withMessage('La URL del avatar no puede exceder 500 caracteres'),

  handleValidationErrors
];

/**
 * Middleware de sanitización general para todos los endpoints de auth
 */
const sanitizeAuthInput = (req, res, next) => {
  // Sanitizar todos los campos de texto para prevenir XSS
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        // Eliminar caracteres potencialmente peligrosos
        req.body[key] = req.body[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '')
          .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
          .trim();
      }
    });
  }
  next();
};

export {
  validateRegister,
  validateLogin,
  validatePasswordChange,
  validateProfileUpdate,
  sanitizeAuthInput,
  handleValidationErrors
};