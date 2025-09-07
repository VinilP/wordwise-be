import { ReviewService } from '../../src/services/review.service';
import { ReviewRepository } from '../../src/repositories/review.repository';
import { BookRepository } from '../../src/repositories/book.repository';
import { RatingService } from '../../src/services/rating.service';
import { Review, CreateReviewRequest, UpdateReviewRequest } from '../../src/types';
import { Decimal } from '@prisma/client/runtime/library';

// Mock the repositories and services
jest.mock('../../src/repositories/review.repository');
jest.mock('../../src/repositories/book.repository');
jest.mock('../../src/services/rating.service');

const MockedReviewRepository = ReviewRepository as jest.MockedClass<typeof ReviewRepository>;
const MockedBookRepository = BookRepository as jest.MockedClass<typeof BookRepository>;
const MockedRatingService = RatingService as jest.MockedClass<typeof RatingService>;

describe('ReviewService', () => {
  let reviewService: ReviewService;
  let mockReviewRepository: jest.Mocked<ReviewRepository>;
  let mockBookRepository: jest.Mocked<BookRepository>;
  let mockRatingService: jest.Mocked<RatingService>;

  const mockBook = {
    id: 'book-1',
    title: 'Test Book',
    author: 'Test Author',
    description: 'Test Description',
    coverImageUrl: 'test-cover.jpg',
    genres: ['Fiction'],
    publishedYear: 2023,
    averageRating: new Decimal(4.5),
    reviewCount: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

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
    mockReviewRepository = new MockedReviewRepository({} as any) as jest.Mocked<ReviewRepository>;
    mockBookRepository = new MockedBookRepository({} as any) as jest.Mocked<BookRepository>;
    mockRatingService = new MockedRatingService({} as any, {} as any, {} as any) as jest.Mocked<RatingService>;
    reviewService = new ReviewService(mockReviewRepository, mockBookRepository, mockRatingService);
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
      mockBookRepository.findById.mockResolvedValue(mockBook);
      mockReviewRepository.findByUserAndBook.mockResolvedValue(null);
      mockReviewRepository.create.mockResolvedValue(mockReview);
      mockRatingService.handleReviewOperation.mockResolvedValue();

      const result = await reviewService.createReview('user-1', createReviewData);

      expect(result).toEqual(mockReview);
      expect(mockBookRepository.findById).toHaveBeenCalledWith('book-1');
      expect(mockReviewRepository.findByUserAndBook).toHaveBeenCalledWith('user-1', 'book-1');
      expect(mockReviewRepository.create).toHaveBeenCalledWith({
        ...createReviewData,
        userId: 'user-1',
      });
      expect(mockRatingService.handleReviewOperation).toHaveBeenCalledWith('book-1', 'create');
    });

    it('should throw error for invalid rating (too low)', async () => {
      const invalidData = { ...createReviewData, rating: 0 };

      await expect(reviewService.createReview('user-1', invalidData)).rejects.toThrow(
        'Rating must be between 1 and 5'
      );
    });

    it('should throw error for invalid rating (too high)', async () => {
      const invalidData = { ...createReviewData, rating: 6 };

      await expect(reviewService.createReview('user-1', invalidData)).rejects.toThrow(
        'Rating must be between 1 and 5'
      );
    });

    it('should throw error if book does not exist', async () => {
      mockBookRepository.findById.mockResolvedValue(null);

      await expect(reviewService.createReview('user-1', createReviewData)).rejects.toThrow(
        'Book not found'
      );
    });

    it('should throw error if user already reviewed the book', async () => {
      mockBookRepository.findById.mockResolvedValue(mockBook);
      mockReviewRepository.findByUserAndBook.mockResolvedValue(mockReview);

      await expect(reviewService.createReview('user-1', createReviewData)).rejects.toThrow(
        'User has already reviewed this book'
      );
    });
  });

  describe('getReviewsByBook', () => {
    it('should return reviews for a book', async () => {
      const reviews = [mockReview];
      mockBookRepository.findById.mockResolvedValue(mockBook);
      mockReviewRepository.findByBookId.mockResolvedValue(reviews);

      const result = await reviewService.getReviewsByBook('book-1');

      expect(result).toEqual(reviews);
      expect(mockBookRepository.findById).toHaveBeenCalledWith('book-1');
      expect(mockReviewRepository.findByBookId).toHaveBeenCalledWith('book-1');
    });

    it('should throw error if book does not exist', async () => {
      mockBookRepository.findById.mockResolvedValue(null);

      await expect(reviewService.getReviewsByBook('book-1')).rejects.toThrow('Book not found');
    });
  });

  describe('getReviewsByUser', () => {
    it('should return reviews by a user', async () => {
      const reviews = [mockReview];
      mockReviewRepository.findByUserId.mockResolvedValue(reviews);

      const result = await reviewService.getReviewsByUser('user-1');

      expect(result).toEqual(reviews);
      expect(mockReviewRepository.findByUserId).toHaveBeenCalledWith('user-1');
    });
  });

  describe('getReviewById', () => {
    it('should return a review by ID', async () => {
      mockReviewRepository.findById.mockResolvedValue(mockReview);

      const result = await reviewService.getReviewById('review-1');

      expect(result).toEqual(mockReview);
      expect(mockReviewRepository.findById).toHaveBeenCalledWith('review-1');
    });

    it('should throw error if review does not exist', async () => {
      mockReviewRepository.findById.mockResolvedValue(null);

      await expect(reviewService.getReviewById('review-1')).rejects.toThrow('Review not found');
    });
  });

  describe('updateReview', () => {
    const updateData: UpdateReviewRequest = {
      content: 'Updated content',
      rating: 4,
    };

    it('should update a review successfully', async () => {
      const updatedReview = { ...mockReview, ...updateData };
      mockReviewRepository.findById.mockResolvedValue(mockReview);
      mockReviewRepository.update.mockResolvedValue(updatedReview);
      mockRatingService.handleReviewOperation.mockResolvedValue();

      const result = await reviewService.updateReview('review-1', 'user-1', updateData);

      expect(result).toEqual(updatedReview);
      expect(mockReviewRepository.findById).toHaveBeenCalledWith('review-1');
      expect(mockReviewRepository.update).toHaveBeenCalledWith('review-1', updateData);
      expect(mockRatingService.handleReviewOperation).toHaveBeenCalledWith('book-1', 'update');
    });

    it('should throw error if review does not exist', async () => {
      mockReviewRepository.findById.mockResolvedValue(null);

      await expect(reviewService.updateReview('review-1', 'user-1', updateData)).rejects.toThrow(
        'Review not found'
      );
    });

    it('should throw error if user is not the owner', async () => {
      mockReviewRepository.findById.mockResolvedValue(mockReview);

      await expect(reviewService.updateReview('review-1', 'user-2', updateData)).rejects.toThrow(
        'Unauthorized: You can only update your own reviews'
      );
    });

    it('should throw error for invalid rating', async () => {
      const invalidUpdateData = { ...updateData, rating: 6 };
      mockReviewRepository.findById.mockResolvedValue(mockReview);

      await expect(reviewService.updateReview('review-1', 'user-1', invalidUpdateData)).rejects.toThrow(
        'Rating must be between 1 and 5'
      );
    });

    it('should not update book rating if rating was not changed', async () => {
      const updateDataWithoutRating = { content: 'Updated content' };
      const updatedReview = { ...mockReview, content: 'Updated content' };
      mockReviewRepository.findById.mockResolvedValue(mockReview);
      mockReviewRepository.update.mockResolvedValue(updatedReview);

      await reviewService.updateReview('review-1', 'user-1', updateDataWithoutRating);

      expect(mockRatingService.handleReviewOperation).not.toHaveBeenCalled();
    });
  });

  describe('deleteReview', () => {
    it('should delete a review successfully', async () => {
      mockReviewRepository.findById.mockResolvedValue(mockReview);
      mockReviewRepository.delete.mockResolvedValue();
      mockRatingService.handleReviewOperation.mockResolvedValue();

      await reviewService.deleteReview('review-1', 'user-1');

      expect(mockReviewRepository.findById).toHaveBeenCalledWith('review-1');
      expect(mockReviewRepository.delete).toHaveBeenCalledWith('review-1');
      expect(mockRatingService.handleReviewOperation).toHaveBeenCalledWith('book-1', 'delete');
    });

    it('should throw error if review does not exist', async () => {
      mockReviewRepository.findById.mockResolvedValue(null);

      await expect(reviewService.deleteReview('review-1', 'user-1')).rejects.toThrow(
        'Review not found'
      );
    });

    it('should throw error if user is not the owner', async () => {
      mockReviewRepository.findById.mockResolvedValue(mockReview);

      await expect(reviewService.deleteReview('review-1', 'user-2')).rejects.toThrow(
        'Unauthorized: You can only delete your own reviews'
      );
    });
  });

  describe('rating service integration', () => {
    it('should call rating service for review operations', async () => {
      mockBookRepository.findById.mockResolvedValue(mockBook);
      mockReviewRepository.findByUserAndBook.mockResolvedValue(null);
      mockReviewRepository.create.mockResolvedValue(mockReview);
      mockRatingService.handleReviewOperation.mockResolvedValue();

      await reviewService.createReview('user-1', {
        bookId: 'book-1',
        content: 'Test',
        rating: 5,
      });

      expect(mockRatingService.handleReviewOperation).toHaveBeenCalledWith('book-1', 'create');
    });

    it('should handle rating service errors gracefully', async () => {
      mockBookRepository.findById.mockResolvedValue(mockBook);
      mockReviewRepository.findByUserAndBook.mockResolvedValue(null);
      mockReviewRepository.create.mockResolvedValue(mockReview);
      mockRatingService.handleReviewOperation.mockRejectedValue(new Error('Rating service error'));

      await expect(reviewService.createReview('user-1', {
        bookId: 'book-1',
        content: 'Test',
        rating: 5,
      })).rejects.toThrow('Rating service error');
    });
  });
});