import { v4 as uuidv4 } from 'uuid';
import { isValidUserId } from '../utils/uuidValidator.js';

// ID de usuario anónimo consistente
const ANONYMOUS_USER_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Obtiene el ID de usuario anónimo para el foro público
 * @returns {string} ID de usuario anónimo
 */
export function getAnonymousUserId() {
  return ANONYMOUS_USER_ID;
}

/**
 * Obtiene el ID de usuario apropiado para operaciones del foro
 * @param {string|null} userId - ID de usuario proporcionado
 * @returns {string} ID de usuario a usar
 */
export function getUserIdForForum(userId = null) {
  // Si se proporciona un ID válido, usarlo
  if (userId && isValidUserId(userId)) {
    return userId;
  }
  
  // Si no, usar el usuario anónimo
  return getAnonymousUserId();
}

// Re-exportar isValidUserId para compatibilidad
export { isValidUserId };