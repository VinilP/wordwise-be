import { PrismaClient } from '@prisma/client';
import { BookRepository } from '../repositories/book.repository';
import { ReviewRepository } from '../repositories/review.repository';

export interface RatingCalculationResult {
  averageRating: number;
  reviewCount: number;
}

export class RatingService {
  constructor(
    private prisma: PrismaClient,
    private bookRepository: BookRepository,
    private reviewRepository: ReviewRepository
  ) {}

  /**
   * Calculate average rating for a specific book
   */
  async calculateBookRating(bookId: string): Promise<RatingCalculationResult> {
    if (!bookId || typeof bookId !== 'string') {
      throw new Error('Invalid book ID provided');
    }

    // Verify book exists
    const book = await this.bookRepository.findById(bookId);
    if (!book) {
      throw new Error('Book not found');
    }

    // Get all reviews for the book
    const reviews = await this.reviewRepository.findByBookId(bookId);
    
    if (reviews.length === 0) {
      return {
        averageRating: 0,
        reviewCount: 0
      };
    }

    // Calculate average rating
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = Math.round((totalRating / reviews.length) * 10) / 10; // Round to 1 decimal place
    
    return {
      averageRating,
      reviewCount: reviews.length
    };
  }

  /**
   * Update book rating in database
   */
  async updateBookRating(bookId: string): Promise<void> {
    const ratingData = await this.calculateBookRating(bookId);
    
    await this.prisma.book.update({
      where: { id: bookId },
      data: {
        averageRating: ratingData.averageRating,
        reviewCount: ratingData.reviewCount,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Recalculate ratings for all books (background job functionality)
   */
  async recalculateAllRatings(): Promise<{ processed: number; errors: string[] }> {
    const books = await this.prisma.book.findMany({
      select: { id: true }
    });

    let processed = 0;
    const errors: string[] = [];

    for (const book of books) {
      try {
        await this.updateBookRating(book.id);
        processed++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to update rating for book ${book.id}: ${errorMessage}`);
      }
    }

    return { processed, errors };
  }

  /**
   * Get books with no reviews (for cleanup/maintenance)
   */
  async getBooksWithoutReviews(): Promise<string[]> {
    const books = await this.prisma.book.findMany({
      where: {
        reviewCount: 0
      },
      select: { id: true }
    });

    return books.map(book => book.id);
  }

  /**
   * Validate rating value
   */
  validateRating(rating: number): boolean {
    return typeof rating === 'number' && rating >= 1 && rating <= 5 && Number.isInteger(rating);
  }

  /**
   * Get rating statistics for a book
   */
  async getBookRatingStats(bookId: string): Promise<{
    bookId: string;
    averageRating: number;
    reviewCount: number;
    totalReviews: number;
    ratingDistribution: { [key: number]: number };
  }> {
    if (!bookId || typeof bookId !== 'string') {
      throw new Error('Invalid book ID provided');
    }

    // Verify book exists
    const book = await this.bookRepository.findById(bookId);
    if (!book) {
      throw new Error('Book not found');
    }

    const reviews = await this.reviewRepository.findByBookId(bookId);
    
    if (reviews.length === 0) {
      return {
        bookId,
        averageRating: 0,
        reviewCount: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    }

    // Calculate average rating
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = Math.round((totalRating / reviews.length) * 10) / 10;

    // Calculate rating distribution
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(review => {
      if (review.rating >= 1 && review.rating <= 5) {
        ratingDistribution[review.rating as keyof typeof ratingDistribution]++;
      }
    });

    return {
      bookId,
      averageRating,
      reviewCount: reviews.length,
      totalReviews: reviews.length,
      ratingDistribution
    };
  }

  /**
   * Handle rating update after review operations
   */
  async handleReviewOperation(bookId: string, operation: 'create' | 'update' | 'delete'): Promise<void> {
    try {
      await this.updateBookRating(bookId);
    } catch (error) {
      // Log error but don't throw to avoid breaking the main operation
      console.error(`Failed to update rating for book ${bookId} after ${operation} operation:`, error);
      // Don't re-throw to avoid breaking the main review operation
    }
  }
}