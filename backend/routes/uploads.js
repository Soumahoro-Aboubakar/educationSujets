const express = require('express');
const privateNoStore = require('../middleware/privateNoStore');
const { legacyDownloadByFileName } = require('../controllers/documentController');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/:fileName', privateNoStore, optionalAuth, legacyDownloadByFileName);

module.exports = router;
