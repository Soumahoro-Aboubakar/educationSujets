require('dotenv').config();
require('./config/network').applyNetworkDefaults();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const qs = require('qs');
const connectDB = require('./config/db');
const securityConfig = require('./config/security');
const errorHandler = require('./middleware/error');
const legacyRouteMetrics = require('./middleware/legacyRouteMetrics');
const limits = require('./middleware/rateLimit');
const security = require('./middleware/security');

const app = express();

// Nombre de proxys de confiance (req.ip = vraie IP du client, base des limites par IP).
const parseTrustProxy = (value) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return /^\d+$/.test(String(value)) ? Number(value) : value;
};
app.set('trust proxy', parseTrustProxy(securityConfig.network.trustProxy));
// Chaîne de requête bornée : ni objets profonds, ni milliers de paramètres.
app.set('query parser', (str) => qs.parse(str, {
  depth: securityConfig.body.queryDepth,
  parameterLimit: securityConfig.body.queryParameterLimit,
  arrayLimit: securityConfig.body.queryArrayLimit,
}));

const { corsOrigins } = securityConfig.network;

app.use(security.requestId);
app.use(security.requestMonitor);
app.use(helmet({ crossOriginResourcePolicy: false }));
// CORS_ORIGINS défini : seules ces origines sont autorisées ; sinon, comportement historique.
app.use(cors({ origin: corsOrigins.length ? corsOrigins : true, credentials: true, exposedHeaders: ['Retry-After', 'X-Request-Id'] }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Avant tout travail : IP bloquée, puis limites globales (flood par IP, plafond général, rafales).
app.use('/api', security.blockGuard, security.identify, limits.ipFlood);
app.use('/api', (req, res, next) => (req.path.startsWith('/payments/webhooks/') ? next() : limits.general(req, res, next)));
app.use('/api', (req, res, next) => (req.path.startsWith('/payments/webhooks/') ? next() : limits.burst(req, res, next)));

// Corps brut conservé pour vérifier la signature HMAC des webhooks de paiement.
app.use('/api/payments/webhooks', express.json({
  limit: securityConfig.body.webhookLimit,
  verify: (req, res, buf) => {
    req.rawBody = Buffer.from(buf);
  },
}));
app.use(express.json({ limit: securityConfig.body.jsonLimit }));
app.use(express.urlencoded({
  extended: true,
  limit: securityConfig.body.jsonLimit,
  parameterLimit: securityConfig.body.urlencodedParameterLimit,
}));
app.use(security.sanitizeInput);
app.use('/api', security.apiTimeout);

app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, data: { status: 'ok' } });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/search', require('./routes/search'));
app.use('/api/universities', require('./routes/universities'));
app.use('/api/institutions', legacyRouteMetrics('institutions'), require('./routes/institutions'));
app.use('/api/nodes', legacyRouteMetrics('nodes'), require('./routes/nodes'));
app.use('/api/organismes', require('./routes/organismes'));
app.use('/api', require('./routes/parcoursTypes'));
app.use('/api/structures', require('./routes/structures'));
app.use('/api/noeuds', require('./routes/noeuds'));
app.use('/api/matieres', require('./routes/matieres'));
app.use('/api/catalog', require('./routes/catalog'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/levels', require('./routes/levels'));
app.use('/api/semesters', require('./routes/semesters'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/contest-types', require('./routes/contestTypes'));
app.use('/api/orientation', require('./routes/orientation'));
app.use('/api/training', require('./routes/training'));
app.use('/api/users', require('./routes/users'));
app.use('/api/me', require('./routes/me'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/referentials', require('./routes/referentials'));
// Ancien lien de téléchargement direct : mêmes protections qu'un téléchargement via l'API.
app.use('/uploads', security.blockGuard, security.identify, limits.ipFlood, limits.download, require('./routes/uploads'));

app.use('/api', security.notFound);
app.use(errorHandler);

const SELF_URL = process.env.SELF_URL; 
const PING_INTERVAL = 2 * 60 * 1000; 

const startServer = async () => {
  await connectDB();

  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
  // Connexions lentes (slowloris) : en-têtes et requête complète reçus dans un délai borné.
  server.headersTimeout = securityConfig.timeouts.headersMs;
  server.requestTimeout = securityConfig.timeouts.serverRequestMs;
  // Supérieur au délai du proxy amont, pour éviter des 502 sur connexions réutilisées.
  server.keepAliveTimeout = securityConfig.timeouts.keepAliveMs;

  security.startSecurityMonitor();

  // Alias d'URL des organismes (/sujets?o=inphb) : attribués à ceux qui n'en ont pas encore.
  try {
    const assigned = await require('./services/dynamicCatalogService').ensureOrganismeSlugs();
    if (assigned) console.log(`[CATALOG] Alias attribués à ${assigned} organisme(s).`);
  } catch (error) {
    console.error(`[CATALOG] Attribution des alias impossible : ${error.message}`);
  }

  // Fournisseur de paiement vérifié dès le démarrage : une configuration incomplète apparaît
  // dans les logs tout de suite, au lieu d'un « paiement momentanément indisponible » plus tard.
  try {
    const provider = require('./services/payments').getPaymentProvider();
    console.log(`[PAYMENTS] Fournisseur actif : ${provider.name}${provider.environment ? ` (${provider.environment})` : ''}`);
  } catch (error) {
    console.error(`[PAYMENTS] Paiements INDISPONIBLES — ${error.message}`);
  }

  // Confirme les paiements ouverts auprès du fournisseur, même sans webhook.
  require('./services/payments/reconciler').startPaymentReconciler();

  try {
    const startTrashPurgeCron = require('./scripts/trashCron');
    startTrashPurgeCron();
  } catch (err) {
    console.warn('[TRASH_CRON] Could not start trash purge cron:', err.message);
  }

  if (SELF_URL) {
    setInterval(async () => {
      try {
        const res = await fetch(`${SELF_URL}/api/health`);
        console.log(`[self-ping] Status: ${res.status} - ${new Date().toISOString()}`);
      } catch (err) {
        console.error(`[self-ping] Echec: ${err.message}`);
      }
    }, PING_INTERVAL);

    console.log(`[self-ping] Active - ping toutes les 2 minutes vers ${SELF_URL}/api/health`);
  } else {
    console.warn('[self-ping] SELF_URL non defini - auto-ping desactive.');
  }

  return server;
};

// Démarrage uniquement en exécution directe (node server.js) ; les tests importent `app`.
if (require.main === module) {
  startServer().catch((error) => {
    console.error(`[STARTUP] ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = app;
