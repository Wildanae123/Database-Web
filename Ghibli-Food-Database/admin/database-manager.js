const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const archiver = require('archiver');
const unzipper = require('unzipper');
const logger = require('../config/logger');

class DatabaseManager {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'ghibli_food_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async testConnection() {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      logger.info('Database connection successful');
      return true;
    } catch (error) {
      logger.error('Database connection failed:', error);
      throw error;
    }
  }

  async getDatabaseInfo() {
    const client = await this.pool.connect();
    try {
      const queries = {
        version: 'SELECT version()',
        size: `
          SELECT pg_size_pretty(pg_database_size(current_database())) as size
        `,
        connections: `
          SELECT count(*) as active_connections
          FROM pg_stat_activity 
          WHERE state = 'active'
        `,
        tables: `
          SELECT count(*) as table_count
          FROM information_schema.tables 
          WHERE table_schema = 'public'
        `
      };

      const results = {};
      for (const [key, query] of Object.entries(queries)) {
        const result = await client.query(query);
        results[key] = result.rows[0];
      }

      return {
        database: process.env.DB_NAME,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        ...results,
        timestamp: new Date().toISOString()
      };
    } finally {
      client.release();
    }
  }

  async getTableStatistics() {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT 
          schemaname,
          tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          n_live_tup as live_rows,
          n_dead_tup as dead_rows,
          last_vacuum,
          last_autovacuum,
          last_analyze,
          last_autoanalyze,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
        FROM pg_stat_user_tables
        ORDER BY n_live_tup DESC;
      `;

      const result = await client.query(query);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async executeQuery(query, params = []) {
    const client = await this.pool.connect();
    try {
      const start = Date.now();
      const result = await client.query(query, params);
      const duration = Date.now() - start;

      return {
        rows: result.rows,
        rowCount: result.rowCount,
        duration,
        query: query.substring(0, 100) + (query.length > 100 ? '...' : '')
      };
    } finally {
      client.release();
    }
  }

  async createBackup(tables = [], format = 'sql') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, '../backup');
    
    // Ensure backup directory exists
    await fs.mkdir(backupDir, { recursive: true });

    const backupPath = path.join(backupDir, `backup-${timestamp}.${format === 'csv' ? 'zip' : 'sql'}`);

    try {
      if (format === 'sql') {
        await this.createSQLBackup(backupPath, tables);
      } else if (format === 'csv') {
        await this.createCSVBackup(backupPath, tables);
      } else {
        throw new Error('Unsupported backup format. Use "sql" or "csv"');
      }

      logger.info(`Backup created: ${backupPath}`);
      return backupPath;
    } catch (error) {
      logger.error('Backup creation failed:', error);
      throw error;
    }
  }

  async createSQLBackup(backupPath, tables) {
    return new Promise((resolve, reject) => {
      const pgDumpArgs = [
        '-h', process.env.DB_HOST || 'localhost',
        '-p', process.env.DB_PORT || '5432',
        '-U', process.env.DB_USER || 'postgres',
        '-d', process.env.DB_NAME || 'ghibli_food_db',
        '--no-password',
        '--verbose',
        '--clean',
        '--if-exists',
        '--format=plain',
        '--file=' + backupPath
      ];

      // Add specific tables if provided
      if (tables && tables.length > 0) {
        tables.forEach(table => {
          pgDumpArgs.push('-t', table);
        });
      }

      const pgDump = spawn('pg_dump', pgDumpArgs, {
        env: {
          ...process.env,
          PGPASSWORD: process.env.DB_PASSWORD
        }
      });

      pgDump.stderr.on('data', (data) => {
        logger.info(`pg_dump: ${data}`);
      });

      pgDump.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`pg_dump exited with code ${code}`));
        }
      });

      pgDump.on('error', (error) => {
        reject(error);
      });
    });
  }

  async createCSVBackup(backupPath, tables) {
    const client = await this.pool.connect();
    try {
      // Get all tables if none specified
      if (!tables || tables.length === 0) {
        const result = await client.query(`
          SELECT tablename 
          FROM pg_tables 
          WHERE schemaname = 'public'
        `);
        tables = result.rows.map(row => row.tablename);
      }

      const archive = archiver('zip', { zlib: { level: 9 } });
      const output = require('fs').createWriteStream(backupPath);

      archive.pipe(output);

      for (const table of tables) {
        const query = `COPY ${table} TO STDOUT WITH CSV HEADER`;
        const stream = client.query(require('pg-copy-streams').to(query));
        
        archive.append(stream, { name: `${table}.csv` });
      }

      await archive.finalize();

      return new Promise((resolve, reject) => {
        output.on('close', resolve);
        output.on('error', reject);
      });
    } finally {
      client.release();
    }
  }

  async restoreBackup(backupPath) {
    const ext = path.extname(backupPath);
    
    if (ext === '.sql') {
      await this.restoreSQLBackup(backupPath);
    } else if (ext === '.zip') {
      await this.restoreCSVBackup(backupPath);
    } else {
      throw new Error('Unsupported backup file format');
    }

    logger.info(`Backup restored from: ${backupPath}`);
  }

  async restoreSQLBackup(backupPath) {
    return new Promise((resolve, reject) => {
      const psqlArgs = [
        '-h', process.env.DB_HOST || 'localhost',
        '-p', process.env.DB_PORT || '5432',
        '-U', process.env.DB_USER || 'postgres',
        '-d', process.env.DB_NAME || 'ghibli_food_db',
        '--no-password',
        '-f', backupPath
      ];

      const psql = spawn('psql', psqlArgs, {
        env: {
          ...process.env,
          PGPASSWORD: process.env.DB_PASSWORD
        }
      });

      psql.stderr.on('data', (data) => {
        logger.info(`psql: ${data}`);
      });

      psql.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`psql exited with code ${code}`));
        }
      });

      psql.on('error', (error) => {
        reject(error);
      });
    });
  }

  async restoreCSVBackup(backupPath) {
    // Implementation for CSV restore
    // This would involve unzipping and using COPY FROM for each CSV file
    throw new Error('CSV restore not implemented yet');
  }

  async getMigrationStatus() {
    const client = await this.pool.connect();
    try {
      // Check if migrations table exists
      const tableExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'schema_migrations'
        );
      `);

      if (!tableExists.rows[0].exists) {
        return { status: 'No migrations table found' };
      }

      const applied = await client.query('SELECT * FROM schema_migrations ORDER BY applied_at DESC');
      return {
        appliedMigrations: applied.rows,
        lastMigration: applied.rows[0] || null
      };
    } finally {
      client.release();
    }
  }

  async runMigrations(direction = 'up', steps) {
    // This would integrate with Sequelize CLI or custom migration runner
    const { exec } = require('child_process');
    
    return new Promise((resolve, reject) => {
      let command = `npx sequelize-cli db:migrate`;
      
      if (direction === 'down') {
        command = steps ? 
          `npx sequelize-cli db:migrate:undo --to ${steps}` :
          `npx sequelize-cli db:migrate:undo`;
      }

      exec(command, { cwd: path.join(__dirname, '..') }, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  }

  async optimizeDatabase() {
    const client = await this.pool.connect();
    try {
      const results = [];

      // Vacuum and analyze all tables
      const tables = await client.query(`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
      `);

      for (const table of tables.rows) {
        await client.query(`VACUUM ANALYZE ${table.tablename}`);
        results.push(`Optimized table: ${table.tablename}`);
      }

      // Update statistics
      await client.query('ANALYZE');
      results.push('Updated database statistics');

      return {
        success: true,
        results,
        timestamp: new Date().toISOString()
      };
    } finally {
      client.release();
    }
  }

  async getUserStatistics() {
    const client = await this.pool.connect();
    try {
      const queries = {
        totalUsers: 'SELECT COUNT(*) as count FROM users',
        activeUsers: 'SELECT COUNT(*) as count FROM users WHERE is_active = true',
        adminUsers: 'SELECT COUNT(*) as count FROM users WHERE role = \'admin\'',
        recentUsers: `
          SELECT COUNT(*) as count 
          FROM users 
          WHERE created_at >= NOW() - INTERVAL '30 days'
        `,
        usersByRole: `
          SELECT role, COUNT(*) as count 
          FROM users 
          GROUP BY role 
          ORDER BY count DESC
        `
      };

      const results = {};
      for (const [key, query] of Object.entries(queries)) {
        const result = await client.query(query);
        results[key] = key === 'usersByRole' ? result.rows : result.rows[0];
      }

      return results;
    } finally {
      client.release();
    }
  }

  async getAnalyticsSummary() {
    const client = await this.pool.connect();
    try {
      const summary = {};

      // Books statistics
      const booksStats = await client.query(`
        SELECT 
          COUNT(*) as total_books,
          COUNT(CASE WHEN visibility = true THEN 1 END) as visible_books,
          AVG(average_rating) as avg_rating,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as books_this_week
        FROM books
      `);
      summary.books = booksStats.rows[0];

      // User library statistics
      const libraryStats = await client.query(`
        SELECT 
          COUNT(*) as total_entries,
          COUNT(CASE WHEN status = 'read' THEN 1 END) as books_read,
          COUNT(CASE WHEN status = 'reading' THEN 1 END) as books_reading,
          AVG(rating) as avg_user_rating
        FROM user_books
      `);
      summary.library = libraryStats.rows[0];

      // Popular genres
      const genreStats = await client.query(`
        SELECT 
          genre, 
          COUNT(*) as count,
          AVG(average_rating) as avg_rating
        FROM books 
        WHERE visibility = true 
        GROUP BY genre 
        ORDER BY count DESC 
        LIMIT 10
      `);
      summary.popularGenres = genreStats.rows;

      return summary;
    } finally {
      client.release();
    }
  }

  async close() {
    await this.pool.end();
  }
}

module.exports = DatabaseManager;