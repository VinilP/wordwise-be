import { RatingService } from '../services/rating.service';

export interface JobResult {
  success: boolean;
  processed: number;
  errors: string[];
  startTime: Date;
  endTime: Date;
  duration: number;
}

export class RatingRecalculationJob {
  constructor(private ratingService: RatingService) {}

  /**
   * Execute rating recalculation job
   */
  async execute(): Promise<JobResult> {
    const startTime = new Date();
    
    try {
      console.log('Starting rating recalculation job...');
      
      const result = await this.ratingService.recalculateAllRatings();
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      console.log(`Rating recalculation job completed. Processed: ${result.processed}, Errors: ${result.errors.length}`);
      
      if (result.errors.length > 0) {
        console.error('Errors during rating recalculation:', result.errors);
      }

      return {
        success: result.errors.length === 0,
        processed: result.processed,
        errors: result.errors,
        startTime,
        endTime,
        duration
      };
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error('Rating recalculation job failed:', errorMessage);
      
      return {
        success: false,
        processed: 0,
        errors: [errorMessage],
        startTime,
        endTime,
        duration
      };
    }
  }

  /**
   * Schedule periodic rating recalculation (for future use with cron jobs)
   */
  static schedulePeriodicRecalculation(ratingService: RatingService, intervalMs: number = 24 * 60 * 60 * 1000): NodeJS.Timeout {
    const job = new RatingRecalculationJob(ratingService);
    
    return setInterval(async () => {
      await job.execute();
    }, intervalMs);
  }
}