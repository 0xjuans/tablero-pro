import { auth } from '@/lib/auth';
import { type NextRequest } from 'next/server';

// Necesario para que Next.js no cachee esta ruta y la trate como stream
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const token = (session as { accessToken?: string }).accessToken;
  const { projectId } = await params;

  // Conectamos al tasks-service directamente (no hay buffering aquí)
  const upstreamRes = await fetch(`http://localhost:4003/sse/${projectId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
    // Cuando el cliente cierra la pestaña, req.signal se aborta y corta la conexión upstream
    signal: req.signal,
  });

  if (!upstreamRes.ok || !upstreamRes.body) {
    return new Response('Error conectando al servicio de tareas', { status: 502 });
  }

  // Pasamos el ReadableStream del tasks-service directamente al cliente — sin buffering
  return new Response(upstreamRes.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
