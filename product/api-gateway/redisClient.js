const Redis = require('ioredis');
const logger = require('./logger');

// Connection options
const redisOptions = {
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
  
  // Add retry strategy
  retryStrategy: function(times) {
    const delay = Math.min(times * 100, 3000);
    logger.info(`Redis connection retry in ${delay}ms (attempt ${times})`);
    return delay;
  },
  
  // Add reconnect on error strategy
  reconnectOnError: function(err) {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      logger.warn(`Redis connection in READONLY mode, reconnecting`);
      return true; // reconnect when READONLY error
    }
    
    logger.error(`Redis error: ${err.message}`);
    return false; // don't reconnect for other errors
  },
  
  // Other options
  connectTimeout: 10000, // 10s
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
  enableOfflineQueue: true
};

// Create Redis client
let client = null;

// Create Redis instance with error handling
function createClient() {
  const redisClient = new Redis(redisOptions);
  
  redisClient.on('connect', () => {
    logger.info('Redis client connected');
  });
  
  redisClient.on('ready', () => {
    logger.info('Redis client ready to use');
  });
  
  redisClient.on('error', (error) => {
    logger.error(`Redis client error: ${error.message}`);
  });
  
  redisClient.on('reconnecting', () => {
    logger.info('Redis client reconnecting');
  });
  
  redisClient.on('end', () => {
    logger.info('Redis connection closed');
  });
  
  return redisClient;
}

// Get client (create if needed)
function getClient() {
  if (!client) {
    client = createClient();
  }
  return client;
}

// Get Redis client
const redisClient = getClient();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing Redis connections');
  await redisClient.quit();
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing Redis connections');
  await redisClient.quit();
});

module.exports = redisClient;