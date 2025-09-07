import { Book } from '@prisma/client';
import { BookRepository } from '../repositories/book.repository';
import { RatingService } from './rating.service';
import { PaginationParams, BookFilters, SearchFilters, PaginatedResponse } from '../types';

export class BookService {
  constructor(
    private bookRepository: BookRepository,
    private ratingService: RatingService
  ) {}

  async getAllBooks(
    pagination: PaginationParams,
    filters: BookFilters = {}
  ): Promise<PaginatedResponse<Book>> {
    // Validate pagination parameters
    const validatedPagination = this.validatePagination(pagination);
    
    const { books, total } = await this.bookRepository.findAll(validatedPagination, filters);
    
    return this.createPaginatedResponse(books, validatedPagination, total);
  }

  async getBookById(id: string): Promise<Book | null> {
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid book ID provided');
    }

    return this.bookRepository.findById(id);
  }

  async searchBooks(
    query: string,
    pagination: PaginationParams,
    filters: SearchFilters = {}
  ): Promise<PaginatedResponse<Book>> {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new Error('Search query is required and must be a non-empty string');
    }

    // Validate pagination parameters
    const validatedPagination = this.validatePagination(pagination);
    
    const { books, total } = await this.bookRepository.search(
      query.trim(),
      validatedPagination,
      filters
    );
    
    return this.createPaginatedResponse(books, validatedPagination, total);
  }

  async updateBookRating(bookId: string): Promise<void> {
    if (!bookId || typeof bookId !== 'string') {
      throw new Error('Invalid book ID provided');
    }

    await this.ratingService.updateBookRating(bookId);
  }

  async getPopularBooks(limit: number = 10): Promise<Book[]> {
    const validatedLimit = Math.min(Math.max(1, limit), 50); // Limit between 1 and 50
    return this.bookRepository.getPopularBooks(validatedLimit);
  }

  async getBooksByGenre(genre: string, limit: number = 10): Promise<Book[]> {
    if (!genre || typeof genre !== 'string' || genre.trim().length === 0) {
      throw new Error('Genre is required and must be a non-empty string');
    }

    const validatedLimit = Math.min(Math.max(1, limit), 50); // Limit between 1 and 50
    return this.bookRepository.getBooksByGenre(genre.trim(), validatedLimit);
  }

  private validatePagination(pagination: PaginationParams): PaginationParams {
    const page = Math.max(1, pagination.page || 1);
    const limit = Math.min(Math.max(1, pagination.limit || 20), 100); // Limit between 1 and 100

    return { page, limit };
  }

  private createPaginatedResponse<T>(
    data: T[],
    pagination: PaginationParams,
    total: number
  ): PaginatedResponse<T> {
    const { page, limit } = pagination;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  // Helper method to validate book filters
  validateFilters(filters: BookFilters): BookFilters {
    const validatedFilters: BookFilters = {};

    if (filters.genres && Array.isArray(filters.genres)) {
      validatedFilters.genres = filters.genres
        .filter((genre) => typeof genre === 'string' && genre.trim().length > 0)
        .map((genre) => genre.trim());
    }

    if (filters.minRating !== undefined) {
      const rating = Number(filters.minRating);
      if (!isNaN(rating) && rating >= 0 && rating <= 5) {
        validatedFilters.minRating = rating;
      }
    }

    if (filters.publishedYear !== undefined) {
      const year = Number(filters.publishedYear);
      const currentYear = new Date().getFullYear();
      if (!isNaN(year) && year >= 1000 && year <= currentYear) {
        validatedFilters.publishedYear = year;
      }
    }

    return validatedFilters;
  }
}