import { Router } from 'express';
import { workspacesController } from '../controllers/workspaces.controller';
import { authenticate } from '../middlewares/authenticate';
import { validate } from '../middlewares/validate';
import {
  actualizarWorkspaceSchema,
  crearWorkspaceSchema,
  invitarMiembroSchema,
} from '../schemas/projects.schemas';

const router = Router();

// Todas las rutas de workspaces requieren autenticación
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Workspaces
 *   description: Gestión de espacios de trabajo
 */

/**
 * @swagger
 * /workspaces:
 *   post:
 *     summary: Crea un nuevo workspace
 *     tags: [Workspaces]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, slug]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Mi Empresa
 *               slug:
 *                 type: string
 *                 example: mi-empresa
 *     responses:
 *       201:
 *         description: Workspace creado exitosamente
 *       409:
 *         description: El slug ya está en uso
 */
router.post('/', validate(crearWorkspaceSchema), workspacesController.crear);

/**
 * @swagger
 * /workspaces:
 *   get:
 *     summary: Lista los workspaces del usuario autenticado
 *     tags: [Workspaces]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de workspaces
 */
router.get('/', workspacesController.listar);

/**
 * @swagger
 * /workspaces/{id}:
 *   get:
 *     summary: Obtiene un workspace por ID
 *     tags: [Workspaces]
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
 *         description: Workspace encontrado
 *       403:
 *         description: Sin acceso
 */
router.get('/:id', workspacesController.obtener);
router.patch('/:id', validate(actualizarWorkspaceSchema), workspacesController.actualizar);
router.delete('/:id', workspacesController.eliminar);

/**
 * @swagger
 * /workspaces/{id}/invite:
 *   post:
 *     summary: Invita a un miembro al workspace
 *     tags: [Workspaces]
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
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [ADMIN, MEMBER, VIEWER]
 *     responses:
 *       201:
 *         description: Invitación creada
 *       403:
 *         description: Sin permisos
 */
router.post('/:id/invite', validate(invitarMiembroSchema), workspacesController.invitarMiembro);

export default router;
