const express = require('express');
const controller = require('../controllers/trafficController');
const limits = require('../middleware/rateLimit');

const router = express.Router();

// Provenance des visites (compteurs agrégés par jour) : écriture publique limitée.
router.post('/visit', limits.publicWrite, controller.visit);
router.post('/signup', limits.publicWrite, controller.signup);

module.exports = router;
