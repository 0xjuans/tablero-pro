import apiClient from './client';

export interface UserDto {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export interface TaskDto {
  id: string;
  title: string;
  description?: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: string;
  order: number;
  columnId: string;
  dueDate?: string | null;
  assignee?: UserDto | null;
  commentCount: number;
  attachmentCount: number;
  tags: { id: string; label: string; color: string }[];
}

export interface ColumnDto {
  id: string;
  name: string;
  order: number;
  projectId: string;
  tasks: TaskDto[];
}

export const tasksApi = {
  async obtenerTablero(projectId: string): Promise<ColumnDto[]> {
    const { data } = await apiClient.get(`/api/tasks/columns?projectId=${projectId}`);
    return data.data;
  },

  async crearTarea(payload: {
    title: string;
    columnId: string;
    projectId: string;
  }): Promise<TaskDto> {
    const { data } = await apiClient.post('/api/tasks/tasks', payload);
    return data.data;
  },

  async moverTarea(payload: { taskId: string; columnId: string; order: number }): Promise<TaskDto> {
    const { data } = await apiClient.patch(`/api/tasks/tasks/${payload.taskId}/move`, {
      columnId: payload.columnId,
      order: payload.order,
    });
    return data.data;
  },

  async crearColumna(payload: { name: string; projectId: string }): Promise<ColumnDto> {
    const { data } = await apiClient.post('/api/tasks/columns', payload);
    return data.data;
  },

  async actualizarTarea(
    taskId: string,
    payload: Partial<Pick<TaskDto, 'title' | 'description' | 'priority'>> & {
      assigneeId?: string | null;
    }
  ): Promise<TaskDto> {
    const { data } = await apiClient.patch(`/api/tasks/tasks/${taskId}`, payload);
    return data.data;
  },
};
