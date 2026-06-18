'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { notificationsApi, type NotificationDto } from '@/lib/api/notifications.api';
import {
  Bell,
  CheckCheck,
  ClipboardList,
  MessageSquare,
  FolderPlus,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function tiempoRelativo(fecha: string): string {
  const diff = Date.now() - new Date(fecha).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'ahora mismo';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  return `hace ${d}d`;
}

const TIPO_ICONO: Record<NotificationDto['type'], ReactNode> = {
  TASK_ASSIGNED: <ClipboardList className="w-3.5 h-3.5" />,
  TASK_UPDATED: <ClipboardList className="w-3.5 h-3.5" />,
  COMMENT_ADDED: <MessageSquare className="w-3.5 h-3.5" />,
  PROJECT_INVITE: <FolderPlus className="w-3.5 h-3.5" />,
  WORKSPACE_INVITE: <Building2 className="w-3.5 h-3.5" />,
};

export function NotificationBell() {
  const qc = useQueryClient();
  const [abierto, setAbierto] = useState(false);

  const { data: notificaciones = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.listar,
    refetchInterval: 30_000,
  });

  const noLeidas = notificaciones.filter((n) => !n.read).length;

  const marcarLeida = useMutation({
    mutationFn: notificationsApi.marcarLeida,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const marcarTodas = useMutation({
    mutationFn: notificationsApi.marcarTodasLeidas,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  function handleNotifClick(notif: NotificationDto) {
    if (!notif.read) marcarLeida.mutate(notif.id);
  }

  return (
    <>
      {/* Botón campana */}
      <button
        onClick={() => setAbierto((v) => !v)}
        title="Notificaciones"
        className={cn(
          'w-9 h-9 rounded-lg flex items-center justify-center transition-all relative',
          abierto
            ? 'bg-white/20 text-white'
            : 'text-[hsl(var(--sidebar-foreground))] hover:bg-white/10 hover:text-white'
        )}
      >
        <Bell className="w-4 h-4" />
        {noLeidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {/* Popover — fixed para que escape el sidebar */}
      {abierto && (
        <>
          {/* Overlay para cerrar al hacer click fuera */}
          <div className="fixed inset-0 z-40" onClick={() => setAbierto(false)} />

          <div className="fixed left-16 bottom-4 z-50 w-80 bg-popover border rounded-xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="text-sm font-semibold">Notificaciones</span>
              {noLeidas > 0 && (
                <button
                  onClick={() => marcarTodas.mutate()}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Marcar todas
                </button>
              )}
            </div>

            {/* Lista */}
            <div className="max-h-[400px] overflow-y-auto">
              {notificaciones.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Bell className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Sin notificaciones</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Te avisaremos cuando haya novedades
                  </p>
                </div>
              ) : (
                notificaciones.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    className={cn(
                      'flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors border-b last:border-0',
                      notif.read ? 'hover:bg-muted/50' : 'bg-primary/5 hover:bg-primary/10'
                    )}
                  >
                    {/* Ícono del tipo */}
                    <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5 text-muted-foreground">
                      {TIPO_ICONO[notif.type]}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm leading-snug', !notif.read && 'font-medium')}>
                        {notif.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{notif.body}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {tiempoRelativo(notif.createdAt)}
                      </p>
                    </div>

                    {/* Punto de no leída */}
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
