import { z } from 'zod';

// ─── Workspace ────────────────────────────────────────────────────────────────

export const crearWorkspaceSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  // El slug es la versión URL del nombre: "Mi Empresa" → "mi-empresa"
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'El slug solo puede contener letras minúsculas, números y guiones'),
});

export const actualizarWorkspaceSchema = crearWorkspaceSchema.partial();

export const invitarMiembroSchema = z.object({
  email: z.string().email('El email no es válido'),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']).default('MEMBER'),
});

// Agrega a un usuario existente directamente como miembro (sin invitación)
export const agregarMiembroSchema = z.object({
  email: z.string().email('El email no es válido'),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']).default('MEMBER'),
});

// ─── Project ──────────────────────────────────────────────────────────────────

export const crearProyectoSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  description: z.string().max(500).optional(),
  workspaceId: z.string().cuid('ID de workspace inválido'),
});

export const actualizarProyectoSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED', 'COMPLETED']).optional(),
});

// Tipos inferidos para usar en TypeScript
export type CrearWorkspaceInput = z.infer<typeof crearWorkspaceSchema>;
export type ActualizarWorkspaceInput = z.infer<typeof actualizarWorkspaceSchema>;
export type InvitarMiembroInput = z.infer<typeof invitarMiembroSchema>;
export type AgregarMiembroInput = z.infer<typeof agregarMiembroSchema>;
export type CrearProyectoInput = z.infer<typeof crearProyectoSchema>;
export type ActualizarProyectoInput = z.infer<typeof actualizarProyectoSchema>;
