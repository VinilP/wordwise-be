export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  coverImageUrl: string;
  genres: string[];
  publishedYear: number;
  averageRating: number | null;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Review {
  id: string;
  bookId: string;
  userId: string;
  content: string;
  rating: number;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
  book?: Book;
}

export interface UserFavorite {
  id: string;
  userId: string;
  bookId: string;
  createdAt: Date;
  book?: Book;
}

export interface UserProfile {
  user: User;
  reviews: Review[];
  favorites: UserFavorite[];
  favoriteGenres: string[];
  averageRating: number;
}

export interface Recommendation {
  book: Book;
  reason: string;
  confidence: number;
}

// API Request/Response Types
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface CreateReviewRequest {
  bookId: string;
  content: string;
  rating: number;
}

export interface UpdateReviewRequest {
  content?: string;
  rating?: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface BookFilters {
  genres?: string[];
  minRating?: number;
  publishedYear?: number;
}

export interface SearchFilters extends BookFilters {
  query?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: unknown;
  };
}

// Express Request Extensions
export interface AuthenticatedRequest extends Request {
  user?: User;
}
