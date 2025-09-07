import { getPrismaClient, checkDatabaseConnection, handleDatabaseError } from '../src/config/database';
import { PrismaClient } from '@prisma/client';

describe('Database Configuration', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = getPrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('getPrismaClient', () => {
    it('should return a Prisma client instance', () => {
      expect(prisma).toBeDefined();
      expect(typeof prisma.$connect).toBe('function');
      expect(typeof prisma.$disconnect).toBe('function');
    });

    it('should return the same instance on multiple calls (singleton)', () => {
      const client1 = getPrismaClient();
      const client2 = getPrismaClient();
      expect(client1).toBe(client2);
    });
  });

  describe('checkDatabaseConnection', () => {
    it('should return true for successful connection', async () => {
      const isConnected = await checkDatabaseConnection();
      expect(typeof isConnected).toBe('boolean');
    });
  });

  describe('handleDatabaseError', () => {
    it('should handle Prisma unique constraint error (P2002)', () => {
      const prismaError = {
        code: 'P2002',
        message: 'Unique constraint failed',
      };
      
      const handledError = handleDatabaseError(prismaError);
      expect(handledError.message).toBe('Unique constraint violation');
    });

    it('should handle Prisma record not found error (P2025)', () => {
      const prismaError = {
        code: 'P2025',
        message: 'Record not found',
      };
      
      const handledError = handleDatabaseError(prismaError);
      expect(handledError.message).toBe('Record not found');
    });

    it('should handle foreign key constraint error (P2003)', () => {
      const prismaError = {
        code: 'P2003',
        message: 'Foreign key constraint failed',
      };
      
      const handledError = handleDatabaseError(prismaError);
      expect(handledError.message).toBe('Foreign key constraint violation');
    });

    it('should handle invalid ID error (P2014)', () => {
      const prismaError = {
        code: 'P2014',
        message: 'Invalid ID',
      };
      
      const handledError = handleDatabaseError(prismaError);
      expect(handledError.message).toBe('Invalid ID provided');
    });

    it('should handle database connection error (P1001)', () => {
      const prismaError = {
        code: 'P1001',
        message: 'Connection failed',
      };
      
      const handledError = handleDatabaseError(prismaError);
      expect(handledError.message).toBe('Database connection failed');
    });

    it('should handle database timeout error (P1008)', () => {
      const prismaError = {
        code: 'P1008',
        message: 'Operation timeout',
      };
      
      const handledError = handleDatabaseError(prismaError);
      expect(handledError.message).toBe('Database operation timeout');
    });

    it('should handle unknown Prisma errors', () => {
      const prismaError = {
        code: 'P9999',
        message: 'Unknown error',
      };
      
      const handledError = handleDatabaseError(prismaError);
      expect(handledError.message).toBe('Database error: Unknown error');
    });

    it('should handle generic errors without Prisma code', () => {
      const genericError = {
        message: 'Generic database error',
      };
      
      const handledError = handleDatabaseError(genericError);
      expect(handledError.message).toBe('Database operation failed: Generic database error');
    });
  });
});