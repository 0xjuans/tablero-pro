'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { projectsApi } from '@/lib/api/projects.api';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import { UserPlus, Users, UserCheck, Search, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  workspaceId: string;
  onClose: () => void;
}

type Vista = 'lista' | 'agregar-existente' | 'crear-nuevo';

const ROL_BADGE: Record<string, string> = {
  OWNER: 'bg-violet-100 text-violet-700 border-violet-200',
  ADMIN: 'bg-blue-100 text-blue-700 border-blue-200',
  MEMBER: 'bg-slate-100 text-slate-600 border-slate-200',
  VIEWER: 'bg-gray-100 text-gray-500 border-gray-200',
};

export function UsersPanel({ open, workspaceId, onClose }: Props) {
  const qc = useQueryClient();
  const [vista, setVista] = useState<Vista>('lista');
  const [busqueda, setBusqueda] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errorForm, setErrorForm] = useState('');

  const role = useWorkspaceRole(workspaceId);
  const esOwner = role === 'OWNER';

  const { data: miembros = [], isLoading: cargandoMiembros } = useQuery({
    queryKey: ['members', workspaceId],
    queryFn: () => projectsApi.listarMiembros(workspaceId),
    enabled: open && !!workspaceId,
  });

  const { data: todosUsuarios = [], isLoading: cargandoUsuarios } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => projectsApi.listarTodosUsuarios(),
    enabled: open && vista === 'agregar-existente',
  });

  // Usuarios que aún no son miembros del workspace
  const miembroIds = new Set(miembros.map((m) => m.id));
  const usuariosDisponibles = todosUsuarios.filter(
    (u) =>
      !miembroIds.has(u.id) &&
      (busqueda === '' ||
        u.name.toLowerCase().includes(busqueda.toLowerCase()) ||
        u.email.toLowerCase().includes(busqueda.toLowerCase()))
  );

  const agregar = useMutation({
    mutationFn: (email: string) =>
      projectsApi.agregarMiembro(workspaceId, { email, role: 'MEMBER' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members', workspaceId] });
      qc.invalidateQueries({ queryKey: ['all-users'] });
    },
  });

  const crear = useMutation({
    mutationFn: async () => {
      await projectsApi.crearUsuario(form);
      await projectsApi.agregarMiembro(workspaceId, { email: form.email, role: 'MEMBER' });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members', workspaceId] });
      qc.invalidateQueries({ queryKey: ['all-users'] });
      setForm({ name: '', email: '', password: '' });
      setErrorForm('');
      setVista('lista');
    },
    onError: (e: Error) => setErrorForm(e.message),
  });

  function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    setErrorForm('');
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setErrorForm('Todos los campos son obligatorios');
      return;
    }
    if (
      form.password.length < 8 ||
      !/[A-Z]/.test(form.password) ||
      !/[a-z]/.test(form.password) ||
      !/[0-9]/.test(form.password)
    ) {
      setErrorForm('La contraseña necesita 8+ caracteres, mayúscula, minúscula y número');
      return;
    }
    crear.mutate();
  }

  function volver() {
    setVista('lista');
    setBusqueda('');
    setErrorForm('');
    setForm({ name: '', email: '', password: '' });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
          volver();
        }
      }}
    >
      <SheetContent className="w-[400px] sm:w-[460px] flex flex-col p-0 gap-0">
        {/* Header */}
        <SheetHeader className="px-6 py-5 border-b shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Users className="w-4 h-4" />
            {vista === 'lista' && 'Miembros del workspace'}
            {vista === 'agregar-existente' && 'Agregar miembro existente'}
            {vista === 'crear-nuevo' && 'Crear nuevo usuario'}
          </SheetTitle>
        </SheetHeader>

        {/* ── Vista principal: lista de miembros ── */}
        {vista === 'lista' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Botones de acción — solo para el OWNER */}
            {esOwner && (
              <>
                <div className="px-6 pt-4 pb-3 flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setVista('agregar-existente')}
                  >
                    <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                    Agregar existente
                  </Button>
                  <Button size="sm" className="flex-1" onClick={() => setVista('crear-nuevo')}>
                    <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                    Crear nuevo
                  </Button>
                </div>

                <Separator />
              </>
            )}

            {/* Lista */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                {miembros.length} miembro{miembros.length !== 1 ? 's' : ''}
              </p>

              {cargandoMiembros
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-2">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3 w-28" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                    </div>
                  ))
                : miembros.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Avatar className="w-8 h-8 shrink-0">
                        <AvatarFallback className="text-xs bg-primary/15 text-primary font-semibold">
                          {m.name[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] shrink-0 ${ROL_BADGE[m.role] ?? ROL_BADGE.MEMBER}`}
                      >
                        {m.role}
                      </Badge>
                    </div>
                  ))}
            </div>
          </div>
        )}

        {/* ── Vista: agregar usuario existente ── */}
        {vista === 'agregar-existente' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Buscador */}
            <div className="px-6 pt-4 pb-3 shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  autoFocus
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre o email..."
                  className="h-8 pl-8 text-sm"
                />
              </div>
            </div>

            <Separator />

            {/* Lista de usuarios disponibles */}
            <div className="flex-1 overflow-y-auto px-6 py-3 space-y-1">
              {cargandoUsuarios ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-2">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  </div>
                ))
              ) : usuariosDisponibles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <p className="text-sm font-medium text-muted-foreground">
                    {busqueda ? 'Sin resultados' : 'Todos los usuarios ya son miembros'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {!busqueda && 'Puedes crear un nuevo usuario desde la otra opción'}
                  </p>
                </div>
              ) : (
                usuariosDisponibles.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarFallback className="text-xs bg-muted text-muted-foreground font-semibold">
                        {u.name[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className={cn(
                        'h-7 px-2.5 text-xs shrink-0 opacity-0 group-hover:opacity-100 transition-opacity',
                        agregar.isPending && 'opacity-50'
                      )}
                      disabled={agregar.isPending}
                      onClick={() => agregar.mutate(u.email)}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Agregar
                    </Button>
                  </div>
                ))
              )}
            </div>

            <div className="px-6 py-3 border-t shrink-0">
              <Button variant="ghost" size="sm" className="w-full" onClick={volver}>
                Volver
              </Button>
            </div>
          </div>
        )}

        {/* ── Vista: crear nuevo usuario ── */}
        {vista === 'crear-nuevo' && (
          <form onSubmit={handleCrear} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs">
                  Nombre completo
                </Label>
                <Input
                  id="name"
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Carlos García"
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs">
                  Correo electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="carlos@empresa.com"
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs">
                  Contraseña temporal
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Ej: Abc12345"
                  className="h-9"
                />
                <p className="text-[11px] text-muted-foreground">
                  8+ caracteres, mayúscula, minúscula y número
                </p>
              </div>

              {errorForm && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{errorForm}</p>
              )}
            </div>

            <div className="px-6 py-3 border-t flex gap-2 shrink-0">
              <Button type="button" variant="ghost" size="sm" onClick={volver} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="flex-1" disabled={crear.isPending}>
                {crear.isPending ? 'Creando...' : 'Crear y agregar'}
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
