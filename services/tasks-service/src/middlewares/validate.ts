import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validate =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = (result.error as ZodError).errors.map((e) => ({
        campo: e.path.join('.'),
        mensaje: e.message,
      }));

      res.status(400).json({ success: false, error: 'Datos inválidos', detalles: errors });
      return;
    }

    req.body = result.data;
    next();
  };
