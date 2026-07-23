const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs');
const path = require('path');

// ---------- CONFIGURAZIONE ----------
const TOR_PROXY = 'socks5h://127.0.0.1:9050';
const TIMEOUT = 120;

// ---------- SCANNER FUNZIONI ----------

/**
 * OnionScan – Analisi sicurezza del servizio onion
 */
async function scanOnion(target) {
  try {
    const cmd = `onionscan -verbose ${target}`;
    const { stdout, stderr } = await execPromise(cmd, { timeout: TIMEOUT * 1000 });
    return { success: true, output: stdout, errors: stderr };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Nmap via Tor – Scansione porte
 */
async function nmapOnion(target) {
  try {
    const cmd = `proxychains4 nmap -sT -Pn -p 80,443,22,8080,3000 ${target}`;
    const { stdout, stderr } = await execPromise(cmd, { timeout: TIMEOUT * 1000 });
    return { success: true, output: stdout, errors: stderr };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * SSL/TLS Scanner
 */
async function sslScan(target) {
  try {
    // Per onion, usiamo openssl s_client
    const cmd = `echo | openssl s_client -connect ${target}:443 -servername ${target} 2>/dev/null | openssl x509 -noout -dates -issuer -subject`;
    const { stdout, stderr } = await execPromise(cmd, { timeout: 30000 });
    return { success: true, output: stdout, errors: stderr };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Headers Analyzer
 */
async function headersScan(target) {
  try {
    const cmd = `curl --socks5-hostname 127.0.0.1:9050 -I -m 30 http://${target}`;
    const { stdout, stderr } = await execPromise(cmd, { timeout: 30000 });
    return { success: true, output: stdout, errors: stderr };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * OSINT Crawler – Estrazione wallet e metadati
 */
async function osintCrawl(target) {
  try {
    const scriptPath = '/root/onion_osint_scanner.py';
    const cmd = `python3 ${scriptPath} --target http://${target} --output /tmp/osint_result.json`;
    const { stdout, stderr } = await execPromise(cmd, { timeout: TIMEOUT * 1000 });
    // Leggi il risultato JSON
    let results = {};
    try {
      results = JSON.parse(fs.readFileSync('/tmp/osint_result.json', 'utf8'));
    } catch (e) {
      results = { error: 'No JSON output' };
    }
    return { success: true, results, output: stdout };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Scansione completa (tutti gli scanner)
 */
async function fullScan(target) {
  const results = {
    target,
    timestamp: new Date().toISOString(),
    scans: {}
  };

  const scanners = [
    { name: 'onionscan', fn: scanOnion },
    { name: 'nmap', fn: nmapOnion },
    { name: 'ssl', fn: sslScan },
    { name: 'headers', fn: headersScan },
    { name: 'osint', fn: osintCrawl }
  ];

  for (const scanner of scanners) {
    console.log(`🔍 Esecuzione: ${scanner.name} su ${target}`);
    try {
      results.scans[scanner.name] = await scanner.fn(target);
    } catch (e) {
      results.scans[scanner.name] = { success: false, error: e.message };
    }
  }

  return results;
}

module.exports = {
  scanOnion,
  nmapOnion,
  sslScan,
  headersScan,
  osintCrawl,
  fullScan
};
