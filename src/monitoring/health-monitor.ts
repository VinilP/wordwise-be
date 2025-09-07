import { PrismaClient } from '@prisma/client';
import { performance } from 'perf_hooks';

export interface HealthMetrics {
  timestamp: Date;
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: number;
  databaseStatus: 'connected' | 'disconnected' | 'slow';
  responseTime: number;
  errorRate: number;
  activeConnections: number;
  requestCount: number;
  cacheHitRate?: number;
}

export interface AlertConfig {
  memoryThreshold: number; // MB
  cpuThreshold: number; // percentage
  responseTimeThreshold: number; // ms
  errorRateThreshold: number; // percentage
  databaseResponseTimeThreshold: number; // ms
}

export class HealthMonitor {
  private prisma: PrismaClient;
  private startTime: number;
  private requestCount: number = 0;
  private errorCount: number = 0;
  private responseTimes: number[] = [];
  private alertConfig: AlertConfig;
  private alerts: string[] = [];

  constructor(prisma: PrismaClient, alertConfig?: Partial<AlertConfig>) {
    this.prisma = prisma;
    this.startTime = Date.now();
    this.alertConfig = {
      memoryThreshold: 500, // 500MB
      cpuThreshold: 80, // 80%
      responseTimeThreshold: 2000, // 2 seconds
      errorRateThreshold: 5, // 5%
      databaseResponseTimeThreshold: 1000, // 1 second
      ...alertConfig,
    };
  }

  async checkHealth(): Promise<HealthMetrics> {
    const timestamp = new Date();
    const uptime = Date.now() - this.startTime;
    const memoryUsage = process.memoryUsage();
    const cpuUsage = await this.getCpuUsage();
    const databaseStatus = await this.checkDatabaseHealth();
    const responseTime = this.calculateAverageResponseTime();
    const errorRate = this.calculateErrorRate();
    const activeConnections = await this.getActiveConnections();

    const status = this.determineOverallStatus({
      memoryUsage,
      cpuUsage,
      responseTime,
      errorRate,
      databaseStatus,
    });

    const metrics: HealthMetrics = {
      timestamp,
      status,
      uptime,
      memoryUsage,
      cpuUsage,
      databaseStatus,
      responseTime,
      errorRate,
      activeConnections,
      requestCount: this.requestCount,
    };

    this.checkAlerts(metrics);
    return metrics;
  }

  recordRequest(responseTime: number, isError: boolean = false): void {
    this.requestCount++;
    this.responseTimes.push(responseTime);
    
    if (isError) {
      this.errorCount++;
    }

    // Keep only last 1000 response times for rolling average
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }
  }

  private async getCpuUsage(): Promise<number> {
    const startUsage = process.cpuUsage();
    const startTime = Date.now();
    
    // Wait a bit to measure CPU usage
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const endUsage = process.cpuUsage(startUsage);
    const endTime = Date.now();
    
    const cpuTime = (endUsage.user + endUsage.system) / 1000; // Convert to milliseconds
    const totalTime = (endTime - startTime) * 1000; // Convert to microseconds
    
    return (cpuTime / totalTime) * 100;
  }

  private async checkDatabaseHealth(): Promise<'connected' | 'disconnected' | 'slow'> {
    try {
      const startTime = performance.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const endTime = performance.now();
      
      const responseTime = endTime - startTime;
      
      if (responseTime > this.alertConfig.databaseResponseTimeThreshold) {
        return 'slow';
      }
      
      return 'connected';
    } catch (error) {
      console.error('Database health check failed:', error);
      return 'disconnected';
    }
  }

  private calculateAverageResponseTime(): number {
    if (this.responseTimes.length === 0) return 0;
    return this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
  }

  private calculateErrorRate(): number {
    if (this.requestCount === 0) return 0;
    return (this.errorCount / this.requestCount) * 100;
  }

  private async getActiveConnections(): Promise<number> {
    try {
      const result = await this.prisma.$queryRaw<[{ count: bigint }]>`
        SELECT count(*) as count FROM pg_stat_activity WHERE state = 'active'
      `;
      return Number(result[0].count);
    } catch (error) {
      console.error('Failed to get active connections:', error);
      return 0;
    }
  }

  private determineOverallStatus(metrics: {
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: number;
    responseTime: number;
    errorRate: number;
    databaseStatus: string;
  }): 'healthy' | 'degraded' | 'unhealthy' {
    const memoryMB = metrics.memoryUsage.heapUsed / 1024 / 1024;
    
    // Check for critical issues
    if (
      metrics.databaseStatus === 'disconnected' ||
      metrics.errorRate > this.alertConfig.errorRateThreshold * 2 ||
      memoryMB > this.alertConfig.memoryThreshold * 2
    ) {
      return 'unhealthy';
    }

    // Check for degraded performance
    if (
      memoryMB > this.alertConfig.memoryThreshold ||
      metrics.cpuUsage > this.alertConfig.cpuThreshold ||
      metrics.responseTime > this.alertConfig.responseTimeThreshold ||
      metrics.errorRate > this.alertConfig.errorRateThreshold ||
      metrics.databaseStatus === 'slow'
    ) {
      return 'degraded';
    }

    return 'healthy';
  }

  private checkAlerts(metrics: HealthMetrics): void {
    this.alerts = [];
    const memoryMB = metrics.memoryUsage.heapUsed / 1024 / 1024;

    if (memoryMB > this.alertConfig.memoryThreshold) {
      this.alerts.push(`High memory usage: ${memoryMB.toFixed(2)}MB (threshold: ${this.alertConfig.memoryThreshold}MB)`);
    }

    if (metrics.cpuUsage > this.alertConfig.cpuThreshold) {
      this.alerts.push(`High CPU usage: ${metrics.cpuUsage.toFixed(2)}% (threshold: ${this.alertConfig.cpuThreshold}%)`);
    }

    if (metrics.responseTime > this.alertConfig.responseTimeThreshold) {
      this.alerts.push(`Slow response time: ${metrics.responseTime.toFixed(2)}ms (threshold: ${this.alertConfig.responseTimeThreshold}ms)`);
    }

    if (metrics.errorRate > this.alertConfig.errorRateThreshold) {
      this.alerts.push(`High error rate: ${metrics.errorRate.toFixed(2)}% (threshold: ${this.alertConfig.errorRateThreshold}%)`);
    }

    if (metrics.databaseStatus === 'slow') {
      this.alerts.push('Database response is slow');
    }

    if (metrics.databaseStatus === 'disconnected') {
      this.alerts.push('Database connection lost');
    }
  }

  getAlerts(): string[] {
    return [...this.alerts];
  }

  clearAlerts(): void {
    this.alerts = [];
  }

  getMetrics(): {
    requestCount: number;
    errorCount: number;
    averageResponseTime: number;
    errorRate: number;
  } {
    return {
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      averageResponseTime: this.calculateAverageResponseTime(),
      errorRate: this.calculateErrorRate(),
    };
  }

  reset(): void {
    this.requestCount = 0;
    this.errorCount = 0;
    this.responseTimes = [];
    this.alerts = [];
    this.startTime = Date.now();
  }
}

export class PerformanceProfiler {
  private queryMetrics: Map<string, { count: number; totalTime: number; avgTime: number }> = new Map();
  private slowQueries: Array<{ query: string; time: number; timestamp: Date }> = [];

  recordQuery(queryName: string, executionTime: number): void {
    const existing = this.queryMetrics.get(queryName) || { count: 0, totalTime: 0, avgTime: 0 };
    
    existing.count++;
    existing.totalTime += executionTime;
    existing.avgTime = existing.totalTime / existing.count;
    
    this.queryMetrics.set(queryName, existing);

    // Track slow queries
    if (executionTime > 1000) { // > 1 second
      this.slowQueries.push({
        query: queryName,
        time: executionTime,
        timestamp: new Date(),
      });

      // Keep only last 100 slow queries
      if (this.slowQueries.length > 100) {
        this.slowQueries = this.slowQueries.slice(-100);
      }
    }
  }

  getQueryMetrics(): Map<string, { count: number; totalTime: number; avgTime: number }> {
    return new Map(this.queryMetrics);
  }

  getSlowQueries(): Array<{ query: string; time: number; timestamp: Date }> {
    return [...this.slowQueries];
  }

  getTopSlowQueries(limit: number = 10): Array<{ query: string; time: number; timestamp: Date }> {
    return this.slowQueries
      .sort((a, b) => b.time - a.time)
      .slice(0, limit);
  }

  clearMetrics(): void {
    this.queryMetrics.clear();
    this.slowQueries = [];
  }
}

export class AlertManager {
  private alerts: Array<{
    id: string;
    type: 'warning' | 'error' | 'critical';
    message: string;
    timestamp: Date;
    resolved: boolean;
  }> = [];

  createAlert(type: 'warning' | 'error' | 'critical', message: string): string {
    const id = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.alerts.push({
      id,
      type,
      message,
      timestamp: new Date(),
      resolved: false,
    });

    // Send alert notification (implement based on your notification system)
    this.sendNotification(type, message);

    return id;
  }

  resolveAlert(id: string): boolean {
    const alert = this.alerts.find(a => a.id === id);
    if (alert) {
      alert.resolved = true;
      return true;
    }
    return false;
  }

  getActiveAlerts(): Array<{
    id: string;
    type: 'warning' | 'error' | 'critical';
    message: string;
    timestamp: Date;
  }> {
    return this.alerts
      .filter(a => !a.resolved)
      .map(({ id, type, message, timestamp }) => ({ id, type, message, timestamp }));
  }

  getAlertsByType(type: 'warning' | 'error' | 'critical'): Array<{
    id: string;
    message: string;
    timestamp: Date;
  }> {
    return this.alerts
      .filter(a => a.type === type && !a.resolved)
      .map(({ id, message, timestamp }) => ({ id, message, timestamp }));
  }

  private sendNotification(type: 'warning' | 'error' | 'critical', message: string): void {
    // Implement notification logic here
    // This could send emails, Slack messages, PagerDuty alerts, etc.
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Example: Send to external monitoring service
    // await this.sendToMonitoringService(type, message);
  }

  // Example method for sending to external monitoring service
  private async sendToMonitoringService(type: string, message: string): Promise<void> {
    // Implement integration with your monitoring service
    // Examples: DataDog, New Relic, CloudWatch, etc.
  }
}

// Export singleton instances
export const healthMonitor = new HealthMonitor(new PrismaClient());
export const performanceProfiler = new PerformanceProfiler();
export const alertManager = new AlertManager();
