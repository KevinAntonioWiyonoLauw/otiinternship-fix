const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

prisma.$on('error', (e) => {
  console.error('Prisma Client Error:', e);
});

module.exports = prisma;