import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { prisma } from '@tablero-pro/database';
import { authenticate } from './middlewares/authenticate';

const app = express();

app.use(helmet());
app.use(express.json({ limit: '10kb' }));
app.use(
  cors({
    origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    credentials: true,
  })
);

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'notifications-service' });
});

// Listar notificaciones del usuario autenticado
app.get('/notifications', authenticate, async (req, res) => {
  try {
    const userId = req.user!.sub;
    const notificaciones = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ success: true, data: notificaciones });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error al listar notificaciones';
    res.status(500).json({ success: false, error: mensaje });
  }
});

// Marcar una notificación como leída
app.patch('/notifications/:id/read', authenticate, async (req, res) => {
  try {
    const userId = req.user!.sub;
    const notif = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!notif || notif.userId !== userId) {
      res.status(404).json({ success: false, error: 'Notificación no encontrada' });
      return;
    }
    const actualizada = await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true },
    });
    res.json({ success: true, data: actualizada });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error al actualizar notificación';
    res.status(500).json({ success: false, error: mensaje });
  }
});

// Marcar todas las notificaciones como leídas
app.patch('/notifications/read-all', authenticate, async (req, res) => {
  try {
    const userId = req.user!.sub;
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    res.json({ success: true });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error al marcar notificaciones';
    res.status(500).json({ success: false, error: mensaje });
  }
});

export default app;
