'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import Link from 'next/link';
import { projectsApi } from '@/lib/api/projects.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, ChevronRight, Building2 } from 'lucide-react';

export function WorkspacesView() {
  const qc = useQueryClient();
  const [nombre, setNombre] = useState('');
  const [mostrando, setMostrando] = useState(false);

  const { data: workspaces = [], isLoading } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => projectsApi.listarWorkspaces(),
  });

  const crear = useMutation({
    mutationFn: (name: string) =>
      projectsApi.crearWorkspace({ name, slug: name.toLowerCase().replace(/\s+/g, '-') }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspaces'] });
      setNombre('');
      setMostrando(false);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (nombre.trim()) crear.mutate(nombre.trim());
  }

  const COLORES = [
    'hsl(221 83% 53%)',
    'hsl(262 83% 58%)',
    'hsl(160 84% 39%)',
    'hsl(25 95% 53%)',
    'hsl(330 81% 60%)',
    'hsl(189 94% 43%)',
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-8 py-5 flex items-center justify-between bg-background">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Workspaces</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setMostrando(true)} size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          Nuevo workspace
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {/* Formulario inline */}
        {mostrando && (
          <Card className="mb-4 border-primary/30 shadow-sm">
            <CardContent className="pt-4 pb-4">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  autoFocus
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Nombre del workspace..."
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
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : workspaces.length === 0 && !mostrando ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Building2 className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">Sin workspaces todavía</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Crea tu primer workspace para organizar tus proyectos
            </p>
            <Button onClick={() => setMostrando(true)} size="sm">
              <Plus className="w-4 h-4 mr-1.5" />
              Crear workspace
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 max-w-2xl">
            {workspaces.map((ws, i) => (
              <Link key={ws.id} href={`/workspaces/${ws.id}`}>
                <Card className="group hover:border-primary/40 hover:shadow-md transition-all cursor-pointer">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0"
                      style={{ backgroundColor: COLORES[i % COLORES.length] }}
                    >
                      {ws.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{ws.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{ws.slug}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
