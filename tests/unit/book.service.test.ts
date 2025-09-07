import { BookService } from '../../src/services/book.service';
import { BookRepository } from '../../src/repositories/book.repository';
import { RatingService } from '../../src/services/rating.service';
import { PaginationParams, BookFilters, SearchFilters } from '../../src/types';

// Mock the dependencies
jest.mock('../../src/repositories/book.repository');
jest.mock('../../src/services/rating.service');

const MockBookRepository = BookRepository as jest.MockedClass<typeof BookRepository>;
const MockRatingService = RatingService as jest.MockedClass<typeof RatingService>;

describe('BookService', () => {
  let bookService: BookService;
  let mockBookRepository: jest.Mocked<BookRepository>;
  let mockRatingService: jest.Mocked<RatingService>;

  beforeEach(() => {
    mockBookRepository = new MockBookRepository({} as any) as jest.Mocked<BookRepository>;
    mockRatingService = new MockRatingService({} as any, {} as any, {} as any) as jest.Mocked<RatingService>;
    
    bookService = new BookService(mockBookRepository, mockRatingService);
    
    jest.clearAllMocks();
  });

  describe('getAllBooks', () => {
    it('should return paginated books with default filters', async () => {
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
          averageRating: null,
          reviewCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockBookRepository.findAll.mockResolvedValue({
        books: mockBooks,
        total: 1,
      });

      const result = await bookService.getAllBooks(pagination);

      expect(result).toEqual({
        data: mockBooks,
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      });
      expect(mockBookRepository.findAll).toHaveBeenCalledWith(pagination, {});
    });

    it('should return paginated books with filters', async () => {
      const pagination: PaginationParams = { page: 1, limit: 10 };
      const filters: BookFilters = {
        genres: ['Fiction'],
        minRating: 4.0,
        publishedYear: 2023,
      };

      const mockBooks = [
        {
          id: 'book-1',
          title: 'Fiction Book',
          author: 'Author 1',
          description: 'Description 1',
          coverImageUrl: 'https://example.com/cover1.jpg',
          genres: ['Fiction'],
          publishedYear: 2023,
          averageRating: null,
          reviewCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockBookRepository.findAll.mockResolvedValue({
        books: mockBooks,
        total: 1,
      });

      const result = await bookService.getAllBooks(pagination, filters);

      expect(result.data).toEqual(mockBooks);
      expect(mockBookRepository.findAll).toHaveBeenCalledWith(pagination, filters);
    });

    it('should validate pagination parameters', async () => {
      const invalidPagination = { page: 0, limit: -1 };
      const mockBooks: any[] = [];

      mockBookRepository.findAll.mockResolvedValue({
        books: mockBooks,
        total: 0,
      });

      const result = await bookService.getAllBooks(invalidPagination);

      expect(result.pagination.page).toBe(1); // Should default to 1
      expect(result.pagination.limit).toBe(1); // Should be corrected to 1 (Math.max(1, -1))
    });
  });

  describe('getBookById', () => {
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
        averageRating: null,
        reviewCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockBookRepository.findById.mockResolvedValue(mockBook);

      const result = await bookService.getBookById(bookId);

      expect(result).toEqual(mockBook);
      expect(mockBookRepository.findById).toHaveBeenCalledWith(bookId);
    });

    it('should throw error for invalid book ID', async () => {
      await expect(bookService.getBookById('')).rejects.toThrow('Invalid book ID provided');
      await expect(bookService.getBookById(null as any)).rejects.toThrow('Invalid book ID provided');
      await expect(bookService.getBookById(undefined as any)).rejects.toThrow('Invalid book ID provided');
    });

    it('should return null for non-existent book', async () => {
      const bookId = 'non-existent-book';
      mockBookRepository.findById.mockResolvedValue(null);

      const result = await bookService.getBookById(bookId);

      expect(result).toBeNull();
    });
  });

  describe('searchBooks', () => {
    it('should search books with valid query', async () => {
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
          averageRating: null,
          reviewCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockBookRepository.search.mockResolvedValue({
        books: mockBooks,
        total: 1,
      });

      const result = await bookService.searchBooks(query, pagination, filters);

      expect(result.data).toEqual(mockBooks);
      expect(mockBookRepository.search).toHaveBeenCalledWith('test query', pagination, filters);
    });

    it('should throw error for empty search query', async () => {
      const pagination: PaginationParams = { page: 1, limit: 10 };

      await expect(bookService.searchBooks('', pagination)).rejects.toThrow('Search query is required');
      await expect(bookService.searchBooks('   ', pagination)).rejects.toThrow('Search query is required');
      await expect(bookService.searchBooks(null as any, pagination)).rejects.toThrow('Search query is required');
    });

    it('should trim search query', async () => {
      const query = '  test query  ';
      const pagination: PaginationParams = { page: 1, limit: 10 };

      mockBookRepository.search.mockResolvedValue({
        books: [],
        total: 0,
      });

      await bookService.searchBooks(query, pagination);

      expect(mockBookRepository.search).toHaveBeenCalledWith('test query', pagination, {});
    });
  });

  describe('getBooksByGenre', () => {
    it('should return books by genre', async () => {
      const genre = 'Fiction';
      const pagination: PaginationParams = { page: 1, limit: 10 };

      const mockBooks = [
        {
          id: 'book-1',
          title: 'Fiction Book',
          author: 'Author 1',
          description: 'Description 1',
          coverImageUrl: 'https://example.com/cover1.jpg',
          genres: ['Fiction'],
          publishedYear: 2023,
          averageRating: null,
          reviewCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockBookRepository.getBooksByGenre.mockResolvedValue(mockBooks);

      const result = await bookService.getBooksByGenre(genre, 10);

      expect(result).toEqual(mockBooks);
      expect(mockBookRepository.getBooksByGenre).toHaveBeenCalledWith(genre, 10);
    });

    it('should throw error for empty genre', async () => {
      const pagination: PaginationParams = { page: 1, limit: 10 };

      await expect(bookService.getBooksByGenre('', 10)).rejects.toThrow('Genre is required');
      await expect(bookService.getBooksByGenre(null as any, 10)).rejects.toThrow('Genre is required');
    });
  });

  describe('validatePagination', () => {
    it('should validate and correct pagination parameters', () => {
      const invalidPagination = { page: 0, limit: -1 };
      const result = (bookService as any).validatePagination(invalidPagination);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(1);
    });

    it('should keep valid pagination parameters', () => {
      const validPagination = { page: 2, limit: 20 };
      const result = (bookService as any).validatePagination(validPagination);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(20);
    });

    it('should enforce maximum limit', () => {
      const paginationWithHighLimit = { page: 1, limit: 1000 };
      const result = (bookService as any).validatePagination(paginationWithHighLimit);

      expect(result.limit).toBe(100); // Should be capped at 100
    });
  });

  describe('createPaginatedResponse', () => {
    it('should create paginated response correctly', () => {
      const books = [
        {
          id: 'book-1',
          title: 'Book 1',
          author: 'Author 1',
          description: 'Description 1',
          coverImageUrl: 'https://example.com/cover1.jpg',
          genres: ['Fiction'],
          publishedYear: 2023,
          averageRating: null,
          reviewCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const pagination = { page: 1, limit: 10 };
      const total = 25;

      const result = (bookService as any).createPaginatedResponse(books, pagination, total);

      expect(result).toEqual({
        data: books,
        pagination: {
          page: 1,
          limit: 10,
          total: 25,
          totalPages: 3, // Math.ceil(25/10) = 3
        },
      });
    });
  });
});