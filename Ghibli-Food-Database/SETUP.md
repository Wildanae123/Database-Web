# Ghibli Food Database Setup Guide

This guide provides step-by-step instructions for setting up the Ghibli Food Database Management System.

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn package manager

## Installation Steps

### 1. Install PostgreSQL

**Windows:**
1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Run the installer and follow the setup wizard
3. Remember the password for the `postgres` user

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Create Database User and Database

Connect to PostgreSQL as superuser:
```bash
sudo -u postgres psql
```

Create a new user and database:
```sql
CREATE USER ghibli_user WITH ENCRYPTED PASSWORD 'your_secure_password';
CREATE DATABASE ghibli_food_db OWNER ghibli_user;
GRANT ALL PRIVILEGES ON DATABASE ghibli_food_db TO ghibli_user;

-- Enable UUID extension
\c ghibli_food_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

\q
```

### 3. Clone and Setup Project

```bash
cd Database-Web
cd Ghibli-Food-Database
npm install
```

### 4. Configure Environment

Copy the example environment file:
```bash
cp .env.example .env
```

Edit the `.env` file with your settings:
```env
# Update these values
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ghibli_food_db
DB_USER=ghibli_user
DB_PASSWORD=your_secure_password

# Change this in production
JWT_SECRET=your-very-secure-jwt-secret-key

# Optional: Email configuration for alerts
SMTP_HOST=your-smtp-host
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password
ALERT_EMAIL=admin@example.com
```

### 5. Initialize Database

Run the database migrations:
```bash
npm run migrate
```

Seed with sample data:
```bash
npm run seed
```

### 6. Verify Installation

Test database connection:
```bash
npm run test:connection
```

Start the admin server:
```bash
npm run admin
```

Visit `http://localhost:3001` to access the database admin interface.

## Quick Start Commands

After installation, these are the most common commands you'll use:

```bash
# Start database admin interface
npm run admin

# Create a backup
npm run backup

# Start monitoring service
npm run monitor

# Check database health
npm run health

# View database statistics
npm run analyze
```

## Verification Steps

### 1. Database Connection Test
```bash
node -e "
const db = require('./config/database');
db.authenticate()
  .then(() => console.log('✅ Database connected successfully'))
  .catch(err => console.error('❌ Database connection failed:', err));
"
```

### 2. Check Tables Were Created
```bash
node -e "
const { QueryInterface } = require('sequelize');
const db = require('./config/database');
db.getQueryInterface().showAllTables()
  .then(tables => {
    console.log('✅ Database tables created:');
    tables.forEach(table => console.log('  -', table));
  })
  .catch(err => console.error('❌ Failed to list tables:', err));
"
```

### 3. Verify Sample Data
```bash
node -e "
const db = require('./config/database');
db.query('SELECT count(*) as user_count FROM users', { type: db.QueryTypes.SELECT })
  .then(result => console.log('✅ Sample users created:', result[0].user_count))
  .catch(err => console.error('❌ Failed to count users:', err));
"
```

### 4. Test Admin Server
```bash
# In terminal 1:
npm run admin

# In terminal 2:
curl http://localhost:3001/api/database/info
```

## Integration with Main Projects

### For Front-End-Web Integration

1. Update your frontend environment to point to the database API:
```env
REACT_APP_DB_API_URL=http://localhost:3001/api
```

2. The admin interface provides endpoints for:
   - User management
   - Book catalog management
   - Category management
   - Review and rating data

### For Back-End-Web Integration

1. Ensure your backend uses the same database configuration:
```javascript
// In your backend config/database.js
module.exports = {
  development: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'ghibli_food_db',
    username: process.env.DB_USER || 'ghibli_user',
    password: process.env.DB_PASSWORD,
    dialect: 'postgres',
    logging: false
  }
};
```

2. Use the same UUID-based models and relationships defined in the schema.

## Development Workflow

### Making Schema Changes

1. Create a new migration:
```bash
npx sequelize-cli migration:generate --name add-new-feature
```

2. Edit the migration file in `migrations/`

3. Run the migration:
```bash
npm run migrate
```

4. Update the complete schema file if needed:
```bash
pg_dump -s ghibli_food_db > schemas/complete-schema.sql
```

### Adding Test Data

1. Create a new seed file:
```bash
npx sequelize-cli seed:generate --name add-test-data
```

2. Edit the seed file in `seeds/`

3. Run the seeder:
```bash
npm run seed
```

### Monitoring in Development

Start the monitoring service:
```bash
npm run monitor
```

This will collect metrics and provide alerts for:
- Database performance
- Connection usage
- Slow queries
- System health

## Production Setup

### 1. Environment Hardening

Update your production `.env`:
```env
NODE_ENV=production
JWT_SECRET=your-very-strong-production-jwt-secret
DB_PASSWORD=your-strong-database-password

# Enable email alerts
SMTP_HOST=your-production-smtp
ALERT_EMAIL=your-admin-email@company.com
```

### 2. Database Security

Connect to your production database and run:
```sql
-- Create read-only user for monitoring
CREATE USER monitor_user WITH ENCRYPTED PASSWORD 'monitor_password';
GRANT CONNECT ON DATABASE ghibli_food_db TO monitor_user;
GRANT USAGE ON SCHEMA public TO monitor_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO monitor_user;

-- Create backup user
CREATE USER backup_user WITH ENCRYPTED PASSWORD 'backup_password';
GRANT CONNECT ON DATABASE ghibli_food_db TO backup_user;
GRANT USAGE ON SCHEMA public TO backup_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup_user;
```

### 3. Setup Automated Backups

Add to your system crontab:
```bash
# Daily backup at 2 AM
0 2 * * * cd /path/to/Ghibli-Food-Database && npm run backup >> /var/log/ghibli-db-backup.log 2>&1

# Weekly optimization at 3 AM Sunday
0 3 * * 0 cd /path/to/Ghibli-Food-Database && npm run optimize >> /var/log/ghibli-db-optimize.log 2>&1
```

### 4. Process Management

Use PM2 for production process management:
```bash
npm install -g pm2

# Start admin server
pm2 start admin/server.js --name ghibli-db-admin

# Start monitoring service
pm2 start monitoring/monitoring-service.js --name ghibli-db-monitor

# Save PM2 configuration
pm2 save
pm2 startup
```

## Troubleshooting

### Common Issues

**"database does not exist"**
```bash
createdb ghibli_food_db -O ghibli_user
```

**"permission denied for database"**
```sql
GRANT ALL PRIVILEGES ON DATABASE ghibli_food_db TO ghibli_user;
```

**"relation does not exist"**
```bash
npm run migrate
```

**"pg_dump: command not found"**
- Ensure PostgreSQL client tools are installed and in PATH

**Admin server won't start**
- Check if port 3001 is available
- Verify database connection in logs

### Logs and Debugging

Check log files:
```bash
# Application logs
tail -f logs/combined.log

# Database logs
tail -f logs/database.log

# Error logs
tail -f logs/error.log
```

Enable debug logging:
```env
LOG_LEVEL=debug
```

### Getting Help

1. Check the main README.md for detailed documentation
2. Review log files in the `logs/` directory
3. Test database connectivity with provided scripts
4. Verify environment variables are correctly set

## Next Steps

After successful setup:

1. **Explore the Admin Interface**: Visit `http://localhost:3001` to explore database management features
2. **Set up Monitoring**: Configure email alerts for production monitoring
3. **Create Your First Backup**: Run `npm run backup` to test backup functionality
4. **Integrate with Your Applications**: Update your Front-End-Web and Back-End-Web projects to use this database
5. **Review Security**: Ensure all production security measures are in place