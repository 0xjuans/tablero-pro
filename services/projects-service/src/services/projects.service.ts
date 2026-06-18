import { prisma, Prisma } from '@tablero-pro/database';
import type { ActualizarProyectoInput, CrearProyectoInput } from '../schemas/projects.schemas';

export const projectsService = {
  async crear(data: CrearProyectoInput, userId: string) {
    // Verificamos que el usuario pertenezca al workspace antes de crear el proyecto
    const miembro = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: data.workspaceId, userId } },
    });

    if (!miembro || miembro.role === 'VIEWER') {
      throw new Error('No tienes permisos para crear proyectos en este workspace');
    }

    // Transacción: creamos el proyecto y agregamos al creador como miembro OWNER
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const proyecto = await tx.project.create({
        data: {
          name: data.name,
          description: data.description,
          workspaceId: data.workspaceId,
        },
      });

      // Creamos las columnas por defecto del tablero Kanban
      await tx.column.createMany({
        data: [
          { projectId: proyecto.id, name: 'Por hacer', order: 0, color: '#6B7280' },
          { projectId: proyecto.id, name: 'En progreso', order: 1, color: '#3B82F6' },
          { projectId: proyecto.id, name: 'En revisión', order: 2, color: '#F59E0B' },
          { projectId: proyecto.id, name: 'Completado', order: 3, color: '#10B981' },
        ],
      });

      await tx.projectMember.create({
        data: { projectId: proyecto.id, userId, role: 'OWNER' },
      });

      return proyecto;
    });
  },

  async listarPorWorkspace(workspaceId: string, userId: string) {
    // Verificamos que el usuario sea miembro del workspace
    const miembroWs = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    if (!miembroWs) {
      throw new Error('No tienes acceso a este workspace');
    }

    // Todos los miembros del workspace pueden ver todos sus proyectos
    return prisma.project.findMany({
      where: { workspaceId },
      include: {
        _count: { select: { tasks: true, members: true } },
        members: {
          where: { userId },
          select: { role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async obtenerPorId(projectId: string, userId: string) {
    // Si no es ProjectMember todavía, verificamos si es miembro del workspace y lo agregamos
    const miembro = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });

    if (!miembro) {
      const proyecto = await prisma.project.findUnique({ where: { id: projectId } });
      if (!proyecto) throw new Error('Proyecto no encontrado');

      const miembroWs = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: proyecto.workspaceId, userId } },
      });

      if (!miembroWs) throw new Error('No tienes acceso a este proyecto');

      // Auto-inscribir al miembro del workspace como ProjectMember
      await prisma.projectMember.create({
        data: { projectId, userId, role: 'MEMBER' },
      });
    }

    return prisma.project.findUniqueOrThrow({
      where: { id: projectId },
      include: {
        columns: {
          orderBy: { order: 'asc' },
          include: {
            tasks: {
              orderBy: { order: 'asc' },
              include: {
                assignee: { select: { id: true, name: true, avatarUrl: true } },
                tags: true,
                _count: { select: { comments: true, attachments: true } },
              },
            },
          },
        },
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
      },
    });
  },

  async actualizar(projectId: string, data: ActualizarProyectoInput, userId: string) {
    await verificarRolProyecto(projectId, userId, ['OWNER', 'ADMIN']);
    return prisma.project.update({ where: { id: projectId }, data });
  },

  async eliminar(projectId: string, userId: string) {
    await verificarRolProyecto(projectId, userId, ['OWNER']);
    await prisma.project.delete({ where: { id: projectId } });
  },
};

async function verificarRolProyecto(projectId: string, userId: string, rolesPermitidos: string[]) {
  const miembro = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });

  if (!miembro || !rolesPermitidos.includes(miembro.role)) {
    throw new Error('No tienes permisos para realizar esta acción');
  }

  return miembro;
}
