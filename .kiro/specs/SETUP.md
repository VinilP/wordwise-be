# Backend Setup Guide

This guide will walk you through setting up the Book Review Platform backend from scratch. The backend is built with Node.js, Express, TypeScript, PostgreSQL, and Prisma ORM.

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your system:

### Required Software
- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **PostgreSQL** (v13 or higher) - [Download here](https://www.postgresql.org/download/)
- **npm** (comes with Node.js) or **yarn**
- **Git** - [Download here](https://git-scm.com/)

### Optional but Recommended
- **Docker** - For containerized development
- **PostgreSQL GUI** (pgAdmin, DBeaver, or similar)
- **Postman** or **Insomnia** - For API testing

### External Services
- **OpenAI API Key** - Required for AI-powered recommendations
  - Sign up at [OpenAI Platform](https://platform.openai.com/)
  - Generate an API key from your dashboard

## 🚀 Quick Start

### 1. Clone and Navigate to Backend

```bash
# Clone the repository (if not already done)
git clone <repository-url>
cd WordWise/backend
```

### 2. Install Dependencies

```bash
# Using npm
npm install

# Or using yarn
yarn install
```

### 3. Environment Configuration

```bash
# Copy the example environment file
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
# Server Configuration
NODE_ENV=development
PORT=3001
API_PREFIX=/api

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/wordwise_db

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_REFRESH_EXPIRES_IN=7d

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 4. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Seed the database with sample data (optional)
npm run db:seed
```

### 5. Start Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:3001`

## 🔧 Detailed Setup Instructions

### Database Configuration

#### Option 1: Local PostgreSQL Installation

1. **Install PostgreSQL**
   ```bash
   # macOS (using Homebrew)
   brew install postgresql
   brew services start postgresql
   
   # Ubuntu/Debian
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   sudo systemctl start postgresql
   
   # Windows
   # Download installer from postgresql.org
   ```

2. **Create Database and User**
   ```bash
   # Connect to PostgreSQL
   sudo -u postgres psql
   
   # Create database
   CREATE DATABASE wordwise_db;
   
   # Create user (optional, you can use postgres user)
   CREATE USER wordwise_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE wordwise_db TO wordwise_user;
   
   # Exit
   \q
   ```

3. **Update DATABASE_URL**
   ```env
   DATABASE_URL=postgresql://wordwise_user:your_password@localhost:5432/wordwise_db
   ```

#### Option 2: Docker PostgreSQL

1. **Create docker-compose.yml** (already exists in the project)
   ```yaml
   version: '3.8'
   services:
     postgres:
       image: postgres:15
       environment:
         POSTGRES_DB: wordwise_db
         POSTGRES_USER: wordwise_user
         POSTGRES_PASSWORD: your_password
       ports:
         - "5432:5432"
       volumes:
         - postgres_data:/var/lib/postgresql/data
   
   volumes:
     postgres_data:
   ```

2. **Start PostgreSQL container**
   ```bash
   docker-compose up -d postgres
   ```

3. **Update DATABASE_URL**
   ```env
   DATABASE_URL=postgresql://wordwise_user:your_password@localhost:5432/wordwise_db
   ```

### Environment Variables Explained

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Application environment | `development`, `production`, `test` |
| `PORT` | Server port | `3001` |
| `API_PREFIX` | API route prefix | `/api` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:port/db` |
| `JWT_SECRET` | Secret for signing JWT tokens | Long random string |
| `JWT_EXPIRES_IN` | Access token expiration | `15m`, `1h`, `1d` |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens | Different long random string |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiration | `7d`, `30d` |
| `OPENAI_API_KEY` | OpenAI API key for recommendations | `sk-...` |
| `CORS_ORIGIN` | Allowed frontend origin | `http://localhost:3000` |

### Prisma Database Operations

```bash
# Generate Prisma client (after schema changes)
npm run db:generate

# Create and apply new migration
npm run db:migrate

# Deploy migrations to production
npm run db:migrate:prod

# Reset database (WARNING: deletes all data)
npm run db:reset

# Seed database with sample data
npm run db:seed

# Open Prisma Studio (database GUI)
npm run db:studio
```

### Development Scripts

```bash
# Development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run all tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:smoke

# Code quality
npm run lint
npm run lint:fix
npm run format
npm run format:check
```

## 🧪 Testing the Setup

### 1. Health Check

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "success": true,
  "data": {
    "message": "Book Review Platform API is running",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "environment": "development",
    "version": "1.0.0",
    "database": "connected"
  }
}
```

### 2. Run Tests

```bash
# Run all tests to verify setup
npm run test

# Run smoke tests for quick verification
npm run test:smoke
```

### 3. API Endpoints Test

```bash
# Get all books
curl http://localhost:3001/api/books

# Register a new user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## 🐳 Docker Setup (Alternative)

If you prefer to run everything in Docker:

### 1. Build and Run with Docker Compose

```bash
# Build and start all services
docker-compose up --build

# Run in background
docker-compose up -d --build

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

### 2. Docker Commands

```bash
# Build backend image only
docker build -t wordwise-backend .

# Run backend container
docker run -p 3001:3001 --env-file .env wordwise-backend

# Run database migrations in container
docker-compose exec backend npm run db:migrate

# Access container shell
docker-compose exec backend sh
```

## 🔍 Troubleshooting

### Common Issues and Solutions

#### 1. Database Connection Issues

**Error**: `Error: P1001: Can't reach database server`

**Solutions**:
- Verify PostgreSQL is running: `pg_isready -h localhost -p 5432`
- Check DATABASE_URL format
- Ensure database exists
- Check firewall settings

#### 2. Port Already in Use

**Error**: `EADDRINUSE: address already in use :::3001`

**Solutions**:
```bash
# Find process using port 3001
lsof -i :3001

# Kill the process
kill -9 <PID>

# Or use different port in .env
PORT=3002
```

#### 3. Prisma Client Issues

**Error**: `PrismaClientInitializationError`

**Solutions**:
```bash
# Regenerate Prisma client
npm run db:generate

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### 4. OpenAI API Issues

**Error**: `OpenAI API key not found`

**Solutions**:
- Verify OPENAI_API_KEY in .env
- Check API key validity at OpenAI dashboard
- Ensure sufficient credits in OpenAI account

#### 5. JWT Token Issues

**Error**: `JsonWebTokenError: invalid signature`

**Solutions**:
- Ensure JWT_SECRET is set and consistent
- Clear browser cookies/localStorage
- Generate new JWT secrets

### Environment-Specific Issues

#### Development Environment
```bash
# Clear development cache
npm run clean
npm run build

# Reset development database
npm run db:reset
npm run db:seed
```

#### Production Environment
```bash
# Check production environment variables
echo $NODE_ENV
echo $DATABASE_URL

# Run production migrations
npm run db:migrate:prod

# Check application logs
pm2 logs wordwise-backend
```

## 📊 Monitoring and Logging

### Health Monitoring

```bash
# Check application health
npm run monitoring:health

# Collect metrics
npm run monitoring:metrics

# Start monitoring dashboard
npm run monitoring:start
```

### Log Files

- **Development**: Console output with Morgan middleware
- **Production**: Structured JSON logs
- **Error Logs**: Separate error logging with stack traces

### Performance Monitoring

```bash
# Run performance tests
npm run test:performance

# Run load tests
npm run test:load

# Monitor database performance
npm run db:studio
```

## 🔐 Security Checklist

Before deploying to production:

- [ ] Change default JWT secrets
- [ ] Use strong database passwords
- [ ] Enable SSL/TLS for database connections
- [ ] Configure proper CORS origins
- [ ] Set up rate limiting
- [ ] Enable Helmet security headers
- [ ] Validate all environment variables
- [ ] Set up proper logging and monitoring
- [ ] Configure backup strategies
- [ ] Review and update dependencies

## 📚 Additional Resources

### Documentation
- [Express.js Documentation](https://expressjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [OpenAI API Documentation](https://platform.openai.com/docs/)

### Tools and Extensions
- **VS Code Extensions**:
  - Prisma
  - PostgreSQL
  - REST Client
  - Thunder Client
- **Database Tools**:
  - pgAdmin
  - DBeaver
  - Prisma Studio

### Community and Support
- [Node.js Community](https://nodejs.org/en/community/)
- [Prisma Community](https://www.prisma.io/community)
- [PostgreSQL Community](https://www.postgresql.org/community/)

## 🆘 Getting Help

If you encounter issues not covered in this guide:

1. **Check the logs**: `npm run dev` shows detailed error messages
2. **Run diagnostics**: `npm run test:smoke` for quick health check
3. **Review configuration**: Verify all environment variables
4. **Check dependencies**: `npm audit` for security issues
5. **Database status**: `npm run db:studio` to inspect data
6. **Create an issue**: Include error messages and environment details

## 🎯 Next Steps

After successful setup:

1. **Explore the API**: Use Postman or curl to test endpoints
2. **Review the code**: Understand the project structure
3. **Run tests**: Ensure everything works correctly
4. **Set up frontend**: Connect the React frontend application
5. **Deploy**: Follow deployment guide for production setup

---

**Congratulations!** 🎉 Your Book Review Platform backend is now set up and ready for development. The API provides comprehensive functionality for user authentication, book management, reviews, and AI-powered recommendations.