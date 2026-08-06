const express = require('express');
const {
  ComplianceOracle,
  createHttpSource,
  startComplianceOracleScheduler,
} = require('../services/complianceOracleService');

const router = express.Router();

function jsonSource(name, envName) {
  const url = process.env[envName];
  return url ? createHttpSource({ name, url, mapResponse: (data) => data }) : null;
}

const sources = [
  jsonSource('sanctions', 'COMPLIANCE_SANCTIONS_URL'),
  jsonSource('kyc', 'COMPLIANCE_KYC_URL'),
  jsonSource('limits', 'COMPLIANCE_LIMITS_URL'),
].filter(Boolean);

const publisher = {
  async publish(snapshot) {
    const relayUrl = process.env.COMPLIANCE_ORACLE_RELAY_URL;
    if (!relayUrl) return { mode: 'dry-run', root: snapshot.root };
    const response = await require('axios').post(relayUrl, {
      root: snapshot.root,
      transactionLimit: snapshot.transactionLimit,
      wallets: snapshot.wallets,
      sanctions: snapshot.sanctions,
    }, {
      headers: { authorization: `Bearer ${process.env.COMPLIANCE_ORACLE_RELAY_TOKEN || ''}` },
      timeout: 15000,
    });
    return { mode: 'relay', transactionHash: response.data.transactionHash };
  },
};

const oracle = new ComplianceOracle({ sources, publisher });
if (sources.length) {
  startComplianceOracleScheduler(oracle, Number(process.env.COMPLIANCE_REFRESH_MS) || 15 * 60 * 1000);
}

router.get('/status', (_req, res) => res.json({ success: true, data: oracle.status() }));

router.get('/snapshot', (_req, res) => {
  if (!oracle.snapshot) return res.status(503).json({ success: false, error: 'Oracle data is not available yet' });
  return res.json({ success: true, data: oracle.snapshot });
});

router.post('/refresh', async (_req, res) => {
  if (!sources.length) return res.status(503).json({ success: false, error: 'No compliance sources configured' });
  try {
    return res.json({ success: true, data: await oracle.refresh() });
  } catch (error) {
    return res.status(502).json({ success: false, error: error.message });
  }
});

router.get('/verify/:address', (req, res) => {
  try {
    return res.json({ success: true, data: oracle.verify({ address: req.params.address, amount: req.query.amount || '0' }) });
  } catch (error) {
    return res.status(error.message.includes('not available') ? 503 : 400).json({ success: false, error: error.message });
  }
});

module.exports = router;
module.exports.oracle = oracle;
