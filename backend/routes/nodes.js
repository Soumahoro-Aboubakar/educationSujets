const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { listNodes, createNode, updateNode, deleteNode } = require('../controllers/nodeController');

const router = express.Router();
const adminOnly = [protect, authorize('sub-admin', 'admin')];

router.route('/').get(listNodes).post(...adminOnly, createNode);
router.route('/:id').put(...adminOnly, updateNode).delete(...adminOnly, deleteNode);

module.exports = router;
