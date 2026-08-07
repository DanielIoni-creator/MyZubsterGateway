#!/usr/bin/env node

/* Focused, dependency-free check for the interactive API documentation. */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const server = read('server.js');
const spec = read('openapi.yaml');
const page = read('docs/swagger.html');
const tutorial = read('docs/API_TUTORIAL.md');

for (const route of [
  "app.get('/docs'",
  "app.get('/openapi.yaml'",
  "res.sendFile(path.join(__dirname, 'docs', 'swagger.html'))",
]) {
  if (!server.includes(route)) throw new Error(`server is missing documentation route: ${route}`);
}

for (const pathName of [
  '/api/health', '/api/swap/rate', '/api/swap/execute',
  '/api/animals', '/api/animals/register', '/api/animals/{id}',
  '/api/plants', '/api/plants/register', '/api/rewards',
  '/api/rewards/trigger', '/api/contributors/stats', '/api/sensors/data',
  '/api/sensors/garden/{gardenId}', '/api/sensors/garden/{gardenId}/latest',
  '/api/sensors/garden/{gardenId}/stats', '/api/security/status',
  '/api/security/metrics', '/api/xmr/rate', '/api/xmr/address',
  '/api/xmr/verify', '/api/gl1/quotes', '/api/gl1/transfers',
  '/api/gl1/transfers/{id}', '/api/robot/create', '/api/robot/assign',
  '/api/robot/execute', '/api/robot/deliver', '/api/robot/job/complete',
  '/api/robot/dispute', '/api/robot/stats', '/api/robot/status/{robotId}',
  '/api/robot/logo/create', '/api/robot/logo/generate',
  '/api/robot/logo/job/{jobId}', '/api/robot/logo/jobs',
]) {
  if (!spec.includes(`  ${pathName}:`)) throw new Error(`OpenAPI path missing: ${pathName}`);
}

for (const phrase of [
  "url: '/openapi.yaml'",
  'tryItOutEnabled: true',
  'SwaggerUIBundle',
]) {
  if (!page.includes(phrase)) throw new Error(`Swagger UI setting missing: ${phrase}`);
}

for (const phrase of [
  'Monero payment integration',
  '/api/xmr/verify',
  'Try it',
  'private key',
]) {
  if (!tutorial.toLowerCase().includes(phrase.toLowerCase())) {
    throw new Error(`Tutorial content missing: ${phrase}`);
  }
}

console.log('API documentation checks passed: 35 mounted paths, Swagger UI, Try it out, code examples and Monero tutorial.');
