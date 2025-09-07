import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

interface Config {
  server: {
    port: number;
    nodeEnv: string;
    apiPrefix: string;
  };
  database: {
    url: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  openai: {
    apiKey: string;
  };
  aws: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    s3BucketName: string;
  };
  redis: {
    url: string;
  };
  cors: {
    origin: string;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
}

const config: Config = {
  server: {
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    apiPrefix: process.env.API_PREFIX || '/api',
  },
  database: {
    url: process.env.DATABASE_URL || '',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    s3BucketName: process.env.S3_BUCKET_NAME || '',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
};

// Validate required environment variables
const validateConfig = (): void => {
  const requiredVars = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.warn(
      `Warning: Missing environment variables: ${missingVars.join(', ')}`
    );
  }

  if (config.server.nodeEnv === 'production') {
    const productionRequiredVars = [
      'OPENAI_API_KEY',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'S3_BUCKET_NAME',
    ];

    const missingProdVars = productionRequiredVars.filter(
      varName => !process.env[varName]
    );

    if (missingProdVars.length > 0) {
      throw new Error(
        `Missing required production environment variables: ${missingProdVars.join(', ')}`
      );
    }
  }
};

validateConfig();

export default config;

// Export database utilities
export { 
  getPrismaClient, 
  checkDatabaseConnection, 
  disconnectDatabase, 
  handleDatabaseError 
} from './database';
