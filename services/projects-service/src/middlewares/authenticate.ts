import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from '@tablero-pro/types';

// Extendemos el tipo Request de Express para incluir el usuario autenticado.
// Así TypeScript sabe que req.user existe después de pasar por este middleware.
declare module 'express-serve-static-core' {
  interface Request {
    user?: JwtPayload;
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  // El token viene en el header: Authorization: Bearer <token>
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Token de autenticación requerido' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    // Adjuntamos el payload al request para que los controllers puedan usarlo
    req.user = payload;
    next();
  } catch (_error) {
    res.status(401).json({ success: false, error: 'Token inválido o expirado' });
  }
};
