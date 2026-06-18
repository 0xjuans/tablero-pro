import axios from 'axios';
import { getSession } from 'next-auth/react';

const apiClient = axios.create({
  baseURL: typeof window !== 'undefined' ? '' : 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' },
});

// Adjunta el token JWT de la sesión en cada request
apiClient.interceptors.request.use(async (config) => {
  const session = await getSession();
  const token = (session as { accessToken?: string } | null)?.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Extrae el mensaje de error del cuerpo de la API en lugar del mensaje HTTP genérico
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const mensaje = error?.response?.data?.error ?? error?.message ?? 'Error desconocido';
    return Promise.reject(new Error(mensaje));
  }
);

export default apiClient;
