require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/error');

connectDB();

console.log(process.env.FRONTEND_URL);
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
app.use('/api/universities', require('./routes/universities'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/levels', require('./routes/levels'));
app.use('/api/semesters', require('./routes/semesters'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/users', require('./routes/users'));
app.use('/api/referentials', require('./routes/referentials'));
app.use('/uploads', require('./routes/uploads'));

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

const SELF_URL = process.env.SELF_URL; 
const PING_INTERVAL = 2 * 60 * 1000; 

if (SELF_URL) {
  setInterval(async () => {
    try {
      const res = await fetch(`${SELF_URL}/api/health`);
      console.log(`[self-ping] Status: ${res.status} - ${new Date().toISOString()}`);
    } catch (err) {
      console.error(`[self-ping] Échec: ${err.message}`);
    }
  }, PING_INTERVAL);

  console.log(`[self-ping] Activé — ping toutes les 2 minutes vers ${SELF_URL}/api/health`);
} else {
  console.warn('[self-ping] SELF_URL non défini — auto-ping désactivé.');
}



process.on('unhandledRejection', (err) => {
  console.error(`Unhandled rejection: ${err.message}`);
  server.close(() => process.exit(1));
});
