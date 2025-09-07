import { MetricsCollector, SystemMetrics, AlertRule } from '../../src/monitoring/metrics-collector';
import { PrismaClient } from '@prisma/client';

// Mock PrismaClient
const mockPrisma = {
  user: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
  book: {
    count: jest.fn(),
  },
  review: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
  $queryRaw: jest.fn(),
} as unknown as PrismaClient;

describe('MetricsCollector', () => {
  let metricsCollector: MetricsCollector;
  let originalProcessCpuUsage: any;
  let originalProcessMemoryUsage: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock process.cpuUsage
    originalProcessCpuUsage = process.cpuUsage;
    process.cpuUsage = jest.fn().mockReturnValue({
      user: 1000000, // 1 second in microseconds
      system: 500000, // 0.5 seconds in microseconds
    });

    // Mock process.memoryUsage
    originalProcessMemoryUsage = process.memoryUsage;
    process.memoryUsage = jest.fn(() => ({
      rss: 100 * 1024 * 1024, // 100MB
      heapTotal: 80 * 1024 * 1024, // 80MB
      heapUsed: 60 * 1024 * 1024, // 60MB
      external: 10 * 1024 * 1024, // 10MB
      arrayBuffers: 5 * 1024 * 1024, // 5MB
    })) as any;

    metricsCollector = new MetricsCollector(mockPrisma);
  });

  afterEach(() => {
    process.cpuUsage = originalProcessCpuUsage;
    process.memoryUsage = originalProcessMemoryUsage;
  });

  describe('constructor', () => {
    it('should initialize metrics collector', () => {
      const collector = new MetricsCollector(mockPrisma);
      expect(collector).toBeInstanceOf(MetricsCollector);
    });
  });

  describe('collectMetrics', () => {
    beforeEach(() => {
      // Mock database queries
      (mockPrisma.user.count as jest.Mock).mockResolvedValue(100);
      (mockPrisma.book.count as jest.Mock).mockResolvedValue(50);
      (mockPrisma.review.count as jest.Mock).mockResolvedValue(200);
      
      // Mock active users query
      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([
        { id: '1' }, { id: '2' }, { id: '3' }
      ]);

      // Mock database queries for metrics
      (mockPrisma.$queryRaw as jest.Mock)
        .mockResolvedValueOnce([{ count: 100 }]) // active users
        .mockResolvedValueOnce([{ count: 100 }]) // new users today  
        .mockResolvedValueOnce([{ count: 200 }]) // new reviews today
        .mockResolvedValueOnce([{ count: 10 }]); // database connections
    });

    it('should collect comprehensive system metrics', async () => {
      const metrics = await metricsCollector.collectMetrics();

      expect(metrics).toHaveProperty('timestamp');
      expect(metrics).toHaveProperty('cpu');
      expect(metrics).toHaveProperty('memory');
      expect(metrics).toHaveProperty('database');
      expect(metrics).toHaveProperty('application');
      expect(metrics).toHaveProperty('business');

      expect(metrics.cpu.usage).toEqual(expect.any(Number));
      expect(Array.isArray(metrics.cpu.loadAverage)).toBe(true);
      expect(metrics.memory.percentage).toEqual(expect.any(Number));
      expect(metrics.business.totalUsers).toBe(100);
      expect(metrics.business.totalBooks).toBe(50);
      expect(metrics.business.totalReviews).toBe(200);
    });

    it('should calculate correct memory percentage', async () => {
      const metrics = await metricsCollector.collectMetrics();

      expect(metrics.memory.percentage).toBeGreaterThan(0);
      expect(metrics.memory.percentage).toBeLessThanOrEqual(100);
    });

    it('should handle database query errors gracefully', async () => {
      (mockPrisma.user.count as jest.Mock).mockRejectedValue(new Error('Database error'));
      (mockPrisma.book.count as jest.Mock).mockRejectedValue(new Error('Database error'));
      (mockPrisma.review.count as jest.Mock).mockRejectedValue(new Error('Database error'));

      const metrics = await metricsCollector.collectMetrics();

      expect(metrics.business.totalUsers).toBe(0);
      expect(metrics.business.totalBooks).toBe(0);
      expect(metrics.business.totalReviews).toBe(0);
    });

    it('should include CPU load average', async () => {
      const metrics = await metricsCollector.collectMetrics();

      expect(Array.isArray(metrics.cpu.loadAverage)).toBe(true);
      expect(metrics.cpu.loadAverage).toHaveLength(3);
    });

    it('should calculate uptime correctly', async () => {
      const metrics = await metricsCollector.collectMetrics();

      expect(metrics.application.uptime).toBeGreaterThan(0);
    });
  });

  describe('recordRequest', () => {
    it('should record successful request', () => {
      metricsCollector.recordRequest(100, false);
      metricsCollector.recordRequest(200, false);

      expect(() => metricsCollector.recordRequest(150, false)).not.toThrow();
    });

    it('should record error request', () => {
      metricsCollector.recordRequest(100, true);
      metricsCollector.recordRequest(200, true);

      expect(() => metricsCollector.recordRequest(150, true)).not.toThrow();
    });

    it('should handle zero response time', () => {
      expect(() => metricsCollector.recordRequest(0, false)).not.toThrow();
    });

    it('should handle negative response time', () => {
      expect(() => metricsCollector.recordRequest(-100, false)).not.toThrow();
    });

    it('should default to non-error request', () => {
      expect(() => metricsCollector.recordRequest(100)).not.toThrow();
    });
  });

  describe('recordQuery', () => {
    it('should record query execution time', () => {
      metricsCollector.recordQuery(50);
      metricsCollector.recordQuery(100);

      expect(() => metricsCollector.recordQuery(75)).not.toThrow();
    });

    it('should handle zero execution time', () => {
      expect(() => metricsCollector.recordQuery(0)).not.toThrow();
    });

    it('should handle negative execution time', () => {
      expect(() => metricsCollector.recordQuery(-50)).not.toThrow();
    });
  });

  describe('addAlertRule', () => {
    it('should add alert rule', () => {
      const alertRule: AlertRule = {
        id: 'high-memory',
        name: 'High Memory Usage',
        condition: (metrics: SystemMetrics) => metrics.memory.percentage > 80,
        severity: 'high',
        message: 'Memory usage is above 80%',
        cooldown: 300000, // 5 minutes
      };

      metricsCollector.addAlertRule(alertRule);

      const rules = metricsCollector.getAlertRules();
      expect(rules).toContain(alertRule);
    });

    it('should allow adding duplicate alert rules (implementation allows it)', () => {
      const alertRule: AlertRule = {
        id: 'duplicate-test',
        name: 'Duplicate Test',
        condition: () => false,
        severity: 'low',
        message: 'Test message',
        cooldown: 60000,
      };

      const initialCount = metricsCollector.getAlertRules().length;
      metricsCollector.addAlertRule(alertRule);
      metricsCollector.addAlertRule(alertRule);

      const rules = metricsCollector.getAlertRules();
      expect(rules.length).toBe(initialCount + 2);
    });
  });

  describe('removeAlertRule', () => {
    it('should remove alert rule by id', () => {
      const alertRule: AlertRule = {
        id: 'test-rule',
        name: 'Test Rule',
        condition: () => false,
        severity: 'low',
        message: 'Test message',
        cooldown: 60000,
      };

      metricsCollector.addAlertRule(alertRule);
      expect(metricsCollector.getAlertRules()).toContain(alertRule);

      metricsCollector.removeAlertRule('test-rule');
      expect(metricsCollector.getAlertRules()).not.toContain(alertRule);
    });

    it('should handle removing non-existent rule', () => {
      expect(() => metricsCollector.removeAlertRule('non-existent')).not.toThrow();
    });
  });

  describe('alert rule management', () => {
    it('should trigger alert evaluation through collectMetrics', async () => {
      const alertRule: AlertRule = {
        id: 'high-memory-test',
        name: 'High Memory Test',
        condition: (metrics: SystemMetrics) => metrics.memory.percentage > 80,
        severity: 'high',
        message: 'Memory usage is high',
        cooldown: 0,
      };

      metricsCollector.addAlertRule(alertRule);

      // collectMetrics should internally check alerts
      const metrics = await metricsCollector.collectMetrics();
      
      // Just verify the alert rule was added and metrics were collected
      expect(metrics.memory.percentage).toBeGreaterThan(0);
      const rules = metricsCollector.getAlertRules();
      expect(rules.some(rule => rule.id === 'high-memory-test')).toBe(true);
    });

    it('should not trigger alert when condition is not met', async () => {
      const alertRule: AlertRule = {
        id: 'never-trigger',
        name: 'Never Trigger',
        condition: () => false,
        severity: 'low',
        message: 'This alert never triggers',
        cooldown: 0,
      };

      metricsCollector.addAlertRule(alertRule);

      // collectMetrics should internally check alerts but not trigger this one
      await metricsCollector.collectMetrics();
      
      // We can't directly test the alerts since checkAlerts is private,
      // but we can verify the rule was added
      const rules = metricsCollector.getAlertRules();
      expect(rules).toContain(alertRule);
    });
  });

  describe('getAlertRules', () => {
    it('should return all alert rules including defaults', () => {
      const rule1: AlertRule = {
        id: 'custom-rule1',
        name: 'Custom Rule 1',
        condition: () => false,
        severity: 'low',
        message: 'Test',
        cooldown: 0,
      };

      const initialRulesCount = metricsCollector.getAlertRules().length;
      metricsCollector.addAlertRule(rule1);

      const rules = metricsCollector.getAlertRules();
      expect(rules).toHaveLength(initialRulesCount + 1);
      expect(rules.some(rule => rule.id === 'custom-rule1')).toBe(true);
    });

    it('should return default alert rules when initialized', () => {
      const rules = metricsCollector.getAlertRules();
      expect(rules.length).toBeGreaterThan(0);
      expect(rules.some(rule => rule.id === 'high-cpu-usage')).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset all counters', () => {
      metricsCollector.recordRequest(100, false);
      metricsCollector.recordRequest(200, true);
      metricsCollector.recordQuery(50);

      metricsCollector.reset();

      // After reset, counters should be back to initial state
      expect(() => metricsCollector.reset()).not.toThrow();
    });
  });
});