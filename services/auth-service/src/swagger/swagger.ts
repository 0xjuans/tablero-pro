import swaggerJsdoc from 'swagger-jsdoc';

// Swagger lee los comentarios @swagger de los archivos de rutas
// y genera automáticamente la documentación en formato OpenAPI 3.0
const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Tablero Pro — Auth Service',
      version: '1.0.0',
      description:
        'Servicio de autenticación: registro, login, refresh de tokens y logout. Usa JWT con access token de 15 min y refresh token de 7 días.',
    },
    servers: [
      {
        url: '/api/auth',
        description: 'A través del API Gateway (Nginx)',
      },
      {
        url: 'http://localhost:4001',
        description: 'Directo al servicio (solo desarrollo)',
      },
    ],
    components: {
      securitySchemes: {
        // Los endpoints protegidos esperan este header: Authorization: Bearer <token>
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  // Le decimos a swagger-jsdoc dónde buscar los comentarios @swagger
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
