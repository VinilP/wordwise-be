import request from 'supertest';
import app from '../../src/app';
import { getTestPrismaClient, cleanupTestDatabase } from '../test-database';

const prisma = getTestPrismaClient();

describe('API Integration Tests', () => {
  beforeEach(async () => {
    await cleanupTestDatabase();
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        message: 'Book Review Platform API is running',
        environment: 'test',
        version: '1.0.0',
        database: 'connected',
      });
      expect(response.body.data.timestamp).toBeDefined();
    });
  });

  describe('API Routes Structure', () => {
    it('should have all required API routes', async () => {
      // Test that all main route groups exist by checking 401/404 responses
      
      // Auth routes
      await request(app).post('/api/auth/login').expect(400); // Bad request, not 404
      await request(app).post('/api/auth/register').expect(400); // Bad request, not 404
      
      // Book routes
      await request(app).get('/api/books').expect(200); // Should work without auth
      
      // Review routes (should require auth)
      await request(app).post('/api/reviews').expect(401); // Unauthorized, not 404
      
      // User routes (should require auth)
      await request(app).get('/api/users/profile').expect(401); // Unauthorized, not 404
      
      // Recommendation routes (should require auth)
      await request(app).get('/api/recommendations').expect(401); // Unauthorized, not 404
      
      // Rating routes
      await request(app).get('/api/ratings/top-rated').expect(200); // Should work without auth
    });

    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Route /api/nonexistent not found');
    });

    it('should handle CORS properly', async () => {
      const response = await request(app)
        .options('/api/books')
        .set('Origin', 'http://localhost:3000')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle large payloads', async () => {
      const largePayload = {
        email: 'test@example.com',
        password: 'password123',
        name: 'A'.repeat(1000000), // 1MB of data
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(largePayload)
        .expect(413); // Payload too large

      expect(response.body.success).toBe(false);
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Check for common security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-xss-protection']).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting', async () => {
      // Make multiple requests quickly
      const promises = Array.from({ length: 10 }, () =>
        request(app).get('/health')
      );

      const responses = await Promise.all(promises);
      
      // All should succeed since we're under the limit
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Request Validation', () => {
    it('should validate request content type', async () => {
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
  });

  describe('Database Connection', () => {
    it('should handle database connection in health check', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.data.database).toBe('connected');
    });
  });
});