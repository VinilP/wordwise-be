import express from 'express';
import { SystemMetrics, MetricsCollector } from './metrics-collector';
import { HealthMetrics, HealthMonitor } from './health-monitor';

export class MonitoringDashboard {
  private app: express.Application;
  private metricsCollector: MetricsCollector;
  private healthMonitor: HealthMonitor;
  private metricsHistory: SystemMetrics[] = [];
  private healthHistory: HealthMetrics[] = [];
  private maxHistorySize = 1000; // Keep last 1000 data points

  constructor(metricsCollector: MetricsCollector, healthMonitor: HealthMonitor) {
    this.metricsCollector = metricsCollector;
    this.healthMonitor = healthMonitor;
    this.app = express();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Enable CORS for dashboard access
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      next();
    });

    // Dashboard home page
    this.app.get('/', (req, res) => {
      res.send(this.generateDashboardHTML());
    });

    // API endpoints
    this.app.get('/api/metrics', async (req, res) => {
      try {
        const metrics = await this.metricsCollector.collectMetrics();
        this.addToHistory(metrics, 'metrics');
        res.json(metrics);
      } catch (error) {
        res.status(500).json({ error: 'Failed to collect metrics' });
      }
    });

    this.app.get('/api/health', async (req, res) => {
      try {
        const health = await this.healthMonitor.checkHealth();
        this.addToHistory(health, 'health');
        res.json(health);
      } catch (error) {
        res.status(500).json({ error: 'Failed to check health' });
      }
    });

    this.app.get('/api/history/metrics', (req, res) => {
      const limit = parseInt(req.query.limit as string) || 100;
      res.json(this.metricsHistory.slice(-limit));
    });

    this.app.get('/api/history/health', (req, res) => {
      const limit = parseInt(req.query.limit as string) || 100;
      res.json(this.healthHistory.slice(-limit));
    });

    this.app.get('/api/alerts', async (req, res) => {
      try {
        const healthAlerts = this.healthMonitor.getAlerts();
        const metricsAlerts = await this.metricsCollector.getAlerts();
        res.json({
          metrics: metricsAlerts,
          health: healthAlerts,
        });
      } catch (error) {
        res.status(500).json({ error: 'Failed to check alerts' });
      }
    });

    this.app.post('/api/alerts/clear', (req, res) => {
      try {
        // Clear alerts from both monitors
        this.healthMonitor.clearAlerts();
        if (this.metricsCollector.clearAlerts) {
          this.metricsCollector.clearAlerts();
        }
        res.json({ message: 'Alerts cleared successfully' });
      } catch (error) {
        res.status(500).json({ error: 'Failed to clear alerts' });
      }
    });

    this.app.get('/api/summary', async (req, res) => {
      try {
        const latestHealth = this.healthHistory[this.healthHistory.length - 1];
        const latestMetrics = this.metricsHistory[this.metricsHistory.length - 1];
        
        // If no history, collect fresh data
        let health = latestHealth;
        let metrics = latestMetrics;
        
        if (!health) {
          health = await this.healthMonitor.checkHealth();
        }
        if (!metrics) {
          metrics = await this.metricsCollector.collectMetrics();
        }

        const healthAlerts = this.healthMonitor.getAlerts();
        const metricsAlerts = await this.metricsCollector.getAlerts();
        const totalAlerts = healthAlerts.length + metricsAlerts.length;

        res.json({
          status: health?.status || 'unknown',
          uptime: health?.uptime || 0,
          totalRequests: health?.requestCount || 0,
          errorRate: 0, // Calculate from metrics if available
          averageResponseTime: health?.responseTime || 0,
          memoryUsage: metrics?.memory?.percentage || 0,
          cpuUsage: metrics?.cpu?.usage || 0,
          databaseStatus: 'connected', // Assume connected if health check passes
          activeAlerts: totalAlerts,
          lastUpdated: new Date().toISOString(),
        });
      } catch (error) {
        res.status(500).json({ error: 'Failed to generate summary' });
      }
    });

    this.app.get('/api/status', (req, res) => {
      const latestHealth = this.healthHistory[this.healthHistory.length - 1];
      const latestMetrics = this.metricsHistory[this.metricsHistory.length - 1];
      
      res.json({
        status: latestHealth?.status || 'unknown',
        uptime: latestHealth?.uptime || 0,
        timestamp: new Date().toISOString(),
        metrics: latestMetrics ? {
          cpu: latestMetrics.cpu.usage,
          memory: latestMetrics.memory.percentage,
          responseTime: latestMetrics.application.responseTime,
          throughput: latestMetrics.application.throughput,
        } : null,
      });
    });
  }

  private addToHistory(data: SystemMetrics | HealthMetrics, type: 'metrics' | 'health'): void {
    if (type === 'metrics') {
      this.metricsHistory.push(data as SystemMetrics);
      if (this.metricsHistory.length > this.maxHistorySize) {
        this.metricsHistory = this.metricsHistory.slice(-this.maxHistorySize);
      }
    } else {
      this.healthHistory.push(data as HealthMetrics);
      if (this.healthHistory.length > this.maxHistorySize) {
        this.healthHistory = this.healthHistory.slice(-this.maxHistorySize);
      }
    }
  }

  private generateDashboardHTML(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WordWise Monitoring Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            color: #333;
        }
        
        .header {
            background: #2c3e50;
            color: white;
            padding: 1rem 2rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .header h1 {
            font-size: 1.5rem;
            font-weight: 600;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }
        
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            margin-bottom: 2rem;
        }
        
        .card {
            background: white;
            border-radius: 8px;
            padding: 1.5rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .card h3 {
            margin-bottom: 1rem;
            color: #2c3e50;
            font-size: 1.1rem;
        }
        
        .metric {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem 0;
            border-bottom: 1px solid #eee;
        }
        
        .metric:last-child {
            border-bottom: none;
        }
        
        .metric-label {
            font-weight: 500;
            color: #666;
        }
        
        .metric-value {
            font-weight: 600;
            color: #2c3e50;
        }
        
        .status {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-size: 0.875rem;
            font-weight: 500;
        }
        
        .status.healthy {
            background: #d4edda;
            color: #155724;
        }
        
        .status.degraded {
            background: #fff3cd;
            color: #856404;
        }
        
        .status.unhealthy {
            background: #f8d7da;
            color: #721c24;
        }
        
        .chart-container {
            position: relative;
            height: 300px;
            margin-top: 1rem;
        }
        
        .alert {
            background: #f8d7da;
            color: #721c24;
            padding: 1rem;
            border-radius: 4px;
            margin-bottom: 1rem;
            border-left: 4px solid #dc3545;
        }
        
        .refresh-btn {
            background: #007bff;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.875rem;
        }
        
        .refresh-btn:hover {
            background: #0056b3;
        }
        
        .timestamp {
            color: #666;
            font-size: 0.875rem;
            margin-top: 1rem;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>WordWise Monitoring Dashboard</h1>
    </div>
    
    <div class="container">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
            <h2>System Overview</h2>
            <button class="refresh-btn" onclick="refreshData()">Refresh</button>
        </div>
        
        <div id="alerts-container"></div>
        
        <div class="grid">
            <div class="card">
                <h3>System Status</h3>
                <div id="status-metrics"></div>
            </div>
            
            <div class="card">
                <h3>Performance Metrics</h3>
                <div id="performance-metrics"></div>
            </div>
            
            <div class="card">
                <h3>Database Metrics</h3>
                <div id="database-metrics"></div>
            </div>
            
            <div class="card">
                <h3>Business Metrics</h3>
                <div id="business-metrics"></div>
            </div>
        </div>
        
        <div class="grid">
            <div class="card">
                <h3>CPU Usage</h3>
                <div class="chart-container">
                    <canvas id="cpuChart"></canvas>
                </div>
            </div>
            
            <div class="card">
                <h3>Memory Usage</h3>
                <div class="chart-container">
                    <canvas id="memoryChart"></canvas>
                </div>
            </div>
            
            <div class="card">
                <h3>Response Time</h3>
                <div class="chart-container">
                    <canvas id="responseTimeChart"></canvas>
                </div>
            </div>
            
            <div class="card">
                <h3>Throughput</h3>
                <div class="chart-container">
                    <canvas id="throughputChart"></canvas>
                </div>
            </div>
        </div>
        
        <div class="timestamp" id="last-updated">
            Last updated: <span id="timestamp">Loading...</span>
        </div>
    </div>

    <script>
        let charts = {};
        let dataHistory = [];
        
        // Initialize charts
        function initCharts() {
            const chartConfig = {
                type: 'line',
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            type: 'time',
                            time: {
                                displayFormats: {
                                    minute: 'HH:mm'
                                }
                            }
                        },
                        y: {
                            beginAtZero: true
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            };
            
            charts.cpu = new Chart(document.getElementById('cpuChart'), {
                ...chartConfig,
                data: {
                    datasets: [{
                        label: 'CPU Usage %',
                        data: [],
                        borderColor: '#007bff',
                        backgroundColor: 'rgba(0, 123, 255, 0.1)',
                        tension: 0.4
                    }]
                }
            });
            
            charts.memory = new Chart(document.getElementById('memoryChart'), {
                ...chartConfig,
                data: {
                    datasets: [{
                        label: 'Memory Usage %',
                        data: [],
                        borderColor: '#28a745',
                        backgroundColor: 'rgba(40, 167, 69, 0.1)',
                        tension: 0.4
                    }]
                }
            });
            
            charts.responseTime = new Chart(document.getElementById('responseTimeChart'), {
                ...chartConfig,
                data: {
                    datasets: [{
                        label: 'Response Time (ms)',
                        data: [],
                        borderColor: '#ffc107',
                        backgroundColor: 'rgba(255, 193, 7, 0.1)',
                        tension: 0.4
                    }]
                }
            });
            
            charts.throughput = new Chart(document.getElementById('throughputChart'), {
                ...chartConfig,
                data: {
                    datasets: [{
                        label: 'Throughput (req/min)',
                        data: [],
                        borderColor: '#dc3545',
                        backgroundColor: 'rgba(220, 53, 69, 0.1)',
                        tension: 0.4
                    }]
                }
            });
        }
        
        // Update charts with new data
        function updateCharts(metrics) {
            const timestamp = new Date(metrics.timestamp);
            
            // Add new data point
            dataHistory.push({
                timestamp: timestamp,
                cpu: metrics.cpu.usage,
                memory: metrics.memory.percentage,
                responseTime: metrics.application.responseTime,
                throughput: metrics.application.throughput
            });
            
            // Keep only last 50 data points
            if (dataHistory.length > 50) {
                dataHistory = dataHistory.slice(-50);
            }
            
            // Update charts
            charts.cpu.data.datasets[0].data = dataHistory.map(d => ({
                x: d.timestamp,
                y: d.cpu
            }));
            charts.cpu.update('none');
            
            charts.memory.data.datasets[0].data = dataHistory.map(d => ({
                x: d.timestamp,
                y: d.memory
            }));
            charts.memory.update('none');
            
            charts.responseTime.data.datasets[0].data = dataHistory.map(d => ({
                x: d.timestamp,
                y: d.responseTime
            }));
            charts.responseTime.update('none');
            
            charts.throughput.data.datasets[0].data = dataHistory.map(d => ({
                x: d.timestamp,
                y: d.throughput
            }));
            charts.throughput.update('none');
        }
        
        // Update status metrics
        function updateStatusMetrics(health, metrics) {
            const statusHtml = \`
                <div class="metric">
                    <span class="metric-label">Status</span>
                    <span class="status \${health.status}">\${health.status.toUpperCase()}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Uptime</span>
                    <span class="metric-value">\${Math.floor(health.uptime / 1000 / 60)} minutes</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Database</span>
                    <span class="metric-value">\${health.databaseStatus}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Error Rate</span>
                    <span class="metric-value">\${health.errorRate.toFixed(2)}%</span>
                </div>
            \`;
            
            document.getElementById('status-metrics').innerHTML = statusHtml;
        }
        
        // Update performance metrics
        function updatePerformanceMetrics(metrics) {
            const performanceHtml = \`
                <div class="metric">
                    <span class="metric-label">CPU Usage</span>
                    <span class="metric-value">\${metrics.cpu.usage.toFixed(1)}%</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Memory Usage</span>
                    <span class="metric-value">\${metrics.memory.percentage.toFixed(1)}%</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Response Time</span>
                    <span class="metric-value">\${metrics.application.responseTime.toFixed(0)}ms</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Throughput</span>
                    <span class="metric-value">\${metrics.application.throughput.toFixed(1)} req/min</span>
                </div>
            \`;
            
            document.getElementById('performance-metrics').innerHTML = performanceHtml;
        }
        
        // Update database metrics
        function updateDatabaseMetrics(metrics) {
            const databaseHtml = \`
                <div class="metric">
                    <span class="metric-label">Connections</span>
                    <span class="metric-value">\${metrics.database.connectionCount}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Query Count</span>
                    <span class="metric-value">\${metrics.database.queryCount}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Avg Query Time</span>
                    <span class="metric-value">\${metrics.database.averageQueryTime.toFixed(2)}ms</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Slow Queries</span>
                    <span class="metric-value">\${metrics.database.slowQueries}</span>
                </div>
            \`;
            
            document.getElementById('database-metrics').innerHTML = databaseHtml;
        }
        
        // Update business metrics
        function updateBusinessMetrics(metrics) {
            const businessHtml = \`
                <div class="metric">
                    <span class="metric-label">Total Users</span>
                    <span class="metric-value">\${metrics.business.totalUsers}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Total Books</span>
                    <span class="metric-value">\${metrics.business.totalBooks}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Total Reviews</span>
                    <span class="metric-value">\${metrics.business.totalReviews}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Active Users</span>
                    <span class="metric-value">\${metrics.business.activeUsers}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">New Users Today</span>
                    <span class="metric-value">\${metrics.business.newUsersToday}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">New Reviews Today</span>
                    <span class="metric-value">\${metrics.business.newReviewsToday}</span>
                </div>
            \`;
            
            document.getElementById('business-metrics').innerHTML = businessHtml;
        }
        
        // Update alerts
        function updateAlerts(alerts) {
            const alertsContainer = document.getElementById('alerts-container');
            
            if (alerts.length === 0) {
                alertsContainer.innerHTML = '';
                return;
            }
            
            const alertsHtml = alerts.map(alert => \`
                <div class="alert">
                    <strong>\${alert}</strong>
                </div>
            \`).join('');
            
            alertsContainer.innerHTML = alertsHtml;
        }
        
        // Refresh data
        async function refreshData() {
            try {
                const [metricsResponse, healthResponse, alertsResponse] = await Promise.all([
                    fetch('/api/metrics'),
                    fetch('/api/health'),
                    fetch('/api/alerts')
                ]);
                
                const metrics = await metricsResponse.json();
                const health = await healthResponse.json();
                const alerts = await alertsResponse.json();
                
                updateStatusMetrics(health, metrics);
                updatePerformanceMetrics(metrics);
                updateDatabaseMetrics(metrics);
                updateBusinessMetrics(metrics);
                updateCharts(metrics);
                updateAlerts(alerts.alerts);
                
                document.getElementById('timestamp').textContent = new Date().toLocaleString();
            } catch (error) {
                console.error('Failed to refresh data:', error);
            }
        }
        
        // Initialize dashboard
        function init() {
            initCharts();
            refreshData();
            
            // Auto-refresh every 30 seconds
            setInterval(refreshData, 30000);
        }
        
        // Start when page loads
        document.addEventListener('DOMContentLoaded', init);
    </script>
</body>
</html>
    `;
  }

  start(port: number = 3001): void {
    this.app.listen(port, () => {
      console.log(`📊 Monitoring dashboard running on http://localhost:${port}`);
    });
  }

  getApp(): express.Application {
    return this.app;
  }
}
