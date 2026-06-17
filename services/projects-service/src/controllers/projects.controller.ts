import { Request, Response } from 'express';
import { projectsService } from '../services/projects.service';

export const projectsController = {
  async crear(req: Request, res: Response) {
    try {
      const proyecto = await projectsService.crear(req.body, req.user!.sub);
      res.status(201).json({ success: true, data: proyecto });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al crear proyecto';
      const status = mensaje.includes('permisos') ? 403 : 500;
      res.status(status).json({ success: false, error: mensaje });
    }
  },

  async listar(req: Request, res: Response) {
    try {
      const { workspaceId } = req.query;

      if (!workspaceId || typeof workspaceId !== 'string') {
        res.status(400).json({ success: false, error: 'El workspaceId es requerido' });
        return;
      }

      const proyectos = await projectsService.listarPorWorkspace(workspaceId, req.user!.sub);
      res.status(200).json({ success: true, data: proyectos });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al listar proyectos';
      res.status(500).json({ success: false, error: mensaje });
    }
  },

  async obtener(req: Request, res: Response) {
    try {
      const proyecto = await projectsService.obtenerPorId(req.params.id, req.user!.sub);
      res.status(200).json({ success: true, data: proyecto });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al obtener proyecto';
      const status = mensaje.includes('acceso') ? 403 : 500;
      res.status(status).json({ success: false, error: mensaje });
    }
  },

  async actualizar(req: Request, res: Response) {
    try {
      const proyecto = await projectsService.actualizar(req.params.id, req.body, req.user!.sub);
      res.status(200).json({ success: true, data: proyecto });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al actualizar proyecto';
      const status = mensaje.includes('permisos') ? 403 : 500;
      res.status(status).json({ success: false, error: mensaje });
    }
  },

  async eliminar(req: Request, res: Response) {
    try {
      await projectsService.eliminar(req.params.id, req.user!.sub);
      res.status(200).json({ success: true, message: 'Proyecto eliminado exitosamente' });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al eliminar proyecto';
      const status = mensaje.includes('permisos') ? 403 : 500;
      res.status(status).json({ success: false, error: mensaje });
    }
  },
};
