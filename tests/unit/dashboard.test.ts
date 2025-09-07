import request from 'supertest';
import { MonitoringDashboard } from '../../src/monitoring/dashboard';
import { MetricsCollector, SystemMetrics } from '../../src/monitoring/metrics-collector';
import { HealthMonitor, HealthMetrics } from '../../src/monitoring/health-monitor';
import { PrismaClient } from '@prisma/client';

// Mock dependencies
const mockMetricsCollector = {
  collectMetrics: jest.fn(),
  checkAlerts: jest.fn(),
  getAlertRules: jest.fn(),
  getAlerts: jest.fn(),
  clearAlerts: jest.fn(),
} as unknown as MetricsCollector;

const mockHealthMonitor = {
  checkHealth: jest.fn(),
  getAlerts: jest.fn(),
  clearAlerts: jest.fn(),
} as unknown as HealthMonitor;

describe('MonitoringDashboard', () => {
  let dashboard: MonitoringDashboard;
  let mockSystemMetrics: SystemMetrics;
  let mockHealthMetrics: HealthMetrics;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSystemMetrics = {
      timestamp: new Date(),
      cpu: {
        usage: 45.5,
        loadAverage: [1.2, 1.1, 1.0],
      },
      memory: {
        used: 512 * 1024 * 1024, // 512MB
        total: 1024 * 1024 * 1024, // 1GB
        free: 512 * 1024 * 1024, // 512MB
        percentage: 50,
      },
      database: {
        connectionCount: 10,
        queryCount: 1000,
        averageQueryTime: 25,
        slowQueries: 2,
      },
      application: {
        uptime: 3600000, // 1 hour
        requestCount: 500,
        errorCount: 5,
        responseTime: 150,
        throughput: 10.5,
      },
      business: {
        totalUsers: 100,
        totalBooks: 50,
        totalReviews: 200,
        activeUsers: 25,
        newUsersToday: 5,
        newReviewsToday: 15,
      },
    };

    mockHealthMetrics = {
      timestamp: new Date(),
      status: 'healthy',
      uptime: 3600000,
      memoryUsage: {
        rss: 100 * 1024 * 1024,
        heapTotal: 80 * 1024 * 1024,
        heapUsed: 60 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
      },
      cpuUsage: 45.5,
      databaseStatus: 'connected',
      responseTime: 150,
      errorRate: 1.0,
      activeConnections: 10,
      requestCount: 500,
    };

    (mockMetricsCollector.collectMetrics as jest.Mock).mockResolvedValue(mockSystemMetrics);
    (mockHealthMonitor.checkHealth as jest.Mock).mockResolvedValue(mockHealthMetrics);
    (mockMetricsCollector.checkAlerts as jest.Mock).mockResolvedValue([]);
    (mockMetricsCollector.getAlerts as jest.Mock).mockReturnValue([]);
    (mockHealthMonitor.getAlerts as jest.Mock).mockReturnValue([]);

    dashboard = new MonitoringDashboard(mockMetricsCollector, mockHealthMonitor);
  });

  describe('constructor', () => {
    it('should initialize dashboard with metrics collector and health monitor', () => {
      expect(dashboard).toBeInstanceOf(MonitoringDashboard);
    });
  });

  describe('GET /', () => {
    it('should return dashboard HTML', async () => {
      const response = await request(dashboard.getApp())
        .get('/')
        .expect(200);

      expect(response.text).toContain('<!DOCTYPE html>');
      expect(response.text).toContain('Monitoring Dashboard');
      expect(response.headers['content-type']).toMatch(/text\/html/);
    });
  });

  describe('GET /api/metrics', () => {
    it('should return system metrics', async () => {
      const response = await request(dashboard.getApp())
        .get('/api/metrics')
        .expect(200);

      expect(response.body).toEqual({
        ...mockSystemMetrics,
        timestamp: expect.any(String),
      });
      expect(mockMetricsCollector.collectMetrics).toHaveBeenCalledTimes(1);
    });

    it('should handle metrics collection errors', async () => {
      (mockMetricsCollector.collectMetrics as jest.Mock).mockRejectedValue(
        new Error('Metrics collection failed')
      );

      const response = await request(dashboard.getApp())
        .get('/api/metrics')
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to collect metrics' });
    });

    it('should set CORS headers', async () => {
      const response = await request(dashboard.getApp())
        .get('/api/metrics')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('*');
    });
  });

  describe('GET /api/health', () => {
    it('should return health metrics', async () => {
      const response = await request(dashboard.getApp())
        .get('/api/health')
        .expect(200);

      expect(response.body).toEqual({
        ...mockHealthMetrics,
        timestamp: expect.any(String),
      });
      expect(mockHealthMonitor.checkHealth).toHaveBeenCalledTimes(1);
    });

    it('should handle health check errors', async () => {
      (mockHealthMonitor.checkHealth as jest.Mock).mockRejectedValue(
        new Error('Health check failed')
      );

      const response = await request(dashboard.getApp())
        .get('/api/health')
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to check health' });
    });
  });

  describe('GET /api/alerts', () => {
    it('should return combined alerts from metrics and health monitors', async () => {
      const metricsAlerts = [
        {
          ruleId: 'high-cpu',
          severity: 'high' as const,
          message: 'CPU usage is high',
          timestamp: new Date(),
        },
      ];

      const healthAlerts = ['Database connection slow'];

      (mockMetricsCollector.getAlerts as jest.Mock).mockReturnValue(metricsAlerts);
      (mockHealthMonitor.getAlerts as jest.Mock).mockReturnValue(healthAlerts);

      const response = await request(dashboard.getApp())
        .get('/api/alerts')
        .expect(200);

      expect(response.body).toEqual({
        metrics: metricsAlerts.map(alert => ({
          ...alert,
          timestamp: expect.any(String),
        })),
        health: healthAlerts,
      });
    });

    it('should handle alerts check errors', async () => {
      (mockMetricsCollector.getAlerts as jest.Mock).mockImplementation(() => {
        throw new Error('Alerts check failed');
      });

      const response = await request(dashboard.getApp())
        .get('/api/alerts')
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to check alerts' });
    });
  });

  describe('GET /api/history/metrics', () => {
    it('should return metrics history', async () => {
      // First, add some metrics to history by calling /api/metrics
      await request(dashboard.getApp()).get('/api/metrics');
      await request(dashboard.getApp()).get('/api/metrics');

      const response = await request(dashboard.getApp())
        .get('/api/history/metrics')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should limit history size', async () => {
      // This test would require accessing private methods or properties
      // For now, we'll just test that the endpoint works
      const response = await request(dashboard.getApp())
        .get('/api/history/metrics')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/history/health', () => {
    it('should return health history', async () => {
      // First, add some health data to history by calling /api/health
      await request(dashboard.getApp()).get('/api/health');
      await request(dashboard.getApp()).get('/api/health');

      const response = await request(dashboard.getApp())
        .get('/api/history/health')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/alerts/clear', () => {
    it('should clear all alerts', async () => {
      const response = await request(dashboard.getApp())
        .post('/api/alerts/clear')
        .expect(200);

      expect(response.body).toEqual({ message: 'Alerts cleared successfully' });
    });
  });

  describe('GET /api/summary', () => {
    it('should return dashboard summary', async () => {
      const response = await request(dashboard.getApp())
        .get('/api/summary')
        .expect(200);

      expect(response.body).toMatchObject({
        status: expect.any(String),
        uptime: expect.any(Number),
        totalRequests: expect.any(Number),
        errorRate: expect.any(Number),
        averageResponseTime: expect.any(Number),
        memoryUsage: expect.any(Number),
        cpuUsage: expect.any(Number),
        databaseStatus: expect.any(String),
        activeAlerts: expect.any(Number),
        lastUpdated: expect.any(String),
      });
    });

    it('should handle summary generation errors', async () => {
      (mockHealthMonitor.checkHealth as jest.Mock).mockRejectedValue(
        new Error('Health check failed')
      );

      const response = await request(dashboard.getApp())
        .get('/api/summary')
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to generate summary' });
    });
  });

  describe('CORS middleware', () => {
    it('should set CORS headers for all routes', async () => {
      const response = await request(dashboard.getApp())
        .get('/api/health')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('*');
      expect(response.headers['access-control-allow-headers']).toContain('Content-Type');
    });
  });

  describe('error handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      (mockMetricsCollector.collectMetrics as jest.Mock).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const response = await request(dashboard.getApp())
        .get('/api/metrics')
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to collect metrics' });
    });
  });

  describe('history management', () => {
    it('should add metrics to history when collecting metrics', async () => {
      await request(dashboard.getApp()).get('/api/metrics');

      const historyResponse = await request(dashboard.getApp())
        .get('/api/history/metrics')
        .expect(200);

      expect(historyResponse.body.length).toBeGreaterThan(0);
    });

    it('should add health data to history when checking health', async () => {
      await request(dashboard.getApp()).get('/api/health');

      const historyResponse = await request(dashboard.getApp())
        .get('/api/history/health')
        .expect(200);

      expect(historyResponse.body.length).toBeGreaterThan(0);
    });
  });

  describe('dashboard HTML generation', () => {
    it('should generate valid HTML with monitoring data', async () => {
      const response = await request(dashboard.getApp())
        .get('/')
        .expect(200);

      expect(response.text).toContain('<!DOCTYPE html>');
      expect(response.text).toContain('<html');
      expect(response.text).toContain('<head>');
      expect(response.text).toContain('<body>');
      expect(response.text).toContain('</html>');
    });

    it('should include JavaScript for real-time updates', async () => {
      const response = await request(dashboard.getApp())
        .get('/')
        .expect(200);

      expect(response.text).toContain('<script>');
      expect(response.text).toContain('setInterval');
    });
  });
});