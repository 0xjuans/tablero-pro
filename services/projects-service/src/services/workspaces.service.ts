import { prisma, Prisma } from '@tablero-pro/database';
import type {
  ActualizarWorkspaceInput,
  CrearWorkspaceInput,
  InvitarMiembroInput,
} from '../schemas/projects.schemas';

export const workspacesService = {
  // Crea un workspace y automáticamente agrega al creador como OWNER
  async crear(data: CrearWorkspaceInput, userId: string) {
    const slugExistente = await prisma.workspace.findUnique({
      where: { slug: data.slug },
    });

    if (slugExistente) {
      throw new Error('Ya existe un workspace con ese slug');
    }

    // Usamos una transacción para garantizar que si falla alguna operación,
    // ambas se revierten. No queremos un workspace sin dueño.
    const workspace = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const nuevoWorkspace = await tx.workspace.create({ data });

      await tx.workspaceMember.create({
        data: {
          workspaceId: nuevoWorkspace.id,
          userId,
          role: 'OWNER',
        },
      });

      return nuevoWorkspace;
    });

    return workspace;
  },

  // Lista los workspaces a los que pertenece el usuario
  async listarPorUsuario(userId: string) {
    return prisma.workspace.findMany({
      where: {
        members: { some: { userId } },
      },
      include: {
        members: {
          where: { userId },
          select: { role: true },
        },
        _count: { select: { members: true, projects: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async obtenerPorId(workspaceId: string, userId: string) {
    // Verificamos que el usuario sea miembro antes de mostrar el workspace
    const miembro = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    if (!miembro) {
      throw new Error('No tienes acceso a este workspace');
    }

    return prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
        _count: { select: { projects: true } },
      },
    });
  },

  async actualizar(workspaceId: string, data: ActualizarWorkspaceInput, userId: string) {
    // Solo OWNER y ADMIN pueden modificar el workspace
    await verificarRol(workspaceId, userId, ['OWNER', 'ADMIN']);
    return prisma.workspace.update({ where: { id: workspaceId }, data });
  },

  async eliminar(workspaceId: string, userId: string) {
    // Solo el OWNER puede eliminar el workspace
    await verificarRol(workspaceId, userId, ['OWNER']);
    await prisma.workspace.delete({ where: { id: workspaceId } });
  },

  async invitarMiembro(workspaceId: string, data: InvitarMiembroInput, userId: string) {
    await verificarRol(workspaceId, userId, ['OWNER', 'ADMIN']);

    // La invitación expira en 7 días
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    return prisma.workspaceInvite.create({
      data: {
        workspaceId,
        email: data.email,
        role: data.role,
        expiresAt,
      },
    });
  },
};

// Función auxiliar reutilizable para verificar que un usuario tenga uno de los roles requeridos
async function verificarRol(workspaceId: string, userId: string, rolesPermitidos: string[]) {
  const miembro = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });

  if (!miembro || !rolesPermitidos.includes(miembro.role)) {
    throw new Error('No tienes permisos para realizar esta acción');
  }

  return miembro;
}
