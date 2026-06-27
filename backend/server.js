
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/error');

connectDB();

const app = express();

app.use(express.json());

app.use(cors());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/universities', require('./routes/universities'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/levels', require('./routes/levels'));
app.use('/api/semesters', require('./routes/semesters'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/users', require('./routes/users'));

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(
  PORT,
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
);

process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});
