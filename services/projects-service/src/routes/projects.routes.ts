import { Router } from 'express';
import { projectsController } from '../controllers/projects.controller';
import { authenticate } from '../middlewares/authenticate';
import { validate } from '../middlewares/validate';
import { actualizarProyectoSchema, crearProyectoSchema } from '../schemas/projects.schemas';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Projects
 *   description: Gestión de proyectos
 */

/**
 * @swagger
 * /projects:
 *   post:
 *     summary: Crea un nuevo proyecto dentro de un workspace
 *     tags: [Projects]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, workspaceId]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               workspaceId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Proyecto creado con columnas Kanban por defecto
 *       403:
 *         description: Sin permisos en el workspace
 */
router.post('/', validate(crearProyectoSchema), projectsController.crear);

/**
 * @swagger
 * /projects:
 *   get:
 *     summary: Lista proyectos de un workspace
 *     tags: [Projects]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de proyectos
 */
router.get('/', projectsController.listar);

/**
 * @swagger
 * /projects/{id}:
 *   get:
 *     summary: Obtiene un proyecto con todas sus columnas y tareas
 *     tags: [Projects]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Proyecto con tablero Kanban completo
 *       403:
 *         description: Sin acceso al proyecto
 */
router.get('/:id', projectsController.obtener);
router.patch('/:id', validate(actualizarProyectoSchema), projectsController.actualizar);
router.delete('/:id', projectsController.eliminar);

export default router;
