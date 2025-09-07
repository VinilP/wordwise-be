import { PrismaClient } from '@prisma/client';
import { BookRepository } from '../../src/repositories/book.repository';
import { PaginationParams, BookFilters, SearchFilters } from '../../src/types';

// Mock Prisma
const mockPrisma = {
  book: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
} as any;

describe('BookRepository', () => {
  let bookRepository: BookRepository;

  beforeEach(() => {
    bookRepository = new BookRepository(mockPrisma);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return books with all filters', async () => {
      const pagination: PaginationParams = { page: 1, limit: 10 };
      const filters: BookFilters = { genres: ['Fiction'], minRating: 4.0, publishedYear: 2023 };
      const mockBooks = [{ id: 'book-1', title: 'Book', author: '', description: '', coverImageUrl: '', genres: ['Fiction'], publishedYear: 2023, averageRating: 4.5, reviewCount: 1, createdAt: new Date(), updatedAt: new Date() }];
      mockPrisma.book.findMany.mockResolvedValue(mockBooks);
      mockPrisma.book.count.mockResolvedValue(1);
      const result = await bookRepository.findAll(pagination, filters);
      expect(result).toEqual({ books: mockBooks, total: 1 });
      expect(mockPrisma.book.findMany).toHaveBeenCalledWith({
        where: {
          genres: { hasSome: ['Fiction'] },
          averageRating: { gte: 4.0 },
          publishedYear: 2023,
        },
        skip: 0,
        take: 10,
        orderBy: [
          { averageRating: 'desc' },
          { reviewCount: 'desc' },
          { title: 'asc' },
        ],
      });
    });
    it('should update rating with provided values', async () => {
      mockPrisma.book.update.mockResolvedValue({});
      await bookRepository.updateRating('book-1', 4.5, 2);
      expect(mockPrisma.book.update).toHaveBeenCalledWith({
        where: { id: 'book-1' },
        data: { averageRating: 4.5, reviewCount: 2 },
      });
    });
    it('should update rating by calculating from db if values not provided', async () => {
      mockPrisma.review = { aggregate: jest.fn().mockResolvedValue({ _avg: { rating: 3 }, _count: { rating: 1 } }) };
      mockPrisma.book.update.mockResolvedValue({});
      await bookRepository.updateRating('book-1');
      expect(mockPrisma.review.aggregate).toHaveBeenCalledWith({ where: { bookId: 'book-1' }, _avg: { rating: true }, _count: { rating: true } });
      expect(mockPrisma.book.update).toHaveBeenCalledWith({ where: { id: 'book-1' }, data: { averageRating: 3, reviewCount: 1 } });
    });
    it('should return books with pagination and no filters', async () => {
      const pagination: PaginationParams = { page: 1, limit: 10 };
      const mockBooks = [
        {
          id: 'book-1',
          title: 'Book 1',
          author: 'Author 1',
          description: 'Description 1',
          coverImageUrl: 'https://example.com/cover1.jpg',
          genres: ['Fiction'],
          publishedYear: 2023,
          averageRating: 4.5,
          reviewCount: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'book-2',
          title: 'Book 2',
          author: 'Author 2',
          description: 'Description 2',
          coverImageUrl: 'https://example.com/cover2.jpg',
          genres: ['Non-Fiction'],
          publishedYear: 2022,
          averageRating: 4.2,
          reviewCount: 8,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.book.findMany.mockResolvedValue(mockBooks);
      mockPrisma.book.count.mockResolvedValue(2);

      const result = await bookRepository.findAll(pagination);

      expect(result).toEqual({ books: mockBooks, total: 2 });
      expect(mockPrisma.book.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        orderBy: [
          { averageRating: 'desc' },
          { reviewCount: 'desc' },
          { title: 'asc' },
        ],
      });
      expect(mockPrisma.book.count).toHaveBeenCalledWith({ where: {} });
    });

    it('should return books with genre filter', async () => {
      const pagination: PaginationParams = { page: 1, limit: 10 };
      const filters: BookFilters = { genres: ['Fiction', 'Mystery'] };
      const mockBooks = [
        {
          id: 'book-1',
          title: 'Fiction Book',
          author: 'Author 1',
          description: 'Description 1',
          coverImageUrl: 'https://example.com/cover1.jpg',
          genres: ['Fiction'],
          publishedYear: 2023,
          averageRating: 4.5,
          reviewCount: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.book.findMany.mockResolvedValue(mockBooks);
      mockPrisma.book.count.mockResolvedValue(1);

      const result = await bookRepository.findAll(pagination, filters);

      expect(result).toEqual({ books: mockBooks, total: 1 });
      expect(mockPrisma.book.findMany).toHaveBeenCalledWith({
        where: {
          genres: {
            hasSome: ['Fiction', 'Mystery'],
          },
        },
        skip: 0,
        take: 10,
        orderBy: [
          { averageRating: 'desc' },
          { reviewCount: 'desc' },
          { title: 'asc' },
        ],
      });
    });

    it('should return books with minimum rating filter', async () => {
      const pagination: PaginationParams = { page: 1, limit: 10 };
      const filters: BookFilters = { minRating: 4.0 };
      const mockBooks = [
        {
          id: 'book-1',
          title: 'High Rated Book',
          author: 'Author 1',
          description: 'Description 1',
          coverImageUrl: 'https://example.com/cover1.jpg',
          genres: ['Fiction'],
          publishedYear: 2023,
          averageRating: 4.5,
          reviewCount: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.book.findMany.mockResolvedValue(mockBooks);
      mockPrisma.book.count.mockResolvedValue(1);

      const result = await bookRepository.findAll(pagination, filters);

      expect(result).toEqual({ books: mockBooks, total: 1 });
      expect(mockPrisma.book.findMany).toHaveBeenCalledWith({
        where: {
          averageRating: {
            gte: 4.0,
          },
        },
        skip: 0,
        take: 10,
        orderBy: [
          { averageRating: 'desc' },
          { reviewCount: 'desc' },
          { title: 'asc' },
        ],
      });
    });

    it('should return books with published year filter', async () => {
      const pagination: PaginationParams = { page: 1, limit: 10 };
      const filters: BookFilters = { publishedYear: 2023 };
      const mockBooks = [
        {
          id: 'book-1',
          title: '2023 Book',
          author: 'Author 1',
          description: 'Description 1',
          coverImageUrl: 'https://example.com/cover1.jpg',
          genres: ['Fiction'],
          publishedYear: 2023,
          averageRating: 4.5,
          reviewCount: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.book.findMany.mockResolvedValue(mockBooks);
      mockPrisma.book.count.mockResolvedValue(1);

      const result = await bookRepository.findAll(pagination, filters);

      expect(result).toEqual({ books: mockBooks, total: 1 });
      expect(mockPrisma.book.findMany).toHaveBeenCalledWith({
        where: {
          publishedYear: 2023,
        },
        skip: 0,
        take: 10,
        orderBy: [
          { averageRating: 'desc' },
          { reviewCount: 'desc' },
          { title: 'asc' },
        ],
      });
    });

    it('should return books with multiple filters', async () => {
      const pagination: PaginationParams = { page: 2, limit: 5 };
      const filters: BookFilters = {
        genres: ['Fiction'],
        minRating: 4.0,
        publishedYear: 2023,
      };
      const mockBooks = [
        {
          id: 'book-1',
          title: 'Filtered Book',
          author: 'Author 1',
          description: 'Description 1',
          coverImageUrl: 'https://example.com/cover1.jpg',
          genres: ['Fiction'],
          publishedYear: 2023,
          averageRating: 4.5,
          reviewCount: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.book.findMany.mockResolvedValue(mockBooks);
      mockPrisma.book.count.mockResolvedValue(1);

      const result = await bookRepository.findAll(pagination, filters);

      expect(result).toEqual({ books: mockBooks, total: 1 });
      expect(mockPrisma.book.findMany).toHaveBeenCalledWith({
        where: {
          genres: {
            hasSome: ['Fiction'],
          },
          averageRating: {
            gte: 4.0,
          },
          publishedYear: 2023,
        },
        skip: 5, // (page - 1) * limit = (2 - 1) * 5 = 5
        take: 5,
        orderBy: [
          { averageRating: 'desc' },
          { reviewCount: 'desc' },
          { title: 'asc' },
        ],
      });
    });

    it('should handle empty results', async () => {
      const pagination: PaginationParams = { page: 1, limit: 10 };
      const filters: BookFilters = { genres: ['Non-existent Genre'] };

      mockPrisma.book.findMany.mockResolvedValue([]);
      mockPrisma.book.count.mockResolvedValue(0);

      const result = await bookRepository.findAll(pagination, filters);

      expect(result).toEqual({ books: [], total: 0 });
    });
  });

  describe('findById', () => {
    it('should return book by ID', async () => {
      const bookId = 'book-123';
      const mockBook = {
        id: bookId,
        title: 'Test Book',
        author: 'Test Author',
        description: 'Test Description',
        coverImageUrl: 'https://example.com/cover.jpg',
        genres: ['Fiction'],
        publishedYear: 2023,
        averageRating: 4.5,
        reviewCount: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.book.findUnique.mockResolvedValue(mockBook);

      const result = await bookRepository.findById(bookId);

      expect(result).toEqual(mockBook);
      expect(mockPrisma.book.findUnique).toHaveBeenCalledWith({
        where: { id: bookId },
      });
    });

    it('should return null for non-existent book', async () => {
      const bookId = 'non-existent-book';
      mockPrisma.book.findUnique.mockResolvedValue(null);

      const result = await bookRepository.findById(bookId);

      expect(result).toBeNull();
    });
  });

  describe('search', () => {
    it('should search books by query', async () => {
      const query = 'test query';
      const pagination: PaginationParams = { page: 1, limit: 10 };
      const filters: SearchFilters = { genres: ['Fiction'] };
      const mockBooks = [
        {
          id: 'book-1',
          title: 'Test Book',
          author: 'Test Author',
          description: 'Test Description',
          coverImageUrl: 'https://example.com/cover.jpg',
          genres: ['Fiction'],
          publishedYear: 2023,
          averageRating: 4.5,
          reviewCount: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.book.findMany.mockResolvedValue(mockBooks);
      mockPrisma.book.count.mockResolvedValue(1);

      const result = await bookRepository.search(query, pagination, filters);

      expect(result).toEqual({ books: mockBooks, total: 1 });
      expect(mockPrisma.book.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { author: { contains: query, mode: 'insensitive' } },
          ],
          genres: {
            hasSome: ['Fiction'],
          },
        },
        skip: 0,
        take: 10,
        orderBy: [
          { averageRating: 'desc' },
          { reviewCount: 'desc' },
          { title: 'asc' },
        ],
      });
    });

    it('should search books with multiple filters', async () => {
      const query = 'mystery';
      const pagination: PaginationParams = { page: 1, limit: 10 };
      const filters: SearchFilters = {
        genres: ['Mystery'],
        minRating: 4.0,
        publishedYear: 2023,
      };
      const mockBooks = [
        {
          id: 'book-1',
          title: 'Mystery Book',
          author: 'Mystery Author',
          description: 'A great mystery',
          coverImageUrl: 'https://example.com/cover.jpg',
          genres: ['Mystery'],
          publishedYear: 2023,
          averageRating: 4.5,
          reviewCount: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.book.findMany.mockResolvedValue(mockBooks);
      mockPrisma.book.count.mockResolvedValue(1);

      const result = await bookRepository.search(query, pagination, filters);

      expect(result).toEqual({ books: mockBooks, total: 1 });
      expect(mockPrisma.book.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { author: { contains: query, mode: 'insensitive' } },
          ],
          genres: {
            hasSome: ['Mystery'],
          },
          averageRating: {
            gte: 4.0,
          },
          publishedYear: 2023,
        },
        skip: 0,
        take: 10,
        orderBy: [
          { averageRating: 'desc' },
          { reviewCount: 'desc' },
          { title: 'asc' },
        ],
      });
    });

    it('should handle empty search results', async () => {
      const query = 'non-existent book';
      const pagination: PaginationParams = { page: 1, limit: 10 };

      mockPrisma.book.findMany.mockResolvedValue([]);
      mockPrisma.book.count.mockResolvedValue(0);

      const result = await bookRepository.search(query, pagination);

      expect(result).toEqual({ books: [], total: 0 });
    });
  });


  describe('update', () => {
    it('should update book', async () => {
      const bookId = 'book-123';
      const updateData = {
        title: 'Updated Book Title',
        description: 'Updated description',
      };
      const mockUpdatedBook = {
        id: bookId,
        title: 'Updated Book',
        author: 'Updated Author',
        description: 'Updated Description',
        coverImageUrl: 'https://example.com/cover.jpg',
        genres: ['Fiction'],
        publishedYear: 2023,
        averageRating: 4.5,
        reviewCount: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.book.update.mockResolvedValue(mockUpdatedBook);

      const result = await bookRepository.update(bookId, updateData);

      expect(result).toEqual(mockUpdatedBook);
      expect(mockPrisma.book.update).toHaveBeenCalledWith({
        where: { id: bookId },
        data: updateData,
      });
    });
  });
});