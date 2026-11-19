const express = require('express');
const controller = require('../controllers/appReleaseController');

const router = express.Router();

// Politique de mise à jour de l'application (Android, iOS) : lecture publique.
router.get('/version/:platform', controller.getPolicy);

module.exports = router;
