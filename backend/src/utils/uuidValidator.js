/**
 * Utilitario para validación de UUID
 * Centraliza la validación de UUID en toda la aplicación
 */

/**
 * Verifica si un ID es un UUID válido
 * @param {string} id - ID a verificar
 * @returns {boolean} True si es válido, false otherwise
 */
export function isValidUserId(id) {
  // Validar formato UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return id && uuidRegex.test(id);
}

/**
 * Valida que un ID sea un UUID válido y lanza un error si no lo es
 * @param {string} id - ID a verificar
 * @param {string} fieldName - Nombre del campo para el mensaje de error
 * @throws {Error} Si el ID no es válido
 */
export function validateUUID(id, fieldName = 'ID') {
  if (!isValidUserId(id)) {
    throw new Error(`${fieldName} inválido`);
  }
}

/**
 * Verifica si un ID es un UUID válido y devuelve un resultado de validación
 * @param {string} id - ID a verificar
 * @param {string} fieldName - Nombre del campo para el mensaje de error
 * @returns {Object} Objeto con isValid y errorMessage
 */
export function validateUUIDWithResult(id, fieldName = 'ID') {
  const isValid = isValidUserId(id);
  return {
    isValid,
    errorMessage: isValid ? null : `${fieldName} inválido`
  };
}