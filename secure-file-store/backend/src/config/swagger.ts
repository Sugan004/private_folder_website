import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SecureVault API',
      version: '1.0.0',
      description:
        'A secure file storage service API. Supports user authentication, file upload (up to 200 MB via S3 multipart), public/private visibility, and shareable links.',
      contact: { name: 'SecureVault' },
    },
    servers: [{ url: '/api/v1', description: 'API v1' }],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Access token obtained from POST /auth/login',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            username: { type: 'string' },
          },
        },
        FileRecord: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            originalName: { type: 'string' },
            mimeType: { type: 'string' },
            sizeBytes: { type: 'string', description: 'File size in bytes (string to handle BigInt)' },
            visibility: { type: 'string', enum: ['PUBLIC', 'PRIVATE'] },
            shareToken: { type: 'string', format: 'uuid' },
            uploadedAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        Quota: {
          type: 'object',
          properties: {
            usedBytes: { type: 'string' },
            limitBytes: { type: 'string' },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication and session management' },
      { name: 'Files', description: 'File upload, management, and sharing' },
      { name: 'Health', description: 'Service health checks' },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
