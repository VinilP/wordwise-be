import request from 'supertest';
import app from '../../src/app';
import { getTestPrismaClient, cleanupTestDatabase, createTestUser, createTestBook, createTestReview } from '../test-database';
import { JwtUtils } from '../../src/utils/jwt';

const prisma = getTestPrismaClient();

// Mock OpenAI API for testing
jest.mock('openai', () => {
  const mockCreate = jest.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify([
          {
            title: 'The Lord of the Rings',
            author: 'J.R.R. Tolkien',
            reason: 'Epic fantasy adventure similar to your preferences',
            confidence: 0.9
          }
        ])
      }
    }]
  });

  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate
        }
      }
    }))
  };
});

describe('Recommendation Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let bookId: string;

  beforeEach(async () => {
    jest.clearAllMocks();
    
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
      genres: ['Fantasy'],
    });
    bookId = book.id;

    // Create a review to have some user history
    await createTestReview(userId, bookId, {
      rating: 5,
      content: 'Amazing fantasy book!',
    });
  });

  describe('GET /api/recommendations', () => {
    it('should return personalized recommendations for authenticated user', async () => {
      // Create additional books that could be recommended
      await createTestBook({
        title: 'The Lord of the Rings',
        author: 'J.R.R. Tolkien',
        genres: ['Fantasy', 'Adventure'],
        averageRating: 4.8,
        reviewCount: 1000,
      });

      const response = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('recommendations');
      expect(response.body.data).toHaveProperty('message');
      
      if (response.body.data.recommendations.length > 0) {
        const recommendation = response.body.data.recommendations[0];
        expect(recommendation).toHaveProperty('book');
        expect(recommendation).toHaveProperty('reason');
        expect(recommendation).toHaveProperty('confidence');
        expect(recommendation.book).toHaveProperty('title');
        expect(recommendation.book).toHaveProperty('author');
      }
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/recommendations')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should handle user with no review history', async () => {
      // Create a new user with no reviews
      const newUser = await createTestUser({
        email: 'newuser@example.com',
        name: 'New User',
      });
      const newUserToken = JwtUtils.generateTokens(newUser).token;

      const response = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${newUserToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('reviewing some books or adding books to your favorites');
    });
  });

  describe('DELETE /api/recommendations/cache', () => {
    it('should clear recommendation cache successfully', async () => {
      const response = await request(app)
        .delete('/api/recommendations/cache')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Recommendation cache cleared successfully');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/recommendations/cache')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Recommendation Quality', () => {
    it('should provide recommendations with proper structure', async () => {
      // Create additional books for recommendations
      await createTestBook({
        title: 'Quality Book',
        author: 'Quality Author',
        genres: ['Fiction', 'Mystery'],
        averageRating: 4.7,
        reviewCount: 300,
      });

      const response = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (response.body.data.recommendations.length > 0) {
        const recommendation = response.body.data.recommendations[0];
        
        // Should have all required fields
        expect(recommendation).toHaveProperty('book');
        expect(recommendation).toHaveProperty('reason');
        expect(recommendation).toHaveProperty('confidence');
        
        // Book should have required fields
        expect(recommendation.book).toHaveProperty('id');
        expect(recommendation.book).toHaveProperty('title');
        expect(recommendation.book).toHaveProperty('author');
        expect(recommendation.book).toHaveProperty('genres');
        
        // Confidence should be between 0 and 1
        expect(recommendation.confidence).toBeGreaterThan(0);
        expect(recommendation.confidence).toBeLessThanOrEqual(1);
        
        // Reason should be a non-empty string
        expect(typeof recommendation.reason).toBe('string');
        expect(recommendation.reason.length).toBeGreaterThan(0);
      }
    });

    it('should limit recommendations to maximum of 5 books', async () => {
      // Create multiple books for recommendations
      for (let i = 0; i < 7; i++) {
        await createTestBook({
          title: `Book ${i}`,
          author: `Author ${i}`,
          genres: ['Fiction'],
          averageRating: 4.0 + i * 0.1,
          reviewCount: 100 + i * 50,
        });
      }

      const response = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const recommendations = response.body.data.recommendations;
      expect(recommendations.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Performance', () => {
    it('should respond within reasonable time limits', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Should respond within 20 seconds (includes OpenAI API call)
      expect(responseTime).toBeLessThan(20000);
    });
  });
});