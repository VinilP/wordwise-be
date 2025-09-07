import { PrismaClient } from '@prisma/client';

// Database configuration interface
interface DatabaseConfig {
  url: string;
  maxConnections: number;
  connectionTimeout: number;
  queryTimeout: number;
}

// Get database configuration from environment
const getDatabaseConfig = (): DatabaseConfig => {
  const config: DatabaseConfig = {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/book_review_platform_dev',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
    queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000'),
  };

  if (!config.url) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  return config;
};

// Create Prisma client with connection pooling and error handling
const createPrismaClient = (): PrismaClient => {
  const config = getDatabaseConfig();

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: config.url,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    errorFormat: 'pretty',
  });

  return prisma;
};

// Global Prisma client instance
let prisma: PrismaClient;

// Get or create Prisma client instance (singleton pattern)
export const getPrismaClient = (): PrismaClient => {
  if (!prisma) {
    prisma = createPrismaClient();
  }
  return prisma;
};

// Database connection health check
export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    const client = getPrismaClient();
    await client.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
};

// Graceful database disconnection
export const disconnectDatabase = async (): Promise<void> => {
  try {
    if (prisma) {
      await prisma.$disconnect();
      console.log('Database disconnected successfully');
    }
  } catch (error) {
    console.error('Error disconnecting from database:', error);
  }
};

// Database error handler
export const handleDatabaseError = (error: any): Error => {
  // Prisma-specific error handling
  if (error.code) {
    switch (error.code) {
      case 'P2002':
        return new Error('Unique constraint violation');
      case 'P2025':
        return new Error('Record not found');
      case 'P2003':
        return new Error('Foreign key constraint violation');
      case 'P2014':
        return new Error('Invalid ID provided');
      case 'P1001':
        return new Error('Database connection failed');
      case 'P1008':
        return new Error('Database operation timeout');
      default:
        return new Error(`Database error: ${error.message}`);
    }
  }

  // Generic database error
  return new Error(`Database operation failed: ${error.message}`);
};

export default getPrismaClient;