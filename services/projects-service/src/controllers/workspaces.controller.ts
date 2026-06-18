import { Request, Response } from 'express';
import { workspacesService } from '../services/workspaces.service';

export const workspacesController = {
  async crear(req: Request, res: Response) {
    try {
      const workspace = await workspacesService.crear(req.body, req.user!.sub);
      res.status(201).json({ success: true, data: workspace });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al crear workspace';
      const status = mensaje.includes('Ya existe') ? 409 : 500;
      res.status(status).json({ success: false, error: mensaje });
    }
  },

  async listar(req: Request, res: Response) {
    try {
      const workspaces = await workspacesService.listarPorUsuario(req.user!.sub);
      res.status(200).json({ success: true, data: workspaces });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al listar workspaces';
      res.status(500).json({ success: false, error: mensaje });
    }
  },

  async obtener(req: Request, res: Response) {
    try {
      const workspace = await workspacesService.obtenerPorId(req.params.id, req.user!.sub);
      res.status(200).json({ success: true, data: workspace });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al obtener workspace';
      const status = mensaje.includes('acceso') ? 403 : 500;
      res.status(status).json({ success: false, error: mensaje });
    }
  },

  async actualizar(req: Request, res: Response) {
    try {
      const workspace = await workspacesService.actualizar(req.params.id, req.body, req.user!.sub);
      res.status(200).json({ success: true, data: workspace });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al actualizar workspace';
      const status = mensaje.includes('permisos') ? 403 : 500;
      res.status(status).json({ success: false, error: mensaje });
    }
  },

  async eliminar(req: Request, res: Response) {
    try {
      await workspacesService.eliminar(req.params.id, req.user!.sub);
      res.status(200).json({ success: true, message: 'Workspace eliminado exitosamente' });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al eliminar workspace';
      const status = mensaje.includes('permisos') ? 403 : 500;
      res.status(status).json({ success: false, error: mensaje });
    }
  },

  async listarMiembros(req: Request, res: Response) {
    try {
      const workspace = await workspacesService.obtenerPorId(req.params.id, req.user!.sub);
      const miembros = workspace.members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        avatarUrl: m.user.avatarUrl,
        role: m.role,
      }));
      res.status(200).json({ success: true, data: miembros });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al listar miembros';
      res.status(500).json({ success: false, error: mensaje });
    }
  },

  async agregarMiembro(req: Request, res: Response) {
    try {
      const miembro = await workspacesService.agregarMiembroDirecto(
        req.params.id,
        req.body,
        req.user!.sub
      );
      res.status(201).json({ success: true, data: miembro });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al agregar miembro';
      const status = mensaje.includes('permisos') ? 403 : mensaje.includes('No existe') ? 404 : 500;
      res.status(status).json({ success: false, error: mensaje });
    }
  },

  async invitarMiembro(req: Request, res: Response) {
    try {
      const invitacion = await workspacesService.invitarMiembro(
        req.params.id,
        req.body,
        req.user!.sub
      );
      res.status(201).json({ success: true, data: invitacion });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error al enviar invitación';
      const status = mensaje.includes('permisos') ? 403 : 500;
      res.status(status).json({ success: false, error: mensaje });
    }
  },
};
