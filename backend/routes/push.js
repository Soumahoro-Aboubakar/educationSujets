const express = require('express');
const { protect } = require('../middleware/auth');
const PushSubscription = require('../models/PushSubscription');
const push = require('../services/pushService');

/**
 * Notifications web : clé publique (lecture), abonnement et désabonnement du navigateur du compte.
 * Le contenu d'un abonnement vient du navigateur (PushManager) ; on ne garde que l'adresse du
 * service push et ses deux clés.
 */
const router = express.Router();

const validSubscription = (body) => {
  const s = body?.subscription;
  return s && typeof s.endpoint === 'string' && /^https:\/\//.test(s.endpoint) && s.endpoint.length <= 1000
    && typeof s.keys?.p256dh === 'string' && typeof s.keys?.auth === 'string' ? s : null;
};

// GET /api/push/cle → { cle } ; 404 si les notifications ne sont pas configurées sur ce serveur.
router.get('/cle', (req, res) => {
  const cle = push.publicKey();
  if (!cle) return res.status(404).json({ success: false, error: 'Notifications indisponibles', code: 'PUSH_DESACTIVE' });
  return res.json({ success: true, data: { cle } });
});

// POST /api/push/abonnement { subscription, programme? }
router.post('/abonnement', protect, async (req, res) => {
  const s = validSubscription(req.body);
  if (!s) return res.status(400).json({ success: false, error: 'Abonnement invalide', code: 'PUSH_ABONNEMENT' });
  const programme = typeof req.body.programme === 'string' ? req.body.programme.slice(0, 60) : null;
  await PushSubscription.findOneAndUpdate(
    { endpoint: s.endpoint },
    { $set: { user: req.user._id, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth }, programme, rappels: true, echecs: 0 } },
    { upsert: true, setDefaultsOnInsert: true },
  );
  return res.status(201).json({ success: true, data: { rappels: true } });
});

// DELETE /api/push/abonnement { endpoint }
router.delete('/abonnement', protect, async (req, res) => {
  const endpoint = typeof req.body?.endpoint === 'string' ? req.body.endpoint : null;
  if (endpoint) await PushSubscription.deleteOne({ endpoint, user: req.user._id });
  return res.json({ success: true, data: { rappels: false } });
});

module.exports = router;
