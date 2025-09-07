import { Request, Response } from 'express';
import { popularBooksService } from '../services/popular-books.service';

export class PopularBooksController {
  /**
   * Get popular books
   */
  async getPopularBooks(req: Request, res: Response): Promise<void> {
    try {
      console.log('📚 Popular books request received');
      
      const popularBooks = await popularBooksService.getPopularBooks();
      
      res.status(200).json({
        success: true,
        data: {
          books: popularBooks,
          message: `Found ${popularBooks.length} popular books`
        }
      });
    } catch (error: any) {
      console.error('❌ Error in getPopularBooks:', error);
      
      res.status(500).json({
        success: false,
        error: {
          message: error.message || 'Failed to fetch popular books',
          code: 'POPULAR_BOOKS_ERROR'
        }
      });
    }
  }

  /**
   * Get top-rated books
   */
  async getTopRatedBooks(req: Request, res: Response): Promise<void> {
    try {
      console.log('⭐ Top-rated books request received');
      
      const topRatedBooks = await popularBooksService.getTopRatedBooks();
      
      res.status(200).json({
        success: true,
        data: {
          books: topRatedBooks,
          message: `Found ${topRatedBooks.length} top-rated books`
        }
      });
    } catch (error: any) {
      console.error('❌ Error in getTopRatedBooks:', error);
      
      res.status(500).json({
        success: false,
        error: {
          message: error.message || 'Failed to fetch top-rated books',
          code: 'TOP_RATED_BOOKS_ERROR'
        }
      });
    }
  }

  /**
   * Get most explored books
   */
  async getMostExploredBooks(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔍 Most explored books request received');
      
      const mostExploredBooks = await popularBooksService.getMostExploredBooks();
      
      res.status(200).json({
        success: true,
        data: {
          books: mostExploredBooks,
          message: `Found ${mostExploredBooks.length} most explored books`
        }
      });
    } catch (error: any) {
      console.error('❌ Error in getMostExploredBooks:', error);
      
      res.status(500).json({
        success: false,
        error: {
          message: error.message || 'Failed to fetch most explored books',
          code: 'MOST_EXPLORED_BOOKS_ERROR'
        }
      });
    }
  }
}
