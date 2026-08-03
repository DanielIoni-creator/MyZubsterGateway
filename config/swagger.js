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
      schemas: {
        Bounty: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            issueNumber: { type: 'integer' },
            issueUrl: { type: 'string' },
            repository: { type: 'string' },
            amount: { type: 'number' },
            status: { type: 'string', enum: ['open', 'in-progress', 'completed'] },
            assignedToUsername: { type: 'string' },
            assignedToWallet: { type: 'string' },
            paymentTxHash: { type: 'string' },
            prNumber: { type: 'integer' },
            prUrl: { type: 'string' },
            createdBy: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Escrow: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            robotId: { type: 'string' },
            clientAddress: { type: 'string' },
            amount: { type: 'number' },
            status: { type: 'string', enum: ['pending', 'completed', 'disputed', 'released'] },
            jobDescription: { type: 'string' },
            gpsData: { type: 'array', items: { type: 'object' } },
            photos: { type: 'array', items: { type: 'string' } },
            createdAt: { type: 'string', format: 'date-time' },
            completedAt: { type: 'string', format: 'date-time' },
            releasedAt: { type: 'string', format: 'date-time' },
          },
        },
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            username: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['user', 'admin', 'moderator'] },
            moneroWallet: { type: 'string' },
            isVerified: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            lastLogin: { type: 'string', format: 'date-time' },
          },
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
      { name: 'Bounties', description: 'Bounty management' },
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
