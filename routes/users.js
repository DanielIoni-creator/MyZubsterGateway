const express = require('express');
const router = express.Router();
router.get('/', (req, res) => res.json({ message: req.t('users.route') }));
module.exports = router;
