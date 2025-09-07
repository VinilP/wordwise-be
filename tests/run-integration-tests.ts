#!/usr/bin/env ts-node

import { execSync } from 'child_process';
import { setupTestDatabase, teardownTestDatabase } from './test-database';

async function runIntegrationTests() {
  console.log('🚀 Starting integration test suite...');
  
  try {
    // Setup test database
    console.log('📊 Setting up test database...');
    await setupTestDatabase();
    
    // Run the tests
    console.log('🧪 Running integration tests...');
    execSync('npm run test:integration:run', { 
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'test' }
    });
    
    console.log('✅ All integration tests passed!');
    
  } catch (error) {
    console.error('❌ Integration tests failed:', error);
    process.exit(1);
  } finally {
    // Cleanup
    console.log('🧹 Cleaning up test database...');
    await teardownTestDatabase();
  }
}

// Run if called directly
if (require.main === module) {
  runIntegrationTests();
}

export { runIntegrationTests };