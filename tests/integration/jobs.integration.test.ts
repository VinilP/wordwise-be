import request from 'supertest';
import app from '../../src/app';
import { getTestPrismaClient, cleanupTestDatabase } from '../test-database';
import { createTestUser, createTestBook, createTestReview } from '../utils/test-data';
import { RatingRecalculationJob } from '../../src/jobs/rating-recalculation.job';
import { RatingService } from '../../src/services/rating.service';
import { BookRepository } from '../../src/repositories/book.repository';
import { ReviewRepository } from '../../src/repositories/review.repository';

const prisma = getTestPrismaClient();

describe('Jobs Integration Tests', () => {
  let testUser: any;
  let testBook: any;
  let testReview: any;
  let authToken: string;
  let ratingService: RatingService;
  let ratingRecalculationJob: RatingRecalculationJob;

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

    // Initialize job dependencies
    const bookRepository = new BookRepository(prisma);
    const reviewRepository = new ReviewRepository(prisma);
    ratingService = new RatingService(prisma, bookRepository, reviewRepository);
    ratingRecalculationJob = new RatingRecalculationJob(ratingService);
  });

  describe('RatingRecalculationJob Integration', () => {
    it('should recalculate ratings for all books', async () => {
      // Create additional test data
      const book2 = await createTestBook(prisma, 'Book 2', 'Author 2');
      const book3 = await createTestBook(prisma, 'Book 3', 'Author 3');
      
      // Create reviews for the books
      await createTestReview(prisma, testUser.id, book2.id, 4, 'Good book');
      await createTestReview(prisma, testUser.id, book3.id, 5, 'Excellent book');

      const result = await ratingRecalculationJob.execute();

      expect(result.success).toBe(true);
      expect(result.processed).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
      expect(result.duration).toBeGreaterThanOrEqual(0);

      // Verify that book ratings were updated
      const updatedBook = await prisma.book.findUnique({
        where: { id: testBook.id }
      });

      expect(updatedBook?.averageRating).toBeDefined();
      expect(updatedBook?.reviewCount).toBeGreaterThan(0);
    });

    it('should handle books with no reviews', async () => {
      // Create a book without reviews
      const bookWithoutReviews = await createTestBook(prisma, 'No Reviews Book', 'Author');

      const result = await ratingRecalculationJob.execute();

      expect(result.success).toBe(true);
      expect(result.processed).toBeGreaterThan(0);

      // Verify that book without reviews has null rating
      const updatedBook = await prisma.book.findUnique({
        where: { id: bookWithoutReviews.id }
      });

      expect(updatedBook?.averageRating).toBeNull();
      expect(updatedBook?.reviewCount).toBe(0);
    });

    it('should handle books with multiple reviews', async () => {
      // Create multiple reviews for the same book
      const user2 = await createTestUser(prisma, 'user2@example.com');
      const user3 = await createTestUser(prisma, 'user3@example.com');
      
      await createTestReview(prisma, user2.id, testBook.id, 3, 'Average book');
      await createTestReview(prisma, user3.id, testBook.id, 5, 'Great book');

      const result = await ratingRecalculationJob.execute();

      expect(result.success).toBe(true);
      expect(result.processed).toBeGreaterThan(0);

      // Verify that average rating is calculated correctly
      const updatedBook = await prisma.book.findUnique({
        where: { id: testBook.id }
      });

      expect(updatedBook?.averageRating).toBeDefined();
      expect(updatedBook?.reviewCount).toBe(3); // 3 reviews total
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error by closing connection
      await prisma.$disconnect();

      const result = await ratingRecalculationJob.execute();

      expect(result.success).toBe(false);
      expect(result.processed).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);

      // Reconnect for cleanup
      await prisma.$connect();
    });

    it('should complete within reasonable time', async () => {
      const startTime = Date.now();
      
      const result = await ratingRecalculationJob.execute();
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.duration).toBeLessThan(5000);
    });
  });

  describe('Rating Recalculation via API', () => {
    it('should trigger rating recalculation via API endpoint', async () => {
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

    it('should handle concurrent recalculation requests', async () => {
      // Make multiple concurrent requests
      const promises = Array.from({ length: 3 }, () =>
        request(app)
          .post('/api/ratings/recalculate')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(promises);

      // All should succeed (though they might process the same data)
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Job Scheduling', () => {
    it('should schedule periodic recalculation', (done) => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const recalculateSpy = jest.spyOn(ratingService, 'recalculateAllRatings').mockResolvedValue({
        processed: 1,
        errors: []
      });

      const intervalId = RatingRecalculationJob.schedulePeriodicRecalculation(ratingService, 100);

      // Wait for the first execution
      setTimeout(() => {
        expect(recalculateSpy).toHaveBeenCalled();
        
        // Clean up
        clearInterval(intervalId);
        consoleSpy.mockRestore();
        recalculateSpy.mockRestore();
        done();
      }, 150);
    });

    it('should use default interval when not specified', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const intervalId = RatingRecalculationJob.schedulePeriodicRecalculation(ratingService);

      expect(intervalId).toBeDefined();
      expect(typeof intervalId).toBe('object');

      // Clean up
      clearInterval(intervalId);
      consoleSpy.mockRestore();
    });
  });

  describe('Job Performance', () => {
    it('should handle large number of books efficiently', async () => {
      // Create multiple books and reviews
      const books = [];
      for (let i = 0; i < 10; i++) {
        const book = await createTestBook(prisma, `Book ${i}`, `Author ${i}`);
        books.push(book);
        
        // Create a review for each book
        await createTestReview(prisma, testUser.id, book.id, Math.floor(Math.random() * 5) + 1, `Review ${i}`);
      }

      const startTime = Date.now();
      const result = await ratingRecalculationJob.execute();
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.processed).toBeGreaterThanOrEqual(10);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should maintain data consistency during recalculation', async () => {
      // Create test data
      const book = await createTestBook(prisma, 'Consistency Test Book', 'Author');
      await createTestReview(prisma, testUser.id, book.id, 4, 'Test review');

      // Get initial state
      const initialBook = await prisma.book.findUnique({
        where: { id: book.id }
      });

      // Run recalculation
      const result = await ratingRecalculationJob.execute();

      expect(result.success).toBe(true);

      // Verify data consistency
      const finalBook = await prisma.book.findUnique({
        where: { id: book.id }
      });

      expect(finalBook?.reviewCount).toBe(1);
      expect(finalBook?.averageRating).toBe(4);
    });
  });

  describe('Error Recovery', () => {
    it('should continue processing after encountering errors', async () => {
      // Create a mix of valid and problematic data
      const validBook = await createTestBook(prisma, 'Valid Book', 'Author');
      await createTestReview(prisma, testUser.id, validBook.id, 5, 'Valid review');

      // Mock some errors in the service
      const originalRecalculate = ratingService.recalculateAllRatings;
      jest.spyOn(ratingService, 'recalculateAllRatings').mockImplementation(async () => {
        // Simulate partial success with some errors
        return {
          processed: 1,
          errors: ['Error processing book 1']
        };
      });

      const result = await ratingRecalculationJob.execute();

      expect(result.success).toBe(false); // Should be false due to errors
      expect(result.processed).toBe(1);
      expect(result.errors).toHaveLength(1);

      // Restore original method
      jest.restoreAllMocks();
    });
  });
});
