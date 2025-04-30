const express = require('express');
const bodyParser = require('body-parser');
const logger = require('./internal/logger');
const authRoutes = require('./internal/routes/auth');
const divisionsRoutes = require('./internal/routes/divisions');
const usersRoutes = require('./internal/routes/users');
const { generalLimiter, skipRateLimitMiddleware } = require('./internal/middleware/rateLimit');
const cors = require('cors');
const healthHandler = require('./internal/handlers/healthHandler');

const app = express();

app.set('trust proxy', true);

const PORT = process.env.PORT || 8001;

app.use(skipRateLimitMiddleware);
app.use(generalLimiter);

const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000', // Specific origin instead of wildcard
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true, // Important for handling credentials
  };

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
// divisions routes
app.use('/api/divisions', divisionsRoutes);
// users routes
app.use('/api/users', usersRoutes);

app.get('/health/light', healthHandler.lightHealthCheck);

app.get('/health', healthHandler.fullHealthCheck);

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error(err.message);
    res.status(500).json({ error: 'Internal Server Error' });
});

// Start the server
app.listen(PORT, () => {
    logger.info(`Auth service is running on port ${PORT}`);
});