const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');
const folderRoutes = require('./routes/folderRoutes');
const { allowedOrigins } = require('./config/env');

const app = express();
app.disable('x-powered-by');
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    const error = new Error('Origin is not allowed.');
    error.status = 403;
    callback(error);
  },
  credentials: true,
}));
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'private, no-store');
  next();
});

app.get('/api/health', (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({ status: connected ? 'ok' : 'unavailable' });
});

app.use('/api/auth', authRoutes);
app.use('/api', folderRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof multer.MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'Each image must be 10 MB or smaller.'
      : error.code === 'LIMIT_FILE_COUNT'
        ? 'You can upload at most 10 photos at once.'
        : 'Choose supported image files.';
    res.status(400).json({ message });
    return;
  }

  if (error.name === 'ValidationError' || error.name === 'CastError') {
    res.status(400).json({ message: 'The submitted information is not valid.' });
    return;
  }

  if (error.status && error.status < 500) {
    res.status(error.status).json({ message: error.message });
    return;
  }

  console.error('API request failed:', error.name || 'Error', error.code || 'no-code');
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

module.exports = app;