import express from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { validateRegister, validateLogin, handleValidationErrors } from '../validators/authValidators.js';
import { register, login, getProfile } from '../controllers/authController.js';
import ApiResponse from '../utils/responseHelper.js';

const router = express.Router();

// Registro de usuario
router.post('/register', validateRegister, handleValidationErrors, register);

// Login de usuario
router.post('/login', validateLogin, handleValidationErrors, login);

// Ruta protegida: perfil del usuario
router.get('/profile', authMiddleware, getProfile);

// Ruta para refrescar token
router.post('/refresh', authMiddleware, async (req, res) => {
  try {
    const { id, email, role } = req.user;
    
    const token = jwt.sign(
      {
        id,
        email,
        role
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json(ApiResponse.success({
      token
    }, 'Token renovado exitosamente'));
  } catch (error) {
    res.status(500).json(ApiResponse.error('Error al renovar token'));
  }
});

export default router;