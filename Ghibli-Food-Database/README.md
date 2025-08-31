# Ghibli Food Database Management System

A comprehensive database management solution for the Ghibli Food Recipe application ecosystem, providing administration, monitoring, backup, and security features.

## Overview

This project provides database management infrastructure for the Ghibli Food Recipe platform, integrating with the Front-End-Web and Back-End-Web projects. It includes database schema management, administration tools, monitoring, automated backups, and security features.

## Features

- **Complete Database Schema**: PostgreSQL schema with UUID primary keys, JSONB support, and comprehensive relationships
- **Database Administration**: Web-based admin interface with REST API
- **Automated Monitoring**: Real-time performance monitoring with email alerts
- **Backup & Recovery**: Automated backup system with multiple formats and restore capabilities
- **Security Management**: JWT authentication, role-based access control, and SQL injection prevention
- **Migration Management**: Sequelize-based database migrations and seeding

## Project Structure

```
Ghibli-Food-Database/
├── admin/                  # Database administration server
│   ├── server.js          # Express server with admin API
│   ├── database-manager.js # Core database management class
│   └── public/            # Admin web interface
├── backup/                # Database backups storage
├── config/                # Configuration files
│   ├── database.js        # Database connection config
│   ├── security.js        # Security and authentication
│   └── logger.js          # Winston logging configuration
├── migrations/            # Sequelize database migrations
├── monitoring/           # Database monitoring system
│   └── monitoring-service.js
├── schemas/              # Database schema definitions
│   └── complete-schema.sql
├── scripts/              # Utility scripts
│   ├── backup-database.js
│   ├── restore-database.js
│   └── database-utils.js
├── seeds/                # Database seeding scripts
└── logs/                 # Application logs
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Configure the following variables:
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `JWT_SECRET` (change from default in production)
- `ADMIN_PORT` (default: 3001)
- `SMTP_*` variables for email notifications

3. Create the database:
```bash
createdb ghibli_food_db
```

4. Run migrations:
```bash
npm run migrate
```

5. Seed sample data:
```bash
npm run seed
```

## Usage

### Database Administration

Start the admin server:
```bash
npm run admin
```

Access the web interface at `http://localhost:3001`

### Database Operations

**Run Migrations**:
```bash
npm run migrate
```

**Seed Database**:
```bash
npm run seed
```

**Create Backup**:
```bash
npm run backup
```

**Restore Database**:
```bash
npm run restore
```

**Start Monitoring**:
```bash
npm run monitor
```

**Database Analysis**:
```bash
npm run analyze
```

**Database Optimization**:
```bash
npm run optimize
```

### Command Line Tools

**Interactive Backup**:
```bash
node scripts/backup-database.js
```

**Interactive Restore**:
```bash
node scripts/restore-database.js
```

**Database Utilities**:
```bash
node scripts/database-utils.js
```

## Database Schema

### Core Tables

- **users**: User accounts with roles (admin, user, guest)
- **books**: Recipe books with metadata and ingredients
- **user_books**: User library with reading status and ratings
- **categories**: Recipe categories with icons and colors
- **reviews**: User reviews and ratings for books
- **tags**: Flexible tagging system for books
- **notes**: User notes and annotations
- **recommendations**: Personalized book recommendations
- **activity_logs**: Audit trail for all user actions

### Key Features

- UUID primary keys for all tables
- JSONB columns for flexible data structures
- Full-text search with pg_trgm extension
- Automatic timestamp management with triggers
- Comprehensive indexes for performance
- Rating aggregation with database triggers

## Security Features

### Authentication & Authorization
- JWT token-based authentication
- Role-based access control (admin, user, guest)
- Secure password hashing with bcrypt
- Session management and token validation

### Rate Limiting
- General API rate limiting (100 requests/15 min)
- Strict rate limiting for sensitive endpoints (20 requests/15 min)
- Login attempt limiting (5 attempts/15 min)

### Input Validation & Security
- SQL injection prevention
- XSS protection with input sanitization
- Email and password validation
- Query safety validation
- Audit logging for security events

## Monitoring & Alerts

### Real-time Monitoring
- Database connection monitoring
- Query performance tracking
- Slow query detection
- Database size monitoring
- Lock monitoring

### Alerting System
- Email notifications for threshold breaches
- High connection usage alerts
- Slow query alerts
- Database size warnings
- Health check failures

### Reporting
- Hourly performance reports
- Daily summary reports
- Metrics history storage
- Performance trend analysis

## Backup & Recovery

### Automated Backups
- Scheduled daily backups
- Multiple backup formats (SQL, CSV)
- Compression and storage management
- Automatic cleanup of old backups

### Recovery Options
- Interactive restore from backup list
- Point-in-time recovery support
- Backup validation before restore
- Automatic restore point creation

## API Endpoints

### Database Administration API

**GET /api/database/info**
- Get database connection and table information

**POST /api/database/query**
- Execute safe database queries

**GET /api/database/tables/:table**
- Get table structure and data

**POST /api/database/backup**
- Create database backup

**GET /api/database/backups**
- List available backups

**POST /api/database/restore**
- Restore from backup

**POST /api/database/migrate**
- Run pending migrations

**GET /api/monitoring/metrics**
- Get current monitoring metrics

**GET /api/monitoring/health**
- Get system health status

## Test Data

The seeding system includes sample data featuring Ghibli Studio themes:

### Sample Users
- **Admin**: `admin@ghiblifood.com` / `admin123`
- **Chihiro**: `chihiro@spiritedaway.com` / `user123`
- **Howl**: `howl@movingcastle.com` / `user123`
- **Sophie**: `sophie@movingcastle.com` / `user123`
- **Guest**: `guest@totoro.com` / `user123`

### Sample Recipe Books
- Spirited Away Kitchen Secrets
- Howl's Moving Castle Breakfast Collection
- Totoro's Forest Feast
- Princess Mononoke Wild Game Cookbook
- Kiki's Delivery Service Bakery Treats

## Development

### Adding New Migrations
```bash
npx sequelize-cli migration:generate --name migration-name
```

### Adding New Seeders
```bash
npx sequelize-cli seed:generate --name seeder-name
```

### Testing Database Connection
```bash
node -e "require('./config/database.js').authenticate().then(() => console.log('Connected')).catch(console.error)"
```

## Integration with Main Projects

### Front-End-Web Integration
- Provides database schema information for frontend models
- Supplies seeded test data for frontend development
- Offers admin interface for content management

### Back-End-Web Integration
- Shares identical database schema and models
- Provides migration scripts for schema updates
- Offers backup/restore for development environments
- Supplies monitoring for production deployment

## Production Deployment

### Environment Setup
1. Set strong `JWT_SECRET`
2. Configure production database credentials
3. Set up SMTP for email notifications
4. Configure backup storage location
5. Set appropriate log levels

### Security Checklist
- [ ] Change default JWT secret
- [ ] Use environment variables for sensitive data
- [ ] Enable SSL for database connections
- [ ] Set up proper firewall rules
- [ ] Configure log rotation
- [ ] Set up monitoring alerts
- [ ] Test backup and restore procedures

### Performance Optimization
- Use connection pooling (configured in database.js)
- Monitor slow queries regularly
- Run VACUUM ANALYZE periodically
- Monitor database size and growth
- Optimize indexes based on query patterns

## Troubleshooting

### Common Issues

**Database Connection Failed**:
- Check database server is running
- Verify connection credentials
- Ensure database exists

**Migration Failed**:
- Check database permissions
- Verify migration files syntax
- Check for conflicting schema changes

**Backup Failed**:
- Verify pg_dump is installed and accessible
- Check filesystem permissions
- Ensure sufficient disk space

**Monitoring Not Working**:
- Check SMTP configuration for alerts
- Verify cron job permissions
- Check log files for errors

### Logs Location
- Application logs: `./logs/`
- Database logs: `./logs/database.log`
- Error logs: `./logs/error.log`
- Monitoring reports: `./monitoring/reports/`

## Contributing

1. Follow the existing code structure and naming conventions
2. Add tests for new features
3. Update documentation for any changes
4. Follow security best practices
5. Test migrations and rollbacks

## License

This project is part of the Ghibli Food Recipe application ecosystem.

## Support

For issues and questions:
1. Check the logs in `./logs/` directory
2. Review the troubleshooting section
3. Check database connectivity with test commands
4. Verify environment variable configuration