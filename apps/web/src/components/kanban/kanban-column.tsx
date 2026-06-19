'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useState } from 'react';
import type { ColumnDto, TaskDto } from '@/lib/api/tasks.api';
import { TaskCard } from './task-card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  column: ColumnDto;
  onCrearTarea: (columnId: string, title: string) => void;
  onOpenDetail: (task: TaskDto) => void;
  onEliminarColumna: (columnId: string) => void;
  canWrite: boolean;
  canAdmin: boolean;
}

const HEADER_COLORS: Record<number, string> = {
  0: 'hsl(221 83% 53%)',
  1: 'hsl(38 92% 50%)',
  2: 'hsl(160 84% 39%)',
  3: 'hsl(262 83% 58%)',
  4: 'hsl(343 87% 55%)',
};

export function KanbanColumn({
  column,
  onCrearTarea,
  onOpenDetail,
  onEliminarColumna,
  canWrite,
  canAdmin,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [creando, setCreando] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && titulo.trim()) {
      onCrearTarea(column.id, titulo.trim());
      setTitulo('');
      setCreando(false);
    }
    if (e.key === 'Escape') {
      setTitulo('');
      setCreando(false);
    }
  }

  const dotColor = HEADER_COLORS[column.order % 5] ?? 'hsl(240 5% 65%)';
  const tareaCount = column.tasks.length;

  return (
    <div className="group/col flex flex-col w-[280px] shrink-0">
      {/* Cabecera */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: dotColor }}
          />
          <span className="text-sm font-semibold text-foreground">{column.name}</span>
          <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5 font-medium">
            {tareaCount}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {canWrite && (
            <button
              onClick={() => setCreando(true)}
              className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Icono de basura — aparece al hacer hover sobre la columna, solo para admins */}
          {canAdmin && (
            <button
              onClick={() => setConfirmarEliminar(true)}
              className="w-6 h-6 rounded flex items-center justify-center text-destructive/0 group-hover/col:text-destructive/50 hover:!text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Zona de drop */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 flex flex-col gap-2 p-2 rounded-xl min-h-[200px] transition-colors',
          isOver ? 'bg-primary/5 ring-2 ring-primary/20' : 'bg-muted/50'
        )}
      >
        <SortableContext
          items={column.tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {column.tasks.map((task) => (
            <TaskCard key={task.id} task={task} onOpenDetail={onOpenDetail} canWrite={canWrite} />
          ))}
        </SortableContext>

        {canWrite &&
          (creando ? (
            <div className="bg-card border border-primary/40 rounded-xl p-3 shadow-sm">
              <input
                autoFocus
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Título de la tarea..."
                className="w-full text-sm outline-none bg-transparent text-foreground placeholder:text-muted-foreground"
              />
              <div className="flex gap-1.5 mt-2">
                <Button
                  size="sm"
                  className="h-7 text-xs px-3"
                  onClick={() => {
                    if (titulo.trim()) {
                      onCrearTarea(column.id, titulo.trim());
                      setTitulo('');
                      setCreando(false);
                    }
                  }}
                >
                  Agregar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs px-2"
                  onClick={() => {
                    setTitulo('');
                    setCreando(false);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setCreando(true)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground py-1.5 px-2 rounded-lg hover:bg-muted transition-colors w-full"
            >
              <Plus className="w-3.5 h-3.5" />
              Agregar tarea
            </button>
          ))}
      </div>

      {/* Diálogo de confirmación — acción destructiva */}
      <AlertDialog open={confirmarEliminar} onOpenChange={setConfirmarEliminar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar columna &quot;{column.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              {tareaCount > 0
                ? `Esta acción eliminará la columna y sus ${tareaCount} tarea${tareaCount !== 1 ? 's' : ''}. No se puede deshacer.`
                : 'Esta columna está vacía. La acción no se puede deshacer.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onEliminarColumna(column.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar columna
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
