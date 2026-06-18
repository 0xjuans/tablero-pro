import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:4001'}/login`,
            {
              method: 'POST',
              body: JSON.stringify(credentials),
              headers: { 'Content-Type': 'application/json' },
            }
          );
          if (!res.ok) return null;
          const data = await res.json();
          if (!data.success) return null;
          // El auth-service devuelve "usuario", no "user"
          const u = data.data.usuario;
          return {
            id: u.id,
            name: u.name,
            email: u.email,
            image: u.avatarUrl ?? null,
            accessToken: data.data.tokens.accessToken,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.accessToken = (user as { accessToken: string }).accessToken;
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      (session as { accessToken?: string }).accessToken = token.accessToken as string;
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});
