require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import routes
const authRoutes    = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const wardenRoutes  = require('./routes/wardenRoutes');
const roomRoutes    = require('./routes/roomRoutes');
const feeRoutes     = require('./routes/feeRoutes');
const outpassRoutes = require('./routes/outpassRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

// CORS configuration
// Allowed origins come from the CORS_ORIGIN env var (comma-separated list),
// falling back to the local dev frontend. This lets the deployed frontend
// (e.g. Vercel) talk to the API without hardcoding its URL.
const defaultOrigins = ['http://localhost:5173'];
const envOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (curl, health checks) with no Origin header.
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Hostel Management API is running' });
});

// API Routes
app.use('/api/auth',    authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/warden',  wardenRoutes);
app.use('/api/rooms',   roomRoutes);
app.use('/api/fees',    feeRoutes);
app.use('/api/outpass', outpassRoutes);
app.use('/api/notifications', notificationRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);

  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;
