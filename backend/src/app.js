// Importaciones ES6 para consistencia con el resto del proyecto
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandler.js';
import compressionMiddleware from './middleware/compressionMiddleware.js';
import { performanceMiddleware, getPerformanceStats, resetPerformanceStats } from './middleware/performanceMiddleware.js';
import forumRoutes from './routes/forum.routes.js';
import categoryRoutes from './routes/category.routes.js';
import reactionRoutes from './routes/reaction.routes.js';
import authRoutes from './routes/auth.routes.js';
import newsRoutes from './routes/news.routes.js';

const app = express();

// Monitoreo de rendimiento (debe ir primero para medir todo)
app.use(performanceMiddleware);

// Seguridad: Helmet para cabeceras seguras
app.use(helmet());

// Seguridad: CORS solo para dominios permitidos (configurado mediante variables de entorno)
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5500', 'http://127.0.0.1:5500'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Compresión de respuestas para mejorar el rendimiento
app.use(compressionMiddleware);

// Parseo de JSON
app.use(express.json());

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ ok: true, message: 'Backend NotiESET funcionando' });
});

// Ruta de health check para Cypress
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend NotiESET saludable' });
});

// Ruta para obtener estadísticas de rendimiento
app.get('/api/performance/stats', (req, res) => {
  const stats = getPerformanceStats();
  res.json({ success: true, data: stats });
});

// Ruta para resetear estadísticas de rendimiento
app.post('/api/performance/reset', (req, res) => {
  resetPerformanceStats();
  res.json({ success: true, message: 'Estadísticas de rendimiento reseteadas' });
});

// Rutas del foro
app.use('/api/forum', forumRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/reactions', reactionRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/news', newsRoutes);

// Middleware de manejo de errores (debe ir al final)
app.use(errorHandler);

export default app;
