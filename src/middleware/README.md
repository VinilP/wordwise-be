# Middleware System

This directory contains the comprehensive middleware system for the Book Review Platform backend. The middleware provides error handling, request validation, logging, security, and rate limiting functionality.

## Components

### Core Middleware

#### 1. Error Handler (`errorHandler`)
Global error handling middleware that catches and processes all application errors.

**Features:**
- Structured error logging with request context
- Handles multiple error types (Zod validation, Prisma, JWT, etc.)
- Consistent error response format
- Development vs production error details
- Proper HTTP status codes

**Usage:**
```typescript
app.use(errorHandler);
```

#### 2. Request Logger (`requestLogger`)
Enhanced structured logging middleware for requests and responses.

**Features:**
- Structured JSON logging
- Request and response timing
- Configurable log format (development vs production)
- Request/response correlation
- Headers and metadata logging

**Usage:**
```typescript
app.use(requestLogger);
```

#### 3. Request Validation (`validateRequest`)
Zod-based request validation middleware factory.

**Features:**
- Body, query, and parameter validation
- Type transformation and coercion
- Detailed validation error messages
- Schema composition and reuse

**Usage:**
```typescript
import { validateRequest, authSchemas } from './middleware';

router.post('/register', 
  validateRequest(authSchemas.register),
  handler
);
```

#### 4. Rate Limiter (`rateLimiter`)
Basic in-memory rate limiting middleware.

**Features:**
- Configurable time windows and request limits
- Per-IP tracking
- Automatic cleanup of expired entries
- Detailed rate limit error responses

**Usage:**
```typescript
app.use(rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
  message: 'Too many requests'
}));
```

#### 5. Security Headers (`securityHeaders`)
Additional security headers middleware.

**Features:**
- Removes X-Powered-By header
- Sets security headers (X-Content-Type-Options, X-Frame-Options, etc.)
- Complements helmet middleware

**Usage:**
```typescript
app.use(securityHeaders);
```

### Validation Schemas

Pre-defined Zod schemas for common validation patterns:

#### Common Schemas (`commonSchemas`)
- `uuid`: UUID validation
- `email`: Email format validation
- `password`: Strong password validation
- `name`: Name format validation
- `pagination`: Page/limit parameters
- `rating`: 1-5 star rating validation
- `reviewContent`: Review text validation
- `searchQuery`: Search query validation
- `genre`: Genre validation

#### Authentication Schemas (`authSchemas`)
- `register`: User registration validation
- `login`: User login validation

#### Book Schemas (`bookSchemas`)
- `getBooks`: Book listing with filters
- `getBookById`: Book ID parameter validation
- `searchBooks`: Book search validation

#### Review Schemas (`reviewSchemas`)
- `createReview`: Review creation validation
- `updateReview`: Review update validation
- `deleteReview`: Review deletion validation
- `getReviewsByBook`: Book reviews pagination
- `getReviewsByUser`: User reviews pagination

#### User Schemas (`userSchemas`)
- `addToFavorites`: Add book to favorites
- `removeFromFavorites`: Remove from favorites
- `getFavorites`: Get user favorites

## Error Handling

The error handler processes various error types:

### Operational Errors (AppError)
Custom application errors with specific status codes and messages.

```typescript
throw new AppError('User not found', 404);
```

### Validation Errors (ZodError)
Zod validation errors with detailed field-level error messages.

### Database Errors (Prisma)
- `P2002`: Unique constraint violation
- `P2025`: Record not found
- `P2003`: Foreign key constraint violation

### Authentication Errors (JWT)
- `JsonWebTokenError`: Invalid token
- `TokenExpiredError`: Expired token

### Syntax Errors
- Malformed JSON requests
- Invalid data formats

## Request Validation

### Schema Definition
```typescript
const userSchema = {
  body: z.object({
    name: z.string().min(2).max(50),
    email: z.string().email(),
    age: z.number().int().min(18)
  }),
  query: z.object({
    page: z.string().transform(val => parseInt(val, 10))
  }),
  params: z.object({
    id: z.string().uuid()
  })
};
```

### Middleware Usage
```typescript
router.post('/users/:id',
  validateRequest(userSchema),
  (req, res) => {
    // req.body, req.query, req.params are now validated and typed
    const { name, email, age } = req.body;
    const { page } = req.query;
    const { id } = req.params;
  }
);
```

## Logging

### Request Logging Format
```json
{
  "timestamp": "2025-09-04T08:00:00.000Z",
  "method": "POST",
  "url": "/api/users",
  "path": "/api/users",
  "ip": "127.0.0.1",
  "userAgent": "Mozilla/5.0...",
  "contentType": "application/json",
  "contentLength": "123",
  "query": { "page": "1" },
  "params": { "id": "123" }
}
```

### Response Logging Format
```json
{
  "timestamp": "2025-09-04T08:00:00.100Z",
  "method": "POST",
  "url": "/api/users",
  "statusCode": 201,
  "duration": "100ms",
  "contentLength": "456"
}
```

### Error Logging Format
```json
{
  "timestamp": "2025-09-04T08:00:00.000Z",
  "error": {
    "name": "ValidationError",
    "message": "Invalid email format",
    "stack": "Error: Invalid email format\n    at ..."
  },
  "request": {
    "method": "POST",
    "url": "/api/users",
    "path": "/api/users",
    "ip": "127.0.0.1",
    "userAgent": "Mozilla/5.0...",
    "body": { "email": "invalid-email" },
    "query": {},
    "params": {}
  }
}
```

## Rate Limiting

### Configuration Options
```typescript
interface RateLimitOptions {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Maximum requests per window
  message?: string;      // Custom error message
}
```

### Usage Examples
```typescript
// Global rate limiting
app.use(rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100
}));

// Strict rate limiting for auth endpoints
router.use('/auth', rateLimiter({
  windowMs: 5 * 60 * 1000,  // 5 minutes
  maxRequests: 5,
  message: 'Too many authentication attempts'
}));
```

## Security Headers

The security headers middleware adds the following headers:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

And removes:
- `X-Powered-By` header

## Testing

All middleware components are thoroughly tested with Jest. Tests cover:

- Error handling for all error types
- Request validation with valid and invalid data
- Rate limiting behavior
- Security header setting
- Logging functionality

Run tests with:
```bash
npm test -- --testPathPattern=middleware.test.ts
```

## Integration

The middleware is integrated into the main application in `src/app.ts`:

```typescript
import { 
  errorHandler, 
  notFoundHandler, 
  requestLogger, 
  securityHeaders, 
  rateLimiter 
} from './middleware';

// Security middleware
app.use(helmet());
app.use(securityHeaders);

// CORS configuration
app.use(cors(corsOptions));

// Rate limiting
app.use(rateLimiter(rateLimitOptions));

// Logging
app.use(requestLogger);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', routes);

// Error handling (must be last)
app.use(notFoundHandler);
app.use(errorHandler);
```

## Best Practices

1. **Always use validation middleware** for routes that accept user input
2. **Place error handler last** in the middleware stack
3. **Use structured logging** for better observability
4. **Implement rate limiting** for public endpoints
5. **Handle errors gracefully** with proper HTTP status codes
6. **Use TypeScript** for better type safety with validation schemas
7. **Test middleware thoroughly** with various error scenarios