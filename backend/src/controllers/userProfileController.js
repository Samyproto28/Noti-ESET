const { getProfileByUserId, upsertProfile } = require('../services/userProfileService');
const ApiResponse = require('../utils/responseHelper');
const { asyncHandler } = require('../middleware/errorHandler');

// Obtener perfil del usuario autenticado
const getMyProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { data, error } = await getProfileByUserId(userId);
  
  if (error) {
    return res.status(500).json(ApiResponse.error(error.message));
  }

  res.json(ApiResponse.success(data, 'Perfil obtenido exitosamente'));
});

// Actualizar perfil del usuario autenticado
const updateMyProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { username, display_name, bio, avatar_url } = req.body;

  const { data, error } = await upsertProfile(userId, {
    username,
    display_name,
    bio,
    avatar_url
  });

  if (error) {
    return res.status(400).json(ApiResponse.error(error.message));
  }

  res.json(ApiResponse.success(data, 'Perfil actualizado exitosamente'));
});

module.exports = {
  getMyProfile,
  updateMyProfile
};