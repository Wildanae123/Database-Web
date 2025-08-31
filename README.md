# Database-Web - Ghibli Food Recipe Platform

A comprehensive database management solution providing PostgreSQL administration, monitoring, backup, and security features for the Ghibli Food Recipe application ecosystem.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Project Integration](#project-integration)
- [Quick Setup Guide](#quick-setup-guide)
- [Technology Stack](#technology-stack)
- [API Documentation](#api-documentation)
- [Configuration](#configuration)
- [Integration Examples](#integration-examples)
- [Development](#development)
- [Contributing](#contributing)

---

## Overview

The **Database-Web** component serves as the data foundation and management system for the entire Ghibli Food Recipe platform. It provides a robust PostgreSQL database infrastructure with comprehensive administration tools, automated monitoring, backup systems, and security features. This service ensures data integrity, performance optimization, and seamless integration across all platform components.

This solution includes web-based administration interfaces, real-time monitoring, automated backup strategies, and advanced security measures to maintain a reliable and scalable database ecosystem.

---

## Features

### Core Features
- **Complete Database Schema** - PostgreSQL with UUID primary keys, JSONB support, and comprehensive relationships
- **Web-based Administration** - REST API and admin interface for database management
- **Real-time Monitoring** - Performance monitoring with automated alerts and reporting
- **Automated Backup & Recovery** - Multiple backup formats with restore capabilities
- **Security Management** - JWT authentication, role-based access, and SQL injection prevention

### Advanced Features
- **Migration Management** - Sequelize-based database migrations and seeding
- **Performance Optimization** - Query analysis, indexing, and connection pooling
- **Audit Trail** - Complete activity logging for all database operations
- **Multi-environment Support** - Development, staging, and production configurations
- **Health Monitoring** - Database performance metrics and alert systems

---

## Project Integration

This database service provides the data foundation for the entire Ghibli Food Recipe platform:

### 🔧 **Backend Integration** (Back-End-Web)
- **Shared Schema** - Identical database models and migration management
- **Connection Pooling** - Optimized database connections via Sequelize ORM
- **Data Validation** - Consistent data integrity across all operations
- **Performance Monitoring** - Database query optimization and slow query detection

### 🎨 **Frontend Integration** (Front-End-Web)
- **Admin Interface** - Web-based database administration panel accessible to admins
- **Data Visualization** - Database metrics and performance dashboards
- **Content Management** - Interface for managing books, users, and application data
- **Real-time Updates** - Live database status and performance monitoring

### 🤖 **ML Integration** (Machine-Learning-Web)
- **Feature Storage** - Cached computed features for fast ML model access
- **Analytics Data** - User interaction history and behavior data for model training
- **Model Persistence** - Storage for trained ML models and user preference profiles
- **Performance Metrics** - ML recommendation accuracy and feedback data storage

### 🚀 **DevOps Integration** (DevOps-Web)
- **Container Deployment** - Docker-ready database services with health checks
- **Infrastructure Monitoring** - Integration with Prometheus and monitoring stacks
- **Backup Automation** - Scheduled backup strategies integrated with CI/CD pipelines
- **Environment Management** - Database provisioning for different deployment stages

---

## Quick Setup Guide

### Prerequisites
- **Node.js 18+** and **npm**
- **PostgreSQL 15+** database server
- **Docker & Docker Compose** (optional for containerized setup)
- **Admin privileges** for database creation

### Installation Steps

1. **Clone and Install Dependencies**
   ```bash
   cd Database-Web/Ghibli-Food-Database
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   
   Configure the following variables:
   ```env
   # Database Connection
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=ghibli_food_db
   DB_USER=ghibli_api_user
   DB_PASSWORD=your_strong_password
   
   # Admin Server
   ADMIN_PORT=3001
   JWT_SECRET=your_admin_jwt_secret
   
   # Monitoring & Alerts
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   
   # Backup Configuration
   BACKUP_PATH=./backup
   BACKUP_RETENTION_DAYS=30
   ```

3. **Database Setup**
   ```bash
   # Create database
   createdb ghibli_food_db
   
   # Run migrations
   npm run migrate
   
   # Seed sample data
   npm run seed
   ```

4. **Start Services**
   ```bash
   # Admin server
   npm run admin
   
   # Monitoring service
   npm run monitor
   
   # Backup service
   npm run backup
   ```

5. **Verification**
   ```bash
   # Health check
   curl http://localhost:3001/api/database/health
   
   # Admin interface
   # Visit: http://localhost:3001
   ```

### Docker Setup
```bash
# Using integrated Docker setup
cd ../DevOps-Web/Ghibli-Food-DevOps
docker-compose up -d postgres db-admin
```

---

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **PostgreSQL** | 15+ | Primary database system |
| **Node.js** | 18+ | Admin server runtime |
| **Express.js** | 4.x | Admin API framework |
| **Sequelize** | 6.x | ORM and migration management |
| **Winston** | Latest | Logging system |
| **nodemailer** | Latest | Email notifications |
| **Docker** | Latest | Containerization |

### Database Extensions & Features
| Feature | Purpose |
|---------|---------|
| **UUID** | Primary keys for all tables |
| **JSONB** | Flexible data structures |
| **pg_trgm** | Full-text search capabilities |
| **Triggers** | Automatic timestamp and rating aggregation |
| **Indexes** | Performance optimization |

---

## API Documentation

### Database Administration API (`/api/database`)

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| GET | `/database/info` | Get database connection info | ✅ Admin |
| POST | `/database/query` | Execute safe queries | ✅ Admin |
| GET | `/database/tables/:table` | Get table structure | ✅ Admin |
| POST | `/database/backup` | Create backup | ✅ Admin |
| GET | `/database/backups` | List backups | ✅ Admin |
| POST | `/database/restore` | Restore from backup | ✅ Admin |

### Monitoring API (`/api/monitoring`)

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| GET | `/monitoring/metrics` | Current metrics | ✅ Admin |
| GET | `/monitoring/health` | System health | ❌ Public |
| GET | `/monitoring/reports` | Performance reports | ✅ Admin |
| POST | `/monitoring/alerts` | Configure alerts | ✅ Admin |

### Migration API (`/api/migrations`)

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| POST | `/migrations/run` | Run pending migrations | ✅ Admin |
| GET | `/migrations/status` | Migration status | ✅ Admin |
| POST | `/migrations/rollback` | Rollback migration | ✅ Admin |
| POST | `/migrations/seed` | Run seeders | ✅ Admin |

---

## Configuration

### Environment Variables

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ghibli_food_db
DB_USER=ghibli_api_user
DB_PASSWORD=your_strong_password

# Admin Server Configuration
ADMIN_PORT=3001
JWT_SECRET=your_admin_jwt_secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin_password

# Email Notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
ADMIN_EMAIL=admin@yourdomain.com

# Backup Configuration
BACKUP_PATH=./backup
BACKUP_RETENTION_DAYS=30
BACKUP_SCHEDULE=0 2 * * *

# Monitoring Thresholds
MAX_CONNECTION_THRESHOLD=80
SLOW_QUERY_THRESHOLD=1000
DISK_USAGE_THRESHOLD=85
```

### Database Schema Configuration
```sql
-- Key database settings
shared_preload_libraries = 'pg_stat_statements'
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
```

---

## Integration Examples

### Backend Integration
```javascript
// Database connection in Backend API
const { Sequelize } = require('sequelize')

const sequelize = new Sequelize({
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  dialect: 'postgres',
  pool: {
    max: 20,
    min: 5,
    acquire: 30000,
    idle: 10000
  },
  logging: process.env.NODE_ENV === 'development' ? console.log : false
})

// Health check integration
const healthCheck = async () => {
  try {
    await sequelize.authenticate()
    return { status: 'healthy', database: 'connected' }
  } catch (error) {
    return { status: 'unhealthy', error: error.message }
  }
}
```

### Admin Interface Integration
```javascript
// Admin API service
class DatabaseManager {
  async getTableInfo(tableName) {
    const query = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = :tableName
      ORDER BY ordinal_position
    `
    return await sequelize.query(query, {
      replacements: { tableName },
      type: QueryTypes.SELECT
    })
  }

  async createBackup(options = {}) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `ghibli_food_db_${timestamp}.sql`
    const filepath = path.join(process.env.BACKUP_PATH, filename)
    
    const command = `pg_dump ${process.env.DATABASE_URL} > ${filepath}`
    await exec(command)
    
    return { filename, filepath, size: fs.statSync(filepath).size }
  }

  async getMetrics() {
    const metrics = await sequelize.query(`
      SELECT
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_tuples,
        n_dead_tup as dead_tuples
      FROM pg_stat_user_tables
    `, { type: QueryTypes.SELECT })
    
    return metrics
  }
}
```

### Monitoring Integration
```javascript
// Performance monitoring service
class DatabaseMonitor {
  async checkHealth() {
    const connectionCount = await this.getConnectionCount()
    const slowQueries = await this.getSlowQueries()
    const diskUsage = await this.getDiskUsage()
    
    const health = {
      connections: {
        current: connectionCount,
        max: process.env.MAX_CONNECTION_THRESHOLD,
        status: connectionCount > process.env.MAX_CONNECTION_THRESHOLD ? 'warning' : 'ok'
      },
      performance: {
        slow_queries: slowQueries.length,
        status: slowQueries.length > 10 ? 'warning' : 'ok'
      },
      storage: {
        usage_percent: diskUsage,
        status: diskUsage > process.env.DISK_USAGE_THRESHOLD ? 'critical' : 'ok'
      }
    }
    
    // Send alerts if needed
    if (health.connections.status !== 'ok' || 
        health.performance.status !== 'ok' || 
        health.storage.status === 'critical') {
      await this.sendAlert(health)
    }
    
    return health
  }

  async sendAlert(healthData) {
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    })

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: process.env.ADMIN_EMAIL,
      subject: 'Database Alert - Ghibli Food Platform',
      html: this.generateAlertHtml(healthData)
    })
  }
}
```

---

## Development

### Development Scripts
```bash
# Database operations
npm run migrate          # Run pending migrations
npm run migrate:undo     # Rollback last migration
npm run seed             # Run all seeders
npm run seed:undo        # Undo all seeders
npm run db:reset         # Reset database completely

# Administration
npm run admin            # Start admin server
npm run monitor          # Start monitoring service
npm run backup           # Create manual backup
npm run restore          # Interactive restore

# Development tools
npm run dev             # Development mode with auto-reload
npm run test            # Run database tests
npm run analyze         # Analyze database performance
npm run optimize        # Optimize database performance
```

### Testing
- **Connection Tests**: Database connectivity and configuration validation
- **Migration Tests**: Schema migration integrity and rollback testing
- **Performance Tests**: Query performance and optimization validation
- **Security Tests**: Access control and injection prevention testing

### Database Schema Management
```bash
# Create new migration
npx sequelize-cli migration:generate --name add-new-feature

# Create new seeder
npx sequelize-cli seed:generate --name demo-data

# Migration status
npx sequelize-cli db:migrate:status
```

---

## Contributing

1. **Database Standards**
   - Use UUID for all primary keys
   - Include created_at and updated_at timestamps
   - Use JSONB for flexible data structures
   - Follow naming conventions (snake_case for database, camelCase for application)

2. **Migration Guidelines**
   - Always include both up and down migrations
   - Test migrations on sample data
   - Document breaking changes
   - Use transactions for complex migrations

3. **Security Practices**
   - Never commit database passwords
   - Use connection pooling
   - Validate all inputs
   - Log all administrative actions

4. **Performance Guidelines**
   - Add indexes for frequently queried columns
   - Use EXPLAIN ANALYZE for query optimization
   - Monitor slow query logs
   - Regular VACUUM and ANALYZE operations

---

**Part of the Ghibli Food Recipe Platform Ecosystem** 🍜✨