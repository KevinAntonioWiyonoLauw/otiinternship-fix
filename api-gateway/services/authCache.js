const Redis = require('ioredis');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const logger = require('../logger');

// Redis client setup
let redis;
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

try {
  redis = new Redis(REDIS_URL, {
    password: REDIS_PASSWORD,
    keyPrefix: 'api-gateway:auth:',
    connectTimeout: 5000,
    retryStrategy: (times) => {
      if (times > 10) return null;
      return Math.min(times * 100, 3000);
    }
  });
  
  redis.on('connect', () => {
    logger.info('Redis client connected for auth caching');
  });
  
  redis.on('error', (err) => {
    logger.error(`Redis error: ${err.message}`);
  });
} catch (error) {
  logger.error(`Failed to connect to Redis: ${error.message}`);
  // Continue without Redis - fallback to direct service calls
}

// TTL constants in seconds
const JWT_CLAIMS_TTL = 15 * 60;          // 15 minutes
const USER_PERMISSIONS_TTL = 10 * 60;    // 10 minutes
const SERVICE_TOKEN_TTL = 55 * 60;       // 55 minutes

/**
 * Get cached JWT claims or decode and cache
 * @param {string} token - JWT token
 * @returns {Promise<object|null>} Decoded JWT claims
 */
const getCachedJwtClaims = async (token) => {
  try {
    // Try to get from cache first
    if (redis && redis.status === 'ready') {
      const cacheKey = `jwt:${token}`;
      const cachedClaims = await redis.get(cacheKey);
      
      if (cachedClaims) {
        logger.debug('Cache hit: JWT claims');
        return JSON.parse(cachedClaims);
      }
      logger.debug('Cache miss: JWT claims');
    }
    
    // Decode JWT
    const claims = jwt.verify(token, process.env.JWT_SECRET);
    
    // Cache the result if Redis is available
    if (redis && redis.status === 'ready' && claims) {
      const cacheKey = `jwt:${token}`;
      await redis.set(cacheKey, JSON.stringify(claims), 'EX', JWT_CLAIMS_TTL);
      logger.debug('Cached JWT claims');
    }
    
    return claims;
  } catch (error) {
    logger.error(`Error getting JWT claims: ${error.message}`);
    return null;
  }
};

/**
 * Check if token is revoked
 * @param {string} token - JWT token
 * @returns {Promise<boolean>} True if token is revoked
 */
const isTokenRevoked = async (token) => {
  try {
    if (!redis || redis.status !== 'ready') {
      // Without Redis, assume token is not revoked
      // In a production environment, you might want to call auth service directly
      return false;
    }
    
    const cacheKey = `revoked:${token}`;
    const isRevoked = await redis.exists(cacheKey);
    return isRevoked === 1;
  } catch (error) {
    logger.error(`Error checking if token is revoked: ${error.message}`);
    return false;
  }
};

/**
 * Add token to revocation list
 * @param {string} token - JWT token to revoke
 * @param {number} expiryTimestamp - Token expiry timestamp in seconds
 * @returns {Promise<boolean>} True if successful
 */
const revokeToken = async (token) => {
  try {
    if (!redis || redis.status !== 'ready') {
      logger.warn('Redis unavailable, token revocation skipped');
      return false;
    }
    
    // Decode token to get expiry
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      logger.error('Invalid token for revocation or missing expiry');
      return false;
    }
    
    // Calculate TTL in seconds
    const now = Math.floor(Date.now() / 1000);
    const ttl = decoded.exp - now;
    
    if (ttl <= 0) {
      logger.debug('Token already expired, not adding to revocation list');
      return true;
    }
    
    // Store in Redis with expiry
    const cacheKey = `revoked:${token}`;
    await redis.set(cacheKey, '1', 'EX', ttl);
    logger.info(`Token revoked until ${new Date(decoded.exp * 1000).toISOString()}`);
    
    // Also clear any cached claims for this token
    await redis.del(`jwt:${token}`);
    
    return true;
  } catch (error) {
    logger.error(`Error revoking token: ${error.message}`);
    return false;
  }
};

/**
 * Get service token with caching
 * @returns {Promise<string|null>} Service token
 */
const getServiceToken = async () => {
  try {
    // Try to get from cache first
    if (redis && redis.status === 'ready') {
      const cacheKey = 'service_token';
      const cachedToken = await redis.get(cacheKey);
      
      if (cachedToken) {
        logger.debug('Cache hit: Service token');
        return cachedToken;
      }
      logger.debug('Cache miss: Service token');
    }
    
    const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service-api:8001';
    const response = await axios.post(
      `${authServiceUrl}/api/auth/service-login`,
      {
        service_key: process.env.SERVICE_AUTH_KEY || 'api-gateway-secret-key'
      },
      {
        headers: {
          'x-service-name': 'api-gateway',
          'x-skip-rate-limit': 'true'
        },
        timeout: 5000
      }
    );
    
    if (!response.data || !response.data.token) {
      throw new Error('Failed to get service token');
    }
    
    const token = response.data.token;
    
    // Cache the result
    if (redis && redis.status === 'ready') {
      const cacheKey = 'service_token';
      await redis.set(cacheKey, token, 'EX', SERVICE_TOKEN_TTL);
      logger.debug('Cached service token');
    }
    
    return token;
  } catch (error) {
    logger.error(`Error getting service token: ${error.message}`);
    return null;
  }
};

/**
 * Get cached user permissions or fetch from auth service
 * @param {string} userId - User ID
 * @param {string} token - Auth token for service call or null to use service token
 * @returns {Promise<object>} User permissions
 */
const getUserPermissions = async (userId, token = null) => {
  try {
    // Try to get from cache first
    if (redis && redis.status === 'ready') {
      const cacheKey = `perms:${userId}`;
      const cachedPerms = await redis.get(cacheKey);
      
      if (cachedPerms) {
        logger.debug(`Cache hit: User permissions for ${userId}`);
        return JSON.parse(cachedPerms);
      }
      logger.debug(`Cache miss: User permissions for ${userId}`);
    }
    
    // Get token for service call
    const authToken = token || await getServiceToken();
    if (!authToken) {
      throw new Error('No authentication token available');
    }
    
    // Fetch from auth service
    const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service-api:8001';
    const response = await axios.get(
      `${authServiceUrl}/api/users/${userId}/divisions`,
      { 
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'x-service-name': 'api-gateway',
          'x-skip-rate-limit': 'true'
        },
        timeout: 5000
      }
    );
    
    if (!response.data || !response.data.success) {
      logger.warn(`Failed to get divisions for user ${userId}`);
      return null;
    }
    
    const divisions = response.data.divisions || [];
    
    // Calculate permissions
    const permissions = {
      divisions,
      isKadiv: divisions.some(div => div.role === 'KADIV'),
      isKadivHD: divisions.some(div => div.name === 'HD' && div.role === 'KADIV')
    };
    
    // Cache the result
    if (redis && redis.status === 'ready') {
      const cacheKey = `perms:${userId}`;
      await redis.set(cacheKey, JSON.stringify(permissions), 'EX', USER_PERMISSIONS_TTL);
      logger.debug(`Cached permissions for user ${userId}`);
    }
    
    return permissions;
  } catch (error) {
    logger.error(`Error getting user permissions: ${error.message}`);
    return null;
  }
};

/**
 * Check if user has a specific role
 * @param {string} userId - User ID
 * @param {string} role - Role to check (KADIV, STAFF, etc)
 * @param {string} token - Authorization token
 * @returns {Promise<boolean>} True if user has role
 */
const hasRole = async (userId, role, token = null) => {
  try {
    const permissions = await getUserPermissions(userId, token);
    if (!permissions) return false;
    
    if (role === 'KADIV') {
      return permissions.isKadiv;
    }
    
    if (role === 'KADIV_HD') {
      return permissions.isKadivHD;
    }
    
    // Check for specific role in any division
    return permissions.divisions.some(div => div.role === role);
  } catch (error) {
    logger.error(`Error checking user role: ${error.message}`);
    return false;
  }
};

/**
 * Check if user has a specific role in a specific division
 * @param {string} userId - User ID
 * @param {number} divisionId - Division ID
 * @param {string} role - Role to check
 * @param {string} token - Auth token
 * @returns {Promise<boolean>} True if user has role in division
 */
const hasRoleInDivision = async (userId, divisionId, role, token = null) => {
  try {
    const permissions = await getUserPermissions(userId, token);
    if (!permissions) return false;
    
    return permissions.divisions.some(div => 
      div.id === divisionId && div.role === role
    );
  } catch (error) {
    logger.error(`Error checking division role: ${error.message}`);
    return false;
  }
};

/**
 * Invalidate user permissions cache
 * @param {string} userId - User ID
 */
const invalidateUserPermissions = async (userId) => {
  try {
    if (!redis || redis.status !== 'ready') {
      logger.warn(`Redis unavailable, couldn't invalidate cache for user ${userId}`);
      return;
    }
    
    await redis.del(`perms:${userId}`);
    logger.info(`Invalidated permissions cache for user ${userId}`);
  } catch (error) {
    logger.error(`Error invalidating user permissions: ${error.message}`);
  }
};

/**
 * Invalidate cache when user logs out
 * @param {string} userId - User ID
 * @param {string} token - JWT token to revoke
 */
const handleUserLogout = async (userId, token) => {
  try {
    // Revoke the token
    await revokeToken(token);
    
    // Invalidate user permissions
    await invalidateUserPermissions(userId);
    
    logger.info(`Handled logout for user ${userId}`);
  } catch (error) {
    logger.error(`Error handling logout: ${error.message}`);
  }
};

module.exports = {
  getCachedJwtClaims,
  isTokenRevoked,
  revokeToken,
  getUserPermissions,
  hasRole,
  hasRoleInDivision,
  invalidateUserPermissions,
  handleUserLogout,
  getServiceToken
};