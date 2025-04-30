const jwt = require('jsonwebtoken');
const logger = require('../logger');
const authCache = require('../services/authCache');
  
const protectedRoutes = [
  // Auth
  '/api/auth/change-password',
  '/api/auth/logout',
  '/api/auth/me',

  // Users
  '/api/users/:id',
  '/api/users/:id/divisions',

  // Divisions
  '/api/divisions',
  '/api/divisions/:id',
  '/api/divisions/:id/users',
  '/api/divisions/:id/users/:userId',

  // Aspirasi
  '/api/aspirasi/target/:target',
  '/api/aspirasi/my',

  // Meetings
  '/api/meetings',
  '/api/meetings/join',
  '/api/meetings/upcoming',
  '/api/meetings/:id',
  '/api/meetings/check-conflict',
  '/api/meetings/reminders/send',
  '/api/meetings/reminders/force/:id',

  // Trainings
  '/api/trainings',
  '/api/trainings/:id/participants',
  '/api/trainings/:id/add-division-members',
  '/api/trainings/:id/force-add-participants',
  '/api/trainings/upcoming',
  '/api/trainings/:id',
  '/api/trainings/check-conflict',
  '/api/trainings/reminders',
  '/api/trainings/reminders/send',
  '/api/trainings/reminders/force/:id',

  // Presence
  '/api/presence',
  '/api/presence/scan',
  '/api/presence/manual',
  '/api/presence/generate-qr',
  '/api/presence/training/:trainingId',
  '/api/presence/stats/:trainingId',
  '/api/presence/history',
  '/api/presence/history/:userId',
  '/api/presence/me/count',

  // Progress
  '/api/progress',
  '/api/progress/me',
  '/api/progress/me/summary',
];

  // List of routes that require KADIV role
  const kadivOnlyRoutes = [
    // Auth (only Kadiv can register/import CSV)
    '/api/auth/register',
    '/api/auth/import-csv',
  
    // Users (only Kadiv can delete)
    '/api/users/:id',
  
    // Divisions management
    '/api/divisions',
    '/api/divisions/:id',
    '/api/divisions/:id/users',
    '/api/divisions/:id/users/:userId',
  
    // Aspirasi (only HD Kadiv can delete)
    '/api/aspirasi/:id',
  
    // Meetings (only Kadiv can manage reminders & delete)
    '/api/meetings/reminders/send',
    '/api/meetings/reminders/force/:id',
    '/api/meetings/:id',
  
    // Trainings (only Kadiv can create/update/delete/enroll)
    '/api/trainings',
    '/api/trainings/:id',
    '/api/trainings/:id/add-division-members',
    '/api/trainings/:id/force-add-participants',
    '/api/trainings/check-conflict',
    '/api/trainings/reminders/send',
    '/api/trainings/reminders/force/:id',
  
    // Presence (only Kadiv can manual-record & generate QR)
    '/api/presence/manual',
    '/api/presence/generate-qr',
  
    // Progress (only HD Kadiv can accept/reject)
    '/api/progress/:id/accept',
    '/api/progress/:id/reject',
  ];

const matchKadivOnlyRoute = (path) => {
  // Cek exact match
  if (kadivOnlyRoutes.includes(path)) return true;
  // Cek dynamic match
  const dynamicRoutes = [
    /^\/api\/users\/[^/]+$/,
    /^\/api\/users\/[^/]+\/divisions$/,
    /^\/api\/divisions(\/[^/]+)?(\/users(\/[^/]+)?)?$/,
    /^\/api\/meetings\/reminders\/send$/,
    /^\/api\/meetings\/reminders\/force\/[^/]+$/,
    /^\/api\/meetings\/(?!upcoming$)[^/]+$/,
    /^\/api\/trainings(?!\/upcoming)(\/[^/]+)?(\/add-division-members|\/force-add-participants|\/check-conflict|\/reminders|\/reminders\/send|\/reminders\/force\/[^/]+)?$/
  ];
  return dynamicRoutes.some((re) => re.test(path));
};

// Middleware: hanya user yang sudah login (token valid) yang bisa akses
const requireAuth = async (req, res, next) => {
  const shouldProtect = protectedRoutes.some(route => req.path.startsWith(route));
  if (!shouldProtect) return next();

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn({
      message: 'Authentication failed: No token provided',
      path: req.path,
      requestId: req.id
    });
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.'
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const isRevoked = await authCache.isTokenRevoked(token);
    if (isRevoked) {
      logger.warn({
        message: 'Authentication failed: Token revoked',
        path: req.path,
        requestId: req.id
      });
      return res.status(401).json({
        success: false,
        message: 'Access denied. Token has been revoked.'
      });
    }

    const decoded = await authCache.getCachedJwtClaims(token);
    if (!decoded) {
      logger.warn({
        message: 'Authentication failed: Invalid token',
        path: req.path,
        requestId: req.id
      });
      return res.status(403).json({
        success: false,
        message: 'Invalid token.'
      });
    }

    req.user = decoded;
    req.token = token;
    next();
  } catch (error) {
    logger.error({
      message: `Authentication error: ${error.message}`,
      path: req.path,
      requestId: req.id
    });
    return res.status(403).json({
      success: false,
      message: 'Invalid token.'
    });
  }
};

const authMiddleware = async (req, res, next) => {
  // Only check for KADIV role if route is in kadivOnlyRoutes
  const requiresKadiv = matchKadivOnlyRoute(req.path);
  if (!requiresKadiv) return next();

  // Get token from authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn({
      message: 'Authentication failed: No token provided',
      path: req.path,
      requestId: req.id
    });
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.'
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    // First check if token is revoked
    const isRevoked = await authCache.isTokenRevoked(token);
    if (isRevoked) {
      logger.warn({
        message: 'Authentication failed: Token revoked',
        path: req.path,
        requestId: req.id
      });
      return res.status(401).json({
        success: false,
        message: 'Access denied. Token has been revoked.'
      });
    }

    // Verify token (with caching)
    const decoded = await authCache.getCachedJwtClaims(token);
    if (!decoded) {
      logger.warn({
        message: 'Authentication failed: Invalid token',
        path: req.path,
        requestId: req.id
      });
      return res.status(403).json({
        success: false,
        message: 'Invalid token.'
      });
    }

    req.user = decoded;
    req.token = token;

    // Check for KADIV role if required
    const isKadiv = await authCache.hasRole(decoded.id, 'KADIV', token);
    if (!isKadiv) {
      logger.warn({
        message: 'Authorization failed: Kadiv role required',
        path: req.path,
        requestId: req.id,
        userId: decoded.id
      });
      return res.status(403).json({
        success: false,
        message: 'Access denied. Kadiv role required.'
      });
    }
    next();
  } catch (error) {
    logger.error({
      message: `Authentication error: ${error.message}`,
      path: req.path,
      requestId: req.id
    });
    return res.status(403).json({
      success: false,
      message: 'Invalid token.'
    });
  }
};
  
module.exports = {
  authMiddleware,
  requireAuth
};