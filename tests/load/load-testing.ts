import { performance } from 'perf_hooks';
import axios from 'axios';

interface LoadTestConfig {
  concurrentUsers: number;
  duration: number; // in seconds
  rampUpTime: number; // in seconds
  targetRPS: number; // requests per second
}

interface LoadTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number; // requests per second
  errorRate: number;
  responseTimes: number[];
}

class LoadTester {
  private responseTimes: number[] = [];
  private successfulRequests: number = 0;
  private failedRequests: number = 0;
  private startTime: number = 0;
  private endTime: number = 0;

  async runLoadTest(
    config: LoadTestConfig,
    testFunction: () => Promise<void>
  ): Promise<LoadTestResult> {
    this.startTime = performance.now();
    const promises: Promise<void>[] = [];
    
    // Create concurrent users
    for (let i = 0; i < config.concurrentUsers; i++) {
      const delay = (i / config.concurrentUsers) * config.rampUpTime * 1000;
      promises.push(this.delayedExecution(delay, testFunction));
    }

    // Wait for all requests to complete
    await Promise.all(promises);
    
    this.endTime = performance.now();
    return this.calculateResults();
  }

  private async delayedExecution(delay: number, testFunction: () => Promise<void>): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, delay));
    await testFunction();
  }

  private calculateResults(): LoadTestResult {
    const duration = (this.endTime - this.startTime) / 1000;
    const totalRequests = this.successfulRequests + this.failedRequests;
    
    this.responseTimes.sort((a, b) => a - b);
    
    const averageResponseTime = this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
    const p95ResponseTime = this.responseTimes[Math.floor(this.responseTimes.length * 0.95)];
    const p99ResponseTime = this.responseTimes[Math.floor(this.responseTimes.length * 0.99)];
    
    return {
      totalRequests,
      successfulRequests: this.successfulRequests,
      failedRequests: this.failedRequests,
      averageResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      throughput: totalRequests / duration,
      errorRate: (this.failedRequests / totalRequests) * 100,
      responseTimes: this.responseTimes,
    };
  }

  recordRequest(success: boolean, responseTime: number): void {
    this.responseTimes.push(responseTime);
    if (success) {
      this.successfulRequests++;
    } else {
      this.failedRequests++;
    }
  }
}

// Load test configurations
const loadTestConfigs: LoadTestConfig[] = [
  { concurrentUsers: 10, duration: 30, rampUpTime: 5, targetRPS: 5 },
  { concurrentUsers: 50, duration: 60, rampUpTime: 10, targetRPS: 25 },
  { concurrentUsers: 100, duration: 120, rampUpTime: 20, targetRPS: 50 },
  { concurrentUsers: 200, duration: 180, rampUpTime: 30, targetRPS: 100 },
];

describe('Load Testing Suite', () => {
  let loadTester: LoadTester;
  const baseURL = process.env.API_BASE_URL || 'http://localhost:3000';

  beforeEach(() => {
    loadTester = new LoadTester();
  });

  test('API Health Check Load Test', async () => {
    const config = loadTestConfigs[0];
    
    const testFunction = async () => {
      const startTime = performance.now();
      try {
        const response = await axios.get(`${baseURL}/health`);
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        loadTester.recordRequest(response.status === 200, responseTime);
        expect(response.status).toBe(200);
      } catch (error) {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        loadTester.recordRequest(false, responseTime);
        throw error;
      }
    };

    const result = await loadTester.runLoadTest(config, testFunction);
    
    // Assertions for health check load test
    expect(result.errorRate).toBeLessThan(1); // Less than 1% error rate
    expect(result.averageResponseTime).toBeLessThan(1000); // Less than 1 second
    expect(result.p95ResponseTime).toBeLessThan(2000); // P95 less than 2 seconds
    expect(result.throughput).toBeGreaterThan(config.targetRPS * 0.8); // At least 80% of target RPS
    
    console.log('Health Check Load Test Results:', result);
  });

  test('Books API Load Test', async () => {
    const config = loadTestConfigs[1];
    
    const testFunction = async () => {
      const startTime = performance.now();
      try {
        const response = await axios.get(`${baseURL}/api/v1/books`);
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        loadTester.recordRequest(response.status === 200, responseTime);
        expect(response.status).toBe(200);
        
        const data = response.data;
        expect(data.success).toBe(true);
        expect(data.data.books).toBeDefined();
      } catch (error) {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        loadTester.recordRequest(false, responseTime);
        throw error;
      }
    };

    const result = await loadTester.runLoadTest(config, testFunction);
    
    // Assertions for books API load test
    expect(result.errorRate).toBeLessThan(5); // Less than 5% error rate
    expect(result.averageResponseTime).toBeLessThan(2000); // Less than 2 seconds
    expect(result.p95ResponseTime).toBeLessThan(5000); // P95 less than 5 seconds
    expect(result.throughput).toBeGreaterThan(config.targetRPS * 0.7); // At least 70% of target RPS
    
    console.log('Books API Load Test Results:', result);
  });

  test('Search API Load Test', async () => {
    const config = loadTestConfigs[1];
    const searchTerms = ['fiction', 'mystery', 'romance', 'sci-fi', 'fantasy'];
    
    const testFunction = async () => {
      const startTime = performance.now();
      const searchTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];
      
      try {
        const response = await axios.get(`${baseURL}/api/v1/books/search?q=${searchTerm}`);
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        loadTester.recordRequest(response.status === 200, responseTime);
        expect(response.status).toBe(200);
        
        const data = response.data;
        expect(data.success).toBe(true);
      } catch (error) {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        loadTester.recordRequest(false, responseTime);
        throw error;
      }
    };

    const result = await loadTester.runLoadTest(config, testFunction);
    
    // Assertions for search API load test
    expect(result.errorRate).toBeLessThan(5);
    expect(result.averageResponseTime).toBeLessThan(3000); // Search can be slower
    expect(result.p95ResponseTime).toBeLessThan(8000);
    expect(result.throughput).toBeGreaterThan(config.targetRPS * 0.6);
    
    console.log('Search API Load Test Results:', result);
  });

  test('Authentication Load Test', async () => {
    const config = loadTestConfigs[0];
    
    const testFunction = async () => {
      const startTime = performance.now();
      const userEmail = `test${Math.random()}@example.com`;
      
      try {
        // Test registration
        const registerResponse = await axios.post(`${baseURL}/api/v1/auth/register`, {
          name: 'Test User',
          email: userEmail,
          password: 'TestPassword123!',
        });
        
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        loadTester.recordRequest(registerResponse.status === 201, responseTime);
        expect(registerResponse.status).toBe(201);
        
        const data = registerResponse.data;
        expect(data.success).toBe(true);
        expect(data.data.accessToken).toBeDefined();
      } catch (error) {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        loadTester.recordRequest(false, responseTime);
        throw error;
      }
    };

    const result = await loadTester.runLoadTest(config, testFunction);
    
    // Assertions for authentication load test
    expect(result.errorRate).toBeLessThan(10); // Auth can have higher error rate due to duplicates
    expect(result.averageResponseTime).toBeLessThan(3000);
    expect(result.p95ResponseTime).toBeLessThan(6000);
    
    console.log('Authentication Load Test Results:', result);
  });

  test('Database Connection Load Test', async () => {
    const config = loadTestConfigs[2];
    
    const testFunction = async () => {
      const startTime = performance.now();
      
      try {
        // Test a database-intensive operation
        const response = await axios.get(`${baseURL}/api/v1/books?page=1&limit=50`);
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        loadTester.recordRequest(response.status === 200, responseTime);
        expect(response.status).toBe(200);
        
        const data = response.data;
        expect(data.success).toBe(true);
        expect(data.data.books).toBeDefined();
      } catch (error) {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        loadTester.recordRequest(false, responseTime);
        throw error;
      }
    };

    const result = await loadTester.runLoadTest(config, testFunction);
    
    // Assertions for database load test
    expect(result.errorRate).toBeLessThan(5);
    expect(result.averageResponseTime).toBeLessThan(5000); // Database operations can be slower
    expect(result.p95ResponseTime).toBeLessThan(10000);
    expect(result.throughput).toBeGreaterThan(config.targetRPS * 0.5);
    
    console.log('Database Connection Load Test Results:', result);
  });

  test('Memory and Resource Usage Test', async () => {
    const config = { concurrentUsers: 50, duration: 60, rampUpTime: 10, targetRPS: 25 };
    const memoryUsage: number[] = [];
    
    const testFunction = async () => {
      const startTime = performance.now();
      
      try {
        // Monitor memory usage
        const memUsage = process.memoryUsage();
        memoryUsage.push(memUsage.heapUsed / 1024 / 1024); // MB
        
        const response = await axios.get(`${baseURL}/api/v1/books`);
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        loadTester.recordRequest(response.status === 200, responseTime);
        expect(response.status).toBe(200);
      } catch (error) {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        loadTester.recordRequest(false, responseTime);
        throw error;
      }
    };

    const result = await loadTester.runLoadTest(config, testFunction);
    
    // Calculate memory statistics
    const avgMemory = memoryUsage.reduce((a, b) => a + b, 0) / memoryUsage.length;
    const maxMemory = Math.max(...memoryUsage);
    const minMemory = Math.min(...memoryUsage);
    
    // Assertions for memory usage
    expect(maxMemory).toBeLessThan(500); // Less than 500MB peak memory
    expect(avgMemory).toBeLessThan(200); // Less than 200MB average memory
    expect(result.errorRate).toBeLessThan(5);
    
    console.log('Memory Usage Test Results:', {
      ...result,
      memoryStats: {
        average: avgMemory,
        maximum: maxMemory,
        minimum: minMemory,
      },
    });
  });

  test('Concurrent User Session Test', async () => {
    const config = loadTestConfigs[1];
    const userSessions: string[] = [];
    
    const testFunction = async () => {
      const startTime = performance.now();
      
      try {
        // Create a user session
        const registerResponse = await axios.post(`${baseURL}/api/v1/auth/register`, {
          name: `User ${Math.random()}`,
          email: `user${Math.random()}@example.com`,
          password: 'TestPassword123!',
        });
        
        if (registerResponse.status === 201) {
          const data = registerResponse.data;
          userSessions.push(data.data.accessToken);
          
          // Use the session to make authenticated requests
          const booksResponse = await axios.get(`${baseURL}/api/v1/books`, {
            headers: {
              Authorization: `Bearer ${data.data.accessToken}`,
            },
          });
          
          const endTime = performance.now();
          const responseTime = endTime - startTime;
          
          loadTester.recordRequest(booksResponse.status === 200, responseTime);
          expect(booksResponse.status).toBe(200);
        } else {
          const endTime = performance.now();
          const responseTime = endTime - startTime;
          loadTester.recordRequest(false, responseTime);
        }
      } catch (error) {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        loadTester.recordRequest(false, responseTime);
        throw error;
      }
    };

    const result = await loadTester.runLoadTest(config, testFunction);
    
    // Assertions for concurrent sessions
    expect(result.errorRate).toBeLessThan(15); // Higher error rate expected for concurrent registrations
    expect(result.averageResponseTime).toBeLessThan(5000);
    expect(userSessions.length).toBeGreaterThan(0);
    
    console.log('Concurrent User Session Test Results:', {
      ...result,
      activeSessions: userSessions.length,
    });
  });
});
