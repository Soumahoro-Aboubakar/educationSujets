const express = require('express');
const { getSeoCatalog } = require('../services/seoCatalogService');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/api');

// Public : uniquement ce que le catalogue public affiche déjà (sujets publiés, sans fichier ni auteur).
const router = express.Router();

router.get('/catalog', asyncHandler(async (req, res) => {
  const data = await getSeoCatalog();
  res.set('Cache-Control', 'public, max-age=300');
  sendSuccess(res, { data });
}));

module.exports = router;
