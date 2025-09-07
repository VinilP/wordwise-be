import request from 'supertest';
import app from '../../src/app';
import { getTestPrismaClient, cleanupTestDatabase, createTestUser, createTestBook, createTestReview } from '../test-database';
import { JwtUtils } from '../../src/utils/jwt';

const prisma = getTestPrismaClient();

describe('Rating Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let bookId: string;

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

  describe('GET /api/ratings/book/:bookId', () => {
    it('should get rating statistics for a book', async () => {
      // Create some reviews first
      await createTestReview(userId, bookId, { rating: 5, content: 'Excellent!' });
      
      // Create another user and review
      const user2 = await createTestUser({
        email: 'user2@example.com',
        name: 'User 2',
      });
      await createTestReview(user2.id, bookId, { rating: 4, content: 'Good book' });

      const response = await request(app)
        .get(`/api/ratings/book/${bookId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        bookId,
        averageRating: 4.5,
        totalReviews: 2,
        ratingDistribution: {
          1: 0,
          2: 0,
          3: 0,
          4: 1,
          5: 1,
        },
      });
    });

    it('should return zero ratings for book with no reviews', async () => {
      const response = await request(app)
        .get(`/api/ratings/book/${bookId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        bookId,
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
        },
      });
    });

    it('should return 404 for non-existent book', async () => {
      const response = await request(app)
        .get('/api/ratings/book/00000000-0000-0000-0000-000000000000')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Book not found');
    });
  });

  describe('POST /api/ratings/recalculate/:bookId', () => {
    it('should recalculate book rating successfully', async () => {
      // Create some reviews
      await createTestReview(userId, bookId, { rating: 5 });
      
      const user2 = await createTestUser({
        email: 'user2@example.com',
        name: 'User 2',
      });
      await createTestReview(user2.id, bookId, { rating: 3 });

      const response = await request(app)
        .post(`/api/ratings/recalculate/${bookId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Rating recalculated successfully');
      expect(response.body.data.newRating).toBe(4);
      expect(response.body.data.reviewCount).toBe(2);

      // Verify the book was updated
      const updatedBook = await prisma.book.findUnique({ where: { id: bookId } });
      expect(Number(updatedBook?.averageRating)).toBe(4);
      expect(updatedBook?.reviewCount).toBe(2);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/ratings/recalculate/${bookId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent book', async () => {
      const response = await request(app)
        .post('/api/ratings/recalculate/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Book not found');
    });
  });

  describe('GET /api/ratings/top-rated', () => {
    it('should return top-rated books', async () => {
      // Create multiple books with different ratings
      const book2 = await createTestBook({
        title: 'Book 2',
        author: 'Author 2',
        averageRating: 4.8,
        reviewCount: 10,
      });

      const book3 = await createTestBook({
        title: 'Book 3',
        author: 'Author 3',
        averageRating: 4.2,
        reviewCount: 5,
      });

      const response = await request(app)
        .get('/api/ratings/top-rated')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Should be ordered by rating descending
      const books = response.body.data;
      expect(books[0].averageRating).toBeGreaterThanOrEqual(books[1]?.averageRating || 0);
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/ratings/top-rated?limit=1')
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(1);
    });

    it('should filter by minimum rating', async () => {
      const response = await request(app)
        .get('/api/ratings/top-rated?minRating=4.5')
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach((book: any) => {
        expect(book.averageRating).toBeGreaterThanOrEqual(4.5);
      });
    });
  });

  describe('Rating Aggregation Logic', () => {
    it('should update book rating when review is created', async () => {
      // Create a review
      await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          bookId,
          content: 'Great book!',
          rating: 5,
        })
        .expect(201);

      // Check that book rating was updated
      const updatedBook = await prisma.book.findUnique({ where: { id: bookId } });
      expect(Number(updatedBook?.averageRating)).toBe(5);
      expect(updatedBook?.reviewCount).toBe(1);
    });

    it('should update book rating when review is updated', async () => {
      // Create a review first
      const reviewResponse = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          bookId,
          content: 'Great book!',
          rating: 5,
        })
        .expect(201);

      const reviewId = reviewResponse.body.data.id;

      // Update the review
      await request(app)
        .put(`/api/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Updated review',
          rating: 3,
        })
        .expect(200);

      // Check that book rating was updated
      const updatedBook = await prisma.book.findUnique({ where: { id: bookId } });
      expect(Number(updatedBook?.averageRating)).toBe(3);
      expect(updatedBook?.reviewCount).toBe(1);
    });

    it('should update book rating when review is deleted', async () => {
      // Create a review first
      const reviewResponse = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          bookId,
          content: 'Great book!',
          rating: 5,
        })
        .expect(201);

      const reviewId = reviewResponse.body.data.id;

      // Delete the review
      await request(app)
        .delete(`/api/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Check that book rating was updated
      const updatedBook = await prisma.book.findUnique({ where: { id: bookId } });
      expect(Number(updatedBook?.averageRating)).toBe(0);
      expect(updatedBook?.reviewCount).toBe(0);
    });
  });
});