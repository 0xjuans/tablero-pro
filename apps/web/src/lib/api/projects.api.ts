import apiClient from './client';

export interface WorkspaceDto {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  createdAt: string;
}

export interface MemberDto {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  role: string;
}

export interface ProjectDto {
  id: string;
  name: string;
  key: string;
  description?: string | null;
  workspaceId: string;
  createdAt: string;
}

export const projectsApi = {
  async listarWorkspaces(): Promise<WorkspaceDto[]> {
    const { data } = await apiClient.get('/api/projects/workspaces');
    return data.data;
  },

  async crearWorkspace(payload: { name: string; slug: string }): Promise<WorkspaceDto> {
    const { data } = await apiClient.post('/api/projects/workspaces', payload);
    return data.data;
  },

  async listarProyectos(workspaceId: string): Promise<ProjectDto[]> {
    const { data } = await apiClient.get(`/api/projects/projects?workspaceId=${workspaceId}`);
    return data.data;
  },

  async listarMiembros(workspaceId: string): Promise<MemberDto[]> {
    const { data } = await apiClient.get(`/api/projects/workspaces/${workspaceId}/members`);
    return data.data;
  },

  async listarTodosUsuarios(): Promise<MemberDto[]> {
    const { data } = await apiClient.get('/api/auth/users');
    return data.data;
  },

  async crearUsuario(payload: { name: string; email: string; password: string }): Promise<void> {
    await apiClient.post('/api/auth/register', payload);
  },

  async agregarMiembro(
    workspaceId: string,
    payload: { email: string; role?: string }
  ): Promise<MemberDto> {
    const { data } = await apiClient.post(
      `/api/projects/workspaces/${workspaceId}/members`,
      payload
    );
    return data.data;
  },

  async obtenerProyecto(projectId: string): Promise<ProjectDto> {
    const { data } = await apiClient.get(`/api/projects/projects/${projectId}`);
    return data.data;
  },

  async crearProyecto(payload: {
    name: string;
    key: string;
    workspaceId: string;
  }): Promise<ProjectDto> {
    const { data } = await apiClient.post('/api/projects/projects', payload);
    return data.data;
  },
};
