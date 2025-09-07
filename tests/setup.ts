// Jest setup file for global test configuration
import dotenv from 'dotenv';
import { setupTestDatabase, teardownTestDatabase } from './test-database';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Mock console methods to reduce noise in tests (only in CI or when SILENT_TESTS is set)
if (process.env.CI || process.env.SILENT_TESTS) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  };
}

// Global test timeout
jest.setTimeout(30000);

// Global setup and teardown
beforeAll(async () => {
  try {
    await setupTestDatabase();
  } catch (error) {
    console.warn('Test database setup failed:', error);
  }
});

afterAll(async () => {
  try {
    await teardownTestDatabase();
  } catch (error) {
    console.warn('Test database teardown failed:', error);
  }
});