import { z } from 'zod';

// Esquema para el registro de un nuevo usuario
export const registerSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  email: z.string().email('El email no es válido'),
  // Mínimo 8 caracteres, al menos una mayúscula, una minúscula y un número
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[a-z]/, 'Debe contener al menos una minúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número'),
});

// Esquema para el inicio de sesión
export const loginSchema = z.object({
  email: z.string().email('El email no es válido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

// Esquema para renovar el access token usando el refresh token
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'El refresh token es requerido'),
});

// Tipos inferidos de los schemas para usar en TypeScript
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
