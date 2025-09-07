import { HealthMonitor, HealthMetrics, AlertConfig } from '../../src/monitoring/health-monitor';
import { PrismaClient } from '@prisma/client';

// Mock PrismaClient
const mockPrisma = {
  $queryRaw: jest.fn(),
  $disconnect: jest.fn(),
} as unknown as PrismaClient;

describe('HealthMonitor', () => {
  let healthMonitor: HealthMonitor;
  let originalProcessCpuUsage: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock process.cpuUsage
    originalProcessCpuUsage = process.cpuUsage;
    process.cpuUsage = jest.fn().mockReturnValue({
      user: 1000000, // 1 second in microseconds
      system: 500000, // 0.5 seconds in microseconds
    });

    healthMonitor = new HealthMonitor(mockPrisma);
  });

  afterEach(() => {
    process.cpuUsage = originalProcessCpuUsage;
  });

  describe('constructor', () => {
    it('should initialize with default alert configuration', () => {
      const monitor = new HealthMonitor(mockPrisma);
      expect(monitor).toBeInstanceOf(HealthMonitor);
    });

    it('should initialize with custom alert configuration', () => {
      const customConfig: Partial<AlertConfig> = {
        memoryThreshold: 1000,
        cpuThreshold: 90,
        responseTimeThreshold: 3000,
      };

      const monitor = new HealthMonitor(mockPrisma, customConfig);
      expect(monitor).toBeInstanceOf(HealthMonitor);
    });
  });

  describe('checkHealth', () => {
    it('should return health metrics with healthy status', async () => {
      // Mock database query to return quickly
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([{ result: 1 }]);

      const metrics = await healthMonitor.checkHealth();

      expect(metrics).toMatchObject({
        timestamp: expect.any(Date),
        status: expect.stringMatching(/^(healthy|degraded|unhealthy)$/),
        uptime: expect.any(Number),
        memoryUsage: expect.objectContaining({
          rss: expect.any(Number),
          heapTotal: expect.any(Number),
          heapUsed: expect.any(Number),
          external: expect.any(Number),
        }),
        cpuUsage: expect.any(Number),
        databaseStatus: expect.stringMatching(/^(connected|disconnected|slow)$/),
        responseTime: expect.any(Number),
        errorRate: expect.any(Number),
        activeConnections: expect.any(Number),
        requestCount: expect.any(Number),
      });
    });

    it('should return degraded status when database is slow', async () => {
      // Mock slow database response
      (mockPrisma.$queryRaw as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve([{ result: 1 }]), 1500))
      );

      const metrics = await healthMonitor.checkHealth();

      expect(metrics.databaseStatus).toBe('slow');
      expect(metrics.status).toBe('degraded');
    });

    it('should return unhealthy status when database is disconnected', async () => {
      // Mock database connection failure
      (mockPrisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('Connection failed'));

      const metrics = await healthMonitor.checkHealth();

      expect(metrics.databaseStatus).toBe('disconnected');
      expect(metrics.status).toBe('unhealthy');
    });

    it('should calculate correct uptime', async () => {
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([{ result: 1 }]);

      // Wait a bit to ensure uptime is measurable
      await new Promise(resolve => setTimeout(resolve, 10));

      const metrics = await healthMonitor.checkHealth();

      expect(metrics.uptime).toBeGreaterThan(0);
    });
  });

  describe('recordRequest', () => {
    it('should record successful request', () => {
      healthMonitor.recordRequest(100, false);
      healthMonitor.recordRequest(200, false);

      expect(() => healthMonitor.recordRequest(150, false)).not.toThrow();
    });

    it('should record error request', () => {
      healthMonitor.recordRequest(100, true);
      healthMonitor.recordRequest(200, true);

      expect(() => healthMonitor.recordRequest(150, true)).not.toThrow();
    });

    it('should handle negative response times', () => {
      expect(() => healthMonitor.recordRequest(-100, false)).not.toThrow();
    });

    it('should handle zero response time', () => {
      expect(() => healthMonitor.recordRequest(0, false)).not.toThrow();
    });

    it('should default to non-error request', () => {
      expect(() => healthMonitor.recordRequest(100)).not.toThrow();
    });
  });

  describe('getAlerts', () => {
    it('should return current alerts', () => {
      const alerts = healthMonitor.getAlerts();
      expect(Array.isArray(alerts)).toBe(true);
    });
  });

  describe('clearAlerts', () => {
    it('should clear all alerts', () => {
      healthMonitor.clearAlerts();
      const alerts = healthMonitor.getAlerts();
      expect(alerts).toHaveLength(0);
    });
  });

  describe('getMetrics', () => {
    it('should return current metrics', () => {
      const metrics = healthMonitor.getMetrics();
      expect(metrics).toMatchObject({
        requestCount: expect.any(Number),
        errorCount: expect.any(Number),
        averageResponseTime: expect.any(Number),
        errorRate: expect.any(Number),
      });
    });
  });

  describe('reset', () => {
    it('should reset all counters', () => {
      healthMonitor.recordRequest(100, false);
      healthMonitor.recordRequest(200, true);
      
      healthMonitor.reset();
      
      const metrics = healthMonitor.getMetrics();
      expect(metrics.requestCount).toBe(0);
      expect(metrics.errorCount).toBe(0);
    });
  });

  describe('alert generation', () => {
    it('should generate alerts for high memory usage', async () => {
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([{ result: 1 }]);

      // Mock high memory usage
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn(() => ({
        rss: 600 * 1024 * 1024, // 600MB (above 500MB threshold)
        heapTotal: 500 * 1024 * 1024,
        heapUsed: 600 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
      })) as any;

      await healthMonitor.checkHealth();
      const alerts = healthMonitor.getAlerts();

      expect(alerts.some(alert => alert.includes('High memory usage'))).toBe(true);

      process.memoryUsage = originalMemoryUsage;
    });

    it('should generate alerts for high error rate', async () => {
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([{ result: 1 }]);

      // Create high error rate (above 5% threshold)
      for (let i = 0; i < 10; i++) {
        const isError = i < 7; // 70% error rate
        healthMonitor.recordRequest(100, isError);
      }

      await healthMonitor.checkHealth();
      const alerts = healthMonitor.getAlerts();

      expect(alerts.some(alert => alert.includes('High error rate'))).toBe(true);
    });

    it('should generate alerts for slow response time', async () => {
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([{ result: 1 }]);

      // Record slow response times (above 2000ms threshold)
      healthMonitor.recordRequest(3000, false);
      healthMonitor.recordRequest(2500, false);

      await healthMonitor.checkHealth();
      const alerts = healthMonitor.getAlerts();

      expect(alerts.some(alert => alert.includes('Slow response time'))).toBe(true);
    });
  });

  describe('error rate calculation', () => {
    it('should calculate correct error rate', async () => {
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([{ result: 1 }]);

      // Record some requests and errors
      healthMonitor.recordRequest(100, false);
      healthMonitor.recordRequest(150, false);
      healthMonitor.recordRequest(200, false);
      healthMonitor.recordRequest(120, true); // This is an error

      const metrics = await healthMonitor.checkHealth();

      // Error rate should be 25% (1 error out of 4 requests)
      expect(metrics.errorRate).toBe(25);
    });

    it('should handle zero requests', async () => {
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([{ result: 1 }]);

      const metrics = await healthMonitor.checkHealth();

      expect(metrics.errorRate).toBe(0);
    });
  });

  describe('response time calculation', () => {
    it('should calculate average response time', async () => {
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([{ result: 1 }]);

      healthMonitor.recordRequest(100, false);
      healthMonitor.recordRequest(200, false);
      healthMonitor.recordRequest(300, false);

      const metrics = await healthMonitor.checkHealth();

      expect(metrics.responseTime).toBe(200); // Average of 100, 200, 300
    });

    it('should return 0 for no recorded response times', async () => {
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([{ result: 1 }]);

      const metrics = await healthMonitor.checkHealth();

      expect(metrics.responseTime).toBe(0);
    });
  });

  describe('status determination', () => {
    it('should return healthy status for normal conditions', async () => {
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([{ result: 1 }]);

      const metrics = await healthMonitor.checkHealth();

      expect(metrics.status).toBe('healthy');
    });

    it('should return degraded status for moderate error rate', async () => {
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([{ result: 1 }]);

      // Create moderate error rate (7% - above 5% threshold but not too high)
      for (let i = 0; i < 100; i++) {
        const isError = i < 7; // 7% error rate
        healthMonitor.recordRequest(100 + i * 10, isError);
      }

      const metrics = await healthMonitor.checkHealth();

      expect(metrics.status).toBe('degraded');
    });
  });

  describe('memory usage', () => {
    it('should include memory usage in metrics', async () => {
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([{ result: 1 }]);

      const metrics = await healthMonitor.checkHealth();

      expect(metrics.memoryUsage).toMatchObject({
        rss: expect.any(Number),
        heapTotal: expect.any(Number),
        heapUsed: expect.any(Number),
        external: expect.any(Number),
      });
    });
  });

  describe('database health check', () => {
    it('should detect connected database', async () => {
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([{ result: 1 }]);

      const metrics = await healthMonitor.checkHealth();

      expect(metrics.databaseStatus).toBe('connected');
    });

    it('should detect slow database', async () => {
      // Mock slow database response (> 1000ms threshold)
      (mockPrisma.$queryRaw as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve([{ result: 1 }]), 1200))
      );

      const metrics = await healthMonitor.checkHealth();

      expect(metrics.databaseStatus).toBe('slow');
    });

    it('should detect disconnected database', async () => {
      (mockPrisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('Database error'));

      const metrics = await healthMonitor.checkHealth();

      expect(metrics.databaseStatus).toBe('disconnected');
    });
  });
});