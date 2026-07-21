const express = require('express');
const { protect, authorizeSuperAdmin } = require('../middleware/auth');
const {
  listReferentials,
  createReferential,
  updateReferential,
  deleteReferential,
} = require('../controllers/referentialController');

const router = express.Router();

router.get('/:model', protect, authorizeSuperAdmin, listReferentials);
router.post('/:model', protect, authorizeSuperAdmin, createReferential);
router.put('/:model/:id', protect, authorizeSuperAdmin, updateReferential);
router.delete('/:model/:id', protect, authorizeSuperAdmin, deleteReferential);

module.exports = router;
