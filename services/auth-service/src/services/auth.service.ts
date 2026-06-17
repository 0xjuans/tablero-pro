import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@tablero-pro/database';
import type { RegisterInput, LoginInput } from '../schemas/auth.schemas';
import type { AuthTokens, JwtPayload } from '@tablero-pro/types';

// Cuántas rondas de hashing aplica bcrypt. A mayor número, más seguro pero más lento.
// 12 es un buen balance para producción.
const SALT_ROUNDS = 12;

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

// Genera los dos tokens JWT para un usuario autenticado
const generarTokens = (payload: JwtPayload): AuthTokens => {
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
  return { accessToken, refreshToken };
};

export const authService = {
  // Registra un nuevo usuario verificando que el email no esté en uso
  async registrar(data: RegisterInput) {
    const usuarioExistente = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (usuarioExistente) {
      throw new Error('Ya existe una cuenta con ese email');
    }

    // Nunca guardamos contraseñas en texto plano
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

    const usuario = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    const tokens = generarTokens({ sub: usuario.id, email: usuario.email, name: usuario.name });

    // Guardamos el refresh token en la DB para poder invalidarlo en el logout
    await prisma.refreshToken.create({
      data: {
        userId: usuario.id,
        token: tokens.refreshToken,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
      },
    });

    return { usuario, tokens };
  },

  // Verifica credenciales y genera tokens si son correctas
  async login(data: LoginInput) {
    const usuario = await prisma.user.findUnique({
      where: { email: data.email },
    });

    // Respondemos igual si no existe el usuario o si el password es incorrecto.
    // Esto evita que alguien descubra qué emails están registrados (enumeración de usuarios).
    if (!usuario || !usuario.passwordHash) {
      throw new Error('Credenciales inválidas');
    }

    const passwordValido = await bcrypt.compare(data.password, usuario.passwordHash);
    if (!passwordValido) {
      throw new Error('Credenciales inválidas');
    }

    const tokens = generarTokens({ sub: usuario.id, email: usuario.email, name: usuario.name });

    await prisma.refreshToken.create({
      data: {
        userId: usuario.id,
        token: tokens.refreshToken,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
      },
    });

    const { passwordHash: _, ...usuarioSinPassword } = usuario;
    return { usuario: usuarioSinPassword, tokens };
  },

  // Renueva el access token si el refresh token es válido y no está vencido
  async refrescarToken(refreshToken: string) {
    // Verificamos que el token sea criptográficamente válido
    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as JwtPayload;

    // Buscamos el token en la DB para verificar que no fue invalidado por un logout
    const tokenEnDb = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!tokenEnDb || tokenEnDb.expiresAt < new Date()) {
      throw new Error('Refresh token inválido o expirado');
    }

    // Rotación de refresh token: invalidamos el anterior y generamos uno nuevo.
    // Esto limita el daño si un refresh token es robado.
    await prisma.refreshToken.delete({ where: { token: refreshToken } });

    const tokens = generarTokens({ sub: payload.sub, email: payload.email, name: payload.name });

    await prisma.refreshToken.create({
      data: {
        userId: payload.sub,
        token: tokens.refreshToken,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
      },
    });

    return tokens;
  },

  // Invalida el refresh token para que no pueda usarse más
  async logout(refreshToken: string) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  },
};
