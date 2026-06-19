import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:4001';

// Margen de 60 segundos: renovamos el token antes de que expire para evitar 401s en vuelo
const MARGEN_RENOVACION_MS = 60 * 1000;

async function renovarTokens(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    const res = await fetch(`${AUTH_URL}/refresh`, {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success) return null;
    return data.data as { accessToken: string; refreshToken: string };
  } catch {
    return null;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          const res = await fetch(`${AUTH_URL}/login`, {
            method: 'POST',
            body: JSON.stringify(credentials),
            headers: { 'Content-Type': 'application/json' },
          });
          if (!res.ok) return null;
          const data = await res.json();
          if (!data.success) return null;
          const u = data.data.usuario;
          return {
            id: u.id,
            name: u.name,
            email: u.email,
            image: u.avatarUrl ?? null,
            accessToken: data.data.tokens.accessToken,
            refreshToken: data.data.tokens.refreshToken,
            // El access token dura 15 minutos; guardamos cuándo expira
            accessTokenExpires: Date.now() + 15 * 60 * 1000,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Primera vez: el objeto "user" viene del authorize, guardamos todo
      if (user) {
        const u = user as {
          accessToken: string;
          refreshToken: string;
          accessTokenExpires: number;
        };
        token.accessToken = u.accessToken;
        token.refreshToken = u.refreshToken;
        token.accessTokenExpires = u.accessTokenExpires;
        token.id = user.id;
        return token;
      }

      // El token todavía es válido — lo devolvemos sin cambios
      const expires = token.accessTokenExpires as number;
      if (Date.now() < expires - MARGEN_RENOVACION_MS) {
        return token;
      }

      // El token está por expirar o ya expiró — renovamos
      const nuevosTokens = await renovarTokens(token.refreshToken as string);
      if (!nuevosTokens) {
        // No pudimos renovar (refresh token inválido/expirado) — la sesión muere
        return { ...token, error: 'RefreshTokenExpired' };
      }

      return {
        ...token,
        accessToken: nuevosTokens.accessToken,
        refreshToken: nuevosTokens.refreshToken,
        accessTokenExpires: Date.now() + 15 * 60 * 1000,
        error: undefined,
      };
    },
    session({ session, token }) {
      (session as { accessToken?: string }).accessToken = token.accessToken as string;
      (session as { error?: string }).error = token.error as string | undefined;
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});
