'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { projectsApi } from '@/lib/api/projects.api';

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' | null;

export function useWorkspaceRole(workspaceId: string): WorkspaceRole {
  const { data: session } = useSession();
  const userId = (session as { user?: { id?: string } } | null)?.user?.id;

  const { data: miembros = [] } = useQuery({
    queryKey: ['members', workspaceId],
    queryFn: () => projectsApi.listarMiembros(workspaceId),
    enabled: !!workspaceId && !!userId,
  });

  if (!userId) return null;
  const yo = miembros.find((m) => m.id === userId);
  return (yo?.role as WorkspaceRole) ?? null;
}

// Helpers de conveniencia para verificar permisos
export function puedeEscribir(role: WorkspaceRole) {
  return role === 'OWNER' || role === 'ADMIN' || role === 'MEMBER';
}

export function puedeAdministrar(role: WorkspaceRole) {
  return role === 'OWNER' || role === 'ADMIN';
}
