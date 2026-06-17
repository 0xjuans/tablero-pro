import { Request, Response } from 'express';
import { sseService } from '../services/sse.service';

export const sseController = {
  // El cliente se conecta a esta ruta y la conexión se mantiene abierta indefinidamente.
  // Cada vez que algo cambia en el proyecto, el servidor empuja un evento por esta conexión.
  conectar(req: Request, res: Response) {
    const { projectId } = req.params;

    // Cabeceras especiales que le dicen al navegador que esto es un stream SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // desactiva el buffer de Nginx para SSE

    // Enviamos un evento inicial para confirmar que la conexión está activa
    res.write(`data: ${JSON.stringify({ type: 'connected', projectId })}\n\n`);

    sseService.agregarConexion(projectId, res);

    // Cuando el cliente cierra la pestaña o pierde conexión, limpiamos su referencia
    req.on('close', () => {
      sseService.eliminarConexion(projectId, res);
    });
  },
};
