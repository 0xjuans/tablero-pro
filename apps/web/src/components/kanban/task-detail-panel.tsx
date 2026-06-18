'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { tasksApi, type TaskDto } from '@/lib/api/tasks.api';
import { projectsApi } from '@/lib/api/projects.api';
import { useKanbanStore } from '@/store/kanban.store';
import { Calendar, Flag, User, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  task: TaskDto | null;
  workspaceId: string;
  canWrite: boolean;
  onClose: () => void;
}

const PRIORIDADES: { value: TaskDto['priority']; label: string; color: string }[] = [
  { value: 'LOW', label: 'Baja', color: 'hsl(215 16% 60%)' },
  { value: 'MEDIUM', label: 'Media', color: 'hsl(38 92% 50%)' },
  { value: 'HIGH', label: 'Alta', color: 'hsl(25 95% 53%)' },
  { value: 'URGENT', label: 'Urgente', color: 'hsl(0 84% 60%)' },
];

// El componente recibe key={task.id} desde el padre, así React lo remonta
// automáticamente cuando cambia la tarea y el estado se inicializa limpio.
function TaskDetailPanelInner({
  task,
  workspaceId,
  canWrite,
  onClose,
}: Props & { task: NonNullable<Props['task']> }) {
  const { actualizarTarea } = useKanbanStore();

  const [titulo, setTitulo] = useState(task.title);
  const [descripcion, setDescripcion] = useState(task.description ?? '');
  const [guardado, setGuardado] = useState(false);
  const guardadoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize del textarea según el contenido
  useEffect(() => {
    const el = descRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [descripcion]);

  const { data: miembros = [] } = useQuery({
    queryKey: ['members', workspaceId],
    queryFn: () => projectsApi.listarMiembros(workspaceId),
    enabled: !!workspaceId,
  });

  const mostrarGuardado = useCallback(() => {
    setGuardado(true);
    if (guardadoTimer.current) clearTimeout(guardadoTimer.current);
    guardadoTimer.current = setTimeout(() => setGuardado(false), 2000);
  }, []);

  const actualizar = useMutation({
    mutationFn: (payload: Parameters<typeof tasksApi.actualizarTarea>[1]) =>
      tasksApi.actualizarTarea(task!.id, payload),
    onMutate: (payload) => {
      if ('assigneeId' in payload) {
        const { assigneeId } = payload as { assigneeId: string | null };
        const assignee = assigneeId ? (miembros.find((m) => m.id === assigneeId) ?? null) : null;
        actualizarTarea(task!.id, { assignee });
      } else {
        actualizarTarea(task!.id, payload as Partial<TaskDto>);
      }
    },
    onSuccess: (tareaActualizada) => {
      actualizarTarea(tareaActualizada.id, {
        assignee: tareaActualizada.assignee,
        priority: tareaActualizada.priority,
        title: tareaActualizada.title,
        description: tareaActualizada.description,
      });
      mostrarGuardado();
    },
  });

  function guardarTitulo() {
    const nuevo = titulo.trim();
    if (!nuevo || nuevo === task.title) return;
    actualizar.mutate({ title: nuevo });
  }

  function guardarDescripcion() {
    const nueva = descripcion.trim();
    const anterior = task.description ?? '';
    if (nueva === anterior) return;
    actualizar.mutate({ description: nueva || undefined });
  }

  return (
    <Sheet open={!!task} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[440px] sm:w-[500px] overflow-y-auto p-0 gap-0 flex flex-col">
        {/* Título — editable inline */}
        <div className="px-6 pt-6 pb-4 border-b">
          <SheetTitle className="sr-only">{task.title}</SheetTitle>
          <textarea
            value={titulo}
            onChange={(e) => canWrite && setTitulo(e.target.value)}
            onBlur={canWrite ? guardarTitulo : undefined}
            onKeyDown={
              canWrite
                ? (e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      guardarTitulo();
                      (e.target as HTMLElement).blur();
                    }
                    if (e.key === 'Escape') {
                      setTitulo(task.title);
                      (e.target as HTMLElement).blur();
                    }
                  }
                : undefined
            }
            readOnly={!canWrite}
            rows={2}
            placeholder="Título de la tarea"
            className={cn(
              'w-full resize-none bg-transparent outline-none',
              'text-lg font-semibold leading-snug text-foreground',
              'rounded-md px-2 py-1 -mx-2',
              canWrite ? 'hover:bg-muted/40 focus:bg-muted/50 transition-colors' : 'cursor-default'
            )}
          />
        </div>

        {/* Propiedades */}
        <div className="px-6 py-4 space-y-2">
          {/* Prioridad */}
          <div className="flex items-center min-h-[32px]">
            <div className="flex items-center gap-2 w-32 shrink-0 text-xs text-muted-foreground">
              <Flag className="w-3.5 h-3.5" />
              Prioridad
            </div>
            <Select
              value={task.priority}
              onValueChange={(v) =>
                canWrite && actualizar.mutate({ priority: v as TaskDto['priority'] })
              }
              disabled={!canWrite}
            >
              <SelectTrigger className="h-7 text-xs border-0 bg-transparent hover:bg-muted px-2 w-auto gap-1.5 focus:ring-0 disabled:opacity-60 disabled:cursor-default">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORIDADES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: p.color }}
                      />
                      {p.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Asignado */}
          <div className="flex items-center min-h-[32px]">
            <div className="flex items-center gap-2 w-32 shrink-0 text-xs text-muted-foreground">
              <User className="w-3.5 h-3.5" />
              Asignado a
            </div>
            <Select
              value={task.assignee?.id ?? 'none'}
              onValueChange={(v) =>
                canWrite &&
                actualizar.mutate({ assigneeId: v === 'none' ? null : v } as Parameters<
                  typeof tasksApi.actualizarTarea
                >[1])
              }
              disabled={!canWrite}
            >
              <SelectTrigger className="h-7 text-xs border-0 bg-transparent hover:bg-muted px-2 w-auto gap-1.5 focus:ring-0 disabled:opacity-60 disabled:cursor-default">
                <SelectValue placeholder="Sin asignar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-muted-foreground">Sin asignar</span>
                </SelectItem>
                {miembros.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-4 h-4">
                        <AvatarFallback className="text-[8px] bg-primary/20">
                          {m.name[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {m.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fecha límite */}
          {task.dueDate && (
            <div className="flex items-center min-h-[32px]">
              <div className="flex items-center gap-2 w-32 shrink-0 text-xs text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                Fecha límite
              </div>
              <span className="text-xs text-foreground px-2">
                {new Date(task.dueDate).toLocaleDateString('es', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
            </div>
          )}
        </div>

        <Separator />

        {/* Descripción — textarea auto-guardable */}
        <div className="px-6 py-4 flex-1">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground">Descripción</p>
            {/* Indicador de guardado — aparece 2 seg y desaparece */}
            <span
              className={cn(
                'flex items-center gap-1 text-xs text-green-600 transition-opacity duration-300',
                guardado ? 'opacity-100' : 'opacity-0'
              )}
            >
              <Check className="w-3 h-3" />
              Guardado
            </span>
          </div>
          <textarea
            ref={descRef}
            value={descripcion}
            onChange={(e) => canWrite && setDescripcion(e.target.value)}
            onBlur={canWrite ? guardarDescripcion : undefined}
            onKeyDown={
              canWrite
                ? (e) => {
                    if (e.key === 'Escape') {
                      setDescripcion(task.description ?? '');
                      descRef.current?.blur();
                    }
                  }
                : undefined
            }
            readOnly={!canWrite}
            placeholder={canWrite ? 'Agrega una descripción...' : 'Sin descripción'}
            className={cn(
              'w-full min-h-[120px] resize-none text-sm bg-transparent outline-none',
              'rounded-lg px-3 py-2.5 -mx-3',
              canWrite
                ? 'hover:bg-muted/40 focus:bg-muted/50 transition-colors placeholder:text-muted-foreground/50'
                : 'cursor-default placeholder:text-muted-foreground/30',
              'leading-relaxed'
            )}
          />
        </div>

        {/* Footer con metadata */}
        <div className="px-6 py-3 border-t">
          <p className="text-[11px] text-muted-foreground/60 font-mono">
            #{task.id.slice(-8)}
            {task.commentCount > 0 &&
              ` · ${task.commentCount} comentario${task.commentCount !== 1 ? 's' : ''}`}
            {task.attachmentCount > 0 &&
              ` · ${task.attachmentCount} adjunto${task.attachmentCount !== 1 ? 's' : ''}`}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Wrapper público: maneja el caso task=null y pasa key para remontaje limpio
export function TaskDetailPanel({ task, workspaceId, canWrite, onClose }: Props) {
  if (!task) return null;
  return (
    <TaskDetailPanelInner
      key={task.id}
      task={task}
      workspaceId={workspaceId}
      canWrite={canWrite}
      onClose={onClose}
    />
  );
}
