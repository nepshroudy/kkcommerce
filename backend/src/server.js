require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));

app.get('/', (_req, res) => {
  res.json({ message: 'KKCommerce API is running' });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'kkcommerce-backend' });
});

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

app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`KKCommerce backend running on http://localhost:${PORT}`);
});
