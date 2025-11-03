import jwt from 'jsonwebtoken';
import supabase from '../config/supabaseClient.js';
import ApiResponse from '../utils/responseHelper.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// Registro de usuario
const register = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

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

// Login de usuario
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signInWithPassword({ 
    email, 
    password 
  });

  if (error) {
    return res.status(401).json(ApiResponse.error(error.message));
  }

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

// Obtener perfil del usuario
const getProfile = asyncHandler(async (req, res) => {
  res.json(ApiResponse.success(req.user, 'Perfil obtenido exitosamente'));
});

export {
  register,
  login,
  getProfile
};