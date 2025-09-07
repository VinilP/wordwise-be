# Backend Setup Guide

This guide provides detailed setup instructions for the WordWise backend API.

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

## 🚀 Detailed Setup Instructions

### 1. Clone and Navigate to Backend

```bash
# Clone the repository (if not already done)
git clone <repository-url>
cd wordwise-be
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
DATABASE_URL=postgresql://username:password@localhost:5432/bookreview_dev

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
   CREATE DATABASE bookreview_dev;
   
   # Create user (optional, you can use postgres user)
   CREATE USER wordwise_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE bookreview_dev TO wordwise_user;
   
   # Exit
   \q
   ```

3. **Update DATABASE_URL**
   ```env
   DATABASE_URL=postgresql://wordwise_user:your_password@localhost:5432/bookreview_dev
   ```

#### Option 2: Docker PostgreSQL

1. **Start PostgreSQL container**
   ```bash
   docker-compose up -d postgres
   ```

2. **Update DATABASE_URL**
   ```env
   DATABASE_URL=postgresql://wordwise_user:your_password@localhost:5432/bookreview_dev
   ```

### 5. Initialize Database

```bash
# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Seed the database with sample data (optional)
npm run db:seed
```

### 6. Start Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:3001`

## 🔧 Database Operations

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

## 🎯 Next Steps

After successful setup:

1. **Explore the API**: Use Postman or curl to test endpoints
2. **Review the code**: Understand the project structure
3. **Run tests**: Ensure everything works correctly
4. **Set up frontend**: Connect the React frontend application
5. **Deploy**: Follow deployment guide for production setup

---

**Congratulations!** 🎉 Your WordWise backend is now set up and ready for development.
