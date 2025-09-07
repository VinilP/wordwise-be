import bcrypt from 'bcryptjs';
import { PasswordUtils } from '../../src/utils/password';

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const mockHash = require('bcryptjs').hash;
const mockCompare = require('bcryptjs').compare;

describe('PasswordUtils', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('should hash password with correct salt rounds', async () => {
      const password = 'testPassword123';
      const hashedPassword = 'hashed-password';

      // Setup mocks
      mockHash.mockResolvedValue(hashedPassword);

      // Execute
      const result = await PasswordUtils.hashPassword(password);

      // Verify
      expect(mockHash).toHaveBeenCalledWith(password, 12);
      expect(result).toBe(hashedPassword);
    });

    it('should handle bcrypt errors', async () => {
      const password = 'testPassword123';
      const error = new Error('Hashing failed');

      // Setup mocks
      mockHash.mockRejectedValue(error);

      // Execute & Verify
      await expect(PasswordUtils.hashPassword(password)).rejects.toThrow('Hashing failed');
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching passwords', async () => {
      const password = 'testPassword123';
      const hashedPassword = 'hashed-password';

      // Setup mocks
      mockCompare.mockResolvedValue(true);

      // Execute
      const result = await PasswordUtils.comparePassword(password, hashedPassword);

      // Verify
      expect(mockCompare).toHaveBeenCalledWith(password, hashedPassword);
      expect(result).toBe(true);
    });

    it('should return false for non-matching passwords', async () => {
      const password = 'testPassword123';
      const hashedPassword = 'hashed-password';

      // Setup mocks
      mockCompare.mockResolvedValue(false);

      // Execute
      const result = await PasswordUtils.comparePassword(password, hashedPassword);

      // Verify
      expect(mockCompare).toHaveBeenCalledWith(password, hashedPassword);
      expect(result).toBe(false);
    });

    it('should handle bcrypt errors', async () => {
      const password = 'testPassword123';
      const hashedPassword = 'hashed-password';
      const error = new Error('Comparison failed');

      // Setup mocks
      mockCompare.mockRejectedValue(error);

      // Execute & Verify
      await expect(PasswordUtils.comparePassword(password, hashedPassword)).rejects.toThrow('Comparison failed');
    });
  });

  describe('validatePassword', () => {
    it('should return valid for strong password', () => {
      const strongPassword = 'StrongPass123!';

      // Execute
      const result = PasswordUtils.validatePassword(strongPassword);

      // Verify
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return invalid for password too short', () => {
      const shortPassword = 'Short1!';

      // Execute
      const result = PasswordUtils.validatePassword(shortPassword);

      // Verify
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should return invalid for password without lowercase letter', () => {
      const noLowerPassword = 'PASSWORD123!';

      // Execute
      const result = PasswordUtils.validatePassword(noLowerPassword);

      // Verify
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should return invalid for password without uppercase letter', () => {
      const noUpperPassword = 'password123!';

      // Execute
      const result = PasswordUtils.validatePassword(noUpperPassword);

      // Verify
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should return invalid for password without number', () => {
      const noNumberPassword = 'Password!';

      // Execute
      const result = PasswordUtils.validatePassword(noNumberPassword);

      // Verify
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should return invalid for password without special character', () => {
      const noSpecialPassword = 'Password123';

      // Execute
      const result = PasswordUtils.validatePassword(noSpecialPassword);

      // Verify
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character (@$!%*?&)');
    });

    it('should return multiple errors for very weak password', () => {
      const weakPassword = 'weak';

      // Execute
      const result = PasswordUtils.validatePassword(weakPassword);

      // Verify
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(4);
      expect(result.errors).toContain('Password must be at least 8 characters long');
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
      expect(result.errors).toContain('Password must contain at least one number');
      expect(result.errors).toContain('Password must contain at least one special character (@$!%*?&)');
    });

    it('should validate different special characters', () => {
      const passwords = [
        'Password123@',
        'Password123$',
        'Password123!',
        'Password123%',
        'Password123*',
        'Password123?',
        'Password123&',
      ];

      passwords.forEach(password => {
        // Execute
        const result = PasswordUtils.validatePassword(password);

        // Verify
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      });
    });

    it('should handle edge cases', () => {
      const edgeCases = [
        { password: '', expectedErrors: 5 }, // All validations fail for empty string
        { password: 'A1@', expectedErrors: 2 }, // Too short and missing lowercase
        { password: 'Aa1@Aa1@', expectedErrors: 0 }, // Minimum valid
      ];

      edgeCases.forEach(({ password, expectedErrors }) => {
        // Execute
        const result = PasswordUtils.validatePassword(password);

        // Verify
        expect(result.errors).toHaveLength(expectedErrors);
        expect(result.isValid).toBe(expectedErrors === 0);
      });
    });
  });
});