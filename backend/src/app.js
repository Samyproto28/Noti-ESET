require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

// Seguridad: Helmet para cabeceras seguras
app.use(helmet());

// Seguridad: CORS solo para dominios permitidos (ajustar origins en producción)
app.use(cors({ origin: 'https://samyproto28.github.io', credentials: true }));

// Parseo de JSON
app.use(express.json());

// Rutas base (se agregarán más adelante)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/news', require('./routes/news'));
app.use('/api/forum', require('./routes/forum'));

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ ok: true, message: 'Backend NotiESET funcionando' });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app; 