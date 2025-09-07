import request from 'supertest';
import app from '../../src/app';
import { getTestPrismaClient, cleanupTestDatabase } from '../test-database';

const prisma = getTestPrismaClient();

describe('Middleware Integration Tests', () => {
  beforeEach(async () => {
    await cleanupTestDatabase();
  });

  describe('Authentication Middleware', () => {
    it('should require authentication for protected routes', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('No token provided');
    });

    it('should reject invalid tokens', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid token');
    });

    it('should reject malformed authorization headers', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject empty authorization headers', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', '')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Request Validation Middleware', () => {
    it('should validate required fields', async () => {
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

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'invalid-email',
          password: 'password123'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('email');
    });

    it('should validate password strength', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: '123'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('password');
    });

    it('should validate rating range', async () => {
      // First create a user and book for testing
      const userResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123'
        });

      const bookResponse = await request(app)
        .get('/api/books')
        .expect(200);

      if (userResponse.body.success && bookResponse.body.data.books.length > 0) {
        const authToken = userResponse.body.data.accessToken;
        const bookId = bookResponse.body.data.books[0].id;

        const response = await request(app)
          .post('/api/reviews')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            bookId,
            rating: 6, // Invalid rating (should be 1-5)
            content: 'Great book!'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('rating');
      }
    });
  });

  describe('Error Handling Middleware', () => {
    it('should handle validation errors', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'invalid-email',
          password: '123'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('details');
    });

    it('should handle authentication errors', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('No token provided');
    });

    it('should handle not found errors', async () => {
      const response = await request(app)
        .get('/api/nonexistent-route')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('not found');
    });

    it('should handle malformed JSON errors', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Security Middleware', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Check for security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-xss-protection']).toBeDefined();
      expect(response.headers['strict-transport-security']).toBeDefined();
    });

    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/api/books')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'Content-Type')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
      expect(response.headers['access-control-allow-headers']).toBeDefined();
    });

    it('should handle CORS for actual requests', async () => {
      const response = await request(app)
        .get('/api/books')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });
  });

  describe('Request Logging Middleware', () => {
    it('should log requests in development mode', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await request(app)
        .get('/health')
        .expect(200);

      // In test environment, request logging should be minimal
      consoleSpy.mockRestore();
    });

    it('should handle request timing', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/health')
        .expect(200);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Request should complete within reasonable time
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Rate Limiting Middleware', () => {
    it('should not apply rate limiting in test environment', async () => {
      // Make multiple requests quickly
      const promises = Array.from({ length: 20 }, () =>
        request(app).get('/health')
      );

      const responses = await Promise.all(promises);
      
      // All should succeed since rate limiting is disabled in test
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Body Parsing Middleware', () => {
    it('should parse JSON bodies', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should parse URL-encoded bodies', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send('name=Test&email=test2@example.com&password=password123')
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should handle large payloads', async () => {
      const largePayload = {
        email: 'test@example.com',
        password: 'password123',
        name: 'A'.repeat(1000000) // 1MB of data
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(largePayload)
        .expect(400); // Should fail due to validation

      expect(response.body.success).toBe(false);
    });
  });

  describe('Response Formatting Middleware', () => {
    it('should format success responses consistently', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('message');
    });

    it('should format error responses consistently', async () => {
      const response = await request(app)
        .get('/api/nonexistent-route')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('message');
    });
  });
});

