/**
 * Audit Logging Middleware - Bounty B14 (#279)
 *
 * Intercetta automaticamente le azioni critiche definite in auditService e
 * registra una voce di audit quando la risposta è stata inviata.
 *
 * Due proprietà volute:
 *  - **non blocca**: la voce viene scritta su `res.on('finish')`, quindi il
 *    client non aspetta mai il database;
 *  - **non può rompere la richiesta**: ogni errore dell'audit viene loggato e
 *    ignorato.
 */

const { resolveAction, logAudit, firstValue, sanitize } = require('../services/auditService');

function clientIp(req) {
  const forwarded = req.headers && req.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return req.ip || (req.connection && req.connection.remoteAddress) || null;
}

/**
 * Estrae il messaggio d'errore dalla risposta, seguendo le due forme usate nel
 * gateway: `{ error: '...' }` e `{ success: false, error: '...' }`.
 */
function errorFromBody(body) {
  if (!body || typeof body !== 'object') return null;
  if (typeof body.error === 'string') return body.error;
  if (body.error && typeof body.error.message === 'string') return body.error.message;
  return null;
}

/**
 * @param {{ resolve?: Function, log?: Function }} [options] iniettabili nei test.
 */
function auditLogger(options = {}) {
  const resolve = options.resolve || resolveAction;
  const write = options.log || logAudit;

  return function auditLoggerMiddleware(req, res, next) {
    let descriptor = null;
    try {
      descriptor = resolve(req.method, req.originalUrl || req.url);
    } catch (err) {
      console.error('audit: risoluzione azione fallita:', err.message);
    }

    if (!descriptor) return next();

    const startedAt = Date.now();

    // Il body di risposta serve per il messaggio d'errore e per gli id generati
    // dal server (es. orderId): si intercetta res.json senza alterarne il
    // comportamento.
    let responseBody = null;
    const originalJson = res.json.bind(res);
    res.json = function auditJson(body) {
      responseBody = body;
      return originalJson(body);
    };

    res.on('finish', () => {
      try {
        const sources = [req.body, req.params, req.query, responseBody, responseBody && responseBody.data];
        const statusCode = res.statusCode;

        write({
          action: descriptor.action,
          category: descriptor.category,
          resourceType: descriptor.resourceType,
          resourceId: firstValue(sources, descriptor.resourceKeys),
          userId: firstValue(sources, descriptor.userKeys),
          method: req.method,
          path: (req.originalUrl || req.url || '').split('?')[0],
          statusCode,
          status: statusCode >= 400 ? 'failure' : 'success',
          ip: clientIp(req),
          userAgent: req.headers ? req.headers['user-agent'] || null : null,
          durationMs: Date.now() - startedAt,
          metadata: sanitize(req.body || {}),
          error: statusCode >= 400 ? errorFromBody(responseBody) : null
        });
      } catch (err) {
        // Un audit fallito non deve mai propagarsi alla richiesta.
        console.error('audit: registrazione fallita:', err.message);
      }
    });

    next();
  };
}

module.exports = { auditLogger, errorFromBody, clientIp };
