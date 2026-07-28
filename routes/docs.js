const express = require('express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const router = express.Router();

const options = {
	definition: {
		openapi: '3.0.0',
		info: {
			title: 'MyZubsterGateway API',
			version: '1.0.0',
			description: 'OpenAPI documentation for the MyZubsterGateway REST API (auto-generated).',
		},
		servers: [
			{
				url: '/',
				description: 'Local server',
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
	},
	// Scan all route files so the documented endpoints stay in sync with the code.
	apis: ['./routes/*.js', './models/*.js'],
};

const specs = swaggerJsdoc(options);

router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(specs, {explorer: true}));
router.get('/json', (req, res) => res.json(specs));

module.exports = router;
