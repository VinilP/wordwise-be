import jwt, { SignOptions } from 'jsonwebtoken';
import { StringValue } from 'ms';
import { User } from '../types';

interface JwtPayload {
  userId: string;
  email: string;
}

interface TokenPair {
  token: string;
  refreshToken: string;
}

export class JwtUtils {
  private static get JWT_SECRET(): string {
    return process.env.JWT_SECRET || 'fallback-secret';
  }
  
  private static get JWT_EXPIRES_IN(): string {
    return process.env.JWT_EXPIRES_IN || '7d';
  }
  
  private static get JWT_REFRESH_SECRET(): string {
    return process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';
  }
  
  private static get JWT_REFRESH_EXPIRES_IN(): string {
    return process.env.JWT_REFRESH_EXPIRES_IN || '30d';
  }

  /**
   * Generate access and refresh tokens for a user
   */
  static generateTokens(user: User): TokenPair {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
    };

    const tokenOptions: SignOptions = {
      expiresIn: this.JWT_EXPIRES_IN as StringValue,
    };

    const refreshTokenOptions: SignOptions = {
      expiresIn: this.JWT_REFRESH_EXPIRES_IN as StringValue,
    };

    const token = jwt.sign(payload, this.JWT_SECRET, tokenOptions);
    
    // Add random component to refresh token payload to ensure uniqueness
    const refreshPayload = {
      ...payload,
      jti: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15), // Random JTI
    };
    const refreshToken = jwt.sign(refreshPayload, this.JWT_REFRESH_SECRET, refreshTokenOptions);

    return { token, refreshToken };
  }

  /**
   * Verify and decode an access token
   */
  static verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, this.JWT_SECRET) as JwtPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      throw new Error('Token verification failed');
    }
  }

  /**
   * Verify and decode a refresh token
   */
  static verifyRefreshToken(refreshToken: string): JwtPayload {
    try {
      return jwt.verify(refreshToken, this.JWT_REFRESH_SECRET) as JwtPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      }
      throw new Error('Refresh token verification failed');
    }
  }

  /**
   * Extract token from Authorization header
   */
  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }
}