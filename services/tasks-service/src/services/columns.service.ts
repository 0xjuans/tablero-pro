import { prisma, Prisma } from '@tablero-pro/database';
import type { CrearColumnaInput } from '../schemas/tasks.schemas';

export const columnsService = {
  async crear(data: CrearColumnaInput) {
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

  async actualizar(columnId: string, name: string) {
    return prisma.column.update({
      where: { id: columnId },
      data: { name },
    });
  },

  async eliminar(columnId: string) {
    // Al eliminar la columna, Prisma elimina en cascada todas sus tareas (configurado en el schema)
    return prisma.column.delete({ where: { id: columnId } });
  },
};
