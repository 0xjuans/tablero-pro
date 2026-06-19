import axios from 'axios';
import { getSession, signOut } from 'next-auth/react';

const apiClient = axios.create({
  baseURL: typeof window !== 'undefined' ? '' : 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' },
});

// Adjunta el token JWT de la sesión en cada request.
// getSession() activa el callback jwt de NextAuth, que renueva el access token
// automáticamente si está por expirar (usando el refresh token guardado).
apiClient.interceptors.request.use(async (config) => {
  const session = await getSession();
  const s = session as { accessToken?: string; error?: string } | null;

  // Si el refresh token también expiró, cerramos sesión y enviamos al login
  if (s?.error === 'RefreshTokenExpired') {
    await signOut({ redirectTo: '/login' });
    return Promise.reject(new Error('Sesión expirada'));
  }

  if (s?.accessToken) {
    config.headers.Authorization = `Bearer ${s.accessToken}`;
  }
  return config;
});

// Extrae el mensaje de error del cuerpo de la API en lugar del mensaje HTTP genérico
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Si el servidor responde 401, la sesión está rota — cerramos y redirigimos
    if (error?.response?.status === 401 && typeof window !== 'undefined') {
      await signOut({ redirectTo: '/login' });
    }
    const mensaje = error?.response?.data?.error ?? error?.message ?? 'Error desconocido';
    return Promise.reject(new Error(mensaje));
  }
);

export default apiClient;
