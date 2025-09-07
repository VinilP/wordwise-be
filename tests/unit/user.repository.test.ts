import { PrismaClient } from '@prisma/client';
import { UserRepository } from '../../src/repositories/user.repository';

// Mock Prisma
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },
  userFavorite: {
    create: jest.fn(),
    delete: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
} as any;

describe('UserRepository', () => {
  let userRepository: UserRepository;

  beforeEach(() => {
    userRepository = new UserRepository(mockPrisma);
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return user by ID', async () => {
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed-password',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await userRepository.findById(userId);

      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });

    it('should return null for non-existent user', async () => {
      const userId = 'non-existent-user';
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await userRepository.findById(userId);

      expect(result).toBeNull();
    });
  });

  describe('findByIdWithCounts', () => {
    it('should return user with counts', async () => {
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

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await userRepository.findByIdWithCounts(userId);

      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        include: {
          _count: {
            select: {
              reviews: true,
              favorites: true,
            },
          },
        },
      });
    });

    it('should return null for non-existent user', async () => {
      const userId = 'non-existent-user';
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await userRepository.findByIdWithCounts(userId);

      expect(result).toBeNull();
    });
  });

  describe('findByIdWithDetails', () => {
    it('should return user with details', async () => {
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed-password',
        createdAt: new Date(),
        updatedAt: new Date(),
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
              averageRating: 4.5,
              reviewCount: 10,
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
              averageRating: 4.2,
              reviewCount: 8,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
        ],
        _count: {
          reviews: 1,
          favorites: 1,
        },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await userRepository.findByIdWithDetails(userId);

      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        include: {
          reviews: {
            include: {
              book: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
          favorites: {
            include: {
              book: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
          _count: {
            select: {
              reviews: true,
              favorites: true,
            },
          },
        },
      });
    });

    it('should return null for non-existent user', async () => {
      const userId = 'non-existent-user';
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await userRepository.findByIdWithDetails(userId);

      expect(result).toBeNull();
    });
  });


  describe('createFavorite', () => {
    it('should add book to favorites', async () => {
      const userId = 'user-123';
      const bookId = 'book-123';
      const mockFavorite = {
        id: 'favorite-123',
        userId: userId,
        bookId: bookId,
        createdAt: new Date(),
      };

      mockPrisma.userFavorite.create.mockResolvedValue(mockFavorite);

      const result = await userRepository.createFavorite(userId, bookId);

      expect(result).toEqual(mockFavorite);
      expect(mockPrisma.userFavorite.create).toHaveBeenCalledWith({
        data: {
          userId: userId,
          bookId: bookId,
        },
      });
    });

    it('should handle duplicate favorite error', async () => {
      const userId = 'user-123';
      const bookId = 'book-123';
      const error = new Error('Unique constraint failed');

      mockPrisma.userFavorite.create.mockRejectedValue(error);

      await expect(userRepository.createFavorite(userId, bookId)).rejects.toThrow('Unique constraint failed');
    });
  });

  describe('deleteFavorite', () => {
    it('should remove book from favorites', async () => {
      const userId = 'user-123';
      const bookId = 'book-123';

      mockPrisma.userFavorite.delete.mockResolvedValue(undefined);

      await userRepository.deleteFavorite(userId, bookId);

      expect(mockPrisma.userFavorite.delete).toHaveBeenCalledWith({
        where: {
          userId_bookId: {
            userId: userId,
            bookId: bookId,
          },
        },
      });
    });

    it('should handle favorite not found error', async () => {
      const userId = 'user-123';
      const bookId = 'book-123';
      const error = new Error('Record not found');

      mockPrisma.userFavorite.delete.mockRejectedValue(error);

      await expect(userRepository.deleteFavorite(userId, bookId)).rejects.toThrow('Record not found');
    });
  });

  describe('findFavorite', () => {
    it('should return favorite if exists', async () => {
      const userId = 'user-123';
      const bookId = 'book-123';
      const mockFavorite = {
        id: 'favorite-123',
        userId: userId,
        bookId: bookId,
        createdAt: new Date(),
      };

      mockPrisma.userFavorite.findUnique.mockResolvedValue(mockFavorite);

      const result = await userRepository.findFavorite(userId, bookId);

      expect(result).toEqual(mockFavorite);
      expect(mockPrisma.userFavorite.findUnique).toHaveBeenCalledWith({
        where: {
          userId_bookId: {
            userId: userId,
            bookId: bookId,
          },
        },
      });
    });

    it('should return null if favorite does not exist', async () => {
      const userId = 'user-123';
      const bookId = 'book-123';

      mockPrisma.userFavorite.findUnique.mockResolvedValue(null);

      const result = await userRepository.findFavorite(userId, bookId);

      expect(result).toBeNull();
    });
  });

  describe('findUserFavorites', () => {
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
            averageRating: 4.5,
            reviewCount: 10,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        {
          id: 'favorite-2',
          userId: userId,
          bookId: 'book-2',
          createdAt: new Date(),
          book: {
            id: 'book-2',
            title: 'Favorite Book 2',
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
        },
      ];

      mockPrisma.userFavorite.findMany.mockResolvedValue(mockFavorites);

      const result = await userRepository.findUserFavorites(userId);

      expect(result).toEqual(mockFavorites);
      expect(mockPrisma.userFavorite.findMany).toHaveBeenCalledWith({
        where: {
          userId: userId,
        },
        include: {
          book: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('should return empty array when no favorites', async () => {
      const userId = 'user-123';

      mockPrisma.userFavorite.findMany.mockResolvedValue([]);

      const result = await userRepository.findUserFavorites(userId);

      expect(result).toEqual([]);
    });
  });
});