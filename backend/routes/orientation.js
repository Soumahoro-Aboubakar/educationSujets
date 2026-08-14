const express = require('express');
const { getOrientationOptions } = require('../controllers/orientationController');

const router = express.Router();

router.get('/options', getOrientationOptions);

module.exports = router;
