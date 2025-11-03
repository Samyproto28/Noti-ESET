const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { getMyProfile, updateMyProfile } = require('../controllers/userProfileController');

const router = express.Router();

// Obtener mi perfil
router.get('/me', authMiddleware, getMyProfile);

// Actualizar mi perfil
router.put('/me', authMiddleware, updateMyProfile);

module.exports = router;