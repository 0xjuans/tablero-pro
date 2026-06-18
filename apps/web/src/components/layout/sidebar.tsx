'use client';

import { useQuery } from '@tanstack/react-query';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { projectsApi } from '@/lib/api/projects.api';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { LayoutGrid, LogOut, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const { data: workspaces = [] } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => projectsApi.listarWorkspaces(),
  });

  const inicial = session?.user?.name?.[0]?.toUpperCase() ?? '?';
  const nombreCompleto = session?.user?.name ?? '';

  return (
    <aside className="w-[60px] flex flex-col items-center py-4 gap-1 bg-[hsl(var(--sidebar))] border-r border-white/5 shrink-0">
      {/* Logo */}
      <Link href="/workspaces" className="mb-3 flex items-center justify-center">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <LayoutGrid className="w-4 h-4 text-white" />
        </div>
      </Link>

      <div className="w-8 border-t border-white/10 mb-2" />

      {/* Workspaces */}
      <nav className="flex-1 flex flex-col items-center gap-1.5 w-full px-2">
        {workspaces.map((ws) => {
          const isActive = pathname.includes(ws.id);
          return (
            <Link
              key={ws.id}
              href={`/workspaces/${ws.id}`}
              title={ws.name}
              className={cn(
                'w-9 h-9 rounded-lg flex items-center justify-center text-xs font-semibold transition-all',
                isActive
                  ? 'bg-primary text-white shadow-sm shadow-primary/30'
                  : 'bg-white/10 text-[hsl(var(--sidebar-foreground))] hover:bg-white/20 hover:text-white'
              )}
            >
              {ws.name[0].toUpperCase()}
            </Link>
          );
        })}

        <Link
          href="/workspaces"
          title="Nuevo workspace"
          className="w-9 h-9 rounded-lg flex items-center justify-center text-[hsl(var(--sidebar-foreground))] hover:bg-white/10 hover:text-white transition-all border border-dashed border-white/20"
        >
          <Plus className="w-3.5 h-3.5" />
        </Link>
      </nav>

      {/* Footer: notificaciones + avatar + logout */}
      <div className="flex flex-col items-center gap-2 mt-auto pt-2 border-t border-white/10 w-full px-2">
        <NotificationBell />
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          title="Cerrar sesión"
          className="w-9 h-9 rounded-lg flex items-center justify-center text-[hsl(var(--sidebar-foreground))] hover:bg-white/10 hover:text-white transition-all"
        >
          <LogOut className="w-4 h-4" />
        </button>
        <Avatar className="w-9 h-9 border-2 border-white/20">
          <AvatarFallback className="bg-primary/20 text-primary-foreground text-xs font-semibold">
            {inicial}
          </AvatarFallback>
        </Avatar>
        <span className="sr-only">{nombreCompleto}</span>
      </div>
    </aside>
  );
}
