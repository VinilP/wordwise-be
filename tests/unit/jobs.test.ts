import { RatingRecalculationJob } from '../../src/jobs/rating-recalculation.job';
import { RatingService } from '../../src/services/rating.service';
import { PrismaClient } from '@prisma/client';

// Mock Prisma Client
const mockPrisma = {
  review: {
    aggregate: jest.fn(),
    findMany: jest.fn(),
  },
  book: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
} as unknown as PrismaClient;

// Mock repositories
const mockBookRepository = {
  updateRating: jest.fn(),
  findAll: jest.fn(),
} as any;

const mockReviewRepository = {
  getReviewsByBook: jest.fn(),
} as any;

describe('Jobs Tests', () => {
  let ratingService: RatingService;
  let ratingRecalculationJob: RatingRecalculationJob;

  beforeEach(() => {
    jest.clearAllMocks();
    ratingService = new RatingService(mockPrisma, mockBookRepository, mockReviewRepository);
    ratingRecalculationJob = new RatingRecalculationJob(ratingService);
  });

  describe('RatingRecalculationJob', () => {
    describe('execute', () => {
      it('should execute rating recalculation successfully', async () => {
        const mockResult = {
          processed: 5,
          errors: []
        };

        jest.spyOn(ratingService, 'recalculateAllRatings').mockResolvedValue(mockResult);

        const result = await ratingRecalculationJob.execute();

        expect(result).toMatchObject({
          success: true,
          processed: 5,
          errors: [],
          startTime: expect.any(Date),
          endTime: expect.any(Date),
          duration: expect.any(Number)
        });

        expect(result.duration).toBeGreaterThanOrEqual(0);
        expect(ratingService.recalculateAllRatings).toHaveBeenCalledTimes(1);
      });

      it('should handle errors during execution', async () => {
        const mockResult = {
          processed: 2,
          errors: ['Error processing book 1', 'Error processing book 2']
        };

        jest.spyOn(ratingService, 'recalculateAllRatings').mockResolvedValue(mockResult);

        const result = await ratingRecalculationJob.execute();

        expect(result).toMatchObject({
          success: false,
          processed: 2,
          errors: ['Error processing book 1', 'Error processing book 2'],
          startTime: expect.any(Date),
          endTime: expect.any(Date),
          duration: expect.any(Number)
        });

        expect(ratingService.recalculateAllRatings).toHaveBeenCalledTimes(1);
      });

      it('should handle service throwing an error', async () => {
        const errorMessage = 'Database connection failed';
        jest.spyOn(ratingService, 'recalculateAllRatings').mockRejectedValue(new Error(errorMessage));

        const result = await ratingRecalculationJob.execute();

        expect(result).toMatchObject({
          success: false,
          processed: 0,
          errors: [errorMessage],
          startTime: expect.any(Date),
          endTime: expect.any(Date),
          duration: expect.any(Number)
        });

        expect(ratingService.recalculateAllRatings).toHaveBeenCalledTimes(1);
      });

      it('should handle unknown errors', async () => {
        jest.spyOn(ratingService, 'recalculateAllRatings').mockRejectedValue('Unknown error');

        const result = await ratingRecalculationJob.execute();

        expect(result).toMatchObject({
          success: false,
          processed: 0,
          errors: ['Unknown error'],
          startTime: expect.any(Date),
          endTime: expect.any(Date),
          duration: expect.any(Number)
        });
      });

      it('should calculate duration correctly', async () => {
        const mockResult = {
          processed: 1,
          errors: []
        };

        jest.spyOn(ratingService, 'recalculateAllRatings').mockImplementation(async () => {
          // Simulate some processing time
          await new Promise(resolve => setTimeout(resolve, 10));
          return mockResult;
        });

        const result = await ratingRecalculationJob.execute();

        expect(result.duration).toBeGreaterThanOrEqual(10);
        expect(result.endTime.getTime()).toBeGreaterThan(result.startTime.getTime());
      });
    });

    describe('schedulePeriodicRecalculation', () => {
      it('should schedule periodic recalculation', () => {
        const intervalMs = 1000; // 1 second for testing
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const intervalId = RatingRecalculationJob.schedulePeriodicRecalculation(ratingService, intervalMs);

        expect(intervalId).toBeDefined();
        expect(typeof intervalId).toBe('object'); // NodeJS.Timeout

        // Clear the interval
        clearInterval(intervalId);
        consoleSpy.mockRestore();
      });

      it('should use default interval if not provided', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const intervalId = RatingRecalculationJob.schedulePeriodicRecalculation(ratingService);

        expect(intervalId).toBeDefined();

        // Clear the interval
        clearInterval(intervalId);
        consoleSpy.mockRestore();
      });

      it('should execute job at scheduled intervals', async () => {
        const intervalMs = 100; // 100ms for testing
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        const recalculateSpy = jest.spyOn(ratingService, 'recalculateAllRatings').mockResolvedValue({
          processed: 1,
          errors: []
        });

        const intervalId = RatingRecalculationJob.schedulePeriodicRecalculation(ratingService, intervalMs);

        // Wait for at least one execution
        await new Promise(resolve => setTimeout(resolve, 150));

        expect(recalculateSpy).toHaveBeenCalled();

        // Clear the interval
        clearInterval(intervalId);
        consoleSpy.mockRestore();
        recalculateSpy.mockRestore();
      });
    });
  });

  describe('Job Result Interface', () => {
    it('should return result with correct interface structure', async () => {
      const mockResult = {
        processed: 3,
        errors: []
      };

      jest.spyOn(ratingService, 'recalculateAllRatings').mockResolvedValue(mockResult);

      const result = await ratingRecalculationJob.execute();

      // Verify all required properties are present
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('processed');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('startTime');
      expect(result).toHaveProperty('endTime');
      expect(result).toHaveProperty('duration');

      // Verify types
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.processed).toBe('number');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(result.startTime).toBeInstanceOf(Date);
      expect(result.endTime).toBeInstanceOf(Date);
      expect(typeof result.duration).toBe('number');
    });
  });

  describe('Error Handling', () => {
    it('should handle multiple types of errors', async () => {
      const testCases = [
        new Error('Standard error'),
        'String error',
        { message: 'Object error' },
        null,
        undefined
      ];

      for (const error of testCases) {
        jest.spyOn(ratingService, 'recalculateAllRatings').mockRejectedValue(error);

        const result = await ratingRecalculationJob.execute();

        expect(result.success).toBe(false);
        expect(result.processed).toBe(0);
        expect(result.errors).toHaveLength(1);
        expect(typeof result.errors[0]).toBe('string');
      }
    });
  });

  describe('Logging', () => {
    it('should log job start and completion', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const mockResult = {
        processed: 2,
        errors: []
      };

      jest.spyOn(ratingService, 'recalculateAllRatings').mockResolvedValue(mockResult);

      await ratingRecalculationJob.execute();

      expect(consoleSpy).toHaveBeenCalledWith('Starting rating recalculation job...');
      expect(consoleSpy).toHaveBeenCalledWith('Rating recalculation job completed. Processed: 2, Errors: 0');

      consoleSpy.mockRestore();
    });

    it('should log errors when they occur', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const mockResult = {
        processed: 1,
        errors: ['Test error']
      };

      jest.spyOn(ratingService, 'recalculateAllRatings').mockResolvedValue(mockResult);

      await ratingRecalculationJob.execute();

      expect(consoleSpy).toHaveBeenCalledWith('Rating recalculation job completed. Processed: 1, Errors: 1');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Errors during rating recalculation:', ['Test error']);

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should log job failure', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      jest.spyOn(ratingService, 'recalculateAllRatings').mockRejectedValue(new Error('Job failed'));

      await ratingRecalculationJob.execute();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Rating recalculation job failed:', 'Job failed');

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });
});

