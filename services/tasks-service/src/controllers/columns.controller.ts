import { Request, Response } from 'express';
import { columnsService } from '../services/columns.service';

export const columnsController = {
  async listar(req: Request, res: Response) {
    try {
      const { projectId } = req.query;
      if (!projectId || typeof projectId !== 'string') {
        res.status(400).json({ success: false, error: 'projectId requerido' });
        return;
      }
      const columnas = await columnsService.listar(projectId);
      res.status(200).json({ success: true, data: columnas });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al listar columnas';
      res.status(500).json({ success: false, error: mensaje });
    }
  },

  async crear(req: Request, res: Response) {
    try {
      const columna = await columnsService.crear(req.body, req.user!.sub);
      res.status(201).json({ success: true, data: columna });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al crear columna';
      const status = mensaje.includes('administradores') ? 403 : 500;
      res.status(status).json({ success: false, error: mensaje });
    }
  },

  async reordenar(req: Request, res: Response) {
    try {
      await columnsService.reordenar(req.params.projectId, req.body.columnIds);
      res.status(200).json({ success: true, message: 'Columnas reordenadas' });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al reordenar columnas';
      res.status(500).json({ success: false, error: mensaje });
    }
  },

  async actualizar(req: Request, res: Response) {
    try {
      const columna = await columnsService.actualizar(req.params.id, req.body.name, req.user!.sub);
      res.status(200).json({ success: true, data: columna });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al actualizar columna';
      const status = mensaje.includes('administradores') ? 403 : 500;
      res.status(status).json({ success: false, error: mensaje });
    }
  },

  async eliminar(req: Request, res: Response) {
    try {
      await columnsService.eliminar(req.params.id, req.user!.sub);
      res.status(200).json({ success: true, message: 'Columna eliminada' });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al eliminar columna';
      const status = mensaje.includes('administradores') ? 403 : 500;
      res.status(status).json({ success: false, error: mensaje });
    }
  },
};
