// {{ROUTE_FILE}} – API del robot {{DISPLAY_NAME}}
// Generato da `npm run robot:create -- {{SLUG}} --template {{TEMPLATE}}` il {{GENERATED_AT}}.
//
// Monta in server.js con:
//   app.use('{{MOUNT_PATH}}', require('{{ROUTE_REQUIRE}}'));

const express = require('express');
const router = express.Router();
const robot = require('../{{MODULE_NAME}}');

/**
 * @openapi
 * {{MOUNT_PATH}}/create:
 *   post:
 *     tags: [Robot {{DISPLAY_NAME}}]
 *     summary: Crea un job {{TASK_NOUN}} e blocca i fondi in escrow
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [jobId, clientId, robotId, {{INPUT_FIELD}}]
 *             properties:
 *               jobId: { type: string }
 *               clientId: { type: string }
 *               robotId: { type: string }
 *               {{INPUT_FIELD}}: { type: string, description: "{{INPUT_DESCRIPTION}}" }
 *               amount: { type: number, default: {{DEFAULT_AMOUNT}} }
 *               currency: { type: string, enum: [MYZ, XMR], default: MYZ }
 *     responses:
 *       201: { description: Job creato }
 *       400: { description: Payload non valido o job già esistente }
 */
router.post('/create', async (req, res) => {
  try {
    const data = await robot.create{{PASCAL_NAME}}Job(req.body || {});
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * @openapi
 * {{MOUNT_PATH}}/execute:
 *   post:
 *     tags: [Robot {{DISPLAY_NAME}}]
 *     summary: Esegue e consegna un job {{TASK_NOUN}}
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [jobId]
 *             properties:
 *               jobId: { type: string }
 *     responses:
 *       200: { description: Job consegnato }
 *       400: { description: Job non trovato o già consegnato }
 */
router.post('/execute', async (req, res) => {
  try {
    const { jobId } = req.body || {};
    if (!jobId) return res.status(400).json({ success: false, error: 'jobId è obbligatorio' });
    res.json({ success: true, data: await robot.execute{{PASCAL_NAME}}Job(jobId) });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * @openapi
 * {{MOUNT_PATH}}/jobs:
 *   get:
 *     tags: [Robot {{DISPLAY_NAME}}]
 *     summary: Elenco dei job, dal più recente
 *     responses:
 *       200: { description: Elenco job }
 */
router.get('/jobs', (req, res) => {
  res.json({ success: true, data: robot.list{{PASCAL_NAME}}Jobs() });
});

/**
 * @openapi
 * {{MOUNT_PATH}}/job/{jobId}:
 *   get:
 *     tags: [Robot {{DISPLAY_NAME}}]
 *     summary: Dettaglio di un job con lo stato dell'escrow
 *     parameters:
 *       - { in: path, name: jobId, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Dettaglio job }
 *       404: { description: Job non trovato }
 */
router.get('/job/:jobId', (req, res) => {
  const job = robot.get{{PASCAL_NAME}}Job(req.params.jobId);
  if (!job) return res.status(404).json({ success: false, error: 'Job non trovato' });
  res.json({ success: true, data: job });
});

module.exports = router;
