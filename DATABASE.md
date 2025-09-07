# Database Setup Guide

This document provides instructions for setting up and managing the PostgreSQL database with Prisma ORM for the Book Review Platform.

## Prerequisites

- PostgreSQL 12+ installed and running
- Node.js 18+ installed
- npm or yarn package manager

## Database Configuration

### Environment Variables

The application requires the following database-related environment variables:

```bash
# Development Database
DATABASE_URL=postgresql://username:password@localhost:5432/book_review_platform_dev

# Test Database
DATABASE_URL=postgresql://username:password@localhost:5432/book_review_platform_test

# Production Database (example)
DATABASE_URL=postgresql://username:password@host:5432/book_review_platform_prod
```

### Database Schema

The application uses the following models:

- **User**: User accounts with authentication
- **Book**: Book catalog with metadata
- **Review**: User reviews for books
- **UserFavorite**: User's favorite books

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy the example environment file and configure your database URL:

```bash
cp .env.example .env
```

Edit `.env` and update the `DATABASE_URL` with your PostgreSQL connection string.

### 3. Create Database

Create the development and test databases:

```sql
-- Connect to PostgreSQL as superuser
CREATE DATABASE book_review_platform_dev;
CREATE DATABASE book_review_platform_test;

-- Create a user (optional)
CREATE USER book_review_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE book_review_platform_dev TO book_review_user;
GRANT ALL PRIVILEGES ON DATABASE book_review_platform_test TO book_review_user;
```

### 4. Generate Prisma Client

```bash
npm run db:generate
```

### 5. Run Database Migrations

```bash
npm run db:migrate
```

This will create all the necessary tables and indexes.

### 6. Seed Initial Data

```bash
npm run db:seed
```

This will populate the database with initial book data.

## Available Scripts

### Development

- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with initial data
- `npm run db:reset` - Reset database (drops all data)
- `npm run db:studio` - Open Prisma Studio (database GUI)

### Production

- `npm run db:migrate:prod` - Deploy migrations to production

## Database Schema Details

### Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR UNIQUE NOT NULL,
  password VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Books Table

```sql
CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR NOT NULL,
  author VARCHAR NOT NULL,
  description TEXT,
  cover_image_url VARCHAR,
  genres VARCHAR[] DEFAULT '{}',
  published_year INTEGER,
  average_rating DECIMAL(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_books_title ON books(title);
CREATE INDEX idx_books_author ON books(author);
CREATE INDEX idx_books_genres ON books USING GIN(genres);
```

### Reviews Table

```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT,
  rating SMALLINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(book_id, user_id) -- One review per user per book
);

-- Indexes for performance
CREATE INDEX idx_reviews_book_id ON reviews(book_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
```

### User Favorites Table

```sql
CREATE TABLE user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, book_id) -- One favorite per user per book
);

-- Indexes for performance
CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX idx_user_favorites_book_id ON user_favorites(book_id);
```

## Connection Pooling

The application implements connection pooling through Prisma's built-in connection management:

- **Max Connections**: Configurable via `DB_MAX_CONNECTIONS` environment variable (default: 10)
- **Connection Timeout**: Configurable via `DB_CONNECTION_TIMEOUT` environment variable (default: 10000ms)
- **Query Timeout**: Configurable via `DB_QUERY_TIMEOUT` environment variable (default: 30000ms)

## Error Handling

The application includes comprehensive database error handling:

- **P2002**: Unique constraint violations
- **P2025**: Record not found errors
- **P2003**: Foreign key constraint violations
- **P2014**: Invalid ID format errors
- **P1001**: Database connection failures
- **P1008**: Database operation timeouts

## Monitoring and Health Checks

The application includes database health monitoring:

- Health check endpoint: `GET /health`
- Database connection status included in health response
- Automatic reconnection on connection failures

## Backup and Recovery

### Development Backup

```bash
pg_dump book_review_platform_dev > backup.sql
```

### Restore from Backup

```bash
psql book_review_platform_dev < backup.sql
```

### Production Considerations

For production deployments:

1. Use connection pooling (PgBouncer recommended)
2. Set up automated backups
3. Configure read replicas for scaling
4. Monitor query performance
5. Set up database monitoring and alerting

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Ensure PostgreSQL is running
   - Check connection string format
   - Verify database exists

2. **Migration Failures**
   - Check database permissions
   - Ensure no conflicting data
   - Review migration logs

3. **Performance Issues**
   - Check query execution plans
   - Verify indexes are being used
   - Monitor connection pool usage

### Useful Commands

```bash
# Check database connection
npm run test -- --testPathPattern=database.test.ts

# View database schema
npm run db:studio

# Reset and reseed database
npm run db:reset
npm run db:seed

# Check migration status
npx prisma migrate status
```