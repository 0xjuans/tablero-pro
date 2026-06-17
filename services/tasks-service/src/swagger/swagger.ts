import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Tablero Pro — Tasks Service',
      version: '1.0.0',
      description:
        'Servicio de tareas: Kanban drag & drop, comentarios, adjuntos en S3 y tiempo real con SSE.',
    },
    servers: [
      { url: '/api/tasks', description: 'A través del API Gateway (Nginx)' },
      { url: 'http://localhost:4003', description: 'Directo al servicio (solo desarrollo)' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
