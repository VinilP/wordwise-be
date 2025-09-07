import { Request, Response, NextFunction } from 'express';
import { BookService } from '../services/book.service';
import { PaginationParams, BookFilters, SearchFilters, ApiResponse } from '../types';

export class BookController {
  constructor(private bookService: BookService) {}

  getAllBooks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Parse pagination parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const pagination: PaginationParams = { page, limit };

      // Check if this is a search request
      const searchQuery = req.query.search as string;
      
      if (searchQuery && searchQuery.trim().length > 0) {
        // Handle search request
        const filters: SearchFilters = {};
        
        if (req.query.genres) {
          const genresParam = req.query.genres as string;
          filters.genres = genresParam.split(',').map(g => g.trim()).filter(g => g.length > 0);
        }

        if (req.query.minRating) {
          const minRating = parseFloat(req.query.minRating as string);
          if (!isNaN(minRating)) {
            filters.minRating = minRating;
          }
        }

        if (req.query.publishedYear) {
          const publishedYear = parseInt(req.query.publishedYear as string);
          if (!isNaN(publishedYear)) {
            filters.publishedYear = publishedYear;
          }
        }

        // Validate filters
        const validatedFilters = this.bookService.validateFilters(filters);

        const result = await this.bookService.searchBooks(searchQuery.trim(), pagination, validatedFilters);

        const response: ApiResponse = {
          success: true,
          data: result,
        };

        res.status(200).json(response);
        return;
      }

      // Handle regular get all books request
      const filters: BookFilters = {};
      
      if (req.query.genres) {
        const genresParam = req.query.genres as string;
        filters.genres = genresParam.split(',').map(g => g.trim()).filter(g => g.length > 0);
      }

      if (req.query.minRating) {
        const minRating = parseFloat(req.query.minRating as string);
        if (!isNaN(minRating)) {
          filters.minRating = minRating;
        }
      }

      if (req.query.publishedYear) {
        const publishedYear = parseInt(req.query.publishedYear as string);
        if (!isNaN(publishedYear)) {
          filters.publishedYear = publishedYear;
        }
      }

      // Validate filters
      const validatedFilters = this.bookService.validateFilters(filters);

      const result = await this.bookService.getAllBooks(pagination, validatedFilters);

      const response: ApiResponse = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getBookById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const book = await this.bookService.getBookById(id);

      if (!book) {
        const response: ApiResponse = {
          success: false,
          error: {
            message: 'Book not found',
            code: 'BOOK_NOT_FOUND',
          },
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: book,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  searchBooks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query.q as string;

      if (!query || query.trim().length === 0) {
        const response: ApiResponse = {
          success: false,
          error: {
            message: 'Search query is required',
            code: 'MISSING_QUERY',
          },
        };
        res.status(400).json(response);
        return;
      }

      // Parse pagination parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const pagination: PaginationParams = { page, limit };

      // Parse filters
      const filters: SearchFilters = {};
      
      if (req.query.genres) {
        const genresParam = req.query.genres as string;
        filters.genres = genresParam.split(',').map(g => g.trim()).filter(g => g.length > 0);
      }

      if (req.query.minRating) {
        const minRating = parseFloat(req.query.minRating as string);
        if (!isNaN(minRating)) {
          filters.minRating = minRating;
        }
      }

      if (req.query.publishedYear) {
        const publishedYear = parseInt(req.query.publishedYear as string);
        if (!isNaN(publishedYear)) {
          filters.publishedYear = publishedYear;
        }
      }

      // Validate filters
      const validatedFilters = this.bookService.validateFilters(filters);

      const result = await this.bookService.searchBooks(query, pagination, validatedFilters);

      const response: ApiResponse = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getPopularBooks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;

      const books = await this.bookService.getPopularBooks(limit);

      const response: ApiResponse = {
        success: true,
        data: books,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  getBooksByGenre = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { genre } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;

      if (!genre || genre.trim().length === 0) {
        const response: ApiResponse = {
          success: false,
          error: {
            message: 'Genre parameter is required',
            code: 'MISSING_GENRE',
          },
        };
        res.status(400).json(response);
        return;
      }

      const books = await this.bookService.getBooksByGenre(genre, limit);

      const response: ApiResponse = {
        success: true,
        data: books,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}