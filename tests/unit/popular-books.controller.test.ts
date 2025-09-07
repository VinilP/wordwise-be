import { Request, Response } from 'express';
import { PopularBooksController } from '../../src/controllers/popular-books.controller';
import { popularBooksService } from '../../src/services/popular-books.service';

// Mock the popular books service
jest.mock('../../src/services/popular-books.service');

const mockPopularBooksService = popularBooksService as jest.Mocked<typeof popularBooksService>;

describe('PopularBooksController', () => {
  let controller: PopularBooksController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    controller = new PopularBooksController();
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    
    // Clear all mocks
    jest.clearAllMocks();
    
    // Mock console.log to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getPopularBooks', () => {
    it('should return popular books successfully', async () => {
      const mockBooks = [
        {
          id: 'book-1',
          title: 'Popular Book 1',
          author: 'Author 1',
          description: 'Description 1',
          coverImageUrl: 'https://example.com/cover1.jpg',
          genres: ['Fiction'],
          publishedYear: 2023,
          averageRating: 4.5,
          reviewCount: 100,
          favoriteCount: 25,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'book-2',
          title: 'Popular Book 2',
          author: 'Author 2',
          description: 'Description 2',
          coverImageUrl: 'https://example.com/cover2.jpg',
          genres: ['Non-Fiction'],
          publishedYear: 2022,
          averageRating: 4.2,
          reviewCount: 80,
          favoriteCount: 15,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPopularBooksService.getPopularBooks.mockResolvedValue(mockBooks);

      await controller.getPopularBooks(mockRequest as Request, mockResponse as Response);

      expect(mockPopularBooksService.getPopularBooks).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          books: mockBooks,
          message: 'Found 2 popular books',
        },
      });
    });

    it('should return empty array when no popular books found', async () => {
      mockPopularBooksService.getPopularBooks.mockResolvedValue([]);

      await controller.getPopularBooks(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          books: [],
          message: 'Found 0 popular books',
        },
      });
    });

    it('should handle service error', async () => {
      const error = new Error('Database connection failed');
      mockPopularBooksService.getPopularBooks.mockRejectedValue(error);

      await controller.getPopularBooks(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Database connection failed',
          code: 'POPULAR_BOOKS_ERROR',
        },
      });
    });

    it('should handle service error without message', async () => {
      const error = new Error();
      mockPopularBooksService.getPopularBooks.mockRejectedValue(error);

      await controller.getPopularBooks(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Failed to fetch popular books',
          code: 'POPULAR_BOOKS_ERROR',
        },
      });
    });
  });

  describe('getTopRatedBooks', () => {
    it('should return top-rated books successfully', async () => {
      const mockBooks = [
        {
          id: 'book-1',
          title: 'Top Rated Book 1',
          author: 'Author 1',
          description: 'Description 1',
          coverImageUrl: 'https://example.com/cover1.jpg',
          genres: ['Fiction'],
          publishedYear: 2023,
          averageRating: 4.9,
          reviewCount: 200,
          favoriteCount: 50,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPopularBooksService.getTopRatedBooks.mockResolvedValue(mockBooks);

      await controller.getTopRatedBooks(mockRequest as Request, mockResponse as Response);

      expect(mockPopularBooksService.getTopRatedBooks).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          books: mockBooks,
          message: 'Found 1 top-rated books',
        },
      });
    });

    it('should return empty array when no top-rated books found', async () => {
      mockPopularBooksService.getTopRatedBooks.mockResolvedValue([]);

      await controller.getTopRatedBooks(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          books: [],
          message: 'Found 0 top-rated books',
        },
      });
    });

    it('should handle service error', async () => {
      const error = new Error('Service unavailable');
      mockPopularBooksService.getTopRatedBooks.mockRejectedValue(error);

      await controller.getTopRatedBooks(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Service unavailable',
          code: 'TOP_RATED_BOOKS_ERROR',
        },
      });
    });

    it('should handle service error without message', async () => {
      const error = new Error();
      mockPopularBooksService.getTopRatedBooks.mockRejectedValue(error);

      await controller.getTopRatedBooks(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Failed to fetch top-rated books',
          code: 'TOP_RATED_BOOKS_ERROR',
        },
      });
    });
  });

  describe('getMostExploredBooks', () => {
    it('should return most explored books successfully', async () => {
      const mockBooks = [
        {
          id: 'book-1',
          title: 'Most Explored Book 1',
          author: 'Author 1',
          description: 'Description 1',
          coverImageUrl: 'https://example.com/cover1.jpg',
          genres: ['Fiction'],
          publishedYear: 2023,
          averageRating: 4.3,
          reviewCount: 150,
          favoriteCount: 30,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'book-2',
          title: 'Most Explored Book 2',
          author: 'Author 2',
          description: 'Description 2',
          coverImageUrl: 'https://example.com/cover2.jpg',
          genres: ['Non-Fiction'],
          publishedYear: 2022,
          averageRating: 4.1,
          reviewCount: 120,
          favoriteCount: 20,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPopularBooksService.getMostExploredBooks.mockResolvedValue(mockBooks);

      await controller.getMostExploredBooks(mockRequest as Request, mockResponse as Response);

      expect(mockPopularBooksService.getMostExploredBooks).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          books: mockBooks,
          message: 'Found 2 most explored books',
        },
      });
    });

    it('should return empty array when no most explored books found', async () => {
      mockPopularBooksService.getMostExploredBooks.mockResolvedValue([]);

      await controller.getMostExploredBooks(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          books: [],
          message: 'Found 0 most explored books',
        },
      });
    });

    it('should handle service error', async () => {
      const error = new Error('Cache miss');
      mockPopularBooksService.getMostExploredBooks.mockRejectedValue(error);

      await controller.getMostExploredBooks(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Cache miss',
          code: 'MOST_EXPLORED_BOOKS_ERROR',
        },
      });
    });

    it('should handle service error without message', async () => {
      const error = new Error();
      mockPopularBooksService.getMostExploredBooks.mockRejectedValue(error);

      await controller.getMostExploredBooks(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Failed to fetch most explored books',
          code: 'MOST_EXPLORED_BOOKS_ERROR',
        },
      });
    });
  });
});
