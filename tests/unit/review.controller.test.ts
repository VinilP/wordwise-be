import { Response, NextFunction } from 'express';
import { ReviewController } from '../../src/controllers/review.controller';
import { ReviewService } from '../../src/services/review.service';
import { Review, CreateReviewRequest, UpdateReviewRequest } from '../../src/types';

// Mock the ReviewService
jest.mock('../../src/services/review.service');
const MockedReviewService = ReviewService as jest.MockedClass<typeof ReviewService>;

describe('ReviewController', () => {
  let reviewController: ReviewController;
  let mockReviewService: jest.Mocked<ReviewService>;
  let mockRequest: any;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  const mockReview: Review = {
    id: 'review-1',
    bookId: 'book-1',
    userId: 'user-1',
    content: 'Great book!',
    rating: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockReviewService = new MockedReviewService({} as any, {} as any, {} as any) as jest.Mocked<ReviewService>;
    reviewController = new ReviewController(mockReviewService);

    mockRequest = {
      body: {},
      params: {},
      user: {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createReview', () => {
    const createReviewData: CreateReviewRequest = {
      bookId: 'book-1',
      content: 'Great book!',
      rating: 5,
    };

    it('should create a review successfully', async () => {
      mockRequest.body = createReviewData;
      mockReviewService.createReview.mockResolvedValue(mockReview);

      await reviewController.createReview(mockRequest, mockResponse as Response, mockNext);

      expect(mockReviewService.createReview).toHaveBeenCalledWith('user-1', createReviewData);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockReview,
      });
    });

    it('should return 401 if user is not authenticated', async () => {
      mockRequest.user = undefined;

      await reviewController.createReview(mockRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
      });
    });

    it('should return 400 if bookId is missing', async () => {
      mockRequest.body = { rating: 5 };

      await reviewController.createReview(mockRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Book ID and rating are required',
          code: 'VALIDATION_ERROR',
        },
      });
    });

    it('should return 400 if rating is missing', async () => {
      mockRequest.body = { bookId: 'book-1' };

      await reviewController.createReview(mockRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Book ID and rating are required',
          code: 'VALIDATION_ERROR',
        },
      });
    });

    it('should return 400 if rating is invalid (too low)', async () => {
      mockRequest.body = { ...createReviewData, rating: 0 };

      await reviewController.createReview(mockRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Rating must be between 1 and 5',
          code: 'VALIDATION_ERROR',
        },
      });
    });

    it('should return 400 if rating is invalid (too high)', async () => {
      mockRequest.body = { ...createReviewData, rating: 6 };

      await reviewController.createReview(mockRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Rating must be between 1 and 5',
          code: 'VALIDATION_ERROR',
        },
      });
    });

    it('should call next with error if service throws', async () => {
      mockRequest.body = createReviewData;
      const error = new Error('Service error');
      mockReviewService.createReview.mockRejectedValue(error);

      await reviewController.createReview(mockRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getReviewsByBook', () => {
    it('should get reviews by book ID successfully', async () => {
      mockRequest.params = { bookId: 'book-1' };
      const reviews = [mockReview];
      mockReviewService.getReviewsByBook.mockResolvedValue(reviews);

      await reviewController.getReviewsByBook(mockRequest, mockResponse as Response, mockNext);

      expect(mockReviewService.getReviewsByBook).toHaveBeenCalledWith('book-1');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: reviews,
      });
    });

    it('should return 400 if bookId is missing', async () => {
      mockRequest.params = {};

      await reviewController.getReviewsByBook(mockRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Book ID is required',
          code: 'VALIDATION_ERROR',
        },
      });
    });

    it('should call next with error if service throws', async () => {
      mockRequest.params = { bookId: 'book-1' };
      const error = new Error('Service error');
      mockReviewService.getReviewsByBook.mockRejectedValue(error);

      await reviewController.getReviewsByBook(mockRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getReviewsByUser', () => {
    it('should get reviews by user ID successfully', async () => {
      mockRequest.params = { userId: 'user-1' };
      const reviews = [mockReview];
      mockReviewService.getReviewsByUser.mockResolvedValue(reviews);

      await reviewController.getReviewsByUser(mockRequest, mockResponse as Response, mockNext);

      expect(mockReviewService.getReviewsByUser).toHaveBeenCalledWith('user-1');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: reviews,
      });
    });

    it('should return 400 if userId is missing', async () => {
      mockRequest.params = {};

      await reviewController.getReviewsByUser(mockRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'User ID is required',
          code: 'VALIDATION_ERROR',
        },
      });
    });
  });

  describe('getReviewById', () => {
    it('should get review by ID successfully', async () => {
      mockRequest.params = { id: 'review-1' };
      mockReviewService.getReviewById.mockResolvedValue(mockReview);

      await reviewController.getReviewById(mockRequest, mockResponse as Response, mockNext);

      expect(mockReviewService.getReviewById).toHaveBeenCalledWith('review-1');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockReview,
      });
    });

    it('should return 400 if review ID is missing', async () => {
      mockRequest.params = {};

      await reviewController.getReviewById(mockRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Review ID is required',
          code: 'VALIDATION_ERROR',
        },
      });
    });
  });

  describe('updateReview', () => {
    const updateData: UpdateReviewRequest = {
      content: 'Updated content',
      rating: 4,
    };

    it('should update review successfully', async () => {
      mockRequest.params = { id: 'review-1' };
      mockRequest.body = updateData;
      const updatedReview = { ...mockReview, ...updateData };
      mockReviewService.updateReview.mockResolvedValue(updatedReview);

      await reviewController.updateReview(mockRequest, mockResponse as Response, mockNext);

      expect(mockReviewService.updateReview).toHaveBeenCalledWith('review-1', 'user-1', updateData);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: updatedReview,
      });
    });

    it('should return 401 if user is not authenticated', async () => {
      mockRequest.user = undefined;

      await reviewController.updateReview(mockRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
      });
    });

    it('should return 400 if review ID is missing', async () => {
      mockRequest.params = {};
      mockRequest.body = updateData;

      await reviewController.updateReview(mockRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Review ID is required',
          code: 'VALIDATION_ERROR',
        },
      });
    });

    it('should return 400 if rating is invalid', async () => {
      mockRequest.params = { id: 'review-1' };
      mockRequest.body = { ...updateData, rating: 6 };

      await reviewController.updateReview(mockRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Rating must be between 1 and 5',
          code: 'VALIDATION_ERROR',
        },
      });
    });
  });

  describe('deleteReview', () => {
    it('should delete review successfully', async () => {
      mockRequest.params = { id: 'review-1' };
      mockReviewService.deleteReview.mockResolvedValue();

      await reviewController.deleteReview(mockRequest, mockResponse as Response, mockNext);

      expect(mockReviewService.deleteReview).toHaveBeenCalledWith('review-1', 'user-1');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { message: 'Review deleted successfully' },
      });
    });

    it('should return 401 if user is not authenticated', async () => {
      mockRequest.user = undefined;

      await reviewController.deleteReview(mockRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
      });
    });

    it('should return 400 if review ID is missing', async () => {
      mockRequest.params = {};

      await reviewController.deleteReview(mockRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Review ID is required',
          code: 'VALIDATION_ERROR',
        },
      });
    });
  });
});