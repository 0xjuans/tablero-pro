import { z } from 'zod';

// ─── Columnas ─────────────────────────────────────────────────────────────────

export const crearColumnaSchema = z.object({
  projectId: z.string().cuid('ID de proyecto inválido'),
  name: z.string().min(1).max(50),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color inválido')
    .optional(),
});

export const reordenarColumnasSchema = z.object({
  // Array de IDs en el nuevo orden deseado
  columnIds: z.array(z.string().cuid()).min(1),
});

// ─── Tareas ───────────────────────────────────────────────────────────────────

export const crearTareaSchema = z.object({
  projectId: z.string().cuid('ID de proyecto inválido'),
  columnId: z.string().cuid('ID de columna inválido'),
  title: z.string().min(1, 'El título es requerido').max(200),
  description: z.string().max(2000).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  dueDate: z.string().datetime().optional(),
  assigneeId: z.string().cuid().optional(),
});

export const actualizarTareaSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  assigneeId: z.string().cuid().optional().nullable(),
});

// Mover una tarea a otra columna o cambiar su posición dentro de la misma
export const moverTareaSchema = z.object({
  columnId: z.string().cuid('ID de columna inválido'),
  // El orden se recalcula en base a la posición entre sus vecinos
  order: z.number().int().min(0),
});

// ─── Comentarios ──────────────────────────────────────────────────────────────

export const crearComentarioSchema = z.object({
  body: z.string().min(1, 'El comentario no puede estar vacío').max(1000),
});

// ─── Adjuntos (S3) ────────────────────────────────────────────────────────────

export const solicitarUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024), // máximo 10MB
  mimeType: z.string().min(1),
});

// Tipos inferidos
export type CrearColumnaInput = z.infer<typeof crearColumnaSchema>;
export type CrearTareaInput = z.infer<typeof crearTareaSchema>;
export type ActualizarTareaInput = z.infer<typeof actualizarTareaSchema>;
export type MoverTareaInput = z.infer<typeof moverTareaSchema>;
export type CrearComentarioInput = z.infer<typeof crearComentarioSchema>;
export type SolicitarUploadInput = z.infer<typeof solicitarUploadSchema>;
