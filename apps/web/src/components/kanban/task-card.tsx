'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMutation } from '@tanstack/react-query';
import type { TaskDto } from '@/lib/api/tasks.api';
import { tasksApi } from '@/lib/api/tasks.api';
import { useKanbanStore } from '@/store/kanban.store';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, Paperclip, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRIORIDADES: TaskDto['priority'][] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const PRIORIDAD: Record<string, { label: string; badge: string }> = {
  LOW: { label: 'Baja', badge: 'bg-slate-100 text-slate-600 border border-slate-200' },
  MEDIUM: { label: 'Media', badge: 'bg-amber-100 text-amber-700 border border-amber-200' },
  HIGH: { label: 'Alta', badge: 'bg-orange-100 text-orange-700 border border-orange-200' },
  URGENT: { label: 'Urgente', badge: 'bg-red-100 text-red-700 border border-red-200' },
};

const PRIORIDAD_DOT: Record<string, string> = {
  LOW: 'hsl(215 16% 60%)',
  MEDIUM: 'hsl(38 92% 50%)',
  HIGH: 'hsl(25 95% 53%)',
  URGENT: 'hsl(0 84% 60%)',
};

export function TaskCard({
  task,
  isDragging,
  onOpenDetail,
  canWrite = true,
}: {
  task: TaskDto;
  isDragging?: boolean;
  onOpenDetail?: (task: TaskDto) => void;
  canWrite?: boolean;
}) {
  const { actualizarTarea } = useKanbanStore();

  const { attributes, listeners, setNodeRef, transform, transition, isSorting } = useSortable({
    id: task.id,
  });

  const cambiarPrioridad = useMutation({
    mutationFn: (priority: TaskDto['priority']) => tasksApi.actualizarTarea(task.id, { priority }),
    onMutate: (priority) => {
      // Actualización optimista: cambia en pantalla antes de que responda el servidor
      actualizarTarea(task.id, { priority });
    },
  });

  function handlePrioridadClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!canWrite) return;
    const idx = PRIORIDADES.indexOf(task.priority);
    const siguiente = PRIORIDADES[(idx + 1) % PRIORIDADES.length];
    cambiarPrioridad.mutate(siguiente);
  }

  // Distinguir click de drag: solo abre el panel si el puntero no se movió
  function handleCardClick() {
    onOpenDetail?.(task);
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isSorting ? transition : undefined,
  };

  const p = PRIORIDAD[task.priority] ?? PRIORIDAD.MEDIUM;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(canWrite ? listeners : {})}
      onClick={handleCardClick}
      className={cn(
        'group bg-card border rounded-xl p-3.5 select-none',
        canWrite ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
        'hover:shadow-md hover:border-primary/30 transition-all duration-150',
        isDragging && 'opacity-40 shadow-xl rotate-1 scale-105'
      )}
    >
      {/* Dot de prioridad + título */}
      <div className="flex items-start gap-2 mb-3">
        <span
          className="w-2 h-2 rounded-full mt-1.5 shrink-0"
          style={{ backgroundColor: PRIORIDAD_DOT[task.priority] }}
        />
        <p className="text-sm font-medium text-foreground leading-snug">{task.title}</p>
      </div>

      {/* Tags */}
      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.tags.slice(0, 2).map((tag) => (
            <span
              key={tag.id}
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: tag.color + '20', color: tag.color }}
            >
              {tag.label}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-1 pt-2 border-t border-border/60">
        <div className="flex items-center gap-2 text-muted-foreground">
          {task.dueDate && (
            <span className="flex items-center gap-1 text-xs">
              <Calendar className="w-3 h-3" />
              {new Date(task.dueDate).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
            </span>
          )}
          {task.commentCount > 0 && (
            <span className="flex items-center gap-1 text-xs">
              <MessageSquare className="w-3 h-3" />
              {task.commentCount}
            </span>
          )}
          {task.attachmentCount > 0 && (
            <span className="flex items-center gap-1 text-xs">
              <Paperclip className="w-3 h-3" />
              {task.attachmentCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Badge clickeable para cambiar prioridad */}
          <button
            onClick={handlePrioridadClick}
            title={canWrite ? 'Click para cambiar prioridad' : undefined}
            className={cn(
              'text-[10px] px-1.5 py-0.5 rounded-full font-medium transition-opacity',
              canWrite ? 'hover:opacity-70 cursor-pointer' : 'cursor-default',
              p.badge
            )}
          >
            {p.label}
          </button>
          {task.assignee && (
            <Avatar className="w-5 h-5">
              <AvatarFallback className="text-[9px] bg-primary/20 text-primary font-semibold">
                {task.assignee.name[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
    </div>
  );
}
