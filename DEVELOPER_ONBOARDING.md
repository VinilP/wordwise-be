# WordWise Developer Onboarding Guide

Welcome to the WordWise development team! This comprehensive guide will help you get up and running with the codebase, understand our development practices, and contribute effectively to the project.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Development Environment Setup](#development-environment-setup)
- [Project Architecture](#project-architecture)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing Guidelines](#testing-guidelines)
- [Contributing Process](#contributing-process)
- [Tools and Resources](#tools-and-resources)
- [Troubleshooting](#troubleshooting)

## 🛠️ Prerequisites

### Required Software

- **Node.js**: v18 or higher ([Download](https://nodejs.org/))
- **npm**: v8 or higher (comes with Node.js)
- **Git**: Latest version ([Download](https://git-scm.com/))
- **PostgreSQL**: v13 or higher ([Download](https://www.postgresql.org/))
- **Docker**: v20 or higher (optional) ([Download](https://www.docker.com/))

### Recommended Tools

- **VS Code**: Our preferred IDE ([Download](https://code.visualstudio.com/))
- **Postman**: For API testing ([Download](https://www.postman.com/))
- **DBeaver**: Database management ([Download](https://dbeaver.io/))
- **GitHub CLI**: Command-line GitHub interface ([Download](https://cli.github.com/))

### VS Code Extensions

Install these recommended extensions for the best development experience:

```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "prisma.prisma",
    "ms-vscode.vscode-json",
    "redhat.vscode-yaml",
    "ms-vscode.vscode-jest",
    "ms-playwright.playwright"
  ]
}
```

## 🚀 Development Environment Setup

### 1. Clone the Repository

```bash
# Clone the repository
git clone https://github.com/your-org/wordwise.git
cd wordwise

# Verify you're on the main branch
git branch
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Configure environment variables (see Environment Configuration section)
# Edit .env with your local settings

# Generate Prisma client
npm run db:generate

# Set up the database
npm run db:migrate
npm run db:seed

# Start the development server
npm run dev
```

### 3. Frontend Setup

```bash
# Navigate to frontend directory (in a new terminal)
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Configure environment variables
# Edit .env with your local settings

# Start the development server
npm run dev
```

### 4. Verify Installation

- **Backend**: Visit `http://localhost:3001/health`
- **Frontend**: Visit `http://localhost:5173`
- **Database**: Connect to PostgreSQL and verify tables exist

## ⚙️ Environment Configuration

### Backend Environment (.env)

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/wordwise_dev"

# Server
NODE_ENV=development
PORT=3001
API_PREFIX=/api/v1

# JWT
JWT_SECRET=your-development-jwt-secret
JWT_REFRESH_SECRET=your-development-refresh-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# OpenAI (for recommendations)
OPENAI_API_KEY=your-openai-api-key

# CORS
CORS_ORIGIN=http://localhost:3000

# Logging
LOG_LEVEL=debug
```

### Frontend Environment (.env)

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3001/api
VITE_APP_NAME=WordWise
VITE_APP_VERSION=1.0.0

# Feature Flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG=true
VITE_ENABLE_MOCK_SERVICE_WORKER=true
```

### Environment File Priority (Vite)

Vite loads environment files in this order (higher priority overrides lower):
1. `.env.local` (highest priority - ignored by git)
2. `.env.development` (when NODE_ENV=development)
3. `.env` (lowest priority)

**Important**: Make sure your `.env.development` file has the correct API URL:
```env
VITE_API_BASE_URL=http://localhost:3001/api
```

### Common Issues & Solutions

#### Frontend can't connect to backend (404 errors)
- **Problem**: Frontend trying to connect to wrong port
- **Solution**: Check that `.env.development` has `VITE_API_BASE_URL=http://localhost:3001/api`
- **Verify**: Backend runs on port 3001, frontend on port 3000

#### Backend won't start (missing environment variables)
- **Problem**: Missing `JWT_REFRESH_SECRET` or `OPENAI_API_KEY`
- **Solution**: Add to backend `.env`:
  ```env
  JWT_REFRESH_SECRET=your-jwt-refresh-secret-key-for-development
  OPENAI_API_KEY=sk-placeholder-key
  ```

#### Database connection issues
- **Problem**: PostgreSQL not running or wrong credentials
- **Solution**: 
  - Start PostgreSQL: `brew services start postgresql@15`
  - Or use Docker: `docker-compose up -d postgres`
  - Verify connection: `psql -U $(whoami) -d bookreview_dev`

## 🏗️ Project Architecture

### Backend Architecture

```
backend/
├── src/
│   ├── config/          # Configuration files
│   │   ├── database.ts  # Database configuration
│   │   └── index.ts     # Main config
│   ├── controllers/     # Route controllers
│   │   ├── auth.controller.ts
│   │   ├── book.controller.ts
│   │   └── ...
│   ├── middleware/      # Custom middleware
│   │   ├── auth.middleware.ts
│   │   ├── validation.ts
│   │   └── ...
│   ├── models/          # Data models
│   │   └── index.ts
│   ├── repositories/    # Data access layer
│   │   ├── book.repository.ts
│   │   ├── user.repository.ts
│   │   └── ...
│   ├── routes/          # API routes
│   │   ├── auth.routes.ts
│   │   ├── book.routes.ts
│   │   └── ...
│   ├── services/        # Business logic
│   │   ├── auth.service.ts
│   │   ├── book.service.ts
│   │   └── ...
│   ├── types/           # TypeScript types
│   │   └── index.ts
│   ├── utils/           # Utility functions
│   │   ├── index.ts
│   │   └── ...
│   ├── app.ts           # Express app setup
│   └── server.ts        # Server entry point
├── prisma/              # Database schema and migrations
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── tests/               # Test files
│   ├── unit/
│   ├── integration/
│   └── ...
└── docs/                # Documentation
    └── api.yaml
```

### Frontend Architecture

```
frontend/
├── src/
│   ├── components/      # React components
│   │   ├── auth/        # Authentication components
│   │   ├── books/       # Book-related components
│   │   ├── layout/      # Layout components
│   │   ├── ui/          # Reusable UI components
│   │   └── ...
│   ├── contexts/        # React contexts
│   │   └── AuthContext.tsx
│   ├── hooks/           # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useBooks.ts
│   │   └── ...
│   ├── pages/           # Page components
│   │   ├── HomePage.tsx
│   │   ├── BooksPage.tsx
│   │   └── ...
│   ├── services/        # API service layer
│   │   ├── auth.service.ts
│   │   ├── book.service.ts
│   │   └── ...
│   ├── styles/          # Global styles
│   │   └── index.css
│   ├── test/            # Test utilities
│   │   ├── setup.ts
│   │   └── ...
│   ├── types/           # TypeScript types
│   │   └── index.ts
│   ├── utils/           # Utility functions
│   │   ├── config.ts
│   │   └── ...
│   ├── App.tsx          # Main app component
│   └── main.tsx         # Application entry point
├── public/              # Static assets
└── docs/                # Documentation
```

### Database Schema

The application uses PostgreSQL with Prisma ORM. Key entities:

- **Users**: User accounts and profiles
- **Books**: Book information and metadata
- **Reviews**: User reviews and ratings
- **UserFavorites**: User's favorite books

See `backend/prisma/schema.prisma` for the complete schema.

## 🔄 Development Workflow

### Git Workflow

We use the **GitHub Flow** workflow:

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-description
   ```

2. **Make Changes**
   - Write code following our standards
   - Write tests for new functionality
   - Update documentation if needed

3. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add user profile editing functionality"
   ```

4. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   # Create Pull Request on GitHub
   ```

5. **Code Review**
   - Address reviewer feedback
   - Make additional commits if needed
   - Ensure all checks pass

6. **Merge**
   - Squash and merge when approved
   - Delete feature branch

### Commit Message Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```bash
git commit -m "feat(auth): add two-factor authentication"
git commit -m "fix(api): resolve book search pagination issue"
git commit -m "docs: update API documentation"
```

### Branch Naming Convention

- `feature/description`: New features
- `fix/description`: Bug fixes
- `docs/description`: Documentation updates
- `refactor/description`: Code refactoring
- `test/description`: Test-related changes

## 📝 Code Standards

### TypeScript Guidelines

**Strict Mode:**
- Always use TypeScript strict mode
- Define explicit types for all functions and variables
- Use interfaces for object shapes
- Prefer type over interface for simple types

**Example:**
```typescript
// Good
interface User {
  id: string;
  email: string;
  name: string;
}

function createUser(userData: Omit<User, 'id'>): User {
  return {
    id: generateId(),
    ...userData
  };
}

// Avoid
function createUser(userData: any): any {
  return userData;
}
```

### React Guidelines

**Component Structure:**
```typescript
// Component with proper typing and structure
interface BookCardProps {
  book: Book;
  onFavorite: (bookId: string) => void;
  className?: string;
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  onFavorite,
  className = ''
}) => {
  const [isFavorited, setIsFavorited] = useState(false);

  const handleFavorite = useCallback(() => {
    onFavorite(book.id);
    setIsFavorited(prev => !prev);
  }, [book.id, onFavorite]);

  return (
    <div className={`book-card ${className}`}>
      {/* Component JSX */}
    </div>
  );
};
```

**Hooks Guidelines:**
- Use custom hooks for reusable logic
- Prefer `useCallback` and `useMemo` for performance optimization
- Keep hooks at the top level of components

### API Design Guidelines

**RESTful Endpoints:**
```typescript
// Good API design
GET    /api/v1/books           // Get all books
GET    /api/v1/books/:id       // Get specific book
POST   /api/v1/books           // Create book
PUT    /api/v1/books/:id       // Update book
DELETE /api/v1/books/:id       // Delete book

// Nested resources
GET    /api/v1/books/:id/reviews
POST   /api/v1/books/:id/reviews
```

**Response Format:**
```typescript
// Success response
{
  "success": true,
  "data": {
    // Actual data
  },
  "message": "Operation completed successfully"
}

// Error response
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": "Additional details"
  }
}
```

### Database Guidelines

**Prisma Best Practices:**
- Use transactions for multi-table operations
- Implement proper error handling
- Use indexes for frequently queried fields
- Validate data before database operations

**Example:**
```typescript
// Good database operation
async function createReview(data: CreateReviewData): Promise<Review> {
  return await prisma.$transaction(async (tx) => {
    // Create review
    const review = await tx.review.create({
      data: {
        ...data,
        userId: data.userId,
        bookId: data.bookId
      }
    });

    // Update book rating
    await updateBookRating(tx, data.bookId);

    return review;
  });
}
```

## 🧪 Testing Guidelines

### Test Structure

**Unit Tests:**
- Test individual functions and components
- Mock external dependencies
- Focus on business logic

**Integration Tests:**
- Test API endpoints
- Test database operations
- Test component interactions

**E2E Tests:**
- Test complete user workflows
- Test critical user journeys
- Test cross-browser compatibility

### Writing Tests

**Backend Tests:**
```typescript
// Unit test example
describe('BookService', () => {
  let bookService: BookService;
  let mockRepository: jest.Mocked<BookRepository>;

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    } as any;
    
    bookService = new BookService(mockRepository);
  });

  describe('getBookById', () => {
    it('should return book when found', async () => {
      const mockBook = { id: '1', title: 'Test Book' };
      mockRepository.findById.mockResolvedValue(mockBook);

      const result = await bookService.getBookById('1');

      expect(result).toEqual(mockBook);
      expect(mockRepository.findById).toHaveBeenCalledWith('1');
    });

    it('should throw error when book not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(bookService.getBookById('1')).rejects.toThrow('Book not found');
    });
  });
});
```

**Frontend Tests:**
```typescript
// Component test example
import { render, screen, fireEvent } from '@testing-library/react';
import { BookCard } from '../BookCard';

describe('BookCard', () => {
  const mockBook = {
    id: '1',
    title: 'Test Book',
    author: 'Test Author',
    averageRating: 4.5
  };

  it('renders book information correctly', () => {
    render(<BookCard book={mockBook} onFavorite={jest.fn()} />);
    
    expect(screen.getByText('Test Book')).toBeInTheDocument();
    expect(screen.getByText('Test Author')).toBeInTheDocument();
  });

  it('calls onFavorite when favorite button is clicked', () => {
    const mockOnFavorite = jest.fn();
    render(<BookCard book={mockBook} onFavorite={mockOnFavorite} />);
    
    fireEvent.click(screen.getByRole('button', { name: /favorite/i }));
    
    expect(mockOnFavorite).toHaveBeenCalledWith('1');
  });
});
```

### Running Tests

```bash
# Backend tests
cd backend
npm run test              # Run all tests
npm run test:unit         # Run unit tests only
npm run test:integration  # Run integration tests only
npm run test:coverage     # Run with coverage

# Frontend tests
cd frontend
npm run test              # Run all tests
npm run test:unit         # Run unit tests only
npm run test:integration  # Run integration tests only
npm run test:coverage     # Run with coverage
```

### Test Coverage Requirements

- **Minimum Coverage**: 80% for all code
- **Critical Paths**: 100% coverage for authentication and payment flows
- **New Code**: 100% coverage for all new features
- **Bug Fixes**: Tests must be added for all bug fixes

## 🤝 Contributing Process

### Before You Start

1. **Check Issues**: Look for existing issues or create a new one
2. **Discuss Changes**: Comment on issues to discuss approach
3. **Assign Yourself**: Get assigned to the issue
4. **Create Branch**: Create a feature branch from `main`

### Development Process

1. **Write Code**: Follow our coding standards
2. **Write Tests**: Add tests for new functionality
3. **Update Docs**: Update documentation if needed
4. **Test Locally**: Ensure all tests pass
5. **Lint Code**: Fix any linting issues

### Pull Request Process

1. **Create PR**: Create pull request with descriptive title
2. **Fill Template**: Complete the PR template
3. **Link Issues**: Link related issues
4. **Request Review**: Request review from team members
5. **Address Feedback**: Make changes based on feedback
6. **Merge**: Merge when approved and all checks pass

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

## 🛠️ Tools and Resources

### Development Tools

**VS Code Settings:**
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "emmet.includeLanguages": {
    "typescript": "html"
  }
}
```

**Useful Commands:**
```bash
# Backend
npm run dev              # Start development server
npm run build           # Build for production
npm run lint            # Run linter
npm run format          # Format code
npm run db:studio       # Open Prisma Studio
npm run db:reset        # Reset database

# Frontend
npm run dev              # Start development server
npm run build           # Build for production
npm run preview         # Preview production build
npm run lint            # Run linter
npm run format          # Format code
npm run storybook       # Start Storybook
```

### Debugging

**Backend Debugging:**
```bash
# Debug with Node.js inspector
npm run dev -- --inspect

# Debug specific test
npm run test -- --testNamePattern="specific test"
```

**Frontend Debugging:**
```bash
# Debug with React DevTools
npm run dev

# Debug specific test
npm run test -- --testNamePattern="specific test"
```

### Database Management

**Prisma Commands:**
```bash
# Generate Prisma client
npm run db:generate

# Create migration
npm run db:migrate

# Reset database
npm run db:reset

# Open Prisma Studio
npm run db:studio

# Seed database
npm run db:seed
```

**Database Queries:**
```sql
-- Check database connection
SELECT version();

-- View all tables
\dt

-- Check table structure
\d books

-- View sample data
SELECT * FROM books LIMIT 5;
```

## 🚨 Troubleshooting

### Common Issues

**Port Already in Use:**
```bash
# Find process using port
lsof -i :3001
lsof -i :5173

# Kill process
kill -9 <PID>
```

**Database Connection Issues:**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Check connection
psql -h localhost -U username -d database_name
```

**Node Modules Issues:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Prisma Issues:**
```bash
# Reset Prisma client
npm run db:generate

# Reset database
npm run db:reset

# Check Prisma version
npx prisma --version
```

### Getting Help

**Internal Resources:**
- **Team Slack**: #wordwise-dev channel
- **Code Reviews**: Ask for help in PR comments
- **Pair Programming**: Schedule with team members
- **Documentation**: Check README files and docs

**External Resources:**
- **TypeScript**: [Official Docs](https://www.typescriptlang.org/docs/)
- **React**: [Official Docs](https://react.dev/)
- **Prisma**: [Official Docs](https://www.prisma.io/docs/)
- **Jest**: [Official Docs](https://jestjs.io/docs/getting-started)

### Performance Issues

**Backend Performance:**
- Check database query performance
- Monitor memory usage
- Use database indexes
- Implement caching

**Frontend Performance:**
- Use React DevTools Profiler
- Check bundle size
- Implement code splitting
- Optimize images

## 📚 Learning Resources

### Recommended Reading

1. **Clean Code** by Robert Martin
2. **Effective TypeScript** by Dan Vanderkam
3. **React Patterns** by Michael Chan
4. **Database Design** by Teorey, Lightstone, and Nadeau

### Online Courses

- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- [React Patterns](https://reactpatterns.com/)
- [Prisma Academy](https://www.prisma.io/academy/)

### Team Resources

- **Code Review Guidelines**: Internal documentation
- **Architecture Decisions**: ADR documents
- **Best Practices**: Team wiki
- **Mentorship Program**: Pair with senior developers

---

## 🎉 Welcome to the Team!

You're now ready to start contributing to WordWise! Remember:

- **Ask Questions**: Don't hesitate to ask for help
- **Follow Standards**: Adhere to our coding and process standards
- **Write Tests**: Always write tests for new code
- **Document Changes**: Keep documentation up to date
- **Be Collaborative**: Work together and share knowledge

Happy coding! 🚀
