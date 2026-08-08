const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// In-memory review storage
const reviews = new Map();

// Simple syntax validators (no external deps)
function validateJavaScript(code) {
  const issues = [];
  try {
    new Function(code);
  } catch (e) {
    issues.push({ type: 'syntax', message: e.message, severity: 'error' });
  }
  // Security checks
  if (code.includes('eval(')) issues.push({ type: 'security', message: 'Avoid eval()', severity: 'warning' });
  if (code.includes('child_process') || code.includes('exec(')) issues.push({ type: 'security', message: 'External process execution detected', severity: 'warning' });
  if (code.includes('fs.unlink') || code.includes('fs.rm')) issues.push({ type: 'security', message: 'File deletion detected', severity: 'info' });
  return issues;
}

function validatePython(code) {
  const issues = [];
  try { compile(code, '<review>', 'exec'); } catch (e) { issues.push({ type: 'syntax', message: str(e), severity: 'error' }); }
  if (code.includes('subprocess') || code.includes('os.system')) issues.push({ type: 'security', message: 'Subprocess call detected', severity: 'warning' });
  if (code.includes('eval(') || code.includes('exec(')) issues.push({ type: 'security', message: 'Dynamic execution detected', severity: 'warning' });
  return issues;
}

function computeScore(issues) {
  const errors = issues.filter(i => i.severity === 'error').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;
  const infos = issues.filter(i => i.severity === 'info').length;
  const base = 100 - (errors * 20) - (warnings * 5) - (infos * 1);
  return Math.max(0, Math.min(100, base));
}

// POST /api/robot/code/review
router.post('/code/review', async (req, res) => {
  try {
    const { code, language, robotId } = req.body;
    if (!code || !language) return res.status(400).json({ error: 'code and language are required' });

    const lang = language.toLowerCase();
    let issues = [];
    if (lang === 'javascript' || lang === 'js') issues = validateJavaScript(code);
    else if (lang === 'python' || lang === 'py') issues = validatePython(code);
    else issues = [{ type: 'info', message: `Language "${language}" — basic syntax check only`, severity: 'info' }];

    const score = computeScore(issues);
    const reviewId = crypto.randomUUID();
    const review = {
      reviewId, robotId: robotId || 'unknown', language: lang,
      score, issues, codeLength: code.length, createdAt: new Date().toISOString()
    };
    reviews.set(reviewId, review);

    res.json({
      success: true, review,
      summary: { score, totalIssues: issues.length, errors: issues.filter(i => i.severity === 'error').length, warnings: issues.filter(i => i.severity === 'warning').length }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/robot/code/review/:reviewId
router.get('/code/review/:reviewId', (req, res) => {
  const review = reviews.get(req.params.reviewId);
  if (!review) return res.status(404).json({ error: 'Review not found' });
  res.json({ review });
});

// GET /api/robot/code/reviews — List robot reviews
router.get('/code/reviews', (req, res) => {
  const { robotId } = req.query;
  let list = Array.from(reviews.values());
  if (robotId) list = list.filter(r => r.robotId === robotId);
  res.json({ reviews: list.slice(-50), count: list.length });
});

module.exports = router;
