const express = require('express');
const prep = require('../controllers/prepController');
const { protect, optionalAuth } = require('../middleware/auth');
const limits = require('../middleware/rateLimit');

/** Préparation aux concours — cahier des charges § 29. */
const router = express.Router();

router.use(optionalAuth);
router.use(require('../services/prep/contentService').middleware);
router.get('/manifest', prep.getManifest);

router.post('/appareils', limits.publicWrite, prep.declareDevice);
router.get('/droits', prep.getRights);
router.get('/catalogue', prep.getCatalogue);
router.get('/videos', prep.getVideos); // lecture seule : les vidéos sont écrites par scripts/video/publish.js
router.get('/programmes/:code', prep.getProgramme);
router.get('/modules/:code', prep.getModule);
router.post('/exercices/:code/tentative', limits.publicWrite, prep.attempt);
router.post('/exercices/:code/raisonnement', limits.publicWrite, prep.reasoning);
router.post('/sync', limits.publicWrite, prep.sync);
router.get('/progressions', prep.getProgressions);
router.get('/programmes/:code/classement', prep.ranking);
router.get('/programmes/:code/candidats', limits.search, prep.searchCandidates);
router.get('/programmes/:code/candidats/:identite', prep.candidate);
router.post('/signalements', limits.publicWrite, prep.report);
router.post('/rattachement', protect, prep.attach);
router.patch('/profil-public', protect, prep.updatePublicProfile);

module.exports = router;
