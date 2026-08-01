/**
 * Swagger/OpenAPI configuration for MyZubsterGateway
 */
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MyZubsterGateway API',
      version: '1.0.0',
      description: 'API Gateway for MyZubster Ecosystem — marketplace, garden sensors, webhooks, tokens, and more',
      contact: {
        name: 'MyZubster Team',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      { name: 'Auth', description: 'Authentication management' },
      { name: 'Users', description: 'User management' },
      { name: 'Tokens', description: 'Token management' },
      { name: 'Orders', description: 'Order management' },
      { name: 'Admin', description: 'Admin-only endpoints' },
      { name: 'Activity', description: 'Activity audit logs' },
      { name: 'Garden', description: 'Garden sensor readings' },
      { name: 'Webhook', description: 'Webhook verification endpoints' },
      { name: 'Webhooks', description: 'Webhook subscription management' },
      { name: 'Marketplace', description: 'Token marketplace' },
      { name: 'Offers', description: 'Offer management' },
      { name: 'AI', description: 'AI/DeepSeek integration' },
      { name: 'Bookings', description: 'Booking management' },
      { name: 'Escrow', description: 'Escrow management' },
      { name: 'Governance', description: 'Governance & voting' },
      { name: 'Health', description: 'Health check endpoints' },
      { name: 'Onion', description: 'Tor onion service' },
      { name: 'OSINT', description: 'OSINT search tools' },
      { name: 'Payments', description: 'Payment processing' },
      { name: 'Reputation', description: 'Reputation & ratings' },
      { name: 'Requests', description: 'Request management' },
      { name: 'Reviews', description: 'Review management' },
      { name: 'Scanner', description: 'Security scanner' },
      { name: 'Skills', description: 'Skills management' },
      { name: 'Tari', description: 'Tari blockchain' },
      { name: 'Transactions', description: 'Transaction history' },
    ],
  },
  apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
