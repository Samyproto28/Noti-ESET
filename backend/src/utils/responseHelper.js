// Utilidades para respuestas API consistentes
class ApiResponse {
  static success(data, message = 'Operación exitosa') {
    return {
      success: true,
      message,
      data
    };
  }

  static error(message, details = null) {
    return {
      success: false,
      error: message,
      ...(details && { details })
    };
  }

  static created(data, message = 'Recurso creado exitosamente') {
    return {
      success: true,
      message,
      data
    };
  }

  static notFound(resource = 'Recurso') {
    return {
      success: false,
      error: `${resource} no encontrado`
    };
  }

  static unauthorized(message = 'No autorizado') {
    return {
      success: false,
      error: message
    };
  }

  static forbidden(message = 'Acceso denegado') {
    return {
      success: false,
      error: message
    };
  }
}

export default ApiResponse;