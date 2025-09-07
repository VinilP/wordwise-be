import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

let prisma: PrismaClient | undefined;

export const setupTestDatabase = async (): Promise<PrismaClient> => {
  if (!prisma) {
    // Create a new Prisma client for testing
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

    // Connect to the database
    await prisma.$connect();

    // Run migrations to ensure the test database schema is up to date
    try {
      execSync('npx prisma migrate deploy', {
        env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
        stdio: 'pipe',
      });
    } catch (error) {
      console.warn('Migration failed, continuing with existing schema');
    }
  }

  return prisma;
};

export const cleanupTestDatabase = async (): Promise<void> => {
  if (prisma) {
    // Clean up all tables in reverse dependency order to avoid foreign key constraints
    await prisma.review.deleteMany();
    await prisma.userFavorite.deleteMany();
    await prisma.book.deleteMany();
    await prisma.user.deleteMany();
    
    // Reset auto-increment sequences if using PostgreSQL
    if (process.env.DATABASE_URL?.includes('postgresql')) {
      try {
        await prisma.$executeRaw`ALTER SEQUENCE "User_id_seq" RESTART WITH 1`;
        await prisma.$executeRaw`ALTER SEQUENCE "Book_id_seq" RESTART WITH 1`;
        await prisma.$executeRaw`ALTER SEQUENCE "Review_id_seq" RESTART WITH 1`;
      } catch (error) {
        // Sequences might not exist or have different names, ignore the error
        console.warn('Could not reset sequences:', error);
      }
    }
  }
};

export const teardownTestDatabase = async (): Promise<void> => {
  if (prisma) {
    await cleanupTestDatabase();
    await prisma.$disconnect();
  }
};

export const getTestPrismaClient = (): PrismaClient => {
  if (!prisma) {
    // Initialize if not already done
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }
  return prisma;
};

// Helper function to create test data
export const createTestUser = async (overrides: Partial<any> = {}) => {
  const prisma = getTestPrismaClient();
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(7);
  
  return await prisma.user.create({
    data: {
      email: `test-${timestamp}-${randomId}@example.com`,
      password: overrides.password || '$2a$10$hashedpassword', // bcrypt hash for 'password123'
      name: 'Test User',
      ...overrides,
    },
  });
};

export const createTestBook = async (overrides: Partial<any> = {}) => {
  const prisma = getTestPrismaClient();
  return await prisma.book.create({
    data: {
      title: 'Test Book',
      author: 'Test Author',
      description: 'A test book description',
      coverImageUrl: 'https://example.com/cover.jpg',
      genres: ['Fiction'],
      publishedYear: 2023,
      averageRating: 0,
      reviewCount: 0,
      ...overrides,
    },
  });
};

export const createTestReview = async (userId: string, bookId: string, overrides: Partial<any> = {}) => {
  const prisma = getTestPrismaClient();
  return await prisma.review.create({
    data: {
      userId,
      bookId,
      content: 'Great book!',
      rating: 5,
      ...overrides,
    },
  });
};