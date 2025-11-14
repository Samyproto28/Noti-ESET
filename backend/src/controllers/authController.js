import jwt from 'jsonwebtoken';
import supabase from '../config/supabaseClient.js';
import ApiResponse from '../utils/responseHelper.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * Controlador de autenticación para la aplicación NotiEset
 * Maneja el registro, login y obtención de perfiles de usuario
 */

/**
 * Registra un nuevo usuario en el sistema
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.body - Cuerpo de la solicitud
 * @param {string} req.body.email - Email del usuario a registrar
 * @param {string} req.body.password - Contraseña del usuario
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Promise<void>} Respuesta JSON con el resultado del registro
 * @throws {Error} Si hay un error al crear el usuario en Supabase
 */
const register = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Crear usuario en Supabase Auth
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: false
  });

  if (error) {
    return res.status(400).json(ApiResponse.error(error.message));
  }

  res.json(ApiResponse.success(
    null,
    'Registro exitoso. Ahora puedes iniciar sesión.'
  ));
});

/**
 * Inicia sesión de un usuario existente
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.body - Cuerpo de la solicitud
 * @param {string} req.body.email - Email del usuario
 * @param {string} req.body.password - Contraseña del usuario
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Promise<void>} Respuesta JSON con token JWT y datos del usuario
 * @throws {Error} Si hay un error en la autenticación
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Autenticar usuario con Supabase
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    return res.status(401).json(ApiResponse.error(error.message));
  }

  // Generar token JWT
  const token = jwt.sign(
    {
      id: data.user.id,
      email: data.user.email,
      role: 'user'
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json(ApiResponse.success({
    token,
    user: {
      id: data.user.id,
      email: data.user.email,
      role: 'user'
    }
  }, 'Login exitoso'));
});

/**
 * Obtiene el perfil del usuario autenticado
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.user - Datos del usuario obtenidos del middleware de autenticación
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Promise<void>} Respuesta JSON con los datos del perfil
 */
const getProfile = asyncHandler(async (req, res) => {
  res.json(ApiResponse.success(req.user, 'Perfil obtenido exitosamente'));
});

export {
  register,
  login,
  getProfile
};