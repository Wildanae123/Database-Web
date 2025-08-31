const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const logger = require('../config/logger');

class MonitoringService {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'ghibli_food_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      max: 5, // Lower connection limit for monitoring
    });

    this.metrics = {
      connections: 0,
      queries: 0,
      slowQueries: 0,
      errors: 0,
      uptime: Date.now()
    };

    this.alertThresholds = {
      maxConnections: parseInt(process.env.MAX_CONNECTIONS_ALERT) || 80,
      slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD) || 1000, // ms
      diskUsageThreshold: parseInt(process.env.DISK_USAGE_ALERT) || 85, // percentage
      errorRate: parseInt(process.env.ERROR_RATE_ALERT) || 10 // per minute
    };

    this.alertHistory = [];
    this.setupEmailNotifications();
  }

  setupEmailNotifications() {
    if (process.env.SMTP_HOST) {
      this.emailTransporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    }
  }

  async start() {
    logger.info('Starting database monitoring service');

    // Schedule monitoring tasks
    cron.schedule('*/1 * * * *', () => this.collectMetrics()); // Every minute
    cron.schedule('*/5 * * * *', () => this.checkHealth()); // Every 5 minutes
    cron.schedule('0 */1 * * *', () => this.generateHourlyReport()); // Every hour
    cron.schedule('0 0 * * *', () => this.generateDailyReport()); // Daily at midnight

    // Initial health check
    await this.checkHealth();
  }

  async collectMetrics() {
    const client = await this.pool.connect();
    try {
      // Connection metrics
      const connectionResult = await client.query(`
        SELECT count(*) as active_connections,
               count(case when state = 'idle' then 1 end) as idle_connections,
               count(case when state = 'active' then 1 end) as active_queries
        FROM pg_stat_activity
        WHERE datname = current_database()
      `);

      // Performance metrics
      const performanceResult = await client.query(`
        SELECT 
          sum(calls) as total_queries,
          sum(total_time) as total_query_time,
          sum(case when mean_time > ${this.alertThresholds.slowQueryThreshold} then calls else 0 end) as slow_queries
        FROM pg_stat_statements
        WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
      `);

      // Database size
      const sizeResult = await client.query(`
        SELECT pg_database_size(current_database()) as db_size
      `);

      // Lock information
      const lockResult = await client.query(`
        SELECT mode, count(*) as lock_count
        FROM pg_locks
        WHERE database = (SELECT oid FROM pg_database WHERE datname = current_database())
        GROUP BY mode
      `);

      const timestamp = Date.now();
      const metrics = {
        timestamp,
        connections: connectionResult.rows[0],
        performance: performanceResult.rows[0] || { total_queries: 0, total_query_time: 0, slow_queries: 0 },
        size: sizeResult.rows[0],
        locks: lockResult.rows
      };

      // Store metrics
      await this.storeMetrics(metrics);

      // Check for alerts
      await this.checkAlerts(metrics);

      this.metrics.lastCollection = timestamp;

    } catch (error) {
      logger.error('Error collecting metrics:', error);
      this.metrics.errors++;
    } finally {
      client.release();
    }
  }

  async storeMetrics(metrics) {
    // Store metrics in a JSON file (could be database or time-series DB in production)
    const metricsFile = path.join(__dirname, 'metrics.json');
    
    try {
      let existingMetrics = [];
      try {
        const data = await fs.readFile(metricsFile, 'utf8');
        existingMetrics = JSON.parse(data);
      } catch (error) {
        // File doesn't exist yet, that's okay
      }

      existingMetrics.push(metrics);

      // Keep only last 1000 entries
      if (existingMetrics.length > 1000) {
        existingMetrics = existingMetrics.slice(-1000);
      }

      await fs.writeFile(metricsFile, JSON.stringify(existingMetrics, null, 2));

    } catch (error) {
      logger.error('Error storing metrics:', error);
    }
  }

  async checkHealth() {
    const client = await this.pool.connect();
    try {
      const healthChecks = [];

      // Database connectivity
      const connectivityResult = await client.query('SELECT 1');
      healthChecks.push({
        name: 'database_connectivity',
        status: connectivityResult.rows.length > 0 ? 'healthy' : 'unhealthy',
        timestamp: Date.now()
      });

      // Table accessibility
      const tablesResult = await client.query(`
        SELECT count(*) as table_count
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      healthChecks.push({
        name: 'table_accessibility',
        status: tablesResult.rows[0].table_count > 0 ? 'healthy' : 'unhealthy',
        details: `${tablesResult.rows[0].table_count} tables found`,
        timestamp: Date.now()
      });

      // Disk space check
      const diskResult = await client.query(`
        SELECT 
          pg_size_pretty(pg_database_size(current_database())) as size,
          pg_database_size(current_database()) as size_bytes
      `);

      // Check for replication lag (if using replication)
      try {
        const replicationResult = await client.query(`
          SELECT 
            client_addr,
            state,
            pg_wal_lsn_diff(pg_current_wal_lsn(), flush_lsn) AS lag_bytes
          FROM pg_stat_replication
        `);
        
        healthChecks.push({
          name: 'replication_status',
          status: 'healthy',
          details: `${replicationResult.rows.length} replicas`,
          timestamp: Date.now()
        });
      } catch (error) {
        // Replication not configured, that's okay
      }

      // Store health check results
      await this.storeHealthChecks(healthChecks);

      const unhealthyChecks = healthChecks.filter(check => check.status === 'unhealthy');
      if (unhealthyChecks.length > 0) {
        await this.sendAlert('Health Check Failed', unhealthyChecks);
      }

    } catch (error) {
      logger.error('Health check failed:', error);
      await this.sendAlert('Health Check Error', [{ error: error.message }]);
    } finally {
      client.release();
    }
  }

  async checkAlerts(metrics) {
    const alerts = [];

    // High connection count
    const connectionUsage = (metrics.connections.active_connections / 100) * 100;
    if (connectionUsage > this.alertThresholds.maxConnections) {
      alerts.push({
        type: 'high_connection_usage',
        level: 'warning',
        message: `High connection usage: ${connectionUsage.toFixed(1)}%`,
        value: connectionUsage,
        threshold: this.alertThresholds.maxConnections
      });
    }

    // Slow queries
    if (metrics.performance.slow_queries > 0) {
      alerts.push({
        type: 'slow_queries',
        level: 'warning',
        message: `${metrics.performance.slow_queries} slow queries detected`,
        value: metrics.performance.slow_queries
      });
    }

    // Large database size (if over 1GB, warn)
    const dbSizeGB = metrics.size.db_size / (1024 * 1024 * 1024);
    if (dbSizeGB > 1) {
      alerts.push({
        type: 'large_database',
        level: 'info',
        message: `Database size: ${dbSizeGB.toFixed(2)} GB`,
        value: dbSizeGB
      });
    }

    // Process alerts
    for (const alert of alerts) {
      await this.processAlert(alert);
    }
  }

  async processAlert(alert) {
    const alertKey = `${alert.type}_${alert.level}`;
    const now = Date.now();
    
    // Check if we've already sent this alert recently (within last hour)
    const recentAlert = this.alertHistory.find(
      a => a.key === alertKey && (now - a.timestamp) < 3600000
    );

    if (!recentAlert) {
      await this.sendAlert(alert.type, alert);
      this.alertHistory.push({
        key: alertKey,
        timestamp: now,
        alert
      });

      // Keep alert history clean (last 100 alerts)
      if (this.alertHistory.length > 100) {
        this.alertHistory = this.alertHistory.slice(-100);
      }
    }
  }

  async sendAlert(title, details) {
    logger.warn(`ALERT: ${title}`, details);

    // Send email alert if configured
    if (this.emailTransporter && process.env.ALERT_EMAIL) {
      try {
        await this.emailTransporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: process.env.ALERT_EMAIL,
          subject: `Database Alert: ${title}`,
          html: `
            <h2>Database Alert: ${title}</h2>
            <p><strong>Database:</strong> ${process.env.DB_NAME}</p>
            <p><strong>Host:</strong> ${process.env.DB_HOST}</p>
            <p><strong>Time:</strong> ${new Date().toISOString()}</p>
            <h3>Details:</h3>
            <pre>${JSON.stringify(details, null, 2)}</pre>
          `
        });
        logger.info(`Alert email sent: ${title}`);
      } catch (error) {
        logger.error('Failed to send alert email:', error);
      }
    }
  }

  async storeHealthChecks(healthChecks) {
    const healthFile = path.join(__dirname, 'health-checks.json');
    
    try {
      let existingChecks = [];
      try {
        const data = await fs.readFile(healthFile, 'utf8');
        existingChecks = JSON.parse(data);
      } catch (error) {
        // File doesn't exist yet
      }

      existingChecks.push({
        timestamp: Date.now(),
        checks: healthChecks
      });

      // Keep only last 100 health check runs
      if (existingChecks.length > 100) {
        existingChecks = existingChecks.slice(-100);
      }

      await fs.writeFile(healthFile, JSON.stringify(existingChecks, null, 2));

    } catch (error) {
      logger.error('Error storing health checks:', error);
    }
  }

  async generateHourlyReport() {
    try {
      const report = await this.generatePerformanceReport('hour');
      logger.info('Hourly performance report:', report);
      
      // Store report
      const reportFile = path.join(__dirname, `reports/hourly-${new Date().toISOString().split('T')[0]}.json`);
      await fs.mkdir(path.dirname(reportFile), { recursive: true });
      await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
      
    } catch (error) {
      logger.error('Error generating hourly report:', error);
    }
  }

  async generateDailyReport() {
    try {
      const report = await this.generatePerformanceReport('day');
      
      // Send daily report email
      if (this.emailTransporter && process.env.REPORT_EMAIL) {
        await this.emailTransporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: process.env.REPORT_EMAIL,
          subject: `Daily Database Report - ${new Date().toISOString().split('T')[0]}`,
          html: `
            <h2>Daily Database Performance Report</h2>
            <p><strong>Database:</strong> ${process.env.DB_NAME}</p>
            <p><strong>Date:</strong> ${new Date().toISOString().split('T')[0]}</p>
            <h3>Summary:</h3>
            <ul>
              <li>Average Connections: ${report.avgConnections}</li>
              <li>Total Queries: ${report.totalQueries}</li>
              <li>Slow Queries: ${report.slowQueries}</li>
              <li>Database Size: ${report.databaseSize}</li>
            </ul>
            <h3>Full Report:</h3>
            <pre>${JSON.stringify(report, null, 2)}</pre>
          `
        });
      }
      
    } catch (error) {
      logger.error('Error generating daily report:', error);
    }
  }

  async generatePerformanceReport(period = 'hour') {
    const client = await this.pool.connect();
    try {
      const timeFilter = period === 'hour' ? '1 hour' : '1 day';
      
      // Get performance statistics
      const statsResult = await client.query(`
        SELECT 
          count(*) as total_connections,
          avg(extract(epoch from now() - query_start)) as avg_query_duration,
          count(case when state = 'active' then 1 end) as active_queries
        FROM pg_stat_activity
        WHERE datname = current_database()
      `);

      // Get database size
      const sizeResult = await client.query(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `);

      // Get table statistics
      const tableStatsResult = await client.query(`
        SELECT 
          schemaname,
          tablename,
          n_tup_ins + n_tup_upd + n_tup_del as total_operations,
          n_live_tup as live_tuples
        FROM pg_stat_user_tables
        ORDER BY total_operations DESC
        LIMIT 10
      `);

      return {
        period,
        timestamp: new Date().toISOString(),
        avgConnections: parseFloat(statsResult.rows[0].total_connections || 0),
        avgQueryDuration: parseFloat(statsResult.rows[0].avg_query_duration || 0),
        activeQueries: parseInt(statsResult.rows[0].active_queries || 0),
        databaseSize: sizeResult.rows[0].size,
        topTables: tableStatsResult.rows,
        uptime: Date.now() - this.metrics.uptime
      };
      
    } finally {
      client.release();
    }
  }

  async getMetrics() {
    try {
      const metricsFile = path.join(__dirname, 'metrics.json');
      const data = await fs.readFile(metricsFile, 'utf8');
      const metrics = JSON.parse(data);
      
      return {
        current: this.metrics,
        history: metrics.slice(-100), // Last 100 entries
        summary: this.generateMetricsSummary(metrics)
      };
    } catch (error) {
      return {
        current: this.metrics,
        history: [],
        summary: {}
      };
    }
  }

  generateMetricsSummary(metrics) {
    if (metrics.length === 0) return {};

    const latest = metrics[metrics.length - 1];
    return {
      currentConnections: latest.connections.active_connections,
      avgConnections: metrics.reduce((sum, m) => sum + (m.connections.active_connections || 0), 0) / metrics.length,
      totalQueries: latest.performance.total_queries || 0,
      slowQueries: latest.performance.slow_queries || 0,
      databaseSize: latest.size.db_size
    };
  }

  async getPerformanceMetrics() {
    return this.generatePerformanceReport('hour');
  }

  stop() {
    logger.info('Stopping database monitoring service');
    // Cron jobs will be automatically cleared when process exits
  }
}

module.exports = MonitoringService;