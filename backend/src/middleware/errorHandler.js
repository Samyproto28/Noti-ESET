// Middleware centralizado para manejo de errores
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

// Middleware para capturar errores async
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export { errorHandler, asyncHandler };