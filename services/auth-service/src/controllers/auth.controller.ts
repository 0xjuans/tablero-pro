import { Request, Response } from 'express';
import { authService } from '../services/auth.service';

// Cada función del controller sigue el mismo patrón:
// 1. Extrae datos del request (el body ya fue validado por el middleware)
// 2. Llama al service
// 3. Responde con el resultado o captura el error

export const authController = {
  async registrar(req: Request, res: Response) {
    try {
      const resultado = await authService.registrar(req.body);

      res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente',
        data: {
          usuario: resultado.usuario,
          tokens: resultado.tokens,
        },
      });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al registrar usuario';
      // 409 Conflict cuando el email ya existe
      const status = mensaje.includes('Ya existe') ? 409 : 500;
      res.status(status).json({ success: false, error: mensaje });
    }
  },

  async login(req: Request, res: Response) {
    try {
      const resultado = await authService.login(req.body);

      res.status(200).json({
        success: true,
        message: 'Sesión iniciada exitosamente',
        data: {
          usuario: resultado.usuario,
          tokens: resultado.tokens,
        },
      });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al iniciar sesión';
      // 401 Unauthorized para credenciales inválidas
      const status = mensaje.includes('Credenciales') ? 401 : 500;
      res.status(status).json({ success: false, error: mensaje });
    }
  },

  async refresh(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      const tokens = await authService.refrescarToken(refreshToken);

      res.status(200).json({
        success: true,
        data: tokens,
      });
    } catch (_error) {
      // 401 porque el token es inválido o expiró — el cliente debe hacer login de nuevo
      res.status(401).json({ success: false, error: 'Token inválido o expirado' });
    }
  },

  async listarUsuarios(req: Request, res: Response) {
    try {
      const usuarios = await authService.listarUsuarios();
      res.status(200).json({ success: true, data: usuarios });
    } catch (_error) {
      res.status(500).json({ success: false, error: 'Error al listar usuarios' });
    }
  },

  async logout(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      await authService.logout(refreshToken);

      res.status(200).json({
        success: true,
        message: 'Sesión cerrada exitosamente',
      });
    } catch (_error) {
      // Aunque falle, respondemos 200 — para el cliente el logout es exitoso de todas formas
      res.status(200).json({ success: true, message: 'Sesión cerrada' });
    }
  },
};
