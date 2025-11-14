import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { getMyProfile, updateMyProfile } from '../controllers/userProfileController.js';

const router = express.Router();

// Obtener mi perfil
router.get('/me', authMiddleware, getMyProfile);

// Actualizar mi perfil
router.put('/me', authMiddleware, updateMyProfile);

export default router;