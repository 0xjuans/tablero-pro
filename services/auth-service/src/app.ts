import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import authRoutes from './routes/auth.routes';
import { swaggerSpec } from './swagger/swagger';

const app = express();

// helmet agrega headers de seguridad HTTP automáticamente (protege contra XSS, clickjacking, etc.)
app.use(helmet());

// Permite recibir JSON en el body de los requests, limitado a 10kb para evitar ataques de payload gigante
app.use(express.json({ limit: '10kb' }));

// CORS: solo acepta requests del frontend de Next.js
app.use(
  cors({
    origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    credentials: true,
  })
);

// Rate limiting: máximo 10 intentos de auth por IP cada 15 minutos.
// Protege contra ataques de fuerza bruta (intentar muchas contraseñas seguidas).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: 'Demasiados intentos. Espera 15 minutos antes de intentar de nuevo.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // En desarrollo se omite el rate limiter para loopback (tests automatizados)
  skip: (req) => process.env.NODE_ENV !== 'production' && req.ip === '::1',
});

// Documentación Swagger disponible en /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Todas las rutas de auth con el rate limiter aplicado
app.use('/', authLimiter, authRoutes);

// Ruta de salud para que Docker y el load balancer sepan que el servicio está vivo
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'auth-service' });
});

export default app;
