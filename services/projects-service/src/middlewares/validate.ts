import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

// El mismo middleware genérico de validación que usamos en auth-service
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

    req.body = result.data;
    next();
  };
