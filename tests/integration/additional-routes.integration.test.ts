import request from 'supertest';
import app from '../../src/app';
import { getTestPrismaClient, cleanupTestDatabase } from '../test-database';
import { createTestUser, createTestBook, createTestReview } from '../utils/test-data';

const prisma = getTestPrismaClient();

describe('Additional Routes Integration Tests', () => {
  let testUser: any;
  let testBook: any;
  let testReview: any;
  let authToken: string;

  beforeEach(async () => {
    await cleanupTestDatabase();
    
    // Create test data with unique email
    const uniqueEmail = `test-${Date.now()}@example.com`;
    testUser = await createTestUser(prisma, uniqueEmail);
    testBook = await createTestBook(prisma);
    testReview = await createTestReview(prisma, testUser.id, testBook.id);
    
    // Get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'password123'
      });
    
    if (loginResponse.body.success && loginResponse.body.data) {
      authToken = loginResponse.body.data.accessToken;
    } else {
      console.error('Login failed:', loginResponse.body);
    }
  });

  describe('Rating Routes', () => {
    describe('GET /api/ratings/book/:bookId/stats', () => {
      it('should get book rating statistics', async () => {
        const response = await request(app)
          .get(`/api/ratings/book/${testBook.id}/stats`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          bookId: testBook.id,
          averageRating: expect.any(Number),
          totalReviews: expect.any(Number),
          ratingDistribution: expect.any(Object)
        });
      });

      it('should return 404 for non-existent book', async () => {
        const response = await request(app)
          .get('/api/ratings/book/nonexistent-id/stats')
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('Book not found');
      });
    });

    describe('GET /api/ratings/top-rated', () => {
      it('should get top rated books', async () => {
        const response = await request(app)
          .get('/api/ratings/top-rated?limit=10')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
      });

      it('should respect limit parameter', async () => {
        const response = await request(app)
          .get('/api/ratings/top-rated?limit=5')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.length).toBeLessThanOrEqual(5);
      });
    });

    describe('POST /api/ratings/recalculate', () => {
      it('should recalculate all ratings with authentication', async () => {
        const response = await request(app)
          .post('/api/ratings/recalculate')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          processed: expect.any(Number),
          errors: expect.any(Array)
        });
      });

      it('should fail without authentication', async () => {
        const response = await request(app)
          .post('/api/ratings/recalculate')
          .expect(401);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/ratings/books-without-reviews', () => {
      it('should get books without reviews with authentication', async () => {
        const response = await request(app)
          .get('/api/ratings/books-without-reviews')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
      });

      it('should fail without authentication', async () => {
        const response = await request(app)
          .get('/api/ratings/books-without-reviews')
          .expect(401);

        expect(response.body.success).toBe(false);
      });
    });

    describe('PUT /api/ratings/book/:bookId/update', () => {
      it('should update book rating with authentication', async () => {
        const response = await request(app)
          .put(`/api/ratings/book/${testBook.id}/update`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          id: testBook.id,
          averageRating: expect.any(Number),
          reviewCount: expect.any(Number)
        });
      });

      it('should fail without authentication', async () => {
        const response = await request(app)
          .put(`/api/ratings/book/${testBook.id}/update`)
          .expect(401);

        expect(response.body.success).toBe(false);
      });

      it('should return 404 for non-existent book', async () => {
        const response = await request(app)
          .put('/api/ratings/book/nonexistent-id/update')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('Book not found');
      });
    });
  });

  describe('User Routes', () => {
    describe('GET /api/users/profile', () => {
      it('should get user profile with authentication', async () => {
        const response = await request(app)
          .get('/api/users/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          id: testUser.id,
          name: testUser.name,
          email: testUser.email
        });
      });

      it('should fail without authentication', async () => {
        const response = await request(app)
          .get('/api/users/profile')
          .expect(401);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/users/profile/details', () => {
      it('should get user profile with details with authentication', async () => {
        const response = await request(app)
          .get('/api/users/profile/details')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          user: expect.objectContaining({
            id: testUser.id,
            name: testUser.name,
            email: testUser.email
          }),
          reviewHistory: expect.any(Array),
          favoriteBooks: expect.any(Array)
        });
      });

      it('should fail without authentication', async () => {
        const response = await request(app)
          .get('/api/users/profile/details')
          .expect(401);

        expect(response.body.success).toBe(false);
      });
    });

    describe('POST /api/users/favorites/:bookId', () => {
      it('should add book to favorites with authentication', async () => {
        const response = await request(app)
          .post(`/api/users/favorites/${testBook.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('added to favorites');
      });

      it('should fail without authentication', async () => {
        const response = await request(app)
          .post(`/api/users/favorites/${testBook.id}`)
          .expect(401);

        expect(response.body.success).toBe(false);
      });

      it('should return 404 for non-existent book', async () => {
        const response = await request(app)
          .post('/api/users/favorites/nonexistent-id')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('Book not found');
      });
    });

    describe('DELETE /api/users/favorites/:bookId', () => {
      it('should remove book from favorites with authentication', async () => {
        // First add the book to favorites
        await request(app)
          .post(`/api/users/favorites/${testBook.id}`)
          .set('Authorization', `Bearer ${authToken}`);

        // Then remove it
        const response = await request(app)
          .delete(`/api/users/favorites/${testBook.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('removed from favorites');
      });

      it('should fail without authentication', async () => {
        const response = await request(app)
          .delete(`/api/users/favorites/${testBook.id}`)
          .expect(401);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/users/favorites', () => {
      it('should get user favorites with authentication', async () => {
        // First add a book to favorites
        await request(app)
          .post(`/api/users/favorites/${testBook.id}`)
          .set('Authorization', `Bearer ${authToken}`);

        const response = await request(app)
          .get('/api/users/favorites')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      });

      it('should fail without authentication', async () => {
        const response = await request(app)
          .get('/api/users/favorites')
          .expect(401);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/users/favorites/:bookId/status', () => {
      it('should check favorite status with authentication', async () => {
        const response = await request(app)
          .get(`/api/users/favorites/${testBook.id}/status`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          isFavorited: expect.any(Boolean)
        });
      });

      it('should fail without authentication', async () => {
        const response = await request(app)
          .get(`/api/users/favorites/${testBook.id}/status`)
          .expect(401);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('Recommendation Routes', () => {
    describe('GET /api/recommendations', () => {
      it('should get recommendations with authentication', async () => {
        const response = await request(app)
          .get('/api/recommendations')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
      });

      it('should fail without authentication', async () => {
        const response = await request(app)
          .get('/api/recommendations')
          .expect(401);

        expect(response.body.success).toBe(false);
      });
    });

    describe('DELETE /api/recommendations/cache', () => {
      it('should clear recommendation cache with authentication', async () => {
        const response = await request(app)
          .delete('/api/recommendations/cache')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('cache cleared');
      });

      it('should fail without authentication', async () => {
        const response = await request(app)
          .delete('/api/recommendations/cache')
          .expect(401);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('Popular Books Routes', () => {
    describe('GET /api/popular-books', () => {
      it('should get popular books with authentication', async () => {
        const response = await request(app)
          .get('/api/popular-books')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
      });

      it('should fail without authentication', async () => {
        const response = await request(app)
          .get('/api/popular-books')
          .expect(401);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/popular-books/top-rated', () => {
      it('should get top-rated books with authentication', async () => {
        const response = await request(app)
          .get('/api/popular-books/top-rated')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
      });

      it('should fail without authentication', async () => {
        const response = await request(app)
          .get('/api/popular-books/top-rated')
          .expect(401);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/popular-books/most-explored', () => {
      it('should get most explored books with authentication', async () => {
        const response = await request(app)
          .get('/api/popular-books/most-explored')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
      });

      it('should fail without authentication', async () => {
        const response = await request(app)
          .get('/api/popular-books/most-explored')
          .expect(401);

        expect(response.body.success).toBe(false);
      });
    });
  });
});
