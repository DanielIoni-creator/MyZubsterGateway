const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// POST /api/onion/scan
// Body: { target: "http://onion.onion", depth: 1 }
router.post('/scan', async (req, res) => {
  try {
    const { target, depth = 1 } = req.body;
    if (!target) {
      return res.status(400).json({ error: 'Target onion URL required' });
    }

    // Validazione base
    if (!target.endsWith('.onion')) {
      return res.status(400).json({ error: 'Invalid onion address' });
    }

    // Prepariamo il comando per eseguire lo script Python
    const scriptPath = '/root/onion_crypto_scanner.py';
    const outputFile = '/tmp/onion_scan_result.json';

    // Costruiamo il comando
    const command = `python3 ${scriptPath} --target "${target}" --depth ${depth} --output ${outputFile}`;

    // Eseguiamo lo script
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('Errore esecuzione script:', error);
        return res.status(500).json({ error: 'Scan failed', details: stderr });
      }

      // Leggiamo il file di output
      try {
        const data = fs.readFileSync(outputFile, 'utf8');
        const results = JSON.parse(data);
        res.json({ success: true, results });
      } catch (readError) {
        console.error('Errore lettura risultati:', readError);
        res.status(500).json({ error: 'Could not parse results', details: readError.message });
      }
    });

  } catch (error) {
    console.error('Errore nella route onion:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
