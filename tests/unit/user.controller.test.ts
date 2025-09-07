import { Request, Response, NextFunction } from 'express';
import { UserController } from '../../src/controllers/user.controller';
import { UserService } from '../../src/services/user.service';

// Mock the UserService
jest.mock('../../src/services/user.service');

const MockedUserService = UserService as jest.MockedClass<typeof UserService>;

describe('UserController', () => {
  let userController: UserController;
  let mockUserService: jest.Mocked<UserService>;
  let mockRequest: Partial<Request> & { user?: any; params?: any };
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserService = new MockedUserService({} as any, {} as any) as jest.Mocked<UserService>;
    userController = new UserController(mockUserService);
    
    mockRequest = {
      user: {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
      },
      params: {},
    };
    
    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
    
    mockNext = jest.fn();
  });

  describe('getProfile', () => {
    it('should return user profile successfully', async () => {
      const mockProfile = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
        reviewCount: 5,
        favoriteCount: 3,
      };

      mockUserService.getUserProfile.mockResolvedValue(mockProfile);

      await userController.getProfile(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockUserService.getUserProfile).toHaveBeenCalledWith('user-1');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockProfile,
      });
    });

    it('should return 401 when user not authenticated', async () => {
      mockRequest.user = undefined;

      await userController.getProfile(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'User not authenticated',
          code: 'UNAUTHORIZED',
        },
      });
      expect(mockUserService.getUserProfile).not.toHaveBeenCalled();
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Service error');
      mockUserService.getUserProfile.mockRejectedValue(error);

      await userController.getProfile(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('addToFavorites', () => {
    it('should add book to favorites successfully', async () => {
      const mockFavorite = {
        id: 'favorite-1',
        userId: 'user-1',
        bookId: 'book-1',
        createdAt: new Date('2023-01-01'),
      };

      mockRequest.params = { bookId: 'book-1' };
      mockUserService.addToFavorites.mockResolvedValue(mockFavorite);

      await userController.addToFavorites(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockUserService.addToFavorites).toHaveBeenCalledWith('user-1', 'book-1');
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockFavorite,
      });
    });

    it('should return 400 when bookId is missing', async () => {
      mockRequest.params = {};

      await userController.addToFavorites(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Book ID is required',
          code: 'VALIDATION_ERROR',
        },
      });
      expect(mockUserService.addToFavorites).not.toHaveBeenCalled();
    });

    it('should return 404 when book not found', async () => {
      mockRequest.params = { bookId: 'book-1' };
      mockUserService.addToFavorites.mockRejectedValue(new Error('Book not found'));

      await userController.addToFavorites(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Book not found',
          code: 'BOOK_NOT_FOUND',
        },
      });
    });

    it('should return 409 when book already favorited', async () => {
      mockRequest.params = { bookId: 'book-1' };
      mockUserService.addToFavorites.mockRejectedValue(new Error('Book is already in favorites'));

      await userController.addToFavorites(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Book is already in favorites',
          code: 'ALREADY_FAVORITED',
        },
      });
    });

    it('should return 401 when user not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { bookId: 'book-1' };

      await userController.addToFavorites(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'User not authenticated',
          code: 'UNAUTHORIZED',
        },
      });
    });
  });

  describe('removeFromFavorites', () => {
    it('should remove book from favorites successfully', async () => {
      mockRequest.params = { bookId: 'book-1' };
      mockUserService.removeFromFavorites.mockResolvedValue(undefined);

      await userController.removeFromFavorites(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockUserService.removeFromFavorites).toHaveBeenCalledWith('user-1', 'book-1');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { message: 'Book removed from favorites' },
      });
    });

    it('should return 404 when book not in favorites', async () => {
      mockRequest.params = { bookId: 'book-1' };
      mockUserService.removeFromFavorites.mockRejectedValue(new Error('Book is not in favorites'));

      await userController.removeFromFavorites(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Book is not in favorites',
          code: 'NOT_FAVORITED',
        },
      });
    });

    it('should return 400 when bookId is missing', async () => {
      mockRequest.params = {};

      await userController.removeFromFavorites(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Book ID is required',
          code: 'VALIDATION_ERROR',
        },
      });
    });
  });

  describe('getFavorites', () => {
    it('should return user favorites successfully', async () => {
      const mockFavorites = [
        {
          id: 'favorite-1',
          userId: 'user-1',
          bookId: 'book-1',
          createdAt: new Date('2023-01-01'),
          book: {
            id: 'book-1',
            title: 'Test Book',
            author: 'Test Author',
            description: 'Test Description',
            coverImageUrl: 'test-cover.jpg',
            genres: ['Fiction'],
            publishedYear: 2023,
            averageRating: 4.5,
            reviewCount: 10,
            createdAt: new Date('2023-01-01'),
            updatedAt: new Date('2023-01-01'),
          },
        },
      ];

      mockUserService.getUserFavorites.mockResolvedValue(mockFavorites);

      await userController.getFavorites(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockUserService.getUserFavorites).toHaveBeenCalledWith('user-1');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockFavorites,
      });
    });

    it('should return 401 when user not authenticated', async () => {
      mockRequest.user = undefined;

      await userController.getFavorites(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'User not authenticated',
          code: 'UNAUTHORIZED',
        },
      });
    });
  });

  describe('checkFavoriteStatus', () => {
    it('should return favorite status successfully', async () => {
      mockRequest.params = { bookId: 'book-1' };
      mockUserService.isFavorite.mockResolvedValue(true);

      await userController.checkFavoriteStatus(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockUserService.isFavorite).toHaveBeenCalledWith('user-1', 'book-1');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { isFavorite: true },
      });
    });

    it('should return 400 when bookId is missing', async () => {
      mockRequest.params = {};

      await userController.checkFavoriteStatus(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Book ID is required',
          code: 'VALIDATION_ERROR',
        },
      });
    });

    it('should return 401 when user not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { bookId: 'book-1' };

      await userController.checkFavoriteStatus(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'User not authenticated',
          code: 'UNAUTHORIZED',
        },
      });
    });
  });
});