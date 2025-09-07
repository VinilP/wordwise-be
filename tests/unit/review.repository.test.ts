import { PrismaClient } from '@prisma/client';
import { ReviewRepository } from '../../src/repositories/review.repository';
import { CreateReviewRequest, UpdateReviewRequest } from '../../src/types';

// Mock Prisma
const mockPrisma = {
  review: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
} as any;

describe('ReviewRepository', () => {
  describe('mapPrismaReviewToReview', () => {
    it('should map with user and book', () => {
      const repo = new ReviewRepository({} as any);
      const prismaReview = {
        id: 'id', bookId: 'bid', userId: 'uid', content: 'c', rating: 1, createdAt: new Date(), updatedAt: new Date(),
        user: { id: 'uid', email: 'e', name: 'n', createdAt: new Date(), updatedAt: new Date() },
        book: { id: 'bid', title: 't', author: 'a', description: '', coverImageUrl: '', genres: [], publishedYear: 2023, averageRating: 5, reviewCount: 1, createdAt: new Date(), updatedAt: new Date() }
      };
      const result = (repo as any).mapPrismaReviewToReview(prismaReview);
      expect(result.user).toBeDefined();
      expect(result.book).toBeDefined();
    });
    it('should map with undefined user and book', () => {
      const repo = new ReviewRepository({} as any);
      const prismaReview = { id: 'id', bookId: 'bid', userId: 'uid', content: '', rating: 1, createdAt: new Date(), updatedAt: new Date() };
      const result = (repo as any).mapPrismaReviewToReview(prismaReview);
      expect(result.user).toBeUndefined();
      expect(result.book).toBeUndefined();
    });
    it('should map with missing book fields', () => {
      const repo = new ReviewRepository({} as any);
      const prismaReview = { id: 'id', bookId: 'bid', userId: 'uid', content: '', rating: 1, createdAt: new Date(), updatedAt: new Date(), book: { id: 'bid', title: 't', author: 'a', genres: [], reviewCount: 0, createdAt: new Date(), updatedAt: new Date() } };
      const result = (repo as any).mapPrismaReviewToReview(prismaReview);
      expect(result.book).toBeDefined();
    });
  });
  let reviewRepository: ReviewRepository;

  beforeEach(() => {
    reviewRepository = new ReviewRepository(mockPrisma);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new review', async () => {
      const reviewData: CreateReviewRequest & { userId: string } = {
        bookId: 'book-123',
        userId: 'user-123',
        content: 'Great book!',
        rating: 5,
      };

      const mockPrismaReview = {
        id: 'review-123',
        bookId: 'book-123',
        userId: 'user-123',
        content: 'Great book!',
        rating: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        book: {
          id: 'book-123',
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
      };

      mockPrisma.review.create.mockResolvedValue(mockPrismaReview);

      const result = await reviewRepository.create(reviewData);

      expect(result).toMatchObject({
        id: 'review-123',
        bookId: 'book-123',
        userId: 'user-123',
        content: 'Great book!',
        rating: 5,
        user: {
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
        },
        book: {
          id: 'book-123',
          title: 'Test Book',
          author: 'Test Author',
        },
      });
      expect(mockPrisma.review.create).toHaveBeenCalledWith({
        data: {
          bookId: 'book-123',
          userId: 'user-123',
          content: 'Great book!',
          rating: 5,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          book: {
            select: {
              id: true,
              title: true,
              author: true,
              description: true,
              coverImageUrl: true,
              genres: true,
              publishedYear: true,
              averageRating: true,
              reviewCount: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });
    });

    it('should handle creation error', async () => {
      const reviewData: CreateReviewRequest & { userId: string } = {
        bookId: 'book-123',
        userId: 'user-123',
        content: 'Great book!',
        rating: 5,
      };

      const error = new Error('Database error');
      mockPrisma.review.create.mockRejectedValue(error);

      await expect(reviewRepository.create(reviewData)).rejects.toThrow('Database error');
    });
  });

  describe('findById', () => {
    it('should return review by ID', async () => {
      const reviewId = 'review-123';
      const mockPrismaReview = {
        id: reviewId,
        bookId: 'book-123',
        userId: 'user-123',
        content: 'Great book!',
        rating: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        book: {
          id: 'book-123',
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
      };

      mockPrisma.review.findUnique.mockResolvedValue(mockPrismaReview);

      const result = await reviewRepository.findById(reviewId);

      expect(result).toMatchObject({
        id: reviewId,
        bookId: 'book-123',
        userId: 'user-123',
        content: 'Great book!',
        rating: 5,
      });
      expect(mockPrisma.review.findUnique).toHaveBeenCalledWith({
        where: { id: reviewId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          book: {
            select: {
              id: true,
              title: true,
              author: true,
              description: true,
              coverImageUrl: true,
              genres: true,
              publishedYear: true,
              averageRating: true,
              reviewCount: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });
    });

    it('should return null for non-existent review', async () => {
      const reviewId = 'non-existent-review';
      mockPrisma.review.findUnique.mockResolvedValue(null);

      const result = await reviewRepository.findById(reviewId);

      expect(result).toBeNull();
    });
  });

  describe('findByBookId', () => {
    it('should return reviews by book ID', async () => {
      const bookId = 'book-123';
      const mockPrismaReviews = [
        {
          id: 'review-1',
          bookId: bookId,
          userId: 'user-1',
          content: 'Great book!',
          rating: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: {
            id: 'user-1',
            name: 'User 1',
            email: 'user1@example.com',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          book: {
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
          },
        },
        {
          id: 'review-2',
          bookId: bookId,
          userId: 'user-2',
          content: 'Good book',
          rating: 4,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: {
            id: 'user-2',
            name: 'User 2',
            email: 'user2@example.com',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          book: {
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
          },
        },
      ];

      mockPrisma.review.findMany.mockResolvedValue(mockPrismaReviews);

      const result = await reviewRepository.findByBookId(bookId);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'review-1',
        bookId: bookId,
        userId: 'user-1',
        content: 'Great book!',
        rating: 5,
      });
      expect(result[1]).toMatchObject({
        id: 'review-2',
        bookId: bookId,
        userId: 'user-2',
        content: 'Good book',
        rating: 4,
      });
      expect(mockPrisma.review.findMany).toHaveBeenCalledWith({
        where: { bookId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          book: {
            select: {
              id: true,
              title: true,
              author: true,
              description: true,
              coverImageUrl: true,
              genres: true,
              publishedYear: true,
              averageRating: true,
              reviewCount: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('should return empty array when no reviews found', async () => {
      const bookId = 'book-with-no-reviews';
      mockPrisma.review.findMany.mockResolvedValue([]);

      const result = await reviewRepository.findByBookId(bookId);

      expect(result).toEqual([]);
    });
  });

  describe('findByUserId', () => {
    it('should return reviews by user ID', async () => {
      const userId = 'user-123';
      const mockPrismaReviews = [
        {
          id: 'review-1',
          bookId: 'book-1',
          userId: userId,
          content: 'Great book!',
          rating: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: {
            id: userId,
            name: 'Test User',
            email: 'test@example.com',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
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
      ];

      mockPrisma.review.findMany.mockResolvedValue(mockPrismaReviews);

      const result = await reviewRepository.findByUserId(userId);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'review-1',
        bookId: 'book-1',
        userId: userId,
        content: 'Great book!',
        rating: 5,
      });
      expect(mockPrisma.review.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          book: {
            select: {
              id: true,
              title: true,
              author: true,
              description: true,
              coverImageUrl: true,
              genres: true,
              publishedYear: true,
              averageRating: true,
              reviewCount: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('should return empty array when no reviews found', async () => {
      const userId = 'user-with-no-reviews';
      mockPrisma.review.findMany.mockResolvedValue([]);

      const result = await reviewRepository.findByUserId(userId);

      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update review', async () => {
      const reviewId = 'review-123';
      const updateData: UpdateReviewRequest = {
        content: 'Updated review content',
        rating: 4,
      };

      const mockUpdatedReview = {
        id: reviewId,
        bookId: 'book-123',
        userId: 'user-123',
        content: 'Updated review content',
        rating: 4,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        book: {
          id: 'book-123',
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
      };

      mockPrisma.review.update.mockResolvedValue(mockUpdatedReview);

      const result = await reviewRepository.update(reviewId, updateData);

      expect(result).toMatchObject({
        id: reviewId,
        content: 'Updated review content',
        rating: 4,
      });
      expect(mockPrisma.review.update).toHaveBeenCalledWith({
        where: { id: reviewId },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          book: {
            select: {
              id: true,
              title: true,
              author: true,
              description: true,
              coverImageUrl: true,
              genres: true,
              publishedYear: true,
              averageRating: true,
              reviewCount: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });
    });

    it('should handle update error', async () => {
      const reviewId = 'non-existent-review';
      const updateData: UpdateReviewRequest = {
        content: 'Updated content',
      };

      const error = new Error('Record not found');
      mockPrisma.review.update.mockRejectedValue(error);

      await expect(reviewRepository.update(reviewId, updateData)).rejects.toThrow('Record not found');
    });
  });

  describe('delete', () => {
    it('should delete review', async () => {
      const reviewId = 'review-123';

      mockPrisma.review.delete.mockResolvedValue(undefined);

      await reviewRepository.delete(reviewId);

      expect(mockPrisma.review.delete).toHaveBeenCalledWith({
        where: { id: reviewId },
      });
    });

    it('should handle delete error', async () => {
      const reviewId = 'non-existent-review';

      const error = new Error('Record not found');
      mockPrisma.review.delete.mockRejectedValue(error);

      await expect(reviewRepository.delete(reviewId)).rejects.toThrow('Record not found');
    });
  });

  describe('mapPrismaReviewToReview', () => {
    it('should map Prisma review to Review type', () => {
      const mockPrismaReview = {
        id: 'review-123',
        bookId: 'book-123',
        userId: 'user-123',
        content: 'Great book!',
        rating: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        book: {
          id: 'book-123',
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
      };

      const result = (reviewRepository as any).mapPrismaReviewToReview(mockPrismaReview);

      expect(result).toMatchObject({
        id: 'review-123',
        bookId: 'book-123',
        userId: 'user-123',
        content: 'Great book!',
        rating: 5,
        user: {
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
        },
        book: {
          id: 'book-123',
          title: 'Test Book',
          author: 'Test Author',
        },
      });
    });
  });
});