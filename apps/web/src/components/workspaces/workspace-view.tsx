'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import Link from 'next/link';
import { projectsApi } from '@/lib/api/projects.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, ChevronRight, FolderKanban, ArrowLeft, Users } from 'lucide-react';
import { UsersPanel } from '@/components/users/users-panel';
import { useWorkspaceRole, puedeAdministrar } from '@/hooks/useWorkspaceRole';

export function WorkspaceView({ workspaceId }: { workspaceId: string }) {
  const qc = useQueryClient();
  const [nombre, setNombre] = useState('');
  const [mostrando, setMostrando] = useState(false);
  const [panelUsuarios, setPanelUsuarios] = useState(false);
  const role = useWorkspaceRole(workspaceId);
  const esAdmin = puedeAdministrar(role);

  const { data: workspace } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => projectsApi.listarWorkspaces(),
    select: (ws) => ws.find((w) => w.id === workspaceId),
  });

  const { data: proyectos = [], isLoading } = useQuery({
    queryKey: ['projects', workspaceId],
    queryFn: () => projectsApi.listarProyectos(workspaceId),
  });

  const crear = useMutation({
    mutationFn: (name: string) =>
      projectsApi.crearProyecto({ name, key: name.slice(0, 3).toUpperCase(), workspaceId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects', workspaceId] });
      setNombre('');
      setMostrando(false);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (nombre.trim()) crear.mutate(nombre.trim());
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-8 py-5 bg-background">
        <Link
          href="/workspaces"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="w-3 h-3" />
          Workspaces
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{workspace?.name ?? '...'}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {proyectos.length} proyecto{proyectos.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Miembros: visible para todos, pero solo admin puede modificar */}
            <Button variant="outline" size="sm" onClick={() => setPanelUsuarios(true)}>
              <Users className="w-4 h-4 mr-1.5" />
              Miembros
            </Button>
            {/* Solo OWNER/ADMIN pueden crear proyectos */}
            {esAdmin && (
              <Button onClick={() => setMostrando(true)} size="sm">
                <Plus className="w-4 h-4 mr-1.5" />
                Nuevo proyecto
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {mostrando && (
          <Card className="mb-4 border-primary/30 shadow-sm">
            <CardContent className="pt-4 pb-4">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  autoFocus
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Nombre del proyecto..."
                  className="flex-1"
                />
                <Button type="submit" disabled={crear.isPending} size="sm">
                  Crear
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setMostrando(false);
                    setNombre('');
                  }}
                >
                  Cancelar
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 max-w-2xl">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : proyectos.length === 0 && !mostrando ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <FolderKanban className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">Sin proyectos todavía</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Crea tu primer proyecto para empezar a organizar tareas
            </p>
            <Button onClick={() => setMostrando(true)} size="sm">
              <Plus className="w-4 h-4 mr-1.5" />
              Crear proyecto
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 max-w-2xl">
            {proyectos.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}`}>
                <Card className="group hover:border-primary/40 hover:shadow-md transition-all cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold"
                      style={{ backgroundColor: 'hsl(262 83% 95%)', color: 'hsl(262 83% 45%)' }}
                    >
                      {p.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{p.name}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
      {/* Panel lateral de miembros */}
      <UsersPanel
        open={panelUsuarios}
        workspaceId={workspaceId}
        onClose={() => setPanelUsuarios(false)}
      />
    </div>
  );
}
