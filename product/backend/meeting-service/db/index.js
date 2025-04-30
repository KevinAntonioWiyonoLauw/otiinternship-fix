const { PrismaClient } = require('@prisma/client');

const logger = require('../internal/logger');

// Set timezone globally for Node.js app
process.env.TZ = 'Asia/Jakarta';

// Create Prisma client
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
  datasources: {
    db: {
      url: process.env.DB_URL,
    },
  },
});

// Add better error handling
prisma.$on('error', (e) => {
  logger.error(`Prisma Client Error: ${e.message}`);
});

// Graceful shutdown handling
process.on('SIGINT', async () => {
  logger.info('Closing database connections...');
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = prisma;