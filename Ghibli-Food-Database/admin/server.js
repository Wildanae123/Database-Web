const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const DatabaseManager = require('./database-manager');
const MonitoringService = require('../monitoring/monitoring-service');
const logger = require('../config/logger');

class DatabaseAdminServer {
  constructor() {
    this.app = express();
    this.port = process.env.DB_ADMIN_PORT || 3002;
    this.dbManager = new DatabaseManager();
    this.monitoring = new MonitoringService();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
          scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP'
    });
    this.app.use(limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Serve static files
    this.app.use('/static', express.static(path.join(__dirname, 'static')));
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'ghibli-food-database-admin',
        timestamp: new Date().toISOString()
      });
    });

    // Database info
    this.app.get('/api/database/info', async (req, res) => {
      try {
        const info = await this.dbManager.getDatabaseInfo();
        res.json(info);
      } catch (error) {
        logger.error('Error getting database info:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Table statistics
    this.app.get('/api/database/tables', async (req, res) => {
      try {
        const tables = await this.dbManager.getTableStatistics();
        res.json(tables);
      } catch (error) {
        logger.error('Error getting table statistics:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Query execution
    this.app.post('/api/database/query', async (req, res) => {
      try {
        const { query, params } = req.body;
        
        // Basic SQL injection protection
        if (!this.isQuerySafe(query)) {
          return res.status(400).json({ error: 'Unsafe query detected' });
        }

        const result = await this.dbManager.executeQuery(query, params);
        res.json(result);
      } catch (error) {
        logger.error('Error executing query:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Backup operations
    this.app.post('/api/database/backup', async (req, res) => {
      try {
        const { tables, format = 'sql' } = req.body;
        const backupPath = await this.dbManager.createBackup(tables, format);
        res.json({ 
          success: true, 
          backupPath,
          message: 'Backup created successfully' 
        });
      } catch (error) {
        logger.error('Error creating backup:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Restore operations
    this.app.post('/api/database/restore', async (req, res) => {
      try {
        const { backupPath } = req.body;
        await this.dbManager.restoreBackup(backupPath);
        res.json({ 
          success: true, 
          message: 'Database restored successfully' 
        });
      } catch (error) {
        logger.error('Error restoring backup:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Migration operations
    this.app.get('/api/database/migrations', async (req, res) => {
      try {
        const migrations = await this.dbManager.getMigrationStatus();
        res.json(migrations);
      } catch (error) {
        logger.error('Error getting migration status:', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/database/migrate', async (req, res) => {
      try {
        const { direction = 'up', steps } = req.body;
        const result = await this.dbManager.runMigrations(direction, steps);
        res.json(result);
      } catch (error) {
        logger.error('Error running migrations:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Database optimization
    this.app.post('/api/database/optimize', async (req, res) => {
      try {
        const result = await this.dbManager.optimizeDatabase();
        res.json(result);
      } catch (error) {
        logger.error('Error optimizing database:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Monitoring endpoints
    this.app.get('/api/monitoring/metrics', async (req, res) => {
      try {
        const metrics = await this.monitoring.getMetrics();
        res.json(metrics);
      } catch (error) {
        logger.error('Error getting metrics:', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/monitoring/performance', async (req, res) => {
      try {
        const performance = await this.monitoring.getPerformanceMetrics();
        res.json(performance);
      } catch (error) {
        logger.error('Error getting performance metrics:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // User management
    this.app.get('/api/users/stats', async (req, res) => {
      try {
        const stats = await this.dbManager.getUserStatistics();
        res.json(stats);
      } catch (error) {
        logger.error('Error getting user stats:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Data analysis
    this.app.get('/api/analytics/summary', async (req, res) => {
      try {
        const summary = await this.dbManager.getAnalyticsSummary();
        res.json(summary);
      } catch (error) {
        logger.error('Error getting analytics summary:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Serve admin interface
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'static', 'index.html'));
    });
  }

  setupErrorHandling() {
    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({ error: 'Route not found' });
    });

    // Global error handler
    this.app.use((error, req, res, next) => {
      logger.error('Unhandled error:', error);
      res.status(500).json({
        error: process.env.NODE_ENV === 'production' 
          ? 'Internal server error' 
          : error.message
      });
    });
  }

  isQuerySafe(query) {
    const dangerousPatterns = [
      /drop\s+table/i,
      /drop\s+database/i,
      /truncate/i,
      /alter\s+table.*drop/i,
      /delete\s+from\s+(?!.*where)/i, // DELETE without WHERE
      /update\s+.*set\s+(?!.*where)/i, // UPDATE without WHERE
    ];

    // Allow only SELECT, INSERT, UPDATE (with WHERE), and safe operations
    const allowedPatterns = [
      /^\s*select/i,
      /^\s*insert/i,
      /^\s*update.*where/i,
      /^\s*with/i, // CTE queries
      /^\s*explain/i,
    ];

    // Check for dangerous patterns
    if (dangerousPatterns.some(pattern => pattern.test(query))) {
      return false;
    }

    // Check for allowed patterns
    return allowedPatterns.some(pattern => pattern.test(query));
  }

  async start() {
    try {
      // Test database connection
      await this.dbManager.testConnection();
      
      // Start monitoring
      this.monitoring.start();

      // Start server
      this.server = this.app.listen(this.port, () => {
        logger.info(`Database Admin Server running on port ${this.port}`);
        console.log(`🗄️  Database Admin Interface: http://localhost:${this.port}`);
        console.log(`📊 API Endpoints available at: http://localhost:${this.port}/api`);
      });
    } catch (error) {
      logger.error('Failed to start Database Admin Server:', error);
      process.exit(1);
    }
  }

  async stop() {
    if (this.server) {
      this.server.close();
      this.monitoring.stop();
      logger.info('Database Admin Server stopped');
    }
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  if (global.dbAdminServer) {
    await global.dbAdminServer.stop();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  if (global.dbAdminServer) {
    await global.dbAdminServer.stop();
  }
  process.exit(0);
});

// Start server if this file is run directly
if (require.main === module) {
  const server = new DatabaseAdminServer();
  global.dbAdminServer = server;
  server.start().catch(error => {
    logger.error('Failed to start server:', error);
    process.exit(1);
  });
}

module.exports = DatabaseAdminServer;