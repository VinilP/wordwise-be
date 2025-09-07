import request from 'supertest';
import app from '../../src/app';

describe('App Basic Integration Tests', () => {
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
      // Test that all main route groups exist by checking responses
      
      // Auth routes - should return 400 for missing data, not 404
      await request(app).post('/api/auth/login').expect(400);
      await request(app).post('/api/auth/register').expect(400);
      
      // Book routes - should work without auth
      await request(app).get('/api/books').expect(200);
      
      // Review routes - should require auth (401)
      await request(app).post('/api/reviews').expect(401);
      
      // User routes - should require auth (401)
      await request(app).get('/api/users/profile').expect(401);
      
      // Recommendation routes - should require auth (401)
      await request(app).get('/api/recommendations').expect(401);
      
      // Rating routes - some should work without auth
      await request(app).get('/api/ratings/top-rated').expect(200);
      
      // Popular books routes - should require auth (401)
      await request(app).get('/api/popular-books').expect(401);
    });

    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('not found');
    });
  });

  describe('CORS Configuration', () => {
    it('should handle CORS properly', async () => {
      const response = await request(app)
        .options('/api/books')
        .set('Origin', 'http://localhost:3000')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-credentials']).toBe('true');
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

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
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

  describe('Request Validation', () => {
    it('should validate request content type', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'text/plain')
        .send('not json')
        .expect(400);

      expect(response.body.success).toBe(false);
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

