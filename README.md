# WordWise Backend API

A comprehensive REST API for the WordWise book review platform built with Node.js, Express, TypeScript, and PostgreSQL.

## 🚀 Features

- **Authentication & Authorization**: JWT-based authentication with refresh tokens
- **Book Management**: CRUD operations for books with search and filtering
- **Review System**: User reviews and ratings with validation
- **Recommendation Engine**: AI-powered book recommendations using OpenAI
- **User Management**: User profiles, favorites, and activity tracking
- **Popular Books**: Trending and popular book analytics
- **Database**: PostgreSQL with Prisma ORM
- **Security**: Helmet, CORS, rate limiting, and input validation
- **Testing**: Comprehensive unit and integration tests
- **Documentation**: OpenAPI/Swagger documentation

## 📋 Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v13 or higher)
- npm or yarn
- OpenAI API key (for recommendations)

## 📚 Documentation Structure

This project uses a clear documentation structure:

- **[README.md](./README.md)** - Main documentation (this file)
- **[QUICKSTART.md](./QUICKSTART.md)** - Quick start guide for immediate setup
- **[SETUP.md](./SETUP.md)** - Detailed setup instructions and troubleshooting

## 🚀 Quick Start

For immediate setup, see the **[QUICKSTART.md](./QUICKSTART.md)** guide.

For comprehensive setup instructions, see the **[SETUP.md](./SETUP.md)** guide.

### Essential Commands

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Setup database
npm run db:generate
npm run db:migrate
npm run db:seed

# Start development server
npm run dev
```

**Access Points:**
- **API**: `http://localhost:3001/api`
- **Health Check**: `http://localhost:3001/health`
- **Prisma Studio**: `http://localhost:5555` (run `npm run db:studio`)

## 📚 API Documentation

### Base URL
```
http://localhost:3001/api
```

### Authentication Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| POST | `/auth/register` | Register a new user | Public |
| POST | `/auth/login` | Login user | Public |
| POST | `/auth/refresh` | Refresh access token | Public |
| GET | `/auth/me` | Get current user profile | Private |
| POST | `/auth/logout` | Logout user | Private |

### Book Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/books` | Get all books with pagination | Public |
| GET | `/books/search` | Search books by title/author | Public |
| GET | `/books/popular` | Get popular books | Public |
| GET | `/books/genre/:genre` | Get books by genre | Public |
| GET | `/books/:id` | Get book by ID | Public |

### Review Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| POST | `/reviews` | Create a new review | Private |
| GET | `/reviews/book/:bookId` | Get reviews for a book | Public |
| GET | `/reviews/user/:userId` | Get reviews by user | Public |
| GET | `/reviews/:id` | Get review by ID | Public |
| PUT | `/reviews/:id` | Update review | Private |
| DELETE | `/reviews/:id` | Delete review | Private |

### User Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/users/:id` | Get user profile | Public |
| PUT | `/users/:id` | Update user profile | Private |
| GET | `/users/:id/favorites` | Get user's favorite books | Private |
| POST | `/users/:id/favorites` | Add book to favorites | Private |
| DELETE | `/users/:id/favorites/:bookId` | Remove book from favorites | Private |

### Recommendation Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/recommendations` | Get AI-powered recommendations | Private |
| GET | `/recommendations/similar/:bookId` | Get similar books | Public |

### Popular Books Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/popular-books` | Get trending books | Public |
| GET | `/popular-books/genre/:genre` | Get popular books by genre | Public |

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server with hot reload
npm run build           # Build for production
npm run start           # Start production server

# Database
npm run db:generate     # Generate Prisma client
npm run db:migrate      # Run database migrations
npm run db:seed         # Seed database with sample data
npm run db:reset        # Reset database (WARNING: deletes all data)
npm run db:studio       # Open Prisma Studio

# Testing
npm run test            # Run all tests
npm run test:unit       # Run unit tests
npm run test:integration # Run integration tests
npm run test:coverage   # Run tests with coverage
npm run test:watch      # Run tests in watch mode
npm run test:smoke      # Run smoke tests

# Code Quality
npm run lint            # Run ESLint
npm run lint:fix        # Fix ESLint issues
npm run format          # Format code with Prettier
npm run format:check    # Check code formatting
```

### Project Structure

```
src/
├── config/           # Configuration files
├── controllers/      # Route controllers
├── middleware/       # Custom middleware
├── models/          # Data models
├── repositories/    # Data access layer
├── routes/          # API routes
├── services/        # Business logic
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
├── app.ts           # Express app configuration
└── server.ts        # Server entry point
```

### Database Schema

The application uses PostgreSQL with the following main entities:

- **Users**: User accounts and profiles
- **Books**: Book information and metadata
- **Reviews**: User reviews and ratings
- **UserFavorites**: User's favorite books

See `prisma/schema.prisma` for the complete schema definition.

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm run test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:smoke

# Run with coverage
npm run test:coverage
```

### Test Structure

- **Unit Tests**: Test individual functions and classes
- **Integration Tests**: Test API endpoints and database interactions
- **Smoke Tests**: Basic functionality verification

### Coverage Requirements

- Minimum 80% code coverage
- All critical paths must be tested
- API endpoints must have integration tests

## 🚀 Deployment

### Environment Variables

Ensure all required environment variables are set in production:

```env
NODE_ENV=production
DATABASE_URL=your-production-database-url
JWT_SECRET=your-production-jwt-secret
JWT_REFRESH_SECRET=your-production-refresh-secret
OPENAI_API_KEY=your-openai-api-key
CORS_ORIGIN=https://your-frontend-domain.com
```

### Docker Deployment

1. **Build the Docker image**
   ```bash
   docker build -t wordwise-backend .
   ```

2. **Run the container**
   ```bash
   docker run -p 3001:3001 --env-file .env wordwise-backend
   ```

### Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] SSL/TLS certificates installed
- [ ] Rate limiting configured
- [ ] Monitoring and logging setup
- [ ] Health checks configured
- [ ] Backup strategy implemented

## 🔒 Security

### Implemented Security Measures

- **Helmet.js**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: Request rate limiting
- **Input Validation**: Zod schema validation
- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt password hashing
- **SQL Injection Protection**: Prisma ORM protection

### Security Best Practices

1. Keep dependencies updated
2. Use environment variables for secrets
3. Implement proper error handling
4. Validate all inputs
5. Use HTTPS in production
6. Regular security audits

## 📊 Monitoring & Logging

### Health Check

The API provides a health check endpoint:

```bash
GET /health
```

Response:
```json
{
  "success": true,
  "data": {
    "message": "Book Review Platform API is running",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "environment": "production",
    "version": "1.0.0",
    "database": "connected"
  }
}
```

### Logging

- **Development**: Console logging with Morgan
- **Production**: Structured logging with request tracking
- **Error Logging**: Comprehensive error tracking and reporting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Use TypeScript strict mode
- Follow ESLint configuration
- Use Prettier for formatting
- Write comprehensive tests
- Document public APIs

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- Create an issue in the repository
- Check the [FAQ](docs/FAQ.md)
- Review the [API documentation](docs/API.md)
- Contact the development team

## 🔄 Changelog

### v1.0.0
- Initial release
- Authentication system
- Book management
- Review system
- Recommendation engine
- User management
- API documentation