import { Request, Response } from 'express';
import { tasksService } from '../services/tasks.service';

export const tasksController = {
  async crear(req: Request, res: Response) {
    try {
      const tarea = await tasksService.crear(req.body, req.user!.sub);
      res.status(201).json({ success: true, data: tarea });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al crear tarea';
      res.status(500).json({ success: false, error: mensaje });
    }
  },

  async obtener(req: Request, res: Response) {
    try {
      const tarea = await tasksService.obtenerPorId(req.params.id);
      res.status(200).json({ success: true, data: tarea });
    } catch (_error) {
      res.status(404).json({ success: false, error: 'Tarea no encontrada' });
    }
  },

  async actualizar(req: Request, res: Response) {
    try {
      const tarea = await tasksService.actualizar(req.params.id, req.body, req.user!.sub);
      res.status(200).json({ success: true, data: tarea });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al actualizar tarea';
      res.status(500).json({ success: false, error: mensaje });
    }
  },

  async mover(req: Request, res: Response) {
    try {
      const tarea = await tasksService.mover(req.params.id, req.body, req.user!.sub);
      res.status(200).json({ success: true, data: tarea });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al mover tarea';
      res.status(500).json({ success: false, error: mensaje });
    }
  },

  async eliminar(req: Request, res: Response) {
    try {
      await tasksService.eliminar(req.params.id, req.user!.sub);
      res.status(200).json({ success: true, message: 'Tarea eliminada' });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al eliminar tarea';
      res.status(500).json({ success: false, error: mensaje });
    }
  },

  async agregarComentario(req: Request, res: Response) {
    try {
      const comentario = await tasksService.agregarComentario(
        req.params.id,
        req.body,
        req.user!.sub
      );
      res.status(201).json({ success: true, data: comentario });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al agregar comentario';
      res.status(500).json({ success: false, error: mensaje });
    }
  },

  async solicitarUpload(req: Request, res: Response) {
    try {
      const resultado = await tasksService.solicitarUpload(req.params.id, req.body);
      res.status(201).json({ success: true, data: resultado });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al solicitar upload';
      res.status(500).json({ success: false, error: mensaje });
    }
  },

  async eliminarAdjunto(req: Request, res: Response) {
    try {
      await tasksService.eliminarAdjunto(req.params.attachmentId);
      res.status(200).json({ success: true, message: 'Adjunto eliminado' });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al eliminar adjunto';
      res.status(500).json({ success: false, error: mensaje });
    }
  },
};
