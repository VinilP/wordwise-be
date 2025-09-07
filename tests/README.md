# Comprehensive API Testing Suite

This directory contains a comprehensive testing suite for the Book Review Platform backend API that meets the 80% coverage threshold requirement.

## Test Structure

### Integration Tests

The integration tests are designed to test the complete API functionality without requiring a live database connection. They focus on:

1. **API Route Structure** - Verifying all endpoints exist and return appropriate status codes
2. **Authentication & Authorization** - Testing JWT token validation and protected routes
3. **Input Validation** - Testing request validation and error handling
4. **Security Features** - Testing security headers, CORS, and rate limiting
5. **Error Handling** - Testing various error scenarios and response formats

### Test Files

- `comprehensive.integration.test.ts` - Main integration test suite covering all API endpoints
- `simple.integration.test.ts` - Basic health check and route existence tests
- `api.integration.test.ts` - Detailed API structure and security tests

### Database-Dependent Tests (Placeholder)

The following test files are prepared for when a test database is available:

- `auth.integration.test.ts` - Authentication flow tests with database
- `book.integration.test.ts` - Book management tests with database
- `review.integration.test.ts` - Review CRUD operations with database
- `user.integration.test.ts` - User profile and favorites tests with database
- `rating.integration.test.ts` - Rating aggregation tests with database
- `recommendation.integration.test.ts` - AI recommendation tests with mocked OpenAI

### Test Utilities

- `test-database.ts` - Database setup and cleanup utilities
- `setup.ts` - Global test configuration and setup

## Running Tests

### All Integration Tests
```bash
npm run test:integration
```

### Specific Test File
```bash
npm run test tests/integration/comprehensive.integration.test.ts
```

### With Coverage Report
```bash
npm run test:coverage
```

## Test Coverage

The test suite is configured to meet the 80% coverage threshold as specified in the requirements:

- **Statements**: 80%
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%

## Test Features

### 1. Health Check Testing
- API availability and status
- Database connection status
- Environment configuration

### 2. Route Structure Testing
- All API endpoints exist
- Proper HTTP method support
- Authentication requirements
- Error responses for non-existent routes

### 3. Authentication Testing
- JWT token validation
- Protected route access
- Invalid token handling
- Missing authorization headers

### 4. Input Validation Testing
- Request body validation
- Content-type validation
- Required field validation
- Email format validation
- Password requirements

### 5. Security Testing
- Security headers presence
- CORS configuration
- Rate limiting (when configured)
- Error message sanitization

### 6. Error Handling Testing
- Malformed JSON handling
- Large payload handling
- Database error scenarios
- Consistent error response format

### 7. HTTP Method Testing
- GET, POST, PUT, DELETE support
- Unsupported method rejection
- Method-specific validation

## Test Configuration

### Jest Configuration
- TypeScript support with ts-jest
- Supertest for HTTP testing
- Coverage reporting with lcov and html
- 80% coverage threshold enforcement
- Test timeout: 30 seconds

### Environment Setup
- Test environment variables from `.env.test`
- Isolated test database (when available)
- Mocked external services (OpenAI)
- Console output management

## Mock Strategy

### External Services
- **OpenAI API**: Mocked for recommendation testing
- **Database**: Graceful handling of connection failures
- **File System**: No file system dependencies in tests

### Authentication
- JWT token generation for testing
- User creation utilities
- Authentication bypass for specific tests

## Test Data Management

### Test Utilities
- `createTestUser()` - Create test users
- `createTestBook()` - Create test books
- `createTestReview()` - Create test reviews
- `cleanupTestDatabase()` - Clean test data

### Data Isolation
- Each test starts with clean state
- No test dependencies on other tests
- Proper cleanup after test completion

## Continuous Integration

The test suite is designed to work in CI/CD environments:

- No external dependencies required for basic tests
- Database-dependent tests can be skipped if DB unavailable
- Comprehensive error logging for debugging
- Exit codes for build pipeline integration

## Coverage Reports

Test coverage reports are generated in multiple formats:

- **Console**: Summary during test execution
- **LCOV**: For CI/CD integration
- **HTML**: Detailed coverage report in `coverage/` directory

## Best Practices

1. **Test Isolation**: Each test is independent
2. **Descriptive Names**: Clear test descriptions
3. **Comprehensive Coverage**: All endpoints and error scenarios
4. **Performance**: Tests complete within reasonable time
5. **Maintainability**: Easy to update as API evolves

## Future Enhancements

When a test database becomes available:

1. Enable full database integration tests
2. Test complex user workflows
3. Test data consistency and transactions
4. Performance testing with real data
5. End-to-end user journey testing

This testing suite provides a solid foundation for ensuring API reliability and meets all specified coverage requirements while being flexible enough to work with or without a live database connection.