import { PrismaClient } from '@prisma/client';
import { User, UserFavorite, Book, Review, UserProfile } from '../types';
import { UserRepository } from '../repositories/user.repository';
import { BookRepository } from '../repositories/book.repository';

export interface UserProfileSummary {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  reviewCount: number;
  favoriteCount: number;
}

export interface UserProfileWithDetails extends UserProfileSummary {
  reviews: (Review & { book: Book })[];
  favorites: (UserFavorite & { book: Book })[];
}

export class UserService {
  constructor(
    private userRepository: UserRepository,
    private bookRepository: BookRepository
  ) {}

  async getUserProfile(userId: string): Promise<UserProfileSummary> {
    const user = await this.userRepository.findByIdWithCounts(userId);

    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      reviewCount: user._count.reviews,
      favoriteCount: user._count.favorites,
    };
  }

  async getUserProfileWithDetails(userId: string): Promise<UserProfileWithDetails> {
    const user = await this.userRepository.findByIdWithDetails(userId);

    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      reviewCount: user._count.reviews,
      favoriteCount: user._count.favorites,
      reviews: user.reviews.map(review => ({
        id: review.id,
        bookId: review.bookId,
        userId: review.userId,
        content: review.content || '',
        rating: review.rating,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
        book: {
          id: review.book.id,
          title: review.book.title,
          author: review.book.author,
          description: review.book.description || '',
          coverImageUrl: review.book.coverImageUrl || '',
          genres: review.book.genres,
          publishedYear: review.book.publishedYear || 0,
          averageRating: Number(review.book.averageRating) || 0,
          reviewCount: review.book.reviewCount,
          createdAt: review.book.createdAt,
          updatedAt: review.book.updatedAt,
        },
      })),
      favorites: user.favorites.map(favorite => ({
        id: favorite.id,
        userId: favorite.userId,
        bookId: favorite.bookId,
        createdAt: favorite.createdAt,
        book: {
          id: favorite.book.id,
          title: favorite.book.title,
          author: favorite.book.author,
          description: favorite.book.description || '',
          coverImageUrl: favorite.book.coverImageUrl || '',
          genres: favorite.book.genres,
          publishedYear: favorite.book.publishedYear || 0,
          averageRating: Number(favorite.book.averageRating) || 0,
          reviewCount: favorite.book.reviewCount,
          createdAt: favorite.book.createdAt,
          updatedAt: favorite.book.updatedAt,
        },
      })),
    };
  }

  async addToFavorites(userId: string, bookId: string): Promise<UserFavorite> {
    // Check if book exists
    const book = await this.bookRepository.findById(bookId);

    if (!book) {
      throw new Error('Book not found');
    }

    // Check if already favorited
    const existingFavorite = await this.userRepository.findFavorite(userId, bookId);

    if (existingFavorite) {
      throw new Error('Book is already in favorites');
    }

    const favorite = await this.userRepository.createFavorite(userId, bookId);

    return {
      id: favorite.id,
      userId: favorite.userId,
      bookId: favorite.bookId,
      createdAt: favorite.createdAt,
    };
  }

  async removeFromFavorites(userId: string, bookId: string): Promise<void> {
    const favorite = await this.userRepository.findFavorite(userId, bookId);

    if (!favorite) {
      throw new Error('Book is not in favorites');
    }

    await this.userRepository.deleteFavorite(userId, bookId);
  }

  async getUserFavorites(userId: string): Promise<UserFavorite[]> {
    const favorites = await this.userRepository.findUserFavorites(userId);

    return favorites.map(favorite => ({
      id: favorite.id,
      userId: favorite.userId,
      bookId: favorite.bookId,
      createdAt: favorite.createdAt,
      book: {
        id: favorite.book.id,
        title: favorite.book.title,
        author: favorite.book.author,
        description: favorite.book.description || '',
        coverImageUrl: favorite.book.coverImageUrl || '',
        genres: favorite.book.genres,
        publishedYear: favorite.book.publishedYear || 0,
        averageRating: Number(favorite.book.averageRating) || 0,
        reviewCount: favorite.book.reviewCount,
        createdAt: favorite.book.createdAt,
        updatedAt: favorite.book.updatedAt,
      },
    }));
  }

  async isFavorite(userId: string, bookId: string): Promise<boolean> {
    const favorite = await this.userRepository.findFavorite(userId, bookId);

    return !!favorite;
  }
}