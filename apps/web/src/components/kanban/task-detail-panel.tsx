'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
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
import { tasksApi, type TaskDto } from '@/lib/api/tasks.api';
import { projectsApi } from '@/lib/api/projects.api';
import { useKanbanStore } from '@/store/kanban.store';
import { Calendar, Flag, User, Check, ChevronDown, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  task: TaskDto | null;
  workspaceId: string;
  canWrite: boolean;
  canAdmin: boolean;
  onClose: () => void;
}

const PRIORIDADES: { value: TaskDto['priority']; label: string; color: string }[] = [
  { value: 'LOW', label: 'Baja', color: 'hsl(215 16% 60%)' },
  { value: 'MEDIUM', label: 'Media', color: 'hsl(38 92% 50%)' },
  { value: 'HIGH', label: 'Alta', color: 'hsl(25 95% 53%)' },
  { value: 'URGENT', label: 'Urgente', color: 'hsl(0 84% 60%)' },
];

// Dropdown custom con position:fixed para escapar cualquier stacking context del Sheet
function PropiedadDropdown({
  label,
  trigger,
  canWrite,
  children,
}: {
  label: ReactNode;
  trigger: ReactNode;
  canWrite: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  function handleToggle() {
    if (!canWrite) return;
    if (!open && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setCoords({ top: r.bottom + 4, left: r.left });
    }
    setOpen((v) => !v);
  }

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="flex items-center h-8">
      <div className="flex items-center gap-2 w-32 shrink-0 text-xs text-muted-foreground">
        {label}
      </div>
      <button
        ref={triggerRef}
        disabled={!canWrite}
        onClick={handleToggle}
        className={cn(
          'flex items-center gap-1.5 h-7 px-2 rounded-md text-xs transition-colors',
          canWrite ? 'hover:bg-muted cursor-pointer' : 'cursor-default opacity-70'
        )}
      >
        {trigger}
        {canWrite && <ChevronDown className="w-3 h-3 text-muted-foreground ml-0.5" />}
      </button>

      {open && (
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: coords.top, left: coords.left, zIndex: 9999 }}
          className="min-w-[160px] bg-popover border rounded-lg shadow-xl p-1"
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

// El componente recibe key={task.id} desde el padre, así React lo remonta
// automáticamente cuando cambia la tarea y el estado se inicializa limpio.
function TaskDetailPanelInner({
  task,
  workspaceId,
  canWrite,
  canAdmin,
  onClose,
}: Props & { task: NonNullable<Props['task']> }) {
  const { actualizarTarea, eliminarTarea } = useKanbanStore();

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

  const [confirmarEliminar, setConfirmarEliminar] = useState(false);

  const eliminar = useMutation({
    mutationFn: () => tasksApi.eliminarTarea(task.id),
    onMutate: () => {
      // Optimistic: quitamos la tarea del store y cerramos el panel de inmediato
      eliminarTarea(task.id);
      onClose();
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
        <div className="px-6 py-4 space-y-1">
          {/* Prioridad — badges inline, sin dropdown */}
          <div className="flex items-center h-8">
            <div className="flex items-center gap-2 w-32 shrink-0 text-xs text-muted-foreground">
              <Flag className="w-3.5 h-3.5" />
              Prioridad
            </div>
            <div className="flex items-center gap-1">
              {PRIORIDADES.map((p) => {
                const activa = task.priority === p.value;
                return (
                  <button
                    key={p.value}
                    disabled={!canWrite}
                    onClick={() => canWrite && actualizar.mutate({ priority: p.value })}
                    title={p.label}
                    className={cn(
                      'flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-all',
                      canWrite ? 'cursor-pointer hover:opacity-80' : 'cursor-default',
                      activa ? 'text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}
                    style={activa ? { backgroundColor: p.color } : undefined}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Asignado */}
          <PropiedadDropdown
            label={
              <>
                <User className="w-3.5 h-3.5" />
                Asignado a
              </>
            }
            canWrite={canWrite}
            trigger={
              task.assignee ? (
                <>
                  <Avatar className="w-4 h-4">
                    <AvatarFallback className="text-[8px] bg-primary/20">
                      {task.assignee.name[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {task.assignee.name}
                </>
              ) : (
                <span className="text-muted-foreground">Sin asignar</span>
              )
            }
          >
            <button
              onClick={() =>
                actualizar.mutate({ assigneeId: null } as Parameters<
                  typeof tasksApi.actualizarTarea
                >[1])
              }
              className={cn(
                'flex items-center gap-2 w-full px-3 py-1.5 rounded-sm text-xs hover:bg-accent transition-colors',
                !task.assignee ? 'font-medium' : 'text-muted-foreground'
              )}
            >
              Sin asignar
              {!task.assignee && <Check className="w-3 h-3 ml-auto" />}
            </button>
            {miembros.map((m) => (
              <button
                key={m.id}
                onClick={() =>
                  actualizar.mutate({ assigneeId: m.id } as Parameters<
                    typeof tasksApi.actualizarTarea
                  >[1])
                }
                className={cn(
                  'flex items-center gap-2 w-full px-3 py-1.5 rounded-sm text-xs hover:bg-accent transition-colors',
                  task.assignee?.id === m.id && 'font-medium'
                )}
              >
                <Avatar className="w-4 h-4">
                  <AvatarFallback className="text-[8px] bg-primary/20">
                    {m.name[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {m.name}
                {task.assignee?.id === m.id && <Check className="w-3 h-3 ml-auto" />}
              </button>
            ))}
          </PropiedadDropdown>

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

        {/* Footer con metadata y botón de eliminar */}
        <div className="px-6 py-3 border-t flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground/60 font-mono">
            #{task.id.slice(-8)}
            {task.commentCount > 0 &&
              ` · ${task.commentCount} comentario${task.commentCount !== 1 ? 's' : ''}`}
            {task.attachmentCount > 0 &&
              ` · ${task.attachmentCount} adjunto${task.attachmentCount !== 1 ? 's' : ''}`}
          </p>
          {canAdmin && (
            <button
              onClick={() => setConfirmarEliminar(true)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded-md hover:bg-destructive/8"
            >
              <Trash2 className="w-3 h-3" />
              Eliminar tarea
            </button>
          )}
        </div>

        {/* Diálogo de confirmación de eliminación */}
        <AlertDialog open={confirmarEliminar} onOpenChange={setConfirmarEliminar}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar esta tarea?</AlertDialogTitle>
              <AlertDialogDescription>
                Se eliminará &quot;{task.title}&quot; de forma permanente. Esta acción no se puede
                deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => eliminar.mutate()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar tarea
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}

// Wrapper público: maneja el caso task=null y pasa key para remontaje limpio
export function TaskDetailPanel({ task, workspaceId, canWrite, canAdmin, onClose }: Props) {
  if (!task) return null;
  return (
    <TaskDetailPanelInner
      key={task.id}
      task={task}
      workspaceId={workspaceId}
      canWrite={canWrite}
      canAdmin={canAdmin}
      onClose={onClose}
    />
  );
}
