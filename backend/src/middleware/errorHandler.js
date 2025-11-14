/**
 * Middleware de manejo centralizado de errores para la aplicación NotiEset
 * Proporciona tratamiento consistente para diferentes tipos de errores
 */

/**
 * Middleware centralizado para manejo de errores
 * @param {Error} err - Objeto de error capturado
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * @param {Function} next - Función next de Express
 * @returns {void} Respuesta JSON con formato de error consistente
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Error de validación de express-validator
  if (err.type === 'validation') {
    return res.status(400).json({
      success: false,
      error: 'Error de validación',
      details: err.errors
    });
  }

  // Error de JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Token inválido'
    });
  }

  // Error de token expirado
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expirado'
    });
  }

  // Error de Supabase
  if (err.code) {
    return res.status(400).json({
      success: false,
      error: err.message || 'Error de base de datos'
    });
  }

  // Error interno del servidor
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor'
  });
};

/**
 * Middleware para capturar errores en funciones asíncronas
 * Evita la necesidad de try-catch manual en cada controlador asíncrono
 * @param {Function} fn - Función asíncrona a envolver
 * @returns {Function} Middleware de Express que maneja errores automáticamente
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export { errorHandler, asyncHandler };