import request from 'supertest';
import app from '../../src/app';
import { getTestPrismaClient, cleanupTestDatabase, createTestUser, createTestBook } from '../test-database';
import { JwtUtils } from '../../src/utils/jwt';

const prisma = getTestPrismaClient();

describe('Review Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let bookId: string;
  let reviewId: string;

  beforeEach(async () => {
    // Clean up database
    await cleanupTestDatabase();

    // Create test user
    const user = await createTestUser({
      email: 'test@example.com',
      name: 'Test User',
    });
    userId = user.id;
    authToken = JwtUtils.generateTokens(user).token;

    // Create test book
    const book = await createTestBook({
      title: 'Test Book',
      author: 'Test Author',
    });
    bookId = book.id;
  });

  describe('POST /api/reviews', () => {
    it('should create a review successfully', async () => {
      const reviewData = {
        bookId,
        content: 'Great book!',
        rating: 5,
      };

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reviewData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        bookId,
        userId,
        content: 'Great book!',
        rating: 5,
      });
      expect(response.body.data.id).toBeDefined();
      reviewId = response.body.data.id;

      // Verify book rating was updated
      const updatedBook = await prisma.book.findUnique({ where: { id: bookId } });
      expect(updatedBook?.averageRating).toEqual(5);
      expect(updatedBook?.reviewCount).toBe(1);
    });

    it('should return 401 without authentication', async () => {
      const reviewData = {
        bookId,
        content: 'Great book!',
        rating: 5,
      };

      const response = await request(app)
        .post('/api/reviews')
        .send(reviewData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Authentication required');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Book ID and rating are required');
    });

    it('should return 400 for invalid rating', async () => {
      const reviewData = {
        bookId,
        content: 'Great book!',
        rating: 6,
      };

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reviewData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Rating must be between 1 and 5');
    });

    it('should return 500 for duplicate review', async () => {
      const reviewData = {
        bookId,
        content: 'Another review',
        rating: 4,
      };

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reviewData)
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should return 500 for non-existent book', async () => {
      const reviewData = {
        bookId: '00000000-0000-0000-0000-000000000000',
        content: 'Great book!',
        rating: 5,
      };

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reviewData)
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/reviews/book/:bookId', () => {
    it('should get reviews for a book', async () => {
      const response = await request(app)
        .get(`/api/reviews/book/${bookId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({
        bookId,
        userId,
        content: 'Great book!',
        rating: 5,
      });
      expect(response.body.data[0].user).toBeDefined();
      expect(response.body.data[0].book).toBeDefined();
    });

    it('should return 500 for non-existent book', async () => {
      const response = await request(app)
        .get('/api/reviews/book/00000000-0000-0000-0000-000000000000')
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for missing book ID', async () => {
      const response = await request(app)
        .get('/api/reviews/book/')
        .expect(404); // Route not found
    });
  });

  describe('GET /api/reviews/user/:userId', () => {
    it('should get reviews by a user', async () => {
      const response = await request(app)
        .get(`/api/reviews/user/${userId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({
        bookId,
        userId,
        content: 'Great book!',
        rating: 5,
      });
    });

    it('should return empty array for user with no reviews', async () => {
      // Create another user
      const anotherUser = await prisma.user.create({
        data: {
          email: 'another@example.com',
          password: 'hashedpassword',
          name: 'Another User',
        },
      });

      const response = await request(app)
        .get(`/api/reviews/user/${anotherUser.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data).toHaveLength(0);

      // Clean up
      await prisma.user.delete({ where: { id: anotherUser.id } });
    });
  });

  describe('GET /api/reviews/:id', () => {
    it('should get a specific review', async () => {
      const response = await request(app)
        .get(`/api/reviews/${reviewId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: reviewId,
        bookId,
        userId,
        content: 'Great book!',
        rating: 5,
      });
    });

    it('should return 500 for non-existent review', async () => {
      const response = await request(app)
        .get('/api/reviews/00000000-0000-0000-0000-000000000000')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/reviews/:id', () => {
    it('should update a review successfully', async () => {
      const updateData = {
        content: 'Updated content',
        rating: 4,
      };

      const response = await request(app)
        .put(`/api/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: reviewId,
        content: 'Updated content',
        rating: 4,
      });

      // Verify book rating was updated
      const updatedBook = await prisma.book.findUnique({ where: { id: bookId } });
      expect(updatedBook?.averageRating).toEqual(4);
      expect(updatedBook?.reviewCount).toBe(1);
    });

    it('should return 401 without authentication', async () => {
      const updateData = {
        content: 'Updated content',
        rating: 4,
      };

      const response = await request(app)
        .put(`/api/reviews/${reviewId}`)
        .send(updateData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Authentication required');
    });

    it('should return 400 for invalid rating', async () => {
      const updateData = {
        content: 'Updated content',
        rating: 6,
      };

      const response = await request(app)
        .put(`/api/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Rating must be between 1 and 5');
    });

    it('should return 500 for unauthorized update attempt', async () => {
      // Create another user
      const anotherUser = await prisma.user.create({
        data: {
          email: 'unauthorized@example.com',
          password: 'hashedpassword',
          name: 'Unauthorized User',
        },
      });
      const unauthorizedToken = JwtUtils.generateTokens(anotherUser).token;

      const updateData = {
        content: 'Unauthorized update',
        rating: 3,
      };

      const response = await request(app)
        .put(`/api/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${unauthorizedToken}`)
        .send(updateData)
        .expect(500);

      expect(response.body.success).toBe(false);

      // Clean up
      await prisma.user.delete({ where: { id: anotherUser.id } });
    });
  });

  describe('DELETE /api/reviews/:id', () => {
    it('should return 500 for unauthorized delete attempt', async () => {
      // Create another user
      const anotherUser = await prisma.user.create({
        data: {
          email: 'unauthorized2@example.com',
          password: 'hashedpassword',
          name: 'Unauthorized User 2',
        },
      });
      const unauthorizedToken = JwtUtils.generateTokens(anotherUser).token;

      const response = await request(app)
        .delete(`/api/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${unauthorizedToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);

      // Clean up
      await prisma.user.delete({ where: { id: anotherUser.id } });
    });

    it('should delete a review successfully', async () => {
      const response = await request(app)
        .delete(`/api/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Review deleted successfully');

      // Verify review was deleted
      const deletedReview = await prisma.review.findUnique({ where: { id: reviewId } });
      expect(deletedReview).toBeNull();

      // Verify book rating was updated
      const updatedBook = await prisma.book.findUnique({ where: { id: bookId } });
      expect(updatedBook?.averageRating).toEqual(0);
      expect(updatedBook?.reviewCount).toBe(0);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .delete(`/api/reviews/${reviewId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Authentication required');
    });

    it('should return 500 for non-existent review', async () => {
      const response = await request(app)
        .delete('/api/reviews/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });
});