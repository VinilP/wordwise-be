import { getPrismaClient } from '../config/database';
import { Book, Review, UserFavorite } from '@prisma/client';

const prisma = getPrismaClient();

export interface PopularBook extends Omit<Book, 'averageRating'> {
  reviewCount: number;
  averageRating: number;
  favoriteCount: number;
}

class PopularBooksService {
  /**
   * Get popular books based on reviews, ratings, and favorites
   */
  async getPopularBooks(): Promise<PopularBook[]> {
    console.log('📚 Getting popular books...');
    
    try {
      // Get books with their review statistics and favorite counts
      const books = await prisma.book.findMany({
        include: {
          reviews: {
            select: {
              rating: true,
            },
          },
          favorites: {
            select: {
              id: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc', // Start with newest books
        },
      });

      console.log(`📊 Found ${books.length} books in database`);

      // Calculate popularity metrics for each book
      const booksWithMetrics = books.map((book: any) => {
        const reviewCount = book.reviews.length;
        const favoriteCount = book.favorites.length;
        
        // Calculate average rating
        const averageRating = reviewCount > 0 
          ? book.reviews.reduce((sum: number, review: any) => sum + review.rating, 0) / reviewCount
          : 0;

        return {
          ...book,
          reviewCount,
          averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
          favoriteCount,
        };
      });

      // Sort by popularity score
      const popularBooks = booksWithMetrics
        .filter((book: any) => book.reviewCount > 0 || book.favoriteCount > 0) // Only books with some engagement
        .sort((a: any, b: any) => {
          // Calculate popularity score
          const scoreA = this.calculatePopularityScore(a);
          const scoreB = this.calculatePopularityScore(b);
          
          return scoreB - scoreA; // Descending order
        })
        .slice(0, 20); // Top 20 popular books

      console.log(`✅ Popular books generated: ${popularBooks.length} items`);
      
      return popularBooks;
    } catch (error) {
      console.error('❌ Error getting popular books:', error);
      throw new Error('Failed to fetch popular books');
    }
  }

  /**
   * Calculate popularity score based on reviews, ratings, and favorites
   */
  private calculatePopularityScore(book: PopularBook): number {
    const reviewWeight = 1;
    const ratingWeight = 2;
    const favoriteWeight = 3;
    
    // Base score from review count
    let score = book.reviewCount * reviewWeight;
    
    // Bonus for high ratings (only if there are reviews)
    if (book.reviewCount > 0) {
      score += book.averageRating * ratingWeight;
    }
    
    // Bonus for favorites
    score += book.favoriteCount * favoriteWeight;
    
    return score;
  }

  /**
   * Get top-rated books (minimum 3 reviews)
   */
  async getTopRatedBooks(): Promise<PopularBook[]> {
    console.log('⭐ Getting top-rated books...');
    
    try {
      const books = await prisma.book.findMany({
        include: {
          reviews: {
            select: {
              rating: true,
            },
          },
          favorites: {
            select: {
              id: true,
            },
          },
        },
      });

      const booksWithMetrics = books.map((book: any) => {
        const reviewCount = book.reviews.length;
        const favoriteCount = book.favorites.length;
        
        const averageRating = reviewCount > 0 
          ? book.reviews.reduce((sum: number, review: any) => sum + review.rating, 0) / reviewCount
          : 0;

        return {
          ...book,
          reviewCount,
          averageRating: Math.round(averageRating * 10) / 10,
          favoriteCount,
        };
      });

      // Filter books with at least 3 reviews and sort by rating
      const topRatedBooks = booksWithMetrics
        .filter((book: any) => book.reviewCount >= 3)
        .sort((a: any, b: any) => b.averageRating - a.averageRating)
        .slice(0, 10);

      console.log(`✅ Top-rated books generated: ${topRatedBooks.length} items`);
      
      return topRatedBooks;
    } catch (error) {
      console.error('❌ Error getting top-rated books:', error);
      throw new Error('Failed to fetch top-rated books');
    }
  }

  /**
   * Get most explored books (most reviews)
   */
  async getMostExploredBooks(): Promise<PopularBook[]> {
    console.log('🔍 Getting most explored books...');
    
    try {
      const books = await prisma.book.findMany({
        include: {
          reviews: {
            select: {
              rating: true,
            },
          },
          favorites: {
            select: {
              id: true,
            },
          },
        },
      });

      const booksWithMetrics = books.map((book: any) => {
        const reviewCount = book.reviews.length;
        const favoriteCount = book.favorites.length;
        
        const averageRating = reviewCount > 0 
          ? book.reviews.reduce((sum: number, review: any) => sum + review.rating, 0) / reviewCount
          : 0;

        return {
          ...book,
          reviewCount,
          averageRating: Math.round(averageRating * 10) / 10,
          favoriteCount,
        };
      });

      // Sort by review count
      const mostExploredBooks = booksWithMetrics
        .filter((book: any) => book.reviewCount > 0)
        .sort((a: any, b: any) => b.reviewCount - a.reviewCount)
        .slice(0, 10);

      console.log(`✅ Most explored books generated: ${mostExploredBooks.length} items`);
      
      return mostExploredBooks;
    } catch (error) {
      console.error('❌ Error getting most explored books:', error);
      throw new Error('Failed to fetch most explored books');
    }
  }
}

export const popularBooksService = new PopularBooksService();
