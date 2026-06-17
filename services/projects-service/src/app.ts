import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import workspacesRoutes from './routes/workspaces.routes';
import projectsRoutes from './routes/projects.routes';
import { swaggerSpec } from './swagger/swagger';

const app = express();

app.use(helmet());
app.use(express.json({ limit: '10kb' }));
app.use(
  cors({
    origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    credentials: true,
  })
);

// Rate limit más permisivo que auth ya que son operaciones normales de la app
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Rutas principales del servicio
app.use('/workspaces', workspacesRoutes);
app.use('/projects', projectsRoutes);

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'projects-service' });
});

export default app;
