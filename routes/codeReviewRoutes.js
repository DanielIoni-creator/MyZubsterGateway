const express = require('express');
const router = express.Router();
const { analyzeCode, getQualityReport, checkBestPractices, generateQualityReport } = require('../controllers/codeReviewController');

router.post('/analyze', analyzeCode);
router.get('/report/:robotId', getQualityReport);
router.get('/practices/:robotId', checkBestPractices);
router.post('/report', generateQualityReport);

module.exports = router;
