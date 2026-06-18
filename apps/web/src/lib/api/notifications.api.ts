import apiClient from './client';

export interface NotificationDto {
  id: string;
  type: 'TASK_ASSIGNED' | 'TASK_UPDATED' | 'COMMENT_ADDED' | 'PROJECT_INVITE' | 'WORKSPACE_INVITE';
  title: string;
  body: string;
  read: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export const notificationsApi = {
  async listar(): Promise<NotificationDto[]> {
    const { data } = await apiClient.get('/api/notifications/notifications');
    return data.data;
  },

  async marcarLeida(id: string): Promise<void> {
    await apiClient.patch(`/api/notifications/notifications/${id}/read`);
  },

  async marcarTodasLeidas(): Promise<void> {
    await apiClient.patch('/api/notifications/notifications/read-all');
  },
};
