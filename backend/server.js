require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/error');
const legacyRouteMetrics = require('./middleware/legacyRouteMetrics');

const app = express();
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number.parseInt(process.env.RATE_LIMIT_MAX, 10) || 300,
  standardHeaders: true,
  legacyHeaders: false,
});

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api', apiLimiter);

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
app.use('/api/referentials', require('./routes/referentials'));
app.use('/uploads', require('./routes/uploads'));

app.use(errorHandler);

const SELF_URL = process.env.SELF_URL; 
const PING_INTERVAL = 2 * 60 * 1000; 

const startServer = async () => {
  await connectDB();

  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });

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

startServer().catch((error) => {
  console.error(`[STARTUP] ${error.message}`);
  process.exitCode = 1;
});
