import { Response } from 'express';
import type { SseEvent } from '@tablero-pro/types';

// Guardamos en memoria todas las conexiones SSE activas agrupadas por projectId.
// Cuando alguien abre el tablero de un proyecto, su conexión queda aquí hasta que cierra la pestaña.
const conexiones = new Map<string, Set<Response>>();

export const sseService = {
  // Registra una nueva conexión SSE para un proyecto específico
  agregarConexion(projectId: string, res: Response) {
    if (!conexiones.has(projectId)) {
      conexiones.set(projectId, new Set());
    }
    conexiones.get(projectId)!.add(res);
  },

  // Elimina la conexión cuando el cliente cierra la pestaña o se desconecta
  eliminarConexion(projectId: string, res: Response) {
    const grupo = conexiones.get(projectId);
    if (grupo) {
      grupo.delete(res);
      // Si no quedan conexiones para ese proyecto, limpiamos el mapa
      if (grupo.size === 0) {
        conexiones.delete(projectId);
      }
    }
  },

  // Envía un evento a TODOS los clientes conectados a un proyecto.
  // El formato SSE es: "data: <json>\n\n" — así lo espera el EventSource del navegador.
  emitir(projectId: string, evento: SseEvent) {
    const grupo = conexiones.get(projectId);
    if (!grupo) return;

    const mensaje = `data: ${JSON.stringify(evento)}\n\n`;

    grupo.forEach((res) => {
      try {
        res.write(mensaje);
      } catch (_error) {
        // Si falla al escribir, el cliente ya se desconectó — lo removemos
        grupo.delete(res);
      }
    });
  },

  // Retorna cuántas conexiones activas hay (útil para monitoreo)
  totalConexiones(): number {
    let total = 0;
    conexiones.forEach((grupo) => (total += grupo.size));
    return total;
  },
};
