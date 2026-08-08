/**
 * API di consultazione dell'audit log - Bounty B14 (#279)
 *
 *   GET /api/audit?userId=xxx           voci filtrate e paginate
 *   GET /api/audit/export?format=csv    export CSV o JSON
 *   GET /api/audit/stats                conteggi per categoria, azione, esito
 *   GET /api/audit/actions              catalogo delle azioni tracciate
 */

const express = require('express');
const router = express.Router();
const {
  queryAuditLogs, exportAuditLogs, getAuditStats, listActions, toCSV, CSV_COLUMNS
} = require('../services/auditService');

/** I filtri non validi sono errori del client (400), non del server (500). */
function handle(res, err) {
  const isValidation = /non è una data valida|deve essere|non può essere/.test(err.message);
  res.status(isValidation ? 400 : 500).json({ success: false, error: err.message });
}

/**
 * @openapi
 * /api/audit:
 *   get:
 *     tags: [Audit]
 *     summary: Elenco filtrato delle azioni critiche registrate
 *     parameters:
 *       - { in: query, name: userId, schema: { type: string }, description: Filtra per utente }
 *       - { in: query, name: action, schema: { type: string }, description: "Azione esatta, es. escrow.create" }
 *       - { in: query, name: category, schema: { type: string, enum: [payment, escrow, robot, bounty, backup, stake, reward, other] } }
 *       - { in: query, name: resourceId, schema: { type: string } }
 *       - { in: query, name: resourceType, schema: { type: string } }
 *       - { in: query, name: status, schema: { type: string, enum: [success, failure] } }
 *       - { in: query, name: from, schema: { type: string, format: date-time }, description: Data iniziale (ISO 8601) }
 *       - { in: query, name: to, schema: { type: string, format: date-time }, description: Data finale (ISO 8601) }
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 50, maximum: 500 } }
 *     responses:
 *       200: { description: Voci di audit con paginazione }
 *       400: { description: Filtro non valido }
 */
router.get('/', async (req, res) => {
  try {
    const { logs, pagination, source } = await queryAuditLogs(req.query);
    res.json({ success: true, data: logs, pagination, source });
  } catch (err) {
    handle(res, err);
  }
});

/**
 * @openapi
 * /api/audit/export:
 *   get:
 *     tags: [Audit]
 *     summary: Export delle voci di audit in CSV o JSON
 *     description: Accetta gli stessi filtri di GET /api/audit. Risponde con un allegato scaricabile.
 *     parameters:
 *       - { in: query, name: format, schema: { type: string, enum: [csv, json], default: json } }
 *       - { in: query, name: max, schema: { type: integer, default: 10000, maximum: 50000 } }
 *     responses:
 *       200: { description: File CSV o JSON }
 *       400: { description: Formato o filtro non valido }
 */
router.get('/export', async (req, res) => {
  try {
    const format = String(req.query.format || 'json').toLowerCase();
    if (!['csv', 'json'].includes(format)) {
      return res.status(400).json({ success: false, error: "format deve essere 'csv' o 'json'" });
    }

    const logs = await exportAuditLogs(req.query);
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:]/g, '-');
    const filename = `audit-log-${stamp}.${format}`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      return res.send(toCSV(logs, CSV_COLUMNS));
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.send(JSON.stringify({ exportedAt: new Date().toISOString(), count: logs.length, logs }, null, 2));
  } catch (err) {
    handle(res, err);
  }
});

/**
 * @openapi
 * /api/audit/stats:
 *   get:
 *     tags: [Audit]
 *     summary: Conteggi aggregati per categoria, azione ed esito
 *     responses:
 *       200: { description: Statistiche sull'intervallo filtrato }
 */
router.get('/stats', async (req, res) => {
  try {
    res.json({ success: true, data: await getAuditStats(req.query) });
  } catch (err) {
    handle(res, err);
  }
});

/**
 * @openapi
 * /api/audit/actions:
 *   get:
 *     tags: [Audit]
 *     summary: Catalogo delle azioni critiche tracciate automaticamente
 *     responses:
 *       200: { description: Elenco di azione, categoria, metodo e tipo di risorsa }
 */
router.get('/actions', (req, res) => {
  const actions = listActions();
  res.json({ success: true, count: actions.length, data: actions });
});

module.exports = router;
