'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useKanbanStore } from '@/store/kanban.store';
import type { ColumnDto, TaskDto } from '@/lib/api/tasks.api';

// Tipos de los payloads que manda el tasks-service por SSE
// createdById es la FK directa (string), siempre presente en el objeto Prisma
type PayloadCreated = TaskDto & { createdById?: string; createdBy?: { id: string } };
type PayloadUpdated = TaskDto & { updatedBy: string };
type PayloadMoved = { taskId: string; columnId: string; order: number; movedBy: string };
type PayloadDeleted = { taskId: string };
type PayloadColCreada = ColumnDto & { createdBy: string };
type PayloadColEliminada = { columnId: string; deletedBy: string };

export function useProjectSSE(projectId: string) {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string } | null)?.accessToken;
  const userId = session?.user?.id;

  const {
    agregarTarea,
    actualizarTarea,
    moverTarea,
    eliminarTarea,
    agregarColumna,
    eliminarColumna,
  } = useKanbanStore();

  useEffect(() => {
    if (!projectId || !token) return;

    const controller = new AbortController();
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    function procesarEvento(event: { type: string; payload: unknown }) {
      switch (event.type) {
        case 'task.created': {
          const tarea = event.payload as PayloadCreated;
          // Usamos createdById (FK directa) como fuente principal; createdBy.id como fallback
          const creadorId = tarea.createdById ?? tarea.createdBy?.id;
          if (creadorId === userId) return;
          // commentCount y attachmentCount no vienen en el payload de creación, default 0
          agregarTarea(tarea.columnId, {
            ...tarea,
            commentCount: tarea.commentCount ?? 0,
            attachmentCount: tarea.attachmentCount ?? 0,
          });
          break;
        }
        case 'task.updated': {
          const p = event.payload as PayloadUpdated;
          if (p.updatedBy === userId) return;
          actualizarTarea(p.id, p);
          break;
        }
        case 'task.moved': {
          const p = event.payload as PayloadMoved;
          if (p.movedBy === userId) return;
          moverTarea(p.taskId, p.columnId, p.order);
          break;
        }
        case 'task.deleted': {
          const p = event.payload as PayloadDeleted;
          eliminarTarea(p.taskId);
          break;
        }
        case 'column.created': {
          const p = event.payload as PayloadColCreada;
          // Ignorar evento propio (el owner ya agregó la columna con optimistic update)
          if (p.createdBy === userId) return;
          agregarColumna({ ...p, tasks: p.tasks ?? [] });
          break;
        }
        case 'column.deleted': {
          const p = event.payload as PayloadColEliminada;
          console.log(
            '[SSE] column.deleted | deletedBy:',
            p.deletedBy,
            '| userId:',
            userId,
            '| skip:',
            p.deletedBy === userId
          );
          if (p.deletedBy === userId) return;
          eliminarColumna(p.columnId);
          break;
        }
      }
    }

    async function conectar() {
      try {
        const sseUrl = `${process.env.NEXT_PUBLIC_TASKS_SERVICE_URL || 'http://localhost:4003'}/sse/${projectId}`;
        console.log('[SSE] Conectando a', sseUrl, '| userId:', userId);
        const res = await fetch(sseUrl, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        console.log('[SSE] Status:', res.status, res.ok ? 'OK' : 'FAIL');
        if (!res.ok || !res.body) return;

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Los eventos SSE llegan como "data: {...}\n\n"
          // Separamos por línea y procesamos las que empiezan con "data: "
          const lineas = buffer.split('\n');
          buffer = lineas.pop() ?? ''; // última línea incompleta se guarda para el próximo chunk

          for (const linea of lineas) {
            if (!linea.startsWith('data: ')) continue;
            try {
              const evento = JSON.parse(linea.slice(6));
              console.log('[SSE] Evento recibido:', evento.type, '| payload:', evento.payload);
              procesarEvento(evento);
            } catch {
              // línea malformada, se ignora
            }
          }
        }

        // Reconectar si el stream se cerró sin abortar explícitamente
        if (!controller.signal.aborted) {
          retryTimer = setTimeout(conectar, 3000);
        }
      } catch {
        if (!controller.signal.aborted) {
          retryTimer = setTimeout(conectar, 3000);
        }
      }
    }

    conectar();

    return () => {
      controller.abort();
      if (retryTimer) clearTimeout(retryTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, token]);
}
