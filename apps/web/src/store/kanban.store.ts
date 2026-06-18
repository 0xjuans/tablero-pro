import { create } from 'zustand';
import type { ColumnDto, TaskDto } from '@/lib/api/tasks.api';

interface KanbanState {
  columnas: ColumnDto[];
  activeTaskId: string | null;
  setColumnas: (columnas: ColumnDto[]) => void;
  setActiveTaskId: (id: string | null) => void;
  moverTarea: (taskId: string, toColumnId: string, newOrder: number) => void;
  agregarTarea: (columnId: string, tarea: TaskDto) => void;
  agregarColumna: (columna: ColumnDto) => void;
  actualizarTarea: (taskId: string, cambios: Partial<TaskDto>) => void;
}

export const useKanbanStore = create<KanbanState>((set) => ({
  columnas: [],
  activeTaskId: null,

  setColumnas: (columnas) => set({ columnas }),
  setActiveTaskId: (id) => set({ activeTaskId: id }),

  agregarColumna: (columna) =>
    set((state) => ({ columnas: [...state.columnas, { ...columna, tasks: columna.tasks ?? [] }] })),

  actualizarTarea: (taskId, cambios) =>
    set((state) => ({
      columnas: state.columnas.map((col) => ({
        ...col,
        tasks: col.tasks.map((t) => (t.id === taskId ? { ...t, ...cambios } : t)),
      })),
    })),

  agregarTarea: (columnId, tarea) =>
    set((state) => ({
      columnas: state.columnas.map((col) =>
        col.id === columnId ? { ...col, tasks: [...col.tasks, tarea] } : col
      ),
    })),

  // Mueve una tarea entre columnas actualizando el orden optimistamente
  moverTarea: (taskId, toColumnId, newOrder) =>
    set((state) => {
      // Encontrar la tarea en cualquier columna
      let tareaMovida: TaskDto | undefined;
      const columnasBase = state.columnas.map((col) => {
        const idx = col.tasks.findIndex((t) => t.id === taskId);
        if (idx !== -1) {
          tareaMovida = col.tasks[idx];
          return { ...col, tasks: col.tasks.filter((t) => t.id !== taskId) };
        }
        return col;
      });

      if (!tareaMovida) return state;

      const tareaActualizada = { ...tareaMovida, columnId: toColumnId, order: newOrder };

      return {
        columnas: columnasBase.map((col) => {
          if (col.id !== toColumnId) return col;
          const tareas = [...col.tasks];
          tareas.splice(newOrder, 0, tareaActualizada);
          return { ...col, tasks: tareas.map((t, i) => ({ ...t, order: i })) };
        }),
      };
    }),
}));
