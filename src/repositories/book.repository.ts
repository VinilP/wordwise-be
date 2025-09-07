import { PrismaClient, Book, Prisma } from '@prisma/client';
import { PaginationParams, BookFilters, SearchFilters } from '../types';

export class BookRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(
    pagination: PaginationParams,
    filters: BookFilters = {}
  ): Promise<{ books: Book[]; total: number }> {
    const { page, limit } = pagination;
    const { genres, minRating, publishedYear } = filters;

    const where: Prisma.BookWhereInput = {};

    // Apply filters
    if (genres && genres.length > 0) {
      where.genres = {
        hasSome: genres,
      };
    }

    if (minRating !== undefined) {
      where.averageRating = {
        gte: minRating,
      };
    }

    if (publishedYear !== undefined) {
      where.publishedYear = publishedYear;
    }

    const [books, total] = await Promise.all([
      this.prisma.book.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { averageRating: 'desc' },
          { reviewCount: 'desc' },
          { title: 'asc' },
        ],
      }),
      this.prisma.book.count({ where }),
    ]);

    return { books, total };
  }

  async findById(id: string): Promise<Book | null> {
    return this.prisma.book.findUnique({
      where: { id },
    });
  }

  async search(
    query: string,
    pagination: PaginationParams,
    filters: SearchFilters = {}
  ): Promise<{ books: Book[]; total: number }> {
    const { page, limit } = pagination;
    const { genres, minRating, publishedYear } = filters;

    const where: Prisma.BookWhereInput = {
      OR: [
        {
          title: {
            contains: query,
            mode: 'insensitive',
          },
        },
        {
          author: {
            contains: query,
            mode: 'insensitive',
          },
        },
      ],
    };

    // Apply additional filters
    if (genres && genres.length > 0) {
      where.genres = {
        hasSome: genres,
      };
    }

    if (minRating !== undefined) {
      where.averageRating = {
        gte: minRating,
      };
    }

    if (publishedYear !== undefined) {
      where.publishedYear = publishedYear;
    }

    const [books, total] = await Promise.all([
      this.prisma.book.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { averageRating: 'desc' },
          { reviewCount: 'desc' },
          { title: 'asc' },
        ],
      }),
      this.prisma.book.count({ where }),
    ]);

    return { books, total };
  }

  async create(bookData: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>): Promise<Book> {
    return this.prisma.book.create({
      data: bookData,
    });
  }

  async update(id: string, bookData: Partial<Omit<Book, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Book> {
    return this.prisma.book.update({
      where: { id },
      data: bookData,
    });
  }

  async delete(id: string): Promise<Book> {
    return this.prisma.book.delete({
      where: { id },
    });
  }

  async updateRating(bookId: string, averageRating?: number, reviewCount?: number): Promise<void> {
    if (averageRating !== undefined && reviewCount !== undefined) {
      // Use provided values
      await this.prisma.book.update({
        where: { id: bookId },
        data: {
          averageRating,
          reviewCount,
        },
      });
    } else {
      // Calculate average rating and review count from database
      const aggregation = await this.prisma.review.aggregate({
        where: { bookId },
        _avg: { rating: true },
        _count: { rating: true },
      });

      const calculatedAverageRating = aggregation._avg.rating;
      const calculatedReviewCount = aggregation._count.rating || 0;

      await this.prisma.book.update({
        where: { id: bookId },
        data: {
          averageRating: calculatedAverageRating,
          reviewCount: calculatedReviewCount,
        },
      });
    }
  }

  async getPopularBooks(limit: number = 10): Promise<Book[]> {
    return this.prisma.book.findMany({
      where: {
        reviewCount: {
          gt: 0,
        },
      },
      orderBy: [
        { averageRating: 'desc' },
        { reviewCount: 'desc' },
      ],
      take: limit,
    });
  }

  async getBooksByGenre(genre: string, limit: number = 10): Promise<Book[]> {
    return this.prisma.book.findMany({
      where: {
        genres: {
          has: genre,
        },
      },
      orderBy: [
        { averageRating: 'desc' },
        { reviewCount: 'desc' },
      ],
      take: limit,
    });
  }
}