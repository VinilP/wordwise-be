import { RatingRecalculationJob, JobResult } from '../../src/jobs/rating-recalculation.job';
import { RatingService } from '../../src/services/rating.service';

// Mock the RatingService
jest.mock('../../src/services/rating.service');

describe('RatingRecalculationJob', () => {
  let mockRatingService: jest.Mocked<RatingService>;
  let job: RatingRecalculationJob;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRatingService = new RatingService(null as any, null as any, null as any) as jest.Mocked<RatingService>;
    job = new RatingRecalculationJob(mockRatingService);
    
    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('execute', () => {
    it('should execute successfully with no errors', async () => {
      const mockResult = {
        processed: 5,
        errors: [],
      };

      mockRatingService.recalculateAllRatings.mockResolvedValue(mockResult);

      const result = await job.execute();

      expect(result.success).toBe(true);
      expect(result.processed).toBe(5);
      expect(result.errors).toEqual([]);
      expect(result.startTime).toBeInstanceOf(Date);
      expect(result.endTime).toBeInstanceOf(Date);
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(mockRatingService.recalculateAllRatings).toHaveBeenCalledTimes(1);
    });

    it('should handle partial success with some errors', async () => {
      const mockResult = {
        processed: 3,
        errors: ['Error updating book-1', 'Error updating book-2'],
      };

      mockRatingService.recalculateAllRatings.mockResolvedValue(mockResult);

      const result = await job.execute();

      expect(result.success).toBe(false); // Should be false when there are errors
      expect(result.processed).toBe(3);
      expect(result.errors).toEqual(['Error updating book-1', 'Error updating book-2']);
      expect(result.startTime).toBeInstanceOf(Date);
      expect(result.endTime).toBeInstanceOf(Date);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should handle complete failure', async () => {
      const error = new Error('Database connection failed');
      mockRatingService.recalculateAllRatings.mockRejectedValue(error);

      const result = await job.execute();

      expect(result.success).toBe(false);
      expect(result.processed).toBe(0);
      expect(result.errors).toEqual(['Database connection failed']);
      expect(result.startTime).toBeInstanceOf(Date);
      expect(result.endTime).toBeInstanceOf(Date);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should handle unknown error types', async () => {
      mockRatingService.recalculateAllRatings.mockRejectedValue('String error');

      const result = await job.execute();

      expect(result.success).toBe(false);
      expect(result.processed).toBe(0);
      expect(result.errors).toEqual(['Unknown error']);
    });

    it('should calculate duration correctly', async () => {
      const mockResult = {
        processed: 1,
        errors: [],
      };

      // Add a small delay to ensure measurable duration
      mockRatingService.recalculateAllRatings.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return mockResult;
      });

      const result = await job.execute();

      expect(result.duration).toBeGreaterThan(0);
      expect(result.endTime.getTime() - result.startTime.getTime()).toBe(result.duration);
    });

    it('should log appropriate messages', async () => {
      const mockResult = {
        processed: 2,
        errors: ['Error 1'],
      };

      mockRatingService.recalculateAllRatings.mockResolvedValue(mockResult);

      await job.execute();

      expect(console.log).toHaveBeenCalledWith('Starting rating recalculation job...');
      expect(console.log).toHaveBeenCalledWith('Rating recalculation job completed. Processed: 2, Errors: 1');
      expect(console.error).toHaveBeenCalledWith('Errors during rating recalculation:', ['Error 1']);
    });
  });

  describe('schedulePeriodicRecalculation', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should schedule periodic execution with default interval', () => {
      const mockResult = {
        processed: 1,
        errors: [],
      };

      mockRatingService.recalculateAllRatings.mockResolvedValue(mockResult);

      const intervalId = RatingRecalculationJob.schedulePeriodicRecalculation(mockRatingService);

      expect(intervalId).toBeDefined();

      // Fast-forward time by 24 hours (default interval)
      jest.advanceTimersByTime(24 * 60 * 60 * 1000);

      // The job should have been executed once
      expect(mockRatingService.recalculateAllRatings).toHaveBeenCalledTimes(1);

      clearInterval(intervalId);
    });

    it('should schedule periodic execution with custom interval', () => {
      const mockResult = {
        processed: 1,
        errors: [],
      };

      mockRatingService.recalculateAllRatings.mockResolvedValue(mockResult);

      const customInterval = 60 * 1000; // 1 minute
      const intervalId = RatingRecalculationJob.schedulePeriodicRecalculation(mockRatingService, customInterval);

      expect(intervalId).toBeDefined();

      // Fast-forward time by 1 minute
      jest.advanceTimersByTime(customInterval);

      // The job should have been executed once
      expect(mockRatingService.recalculateAllRatings).toHaveBeenCalledTimes(1);

      // Fast-forward another minute
      jest.advanceTimersByTime(customInterval);

      // The job should have been executed twice
      expect(mockRatingService.recalculateAllRatings).toHaveBeenCalledTimes(2);

      clearInterval(intervalId);
    });

    it('should handle errors in scheduled execution', () => {
      const error = new Error('Scheduled job error');
      mockRatingService.recalculateAllRatings.mockRejectedValue(error);

      const intervalId = RatingRecalculationJob.schedulePeriodicRecalculation(mockRatingService, 100);

      // Fast-forward time
      jest.advanceTimersByTime(100);

      expect(mockRatingService.recalculateAllRatings).toHaveBeenCalledTimes(1);

      clearInterval(intervalId);
    });
  });
});