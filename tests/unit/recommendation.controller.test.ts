import { Request, Response } from 'express';
import recommendationController from '../../src/controllers/recommendation.controller';
import recommendationService from '../../src/services/recommendation.service';

// Mock the recommendation service
jest.mock('../../src/services/recommendation.service');

const mockRecommendationService = recommendationService as jest.Mocked<typeof recommendationService>;

describe('RecommendationController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('getRecommendations', () => {
    it('should return recommendations for authenticated user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockRecommendations = [
        {
          book: {
            id: 'book-1',
            title: 'Recommended Book 1',
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
          reason: 'Based on your reading history',
          confidence: 0.85,
        },
        {
          book: {
            id: 'book-2',
            title: 'Recommended Book 2',
            author: 'Author 2',
            description: 'Description 2',
            coverImageUrl: 'https://example.com/cover2.jpg',
            genres: ['Non-Fiction'],
            publishedYear: 2022,
            averageRating: 4.2,
            reviewCount: 5,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          reason: 'Similar to your favorites',
          confidence: 0.75,
        },
      ];

      mockRequest.user = mockUser;
      mockRecommendationService.getPersonalizedRecommendations.mockResolvedValue(mockRecommendations);

      await recommendationController.getRecommendations(mockRequest as any, mockResponse as Response);

      expect(mockRecommendationService.getPersonalizedRecommendations).toHaveBeenCalledWith('user-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          recommendations: mockRecommendations,
          message: 'Found 2 personalized recommendations',
        },
      });
    });

    it('should return no recommendations message when empty array', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.user = mockUser;
      mockRecommendationService.getPersonalizedRecommendations.mockResolvedValue([]);

      await recommendationController.getRecommendations(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          recommendations: [],
          message: 'No recommendations available. Try reviewing some books or adding books to your favorites first!',
        },
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await recommendationController.getRecommendations(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
      });
    });

    it('should handle rate limit exceeded error', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.user = mockUser;
      const rateLimitError = new Error('Rate limit exceeded');
      mockRecommendationService.getPersonalizedRecommendations.mockRejectedValue(rateLimitError);

      await recommendationController.getRecommendations(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Too many requests. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
        },
      });
    });

    it('should handle OpenAI API key error', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.user = mockUser;
      const apiKeyError = new Error('Invalid OpenAI API key');
      mockRecommendationService.getPersonalizedRecommendations.mockRejectedValue(apiKeyError);

      await recommendationController.getRecommendations(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Recommendation service temporarily unavailable',
          code: 'SERVICE_UNAVAILABLE',
        },
      });
    });

    it('should handle general error', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.user = mockUser;
      const generalError = new Error('Something went wrong');
      mockRecommendationService.getPersonalizedRecommendations.mockRejectedValue(generalError);

      await recommendationController.getRecommendations(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Failed to get recommendations',
          code: 'INTERNAL_SERVER_ERROR',
          details: 'Something went wrong',
        },
      });

      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should not include error details in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.user = mockUser;
      const generalError = new Error('Something went wrong');
      mockRecommendationService.getPersonalizedRecommendations.mockRejectedValue(generalError);

      await recommendationController.getRecommendations(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Failed to get recommendations',
          code: 'INTERNAL_SERVER_ERROR',
          details: undefined,
        },
      });

      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('clearCache', () => {
    it('should clear cache for authenticated user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.user = mockUser;
      mockRecommendationService.clearUserCache.mockImplementation(() => {});

      await recommendationController.clearCache(mockRequest as any, mockResponse as Response);

      expect(mockRecommendationService.clearUserCache).toHaveBeenCalledWith('user-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          message: 'Recommendation cache cleared successfully',
        },
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await recommendationController.clearCache(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
      });
    });

    it('should handle error when clearing cache fails', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.user = mockUser;
      mockRecommendationService.clearUserCache.mockImplementation(() => {
        throw new Error('Cache clear failed');
      });

      await recommendationController.clearCache(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Failed to clear recommendation cache',
          code: 'INTERNAL_SERVER_ERROR',
        },
      });
    });
  });
});