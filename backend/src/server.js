require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

const configuredOrigins = [
  ...(process.env.FRONTEND_URLS || '').split(','),
  process.env.FRONTEND_URL || '',
]
  .map((value) => value.trim().replace(/\/+$/, ''))
  .filter(Boolean);

if (process.env.NODE_ENV !== 'production') {
  configuredOrigins.push('http://localhost:3000');
}

const allowedOrigins = [...new Set(configuredOrigins)];

app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      // Requests without an Origin header include health checks and
      // server-to-server requests. They are safe to pass through CORS.
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.replace(/\/+$/, '');
      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      const error = new Error('Origin is not allowed by CORS.');
      error.status = 403;
      return callback(error);
    },
  })
);

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// IMPORTANT: Stripe webhook must receive the raw request body.
// This route must stay BEFORE express.json().
const paymentController = require('./controllers/paymentController');
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  paymentController.webhook
);

app.use(express.json({ limit: '1mb' }));

app.get('/', (_req, res) =>
  res.json({ message: 'KKCommerce API is running' })
);

app.get('/api/health', (_req, res) =>
  res.json({
    status: 'ok',
    service: 'kkcommerce-backend',
    environment: process.env.NODE_ENV || 'development',
    paymentsEnabled:
      String(process.env.PAYMENTS_ENABLED || 'false').toLowerCase() === 'true',
  })
);

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/wishlist', require('./routes/wishlistRoutes'));
app.use('/api/admin/orders', require('./routes/adminOrderRoutes'));
app.use('/api/admin/customers', require('./routes/customerRoutes'));
app.use('/api/account', require('./routes/accountRoutes'));
app.use('/api/discounts', require('./routes/discountRoutes'));
app.use('/api/uploads', require('./routes/uploadRoutes'));

// Phase 3A + 3B
app.use('/api/shipping', require('./routes/shippingRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));

app.use((req, res) =>
  res
    .status(404)
    .json({ message: `Route not found: ${req.method} ${req.originalUrl}` })
);

app.use((error, _req, res, _next) => {
  console.error(error);

  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      message:
        error.code === 'LIMIT_FILE_SIZE'
          ? 'Each image must be 10 MB or smaller.'
          : error.code === 'LIMIT_FILE_COUNT'
          ? 'Maximum 10 images are allowed.'
          : error.message,
    });
  }

  return res
    .status(error.status || 500)
    .json({ message: error.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`KKCommerce backend listening on port ${PORT}`);
  console.log(
    `Environment: ${process.env.NODE_ENV || 'development'} | Payments: ${
      String(process.env.PAYMENTS_ENABLED || 'false').toLowerCase() === 'true'
        ? 'enabled'
        : 'disabled'
    }`
  );
});

function shutdown(signal) {
  console.log(`${signal} received. Closing HTTP server...`);
  server.close(() => process.exit(0));

  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
