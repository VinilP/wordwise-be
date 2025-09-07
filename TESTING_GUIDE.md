# WordWise Testing Guide

This comprehensive guide covers all aspects of testing in the WordWise platform, including testing strategies, procedures, coverage requirements, and best practices.

## 📋 Table of Contents

- [Testing Philosophy](#testing-philosophy)
- [Testing Strategy](#testing-strategy)
- [Backend Testing](#backend-testing)
- [Frontend Testing](#frontend-testing)
- [Integration Testing](#integration-testing)
- [End-to-End Testing](#end-to-end-testing)
- [Performance Testing](#performance-testing)
- [Accessibility Testing](#accessibility-testing)
- [Test Coverage Requirements](#test-coverage-requirements)
- [CI/CD Testing](#cicd-testing)
- [Testing Tools](#testing-tools)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## 🎯 Testing Philosophy

### Our Testing Principles

1. **Test Early, Test Often**: Write tests as you develop features
2. **Test Behavior, Not Implementation**: Focus on what the code does, not how
3. **Maintainable Tests**: Write tests that are easy to understand and maintain
4. **Fast Feedback**: Tests should run quickly and provide immediate feedback
5. **Reliable Tests**: Tests should be deterministic and not flaky
6. **Comprehensive Coverage**: Cover all critical paths and edge cases

### Testing Pyramid

```
        /\
       /  \
      / E2E \     <- Few, slow, expensive
     /______\
    /        \
   /Integration\  <- Some, medium speed
  /____________\
 /              \
/    Unit Tests   \  <- Many, fast, cheap
/__________________\
```

## 🏗️ Testing Strategy

### Test Types Overview

| Test Type | Purpose | Speed | Scope | Tools |
|-----------|---------|-------|-------|-------|
| Unit | Test individual functions/components | Fast | Single unit | Jest, Vitest |
| Integration | Test component interactions | Medium | Multiple units | Jest, Supertest |
| E2E | Test complete user workflows | Slow | Full application | Playwright |
| Visual | Test UI consistency | Medium | Visual elements | Playwright |
| Performance | Test speed and efficiency | Slow | Performance metrics | Lighthouse |
| Accessibility | Test WCAG compliance | Medium | Accessibility | Jest-axe |

### Testing Levels

**Level 1: Unit Tests (70%)**
- Test individual functions, methods, and components
- Mock external dependencies
- Fast execution (< 1 second per test)
- High coverage of business logic

**Level 2: Integration Tests (20%)**
- Test API endpoints and database operations
- Test component interactions
- Medium execution time (1-10 seconds per test)
- Cover critical user flows

**Level 3: E2E Tests (10%)**
- Test complete user workflows
- Test cross-browser compatibility
- Slow execution (10+ seconds per test)
- Cover critical business scenarios

## 🔧 Backend Testing

### Unit Testing

**Test Structure:**
```typescript
// Example: BookService unit test
import { BookService } from '../book.service';
import { BookRepository } from '../book.repository';

describe('BookService', () => {
  let bookService: BookService;
  let mockRepository: jest.Mocked<BookRepository>;

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    } as any;
    
    bookService = new BookService(mockRepository);
  });

  describe('getBookById', () => {
    it('should return book when found', async () => {
      // Arrange
      const mockBook = { id: '1', title: 'Test Book', author: 'Test Author' };
      mockRepository.findById.mockResolvedValue(mockBook);

      // Act
      const result = await bookService.getBookById('1');

      // Assert
      expect(result).toEqual(mockBook);
      expect(mockRepository.findById).toHaveBeenCalledWith('1');
    });

    it('should throw error when book not found', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(bookService.getBookById('1')).rejects.toThrow('Book not found');
    });
  });
});
```

**Running Unit Tests:**
```bash
# Run all unit tests
npm run test:unit

# Run specific test file
npm run test -- book.service.test.ts

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Integration Testing

**API Endpoint Testing:**
```typescript
// Example: Book API integration test
import request from 'supertest';
import { app } from '../app';
import { getPrismaClient } from '../config/database';

describe('Book API', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = getPrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up test data
    await prisma.review.deleteMany();
    await prisma.book.deleteMany();
  });

  describe('GET /api/v1/books', () => {
    it('should return paginated books', async () => {
      // Arrange
      await prisma.book.createMany({
        data: [
          { title: 'Book 1', author: 'Author 1', description: 'Description 1' },
          { title: 'Book 2', author: 'Author 2', description: 'Description 2' }
        ]
      });

      // Act
      const response = await request(app)
        .get('/api/v1/books')
        .query({ page: 1, limit: 10 });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.books).toHaveLength(2);
      expect(response.body.data.pagination.total).toBe(2);
    });

    it('should handle search query', async () => {
      // Arrange
      await prisma.book.create({
        data: { title: 'JavaScript Guide', author: 'John Doe', description: 'Learn JS' }
      });

      // Act
      const response = await request(app)
        .get('/api/v1/books/search')
        .query({ q: 'JavaScript' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data.books).toHaveLength(1);
      expect(response.body.data.books[0].title).toContain('JavaScript');
    });
  });
});
```

**Database Testing:**
```typescript
// Example: Database operation test
describe('BookRepository', () => {
  let prisma: PrismaClient;
  let bookRepository: BookRepository;

  beforeAll(async () => {
    prisma = getPrismaClient();
    await prisma.$connect();
    bookRepository = new BookRepository(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.book.deleteMany();
  });

  describe('create', () => {
    it('should create book with valid data', async () => {
      // Arrange
      const bookData = {
        title: 'Test Book',
        author: 'Test Author',
        description: 'Test Description'
      };

      // Act
      const result = await bookRepository.create(bookData);

      // Assert
      expect(result).toMatchObject(bookData);
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
    });

    it('should throw error for duplicate title', async () => {
      // Arrange
      const bookData = {
        title: 'Duplicate Title',
        author: 'Author 1',
        description: 'Description 1'
      };
      await bookRepository.create(bookData);

      // Act & Assert
      await expect(bookRepository.create(bookData)).rejects.toThrow();
    });
  });
});
```

### Running Backend Tests

```bash
# Run all tests
npm run test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run with coverage
npm run test:coverage

# Run specific test file
npm run test -- auth.service.test.ts

# Run tests matching pattern
npm run test -- --testNamePattern="should create user"

# Run tests in watch mode
npm run test:watch

# Run smoke tests
npm run test:smoke
```

## 🎨 Frontend Testing

### Component Testing

**React Component Testing:**
```typescript
// Example: BookCard component test
import { render, screen, fireEvent } from '@testing-library/react';
import { BookCard } from '../BookCard';
import { Book } from '../../types';

describe('BookCard', () => {
  const mockBook: Book = {
    id: '1',
    title: 'Test Book',
    author: 'Test Author',
    description: 'Test Description',
    averageRating: 4.5,
    reviewCount: 10,
    coverImageUrl: 'https://example.com/cover.jpg',
    genres: ['Fiction'],
    publishedYear: 2023,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const defaultProps = {
    book: mockBook,
    onFavorite: jest.fn(),
    onViewDetails: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders book information correctly', () => {
    render(<BookCard {...defaultProps} />);
    
    expect(screen.getByText('Test Book')).toBeInTheDocument();
    expect(screen.getByText('Test Author')).toBeInTheDocument();
    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('10 reviews')).toBeInTheDocument();
  });

  it('calls onFavorite when favorite button is clicked', () => {
    render(<BookCard {...defaultProps} />);
    
    const favoriteButton = screen.getByRole('button', { name: /favorite/i });
    fireEvent.click(favoriteButton);
    
    expect(defaultProps.onFavorite).toHaveBeenCalledWith('1');
  });

  it('calls onViewDetails when view details button is clicked', () => {
    render(<BookCard {...defaultProps} />);
    
    const viewDetailsButton = screen.getByRole('button', { name: /view details/i });
    fireEvent.click(viewDetailsButton);
    
    expect(defaultProps.onViewDetails).toHaveBeenCalledWith('1');
  });

  it('displays loading state when book is being processed', () => {
    render(<BookCard {...defaultProps} isLoading={true} />);
    
    expect(screen.getByTestId('book-card-skeleton')).toBeInTheDocument();
  });
});
```

**Hook Testing:**
```typescript
// Example: useAuth hook test
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../useAuth';
import { AuthProvider } from '../AuthContext';

describe('useAuth', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  it('should return initial auth state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should login user successfully', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });
    
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toBeDefined();
  });

  it('should logout user successfully', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    // First login
    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });
    
    // Then logout
    await act(async () => {
      result.current.logout();
    });
    
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });
});
```

### Service Testing

**API Service Testing:**
```typescript
// Example: BookService test
import { BookService } from '../book.service';
import { mockFetch } from '../../test/mocks/fetch';

describe('BookService', () => {
  let bookService: BookService;

  beforeEach(() => {
    bookService = new BookService();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getBooks', () => {
    it('should fetch books successfully', async () => {
      // Arrange
      const mockBooks = [
        { id: '1', title: 'Book 1', author: 'Author 1' },
        { id: '2', title: 'Book 2', author: 'Author 2' }
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { books: mockBooks } })
      });

      // Act
      const result = await bookService.getBooks();

      // Assert
      expect(result).toEqual(mockBooks);
      expect(mockFetch).toHaveBeenCalledWith('/api/v1/books');
    });

    it('should handle API errors', async () => {
      // Arrange
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Act & Assert
      await expect(bookService.getBooks()).rejects.toThrow('Network error');
    });
  });
});
```

### Running Frontend Tests

```bash
# Run all tests
npm run test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run accessibility tests
npm run test:accessibility

# Run with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm run test -- BookCard.test.tsx

# Run tests matching pattern
npm run test -- --testNamePattern="should render"
```

## 🔗 Integration Testing

### API Integration Tests

**Full API Workflow Testing:**
```typescript
// Example: Complete user workflow test
describe('User Workflow Integration', () => {
  let prisma: PrismaClient;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    prisma = getPrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up test data
    await prisma.review.deleteMany();
    await prisma.book.deleteMany();
    await prisma.user.deleteMany();
  });

  it('should complete full user workflow', async () => {
    // 1. Register user
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      });

    expect(registerResponse.status).toBe(201);
    authToken = registerResponse.body.data.accessToken;
    userId = registerResponse.body.data.user.id;

    // 2. Create a book
    const bookResponse = await request(app)
      .post('/api/v1/books')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Test Book',
        author: 'Test Author',
        description: 'Test Description'
      });

    expect(bookResponse.status).toBe(201);
    const bookId = bookResponse.body.data.id;

    // 3. Create a review
    const reviewResponse = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        bookId,
        rating: 5,
        content: 'Great book!'
      });

    expect(reviewResponse.status).toBe(201);

    // 4. Get user's reviews
    const userReviewsResponse = await request(app)
      .get(`/api/v1/reviews/user/${userId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(userReviewsResponse.status).toBe(200);
    expect(userReviewsResponse.body.data.reviews).toHaveLength(1);
  });
});
```

### Database Integration Tests

**Transaction Testing:**
```typescript
// Example: Database transaction test
describe('Database Transactions', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = getPrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should rollback transaction on error', async () => {
    // Arrange
    const bookData = {
      title: 'Test Book',
      author: 'Test Author',
      description: 'Test Description'
    };

    // Act & Assert
    await expect(
      prisma.$transaction(async (tx) => {
        const book = await tx.book.create({ data: bookData });
        
        // This will cause the transaction to fail
        await tx.book.create({
          data: {
            id: book.id, // Duplicate ID will cause error
            title: 'Another Book',
            author: 'Another Author',
            description: 'Another Description'
          }
        });
      })
    ).rejects.toThrow();

    // Verify rollback occurred
    const books = await prisma.book.findMany();
    expect(books).toHaveLength(0);
  });
});
```

## 🎭 End-to-End Testing

### Playwright E2E Tests

**User Journey Testing:**
```typescript
// Example: Complete user journey E2E test
import { test, expect } from '@playwright/test';

test.describe('User Journey', () => {
  test('should complete full user workflow', async ({ page }) => {
    // 1. Navigate to homepage
    await page.goto('/');
    await expect(page).toHaveTitle(/WordWise/);

    // 2. Register new user
    await page.click('text=Sign Up');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.fill('[data-testid="name-input"]', 'Test User');
    await page.click('[data-testid="register-button"]');

    // 3. Verify successful registration
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=Welcome, Test User')).toBeVisible();

    // 4. Search for a book
    await page.fill('[data-testid="search-input"]', 'JavaScript');
    await page.click('[data-testid="search-button"]');

    // 5. Verify search results
    await expect(page.locator('[data-testid="book-card"]')).toHaveCount.greaterThan(0);

    // 6. Click on first book
    await page.click('[data-testid="book-card"]:first-child');
    await expect(page).toHaveURL(/\/books\/\w+/);

    // 7. Write a review
    await page.click('[data-testid="write-review-button"]');
    await page.fill('[data-testid="review-content"]', 'This is a great book!');
    await page.click('[data-testid="rating-5"]');
    await page.click('[data-testid="submit-review-button"]');

    // 8. Verify review was created
    await expect(page.locator('text=This is a great book!')).toBeVisible();

    // 9. Go to profile
    await page.click('[data-testid="profile-link"]');
    await expect(page).toHaveURL('/profile');

    // 10. Verify review appears in profile
    await expect(page.locator('[data-testid="user-review"]')).toHaveCount(1);
  });
});
```

**Cross-Browser Testing:**
```typescript
// Example: Cross-browser compatibility test
test.describe('Cross-Browser Compatibility', () => {
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test(`should work in ${browserName}`, async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveTitle(/WordWise/);
      
      // Test basic functionality
      await page.click('text=Sign Up');
      await expect(page.locator('[data-testid="register-form"]')).toBeVisible();
    });
  });
});
```

### Visual Regression Testing

**Screenshot Testing:**
```typescript
// Example: Visual regression test
test.describe('Visual Regression', () => {
  test('homepage should match design', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    await expect(page).toHaveScreenshot('homepage.png');
  });

  test('book detail page should match design', async ({ page }) => {
    await page.goto('/books/test-book-id');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    await expect(page).toHaveScreenshot('book-detail.png');
  });
});
```

### Running E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npm run test:e2e -- user-journey.spec.ts

# Run tests in headed mode
npm run test:e2e -- --headed

# Run tests in debug mode
npm run test:e2e -- --debug

# Update screenshots
npm run test:e2e -- --update-snapshots
```

## ⚡ Performance Testing

### Lighthouse Performance Tests

**Performance Audit:**
```typescript
// Example: Lighthouse performance test
import { test, expect } from '@playwright/test';

test.describe('Performance', () => {
  test('homepage should meet performance standards', async ({ page }) => {
    await page.goto('/');
    
    // Run Lighthouse audit
    const lighthouse = await page.evaluate(() => {
      return new Promise((resolve) => {
        // This would integrate with Lighthouse
        resolve({
          performance: 95,
          accessibility: 100,
          bestPractices: 92,
          seo: 88
        });
      });
    });

    expect(lighthouse.performance).toBeGreaterThan(90);
    expect(lighthouse.accessibility).toBeGreaterThan(95);
    expect(lighthouse.bestPractices).toBeGreaterThan(90);
    expect(lighthouse.seo).toBeGreaterThan(85);
  });
});
```

### Load Testing

**API Load Testing:**
```typescript
// Example: API load test
import { test, expect } from '@playwright/test';

test.describe('Load Testing', () => {
  test('API should handle concurrent requests', async ({ page }) => {
    const requests = Array.from({ length: 100 }, () =>
      page.request.get('/api/v1/books')
    );

    const responses = await Promise.all(requests);
    
    // All requests should succeed
    responses.forEach(response => {
      expect(response.status()).toBe(200);
    });
  });
});
```

## ♿ Accessibility Testing

### Automated Accessibility Testing

**Jest-axe Testing:**
```typescript
// Example: Accessibility test
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { BookCard } from '../BookCard';

expect.extend(toHaveNoViolations);

describe('BookCard Accessibility', () => {
  it('should not have accessibility violations', async () => {
    const { container } = render(
      <BookCard
        book={mockBook}
        onFavorite={jest.fn()}
        onViewDetails={jest.fn()}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

**Playwright Accessibility Testing:**
```typescript
// Example: E2E accessibility test
import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/');
    
    // Test tab navigation
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    
    // Test keyboard interaction
    await page.keyboard.press('Enter');
    // Verify expected behavior
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/');
    
    // Check for proper ARIA labels
    const buttons = page.locator('button');
    const count = await buttons.count();
    
    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      const ariaLabel = await button.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    }
  });
});
```

## 📊 Test Coverage Requirements

### Coverage Targets

| Component Type | Minimum Coverage | Target Coverage |
|----------------|------------------|-----------------|
| Business Logic | 90% | 95% |
| API Endpoints | 85% | 90% |
| React Components | 80% | 85% |
| Utility Functions | 95% | 98% |
| Critical Paths | 100% | 100% |

### Coverage Reporting

**Backend Coverage:**
```bash
# Generate coverage report
npm run test:coverage

# View coverage report
open coverage/lcov-report/index.html
```

**Frontend Coverage:**
```bash
# Generate coverage report
npm run test:coverage

# View coverage report
open coverage/index.html
```

### Coverage Configuration

**Jest Coverage Config:**
```javascript
// jest.config.js
module.exports = {
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/__tests__/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

## 🔄 CI/CD Testing

### GitHub Actions Testing

**Backend CI Pipeline:**
```yaml
# .github/workflows/backend-test.yml
name: Backend Tests

on:
  push:
    branches: [main, develop]
    paths: ['backend/**']
  pull_request:
    branches: [main]
    paths: ['backend/**']

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: wordwise_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json
      
      - name: Install dependencies
        run: |
          cd backend
          npm ci
      
      - name: Run unit tests
        run: |
          cd backend
          npm run test:unit
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/wordwise_test
      
      - name: Run integration tests
        run: |
          cd backend
          npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/wordwise_test
      
      - name: Generate coverage report
        run: |
          cd backend
          npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: backend/coverage/lcov.info
```

**Frontend CI Pipeline:**
```yaml
# .github/workflows/frontend-test.yml
name: Frontend Tests

on:
  push:
    branches: [main, develop]
    paths: ['frontend/**']
  pull_request:
    branches: [main]
    paths: ['frontend/**']

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
      
      - name: Run unit tests
        run: |
          cd frontend
          npm run test:unit
      
      - name: Run integration tests
        run: |
          cd frontend
          npm run test:integration
      
      - name: Run accessibility tests
        run: |
          cd frontend
          npm run test:accessibility
      
      - name: Run E2E tests
        run: |
          cd frontend
          npm run test:e2e
      
      - name: Generate coverage report
        run: |
          cd frontend
          npm run test:coverage
```

## 🛠️ Testing Tools

### Backend Testing Tools

| Tool | Purpose | Usage |
|------|---------|-------|
| Jest | Test framework | Unit and integration tests |
| Supertest | HTTP testing | API endpoint testing |
| Prisma Test Environment | Database testing | Database operations |
| MSW | API mocking | Mock external APIs |

### Frontend Testing Tools

| Tool | Purpose | Usage |
|------|---------|-------|
| Vitest | Test framework | Unit and integration tests |
| Testing Library | Component testing | React component testing |
| Playwright | E2E testing | End-to-end testing |
| Jest-axe | Accessibility testing | WCAG compliance |
| MSW | API mocking | Mock API responses |

### Test Utilities

**Custom Test Utilities:**
```typescript
// test/utils/test-utils.tsx
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
```

**Mock Data Factories:**
```typescript
// test/factories/book.factory.ts
import { Book } from '../../types';

export const createMockBook = (overrides: Partial<Book> = {}): Book => ({
  id: '1',
  title: 'Test Book',
  author: 'Test Author',
  description: 'Test Description',
  averageRating: 4.5,
  reviewCount: 10,
  coverImageUrl: 'https://example.com/cover.jpg',
  genres: ['Fiction'],
  publishedYear: 2023,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

export const createMockBooks = (count: number): Book[] =>
  Array.from({ length: count }, (_, index) =>
    createMockBook({ id: `${index + 1}` })
  );
```

## 📋 Best Practices

### Writing Good Tests

1. **Arrange-Act-Assert Pattern:**
   ```typescript
   it('should calculate total price correctly', () => {
     // Arrange
     const items = [
       { price: 10, quantity: 2 },
       { price: 5, quantity: 3 }
     ];
     
     // Act
     const total = calculateTotal(items);
     
     // Assert
     expect(total).toBe(35);
   });
   ```

2. **Descriptive Test Names:**
   ```typescript
   // Good
   it('should return error when user tries to review same book twice')
   
   // Bad
   it('should work')
   ```

3. **One Assertion Per Test:**
   ```typescript
   // Good
   it('should return user with correct email', () => {
     const user = getUserById('1');
     expect(user.email).toBe('test@example.com');
   });
   
   it('should return user with correct name', () => {
     const user = getUserById('1');
     expect(user.name).toBe('Test User');
   });
   ```

4. **Test Edge Cases:**
   ```typescript
   it('should handle empty array', () => {
     const result = calculateTotal([]);
     expect(result).toBe(0);
   });
   
   it('should handle null input', () => {
     const result = calculateTotal(null);
     expect(result).toBe(0);
   });
   ```

### Test Organization

1. **Group Related Tests:**
   ```typescript
   describe('BookService', () => {
     describe('getBookById', () => {
       it('should return book when found', () => {});
       it('should throw error when not found', () => {});
     });
     
     describe('createBook', () => {
       it('should create book with valid data', () => {});
       it('should throw error with invalid data', () => {});
     });
   });
   ```

2. **Use Setup and Teardown:**
   ```typescript
   describe('Database Tests', () => {
     beforeAll(async () => {
       await setupTestDatabase();
     });
     
     afterAll(async () => {
       await cleanupTestDatabase();
     });
     
     beforeEach(async () => {
       await clearTestData();
     });
   });
   ```

### Performance Considerations

1. **Mock External Dependencies:**
   ```typescript
   // Mock external API calls
   jest.mock('../services/api.service', () => ({
     fetchBooks: jest.fn()
   }));
   ```

2. **Use Test Database:**
   ```typescript
   // Use separate test database
   const testDatabaseUrl = process.env.TEST_DATABASE_URL;
   ```

3. **Clean Up After Tests:**
   ```typescript
   afterEach(async () => {
     await cleanupTestData();
   });
   ```

## 🚨 Troubleshooting

### Common Test Issues

**Flaky Tests:**
- Use proper async/await patterns
- Wait for elements to be visible
- Use proper selectors
- Avoid hardcoded timeouts

**Slow Tests:**
- Mock external dependencies
- Use in-memory databases
- Parallelize test execution
- Optimize test data setup

**Test Failures:**
- Check test environment setup
- Verify mock data
- Check test isolation
- Review test assertions

### Debugging Tests

**Backend Debugging:**
```bash
# Run specific test with debug output
npm run test -- --verbose auth.service.test.ts

# Run tests in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

**Frontend Debugging:**
```bash
# Run tests with debug output
npm run test -- --verbose BookCard.test.tsx

# Run tests in debug mode
npm run test -- --debug
```

**E2E Debugging:**
```bash
# Run E2E tests in headed mode
npm run test:e2e -- --headed

# Run E2E tests in debug mode
npm run test:e2e -- --debug
```

### Getting Help

**Internal Resources:**
- Team Slack: #testing channel
- Code Review: Ask for help in PR comments
- Documentation: Check this guide and README files

**External Resources:**
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library Documentation](https://testing-library.com/docs/)
- [Playwright Documentation](https://playwright.dev/docs/intro)

---

## 📚 Summary

This testing guide provides comprehensive coverage of all testing aspects in the WordWise platform. Remember:

- **Write tests early and often**
- **Focus on behavior, not implementation**
- **Maintain high test coverage**
- **Keep tests fast and reliable**
- **Test critical user journeys**
- **Follow testing best practices**

Happy testing! 🧪✨
