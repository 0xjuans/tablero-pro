import { Router } from 'express';
import { columnsController } from '../controllers/columns.controller';
import { authenticate } from '../middlewares/authenticate';
import { validate } from '../middlewares/validate';
import { crearColumnaSchema, reordenarColumnasSchema } from '../schemas/tasks.schemas';

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Columns
 *   description: Gestión de columnas del tablero Kanban
 */

router.post('/', validate(crearColumnaSchema), columnsController.crear);
router.patch('/:id', columnsController.actualizar);
router.delete('/:id', columnsController.eliminar);

/**
 * @swagger
 * /columns/{projectId}/reorder:
 *   patch:
 *     summary: Reordena las columnas del tablero (drag & drop de columnas)
 *     tags: [Columns]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [columnIds]
 *             properties:
 *               columnIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Columnas reordenadas
 */
router.patch('/:projectId/reorder', validate(reordenarColumnasSchema), columnsController.reordenar);

export default router;
