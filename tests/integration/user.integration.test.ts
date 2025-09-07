import request from 'supertest';
import app from '../../src/app';
import { getTestPrismaClient, cleanupTestDatabase, createTestUser, createTestBook } from '../test-database';
import { JwtUtils } from '../../src/utils/jwt';

const prisma = getTestPrismaClient();

describe('User Integration Tests', () => {
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

    // Create test book
    const book = await createTestBook({
      title: 'Test Book',
      author: 'Test Author',
    });
    bookId = book.id;

    // Generate auth token
    const { token } = JwtUtils.generateTokens({ 
      id: userId, 
      email: user.email, 
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
    authToken = token;
  });

  describe('GET /api/users/profile', () => {
    it('should get user profile successfully', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          id: userId,
          email: 'test@example.com',
          name: 'Test User',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          reviewCount: 0,
          favoriteCount: 0,
        },
      });
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'MISSING_TOKEN',
        },
      });
    });
  });

  describe('GET /api/users/profile/details', () => {
    it('should get detailed user profile successfully', async () => {
      const response = await request(app)
        .get('/api/users/profile/details')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          id: userId,
          email: 'test@example.com',
          name: 'Test User',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          reviewCount: 0,
          favoriteCount: 0,
          reviews: [],
          favorites: [],
        },
      });
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/users/profile/details')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'MISSING_TOKEN',
        },
      });
    });
  });

  describe('POST /api/users/favorites/:bookId', () => {
    it('should add book to favorites successfully', async () => {
      const response = await request(app)
        .post(`/api/users/favorites/${bookId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: {
          id: expect.any(String),
          userId,
          bookId,
          createdAt: expect.any(String),
        },
      });
    });

    it('should return 409 when book already favorited', async () => {
      const response = await request(app)
        .post(`/api/users/favorites/${bookId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);

      expect(response.body).toEqual({
        success: false,
        error: {
          message: 'Book is already in favorites',
          code: 'ALREADY_FAVORITED',
        },
      });
    });

    it('should return 404 when book not found', async () => {
      const nonExistentBookId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .post(`/api/users/favorites/${nonExistentBookId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: {
          message: 'Book not found',
          code: 'BOOK_NOT_FOUND',
        },
      });
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post(`/api/users/favorites/${bookId}`)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'MISSING_TOKEN',
        },
      });
    });

    it('should return 400 when bookId is invalid', async () => {
      const response = await request(app)
        .post('/api/users/favorites/')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404); // Express returns 404 for missing route params
    });
  });

  describe('GET /api/users/favorites', () => {
    it('should get user favorites successfully', async () => {
      const response = await request(app)
        .get('/api/users/favorites')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: [
          {
            id: bookId,
            title: 'Test Book',
            author: 'Test Author',
            description: 'Test Description',
            coverImageUrl: '',
            genres: ['Fiction'],
            publishedYear: 2023,
            averageRating: 0,
            reviewCount: 0,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          },
        ],
      });
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/users/favorites')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'MISSING_TOKEN',
        },
      });
    });
  });

  describe('GET /api/users/favorites/:bookId/status', () => {
    it('should return true when book is favorited', async () => {
      const response = await request(app)
        .get(`/api/users/favorites/${bookId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: { isFavorite: true },
      });
    });

    it('should return false when book is not favorited', async () => {
      // Create another book
      const anotherBook = await prisma.book.create({
        data: {
          title: 'Another Book',
          author: 'Another Author',
          description: 'Another Description',
          genres: ['Mystery'],
          publishedYear: 2022,
        },
      });

      const response = await request(app)
        .get(`/api/users/favorites/${anotherBook.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: { isFavorite: false },
      });

      // Clean up
      await prisma.book.delete({ where: { id: anotherBook.id } });
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get(`/api/users/favorites/${bookId}/status`)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'MISSING_TOKEN',
        },
      });
    });
  });

  describe('DELETE /api/users/favorites/:bookId', () => {
    it('should remove book from favorites successfully', async () => {
      const response = await request(app)
        .delete(`/api/users/favorites/${bookId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: { message: 'Book removed from favorites' },
      });
    });

    it('should return 404 when book not in favorites', async () => {
      const response = await request(app)
        .delete(`/api/users/favorites/${bookId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: {
          message: 'Book is not in favorites',
          code: 'NOT_FAVORITED',
        },
      });
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .delete(`/api/users/favorites/${bookId}`)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'MISSING_TOKEN',
        },
      });
    });
  });

  describe('User Profile with Reviews and Favorites', () => {
    beforeAll(async () => {
      // Add a review and favorite for comprehensive testing
      await prisma.review.create({
        data: {
          bookId,
          userId,
          content: 'Great book!',
          rating: 5,
        },
      });

      await prisma.userFavorite.create({
        data: {
          userId,
          bookId,
        },
      });
    });

    afterAll(async () => {
      // Clean up
      await prisma.userFavorite.deleteMany({ where: { userId } });
      await prisma.review.deleteMany({ where: { userId } });
    });

    it('should get profile with updated counts', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.reviewCount).toBe(1);
      expect(response.body.data.favoriteCount).toBe(1);
    });

    it('should get detailed profile with reviews and favorites', async () => {
      const response = await request(app)
        .get('/api/users/profile/details')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.reviews).toHaveLength(1);
      expect(response.body.data.favorites).toHaveLength(1);
      expect(response.body.data.reviews[0]).toMatchObject({
        content: 'Great book!',
        rating: 5,
        book: {
          title: 'Test Book',
          author: 'Test Author',
        },
      });
      expect(response.body.data.favorites[0]).toMatchObject({
        book: {
          title: 'Test Book',
          author: 'Test Author',
        },
      });
    });
  });
});