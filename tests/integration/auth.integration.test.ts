import request from 'supertest';
import app from '../../src/app';
import { getTestPrismaClient, cleanupTestDatabase, setupTestDatabase } from '../test-database';

let prisma: any;

describe('Authentication Integration Tests', () => {
  beforeAll(async () => {
    // Setup test database
    prisma = await setupTestDatabase();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await cleanupTestDatabase();
  });

  describe('POST /api/auth/register', () => {
    const validUserData = {
      email: 'test@example.com',
      password: 'Password123!',
      name: 'Test User',
    };

    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toMatchObject({
        email: 'test@example.com',
        name: 'Test User',
      });
      expect(response.body.data.user.id).toBeDefined();
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user.password).toBeUndefined();

      // Verify user was created in database
      const user = await prisma.user.findUnique({
        where: { email: 'test@example.com' },
      });
      expect(user).toBeTruthy();
      expect(user?.name).toBe('Test User');
    });

    afterAll(async () => {
      // Cleanup after all tests
      await cleanupTestDatabase();
      await prisma.$disconnect();
    });

    it('should return 409 for duplicate email', async () => {
      // Create user first
      await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      // Try to register with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('User with this email already exists');
    });

    it('should return 400 for invalid email', async () => {
      const invalidData = { ...validUserData, email: 'invalid-email' };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Invalid email format');
    });

    it('should return 400 for weak password', async () => {
      const weakPasswordData = { ...validUserData, password: 'weak' };

      const response = await request(app)
        .post('/api/auth/register')
        .send(weakPasswordData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Password validation failed');
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteData = { email: 'test@example.com' };

      const response = await request(app)
        .post('/api/auth/register')
        .send(incompleteData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle validation errors from middleware', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'weak',
        name: '',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/login', () => {
    const userData = {
      email: 'test@example.com',
      password: 'Password123!',
      name: 'Test User',
    };

    beforeEach(async () => {
      // Create a user for login tests
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);
    });

    it('should login user successfully', async () => {
      const loginData = {
        email: userData.email,
        password: userData.password,
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toMatchObject({
        email: 'test@example.com',
        name: 'Test User',
      });
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user.password).toBeUndefined();
    });

    it('should return 401 for non-existent user', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'Password123!',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Invalid credentials');
    });

    it('should return 401 for wrong password', async () => {
      const loginData = {
        email: userData.email,
        password: 'WrongPassword123!',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Invalid credentials');
    });

    it('should return 400 for missing credentials', async () => {
      const incompleteData = { email: 'test@example.com' };

      const response = await request(app)
        .post('/api/auth/login')
        .send(incompleteData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid email format', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'Password123!',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken: string;
    let userId: string;

    beforeEach(async () => {
      // Register and login to get auth token
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          name: 'Test User',
        })
        .expect(201);

      authToken = registerResponse.body.data.accessToken;
      userId = registerResponse.body.data.user.id;
    });

    it('should return current user profile', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
      });
      expect(response.body.data.password).toBeUndefined();
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });

    it('should return 401 with invalid auth token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should return 401 with malformed auth header', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Register to get refresh token
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          name: 'Test User',
        })
        .expect(201);

      refreshToken = registerResponse.body.data.refreshToken;
    });

    it('should refresh token successfully', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toMatchObject({
        email: 'test@example.com',
        name: 'Test User',
      });
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      
      // New tokens should be different from original
      expect(response.body.data.refreshToken).not.toBe(refreshToken);
    });

    it('should return 400 for missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    let authToken: string;

    beforeEach(async () => {
      // Register to get auth token
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          name: 'Test User',
        })
        .expect(201);

      authToken = registerResponse.body.data.accessToken;
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logout successful');
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });
  });

  describe('Authentication Flow Integration', () => {
    it('should complete full authentication flow', async () => {
      const userData = {
        email: 'flow@example.com',
        password: 'Password123!',
        name: 'Flow User',
      };

      // 1. Register
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      const { accessToken: registerToken, refreshToken } = registerResponse.body.data;

      // 2. Access protected route with register token
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${registerToken}`)
        .expect(200);

      // 3. Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(200);

      const { accessToken: loginToken } = loginResponse.body.data;

      // 4. Access protected route with login token
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${loginToken}`)
        .expect(200);

      // 5. Refresh token
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      const { accessToken: newToken } = refreshResponse.body.data;

      // 6. Access protected route with new token
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(200);

      // 7. Logout
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(200);
    });
  });
});