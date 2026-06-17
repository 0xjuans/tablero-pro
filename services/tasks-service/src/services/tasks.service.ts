import { prisma } from '@tablero-pro/database';
import { sseService } from './sse.service';
import { s3Service } from './s3.service';
import type {
  ActualizarTareaInput,
  CrearComentarioInput,
  CrearTareaInput,
  MoverTareaInput,
  SolicitarUploadInput,
} from '../schemas/tasks.schemas';

export const tasksService = {
  async crear(data: CrearTareaInput, userId: string) {
    // Calculamos el order de la nueva tarea: va al final de la columna
    const ultimaTarea = await prisma.task.findFirst({
      where: { columnId: data.columnId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const tarea = await prisma.task.create({
      data: {
        ...data,
        createdById: userId,
        order: (ultimaTarea?.order ?? -1) + 1,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
        tags: true,
      },
    });

    // Notificamos a todos los usuarios del proyecto que se creó una tarea
    sseService.emitir(data.projectId, {
      type: 'task.created',
      payload: tarea,
      projectId: data.projectId,
    });

    return tarea;
  },

  async obtenerPorId(taskId: string) {
    return prisma.task.findUniqueOrThrow({
      where: { id: taskId },
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
        tags: true,
        attachments: true,
        comments: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  },

  async actualizar(taskId: string, data: ActualizarTareaInput, userId: string) {
    const tarea = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...data,
        dueDate: data.dueDate === null ? null : data.dueDate ? new Date(data.dueDate) : undefined,
        assigneeId: data.assigneeId === null ? null : data.assigneeId,
      },
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        tags: true,
      },
    });

    sseService.emitir(tarea.projectId, {
      type: 'task.updated',
      payload: { ...tarea, updatedBy: userId },
      projectId: tarea.projectId,
    });

    return tarea;
  },

  // Mueve una tarea a otra columna o la reordena dentro de la misma.
  // Este es el corazón del drag & drop del Kanban.
  async mover(taskId: string, data: MoverTareaInput, userId: string) {
    return prisma.$transaction(async (tx) => {
      const tareaActual = await tx.task.findUniqueOrThrow({ where: { id: taskId } });

      // Si la tarea se mueve a otra columna o cambia de posición,
      // necesitamos reajustar el order de las demás tareas afectadas
      if (tareaActual.columnId !== data.columnId) {
        // Cerramos el hueco en la columna origen
        await tx.task.updateMany({
          where: { columnId: tareaActual.columnId, order: { gt: tareaActual.order } },
          data: { order: { decrement: 1 } },
        });

        // Abrimos espacio en la columna destino
        await tx.task.updateMany({
          where: { columnId: data.columnId, order: { gte: data.order } },
          data: { order: { increment: 1 } },
        });
      } else {
        // Reordenamiento dentro de la misma columna
        if (data.order < tareaActual.order) {
          await tx.task.updateMany({
            where: { columnId: data.columnId, order: { gte: data.order, lt: tareaActual.order } },
            data: { order: { increment: 1 } },
          });
        } else {
          await tx.task.updateMany({
            where: { columnId: data.columnId, order: { gt: tareaActual.order, lte: data.order } },
            data: { order: { decrement: 1 } },
          });
        }
      }

      const tareaActualizada = await tx.task.update({
        where: { id: taskId },
        data: { columnId: data.columnId, order: data.order },
      });

      sseService.emitir(tareaActual.projectId, {
        type: 'task.moved',
        payload: { taskId, columnId: data.columnId, order: data.order, movedBy: userId },
        projectId: tareaActual.projectId,
      });

      return tareaActualizada;
    });
  },

  async eliminar(taskId: string) {
    const tarea = await prisma.task.findUniqueOrThrow({
      where: { id: taskId },
      include: { attachments: true },
    });

    // Eliminamos los archivos de S3 antes de borrar la tarea de la DB
    await Promise.all(tarea.attachments.map((a) => s3Service.eliminarArchivo(a.s3Key)));

    await prisma.task.delete({ where: { id: taskId } });

    sseService.emitir(tarea.projectId, {
      type: 'task.deleted',
      payload: { taskId },
      projectId: tarea.projectId,
    });
  },

  // ─── Comentarios ────────────────────────────────────────────────────────────

  async agregarComentario(taskId: string, data: CrearComentarioInput, userId: string) {
    const comentario = await prisma.comment.create({
      data: { taskId, userId, body: data.body },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });

    const tarea = await prisma.task.findUniqueOrThrow({
      where: { id: taskId },
      select: { projectId: true },
    });

    sseService.emitir(tarea.projectId, {
      type: 'comment.added',
      payload: comentario,
      projectId: tarea.projectId,
    });

    return comentario;
  },

  // ─── Adjuntos (S3) ──────────────────────────────────────────────────────────

  // Genera la presigned URL y registra el adjunto en la DB
  async solicitarUpload(taskId: string, data: SolicitarUploadInput) {
    const { uploadUrl, s3Key, s3Url } = await s3Service.generarUrlDeSubida(
      data.fileName,
      data.mimeType,
      taskId
    );

    const adjunto = await prisma.attachment.create({
      data: {
        taskId,
        fileName: data.fileName,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        s3Key,
        s3Url,
      },
    });

    // Retornamos la uploadUrl para que el cliente suba directo a S3
    // y el adjunto ya registrado en la DB
    return { uploadUrl, adjunto };
  },

  async eliminarAdjunto(attachmentId: string) {
    const adjunto = await prisma.attachment.findUniqueOrThrow({ where: { id: attachmentId } });
    await s3Service.eliminarArchivo(adjunto.s3Key);
    await prisma.attachment.delete({ where: { id: attachmentId } });
  },
};
