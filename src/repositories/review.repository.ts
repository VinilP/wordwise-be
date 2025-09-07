import { PrismaClient, Review as PrismaReview } from '@prisma/client';
import { Review, CreateReviewRequest, UpdateReviewRequest } from '../types';

export class ReviewRepository {
  constructor(private prisma: PrismaClient) {}

  async create(reviewData: CreateReviewRequest & { userId: string }): Promise<Review> {
    const review = await this.prisma.review.create({
      data: {
        bookId: reviewData.bookId,
        userId: reviewData.userId,
        content: reviewData.content,
        rating: reviewData.rating,
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

    return this.mapPrismaReviewToReview(review);
  }

  async findById(id: string): Promise<Review | null> {
    const review = await this.prisma.review.findUnique({
      where: { id },
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

    return review ? this.mapPrismaReviewToReview(review) : null;
  }

  async findByBookId(bookId: string): Promise<Review[]> {
    const reviews = await this.prisma.review.findMany({
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
      orderBy: { createdAt: 'desc' },
    });

    return reviews.map(this.mapPrismaReviewToReview);
  }

  async findByUserId(userId: string): Promise<Review[]> {
    const reviews = await this.prisma.review.findMany({
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
      orderBy: { createdAt: 'desc' },
    });

    return reviews.map(this.mapPrismaReviewToReview);
  }

  async findByUserAndBook(userId: string, bookId: string): Promise<Review | null> {
    const review = await this.prisma.review.findUnique({
      where: {
        bookId_userId: {
          bookId,
          userId,
        },
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

    return review ? this.mapPrismaReviewToReview(review) : null;
  }

  async update(id: string, updateData: UpdateReviewRequest): Promise<Review> {
    const review = await this.prisma.review.update({
      where: { id },
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

    return this.mapPrismaReviewToReview(review);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.review.delete({
      where: { id },
    });
  }

  private mapPrismaReviewToReview(prismaReview: any): Review {
    return {
      id: prismaReview.id,
      bookId: prismaReview.bookId,
      userId: prismaReview.userId,
      content: prismaReview.content || '',
      rating: prismaReview.rating,
      createdAt: prismaReview.createdAt,
      updatedAt: prismaReview.updatedAt,
      user: prismaReview.user ? {
        id: prismaReview.user.id,
        email: prismaReview.user.email,
        name: prismaReview.user.name,
        createdAt: prismaReview.user.createdAt,
        updatedAt: prismaReview.user.updatedAt,
      } : undefined,
      book: prismaReview.book ? {
        id: prismaReview.book.id,
        title: prismaReview.book.title,
        author: prismaReview.book.author,
        description: prismaReview.book.description || '',
        coverImageUrl: prismaReview.book.coverImageUrl || '',
        genres: prismaReview.book.genres,
        publishedYear: prismaReview.book.publishedYear || 0,
        averageRating: prismaReview.book.averageRating ? Number(prismaReview.book.averageRating) : 0,
        reviewCount: prismaReview.book.reviewCount,
        createdAt: prismaReview.book.createdAt,
        updatedAt: prismaReview.book.updatedAt,
      } : undefined,
    };
  }
}