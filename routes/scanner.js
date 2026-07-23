const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// POST /api/scanner/onionscan
router.post('/onionscan', auth, async (req, res) => {
  try {
    const { target } = req.body;
    if (!target || !target.endsWith('.onion')) {
      return res.status(400).json({ error: 'Target onion valido richiesto' });
    }

    // Usa nmap via proxychains per la scansione delle porte
    const cmd = `proxychains4 nmap -sT -Pn -p 80,443,22,8080,3000 ${target}`;
    const { stdout, stderr } = await execPromise(cmd, { timeout: 120000 });

    res.json({
      success: true,
      target,
      scan_results: stdout,
      errors: stderr
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/scanner/headers
router.post('/headers', auth, async (req, res) => {
  try {
    const { target } = req.body;
    if (!target || !target.endsWith('.onion')) {
      return res.status(400).json({ error: 'Target onion valido richiesto' });
    }

    const cmd = `curl --socks5-hostname 127.0.0.1:9050 -I -m 30 http://${target}`;
    const { stdout, stderr } = await execPromise(cmd, { timeout: 30000 });

    res.json({
      success: true,
      target,
      headers: stdout,
      errors: stderr
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/scanner/full
router.post('/full', auth, async (req, res) => {
  try {
    const { target } = req.body;
    if (!target || !target.endsWith('.onion')) {
      return res.status(400).json({ error: 'Target onion valido richiesto' });
    }

    // Esegue nmap + headers
    const nmapCmd = `proxychains4 nmap -sT -Pn -p 80,443,22 ${target}`;
    const headersCmd = `curl --socks5-hostname 127.0.0.1:9050 -I -m 30 http://${target}`;

    const [nmapResult, headersResult] = await Promise.all([
      execPromise(nmapCmd, { timeout: 120000 }),
      execPromise(headersCmd, { timeout: 30000 })
    ]);

    res.json({
      success: true,
      target,
      scans: {
        nmap: {
          output: nmapResult.stdout,
          errors: nmapResult.stderr
        },
        headers: {
          output: headersResult.stdout,
          errors: headersResult.stderr
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
