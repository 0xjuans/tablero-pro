import app from './app';
import { prisma } from '@tablero-pro/database';

const PORT = process.env.PORT || 4003;

async function iniciar() {
  try {
    await prisma.$connect();
    console.warn('✓ Conectado a la base de datos');

    app.listen(PORT, () => {
      console.warn(`✓ Tasks service corriendo en el puerto ${PORT}`);
      console.warn(`✓ Documentación Swagger: http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    console.error('✗ Error al iniciar el servicio:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  console.warn('Cerrando conexión con la base de datos...');
  await prisma.$disconnect();
  process.exit(0);
});

iniciar();
