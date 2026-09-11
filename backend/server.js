require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const userRoutes = require('./routes/userRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const jobRoutes = require('./routes/jobRoutes');
const agentRoutes = require('./routes/agentRoutes');
const authRoutes = require('./routes/authRoutes');         // NEW
const automationRoutes = require('./routes/automationRoutes'); // NEW

const app = express();

// Connect to Database
connectDB();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200, // increased for automation workflows
});
app.use(limiter);

// Static uploads
app.use('/uploads', express.static('uploads'));

// ── Routes ──────────────────────────────────────────────────
// Existing routes (DO NOT MODIFY their behavior)
app.use('/api/users', userRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/analysis', agentRoutes);

// New routes
app.use('/api/auth', authRoutes);
app.use('/api/automation', automationRoutes);

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'HireFlow AI Backend' });
});

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Not Found - ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 HireFlow AI Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`${'='.repeat(60)}\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received: closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
