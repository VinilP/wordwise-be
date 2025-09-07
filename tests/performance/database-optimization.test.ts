import { PrismaClient } from '@prisma/client';
import { performance } from 'perf_hooks';

interface QueryPerformanceMetrics {
  queryName: string;
  executionTime: number;
  resultCount: number;
  memoryUsage: number;
  cacheHitRate?: number;
}

interface DatabaseOptimizationResult {
  totalQueries: number;
  averageExecutionTime: number;
  slowestQuery: QueryPerformanceMetrics;
  fastestQuery: QueryPerformanceMetrics;
  totalExecutionTime: number;
  recommendations: string[];
}

class DatabaseOptimizer {
  private prisma: PrismaClient;
  private queryMetrics: QueryPerformanceMetrics[] = [];

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async measureQueryPerformance(
    queryName: string,
    queryFunction: () => Promise<any>
  ): Promise<QueryPerformanceMetrics> {
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;
    
    try {
      const result = await queryFunction();
      const endTime = performance.now();
      const endMemory = process.memoryUsage().heapUsed;
      
      const executionTime = endTime - startTime;
      const memoryUsage = endMemory - startMemory;
      const resultCount = Array.isArray(result) ? result.length : 1;
      
      const metrics: QueryPerformanceMetrics = {
        queryName,
        executionTime,
        resultCount,
        memoryUsage,
      };
      
      this.queryMetrics.push(metrics);
      return metrics;
    } catch (error) {
      throw new Error(`Query ${queryName} failed: ${error}`);
    }
  }

  async analyzePerformance(): Promise<DatabaseOptimizationResult> {
    if (this.queryMetrics.length === 0) {
      throw new Error('No query metrics available for analysis');
    }

    const totalQueries = this.queryMetrics.length;
    const totalExecutionTime = this.queryMetrics.reduce((sum, m) => sum + m.executionTime, 0);
    const averageExecutionTime = totalExecutionTime / totalQueries;
    
    const slowestQuery = this.queryMetrics.reduce((slowest, current) => 
      current.executionTime > slowest.executionTime ? current : slowest
    );
    
    const fastestQuery = this.queryMetrics.reduce((fastest, current) => 
      current.executionTime < fastest.executionTime ? current : fastest
    );

    const recommendations = this.generateRecommendations();

    return {
      totalQueries,
      averageExecutionTime,
      slowestQuery,
      fastestQuery,
      totalExecutionTime,
      recommendations,
    };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    // Analyze slow queries
    const slowQueries = this.queryMetrics.filter(m => m.executionTime > 1000);
    if (slowQueries.length > 0) {
      recommendations.push(`Found ${slowQueries.length} slow queries (>1s). Consider adding indexes or optimizing queries.`);
    }

    // Analyze memory usage
    const highMemoryQueries = this.queryMetrics.filter(m => m.memoryUsage > 10 * 1024 * 1024); // >10MB
    if (highMemoryQueries.length > 0) {
      recommendations.push(`Found ${highMemoryQueries.length} queries with high memory usage (>10MB). Consider pagination or query optimization.`);
    }

    // Analyze result counts
    const largeResultQueries = this.queryMetrics.filter(m => m.resultCount > 1000);
    if (largeResultQueries.length > 0) {
      recommendations.push(`Found ${largeResultQueries.length} queries returning large result sets (>1000 records). Consider implementing pagination.`);
    }

    // General recommendations
    recommendations.push('Consider implementing query result caching for frequently accessed data.');
    recommendations.push('Review database indexes for frequently queried columns.');
    recommendations.push('Consider using database connection pooling for better performance.');

    return recommendations;
  }

  clearMetrics(): void {
    this.queryMetrics = [];
  }
}

describe('Database Optimization Tests', () => {
  let prisma: PrismaClient;
  let optimizer: DatabaseOptimizer;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
    optimizer = new DatabaseOptimizer(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up test data
    await prisma.review.deleteMany();
    await prisma.userFavorite.deleteMany();
    await prisma.book.deleteMany();
    await prisma.user.deleteMany();
    
    // Seed test data
    await seedTestData(prisma);
    optimizer.clearMetrics();
  });

  describe('Book Queries Optimization', () => {
    test('should optimize book listing query', async () => {
      const metrics = await optimizer.measureQueryPerformance(
        'getBooks',
        () => prisma.book.findMany({
          take: 20,
          skip: 0,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: { reviews: true }
            }
          }
        })
      );

      expect(metrics.executionTime).toBeLessThan(500); // < 500ms
      expect(metrics.resultCount).toBeGreaterThan(0);
      expect(metrics.memoryUsage).toBeLessThan(5 * 1024 * 1024); // < 5MB
    });

    test('should optimize book search query', async () => {
      const searchTerm = 'test';
      
      const metrics = await optimizer.measureQueryPerformance(
        'searchBooks',
        () => prisma.book.findMany({
          where: {
            OR: [
              { title: { contains: searchTerm, mode: 'insensitive' } },
              { author: { contains: searchTerm, mode: 'insensitive' } },
              { description: { contains: searchTerm, mode: 'insensitive' } }
            ]
          },
          take: 20,
          orderBy: { averageRating: 'desc' }
        })
      );

      expect(metrics.executionTime).toBeLessThan(1000); // < 1s
      expect(metrics.memoryUsage).toBeLessThan(10 * 1024 * 1024); // < 10MB
    });

    test('should optimize book detail query', async () => {
      const book = await prisma.book.findFirst();
      if (!book) throw new Error('No test book found');

      const metrics = await optimizer.measureQueryPerformance(
        'getBookById',
        () => prisma.book.findUnique({
          where: { id: book.id },
          include: {
            reviews: {
              include: {
                user: {
                  select: { name: true, email: true }
                }
              },
              orderBy: { createdAt: 'desc' },
              take: 10
            },
            _count: {
              select: { reviews: true, favorites: true }
            }
          }
        })
      );

      expect(metrics.executionTime).toBeLessThan(300); // < 300ms
      expect(metrics.resultCount).toBe(1);
    });

    test('should optimize popular books query', async () => {
      const metrics = await optimizer.measureQueryPerformance(
        'getPopularBooks',
        () => prisma.book.findMany({
          where: {
            reviewCount: { gte: 1 },
            averageRating: { gte: 4.0 }
          },
          orderBy: [
            { reviewCount: 'desc' },
            { averageRating: 'desc' }
          ],
          take: 10
        })
      );

      expect(metrics.executionTime).toBeLessThan(500); // < 500ms
      expect(metrics.resultCount).toBeGreaterThan(0);
    });
  });

  describe('Review Queries Optimization', () => {
    test('should optimize review listing query', async () => {
      const metrics = await optimizer.measureQueryPerformance(
        'getReviews',
        () => prisma.review.findMany({
          include: {
            book: {
              select: { title: true, author: true, coverImageUrl: true }
            },
            user: {
              select: { name: true, email: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 20
        })
      );

      expect(metrics.executionTime).toBeLessThan(800); // < 800ms
      expect(metrics.memoryUsage).toBeLessThan(8 * 1024 * 1024); // < 8MB
    });

    test('should optimize user reviews query', async () => {
      const user = await prisma.user.findFirst();
      if (!user) throw new Error('No test user found');

      const metrics = await optimizer.measureQueryPerformance(
        'getUserReviews',
        () => prisma.review.findMany({
          where: { userId: user.id },
          include: {
            book: {
              select: { title: true, author: true, coverImageUrl: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        })
      );

      expect(metrics.executionTime).toBeLessThan(600); // < 600ms
    });

    test('should optimize book reviews query', async () => {
      const book = await prisma.book.findFirst();
      if (!book) throw new Error('No test book found');

      const metrics = await optimizer.measureQueryPerformance(
        'getBookReviews',
        () => prisma.review.findMany({
          where: { bookId: book.id },
          include: {
            user: {
              select: { name: true, email: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 50
        })
      );

      expect(metrics.executionTime).toBeLessThan(400); // < 400ms
    });
  });

  describe('User Queries Optimization', () => {
    test('should optimize user profile query', async () => {
      const user = await prisma.user.findFirst();
      if (!user) throw new Error('No test user found');

      const metrics = await optimizer.measureQueryPerformance(
        'getUserProfile',
        () => prisma.user.findUnique({
          where: { id: user.id },
          include: {
            reviews: {
              include: {
                book: {
                  select: { title: true, author: true, coverImageUrl: true }
                }
              },
              orderBy: { createdAt: 'desc' },
              take: 10
            },
            favorites: {
              include: {
                book: {
                  select: { title: true, author: true, coverImageUrl: true }
                }
              },
              orderBy: { createdAt: 'desc' },
              take: 10
            }
          }
        })
      );

      expect(metrics.executionTime).toBeLessThan(700); // < 700ms
      expect(metrics.resultCount).toBe(1);
    });

    test('should optimize user favorites query', async () => {
      const user = await prisma.user.findFirst();
      if (!user) throw new Error('No test user found');

      const metrics = await optimizer.measureQueryPerformance(
        'getUserFavorites',
        () => prisma.userFavorite.findMany({
          where: { userId: user.id },
          include: {
            book: {
              select: { title: true, author: true, coverImageUrl: true, averageRating: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        })
      );

      expect(metrics.executionTime).toBeLessThan(500); // < 500ms
    });
  });

  describe('Complex Queries Optimization', () => {
    test('should optimize rating aggregation query', async () => {
      const book = await prisma.book.findFirst();
      if (!book) throw new Error('No test book found');

      const metrics = await optimizer.measureQueryPerformance(
        'calculateBookRating',
        () => prisma.review.aggregate({
          where: { bookId: book.id },
          _avg: { rating: true },
          _count: { rating: true }
        })
      );

      expect(metrics.executionTime).toBeLessThan(200); // < 200ms
    });

    test('should optimize genre statistics query', async () => {
      const metrics = await optimizer.measureQueryPerformance(
        'getGenreStatistics',
        () => prisma.book.groupBy({
          by: ['genres'],
          _count: { id: true },
          _avg: { averageRating: true }
        })
      );

      expect(metrics.executionTime).toBeLessThan(1000); // < 1s
    });

    test('should optimize recommendation query', async () => {
      const user = await prisma.user.findFirst();
      if (!user) throw new Error('No test user found');

      const metrics = await optimizer.measureQueryPerformance(
        'getRecommendations',
        () => prisma.book.findMany({
          where: {
            AND: [
              { averageRating: { gte: 4.0 } },
              { reviewCount: { gte: 5 } },
              {
                NOT: {
                  favorites: {
                    some: { userId: user.id }
                  }
                }
              }
            ]
          },
          orderBy: [
            { averageRating: 'desc' },
            { reviewCount: 'desc' }
          ],
          take: 20
        })
      );

      expect(metrics.executionTime).toBeLessThan(1500); // < 1.5s
    });
  });

  describe('Database Performance Analysis', () => {
    test('should analyze overall database performance', async () => {
      // Run multiple queries to get comprehensive metrics
      const queries = [
        {
          name: 'book_query',
          query: () => prisma.book.findMany({ take: 20 })
        },
        {
          name: 'review_query',
          query: () => prisma.review.findMany({ take: 20 })
        },
        {
          name: 'user_query',
          query: () => prisma.user.findMany({ take: 20 })
        },
        {
          name: 'book_rating_query', 
          query: () => prisma.book.findMany({ where: { averageRating: { gte: 4.0 } } })
        },
        {
          name: 'review_groupby_query',
          query: () => prisma.review.groupBy({ by: ['rating'], _count: { id: true } })
        }
      ];

      for (const { name, query } of queries) {
        await optimizer.measureQueryPerformance(name, query);
      }

      const analysis = await optimizer.analyzePerformance();

      expect(analysis.totalQueries).toBe(queries.length);
      expect(analysis.averageExecutionTime).toBeLessThan(1000); // < 1s average
      expect(analysis.recommendations.length).toBeGreaterThan(0);

      console.log('Database Performance Analysis:', analysis);
    });

    test('should identify slow queries', async () => {
      // Intentionally create a slow query
      const metrics = await optimizer.measureQueryPerformance(
        'slowQuery',
        () => prisma.book.findMany({
          where: {
            OR: [
              { title: { contains: 'a' } },
              { title: { contains: 'e' } },
              { title: { contains: 'i' } },
              { title: { contains: 'o' } },
              { title: { contains: 'u' } }
            ]
          }
        })
      );

      const analysis = await optimizer.analyzePerformance();
      const slowQueries = analysis.recommendations.filter(r => r.includes('slow queries'));
      
      if (metrics.executionTime > 1000) {
        expect(slowQueries.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Index Optimization Tests', () => {
    test('should verify book title index performance', async () => {
      const metrics = await optimizer.measureQueryPerformance(
        'bookTitleIndex',
        () => prisma.book.findMany({
          where: { title: { contains: 'test' } },
          orderBy: { title: 'asc' }
        })
      );

      // With proper indexing, this should be fast
      expect(metrics.executionTime).toBeLessThan(200); // < 200ms
    });

    test('should verify book author index performance', async () => {
      const metrics = await optimizer.measureQueryPerformance(
        'bookAuthorIndex',
        () => prisma.book.findMany({
          where: { author: { contains: 'test' } },
          orderBy: { author: 'asc' }
        })
      );

      expect(metrics.executionTime).toBeLessThan(200); // < 200ms
    });

    test('should verify review composite index performance', async () => {
      const metrics = await optimizer.measureQueryPerformance(
        'reviewCompositeIndex',
        () => prisma.review.findMany({
          where: {
            bookId: { not: '' },
            userId: { not: '' }
          },
          orderBy: { createdAt: 'desc' }
        })
      );

      expect(metrics.executionTime).toBeLessThan(300); // < 300ms
    });
  });
});

// Helper function to seed test data
async function seedTestData(prisma: PrismaClient): Promise<void> {
  // Create test users
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'test1@example.com',
        password: 'hashedpassword1',
        name: 'Test User 1'
      }
    }),
    prisma.user.create({
      data: {
        email: 'test2@example.com',
        password: 'hashedpassword2',
        name: 'Test User 2'
      }
    }),
    prisma.user.create({
      data: {
        email: 'test3@example.com',
        password: 'hashedpassword3',
        name: 'Test User 3'
      }
    })
  ]);

  // Create test books
  const books = await Promise.all([
    prisma.book.create({
      data: {
        title: 'Test Book 1',
        author: 'Test Author 1',
        description: 'Test description 1',
        genres: ['Fiction', 'Mystery'],
        publishedYear: 2020,
        averageRating: 4.5,
        reviewCount: 10
      }
    }),
    prisma.book.create({
      data: {
        title: 'Test Book 2',
        author: 'Test Author 2',
        description: 'Test description 2',
        genres: ['Romance', 'Drama'],
        publishedYear: 2021,
        averageRating: 3.8,
        reviewCount: 5
      }
    }),
    prisma.book.create({
      data: {
        title: 'Test Book 3',
        author: 'Test Author 3',
        description: 'Test description 3',
        genres: ['Sci-Fi', 'Fantasy'],
        publishedYear: 2022,
        averageRating: 4.2,
        reviewCount: 8
      }
    })
  ]);

  // Create test reviews
  for (let i = 0; i < users.length; i++) {
    for (let j = 0; j < books.length; j++) {
      await prisma.review.create({
        data: {
          bookId: books[j].id,
          userId: users[i].id,
          content: `Test review ${i}-${j}`,
          rating: Math.floor(Math.random() * 5) + 1
        }
      });
    }
  }

  // Create test favorites
  await prisma.userFavorite.create({
    data: {
      userId: users[0].id,
      bookId: books[0].id
    }
  });

  await prisma.userFavorite.create({
    data: {
      userId: users[0].id,
      bookId: books[1].id
    }
  });
}
