const express = require('express');
const { legacyDownloadByFileName } = require('../controllers/documentController');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/:fileName', optionalAuth, legacyDownloadByFileName);

module.exports = router;
