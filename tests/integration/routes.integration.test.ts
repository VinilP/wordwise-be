import request from 'supertest';
import app from '../../src/app';
import { getTestPrismaClient, cleanupTestDatabase } from '../test-database';
import { createTestUser, createTestBook, createTestReview } from '../utils/test-data';

const prisma = getTestPrismaClient();

describe('Routes Integration Tests', () => {
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
        password: 'Password123!'
      });
    
    if (loginResponse.body.success && loginResponse.body.data) {
      authToken = loginResponse.body.data.accessToken;
    } else {
      console.error('Login failed:', loginResponse.body);
    }
  });

  describe('Auth Routes', () => {
    describe('POST /api/auth/register', () => {
      it('should register a new user successfully', async () => {
        const userData = {
          name: 'New User',
          email: `newuser-${Date.now()}@example.com`,
          password: 'Password123!'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user).toMatchObject({
          name: userData.name,
          email: userData.email
        });
        expect(response.body.data.accessToken).toBeDefined();
        expect(response.body.data.refreshToken).toBeDefined();
      });

      it('should fail with invalid email format', async () => {
        const userData = {
          name: 'Test User',
          email: 'invalid-email',
          password: 'Password123!'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('email');
      });

      it('should fail with weak password', async () => {
        const userData = {
          name: 'Test User',
          email: 'test@example.com',
          password: '123'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('Password validation failed');
      });

      it('should fail with duplicate email', async () => {
        const userData = {
          name: 'Test User',
          email: testUser.email,
          password: 'Password123!'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(409);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('already exists');
      });
    });

    describe('POST /api/auth/login', () => {
      it('should login with valid credentials', async () => {
        const loginData = {
          email: testUser.email,
          password: 'Password123!'
        };

        const response = await request(app)
          .post('/api/auth/login')
          .send(loginData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user).toMatchObject({
          id: testUser.id,
          email: testUser.email,
          name: testUser.name
        });
        expect(response.body.data.accessToken).toBeDefined();
        expect(response.body.data.refreshToken).toBeDefined();
      });

      it('should fail with invalid email', async () => {
        const loginData = {
          email: 'nonexistent@example.com',
          password: 'Password123!'
        };

        const response = await request(app)
          .post('/api/auth/login')
          .send(loginData)
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('Invalid credentials');
      });

      it('should fail with invalid password', async () => {
        const loginData = {
          email: testUser.email,
          password: 'wrongpassword'
        };

        const response = await request(app)
          .post('/api/auth/login')
          .send(loginData)
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('Invalid credentials');
      });
    });

    describe('POST /api/auth/refresh', () => {
      it('should refresh token with valid refresh token', async () => {
        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send({
            email: testUser.email,
            password: 'Password123!'
          });

        const refreshToken = loginResponse.body.data.refreshToken;

        const response = await request(app)
          .post('/api/auth/refresh')
          .send({ refreshToken })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.accessToken).toBeDefined();
        expect(response.body.data.refreshToken).toBeDefined();
      });

      it('should fail with invalid refresh token', async () => {
        const response = await request(app)
          .post('/api/auth/refresh')
          .send({ refreshToken: 'invalid-token' })
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('Invalid refresh token');
      });
    });

    describe('GET /api/auth/me', () => {
      it('should get current user with valid token', async () => {
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          id: testUser.id,
          email: testUser.email,
          name: testUser.name
        });
      });

      it('should fail without token', async () => {
        const response = await request(app)
          .get('/api/auth/me')
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('Authentication required');
      });

      it('should fail with invalid token', async () => {
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('Invalid token');
      });
    });

    describe('POST /api/auth/logout', () => {
      it('should logout successfully with valid token', async () => {
        const response = await request(app)
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('Logout successful');
      });

      it('should fail without token', async () => {
        const response = await request(app)
          .post('/api/auth/logout')
          .expect(401);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('Book Routes', () => {
    describe('GET /api/books', () => {
      it('should get all books with pagination', async () => {
        const response = await request(app)
          .get('/api/books?page=1&limit=10')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.data).toBeInstanceOf(Array);
        expect(response.body.data.pagination.total).toBeGreaterThanOrEqual(1);
        expect(response.body.data.pagination).toBeDefined();
      });

      it('should filter books by genre', async () => {
        const response = await request(app)
          .get('/api/books?genres=Fiction')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.data).toBeInstanceOf(Array);
      });

      it('should filter books by rating', async () => {
        const response = await request(app)
          .get('/api/books?minRating=4.0')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.data).toBeInstanceOf(Array);
      });

      it('should filter books by published year', async () => {
        const response = await request(app)
          .get('/api/books?publishedYear=2023')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.data).toBeInstanceOf(Array);
      });
    });

    describe('GET /api/books/search', () => {
      it('should search books by title', async () => {
        const response = await request(app)
          .get('/api/books/search?q=Test')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.data).toBeInstanceOf(Array);
      });

      it('should search books by author', async () => {
        const response = await request(app)
          .get('/api/books/search?q=Author')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.data).toBeInstanceOf(Array);
      });

      it('should return empty results for non-existent search', async () => {
        const response = await request(app)
          .get('/api/books/search?q=nonexistentbook')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.data).toEqual([]);
        expect(response.body.data.pagination.total).toBe(0);
      });
    });

    describe('GET /api/books/popular', () => {
      it('should get popular books', async () => {
        const response = await request(app)
          .get('/api/books/popular?limit=5')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
      });
    });

    describe('GET /api/books/genre/:genre', () => {
      it('should get books by genre', async () => {
        const response = await request(app)
          .get('/api/books/genre/Fiction?limit=5')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
      });
    });

    describe('GET /api/books/:id', () => {
      it('should get book by id', async () => {
        const response = await request(app)
          .get(`/api/books/${testBook.id}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          id: testBook.id,
          title: testBook.title,
          author: testBook.author
        });
      });

      it('should return 404 for non-existent book', async () => {
        const response = await request(app)
          .get('/api/books/nonexistent-id')
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('Book not found');
      });
    });
  });

  describe('Review Routes', () => {
    describe('POST /api/reviews', () => {
      it('should create a new review with valid data', async () => {
        // Create a new book for this test to avoid duplicate review constraint
        const newBook = await createTestBook(prisma, 'New Test Book', 'New Author');
        
        const reviewData = {
          bookId: newBook.id,
          rating: 5,
          content: 'Great book!'
        };

        const response = await request(app)
          .post('/api/reviews')
          .set('Authorization', `Bearer ${authToken}`)
          .send(reviewData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          bookId: newBook.id,
          rating: 5,
          content: 'Great book!'
        });
      });

      it('should fail without authentication', async () => {
        const reviewData = {
          bookId: testBook.id,
          rating: 5,
          content: 'Great book!'
        };

        const response = await request(app)
          .post('/api/reviews')
          .send(reviewData)
          .expect(401);

        expect(response.body.success).toBe(false);
      });

      it('should fail with invalid rating', async () => {
        const reviewData = {
          bookId: testBook.id,
          rating: 6, // Invalid rating
          content: 'Great book!'
        };

        const response = await request(app)
          .post('/api/reviews')
          .set('Authorization', `Bearer ${authToken}`)
          .send(reviewData)
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should fail with non-existent book', async () => {
        const reviewData = {
          bookId: 'nonexistent-id',
          rating: 5,
          content: 'Great book!'
        };

        const response = await request(app)
          .post('/api/reviews')
          .set('Authorization', `Bearer ${authToken}`)
          .send(reviewData)
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/reviews/book/:bookId', () => {
      it('should get reviews for a book', async () => {
        const response = await request(app)
          .get(`/api/reviews/book/${testBook.id}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      });

      it('should return empty array for book with no reviews', async () => {
        const newBook = await createTestBook(prisma);
        const response = await request(app)
          .get(`/api/reviews/book/${newBook.id}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual([]);
      });
    });

    describe('GET /api/reviews/user/:userId', () => {
      it('should get reviews by user', async () => {
        const response = await request(app)
          .get(`/api/reviews/user/${testUser.id}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe('GET /api/reviews/:id', () => {
      it('should get review by id', async () => {
        const response = await request(app)
          .get(`/api/reviews/${testReview.id}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          id: testReview.id,
          rating: testReview.rating,
          content: testReview.content
        });
      });

      it('should return 404 for non-existent review', async () => {
        const response = await request(app)
          .get('/api/reviews/nonexistent-id')
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('Review not found');
      });
    });

    describe('PUT /api/reviews/:id', () => {
      it('should update review with valid data', async () => {
        const updateData = {
          rating: 4,
          content: 'Updated review content'
        };

        const response = await request(app)
          .put(`/api/reviews/${testReview.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toMatchObject({
          id: testReview.id,
          rating: 4,
          content: 'Updated review content'
        });
      });

      it('should fail without authentication', async () => {
        const updateData = {
          rating: 4,
          content: 'Updated review content'
        };

        const response = await request(app)
          .put(`/api/reviews/${testReview.id}`)
          .send(updateData)
          .expect(401);

        expect(response.body.success).toBe(false);
      });

      it('should fail updating another user\'s review', async () => {
        const otherUser = await createTestUser(prisma, 'other@example.com');
        const otherUserToken = await getAuthToken(otherUser.email);
        
        const updateData = {
          rating: 4,
          content: 'Updated review content'
        };

        const response = await request(app)
          .put(`/api/reviews/${testReview.id}`)
          .set('Authorization', `Bearer ${otherUserToken}`)
          .send(updateData)
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('Unauthorized');
      });
    });

    describe('DELETE /api/reviews/:id', () => {
      it('should delete review with valid authentication', async () => {
        const response = await request(app)
          .delete(`/api/reviews/${testReview.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.message).toContain('deleted successfully');
      });

      it('should fail without authentication', async () => {
        const response = await request(app)
          .delete(`/api/reviews/${testReview.id}`)
          .expect(401);

        expect(response.body.success).toBe(false);
      });

      it('should fail deleting another user\'s review', async () => {
        const otherUser = await createTestUser(prisma, 'other@example.com');
        const otherUserToken = await getAuthToken(otherUser.email);

        const response = await request(app)
          .delete(`/api/reviews/${testReview.id}`)
          .set('Authorization', `Bearer ${otherUserToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('Unauthorized');
      });
    });
  });

  // Helper function to get auth token
  async function getAuthToken(email: string): Promise<string> {
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email,
        password: 'Password123!'
      });
    
    if (loginResponse.body.success && loginResponse.body.data) {
      return loginResponse.body.data.accessToken;
    } else {
      throw new Error('Failed to get auth token');
    }
  }
});
