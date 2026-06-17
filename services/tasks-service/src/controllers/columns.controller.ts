import { Request, Response } from 'express';
import { columnsService } from '../services/columns.service';

export const columnsController = {
  async crear(req: Request, res: Response) {
    try {
      const columna = await columnsService.crear(req.body);
      res.status(201).json({ success: true, data: columna });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al crear columna';
      res.status(500).json({ success: false, error: mensaje });
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
      const columna = await columnsService.actualizar(req.params.id, req.body.name);
      res.status(200).json({ success: true, data: columna });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al actualizar columna';
      res.status(500).json({ success: false, error: mensaje });
    }
  },

  async eliminar(req: Request, res: Response) {
    try {
      await columnsService.eliminar(req.params.id);
      res.status(200).json({ success: true, message: 'Columna eliminada' });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al eliminar columna';
      res.status(500).json({ success: false, error: mensaje });
    }
  },
};
