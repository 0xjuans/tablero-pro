import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Tablero Pro — Projects Service',
      version: '1.0.0',
      description:
        'Servicio de gestión de workspaces y proyectos. Todos los endpoints requieren JWT.',
    },
    servers: [
      { url: '/api/projects', description: 'A través del API Gateway (Nginx)' },
      { url: 'http://localhost:4002', description: 'Directo al servicio (solo desarrollo)' },
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
