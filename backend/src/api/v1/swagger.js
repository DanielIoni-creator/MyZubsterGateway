const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MyZubster API v1',
      version: '1.0.0',
      description: 'MyZubster Platform API - Skill Exchange & Booking System',
      contact: {
        name: 'Daniel Ioni',
        email: 'admin@myzubster.com',
        url: 'https://myzubster.com'
      },
      license: {
        name: 'MIT / GPLv3',
        url: 'https://github.com/h4x0rmyzubster/MyZubsterDanielIoni/blob/main/LICENSE'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000/api/v1',
        description: 'Development Server'
      },
      {
        url: 'https://api.myzubster.com/api/v1',
        description: 'Production Server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Booking: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '65f1a2b3c4d5e6f7g8h9i0j1' },
            clientId: { type: 'string', example: '65f1a2b3c4d5e6f7g8h9i0j2' },
            professionalId: { type: 'string', example: '65f1a2b3c4d5e6f7g8h9i0j3' },
            skillId: { type: 'string', example: '65f1a2b3c4d5e6f7g8h9i0j4' },
            date: { type: 'string', format: 'date-time', example: '2024-07-15T10:00:00Z' },
            timeSlot: { type: 'string', example: '10:00-12:00' },
            amount: { type: 'number', example: 150 },
            status: {
              type: 'string',
              enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'],
              example: 'pending'
            },
            completedAt: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        BookingHistory: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            skillTitle: { type: 'string' },
            skillCategory: { type: 'string' },
            clientName: { type: 'string' },
            professionalName: { type: 'string' },
            date: { type: 'string', format: 'date-time' },
            timeSlot: { type: 'string' },
            amount: { type: 'number' },
            status: { type: 'string' },
            completedAt: { type: 'string', format: 'date-time', nullable: true }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Error message description' }
          }
        }
      }
    },
    tags: [
      { name: 'Bookings', description: 'Endpoint per la gestione delle prenotazioni' },
      { name: 'Health', description: 'Endpoint per il health check' }
    ]
  },
  apis: ['./src/api/v1/*.js']
};

const specs = swaggerJsdoc(options);

module.exports = {
  swaggerUi,
  specs
};