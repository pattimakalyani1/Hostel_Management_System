const { PrismaClient } = require('@prisma/client');

// Singleton Prisma client to avoid exhausting Supabase connection pool
const prisma = global.__prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

module.exports = prisma;
