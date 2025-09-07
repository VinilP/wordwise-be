import { PrismaClient } from '@prisma/client';
import { performance } from 'perf_hooks';

export interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    total: number;
    free: number;
    percentage: number;
  };
  database: {
    connectionCount: number;
    queryCount: number;
    averageQueryTime: number;
    slowQueries: number;
  };
  application: {
    uptime: number;
    requestCount: number;
    errorCount: number;
    responseTime: number;
    throughput: number;
  };
  business: {
    totalUsers: number;
    totalBooks: number;
    totalReviews: number;
    activeUsers: number;
    newUsersToday: number;
    newReviewsToday: number;
  };
}

export interface AlertRule {
  id: string;
  name: string;
  condition: (metrics: SystemMetrics) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  cooldown: number; // in milliseconds
  lastTriggered?: Date;
}

export class MetricsCollector {
  private prisma: PrismaClient;
  private startTime: number;
  private requestCount: number = 0;
  private errorCount: number = 0;
  private responseTimes: number[] = [];
  private queryCount: number = 0;
  private queryTimes: number[] = [];
  private alertRules: AlertRule[] = [];

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.startTime = Date.now();
    this.initializeAlertRules();
  }

  private initializeAlertRules(): void {
    this.alertRules = [
      {
        id: 'high-cpu-usage',
        name: 'High CPU Usage',
        condition: (metrics) => metrics.cpu.usage > 80,
        severity: 'high',
        message: 'CPU usage is above 80%',
        cooldown: 5 * 60 * 1000, // 5 minutes
      },
      {
        id: 'high-memory-usage',
        name: 'High Memory Usage',
        condition: (metrics) => metrics.memory.percentage > 85,
        severity: 'high',
        message: 'Memory usage is above 85%',
        cooldown: 5 * 60 * 1000, // 5 minutes
      },
      {
        id: 'slow-response-time',
        name: 'Slow Response Time',
        condition: (metrics) => metrics.application.responseTime > 2000,
        severity: 'medium',
        message: 'Average response time is above 2 seconds',
        cooldown: 2 * 60 * 1000, // 2 minutes
      },
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        condition: (metrics) => (metrics.application.errorCount / metrics.application.requestCount) > 0.05,
        severity: 'critical',
        message: 'Error rate is above 5%',
        cooldown: 1 * 60 * 1000, // 1 minute
      },
      {
        id: 'database-slow-queries',
        name: 'Database Slow Queries',
        condition: (metrics) => metrics.database.slowQueries > 10,
        severity: 'medium',
        message: 'Too many slow database queries detected',
        cooldown: 10 * 60 * 1000, // 10 minutes
      },
      {
        id: 'database-connection-issues',
        name: 'Database Connection Issues',
        condition: (metrics) => metrics.database.connectionCount > 50,
        severity: 'high',
        message: 'Too many database connections',
        cooldown: 5 * 60 * 1000, // 5 minutes
      },
      {
        id: 'low-throughput',
        name: 'Low Throughput',
        condition: (metrics) => metrics.application.throughput < 10,
        severity: 'low',
        message: 'Application throughput is below 10 requests per minute',
        cooldown: 15 * 60 * 1000, // 15 minutes
      },
    ];
  }

  async collectMetrics(): Promise<SystemMetrics> {
    const timestamp = new Date();
    
    // Collect system metrics
    const cpu = await this.getCpuMetrics();
    const memory = this.getMemoryMetrics();
    const database = await this.getDatabaseMetrics();
    const application = this.getApplicationMetrics();
    const business = await this.getBusinessMetrics();

    const metrics: SystemMetrics = {
      timestamp,
      cpu,
      memory,
      database,
      application,
      business,
    };

    // Check for alerts
    await this.checkAlerts(metrics);

    return metrics;
  }

  private async getCpuMetrics(): Promise<{ usage: number; loadAverage: number[] }> {
    const startUsage = process.cpuUsage();
    const startTime = Date.now();
    
    // Wait a bit to measure CPU usage
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const endUsage = process.cpuUsage(startUsage);
    const endTime = Date.now();
    
    const cpuTime = (endUsage.user + endUsage.system) / 1000; // Convert to milliseconds
    const totalTime = (endTime - startTime) * 1000; // Convert to microseconds
    
    const usage = Math.min((cpuTime / totalTime) * 100, 100);
    
    return {
      usage,
      loadAverage: process.platform === 'win32' ? [0, 0, 0] : require('os').loadavg(),
    };
  }

  private getMemoryMetrics(): { used: number; total: number; free: number; percentage: number } {
    const memUsage = process.memoryUsage();
    const totalMem = require('os').totalmem();
    const freeMem = require('os').freemem();
    
    const used = memUsage.heapUsed;
    const total = totalMem;
    const free = freeMem;
    const percentage = (used / total) * 100;
    
    return { used, total, free, percentage };
  }

  private async getDatabaseMetrics(): Promise<{
    connectionCount: number;
    queryCount: number;
    averageQueryTime: number;
    slowQueries: number;
  }> {
    let connectionCount = 0;
    let queryCount = 0;
    let averageQueryTime = 0;

    try {
      // Get active connections - this should work on most PostgreSQL setups
      try {
        const connectionResult = await this.prisma.$queryRaw<[{ count: bigint }]>`
          SELECT count(*) as count FROM pg_stat_activity WHERE state = 'active'
        `;
        connectionCount = connectionResult && connectionResult.length > 0 
          ? Number(connectionResult[0].count) 
          : 0;
      } catch (connectionError) {
        console.warn('Could not get connection count:', connectionError);
        connectionCount = 0;
      }

      // Get query statistics - this requires pg_stat_statements extension
      try {
        const queryResult = await this.prisma.$queryRaw<[{
          calls: bigint;
          total_time: number;
          mean_time: number;
        }]>`
          SELECT 
            calls,
            total_time,
            mean_time
          FROM pg_stat_statements 
          WHERE query NOT LIKE '%pg_stat_statements%'
          ORDER BY total_time DESC
          LIMIT 1
        `;

        queryCount = queryResult && queryResult.length > 0 ? Number(queryResult[0].calls) : 0;
        averageQueryTime = queryResult && queryResult.length > 0 ? queryResult[0].mean_time : 0;
      } catch (queryError) {
        console.warn('Could not get query statistics (pg_stat_statements may not be enabled):', queryError);
        queryCount = 0;
        averageQueryTime = 0;
      }

      const slowQueries = this.queryTimes.filter(time => time > 1000).length;

      return {
        connectionCount,
        queryCount,
        averageQueryTime,
        slowQueries,
      };
    } catch (error) {
      console.error('Failed to collect database metrics:', error);
      return {
        connectionCount: 0,
        queryCount: 0,
        averageQueryTime: 0,
        slowQueries: 0,
      };
    }
  }

  private getApplicationMetrics(): {
    uptime: number;
    requestCount: number;
    errorCount: number;
    responseTime: number;
    throughput: number;
  } {
    const uptime = Date.now() - this.startTime;
    const averageResponseTime = this.responseTimes.length > 0 
      ? this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length 
      : 0;
    
    // Calculate throughput (requests per minute)
    const throughput = this.requestCount / (uptime / (1000 * 60));

    return {
      uptime,
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      responseTime: averageResponseTime,
      throughput,
    };
  }

  private async getBusinessMetrics(): Promise<{
    totalUsers: number;
    totalBooks: number;
    totalReviews: number;
    activeUsers: number;
    newUsersToday: number;
    newReviewsToday: number;
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [
        totalUsers,
        totalBooks,
        totalReviews,
        newUsersToday,
        newReviewsToday,
      ] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.book.count(),
        this.prisma.review.count(),
        this.prisma.user.count({
          where: { createdAt: { gte: today } }
        }),
        this.prisma.review.count({
          where: { createdAt: { gte: today } }
        }),
      ]);

      // Active users (users who have logged in within the last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const activeUsers = await this.prisma.user.count({
        where: { updatedAt: { gte: yesterday } }
      });

      return {
        totalUsers,
        totalBooks,
        totalReviews,
        activeUsers,
        newUsersToday,
        newReviewsToday,
      };
    } catch (error) {
      console.error('Failed to collect business metrics:', error);
      return {
        totalUsers: 0,
        totalBooks: 0,
        totalReviews: 0,
        activeUsers: 0,
        newUsersToday: 0,
        newReviewsToday: 0,
      };
    }
  }

  public async checkAlerts(metrics: SystemMetrics): Promise<void> {
    for (const rule of this.alertRules) {
      if (rule.condition(metrics)) {
        const now = new Date();
        const lastTriggered = rule.lastTriggered;
        
        // Check cooldown
        if (!lastTriggered || (now.getTime() - lastTriggered.getTime()) > rule.cooldown) {
          await this.triggerAlert(rule, metrics);
          rule.lastTriggered = now;
        }
      }
    }
  }

  private async triggerAlert(rule: AlertRule, metrics: SystemMetrics): Promise<void> {
    const alert = {
      id: rule.id,
      name: rule.name,
      severity: rule.severity,
      message: rule.message,
      timestamp: new Date(),
      metrics: {
        cpu: metrics.cpu.usage,
        memory: metrics.memory.percentage,
        responseTime: metrics.application.responseTime,
        errorRate: (metrics.application.errorCount / metrics.application.requestCount) * 100,
      },
    };

    console.log(`🚨 ALERT [${rule.severity.toUpperCase()}] ${rule.name}: ${rule.message}`);
    console.log('Metrics:', alert.metrics);

    // Here you would send the alert to your monitoring system
    // Examples: DataDog, New Relic, PagerDuty, Slack, etc.
    await this.sendAlertToMonitoringService(alert);
  }

  private async sendAlertToMonitoringService(alert: any): Promise<void> {
    // Implement integration with your monitoring service
    // Examples:
    
    // DataDog
    // await this.sendToDataDog(alert);
    
    // New Relic
    // await this.sendToNewRelic(alert);
    
    // PagerDuty
    // await this.sendToPagerDuty(alert);
    
    // Slack
    // await this.sendToSlack(alert);
    
    // Email
    // await this.sendEmail(alert);
  }

  recordRequest(responseTime: number, isError: boolean = false): void {
    this.requestCount++;
    this.responseTimes.push(responseTime);
    
    if (isError) {
      this.errorCount++;
    }

    // Keep only last 1000 response times
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }
  }

  recordQuery(executionTime: number): void {
    this.queryCount++;
    this.queryTimes.push(executionTime);

    // Keep only last 1000 query times
    if (this.queryTimes.length > 1000) {
      this.queryTimes = this.queryTimes.slice(-1000);
    }
  }

  getAlertRules(): AlertRule[] {
    return [...this.alertRules];
  }

  addAlertRule(rule: AlertRule): void {
    this.alertRules.push(rule);
  }

  removeAlertRule(ruleId: string): boolean {
    const index = this.alertRules.findIndex(rule => rule.id === ruleId);
    if (index !== -1) {
      this.alertRules.splice(index, 1);
      return true;
    }
    return false;
  }

  getAlerts(): Array<{
    message: string;
    ruleId: string;
    severity: string;
    timestamp: Date;
  }> {
    // Return active alerts based on current metrics
    const alerts: Array<{
      message: string;
      ruleId: string;
      severity: string;
      timestamp: Date;
    }> = [];

    // Check each alert rule against current state
    for (const rule of this.alertRules) {
      if (rule.lastTriggered) {
        // Only include alerts triggered in the last hour
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
        if (rule.lastTriggered > hourAgo) {
          alerts.push({
            message: rule.message,
            ruleId: rule.id,
            severity: rule.severity,
            timestamp: rule.lastTriggered,
          });
        }
      }
    }

    return alerts;
  }

  clearAlerts(): void {
    // Clear all alert timestamps
    for (const rule of this.alertRules) {
      rule.lastTriggered = undefined;
    }
  }

  reset(): void {
    this.requestCount = 0;
    this.errorCount = 0;
    this.responseTimes = [];
    this.queryCount = 0;
    this.queryTimes = [];
    this.startTime = Date.now();
  }
}

// Export singleton instance
export const metricsCollector = new MetricsCollector(new PrismaClient());
