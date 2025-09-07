/**
 * Smoke tests for production deployment verification
 * These tests run against the deployed application to ensure basic functionality
 */

import request from 'supertest';
import app from '../src/app';

const API_BASE_URL = process.env.API_BASE_URL || app;
const SMOKE_TEST_API_KEY = process.env.SMOKE_TEST_API_KEY;

describe('Smoke Tests', () => {
  let authToken: string;
  let testUserId: string;
  let testBookId: string;

  beforeAll(async () => {
    // Skip tests if no API base URL is provided
    if (!API_BASE_URL) {
      console.log('Skipping smoke tests - no API_BASE_URL provided');
      return;
    }

    console.log(`Running smoke tests against: ${API_BASE_URL}`);
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await request(API_BASE_URL)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('database', 'connected');
    });

    it('should return API information', async () => {
      const response = await request(API_BASE_URL)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('version');
      expect(response.body.data).toHaveProperty('environment');
    });
  });

  describe('Database Connectivity', () => {
    it('should connect to database successfully', async () => {
      const response = await request(API_BASE_URL)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('database', 'connected');
    });
  });

  describe('Authentication Endpoints', () => {
    const testUser = {
      email: `smoketest+${Date.now()}@example.com`,
      password: 'SmokeTest123!',
      name: 'Smoke Test User'
    };

    it('should register a new user', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('accessToken');

      authToken = response.body.data.accessToken;
      testUserId = response.body.data.user.id;
    });

    it('should login with valid credentials', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('accessToken');
    });

    it('should reject invalid credentials', async () => {
      await request(API_BASE_URL)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        })
        .expect(401);
    });

    it('should get user profile with valid token', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id', testUserId);
      expect(response.body.data).toHaveProperty('email', testUser.email);
    });
  });

  describe('Book Endpoints', () => {
    it('should get books list', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/books')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.data)).toBe(true);

      // Store first book ID for later tests
      if (response.body.data.data.length > 0) {
        testBookId = response.body.data.data[0].id;
      }
    });

    it('should get book details', async () => {
      if (!testBookId) {
        console.log('Skipping book details test - no books available');
        return;
      }

      const response = await request(API_BASE_URL)
        .get(`/api/books/${testBookId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id', testBookId);
      expect(response.body.data).toHaveProperty('title');
      expect(response.body.data).toHaveProperty('author');
    });

    it('should search books', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/books/search?q=test')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('data');
      expect(Array.isArray(response.body.data.data)).toBe(true);
    });
  });

  describe('Review Endpoints', () => {
    let reviewId: string;

    it('should create a review with authentication', async () => {
      if (!testBookId || !authToken) {
        console.log('Skipping review creation test - missing prerequisites');
        return;
      }

      const reviewData = {
        bookId: testBookId,
        rating: 5,
        content: 'This is a smoke test review'
      };

      const response = await request(API_BASE_URL)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reviewData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('rating', 5);

      reviewId = response.body.data.id;
    });

    it('should get reviews for a book', async () => {
      if (!testBookId) {
        console.log('Skipping book reviews test - no book ID available');
        return;
      }

      const response = await request(API_BASE_URL)
        .get(`/api/reviews/book/${testBookId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('reviews');
      expect(Array.isArray(response.body.data.reviews)).toBe(true);
    });

    it('should update own review', async () => {
      if (!reviewId || !authToken) {
        console.log('Skipping review update test - missing prerequisites');
        return;
      }

      const updateData = {
        rating: 4,
        content: 'Updated smoke test review'
      };

      const response = await request(API_BASE_URL)
        .put(`/api/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('rating', 4);
    });

    it('should delete own review', async () => {
      if (!reviewId || !authToken) {
        console.log('Skipping review deletion test - missing prerequisites');
        return;
      }

      await request(API_BASE_URL)
        .delete(`/api/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });

  describe('User Profile Endpoints', () => {
    it('should get user profile', async () => {
      if (!authToken) {
        console.log('Skipping profile test - no auth token available');
        return;
      }

      const response = await request(API_BASE_URL)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('reviewCount');
      expect(response.body.data).toHaveProperty('favoriteCount');
    });

    it('should manage favorites', async () => {
      if (!testBookId || !authToken) {
        console.log('Skipping favorites test - missing prerequisites');
        return;
      }

      // Add to favorites
      await request(API_BASE_URL)
        .post(`/api/users/favorites/${testBookId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      // Get favorites
      const favoritesResponse = await request(API_BASE_URL)
        .get('/api/users/favorites')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(favoritesResponse.body).toHaveProperty('success', true);
      expect(Array.isArray(favoritesResponse.body.data.favorites)).toBe(true);

      // Remove from favorites
      await request(API_BASE_URL)
        .delete(`/api/users/favorites/${testBookId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });

  describe('Recommendation Endpoints', () => {
    it('should get recommendations (may return fallback)', async () => {
      if (!authToken) {
        console.log('Skipping recommendations test - no auth token available');
        return;
      }

      const response = await request(API_BASE_URL)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('recommendations');
      expect(Array.isArray(response.body.data.recommendations)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent endpoints', async () => {
      await request(API_BASE_URL)
        .get('/api/nonexistent')
        .expect(404);
    });

    it('should handle unauthorized requests', async () => {
      await request(API_BASE_URL)
        .get('/api/users/profile')
        .expect(401);
    });

    it('should handle invalid book ID', async () => {
      await request(API_BASE_URL)
        .get('/api/books/invalid-id')
        .expect(404);
    });
  });

  describe('Performance', () => {
    it('should respond to health check within reasonable time', async () => {
      const startTime = Date.now();
      
      await request(API_BASE_URL)
        .get('/health')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(5000); // 5 seconds max
    });

    it('should respond to books list within reasonable time', async () => {
      const startTime = Date.now();
      
      await request(API_BASE_URL)
        .get('/api/books')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(10000); // 10 seconds max
    });
  });

  afterAll(async () => {
    // Cleanup: Delete test user if created
    if (authToken && testUserId) {
      try {
        await request(API_BASE_URL)
          .delete('/api/users/profile')
          .set('Authorization', `Bearer ${authToken}`);
      } catch (error) {
        console.log('Cleanup failed:', error);
      }
    }
  });
});