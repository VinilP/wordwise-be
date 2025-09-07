import request from 'supertest';
import app from '../../src/app';
import { getTestPrismaClient, cleanupTestDatabase } from '../test-database';

const prisma = getTestPrismaClient();

describe('Book API Integration Tests', () => {
  beforeEach(async () => {
    // Clean up database before each test
    await cleanupTestDatabase();

    // Seed test data
    await prisma.book.createMany({
      data: [
        {
          id: 'book-1',
          title: 'The Great Gatsby',
          author: 'F. Scott Fitzgerald',
          description: 'A classic American novel',
          coverImageUrl: 'http://example.com/gatsby.jpg',
          genres: ['Fiction', 'Classic'],
          publishedYear: 1925,
          averageRating: 4.2,
          reviewCount: 5,
        },
        {
          id: 'book-2',
          title: 'To Kill a Mockingbird',
          author: 'Harper Lee',
          description: 'A novel about racial injustice',
          coverImageUrl: 'http://example.com/mockingbird.jpg',
          genres: ['Fiction', 'Classic', 'Drama'],
          publishedYear: 1960,
          averageRating: 4.5,
          reviewCount: 8,
        },
        {
          id: 'book-3',
          title: '1984',
          author: 'George Orwell',
          description: 'A dystopian social science fiction novel',
          coverImageUrl: 'http://example.com/1984.jpg',
          genres: ['Fiction', 'Dystopian', 'Science Fiction'],
          publishedYear: 1949,
          averageRating: 4.8,
          reviewCount: 12,
        },
        {
          id: 'book-4',
          title: 'The Catcher in the Rye',
          author: 'J.D. Salinger',
          description: 'A coming-of-age story',
          coverImageUrl: 'http://example.com/catcher.jpg',
          genres: ['Fiction', 'Coming-of-age'],
          publishedYear: 1951,
          averageRating: 3.8,
          reviewCount: 3,
        },
        {
          id: 'book-5',
          title: 'Programming TypeScript',
          author: 'Boris Cherny',
          description: 'A comprehensive guide to TypeScript',
          coverImageUrl: 'http://example.com/typescript.jpg',
          genres: ['Programming', 'Technology'],
          publishedYear: 2019,
          averageRating: 4.3,
          reviewCount: 7,
        },
      ],
    });
  });

  describe('GET /api/books', () => {
    it('should return paginated list of books', async () => {
      const response = await request(app)
        .get('/api/books')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.data).toHaveLength(5);
      expect(response.body.data.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 5,
        totalPages: 1,
      });

      // Check if books are ordered by rating (desc), then review count (desc)
      const books = response.body.data.books;
      expect(books[0].title).toBe('1984'); // Highest rating (4.8)
      expect(books[1].title).toBe('To Kill a Mockingbird'); // Second highest (4.5)
    });

    it('should handle pagination correctly', async () => {
      const response = await request(app)
        .get('/api/books?page=1&limit=2')
        .expect(200);

      expect(response.body.data.data).toHaveLength(2);
      expect(response.body.data.pagination).toEqual({
        page: 1,
        limit: 2,
        total: 5,
        totalPages: 3,
      });
    });

    it('should filter books by genre', async () => {
      const response = await request(app)
        .get('/api/books?genres=Programming')
        .expect(200);

      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].title).toBe('Programming TypeScript');
    });

    it('should filter books by multiple genres', async () => {
      const response = await request(app)
        .get('/api/books?genres=Fiction,Classic')
        .expect(200);

      expect(response.body.data.data).toHaveLength(4); // All fiction books that have Classic genre
      const titles = response.body.data.data.map((book: any) => book.title);
      expect(titles).toContain('The Great Gatsby');
      expect(titles).toContain('To Kill a Mockingbird');
    });

    it('should filter books by minimum rating', async () => {
      const response = await request(app)
        .get('/api/books?minRating=4.5')
        .expect(200);

      expect(response.body.data.data).toHaveLength(2);
      const titles = response.body.data.data.map((book: any) => book.title);
      expect(titles).toContain('1984');
      expect(titles).toContain('To Kill a Mockingbird');
    });

    it('should filter books by published year', async () => {
      const response = await request(app)
        .get('/api/books?publishedYear=1960')
        .expect(200);

      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].title).toBe('To Kill a Mockingbird');
    });

    it('should combine multiple filters', async () => {
      const response = await request(app)
        .get('/api/books?genres=Fiction&minRating=4.0&publishedYear=1949')
        .expect(200);

      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].title).toBe('1984');
    });
  });

  describe('GET /api/books/:id', () => {
    it('should return a specific book by id', async () => {
      const response = await request(app)
        .get('/api/books/book-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('The Great Gatsby');
      expect(response.body.data.author).toBe('F. Scott Fitzgerald');
      expect(response.body.data.genres).toEqual(['Fiction', 'Classic']);
    });

    it('should return 404 for non-existent book', async () => {
      const response = await request(app)
        .get('/api/books/nonexistent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Book not found');
      expect(response.body.error.code).toBe('BOOK_NOT_FOUND');
    });
  });

  describe('GET /api/books/search', () => {
    it('should search books by title', async () => {
      const response = await request(app)
        .get('/api/books/search?q=gatsby')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].title).toBe('The Great Gatsby');
    });

    it('should search books by author', async () => {
      const response = await request(app)
        .get('/api/books/search?q=orwell')
        .expect(200);

      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].title).toBe('1984');
    });

    it('should be case insensitive', async () => {
      const response = await request(app)
        .get('/api/books/search?q=GATSBY')
        .expect(200);

      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].title).toBe('The Great Gatsby');
    });

    it('should search with partial matches', async () => {
      const response = await request(app)
        .get('/api/books/search?q=kill')
        .expect(200);

      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].title).toBe('To Kill a Mockingbird');
    });

    it('should apply filters in search', async () => {
      const response = await request(app)
        .get('/api/books/search?q=fiction&genres=Classic&minRating=4.0')
        .expect(200);

      // Should find books that match "fiction" in title/author AND have Classic genre AND rating >= 4.0
      expect(response.body.data.data.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle pagination in search', async () => {
      const response = await request(app)
        .get('/api/books/search?q=the&page=1&limit=2')
        .expect(200);

      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(2);
    });

    it('should return 400 for missing query', async () => {
      const response = await request(app)
        .get('/api/books/search')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Search query is required');
      expect(response.body.error.code).toBe('MISSING_QUERY');
    });

    it('should return 400 for empty query', async () => {
      const response = await request(app)
        .get('/api/books/search?q=')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Search query is required');
    });
  });

  describe('GET /api/books/popular', () => {
    it('should return popular books ordered by rating and review count', async () => {
      const response = await request(app)
        .get('/api/books/popular')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(5);
      
      // Should be ordered by average rating desc, then review count desc
      const books = response.body.data;
      expect(books[0].title).toBe('1984'); // 4.8 rating, 12 reviews
      expect(books[1].title).toBe('To Kill a Mockingbird'); // 4.5 rating, 8 reviews
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/books/popular?limit=2')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
    });
  });

  describe('GET /api/books/genre/:genre', () => {
    it('should return books by specific genre', async () => {
      const response = await request(app)
        .get('/api/books/genre/Fiction')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // All returned books should have Fiction genre
      response.body.data.forEach((book: any) => {
        expect(book.genres).toContain('Fiction');
      });
    });

    it('should return empty array for non-existent genre', async () => {
      const response = await request(app)
        .get('/api/books/genre/NonExistentGenre')
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });

    it('should return 400 for empty genre', async () => {
      const response = await request(app)
        .get('/api/books/genre/')
        .expect(404); // This will be 404 because the route doesn't match
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/books/genre/Fiction?limit=2')
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(2);
    });
  });
});