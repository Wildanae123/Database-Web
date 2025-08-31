#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { program } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const DatabaseManager = require('../admin/database-manager');

program
  .name('backup-database')
  .description('Create database backups for Ghibli Food Database')
  .version('1.0.0')
  .option('-f, --format <format>', 'backup format (sql|csv)', 'sql')
  .option('-t, --tables <tables...>', 'specific tables to backup')
  .option('-o, --output <path>', 'output directory', './backup')
  .option('-c, --compress', 'compress backup file')
  .option('--schedule <cron>', 'schedule automatic backups (cron expression)')
  .parse();

const options = program.opts();

class BackupManager {
  constructor() {
    this.dbManager = new DatabaseManager();
    this.backupDir = path.resolve(options.output);
  }

  async ensureBackupDirectory() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      console.log(chalk.green(`✓ Backup directory ready: ${this.backupDir}`));
    } catch (error) {
      console.error(chalk.red(`Failed to create backup directory: ${error.message}`));
      process.exit(1);
    }
  }

  async createBackup() {
    const spinner = ora('Creating database backup...').start();
    
    try {
      await this.dbManager.testConnection();
      spinner.text = 'Database connected, starting backup...';

      const backupPath = await this.dbManager.createBackup(options.tables, options.format);
      
      if (options.compress && options.format === 'sql') {
        spinner.text = 'Compressing backup...';
        await this.compressBackup(backupPath);
      }

      spinner.succeed(chalk.green(`Backup created successfully: ${backupPath}`));
      
      // Show backup details
      const stats = await fs.stat(backupPath);
      console.log(chalk.blue(`Size: ${this.formatBytes(stats.size)}`));
      console.log(chalk.blue(`Created: ${stats.birthtime.toISOString()}`));
      
      return backupPath;
    } catch (error) {
      spinner.fail(chalk.red(`Backup failed: ${error.message}`));
      throw error;
    }
  }

  async compressBackup(backupPath) {
    const zlib = require('zlib');
    const { createReadStream, createWriteStream } = require('fs');
    
    const compressedPath = backupPath + '.gz';
    
    return new Promise((resolve, reject) => {
      const readStream = createReadStream(backupPath);
      const writeStream = createWriteStream(compressedPath);
      const gzip = zlib.createGzip();

      readStream
        .pipe(gzip)
        .pipe(writeStream)
        .on('finish', async () => {
          // Remove original file
          await fs.unlink(backupPath);
          console.log(chalk.green(`Backup compressed: ${compressedPath}`));
          resolve(compressedPath);
        })
        .on('error', reject);
    });
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files.filter(file => 
        file.startsWith('backup-') && (file.endsWith('.sql') || file.endsWith('.zip') || file.endsWith('.gz'))
      );

      if (backupFiles.length === 0) {
        console.log(chalk.yellow('No backup files found'));
        return;
      }

      console.log(chalk.blue('\nAvailable backups:'));
      console.log('─'.repeat(80));

      for (const file of backupFiles.sort().reverse()) {
        const filePath = path.join(this.backupDir, file);
        const stats = await fs.stat(filePath);
        const size = this.formatBytes(stats.size);
        const date = stats.birthtime.toISOString().split('T')[0];
        const time = stats.birthtime.toISOString().split('T')[1].split('.')[0];
        
        console.log(`${chalk.green(file.padEnd(40))} ${chalk.blue(size.padEnd(10))} ${chalk.gray(date + ' ' + time)}`);
      }
    } catch (error) {
      console.error(chalk.red(`Error listing backups: ${error.message}`));
    }
  }

  async cleanOldBackups(keepDays = 30) {
    const spinner = ora('Cleaning old backups...').start();
    
    try {
      const files = await fs.readdir(this.backupDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - keepDays);

      let deletedCount = 0;
      let totalSize = 0;

      for (const file of files) {
        if (file.startsWith('backup-')) {
          const filePath = path.join(this.backupDir, file);
          const stats = await fs.stat(filePath);
          
          if (stats.birthtime < cutoffDate) {
            totalSize += stats.size;
            await fs.unlink(filePath);
            deletedCount++;
          }
        }
      }

      spinner.succeed(
        chalk.green(`Cleaned ${deletedCount} old backups (freed ${this.formatBytes(totalSize)})`)
      );
    } catch (error) {
      spinner.fail(chalk.red(`Cleanup failed: ${error.message}`));
    }
  }

  async scheduleBackups(cronExpression) {
    const cron = require('node-cron');
    
    console.log(chalk.blue(`Scheduling backups with cron: ${cronExpression}`));
    
    if (!cron.validate(cronExpression)) {
      console.error(chalk.red('Invalid cron expression'));
      process.exit(1);
    }

    cron.schedule(cronExpression, async () => {
      console.log(chalk.yellow('\n🕒 Scheduled backup starting...'));
      try {
        await this.createBackup();
        await this.cleanOldBackups();
      } catch (error) {
        console.error(chalk.red(`Scheduled backup failed: ${error.message}`));
      }
    });

    console.log(chalk.green('Backup scheduler started. Press Ctrl+C to stop.'));
    
    // Keep the process alive
    process.stdin.resume();
  }
}

async function main() {
  const backupManager = new BackupManager();
  
  console.log(chalk.blue('🗄️  Ghibli Food Database Backup Tool\n'));
  
  try {
    await backupManager.ensureBackupDirectory();

    if (options.schedule) {
      await backupManager.scheduleBackups(options.schedule);
    } else {
      // Show current backups
      await backupManager.listBackups();
      console.log();
      
      // Create new backup
      await backupManager.createBackup();
      
      // Clean old backups
      await backupManager.cleanOldBackups();
    }
    
  } catch (error) {
    console.error(chalk.red(`\nError: ${error.message}`));
    process.exit(1);
  } finally {
    if (!options.schedule) {
      await backupManager.dbManager.close();
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log(chalk.yellow('\nShutting down backup process...'));
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log(chalk.yellow('\nShutting down backup process...'));
  process.exit(0);
});

if (require.main === module) {
  main();
}