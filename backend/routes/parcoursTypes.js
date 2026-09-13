const express = require('express');
const controller = require('../controllers/dynamicCatalogController');

const router = express.Router();

router.get('/organismes/:organismeId/parcours-types', controller.listParcoursTypes);
router.post('/organismes/:organismeId/parcours-types', controller.createParcoursType);

module.exports = router;
