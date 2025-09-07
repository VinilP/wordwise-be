import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';
import { Book, Review, User, Recommendation, UserProfile } from '../types';

const prisma = new PrismaClient();

class RecommendationService {
  private openai: OpenAI;
  private cache: Map<string, { recommendations: Recommendation[]; timestamp: number }>;
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 2000; // 2 seconds
  private readonly RATE_LIMIT_DELAY = 60000; // 60 seconds for rate limit
  private lastAPICall: number = 0;
  private readonly MIN_API_INTERVAL = 5000; // 5 seconds between API calls

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.cache = new Map();
  }

  /**
   * Get personalized recommendations for a user
   */
  async getPersonalizedRecommendations(userId: string): Promise<Recommendation[]> {
    try {
      console.log(`🔍 Getting recommendations for user: ${userId}`);
      
      // Check cache first
      const cached = this.getCachedRecommendations(userId);
      if (cached) {
        console.log(`📦 Returning cached recommendations: ${cached.length} items`);
        return cached;
      }

      // Get user profile and review history
      const userProfile = await this.getUserProfile(userId);
      console.log(`👤 User profile - Reviews: ${userProfile.reviews.length}, Favorites: ${userProfile.favorites.length}`);
      
      // Check if user has sufficient data (reviews or favorites)
      if (userProfile.reviews.length === 0 && userProfile.favorites.length === 0) {
        console.log(`⚠️ No reviews or favorites found, returning fallback recommendations`);
        return this.getFallbackRecommendations();
      }

      // Generate AI recommendations
      let recommendations: Recommendation[];
      try {
        console.log(`🤖 Generating AI recommendations...`);
        recommendations = await this.generateAIRecommendations(userProfile);
        console.log(`✅ AI recommendations generated: ${recommendations.length} items`);
      } catch (error) {
        console.error('AI recommendation failed, falling back to genre-based:', error);
        const reviewedBookIds = userProfile.reviews.map(r => r.bookId);
        const favoritedBookIds = userProfile.favorites.map(f => f.bookId);
        const excludedBookIds = [...reviewedBookIds, ...favoritedBookIds];
        recommendations = await this.getGenreBasedRecommendations(userProfile.favoriteGenres, excludedBookIds);
        console.log(`🔄 Genre-based recommendations generated: ${recommendations.length} items`);
      }

      // Cache the results
      this.cacheRecommendations(userId, recommendations);
      console.log(`💾 Cached ${recommendations.length} recommendations for user ${userId}`);

      return recommendations;
    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      return this.getFallbackRecommendations();
    }
  }

  /**
   * Get user profile with review history and preferences
   */
  private async getUserProfile(userId: string): Promise<UserProfile> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Fetch both reviews and favorites
    const [reviewsFromDb, favoritesFromDb] = await Promise.all([
      prisma.review.findMany({
        where: { userId },
        include: {
          book: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.userFavorite.findMany({
        where: { userId },
        include: {
          book: true,
        },
        orderBy: { createdAt: 'desc' },
      })
    ]);
    
    console.log(`📊 Database query results - Reviews: ${reviewsFromDb.length}, Favorites: ${favoritesFromDb.length}`);

    // Transform database results to match our types
    const reviews: Review[] = reviewsFromDb.map(review => ({
      id: review.id,
      bookId: review.bookId,
      userId: review.userId,
      content: review.content || '',
      rating: review.rating,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      book: review.book ? {
        id: review.book.id,
        title: review.book.title,
        author: review.book.author,
        description: review.book.description || '',
        coverImageUrl: review.book.coverImageUrl || '',
        genres: review.book.genres || [],
        publishedYear: review.book.publishedYear || 0,
        averageRating: Number(review.book.averageRating) || 0,
        reviewCount: review.book.reviewCount,
        createdAt: review.book.createdAt,
        updatedAt: review.book.updatedAt,
      } : undefined,
    }));

    // Transform favorites
    const favorites = favoritesFromDb.map(favorite => ({
      id: favorite.id,
      userId: favorite.userId,
      bookId: favorite.bookId,
      createdAt: favorite.createdAt,
      book: favorite.book ? {
        id: favorite.book.id,
        title: favorite.book.title,
        author: favorite.book.author,
        description: favorite.book.description || '',
        coverImageUrl: favorite.book.coverImageUrl || '',
        genres: favorite.book.genres || [],
        publishedYear: favorite.book.publishedYear || 0,
        averageRating: Number(favorite.book.averageRating) || 0,
        reviewCount: favorite.book.reviewCount,
        createdAt: favorite.book.createdAt,
        updatedAt: favorite.book.updatedAt,
      } : undefined,
    }));

    // Extract favorite genres from reviewed books and favorites
    const genreMap = new Map<string, number>();
    let totalRating = 0;

    // Process reviews (with ratings)
    reviews.forEach((review) => {
      totalRating += review.rating;
      if (review.book?.genres) {
        review.book.genres.forEach((genre: string) => {
          genreMap.set(genre, (genreMap.get(genre) || 0) + review.rating);
        });
      }
    });

    // Process favorites (treat as high preference - rating of 4.5)
    favorites.forEach((favorite) => {
      if (favorite.book?.genres) {
        favorite.book.genres.forEach((genre: string) => {
          genreMap.set(genre, (genreMap.get(genre) || 0) + 4.5);
        });
      }
    });

    // Sort genres by weighted preference (rating * frequency)
    const favoriteGenres = Array.from(genreMap.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([genre]) => genre);

    const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      reviews,
      favorites,
      favoriteGenres,
      averageRating,
    };
  }

  /**
   * Generate AI-powered recommendations using OpenAI
   */
  private async generateAIRecommendations(userProfile: UserProfile): Promise<Recommendation[]> {
    const prompt = this.generateRecommendationPrompt(userProfile);
    
    let attempt = 0;
    while (attempt < this.MAX_RETRIES) {
      try {
        const response = await this.callOpenAIAPI(prompt);
        return this.parseAIResponse(response, userProfile);
      } catch (error: any) {
        attempt++;
        
        // Handle rate limiting specifically
        if (error.message?.includes('Rate limit exceeded')) {
          console.log(`⏳ Rate limit hit, waiting ${this.RATE_LIMIT_DELAY / 1000} seconds before retry ${attempt}/${this.MAX_RETRIES}`);
          if (attempt >= this.MAX_RETRIES) {
            throw error;
          }
          await this.delay(this.RATE_LIMIT_DELAY);
          continue;
        }
        
        // Handle other errors
        if (attempt >= this.MAX_RETRIES) {
          throw error;
        }
        
        console.log(`🔄 Retrying AI recommendation (attempt ${attempt}/${this.MAX_RETRIES}) after ${this.RETRY_DELAY * attempt}ms`);
        await this.delay(this.RETRY_DELAY * attempt);
      }
    }

    throw new Error('Failed to generate AI recommendations after retries');
  }

  /**
   * Generate recommendation prompt based on user profile
   */
  generateRecommendationPrompt(userProfile: UserProfile): string {
    const { reviews, favorites, favoriteGenres, averageRating } = userProfile;
    
    const recentReviews = reviews.slice(0, 10); // Last 10 reviews
    const highRatedBooks = recentReviews.filter(r => r.rating >= 4);
    const lowRatedBooks = recentReviews.filter(r => r.rating <= 2);
    const recentFavorites = favorites.slice(0, 5); // Last 5 favorites

    let prompt = `Based on a user's reading history and preferences, recommend 5 books they might enjoy. Here's their profile:

Average Rating Given: ${averageRating.toFixed(1)}/5
Favorite Genres: ${favoriteGenres.join(', ')}

Recent High-Rated Books (4-5 stars):
${highRatedBooks.map(r => `- "${r.book?.title}" by ${r.book?.author} (${r.rating}/5): ${r.content?.substring(0, 100) || 'No review text'}`).join('\n')}

Recent Low-Rated Books (1-2 stars):
${lowRatedBooks.map(r => `- "${r.book?.title}" by ${r.book?.author} (${r.rating}/5): ${r.content?.substring(0, 100) || 'No review text'}`).join('\n')}

Favorite Books (marked as favorites):
${recentFavorites.map(f => `- "${f.book?.title}" by ${f.book?.author}"`).join('\n')}

Please recommend 5 books with the following JSON format:
{
  "recommendations": [
    {
      "title": "Book Title",
      "author": "Author Name",
      "reason": "Brief explanation why this book matches their preferences",
      "confidence": 0.85
    }
  ]
}

Focus on books that match their preferred genres and reading patterns. Consider both their review ratings and favorite books. Avoid books they've already reviewed or favorited.`;

    return prompt;
  }

  /**
   * Call OpenAI API with rate limiting and error handling
   */
  async callOpenAIAPI(prompt: string): Promise<string> {
    try {
      // Rate limiting: ensure minimum interval between API calls
      const now = Date.now();
      const timeSinceLastCall = now - this.lastAPICall;
      if (timeSinceLastCall < this.MIN_API_INTERVAL) {
        const waitTime = this.MIN_API_INTERVAL - timeSinceLastCall;
        console.log(`⏳ Rate limiting: waiting ${waitTime}ms before API call`);
        await this.delay(waitTime);
      }
      
      console.log('🤖 Making OpenAI API call...');
      this.lastAPICall = Date.now();
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a knowledgeable book recommendation assistant. Provide thoughtful, personalized book recommendations based on user reading history. Keep responses concise and focused.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 800, // Reduced to avoid rate limits
        temperature: 0.7,
      });

      const response = completion.choices[0]?.message?.content || '';
      console.log('✅ OpenAI API call successful');
      return response;
    } catch (error: any) {
      console.error('❌ OpenAI API error:', error.message);
      
      if (error.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (error.status === 401) {
        throw new Error('Invalid OpenAI API key.');
      }
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }

  /**
   * Parse AI response and match with existing books in database
   */
  private async parseAIResponse(response: string, userProfile: UserProfile): Promise<Recommendation[]> {
    try {
      const parsed = JSON.parse(response);
      const recommendations: Recommendation[] = [];
      
      // Get list of already reviewed and favorited book IDs to avoid duplicates
      const reviewedBookIds = userProfile.reviews.map(r => r.bookId);
      const favoritedBookIds = userProfile.favorites.map(f => f.bookId);
      const excludedBookIds = [...reviewedBookIds, ...favoritedBookIds];

      for (const rec of parsed.recommendations) {
        // Try to find the book in our database
        const book = await prisma.book.findFirst({
          where: {
            AND: [
              {
                OR: [
                  { title: { contains: rec.title, mode: 'insensitive' } },
                  { 
                    AND: [
                      { title: { contains: rec.title.split(' ')[0], mode: 'insensitive' } },
                      { author: { contains: rec.author, mode: 'insensitive' } }
                    ]
                  }
                ]
              },
              {
                id: { notIn: excludedBookIds }
              }
            ]
          }
        });

        if (book) {
          recommendations.push({
            book: {
              id: book.id,
              title: book.title,
              author: book.author,
              description: book.description || '',
              coverImageUrl: book.coverImageUrl || '',
              genres: book.genres || [],
              publishedYear: book.publishedYear || 0,
              averageRating: Number(book.averageRating) || 0,
              reviewCount: book.reviewCount,
              createdAt: book.createdAt,
              updatedAt: book.updatedAt,
            },
            reason: rec.reason,
            confidence: rec.confidence || 0.8,
          });
        }
      }

      // If we found fewer than 3 books, supplement with genre-based recommendations
      if (recommendations.length < 3) {
        const fallback = await this.getGenreBasedRecommendations(userProfile.favoriteGenres, excludedBookIds);
        recommendations.push(...fallback.slice(0, 5 - recommendations.length));
      }

      return recommendations.slice(0, 5);
    } catch (error) {
      console.error('Error parsing AI response:', error);
      throw new Error('Failed to parse AI recommendations');
    }
  }

  /**
   * Get genre-based recommendations as fallback
   */
  private async getGenreBasedRecommendations(favoriteGenres: string[], excludedBookIds: string[] = []): Promise<Recommendation[]> {
    try {
      const books = await prisma.book.findMany({
        where: {
          AND: [
            {
              OR: favoriteGenres.map(genre => ({
                genres: {
                  has: genre
                }
              }))
            },
            {
              id: { notIn: excludedBookIds }
            }
          ]
        },
        orderBy: [
          { averageRating: 'desc' },
          { reviewCount: 'desc' }
        ],
        take: 10
      });

      return books.slice(0, 5).map(book => ({
        book: {
          id: book.id,
          title: book.title,
          author: book.author,
          description: book.description || '',
          coverImageUrl: book.coverImageUrl || '',
          genres: book.genres || [],
          publishedYear: book.publishedYear || 0,
          averageRating: Number(book.averageRating) || 0,
          reviewCount: book.reviewCount,
          createdAt: book.createdAt,
          updatedAt: book.updatedAt,
        },
        reason: `Recommended based on your interest in ${favoriteGenres.join(', ')} genres`,
        confidence: 0.7,
      }));
    } catch (error) {
      console.error('Error getting genre-based recommendations:', error);
      return this.getFallbackRecommendations();
    }
  }

  /**
   * Get fallback recommendations for users with no review history
   */
  private async getFallbackRecommendations(): Promise<Recommendation[]> {
    try {
      const popularBooks = await prisma.book.findMany({
        where: {
          reviewCount: { gt: 0 }
        },
        orderBy: [
          { averageRating: 'desc' },
          { reviewCount: 'desc' }
        ],
        take: 5
      });

      return popularBooks.map(book => ({
        book: {
          id: book.id,
          title: book.title,
          author: book.author,
          description: book.description || '',
          coverImageUrl: book.coverImageUrl || '',
          genres: book.genres || [],
          publishedYear: book.publishedYear || 0,
          averageRating: Number(book.averageRating) || 0,
          reviewCount: book.reviewCount,
          createdAt: book.createdAt,
          updatedAt: book.updatedAt,
        },
        reason: 'Popular book with high ratings from our community',
        confidence: 0.6,
      }));
    } catch (error) {
      console.error('Error getting fallback recommendations:', error);
      return [];
    }
  }

  /**
   * Cache recommendations for a user
   */
  private cacheRecommendations(userId: string, recommendations: Recommendation[]): void {
    this.cache.set(userId, {
      recommendations,
      timestamp: Date.now(),
    });
  }

  /**
   * Get cached recommendations if still valid
   */
  private getCachedRecommendations(userId: string): Recommendation[] | null {
    const cached = this.cache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.recommendations;
    }
    
    // Remove expired cache
    if (cached) {
      this.cache.delete(userId);
    }
    
    return null;
  }

  /**
   * Clear cache for a specific user (useful when user adds new reviews)
   */
  clearUserCache(userId: string): void {
    this.cache.delete(userId);
  }

  /**
   * Clear all cached recommendations
   */
  clearAllCache(): void {
    this.cache.clear();
  }

  /**
   * Utility method to add delay for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new RecommendationService();