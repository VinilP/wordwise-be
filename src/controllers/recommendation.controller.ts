import { Request, Response } from 'express';
import recommendationService from '../services/recommendation.service';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

class RecommendationController {
  /**
   * Get personalized recommendations for the authenticated user
   * GET /api/recommendations
   */
  async getRecommendations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            message: 'Authentication required',
            code: 'UNAUTHORIZED'
          }
        });
        return;
      }

      const recommendations = await recommendationService.getPersonalizedRecommendations(userId);

      res.status(200).json({
        success: true,
        data: {
          recommendations,
          message: recommendations.length === 0 
            ? 'No recommendations available. Try reviewing some books or adding books to your favorites first!' 
            : `Found ${recommendations.length} personalized recommendations`
        }
      });
    } catch (error: any) {
      console.error('Error getting recommendations:', error);
      
      // Handle specific error types
      if (error.message.includes('Rate limit exceeded')) {
        res.status(429).json({
          success: false,
          error: {
            message: 'Too many requests. Please try again later.',
            code: 'RATE_LIMIT_EXCEEDED'
          }
        });
        return;
      }

      if (error.message.includes('Invalid OpenAI API key')) {
        res.status(500).json({
          success: false,
          error: {
            message: 'Recommendation service temporarily unavailable',
            code: 'SERVICE_UNAVAILABLE'
          }
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get recommendations',
          code: 'INTERNAL_SERVER_ERROR',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }
      });
    }
  }

  /**
   * Clear recommendation cache for the authenticated user
   * DELETE /api/recommendations/cache
   */
  async clearCache(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            message: 'Authentication required',
            code: 'UNAUTHORIZED'
          }
        });
        return;
      }

      recommendationService.clearUserCache(userId);

      res.status(200).json({
        success: true,
        data: {
          message: 'Recommendation cache cleared successfully'
        }
      });
    } catch (error: any) {
      console.error('Error clearing recommendation cache:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to clear recommendation cache',
          code: 'INTERNAL_SERVER_ERROR'
        }
      });
    }
  }
}

export default new RecommendationController();