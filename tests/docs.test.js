const request = require('supertest');
const express = require('express');
const docsRouter = require('../routes/docs');

const app = express();
app.use('/api/docs', docsRouter);

describe('API docs (Swagger)', () => {
	it('serves the OpenAPI JSON spec', async () => {
		const res = await request(app).get('/api/docs/json');
		expect(res.status).toBe(200);
		expect(res.body.openapi).toBe('3.0.0');
		expect(res.body.info.title).toBe('MyZubsterGateway API');
		// Skills endpoints are documented via JSDoc annotations
		expect(res.body.paths['/api/skills']).toBeDefined();
	});

	it('serves the Swagger UI HTML page', async () => {
		const res = await request(app).get('/api/docs/');
		expect(res.status).toBe(200);
		expect(res.text).toMatch(/swagger/i);
	});
});
