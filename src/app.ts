import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import config, { checkDatabaseConnection } from './config';
import { errorHandler, notFoundHandler, requestLogger, securityHeaders, rateLimiter } from './middleware';
import { createSuccessResponse } from './utils';

const app = express();

// Security middleware
app.use(helmet());
app.use(securityHeaders);

// CORS configuration
app.use(
  cors({
    origin: config.server.nodeEnv === 'development' 
      ? ['http://localhost:3000', 'http://localhost:3001']
      : config.cors.origin,
    credentials: true,
  })
);

// Logging middleware
if (config.server.nodeEnv === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
  app.use(requestLogger);
}

// Rate limiting middleware (global) - disabled in development
if (config.server.nodeEnv !== 'development') {
  app.use(
    rateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100, // Limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later',
    })
  );
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbConnected = await checkDatabaseConnection();
    
    res.status(200).json(
      createSuccessResponse(
        {
          message: 'Book Review Platform API is running',
          timestamp: new Date().toISOString(),
          environment: config.server.nodeEnv,
          version: '1.0.0',
          database: dbConnected ? 'connected' : 'disconnected',
        },
        'API is healthy'
      )
    );
  } catch (error) {
    res.status(503).json({
      success: false,
      error: {
        message: 'Service unavailable',
        details: 'Database connection failed',
      },
    });
  }
});

// API routes
import { createApiRoutes } from './routes';
import { getPrismaClient } from './config/database';

const prisma = getPrismaClient();
app.use(config.server.apiPrefix, createApiRoutes(prisma));

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;