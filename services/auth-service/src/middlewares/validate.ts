import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

// Middleware genérico que valida el body del request contra cualquier schema de Zod.
// Si la validación falla, responde con 400 y los errores detallados.
// Si pasa, el body queda tipado y se llama a next() para continuar.
export const validate =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.issues.map((e) => ({
        campo: e.path.join('.'),
        mensaje: e.message,
      }));

      res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        detalles: errors,
      });
      return;
    }

    // Reemplazamos el body con los datos ya validados y sanitizados por Zod
    req.body = result.data;
    next();
  };
