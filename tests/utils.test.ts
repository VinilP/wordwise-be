import {
  AppError,
  HTTP_STATUS,
  createSuccessResponse,
  createErrorResponse,
  isValidEmail,
  isValidPassword,
  calculatePagination,
  isDevelopment,
  isProduction,
  isTest,
} from '../src/utils';

describe('Utils', () => {
  describe('AppError', () => {
    it('should create an operational error with correct properties', () => {
      const error = new AppError('Test error', HTTP_STATUS.BAD_REQUEST);

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(error.isOperational).toBe(true);
    });

    it('should default to 500 status code', () => {
      const error = new AppError('Test error');

      expect(error.statusCode).toBe(500);
    });
  });

  describe('Response Helpers', () => {
    it('should create success response', () => {
      const data = { id: 1, name: 'Test' };
      const response = createSuccessResponse(data, 'Success message');

      expect(response).toEqual({
        success: true,
        data,
        message: 'Success message',
      });
    });

    it('should create error response', () => {
      const response = createErrorResponse('Error message', 'ERROR_CODE', { detail: 'test' });

      expect(response).toEqual({
        success: false,
        error: {
          message: 'Error message',
          code: 'ERROR_CODE',
          details: { detail: 'test' },
        },
      });
    });
  });

  describe('Validation Helpers', () => {
    describe('isValidEmail', () => {
      it('should validate correct email addresses', () => {
        expect(isValidEmail('test@example.com')).toBe(true);
        expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
      });

      it('should reject invalid email addresses', () => {
        expect(isValidEmail('invalid-email')).toBe(false);
        expect(isValidEmail('test@')).toBe(false);
        expect(isValidEmail('@example.com')).toBe(false);
      });
    });

    describe('isValidPassword', () => {
      it('should validate strong passwords', () => {
        expect(isValidPassword('Password123')).toBe(true);
        expect(isValidPassword('MySecure1')).toBe(true);
      });

      it('should reject weak passwords', () => {
        expect(isValidPassword('password')).toBe(false); // No uppercase or number
        expect(isValidPassword('PASSWORD')).toBe(false); // No lowercase or number
        expect(isValidPassword('Pass1')).toBe(false); // Too short
      });
    });
  });

  describe('Pagination Helpers', () => {
    it('should calculate pagination correctly', () => {
      const result = calculatePagination(2, 10, 25);

      expect(result).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: true,
      });
    });

    it('should handle first page', () => {
      const result = calculatePagination(1, 10, 25);

      expect(result.hasNext).toBe(true);
      expect(result.hasPrev).toBe(false);
    });

    it('should handle last page', () => {
      const result = calculatePagination(3, 10, 25);

      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(true);
    });
  });

  describe('Environment Helpers', () => {
    it('should detect test environment', () => {
      expect(isTest()).toBe(true);
      expect(isDevelopment()).toBe(false);
      expect(isProduction()).toBe(false);
    });
  });
});