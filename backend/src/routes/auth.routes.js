const express = require('express');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabaseClient');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// Registro de usuario
router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y password son requeridos' });
  }
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false
    });
    if (error) {
      console.error('Error en registro:', error);
      return res.status(400).json({ error: error.message });
    }
    res.json({ message: 'Registro exitoso. Ahora puedes iniciar sesión.' });
  } catch (err) {
    console.error('Error inesperado en registro:', err);
    res.status(500).json({ error: 'Error interno en el registro' });
  }
});

// Login de usuario
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y password son requeridos' });
  }
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('Error en login:', error);
      return res.status(401).json({ error: error.message });
    }
    const token = jwt.sign({ id: data.user.id, email: data.user.email, role: 'user' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: data.user.id, email: data.user.email, role: 'user' } });
  } catch (err) {
    console.error('Error inesperado en login:', err);
    res.status(500).json({ error: 'Error interno en el login' });
  }
});

// Ruta protegida: perfil del usuario
router.get('/profile', authMiddleware, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router; 