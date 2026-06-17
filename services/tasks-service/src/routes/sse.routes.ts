import { Router } from 'express';
import { sseController } from '../controllers/sse.controller';
import { authenticate } from '../middlewares/authenticate';

const router = Router();

/**
 * @swagger
 * /sse/{projectId}:
 *   get:
 *     summary: Abre una conexión SSE para recibir eventos en tiempo real del proyecto
 *     tags: [Tasks]
 *     description: |
 *       Mantiene una conexión HTTP abierta. El servidor empuja eventos cuando:
 *       - Se crea/actualiza/elimina una tarea
 *       - Se mueve una tarea entre columnas
 *       - Alguien agrega un comentario
 *       El cliente usa EventSource en el navegador para escuchar estos eventos.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Stream SSE activo (Content-Type text/event-stream)
 */
router.get('/:projectId', authenticate, sseController.conectar);

export default router;
