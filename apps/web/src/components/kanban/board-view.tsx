'use client';

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useEffect, useState, useRef } from 'react';
import { tasksApi, type TaskDto } from '@/lib/api/tasks.api';
import { projectsApi } from '@/lib/api/projects.api';
import { useKanbanStore } from '@/store/kanban.store';
import { useWorkspaceRole, puedeEscribir, puedeAdministrar } from '@/hooks/useWorkspaceRole';
import { KanbanColumn } from './kanban-column';
import { TaskCard } from './task-card';
import { TaskDetailPanel } from './task-detail-panel';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Kanban } from 'lucide-react';

export function BoardView({ projectId }: { projectId: string }) {
  const {
    columnas,
    setColumnas,
    activeTaskId,
    setActiveTaskId,
    moverTarea,
    agregarTarea,
    agregarColumna,
  } = useKanbanStore();

  const [tareaSeleccionada, setTareaSeleccionada] = useState<TaskDto | null>(null);
  const [dialogColumna, setDialogColumna] = useState(false);
  const [nombreColumna, setNombreColumna] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: tableroData, isLoading } = useQuery({
    queryKey: ['tablero', projectId],
    queryFn: () => tasksApi.obtenerTablero(projectId),
  });

  const { data: proyecto } = useQuery({
    queryKey: ['proyecto', projectId],
    queryFn: () => projectsApi.obtenerProyecto(projectId),
  });

  const workspaceId = proyecto?.workspaceId ?? '';
  const role = useWorkspaceRole(workspaceId);
  const canWrite = puedeEscribir(role); // MEMBER, ADMIN, OWNER
  const canAdmin = puedeAdministrar(role); // ADMIN, OWNER

  useEffect(() => {
    if (tableroData) setColumnas(tableroData.map((c) => ({ ...c, tasks: c.tasks ?? [] })));
  }, [tableroData, setColumnas]);

  const moverTareaApi = useMutation({ mutationFn: tasksApi.moverTarea });

  const crearTareaApi = useMutation({
    mutationFn: tasksApi.crearTarea,
    onSuccess: (tarea) => agregarTarea(tarea.columnId, tarea),
  });

  const crearColumnaApi = useMutation({
    mutationFn: (name: string) => tasksApi.crearColumna({ name, projectId }),
    onSuccess: (col) => {
      agregarColumna(col);
      setNombreColumna('');
      setDialogColumna(false);
    },
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const activeTask = activeTaskId
    ? columnas.flatMap((c) => c.tasks).find((t) => t.id === activeTaskId)
    : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveTaskId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTaskId(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    const columnaDestino = columnas.find(
      (c) => c.id === overId || c.tasks.some((t) => t.id === overId)
    );
    if (!columnaDestino) return;

    const idx = columnaDestino.tasks.findIndex((t) => t.id === overId);
    const targetOrder = idx === -1 ? columnaDestino.tasks.length : idx;

    moverTarea(taskId, columnaDestino.id, targetOrder);
    moverTareaApi.mutate({ taskId, columnId: columnaDestino.id, order: targetOrder });
  }

  function handleCrearTarea(columnId: string, title: string) {
    crearTareaApi.mutate({ title, columnId, projectId });
  }

  function handleAbrirDialogColumna() {
    setNombreColumna('');
    setDialogColumna(true);
    // Pequeño delay para que el dialog esté montado antes de hacer focus
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleConfirmarColumna() {
    const nombre = nombreColumna.trim();
    if (!nombre) return;
    crearColumnaApi.mutate(nombre);
  }

  const totalTareas = columnas.reduce((acc, c) => acc + (c.tasks?.length ?? 0), 0);

  const tareaEnStore = tareaSeleccionada
    ? (columnas.flatMap((c) => c.tasks).find((t) => t.id === tareaSeleccionada.id) ?? null)
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header del board */}
      <div className="border-b px-6 py-4 flex items-center justify-between bg-background shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
            <Kanban className="w-4 h-4 text-violet-700" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight">Tablero</h1>
            <p className="text-xs text-muted-foreground">
              {columnas.length} columnas · {totalTareas} tareas
            </p>
          </div>
        </div>
        {canAdmin && (
          <Button size="sm" variant="outline" onClick={handleAbrirDialogColumna}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Nueva columna
          </Button>
        )}
      </div>

      {/* Kanban */}
      <div className="flex-1 overflow-auto p-5">
        {isLoading ? (
          <div className="flex gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-[280px] shrink-0 space-y-2">
                <Skeleton className="h-7 w-32 rounded-lg" />
                <Skeleton className="h-[200px] rounded-xl" />
              </div>
            ))}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 items-start min-w-max">
              {columnas.map((col) => (
                <KanbanColumn
                  key={col.id}
                  column={col}
                  onCrearTarea={handleCrearTarea}
                  onOpenDetail={setTareaSeleccionada}
                  canWrite={canWrite}
                />
              ))}
            </div>

            <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
              {activeTask && <TaskCard task={activeTask} isDragging />}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Dialog para crear columna */}
      <Dialog open={dialogColumna} onOpenChange={setDialogColumna}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nueva columna</DialogTitle>
          </DialogHeader>
          <Input
            ref={inputRef}
            value={nombreColumna}
            onChange={(e) => setNombreColumna(e.target.value)}
            placeholder="Ej: En revisión, Bloqueado..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleConfirmarColumna();
              if (e.key === 'Escape') setDialogColumna(false);
            }}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogColumna(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmarColumna}
              disabled={!nombreColumna.trim() || crearColumnaApi.isPending}
            >
              {crearColumnaApi.isPending ? 'Creando...' : 'Crear columna'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Panel de detalle de tarea */}
      <TaskDetailPanel
        task={tareaEnStore}
        workspaceId={workspaceId}
        canWrite={canWrite}
        onClose={() => setTareaSeleccionada(null)}
      />
    </div>
  );
}
