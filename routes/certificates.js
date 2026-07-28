const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificateController');
const { authenticate } = require('../middleware/auth');

router.post('/create', authenticate, certificateController.createCertificate);
router.post('/mint', authenticate, certificateController.mintCertificate);
router.post('/transfer', authenticate, certificateController.transferCertificate);
router.get('/:certificateId', certificateController.getCertificate);
router.get('/user/certificates', authenticate, certificateController.getUserCertificates);
router.get('/verify/:certificateId', certificateController.verifyCertificate);

module.exports = router;
