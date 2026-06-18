import { prisma, Prisma } from '@tablero-pro/database';
import type { CrearColumnaInput } from '../schemas/tasks.schemas';

// Solo OWNER y ADMIN pueden crear/editar/eliminar columnas
async function exigirAdmin(projectId: string, userId: string) {
  const proyecto = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true },
  });
  if (!proyecto) throw new Error('Proyecto no encontrado');
  const miembro = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: proyecto.workspaceId, userId } },
    select: { role: true },
  });
  if (!miembro || !['OWNER', 'ADMIN'].includes(miembro.role)) {
    throw new Error('Solo los administradores pueden gestionar columnas');
  }
}

export const columnsService = {
  async listar(projectId: string) {
    const columnas = await prisma.column.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
      include: {
        tasks: {
          orderBy: { order: 'asc' },
          include: {
            assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
            tags: true,
            _count: { select: { comments: true, attachments: true } },
          },
        },
      },
    });
    return columnas.map((col) => ({
      ...col,
      tasks: col.tasks.map(({ _count, ...task }) => ({
        ...task,
        commentCount: _count.comments,
        attachmentCount: _count.attachments,
      })),
    }));
  },

  async crear(data: CrearColumnaInput, userId: string) {
    await exigirAdmin(data.projectId, userId);
    // La nueva columna va al final del tablero
    const ultimaColumna = await prisma.column.findFirst({
      where: { projectId: data.projectId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    return prisma.column.create({
      data: {
        ...data,
        order: (ultimaColumna?.order ?? -1) + 1,
      },
    });
  },

  // Reordena las columnas del tablero.
  // Recibe un array de IDs en el nuevo orden y actualiza cada columna en una transacción.
  async reordenar(projectId: string, columnIds: string[]) {
    return prisma.$transaction(
      columnIds.map((id, index) =>
        prisma.column.update({
          where: { id, projectId },
          data: { order: index },
        })
      ) as Parameters<typeof prisma.$transaction>[0] as Prisma.PrismaPromise<unknown>[]
    );
  },

  async actualizar(columnId: string, name: string, userId: string) {
    const col = await prisma.column.findUniqueOrThrow({
      where: { id: columnId },
      select: { projectId: true },
    });
    await exigirAdmin(col.projectId, userId);
    return prisma.column.update({ where: { id: columnId }, data: { name } });
  },

  async eliminar(columnId: string, userId: string) {
    const col = await prisma.column.findUniqueOrThrow({
      where: { id: columnId },
      select: { projectId: true },
    });
    await exigirAdmin(col.projectId, userId);
    return prisma.column.delete({ where: { id: columnId } });
  },
};
