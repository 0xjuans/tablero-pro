import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import tasksRoutes from './routes/tasks.routes';
import columnsRoutes from './routes/columns.routes';
import sseRoutes from './routes/sse.routes';
import { swaggerSpec } from './swagger/swagger';
import { sseService } from './services/sse.service';

const app = express();

app.use(helmet());
app.use(express.json({ limit: '10kb' }));
app.use(
  cors({
    origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    credentials: true,
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/tasks', tasksRoutes);
app.use('/columns', columnsRoutes);
// La ruta SSE no pasa por el rate limiter ya que es una conexión persistente
app.use('/sse', sseRoutes);

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'tasks-service',
    // Incluimos las conexiones activas para facilitar el monitoreo
    sseConnections: sseService.totalConexiones(),
  });
});

export default app;
