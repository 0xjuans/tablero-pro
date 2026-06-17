import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validate } from '../middlewares/validate';
import { loginSchema, refreshTokenSchema, registerSchema } from '../schemas/auth.schemas';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Endpoints de autenticación
 */

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Registra un nuevo usuario
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Juan Pérez
 *               email:
 *                 type: string
 *                 example: juan@ejemplo.com
 *               password:
 *                 type: string
 *                 example: MiPassword123
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
 *       400:
 *         description: Datos inválidos
 *       409:
 *         description: El email ya está en uso
 */
router.post('/register', validate(registerSchema), authController.registrar);

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Inicia sesión con email y contraseña
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Sesión iniciada, retorna tokens JWT
 *       401:
 *         description: Credenciales inválidas
 */
router.post('/login', validate(loginSchema), authController.login);

/**
 * @swagger
 * /refresh:
 *   post:
 *     summary: Renueva el access token usando el refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Nuevos tokens generados
 *       401:
 *         description: Refresh token inválido o expirado
 */
router.post('/refresh', validate(refreshTokenSchema), authController.refresh);

/**
 * @swagger
 * /logout:
 *   post:
 *     summary: Cierra la sesión invalidando el refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Sesión cerrada exitosamente
 */
router.post('/logout', validate(refreshTokenSchema), authController.logout);

export default router;
