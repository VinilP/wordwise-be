import { ReviewRepository } from '../repositories/review.repository';
import { BookRepository } from '../repositories/book.repository';
import { RatingService } from './rating.service';
import { Review, CreateReviewRequest, UpdateReviewRequest } from '../types';
import { AppError, HTTP_STATUS } from '../utils';

export class ReviewService {
  constructor(
    private reviewRepository: ReviewRepository,
    private bookRepository: BookRepository,
    private ratingService: RatingService
  ) {}

  async createReview(userId: string, reviewData: CreateReviewRequest): Promise<Review> {
    // Validate rating is between 1 and 5
    if (reviewData.rating < 1 || reviewData.rating > 5) {
      throw new AppError('Rating must be between 1 and 5', HTTP_STATUS.BAD_REQUEST);
    }

    // Check if book exists
    const book = await this.bookRepository.findById(reviewData.bookId);
    if (!book) {
      throw new AppError('Book not found', HTTP_STATUS.NOT_FOUND);
    }

    // Check if user already has a review for this book
    const existingReview = await this.reviewRepository.findByUserAndBook(userId, reviewData.bookId);
    if (existingReview) {
      throw new AppError('User has already reviewed this book', HTTP_STATUS.CONFLICT);
    }

    // Create the review
    const review = await this.reviewRepository.create({
      ...reviewData,
      userId,
    });

    // Update book's average rating and review count using rating service
    await this.ratingService.handleReviewOperation(reviewData.bookId, 'create');

    return review;
  }

  async getReviewsByBook(bookId: string): Promise<Review[]> {
    // Check if book exists
    const book = await this.bookRepository.findById(bookId);
    if (!book) {
      throw new Error('Book not found');
    }

    return this.reviewRepository.findByBookId(bookId);
  }

  async getReviewsByUser(userId: string): Promise<Review[]> {
    return this.reviewRepository.findByUserId(userId);
  }

  async getReviewById(reviewId: string): Promise<Review> {
    const review = await this.reviewRepository.findById(reviewId);
    if (!review) {
      throw new AppError('Review not found', HTTP_STATUS.NOT_FOUND);
    }
    return review;
  }

  async updateReview(reviewId: string, userId: string, updateData: UpdateReviewRequest): Promise<Review> {
    // Get the existing review
    const existingReview = await this.reviewRepository.findById(reviewId);
    if (!existingReview) {
      throw new AppError('Review not found', HTTP_STATUS.NOT_FOUND);
    }

    // Check ownership
    if (existingReview.userId !== userId) {
      throw new AppError('Unauthorized: You can only update your own reviews', HTTP_STATUS.FORBIDDEN);
    }

    // Validate rating if provided
    if (updateData.rating !== undefined && (updateData.rating < 1 || updateData.rating > 5)) {
      throw new AppError('Rating must be between 1 and 5', HTTP_STATUS.BAD_REQUEST);
    }

    // Update the review
    const updatedReview = await this.reviewRepository.update(reviewId, updateData);

    // Update book's average rating if rating was changed
    if (updateData.rating !== undefined) {
      await this.ratingService.handleReviewOperation(existingReview.bookId, 'update');
    }

    return updatedReview;
  }

  async deleteReview(reviewId: string, userId: string): Promise<void> {
    // Get the existing review
    const existingReview = await this.reviewRepository.findById(reviewId);
    if (!existingReview) {
      throw new AppError('Review not found', HTTP_STATUS.NOT_FOUND);
    }

    // Check ownership
    if (existingReview.userId !== userId) {
      throw new AppError('Unauthorized: You can only delete your own reviews', HTTP_STATUS.FORBIDDEN);
    }

    // Delete the review
    await this.reviewRepository.delete(reviewId);

    // Update book's average rating and review count using rating service
    await this.ratingService.handleReviewOperation(existingReview.bookId, 'delete');
  }

  // Method kept for backward compatibility but now delegates to rating service
  private async updateBookRating(bookId: string): Promise<void> {
    await this.ratingService.updateBookRating(bookId);
  }
}