import { Request, Response, NextFunction } from 'express';
import { RatingController } from '../../src/controllers/rating.controller';
import { RatingService } from '../../src/services/rating.service';
import { RatingRecalculationJob } from '../../src/jobs/rating-recalculation.job';
import { popularBooksService } from '../../src/services/popular-books.service';

// Mock the services and job
jest.mock('../../src/services/rating.service');
jest.mock('../../src/jobs/rating-recalculation.job');
jest.mock('../../src/services/popular-books.service');

const MockRatingService = RatingService as jest.MockedClass<typeof RatingService>;
const MockRatingRecalculationJob = RatingRecalculationJob as jest.MockedClass<typeof RatingRecalculationJob>;
const mockPopularBooksService = popularBooksService as jest.Mocked<typeof popularBooksService>;

describe('RatingController', () => {
  let controller: RatingController;
  let mockRatingService: jest.Mocked<RatingService>;
  let mockRatingJob: jest.Mocked<RatingRecalculationJob>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockRatingService = new MockRatingService({} as any, {} as any, {} as any) as jest.Mocked<RatingService>;
    mockRatingJob = new MockRatingRecalculationJob({} as any) as jest.Mocked<RatingRecalculationJob>;
    
    controller = new RatingController(mockRatingService, mockRatingJob);
    
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('getBookRatingStats', () => {
    it('should return rating statistics for a book', async () => {
      const bookId = 'book-123';
      const mockStats = {
        averageRating: 4.5,
        reviewCount: 10,
        ratingDistribution: {
          '1': 0,
          '2': 1,
          '3': 2,
          '4': 3,
          '5': 4,
        },
      };

      mockRequest.params = { bookId };
      mockRatingService.getBookRatingStats.mockResolvedValue(mockStats);

      await controller.getBookRatingStats(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRatingService.getBookRatingStats).toHaveBeenCalledWith(bookId);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats,
        message: 'Rating statistics retrieved successfully',
      });
    });

    it('should return 400 when book ID is missing', async () => {
      mockRequest.params = {};

      await controller.getBookRatingStats(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Book ID is required',
          code: 'MISSING_BOOK_ID',
        },
      });
    });

    it('should call next with error when service fails', async () => {
      const bookId = 'book-123';
      const error = new Error('Database error');

      mockRequest.params = { bookId };
      mockRatingService.getBookRatingStats.mockRejectedValue(error);

      await controller.getBookRatingStats(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('recalculateAllRatings', () => {
    it('should return success when recalculation succeeds', async () => {
      const mockResult = {
        success: true,
        processed: 100,
        duration: 5000,
        startTime: new Date('2023-01-01T00:00:00Z'),
        endTime: new Date('2023-01-01T00:00:05Z'),
        errors: [],
      };

      mockRatingJob.execute.mockResolvedValue(mockResult);

      await controller.recalculateAllRatings(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRatingJob.execute).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          processed: 100,
          duration: 5000,
          startTime: mockResult.startTime,
          endTime: mockResult.endTime,
        },
        message: 'Rating recalculation completed successfully',
      });
    });

    it('should return 207 when recalculation has errors', async () => {
      const mockResult = {
        success: false,
        processed: 95,
        duration: 5000,
        startTime: new Date('2023-01-01T00:00:00Z'),
        endTime: new Date('2023-01-01T00:00:05Z'),
        errors: ['Error processing book 1', 'Error processing book 2'],
      };

      mockRatingJob.execute.mockResolvedValue(mockResult);

      await controller.recalculateAllRatings(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(207);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          processed: 95,
          errors: ['Error processing book 1', 'Error processing book 2'],
          duration: 5000,
          startTime: mockResult.startTime,
          endTime: mockResult.endTime,
        },
        message: 'Rating recalculation completed with some errors',
      });
    });

    it('should call next with error when job fails', async () => {
      const error = new Error('Job execution failed');
      mockRatingJob.execute.mockRejectedValue(error);

      await controller.recalculateAllRatings(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getBooksWithoutReviews', () => {
    it('should return books without reviews', async () => {
      const mockBookIds = ['book-1', 'book-2', 'book-3'];
      mockRatingService.getBooksWithoutReviews.mockResolvedValue(mockBookIds);

      await controller.getBooksWithoutReviews(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRatingService.getBooksWithoutReviews).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          bookIds: mockBookIds,
          count: 3,
        },
        message: 'Books without reviews retrieved successfully',
      });
    });

    it('should return empty array when no books without reviews', async () => {
      mockRatingService.getBooksWithoutReviews.mockResolvedValue([]);

      await controller.getBooksWithoutReviews(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          bookIds: [],
          count: 0,
        },
        message: 'Books without reviews retrieved successfully',
      });
    });

    it('should call next with error when service fails', async () => {
      const error = new Error('Database connection failed');
      mockRatingService.getBooksWithoutReviews.mockRejectedValue(error);

      await controller.getBooksWithoutReviews(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('updateBookRating', () => {
    it('should update rating for a specific book', async () => {
      const bookId = 'book-123';
      mockRequest.params = { bookId };
      mockRatingService.updateBookRating.mockResolvedValue(undefined);

      await controller.updateBookRating(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRatingService.updateBookRating).toHaveBeenCalledWith(bookId);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: null,
        message: 'Book rating updated successfully',
      });
    });

    it('should return 400 when book ID is missing', async () => {
      mockRequest.params = {};

      await controller.updateBookRating(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Book ID is required',
          code: 'MISSING_BOOK_ID',
        },
      });
    });

    it('should call next with error when service fails', async () => {
      const bookId = 'book-123';
      const error = new Error('Update failed');
      mockRequest.params = { bookId };
      mockRatingService.updateBookRating.mockRejectedValue(error);

      await controller.updateBookRating(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getTopRatedBooks', () => {
    it('should return top-rated books', async () => {
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
        {
          id: 'book-2',
          title: 'Top Rated Book 2',
          author: 'Author 2',
          description: 'Description 2',
          coverImageUrl: 'https://example.com/cover2.jpg',
          genres: ['Non-Fiction'],
          publishedYear: 2022,
          averageRating: 4.8,
          reviewCount: 150,
          favoriteCount: 40,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPopularBooksService.getTopRatedBooks.mockResolvedValue(mockBooks);

      await controller.getTopRatedBooks(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockPopularBooksService.getTopRatedBooks).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockBooks,
        message: 'Top-rated books retrieved successfully',
      });
    });

    it('should return empty array when no top-rated books', async () => {
      mockPopularBooksService.getTopRatedBooks.mockResolvedValue([]);

      await controller.getTopRatedBooks(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [],
        message: 'Top-rated books retrieved successfully',
      });
    });

    it('should call next with error when service fails', async () => {
      const error = new Error('Service unavailable');
      mockPopularBooksService.getTopRatedBooks.mockRejectedValue(error);

      await controller.getTopRatedBooks(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
