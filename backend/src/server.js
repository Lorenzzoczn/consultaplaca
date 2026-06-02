require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const logger = require('./config/logger');
const { apiLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/auth');
const consultaRoutes = require('./routes/consulta');
const adminRoutes = require('./routes/admin');

// Alias para endpoint RESTful de veículos
const { consultarGet } = require('./controllers/consultaController');
const { authenticate, checkConsultaLimit } = require('./middleware/auth');
const { consultaLimiter } = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── General Middleware ───────────────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// HTTP request logging
app.use(morgan('combined', {
  stream: { write: (msg) => logger.info(msg.trim()) },
  skip: (req) => req.path === '/health',
}));

// Global rate limiting
app.use('/api/', apiLimiter);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  const vehicleService = require('./services/vehicleService');
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    providers: vehicleService.getProvidersStatus(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/consulta', consultaRoutes);
app.use('/api/admin', adminRoutes);

// Endpoint RESTful: GET /api/vehicle/:placa
app.get(
  '/api/vehicle/:placa',
  authenticate,
  checkConsultaLimit,
  consultaLimiter,
  consultarGet
);

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`🚀 ConsultaPlaca API running on port ${PORT}`);
  logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
