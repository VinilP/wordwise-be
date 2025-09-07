import { UserService } from '../../src/services/user.service';
import { UserRepository } from '../../src/repositories/user.repository';
import { BookRepository } from '../../src/repositories/book.repository';

// Mock the repositories
jest.mock('../../src/repositories/user.repository');
jest.mock('../../src/repositories/book.repository');

const MockUserRepository = UserRepository as jest.MockedClass<typeof UserRepository>;
const MockBookRepository = BookRepository as jest.MockedClass<typeof BookRepository>;

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockBookRepository: jest.Mocked<BookRepository>;

  beforeEach(() => {
    mockUserRepository = new MockUserRepository({} as any) as jest.Mocked<UserRepository>;
    mockBookRepository = new MockBookRepository({} as any) as jest.Mocked<BookRepository>;
    
    userService = new UserService(mockUserRepository, mockBookRepository);
    
    jest.clearAllMocks();
  });

  describe('getUserProfile', () => {
    it('should return user profile summary', async () => {
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed-password',
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: {
          reviews: 5,
          favorites: 3,
        },
      };

      mockUserRepository.findByIdWithCounts.mockResolvedValue(mockUser);

      const result = await userService.getUserProfile(userId);

      expect(result).toEqual({
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
        reviewCount: 5,
        favoriteCount: 3,
      });
      expect(mockUserRepository.findByIdWithCounts).toHaveBeenCalledWith(userId);
    });

    it('should throw error when user not found', async () => {
      const userId = 'non-existent-user';
      mockUserRepository.findByIdWithCounts.mockResolvedValue(null);

      await expect(userService.getUserProfile(userId)).rejects.toThrow('User not found');
    });
  });

  describe('getUserProfileWithDetails', () => {
    it('should return user profile with details', async () => {
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed-password',
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: {
          reviews: 2,
          favorites: 1,
        },
        reviews: [
          {
            id: 'review-1',
            bookId: 'book-1',
            userId: userId,
            content: 'Great book!',
            rating: 5,
            createdAt: new Date(),
            updatedAt: new Date(),
            book: {
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
          },
        ],
        favorites: [
          {
            id: 'favorite-1',
            userId: userId,
            bookId: 'book-2',
            createdAt: new Date(),
            book: {
              id: 'book-2',
              title: 'Book 2',
              author: 'Author 2',
              description: 'Description 2',
              coverImageUrl: 'https://example.com/cover2.jpg',
              genres: ['Non-Fiction'],
              publishedYear: 2022,
              averageRating: null,
              reviewCount: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
        ],
      };

      mockUserRepository.findByIdWithDetails.mockResolvedValue(mockUser);

      const result = await userService.getUserProfileWithDetails(userId);

      expect(result).toHaveProperty('id', userId);
      expect(result).toHaveProperty('email', 'test@example.com');
      expect(result).toHaveProperty('name', 'Test User');
      expect(result).toHaveProperty('reviewCount', 2);
      expect(result).toHaveProperty('favoriteCount', 1);
      expect(result).toHaveProperty('reviews');
      expect(result).toHaveProperty('favorites');
      expect(result.reviews).toHaveLength(1);
      expect(result.favorites).toHaveLength(1);
    });

    it('should throw error when user not found', async () => {
      const userId = 'non-existent-user';
      mockUserRepository.findByIdWithDetails.mockResolvedValue(null);

      await expect(userService.getUserProfileWithDetails(userId)).rejects.toThrow('User not found');
    });
  });

  describe('addToFavorites', () => {
    it('should add book to favorites', async () => {
      const userId = 'user-123';
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

      const mockFavorite = {
        id: 'favorite-123',
        userId: userId,
        bookId: bookId,
        createdAt: new Date(),
      };

      mockBookRepository.findById.mockResolvedValue(mockBook);
      mockUserRepository.createFavorite.mockResolvedValue(mockFavorite);

      const result = await userService.addToFavorites(userId, bookId);

      expect(result).toEqual(mockFavorite);
      expect(mockBookRepository.findById).toHaveBeenCalledWith(bookId);
      expect(mockUserRepository.createFavorite).toHaveBeenCalledWith(userId, bookId);
    });

    it('should throw error when book not found', async () => {
      const userId = 'user-123';
      const bookId = 'non-existent-book';

      mockBookRepository.findById.mockResolvedValue(null);

      await expect(userService.addToFavorites(userId, bookId)).rejects.toThrow('Book not found');
    });

    it('should throw error when book already in favorites', async () => {
      const userId = 'user-123';
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
      mockUserRepository.createFavorite.mockRejectedValue(new Error('Book already in favorites'));

      await expect(userService.addToFavorites(userId, bookId)).rejects.toThrow('Book already in favorites');
    });
  });

  describe('removeFromFavorites', () => {
    it('should remove book from favorites', async () => {
      const userId = 'user-123';
      const bookId = 'book-123';
      const mockFavorite = {
        id: 'favorite-123',
        userId: userId,
        bookId: bookId,
        createdAt: new Date(),
      };

      mockUserRepository.findFavorite.mockResolvedValue(mockFavorite);
      mockUserRepository.deleteFavorite.mockResolvedValue({} as any);

      await userService.removeFromFavorites(userId, bookId);

      expect(mockUserRepository.findFavorite).toHaveBeenCalledWith(userId, bookId);
      expect(mockUserRepository.deleteFavorite).toHaveBeenCalledWith(userId, bookId);
    });

    it('should handle error when removing favorite', async () => {
      const userId = 'user-123';
      const bookId = 'book-123';

      mockUserRepository.findFavorite.mockResolvedValue(null);

      await expect(userService.removeFromFavorites(userId, bookId)).rejects.toThrow('Book is not in favorites');
    });
  });

  describe('getUserFavorites', () => {
    it('should return user favorites', async () => {
      const userId = 'user-123';
      const mockFavorites = [
        {
          id: 'favorite-1',
          userId: userId,
          bookId: 'book-1',
          createdAt: new Date(),
          book: {
            id: 'book-1',
            title: 'Favorite Book 1',
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
        },
      ];

      mockUserRepository.findUserFavorites.mockResolvedValue(mockFavorites);

      const result = await userService.getUserFavorites(userId);

      expect(result).toEqual([
        {
          id: 'favorite-1',
          userId: userId,
          bookId: 'book-1',
          createdAt: mockFavorites[0].createdAt,
          book: {
            id: 'book-1',
            title: 'Favorite Book 1',
            author: 'Author 1',
            description: 'Description 1',
            coverImageUrl: 'https://example.com/cover1.jpg',
            genres: ['Fiction'],
            publishedYear: 2023,
            averageRating: 0, // Service converts null to 0
            reviewCount: 0,
            createdAt: mockFavorites[0].book.createdAt,
            updatedAt: mockFavorites[0].book.updatedAt,
          },
        },
      ]);
      expect(mockUserRepository.findUserFavorites).toHaveBeenCalledWith(userId);
    });

    it('should return empty array when no favorites', async () => {
      const userId = 'user-123';
      mockUserRepository.findUserFavorites.mockResolvedValue([]);

      const result = await userService.getUserFavorites(userId);

      expect(result).toEqual([]);
    });
  });

  describe('isBookInFavorites', () => {
    it('should return true when book is in favorites', async () => {
      const userId = 'user-123';
      const bookId = 'book-123';

      mockUserRepository.findFavorite.mockResolvedValue({
        id: 'favorite-123',
        userId: userId,
        bookId: bookId,
        createdAt: new Date(),
      });

      const result = await userService.isFavorite(userId, bookId);

      expect(result).toBe(true);
      expect(mockUserRepository.findFavorite).toHaveBeenCalledWith(userId, bookId);
    });

    it('should return false when book is not in favorites', async () => {
      const userId = 'user-123';
      const bookId = 'book-123';

      mockUserRepository.findFavorite.mockResolvedValue(null);

      const result = await userService.isFavorite(userId, bookId);

      expect(result).toBe(false);
    });
  });
});