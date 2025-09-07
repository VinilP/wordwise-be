import { Request, Response, NextFunction } from 'express';
import { BookController } from '../../src/controllers/book.controller';
import { BookService } from '../../src/services/book.service';
import { PaginatedResponse, ApiResponse } from '../../src/types';

// Mock BookService
const mockBookService = {
  getAllBooks: jest.fn(),
  getBookById: jest.fn(),
  searchBooks: jest.fn(),
  getPopularBooks: jest.fn(),
  getBooksByGenre: jest.fn(),
  validateFilters: jest.fn(),
} as unknown as BookService;

// Mock Express objects
const mockRequest = (query: any = {}, params: any = {}) => ({
  query,
  params,
}) as Request;

const mockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn() as NextFunction;

describe('BookController', () => {
  let bookController: BookController;

  beforeEach(() => {
    bookController = new BookController(mockBookService);
    jest.clearAllMocks();
  });

  describe('getAllBooks', () => {
    it('should return paginated books successfully', async () => {
      const req = mockRequest({ page: '1', limit: '10' });
      const res = mockResponse();
      const mockResult: PaginatedResponse<any> = {
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      };

      (mockBookService.validateFilters as jest.Mock).mockReturnValue({});
      (mockBookService.getAllBooks as jest.Mock).mockResolvedValue(mockResult);

      await bookController.getAllBooks(req, res, mockNext);

      expect(mockBookService.getAllBooks).toHaveBeenCalledWith(
        { page: 1, limit: 10 },
        {}
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
      });
    });

    it('should handle filters correctly', async () => {
      const req = mockRequest({
        page: '1',
        limit: '10',
        genres: 'Fiction,Drama',
        minRating: '4.0',
        publishedYear: '2020',
      });
      const res = mockResponse();
      const mockResult: PaginatedResponse<any> = {
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      };

      const validatedFilters = {
        genres: ['Fiction', 'Drama'],
        minRating: 4.0,
        publishedYear: 2020,
      };

      (mockBookService.validateFilters as jest.Mock).mockReturnValue(validatedFilters);
      (mockBookService.getAllBooks as jest.Mock).mockResolvedValue(mockResult);

      await bookController.getAllBooks(req, res, mockNext);

      expect(mockBookService.validateFilters).toHaveBeenCalledWith({
        genres: ['Fiction', 'Drama'],
        minRating: 4.0,
        publishedYear: 2020,
      });
      expect(mockBookService.getAllBooks).toHaveBeenCalledWith(
        { page: 1, limit: 10 },
        validatedFilters
      );
    });

    it('should handle errors', async () => {
      const req = mockRequest();
      const res = mockResponse();
      const error = new Error('Service error');

      (mockBookService.validateFilters as jest.Mock).mockReturnValue({});
      (mockBookService.getAllBooks as jest.Mock).mockRejectedValue(error);

      await bookController.getAllBooks(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getBookById', () => {
    it('should return book when found', async () => {
      const req = mockRequest({}, { id: 'book-1' });
      const res = mockResponse();
      const mockBook = { id: 'book-1', title: 'Test Book' };

      (mockBookService.getBookById as jest.Mock).mockResolvedValue(mockBook);

      await bookController.getBookById(req, res, mockNext);

      expect(mockBookService.getBookById).toHaveBeenCalledWith('book-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockBook,
      });
    });

    it('should return 404 when book not found', async () => {
      const req = mockRequest({}, { id: 'nonexistent' });
      const res = mockResponse();

      (mockBookService.getBookById as jest.Mock).mockResolvedValue(null);

      await bookController.getBookById(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Book not found',
          code: 'BOOK_NOT_FOUND',
        },
      });
    });

    it('should handle errors', async () => {
      const req = mockRequest({}, { id: 'book-1' });
      const res = mockResponse();
      const error = new Error('Service error');

      (mockBookService.getBookById as jest.Mock).mockRejectedValue(error);

      await bookController.getBookById(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('searchBooks', () => {
    it('should search books successfully', async () => {
      const req = mockRequest({ q: 'test query', page: '1', limit: '10' });
      const res = mockResponse();
      const mockResult: PaginatedResponse<any> = {
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      };

      (mockBookService.validateFilters as jest.Mock).mockReturnValue({});
      (mockBookService.searchBooks as jest.Mock).mockResolvedValue(mockResult);

      await bookController.searchBooks(req, res, mockNext);

      expect(mockBookService.searchBooks).toHaveBeenCalledWith(
        'test query',
        { page: 1, limit: 10 },
        {}
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 for missing query', async () => {
      const req = mockRequest({});
      const res = mockResponse();

      await bookController.searchBooks(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Search query is required',
          code: 'MISSING_QUERY',
        },
      });
    });

    it('should return 400 for empty query', async () => {
      const req = mockRequest({ q: '' });
      const res = mockResponse();

      await bookController.searchBooks(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Search query is required',
          code: 'MISSING_QUERY',
        },
      });
    });
  });

  describe('getPopularBooks', () => {
    it('should return popular books', async () => {
      const req = mockRequest({ limit: '5' });
      const res = mockResponse();
      const mockBooks = [{ id: 'book-1', title: 'Popular Book' }];

      (mockBookService.getPopularBooks as jest.Mock).mockResolvedValue(mockBooks);

      await bookController.getPopularBooks(req, res, mockNext);

      expect(mockBookService.getPopularBooks).toHaveBeenCalledWith(5);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockBooks,
      });
    });

    it('should use default limit when not provided', async () => {
      const req = mockRequest({});
      const res = mockResponse();
      const mockBooks: any[] = [];

      (mockBookService.getPopularBooks as jest.Mock).mockResolvedValue(mockBooks);

      await bookController.getPopularBooks(req, res, mockNext);

      expect(mockBookService.getPopularBooks).toHaveBeenCalledWith(10);
    });
  });

  describe('getBooksByGenre', () => {
    it('should return books by genre', async () => {
      const req = mockRequest({ limit: '5' }, { genre: 'Fiction' });
      const res = mockResponse();
      const mockBooks = [{ id: 'book-1', title: 'Fiction Book' }];

      (mockBookService.getBooksByGenre as jest.Mock).mockResolvedValue(mockBooks);

      await bookController.getBooksByGenre(req, res, mockNext);

      expect(mockBookService.getBooksByGenre).toHaveBeenCalledWith('Fiction', 5);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockBooks,
      });
    });

    it('should return 400 for empty genre', async () => {
      const req = mockRequest({}, { genre: '' });
      const res = mockResponse();

      await bookController.getBooksByGenre(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Genre parameter is required',
          code: 'MISSING_GENRE',
        },
      });
    });
  });
});