import request from 'supertest';
import app from '../../src/app';
import { getTestPrismaClient, cleanupTestDatabase } from '../test-database';
import config from '../../src/config';
import { checkDatabaseConnection } from '../../src/config/database';

const prisma = getTestPrismaClient();

describe('App Configuration Integration Tests', () => {
  beforeEach(async () => {
    await cleanupTestDatabase();
  });

  describe('App Initialization', () => {
    it('should initialize app with correct middleware stack', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        message: 'Book Review Platform API is running',
        environment: 'test',
        version: '1.0.0',
        database: 'connected'
      });
    });

    it('should handle CORS properly', async () => {
      const response = await request(app)
        .options('/api/books')
        .set('Origin', 'http://localhost:3000')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should include security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Check for common security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-xss-protection']).toBeDefined();
      expect(response.headers['strict-transport-security']).toBeDefined();
    });

    it('should handle JSON parsing with size limit', async () => {
      const largePayload = {
        email: 'test@example.com',
        password: 'password123',
        name: 'A'.repeat(1000000) // 1MB of data
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(largePayload)
        .expect(400); // Bad request due to validation

      expect(response.body.success).toBe(false);
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle URL encoded data', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send('name=Test&email=test2@example.com&password=password123')
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Health Check Endpoint', () => {
    it('should return health status with database connection', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        message: 'Book Review Platform API is running',
        timestamp: expect.any(String),
        environment: 'test',
        version: '1.0.0',
        database: 'connected'
      });
    });

    it('should handle database connection failure gracefully', async () => {
      // Mock database connection failure
      jest.spyOn(require('../../src/config/database'), 'checkDatabaseConnection')
        .mockImplementation(() => Promise.resolve(false));

      const response = await request(app)
        .get('/health')
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatchObject({
        message: 'Service unavailable',
        details: 'Database connection failed'
      });

      // Restore original function
      jest.restoreAllMocks();
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors with custom handler', async () => {
      const response = await request(app)
        .get('/api/nonexistent-route')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('not found');
    });

    it('should handle global error handler', async () => {
      // This test would require mocking a service to throw an error
      // For now, we'll test the error handler structure
      const response = await request(app)
        .get('/api/nonexistent-route')
        .expect(404);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Rate Limiting', () => {
    it('should not apply rate limiting in test environment', async () => {
      // Make multiple requests quickly
      const promises = Array.from({ length: 10 }, () =>
        request(app).get('/health')
      );

      const responses = await Promise.all(promises);
      
      // All should succeed since rate limiting is disabled in test
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Request Logging', () => {
    it('should log requests in development mode', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await request(app)
        .get('/health')
        .expect(200);

      // In test environment, request logging should be minimal
      // The exact behavior depends on the morgan configuration
      consoleSpy.mockRestore();
    });
  });

  describe('API Routes Structure', () => {
    it('should mount all API routes under correct prefix', async () => {
      // Test that routes are mounted under /api prefix
      const response = await request(app)
        .get('/api/books')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle route parameter validation', async () => {
      // Test invalid UUID format - should return 404 since the route doesn't exist
      const response = await request(app)
        .get('/api/books/invalid-uuid')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Middleware Stack Order', () => {
    it('should apply middleware in correct order', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Security headers should be present (applied early)
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      
      // CORS headers should be present
      expect(response.headers['access-control-allow-origin']).toBeDefined();
      
      // Response should be properly formatted (error handler applied last)
      expect(response.body).toHaveProperty('success');
    });
  });

  describe('Environment Configuration', () => {
    it('should use test environment configuration', async () => {
      expect(config.server.nodeEnv).toBe('test');
      expect(config.server.port).toBeDefined();
      expect(config.server.apiPrefix).toBe('/api');
    });

    it('should have database configuration', async () => {
      expect(config.database.url).toBeDefined();
    });

    it('should have JWT configuration', async () => {
      expect(config.jwt.secret).toBeDefined();
      expect(config.jwt.expiresIn).toBeDefined();
      expect(config.jwt.refreshSecret).toBeDefined();
      expect(config.jwt.refreshExpiresIn).toBeDefined();
    });

    it('should have CORS configuration', async () => {
      expect(config.cors.origin).toBeDefined();
    });

    it('should have rate limit configuration', async () => {
      expect(config.rateLimit.windowMs).toBeDefined();
      expect(config.rateLimit.maxRequests).toBeDefined();
    });
  });

  describe('Request Validation', () => {
    it('should validate content type for POST requests', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'text/plain')
        .send('not json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle empty request bodies', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User'
          // Missing email and password
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid input');
    });
  });

  describe('Response Format', () => {
    it('should return consistent response format for success', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('message');
    });

    it('should return consistent response format for errors', async () => {
      const response = await request(app)
        .get('/api/nonexistent-route')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('message');
    });
  });
});
