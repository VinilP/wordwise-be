import app from './app';
import config, { checkDatabaseConnection, disconnectDatabase } from './config';

const startServer = async (): Promise<void> => {
  try {
    // Check database connection
    console.log('🔍 Checking database connection...');
    const dbConnected = await checkDatabaseConnection();
    
    if (!dbConnected) {
      console.error('❌ Database connection failed');
      process.exit(1);
    }
    
    console.log('✅ Database connected successfully');
    
    const server = app.listen(config.server.port, () => {
      console.log(`🚀 Server running on port ${config.server.port}`);
      console.log(`📚 Book Review Platform API`);
      console.log(`🌍 Environment: ${config.server.nodeEnv}`);
      console.log(`🔗 Health check: http://localhost:${config.server.port}/health`);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);
      
      server.close(async () => {
        console.log('HTTP server closed.');
        
        // Close database connections
        await disconnectDatabase();
        
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();