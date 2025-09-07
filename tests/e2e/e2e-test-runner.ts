// Note: This file is designed for Playwright but backend uses Jest
// For now, we'll use Jest-compatible syntax
import { PrismaClient } from '@prisma/client';
import { MetricsCollector } from '../../src/monitoring/metrics-collector';
import { HealthMonitor } from '../../src/monitoring/health-monitor';

interface E2ETestConfig {
  baseURL: string;
  apiURL: string;
  timeout: number;
  retries: number;
  parallel: boolean;
  headless: boolean;
}

interface E2ETestResult {
  testName: string;
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  error?: string;
  metrics?: {
    responseTime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
}

class E2ETestRunner {
  private prisma: PrismaClient;
  private metricsCollector: MetricsCollector;
  private healthMonitor: HealthMonitor;
  private config: E2ETestConfig;
  private results: E2ETestResult[] = [];

  constructor(config: E2ETestConfig) {
    this.config = config;
    this.prisma = new PrismaClient();
    this.metricsCollector = new MetricsCollector(this.prisma);
    this.healthMonitor = new HealthMonitor(this.prisma);
  }

  async runAllTests(): Promise<E2ETestResult[]> {
    console.log('🚀 Starting End-to-End Test Suite');
    console.log(`Configuration:`, this.config);

    // Pre-test setup
    await this.setupTestEnvironment();

    // Run test suites
    const testSuites = [
      this.runAuthenticationTests.bind(this),
      this.runBookManagementTests.bind(this),
      this.runReviewSystemTests.bind(this),
      this.runRecommendationTests.bind(this),
      this.runUserProfileTests.bind(this),
      this.runSearchAndFilterTests.bind(this),
      this.runPerformanceTests.bind(this),
      this.runAccessibilityTests.bind(this),
      this.runSecurityTests.bind(this),
    ];

    for (const testSuite of testSuites) {
      try {
        await testSuite();
      } catch (error) {
        console.error(`Test suite failed:`, error);
      }
    }

    // Post-test cleanup
    await this.cleanupTestEnvironment();

    // Generate report
    this.generateTestReport();

    return this.results;
  }

  private async setupTestEnvironment(): Promise<void> {
    console.log('🔧 Setting up test environment...');
    
    // Clean up test data
    await this.prisma.review.deleteMany();
    await this.prisma.userFavorite.deleteMany();
    await this.prisma.book.deleteMany();
    await this.prisma.user.deleteMany();

    // Seed test data
    await this.seedTestData();

    console.log('✅ Test environment ready');
  }

  private async cleanupTestEnvironment(): Promise<void> {
    console.log('🧹 Cleaning up test environment...');
    
    // Clean up test data
    await this.prisma.review.deleteMany();
    await this.prisma.userFavorite.deleteMany();
    await this.prisma.book.deleteMany();
    await this.prisma.user.deleteMany();

    await this.prisma.$disconnect();
    console.log('✅ Test environment cleaned up');
  }

  private async seedTestData(): Promise<void> {
    // Create test users
    const users = await Promise.all([
      this.prisma.user.create({
        data: {
          email: 'testuser1@example.com',
          password: 'hashedpassword1',
          name: 'Test User 1'
        }
      }),
      this.prisma.user.create({
        data: {
          email: 'testuser2@example.com',
          password: 'hashedpassword2',
          name: 'Test User 2'
        }
      })
    ]);

    // Create test books
    const books = await Promise.all([
      this.prisma.book.create({
        data: {
          title: 'The Great Gatsby',
          author: 'F. Scott Fitzgerald',
          description: 'A classic American novel about the Jazz Age.',
          genres: ['Fiction', 'Classic Literature'],
          publishedYear: 1925,
          averageRating: 4.5,
          reviewCount: 10
        }
      }),
      this.prisma.book.create({
        data: {
          title: 'To Kill a Mockingbird',
          author: 'Harper Lee',
          description: 'A novel about racial injustice in the American South.',
          genres: ['Fiction', 'Drama'],
          publishedYear: 1960,
          averageRating: 4.8,
          reviewCount: 15
        }
      }),
      this.prisma.book.create({
        data: {
          title: '1984',
          author: 'George Orwell',
          description: 'A dystopian social science fiction novel.',
          genres: ['Fiction', 'Dystopian'],
          publishedYear: 1949,
          averageRating: 4.3,
          reviewCount: 8
        }
      })
    ]);

    // Create test reviews
    for (let i = 0; i < users.length; i++) {
      for (let j = 0; j < books.length; j++) {
        await this.prisma.review.create({
          data: {
            bookId: books[j].id,
            userId: users[i].id,
            content: `Test review ${i + 1}-${j + 1}: This is a great book!`,
            rating: Math.floor(Math.random() * 5) + 1
          }
        });
      }
    }

    // Create test favorites
    await this.prisma.userFavorite.create({
      data: {
        userId: users[0].id,
        bookId: books[0].id
      }
    });
  }

  private async runAuthenticationTests(): Promise<void> {
    console.log('🔐 Running Authentication Tests...');
    
    const tests = [
      {
        name: 'User Registration',
        test: async () => {
          const response = await fetch(`${this.config.apiURL}/api/v1/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'New Test User',
              email: 'newuser@example.com',
              password: 'TestPassword123!'
            })
          });
          
          expect(response.status).toBe(201);
          const data = await response.json() as any;
          expect(data.success).toBe(true);
          expect(data.data.user).toBeDefined();
          expect(data.data.accessToken).toBeDefined();
        }
      },
      {
        name: 'User Login',
        test: async () => {
          const response = await fetch(`${this.config.apiURL}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'testuser1@example.com',
              password: 'hashedpassword1'
            })
          });
          
          expect(response.status).toBe(200);
          const data = await response.json() as any;
          expect(data.success).toBe(true);
          expect(data.data.accessToken).toBeDefined();
        }
      },
      {
        name: 'Invalid Login',
        test: async () => {
          const response = await fetch(`${this.config.apiURL}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'invalid@example.com',
              password: 'wrongpassword'
            })
          });
          
          expect(response.status).toBe(401);
        }
      }
    ];

    await this.runTestSuite('Authentication', tests);
  }

  private async runBookManagementTests(): Promise<void> {
    console.log('📚 Running Book Management Tests...');
    
    const tests = [
      {
        name: 'Get Books List',
        test: async () => {
          const response = await fetch(`${this.config.apiURL}/api/v1/books`);
          expect(response.status).toBe(200);
          const data = await response.json() as any;
          expect(data.success).toBe(true);
          expect(data.data.books).toBeDefined();
          expect(Array.isArray(data.data.books)).toBe(true);
        }
      },
      {
        name: 'Search Books',
        test: async () => {
          const response = await fetch(`${this.config.apiURL}/api/v1/books/search?q=Gatsby`);
          expect(response.status).toBe(200);
          const data = await response.json() as any;
          expect(data.success).toBe(true);
          expect(data.data.books).toBeDefined();
        }
      },
      {
        name: 'Get Book Details',
        test: async () => {
          const books = await this.prisma.book.findMany({ take: 1 });
          const bookId = books[0].id;
          
          const response = await fetch(`${this.config.apiURL}/api/v1/books/${bookId}`);
          expect(response.status).toBe(200);
          const data = await response.json() as any;
          expect(data.success).toBe(true);
          expect(data.data.book).toBeDefined();
        }
      }
    ];

    await this.runTestSuite('Book Management', tests);
  }

  private async runReviewSystemTests(): Promise<void> {
    console.log('⭐ Running Review System Tests...');
    
    const tests = [
      {
        name: 'Create Review',
        test: async () => {
          const users = await this.prisma.user.findMany({ take: 1 });
          const books = await this.prisma.book.findMany({ take: 1 });
          
          const response = await fetch(`${this.config.apiURL}/api/v1/reviews`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bookId: books[0].id,
              userId: users[0].id,
              content: 'This is a test review',
              rating: 5
            })
          });
          
          expect(response.status).toBe(201);
          const data = await response.json() as any;
          expect(data.success).toBe(true);
          expect(data.data.review).toBeDefined();
        }
      },
      {
        name: 'Get Book Reviews',
        test: async () => {
          const books = await this.prisma.book.findMany({ take: 1 });
          const bookId = books[0].id;
          
          const response = await fetch(`${this.config.apiURL}/api/v1/reviews/book/${bookId}`);
          expect(response.status).toBe(200);
          const data = await response.json() as any;
          expect(data.success).toBe(true);
          expect(data.data.reviews).toBeDefined();
        }
      }
    ];

    await this.runTestSuite('Review System', tests);
  }

  private async runRecommendationTests(): Promise<void> {
    console.log('🎯 Running Recommendation Tests...');
    
    const tests = [
      {
        name: 'Get Popular Books',
        test: async () => {
          const response = await fetch(`${this.config.apiURL}/api/v1/popular-books`);
          expect(response.status).toBe(200);
          const data = await response.json() as any;
          expect(data.success).toBe(true);
          expect(data.data.books).toBeDefined();
        }
      },
      {
        name: 'Get Recommendations',
        test: async () => {
          const users = await this.prisma.user.findMany({ take: 1 });
          const userId = users[0].id;
          
          const response = await fetch(`${this.config.apiURL}/api/v1/recommendations/${userId}`);
          expect(response.status).toBe(200);
          const data = await response.json() as any;
          expect(data.success).toBe(true);
        }
      }
    ];

    await this.runTestSuite('Recommendations', tests);
  }

  private async runUserProfileTests(): Promise<void> {
    console.log('👤 Running User Profile Tests...');
    
    const tests = [
      {
        name: 'Get User Profile',
        test: async () => {
          const users = await this.prisma.user.findMany({ take: 1 });
          const userId = users[0].id;
          
          const response = await fetch(`${this.config.apiURL}/api/v1/users/${userId}`);
          expect(response.status).toBe(200);
          const data = await response.json() as any;
          expect(data.success).toBe(true);
          expect(data.data.user).toBeDefined();
        }
      },
      {
        name: 'Get User Reviews',
        test: async () => {
          const users = await this.prisma.user.findMany({ take: 1 });
          const userId = users[0].id;
          
          const response = await fetch(`${this.config.apiURL}/api/v1/reviews/user/${userId}`);
          expect(response.status).toBe(200);
          const data = await response.json() as any;
          expect(data.success).toBe(true);
          expect(data.data.reviews).toBeDefined();
        }
      }
    ];

    await this.runTestSuite('User Profile', tests);
  }

  private async runSearchAndFilterTests(): Promise<void> {
    console.log('🔍 Running Search and Filter Tests...');
    
    const tests = [
      {
        name: 'Search by Title',
        test: async () => {
          const response = await fetch(`${this.config.apiURL}/api/v1/books/search?q=Gatsby`);
          expect(response.status).toBe(200);
          const data = await response.json() as any;
          expect(data.success).toBe(true);
        }
      },
      {
        name: 'Search by Author',
        test: async () => {
          const response = await fetch(`${this.config.apiURL}/api/v1/books/search?q=Fitzgerald`);
          expect(response.status).toBe(200);
          const data = await response.json() as any;
          expect(data.success).toBe(true);
        }
      },
      {
        name: 'Filter by Genre',
        test: async () => {
          const response = await fetch(`${this.config.apiURL}/api/v1/books?genre=Fiction`);
          expect(response.status).toBe(200);
          const data = await response.json() as any;
          expect(data.success).toBe(true);
        }
      }
    ];

    await this.runTestSuite('Search and Filter', tests);
  }

  private async runPerformanceTests(): Promise<void> {
    console.log('⚡ Running Performance Tests...');
    
    const tests = [
      {
        name: 'API Response Time',
        test: async () => {
          const startTime = Date.now();
          const response = await fetch(`${this.config.apiURL}/api/v1/books`);
          const endTime = Date.now();
          
          expect(response.status).toBe(200);
          expect(endTime - startTime).toBeLessThan(2000); // Less than 2 seconds
        }
      },
      {
        name: 'Database Query Performance',
        test: async () => {
          const startTime = Date.now();
          await this.prisma.book.findMany({
            include: {
              reviews: true,
              _count: { select: { reviews: true } }
            }
          });
          const endTime = Date.now();
          
          expect(endTime - startTime).toBeLessThan(1000); // Less than 1 second
        }
      }
    ];

    await this.runTestSuite('Performance', tests);
  }

  private async runAccessibilityTests(): Promise<void> {
    console.log('♿ Running Accessibility Tests...');
    
    const tests = [
      {
        name: 'API Accessibility Headers',
        test: async () => {
          const response = await fetch(`${this.config.apiURL}/api/v1/books`);
          expect(response.status).toBe(200);
          // Check for CORS headers
          expect(response.headers.get('access-control-allow-origin')).toBeDefined();
        }
      }
    ];

    await this.runTestSuite('Accessibility', tests);
  }

  private async runSecurityTests(): Promise<void> {
    console.log('🔒 Running Security Tests...');
    
    const tests = [
      {
        name: 'SQL Injection Protection',
        test: async () => {
          const maliciousQuery = "'; DROP TABLE books; --";
          const response = await fetch(`${this.config.apiURL}/api/v1/books/search?q=${encodeURIComponent(maliciousQuery)}`);
          expect(response.status).toBe(200);
          // Should not crash or return error
        }
      },
      {
        name: 'Input Validation',
        test: async () => {
          const response = await fetch(`${this.config.apiURL}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'invalid-email',
              password: '123'
            })
          });
          expect(response.status).toBe(400);
        }
      }
    ];

    await this.runTestSuite('Security', tests);
  }

  private async runTestSuite(suiteName: string, tests: Array<{ name: string; test: () => Promise<void> }>): Promise<void> {
    for (const test of tests) {
      await this.runSingleTest(`${suiteName} - ${test.name}`, test.test);
    }
  }

  private async runSingleTest(testName: string, testFunction: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    let status: 'pass' | 'fail' | 'skip' = 'pass';
    let error: string | undefined;

    try {
      await testFunction();
    } catch (err) {
      status = 'fail';
      error = err instanceof Error ? err.message : String(err);
    }

    const duration = Date.now() - startTime;
    
    // Collect metrics
    const metrics = await this.metricsCollector.collectMetrics();
    
    const result: E2ETestResult = {
      testName,
      status,
      duration,
      error,
      metrics: {
        responseTime: metrics.application.responseTime,
        memoryUsage: metrics.memory.percentage,
        cpuUsage: metrics.cpu.usage,
      }
    };

    this.results.push(result);
    
    const statusIcon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⏭️';
    console.log(`${statusIcon} ${testName} (${duration}ms)`);
    
    if (error) {
      console.log(`   Error: ${error}`);
    }
  }

  private generateTestReport(): void {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.status === 'pass').length;
    const failedTests = this.results.filter(r => r.status === 'fail').length;
    const skippedTests = this.results.filter(r => r.status === 'skip').length;
    
    const passRate = (passedTests / totalTests) * 100;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    const averageDuration = totalDuration / totalTests;

    console.log('\n📊 E2E Test Report');
    console.log('==================');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} (${passRate.toFixed(1)}%)`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Skipped: ${skippedTests}`);
    console.log(`Total Duration: ${totalDuration}ms`);
    console.log(`Average Duration: ${averageDuration.toFixed(1)}ms`);

    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => r.status === 'fail')
        .forEach(r => console.log(`  - ${r.testName}: ${r.error}`));
    }

    // Performance summary
    const avgResponseTime = this.results
      .filter(r => r.metrics)
      .reduce((sum, r) => sum + (r.metrics?.responseTime || 0), 0) / 
      this.results.filter(r => r.metrics).length;

    const avgMemoryUsage = this.results
      .filter(r => r.metrics)
      .reduce((sum, r) => sum + (r.metrics?.memoryUsage || 0), 0) / 
      this.results.filter(r => r.metrics).length;

    const avgCpuUsage = this.results
      .filter(r => r.metrics)
      .reduce((sum, r) => sum + (r.metrics?.cpuUsage || 0), 0) / 
      this.results.filter(r => r.metrics).length;

    console.log('\n📈 Performance Summary:');
    console.log(`Average Response Time: ${avgResponseTime.toFixed(1)}ms`);
    console.log(`Average Memory Usage: ${avgMemoryUsage.toFixed(1)}%`);
    console.log(`Average CPU Usage: ${avgCpuUsage.toFixed(1)}%`);
  }
}

// Export for use in test files
export { E2ETestRunner, E2ETestConfig, E2ETestResult };
