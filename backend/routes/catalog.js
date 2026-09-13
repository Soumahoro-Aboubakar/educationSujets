const express = require('express');
const controller = require('../controllers/dynamicCatalogController');

// Deliberately public: every endpoint only returns branches containing an
// approved, non-deleted subject. Administrative catalogue management remains
// on /api/organismes, /api/structures, /api/noeuds and /api/matieres.
const router = express.Router();

router.get('/organismes', controller.listPublishedOrganismes);
router.get('/noeuds', controller.listPublishedNoeuds);
router.get('/matieres', controller.listPublishedMatieres);

module.exports = router;
