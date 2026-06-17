import { Router } from 'express';
import { tasksController } from '../controllers/tasks.controller';
import { authenticate } from '../middlewares/authenticate';
import { validate } from '../middlewares/validate';
import {
  actualizarTareaSchema,
  crearComentarioSchema,
  crearTareaSchema,
  moverTareaSchema,
  solicitarUploadSchema,
} from '../schemas/tasks.schemas';

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Tasks
 *   description: Gestión de tareas del tablero Kanban
 */

/**
 * @swagger
 * /tasks:
 *   post:
 *     summary: Crea una nueva tarea en una columna
 *     tags: [Tasks]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [projectId, columnId, title]
 *             properties:
 *               projectId:
 *                 type: string
 *               columnId:
 *                 type: string
 *               title:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH, URGENT]
 *     responses:
 *       201:
 *         description: Tarea creada y evento SSE emitido al proyecto
 */
router.post('/', validate(crearTareaSchema), tasksController.crear);
router.get('/:id', tasksController.obtener);
router.patch('/:id', validate(actualizarTareaSchema), tasksController.actualizar);
router.delete('/:id', tasksController.eliminar);

/**
 * @swagger
 * /tasks/{id}/move:
 *   patch:
 *     summary: Mueve una tarea (drag & drop entre columnas o reordenamiento)
 *     tags: [Tasks]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [columnId, order]
 *             properties:
 *               columnId:
 *                 type: string
 *               order:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Tarea movida y evento SSE emitido a todos los conectados
 */
router.patch('/:id/move', validate(moverTareaSchema), tasksController.mover);

router.post('/:id/comments', validate(crearComentarioSchema), tasksController.agregarComentario);

/**
 * @swagger
 * /tasks/{id}/attachments/upload-url:
 *   post:
 *     summary: Solicita una presigned URL para subir un archivo a S3
 *     tags: [Tasks]
 *     description: |
 *       Retorna una URL firmada para que el cliente suba el archivo directamente a S3
 *       sin pasar por el servidor. Válida por 5 minutos.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: URL de subida generada
 */
router.post(
  '/:id/attachments/upload-url',
  validate(solicitarUploadSchema),
  tasksController.solicitarUpload
);
router.delete('/:id/attachments/:attachmentId', tasksController.eliminarAdjunto);

export default router;
